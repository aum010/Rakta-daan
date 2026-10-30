import { expect, test } from "@playwright/test";

test.describe("learn, support and system states", () => {
  test("learn hub leads to the FAQ and donation guide", async ({ page }) => {
    await page.goto("/en/learn");
    await expect(
      page.getByRole("heading", { level: 1, name: "Learn about blood donation" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Frequently asked questions/ }).first().click();
    await expect(page).toHaveURL(/\/en\/learn\/faq$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Frequently asked questions",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Does Rakta-Daan provide blood, transport or medical care?"),
    ).toBeVisible();

    await page.goto("/en/learn/donation-guide");
    await expect(
      page.getByRole("heading", { level: 1, name: "Blood donation guide" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Before you donate" })).toBeVisible();

    await page.goto("/en/learn/compatibility");
    await expect(
      page.getByRole("heading", { level: 1, name: "Red-cell compatibility reference" }),
    ).toBeVisible();
  });

  test("contact demo validates and clearly states that nothing was sent", async ({ page }) => {
    await page.goto("/en/contact");
    await expect(
      page.getByRole("heading", { level: 1, name: "Contact Rakta-Daan" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Send demo message" }).click();
    await expect(page.getByText("Please complete the required fields.")).toHaveCount(0);
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();

    await page.getByLabel("Your name").fill("Demo Person");
    await page.getByLabel("Email address").fill("demo@example.org");
    await page.getByLabel("Message").fill("This is a non-urgent demonstration question.");
    await page.getByRole("button", { name: "Send demo message" }).click();
    await expect(page.getByText("Demo message recorded")).toBeVisible();
    await expect(
      page.getByText("Nothing was sent because this is a frontend-only demonstration."),
    ).toBeVisible();
  });

  test("trust and accessibility pages are reachable", async ({ page }) => {
    for (const [path, heading] of [
      ["/en/consent", "Consent and communication preferences"],
      ["/en/accessibility", "Accessibility statement"],
      ["/en/help", "Help and support"],
      ["/en/safety", "Safety"],
      ["/en/privacy", "Privacy"],
      ["/en/terms", "Terms"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    }
  });

  test("unknown routes return 404 with a recovery path", async ({ page }) => {
    const response = await page.goto("/en/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "That page is not here" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Find Blood" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to homepage" }).or(page.getByRole("link", { name: "English homepage" })).first()).toBeVisible();

    /*
     * The 404 must be the whole document, not a second <html>/<body> nested
     * inside Next's default shell — the app's only root layout lives in
     * `[locale]/layout.tsx`, so a plain `app/not-found.tsx` was wrapped twice.
     * Script payloads are stripped so the count reflects real markup.
     */
    const raw = await (await page.request.get("/en/this-page-does-not-exist")).text();
    const markup = raw.replace(/<script\b[\s\S]*?<\/script>/g, "");
    expect(markup.match(/<html\b/g) ?? []).toHaveLength(1);
    expect(markup.match(/<body\b/g) ?? []).toHaveLength(1);
    expect(markup).toMatch(/<html lang="en">/);
  });

  test("unknown locales and detail pages return a 404 inside one document", async ({
    page,
  }) => {
    /* An unsupported first segment must not blank the page: the locale layout
       no longer throws, and the page's own notFound() renders here. */
    const localeResponse = await page.goto("/fr/find");
    expect(localeResponse?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "That page is not here" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to homepage" })).toBeVisible();

    /* A missing record (invalid id, rejected before any database lookup). */
    const detailResponse = await page.goto("/en/camps/not-a-camp-id");
    expect(detailResponse?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "That page is not here" }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Find Blood", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("system pages explain sign-in, access, outage and maintenance states", async ({
    page,
  }) => {
    await page.goto("/en/unauthorized");
    await expect(
      page.getByRole("heading", { level: 1, name: "Please sign in to continue" }),
    ).toBeVisible();

    await page.goto("/en/forbidden");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "This area is not available to your account",
      }),
    ).toBeVisible();

    await page.goto("/en/unavailable");
    await expect(
      page.getByRole("heading", { level: 1, name: "The service is temporarily unavailable" }),
    ).toBeVisible();

    await page.goto("/en/maintenance");
    await expect(
      page.getByRole("heading", { level: 1, name: "Rakta-Daan is being maintained" }),
    ).toBeVisible();
  });

  test("robots, sitemap, manifest and icon are served", async ({ request }) => {
    for (const path of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/icon.svg"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
    }
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/en/find");
    expect(sitemap).toContain("/ne/find");
    expect(sitemap).not.toContain("/en/admin/demo");
  });
});
