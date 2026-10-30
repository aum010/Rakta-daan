import { expect, test } from "@playwright/test";

/**
 * The tab bar must be reachable from the first pixel of the document on every
 * route, in both locales — never parked below the footer where a user has to
 * scroll to the end of the page to find it.
 *
 * For each route, at scroll position 0, the bar has to be `position: fixed`,
 * flush with the bottom of the viewport, and nothing may be painted above it.
 * The aria-label is localized, so the bar is addressed by its styling classes.
 */

const ROUTES = [
  "/en",
  "/ne",
  "/en/app",
  "/ne/app",
  "/en/find",
  "/en/request/new",
  "/en/app/track",
  "/en/app/donor",
  "/en/app/profile",
  "/en/app/location",
  "/en/app/roles",
  "/en/app/scenarios",
  "/en/banks",
  "/en/camps",
  "/en/learn",
  "/en/privacy",
];

test("bottom bar is pinned at the first pixel on every route", async ({ page }) => {
  const failures: string[] = [];

  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    const result = await page.evaluate(() => {
      const nav = document.querySelector("nav.fixed.bottom-0");
      if (!nav) return { found: false } as const;
      const cs = getComputedStyle(nav);
      const rect = nav.getBoundingClientRect();
      return {
        found: true,
        position: cs.position,
        inlinePosition: (nav as HTMLElement).style.position,
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        viewport: window.innerHeight,
        opacity: cs.opacity,
        zIndex: cs.zIndex,
        visible: cs.visibility !== "hidden" && cs.display !== "none",
        // anything painted on top of the bar at its centre?
        coveredBy: (() => {
          const stack = document.elementsFromPoint(
            window.innerWidth / 2,
            window.innerHeight - 8,
          );
          const navIndex = stack.findIndex((element) => element === nav || nav.contains(element));
          if (navIndex === -1) return "nav not in hit stack";
          return stack
            .slice(0, navIndex)
            .map((element) => `${element.tagName}.${String(element.className).split(" ")[0]}`)
            .join(", ");
        })(),
      } as const;
    });

    if (!result.found) {
      failures.push(`${route}: nav missing`);
      continue;
    }
    if (result.position !== "fixed") failures.push(`${route}: position ${result.position}`);
    // The pin must come from the HTML itself, not only from the stylesheet.
    if (result.inlinePosition !== "fixed")
      failures.push(`${route}: inline position "${result.inlinePosition}" is not fixed`);
    if (result.bottom !== result.viewport)
      failures.push(`${route}: bottom ${result.bottom} != viewport ${result.viewport}`);
    if (!result.visible || result.opacity !== "1") failures.push(`${route}: not visible`);
    if (result.coveredBy) failures.push(`${route}: covered by ${result.coveredBy}`);

    console.log(
      `${route.padEnd(22)} pos=${result.position} inline=${result.inlinePosition} bottom=${result.bottom}/${result.viewport} h=${result.height} z=${result.zIndex} above=${result.coveredBy || "none"}`,
    );
  }

  expect(failures).toEqual([]);
});

test("the bar still pins when no stylesheet loads at all", async ({ page }) => {
  await page.goto("/en/app", { waitUntil: "domcontentloaded" });

  /* Stand in for a stale or failed CSS chunk: drop every stylesheet the page
     has. Only the markup's own styles survive. */
  await page.evaluate(() => {
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((element) => element.remove());
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        sheet.disabled = true;
      } catch {
        /* cross-origin sheets cannot be touched; their links are gone already */
      }
    }
  });
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => {
    const nav = document.querySelector("nav.fixed.bottom-0") as HTMLElement | null;
    if (!nav) return null;
    const cs = getComputedStyle(nav);
    return {
      inline: nav.style.position,
      position: cs.position,
      bottom: Math.round(nav.getBoundingClientRect().bottom),
      viewport: window.innerHeight,
    };
  });

  expect(result).not.toBeNull();
  expect(result!.inline).toBe("fixed");
  expect(result!.position).toBe("fixed");
  expect(result!.bottom).toBe(result!.viewport);
});
