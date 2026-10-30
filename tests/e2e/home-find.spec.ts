import { expect, test } from "@playwright/test";

test.describe("homepage and blood search", () => {
  test("homepage presents the primary action and trust information", async ({ page }) => {
    await page.goto("/en");

    await expect(
      page.getByRole("heading", { level: 1, name: /Need blood\? Find the right help, faster\./ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Find Blood Now" }).first()).toBeVisible();
    await expect(
      page.getByText("If this is a life-threatening emergency").first(),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "How Rakta-Daan works" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeAttached();
  });

  test("blood search requires a group, then shows reported availability", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("link", { name: "Find Blood Now" }).first().click();

    await expect(page).toHaveURL(/\/en\/find$/);
    await expect(page.getByRole("heading", { level: 1, name: "Find blood" })).toBeVisible();

    await page.getByRole("button", { name: "Search availability" }).click();
    await expect(
      page.getByText("Choose a blood group, or choose Not sure for guidance."),
    ).toBeVisible();

    await page.getByLabel("Blood group needed").first().selectOption("O_POS");
    await page.getByLabel("District").selectOption("KTM");
    await page.getByRole("button", { name: "Search availability" }).click();

    await expect(page).toHaveURL(/\/en\/find\?.*group=O_POS/);
    await expect(page.getByText("Showing results for O positive near Kathmandu")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Availability near Kathmandu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Blood banks and hospitals" })).toBeVisible();
    await expect(page.getByText("Consented donor availability")).toBeVisible();
    await expect(page.getByText("We never show fewer than three donors")).toBeVisible();
    await expect(page.getByRole("link", { name: "Start a blood request" }).first()).toBeVisible();
  });

  test("'Not sure' routes to guidance instead of guessing a blood group", async ({ page }) => {
    await page.goto("/en/find");
    await page.getByLabel("Blood group needed").first().selectOption("not_sure");
    await page.getByRole("button", { name: "Search availability" }).click();

    await expect(page).toHaveURL(/\/en\/find\/guidance/);
    await expect(
      page.getByRole("heading", { level: 1, name: "If you do not know the blood group" }),
    ).toBeVisible();
    await expect(
      page.getByText("Only a blood bank or hospital laboratory can determine a blood group."),
    ).toBeVisible();
  });

  test("language switch preserves the current page in Nepali", async ({ page }) => {
    await page.goto("/en/find");
    // Accessible name is "Language: नेपाली" so the visible label stays part of it (WCAG 2.5.3).
    await page.getByRole("link", { name: /^Language/ }).click();

    await expect(page).toHaveURL(/\/ne\/find$/);
    await expect(page.locator("html")).toHaveAttribute("lang", /^ne/);
    await expect(page.getByRole("heading", { level: 1, name: "रगत खोज्नुहोस्" })).toBeVisible();
  });

  test("mobile menu opens, closes with Escape and links to public pages", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");

    const menuButton = page.getByRole("button", { name: "Menu" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.locator("#mobile-nav")).toBeVisible();
    await expect(page.getByRole("link", { name: "Learn", exact: true })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-nav")).toHaveCount(0);

    await menuButton.click();
    await page.getByRole("link", { name: "Learn", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/learn$/);
  });
});
