import { expect, test } from "@playwright/test";

/**
 * Three layout tiers, three different layouts — not one phone layout stretched
 * to a monitor.
 *
 *   mobile   390px  single column
 *   tablet   768px  two columns
 *   desktop 1440px  wider page, three columns
 *
 * The assertions read real geometry (where the grid children actually sit),
 * because a class name alone says nothing about whether a rule loaded.
 */

type Box = { left: number; top: number; width: number };

const readGrid = async (
  page: import("@playwright/test").Page,
  expectedChildren: number,
): Promise<Box[]> => {
  /* The track panel is a client component — wait for it to actually mount and
     fill with the expected number of children before measuring it. */
  await page.waitForFunction((expected) => {
    const grid = document.querySelector('[role="tabpanel"]')?.firstElementChild;
    if (!grid) return false;
    return grid.children.length === expected;
  }, expectedChildren);

  return page.evaluate(() => {
    const grid = document.querySelector('[role="tabpanel"]')?.firstElementChild;
    if (!grid) return [];
    return [...grid.children].map((child) => {
      const rect = child.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
      };
    });
  });
};

const readContainerWidth = async (page: import("@playwright/test").Page): Promise<number> =>
  page.evaluate(() => {
    const container = document.querySelector("main .container-page");
    return container ? Math.round(container.getBoundingClientRect().width) : 0;
  });

/** Narrow once: indexing is `Box | undefined` under `noUncheckedIndexedAccess`. */
const pair = (boxes: Box[]): [Box, Box] => {
  const [first, second] = boxes;
  if (boxes.length !== 2 || !first || !second) {
    throw new Error(`expected 2 grid children, got ${boxes.length}`);
  }
  return [first, second];
};

test.describe("layout tiers", () => {
  test("mobile stacks, tablet splits, desktop goes wide", async ({ page }) => {
    /* --- mobile: one column ------------------------------------------- */
    await page.setViewportSize({ width: 390, height: 844 });

    /* A fresh browser profile carries no demo state, and /app/track renders an
       empty state instead of the panel under test. Seed one scenario first;
       it persists in localStorage across the viewport reloads below. */
    await page.goto("/en/app/scenarios");
    await page.getByRole("button", { name: "Load scenario", exact: true }).first().click();
    await expect(page.getByRole("status").filter({ hasText: "Scenario loaded" })).toBeVisible();

    await page.goto("/en/app/track");
    const [mobileA, mobileB] = pair(await readGrid(page, 2));
    expect(mobileA.left).toBe(mobileB.left);
    expect(mobileB.top).toBeGreaterThan(mobileA.top + 50);
    expect(mobileA.width).toBeLessThan(390);

    /* --- tablet: two columns ------------------------------------------ */
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    const [tabletA, tabletB] = pair(await readGrid(page, 2));
    expect(tabletB.left).toBeGreaterThan(tabletA.left);
    expect(tabletB.top).toBe(tabletA.top);
    expect(tabletA.left + tabletA.width).toBeLessThanOrEqual(tabletB.left);

    /* --- desktop: wider page, three columns ---------------------------- */
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    expect(await readContainerWidth(page)).toBeGreaterThanOrEqual(1150);

    await page.getByRole("tab", { name: "Donors" }).click();
    const desktop = await readGrid(page, 3);
    expect(desktop).toHaveLength(3);
    const columns = new Set(desktop.map((box) => box.left));
    expect(columns.size).toBe(3);
    expect(new Set(desktop.map((box) => box.top)).size).toBe(1);
  });

  test("the tab bar scales with the viewport instead of staying phone-sized", async ({ page }) => {
    const itemsWidth = async () =>
      page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Primary mobile navigation"] ul');
        return nav ? Math.round(nav.getBoundingClientRect().width) : 0;
      });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/app");
    const phone = await itemsWidth();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    const desktop = await itemsWidth();

    expect(phone).toBeGreaterThan(300);
    expect(desktop).toBeGreaterThan(phone + 300);
  });
});
