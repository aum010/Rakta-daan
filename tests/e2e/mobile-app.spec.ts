import { expect, test } from "@playwright/test";

/**
 * The complete mobile-first journey on a phone-sized viewport: open the app →
 * load a demo scenario → track coverage → explore map and waves → answer an
 * invitation → contact the other side through external channels → reset.
 *
 * The bottom bar carries exactly five tabs — Home, Find, Request, Track,
 * Profile — and stays pinned to the viewport for the whole journey.
 *
 * Everything runs against browser-local demonstration state; no message, call
 * or location ever leaves the page.
 */
test.use({ viewport: { width: 390, height: 844 } });

const NAV_NAME = "Primary mobile navigation";
const TABS = ["Home", "Find", "Request", "Track", "Profile"];

test.describe("mobile coordination journey", () => {
  test("requester and donor complete the emergency journey on a phone", async ({
    page,
  }) => {
    /* 1. App home with the persistent bottom navigation -------------------- */
    await page.goto("/en/app");
    await expect(
      page.getByRole("heading", { level: 1, name: "What do you need right now?" }),
    ).toBeVisible();

    const nav = page.getByRole("navigation", { name: NAV_NAME });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    for (const tab of TABS) {
      await expect(nav.getByRole("link", { name: tab, exact: true })).toBeVisible();
    }
    // Five tabs only — secondary pages moved to Profile.
    await expect(nav.getByRole("link")).toHaveCount(TABS.length);

    /* 2. Load the emergency scenario from the Profile tab ------------------ */
    await nav.getByRole("link", { name: "Profile", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/app\/profile$/);
    await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
    // The view switcher now lives inside the collapsed Settings group.
    await page.locator("details > summary").filter({ hasText: "Settings" }).click();
    await expect(
      page.getByRole("button", { name: "Switch to Donor view" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Demo scenarios" }).click();
    await expect(page).toHaveURL(/\/en\/app\/scenarios$/);
    await expect(page.getByRole("heading", { level: 1, name: "Demo scenarios" })).toBeVisible();
    await page.getByRole("button", { name: "Load scenario", exact: true }).first().click();
    await expect(page.getByRole("status").filter({ hasText: "Scenario loaded: Emergency" })).toBeVisible();

    /* 3. Track the request: coverage starts at zero ------------------------ */
    await nav.getByRole("link", { name: "Track", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/app\/track$/);
    await expect(page.getByRole("heading", { level: 1, name: "Track request" })).toBeVisible();
    await expect(page.getByText("0 / 3 committed").first()).toBeVisible();
    await expect(page.getByText("Searching for donors").first()).toBeVisible();

    /* 4. Map and donor waves are honest about what they show --------------- */
    await page.getByRole("tab", { name: "Map" }).click();
    await expect(page.getByRole("heading", { name: "Coordination map" })).toBeVisible();
    await expect(
      page
        .getByText(
          "District-level positions only. This prototype does not show live donor positions.",
        )
        .last(),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Donors" }).click();
    await expect(page.getByRole("heading", { name: "Notification waves" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Donors coordinating" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nearby candidates" })).toBeVisible();

    /* 5. The donor answers the invitation ---------------------------------- */
    await nav.getByRole("link", { name: "Profile", exact: true }).click();
    await page.getByRole("link", { name: "Donor dashboard" }).click();
    await expect(page).toHaveURL(/\/en\/app\/donor$/);
    await expect(page.getByRole("heading", { name: "Invitations" })).toBeVisible();
    await page.getByRole("button", { name: "Accept invitation" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Invitation accepted." })).toBeVisible();

    /* 6. Coverage recalculates to one of three committed ------------------- */
    await nav.getByRole("link", { name: "Track", exact: true }).click();
    await expect(page.getByText("1 / 3 committed").first()).toBeVisible();

    /* 7. Contact: external channels only, contact hidden until consent ----- */
    await page.getByRole("tab", { name: "Contact" }).click();
    await expect(page.getByRole("heading", { name: "Contact outside the app" })).toBeVisible();
    await expect(page.getByText("No internal messaging", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Rakta-Daan has no inbox. Contact happens through WhatsApp, Viber, phone or SMS — outside the site.", { exact: true }),
    ).toBeVisible();

    // Contact details stay hidden until the person sharing them agrees.
    await expect(page.getByText("Hidden until shared").first()).toBeVisible();
    await expect(page.getByText("+977-1-555-0100")).toHaveCount(0);
    await page.getByRole("button", { name: "Share details", exact: true }).first().click();
    await expect(page.getByText("+977-1-555-0100")).toBeVisible();
    await page.getByRole("button", { name: "Stop sharing", exact: true }).first().click();
    await expect(page.getByText("+977-1-555-0100")).toHaveCount(0);

    // Channel support is stated honestly: messaging is not connected, and the
    // call is a preview that dials nothing.
    await expect(page.getByText("Not connected").first()).toBeVisible();
    await page.getByRole("button", { name: "Start simulated call" }).click();
    await expect(page.getByText("Simulated — no call is placed.")).toBeVisible();
    await expect(page.getByText("No message, call or SMS is delivered from this prototype.")).toBeVisible();

    /* 8. Reset returns the demo to a clean state --------------------------- */
    await nav.getByRole("link", { name: "Profile", exact: true }).click();
    await page.getByRole("link", { name: "Demo scenarios" }).click();
    await page.getByRole("button", { name: "Reset demo data", exact: true }).click();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Demo data reset." })).toBeVisible();

    // The bottom-left "Home" tab is covered by Next's dev-tools badge in
    // `next dev`, so the journey returns home through the breadcrumb instead.
    await page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: "Home" })
      .click();
    await expect(page).toHaveURL(/\/en\/app$/);
    await expect(page.getByText("No active request").first()).toBeVisible();
  });

  test("the five-tab bottom navigation is a sticky footer at every viewport width", async ({
    page,
  }) => {
    const nav = page.getByRole("navigation", { name: NAV_NAME });

    const measure = () =>
      page.evaluate(() => {
        const element = document.querySelector('nav[aria-label="Primary mobile navigation"]');
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          position: getComputedStyle(element).position,
          bottom: Math.round(rect.bottom),
          viewportHeight: window.innerHeight,
          links: element.querySelectorAll("a").length,
        };
      });

    /* Mobile: pinned to the viewport bottom through deep scrolling. */
    await page.goto("/en");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Profile", exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const mobile = await measure();
    expect(mobile).not.toBeNull();
    expect(mobile!.position).toBe("fixed");
    expect(mobile!.bottom).toBe(mobile!.viewportHeight);
    expect(mobile!.links).toBe(TABS.length);

    /* Desktop: the bar is not hidden on wide viewports either. */
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(nav).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const desktop = await measure();
    expect(desktop).not.toBeNull();
    expect(desktop!.position).toBe("fixed");
    expect(desktop!.bottom).toBe(desktop!.viewportHeight);
    expect(desktop!.links).toBe(TABS.length);
  });

  test("the bar is present from the first pixel of scroll, above the footer", async ({
    page,
  }) => {
    await page.goto("/en");
    const nav = page.getByRole("navigation", { name: NAV_NAME });
    const viewport = page.viewportSize()!;

    /* Top of the page: already pinned to the bottom, no scrolling required. */
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(nav).toBeVisible();
    const atTop = await nav.boundingBox();
    expect(atTop).not.toBeNull();
    expect(Math.round(atTop!.y + atTop!.height)).toBe(viewport.height);

    /* Deep in the footer: unchanged — it never rides along with the document. */
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const atBottom = await nav.boundingBox();
    expect(atBottom).not.toBeNull();
    expect(Math.round(atBottom!.y)).toBe(Math.round(atTop!.y));
    expect(Math.round(atBottom!.y + atBottom!.height)).toBe(viewport.height);

    /* The site footer ends above the bar instead of hiding behind it. */
    const footerBottom = await page.evaluate(() => {
      const footer = document.querySelector("footer");
      return footer ? Math.round(footer.getBoundingClientRect().bottom) : null;
    });
    expect(footerBottom).not.toBeNull();
    expect(footerBottom!).toBeLessThanOrEqual(Math.round(viewport.height - atBottom!.height) + 2);
  });

  test("the profile accepts an avatar and a certificate without uploading either", async ({
    page,
  }) => {
    /* A 1×1 PNG supplied from memory — the test never writes to disk. */
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const file = { name: "portrait.png", mimeType: "image/png", buffer: png };

    /* Nothing may leave the browser while the pictures are handled. */
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.method() !== "GET") writes.push(`${request.method()} ${request.url()}`);
    });

    await page.goto("/en/app/profile");
    await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();

    /* 1. Avatar — resized in the page, rendered from a data URL. */
    await page.locator('input[type="file"]').first().setInputFiles(file);
    const avatar = page.locator('img[src^="data:image/"]').first();
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute("alt", "Profile picture");
    await expect(page.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
    await expect(page.getByText("Kept in this browser only — it is never uploaded anywhere.")).toBeVisible();

    /* 2. Certificate — inside the collapsed history group. */
    await page.locator("details > summary").filter({ hasText: "Donation history" }).click();
    const certificate = { ...file, name: "certificate-2026.png" };
    await page.locator('input[type="file"]').nth(1).setInputFiles(certificate);
    await expect(page.getByText("certificate-2026.png")).toBeVisible();
    await expect(page.getByText(/Images are resized and kept on this device/)).toBeVisible();

    /* No POST/PUT/PATCH went out for either file. */
    expect(writes).toEqual([]);

    /* 3. Both are removable, and removal restores the empty states. */
    const removeButtons = page.getByRole("button", { name: "Remove", exact: true });
    await expect(removeButtons).toHaveCount(2);
    await removeButtons.last().click();
    await expect(page.getByText("certificate-2026.png")).toHaveCount(0);
    await removeButtons.first().click();
    await expect(page.locator('img[src^="data:image/"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Upload photo" })).toBeVisible();
  });
});
