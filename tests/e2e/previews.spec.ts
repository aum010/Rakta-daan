import { expect, test } from "@playwright/test";

test.describe("organisation and admin previews", () => {
  test("organisation preview updates inventory only after confirmation", async ({ page }) => {
    await page.goto("/en/org/demo");
    await expect(
      page.getByRole("heading", { level: 1, name: "Organisation dashboard preview" }),
    ).toBeVisible();
    await expect(page.getByText("Demonstration organisation data.").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Inventory status" })).toBeVisible();

    await page.getByLabel("Units O positive").first().fill("5");
    await page.getByRole("button", { name: "Save demo inventory" }).click();
    await expect(page.getByText("Confirm the reporting statement before saving.")).toBeVisible();

    await page
      .getByRole("checkbox", {
        name: "I confirm these figures reflect what the facility reported, not an estimate.",
      })
      .check();
    await page.getByRole("button", { name: "Save demo inventory" }).click();
    await expect(page.getByText("Demo inventory updated in this browser.").first()).toBeVisible();

    await page.getByRole("link", { name: "Requests", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Request coordination" })).toBeVisible();
    await page.getByRole("link", { name: "Camps", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Donation camps" })).toBeVisible();
  });

  test("admin preview switches sections and records a demo status change", async ({ page }) => {
    await page.goto("/en/admin/demo");
    await expect(
      page.getByRole("heading", { level: 1, name: "Admin dashboard preview" }),
    ).toBeVisible();
    await expect(page.getByText("Synthetic demonstration data only.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operations overview" })).toBeVisible();

    await page
      .getByRole("navigation", { name: "Admin dashboard preview" })
      .getByRole("button", { name: "Requests", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Request management" })).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Request management" })
        .getByRole("textbox", { name: "Search" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Notification logs", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Notification logs" })).toBeVisible();
    await expect(page.getByText("Synthetic provider states.")).toBeVisible();

    await page.getByRole("button", { name: "Verification queue", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Verification queue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve preview" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Approve preview" }).first().click();
    await expect(page.getByText("Demo status updated in this browser.")).toBeVisible();

    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(
      page.getByText("Do not disable authentication in production."),
    ).toBeVisible();
  });
});
