import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated WCAG 2.1 A/AA audit of the routes a first-time visitor touches,
 * in both locales (English and Nepali render different text lengths and
 * direction-sensitive glyphs, so they are audited separately).
 *
 * Policy: any `serious` or `critical` violation fails the test. Minor/moderate
 * findings are printed so they stay visible without blocking the suite.
 */
const ROUTES = [
  "/en",
  "/en/find",
  "/en/find/guidance",
  "/en/request/new",
  "/en/donor/demo",
  "/en/banks",
  "/en/learn",
  "/en/login",
  "/ne",
  "/ne/find",
  "/ne/donor/demo",
] as const;

function summarize(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  return violations
    .map(
      (v) =>
        `${v.impact ?? "unknown"} | ${v.id} | ${v.help} | ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join(" ; ")}`,
    )
    .join("\n");
}

async function audit(page: Page, url: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const advisory = results.violations.filter(
    (v) => v.impact !== "serious" && v.impact !== "critical",
  );

  if (advisory.length > 0) {
    console.log(`[axe:advisory] ${url}\n${summarize(advisory)}`);
  }
  expect(blocking, `${url} — serious/critical accessibility violations`).toEqual([]);
}

test.describe("automated accessibility audit", () => {
  for (const route of ROUTES) {
    test(`axe: ${route} has no serious or critical violations`, async ({ page }) => {
      await page.goto(route);
      await audit(page, route);
    });
  }

  test("axe: request wizard step 2 (dynamic form state)", async ({ page }) => {
    await page.goto("/en/request/new");
    await page.getByRole("button", { name: /Continue|Next/ }).first().click().catch(() => {});
    await audit(page, "/en/request/new (interacted)");
  });

  test("axe: search results page with a populated query", async ({ page }) => {
    await page.goto("/en/find?bloodGroup=O_POS&province=P3&district=KTM");
    await audit(page, "/en/find?bloodGroup=O_POS");
  });

  test("axe: mobile viewport (390px) home and search", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");
    await audit(page, "/en @390px");
    await page.goto("/en/find?bloodGroup=A_POS&province=P3&district=KTM");
    await audit(page, "/en/find @390px");
  });

  test("axe: mobile menu open state", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");
    const menuButton = page.getByRole("button", { name: "Menu" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    // The toggle relabels itself to "Close" while open, so assert the panel instead.
    await expect(page.locator("#mobile-nav")).toBeVisible();
    await audit(page, "/en with menu open @390px");
  });
});