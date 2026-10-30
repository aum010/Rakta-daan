import { expect, test } from "@playwright/test";

test.describe("demo donor journey", () => {
  test("registers with explicit consent, manages preferences and deletes the profile", async ({
    page,
  }) => {
    await page.goto("/en/donor/demo");
    await expect(
      page.getByRole("heading", { level: 1, name: "Be the person someone is looking for" }),
    ).toBeVisible();
    await expect(page.getByText("Demonstration mode").first()).toBeVisible();
    await page.getByRole("link", { name: "Start demo registration" }).first().click();

    await expect(page).toHaveURL(/\/en\/donor\/demo\/register$/);
    await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();
    await page.getByLabel("Name or preferred name").fill("Demo Donor");
    // Centre the (sr-only) radio before forcing the click: the sticky bottom
    // footer covers the bottom strip of the viewport at every width.
    const bloodGroup = page.locator('input[name="donorBloodGroup"][value="O_POS"]');
    await bloodGroup.evaluate((element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await bloodGroup.check({ force: true });
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Availability and channels" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "SMS" })).toBeChecked();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Enter a phone number a donor can reach.")).toBeVisible();
    await page.getByLabel("Phone").fill("9812345678");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Consent" })).toBeVisible();
    await expect(page.locator("#consentAlerts")).not.toBeChecked();
    await expect(page.locator("#consentContact")).not.toBeChecked();
    await expect(page.locator("#consentTerms")).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Show my availability in matching/ })).not.toBeChecked();

    await page.getByRole("button", { name: "Create demo donor profile" }).click();
    await expect(page.getByText("Confirm this to continue.").first()).toBeVisible();

    await page.locator("#consentAlerts").check();
    await page.locator("#consentContact").check();
    await page.locator("#consentTerms").check();
    await page.getByRole("button", { name: "Create demo donor profile" }).click();

    await expect(page.getByRole("heading", { name: "Demo donor profile created" })).toBeVisible();
    await expect(page.getByText("No account was created and no message was sent.")).toBeVisible();
    await page.getByRole("link", { name: "Open demo donor dashboard" }).click();

    await expect(page).toHaveURL(/\/en\/donor\/demo\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1, name: "Welcome, Demo Donor" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profile completeness" })).toBeVisible();
    await expect(page.getByText("Not shown in matching")).toBeVisible();
    await expect(page.getByText("Demo profile — stored in this browser only.")).toBeVisible();

    await page.getByRole("radio", { name: "Pause all contact" }).check();
    await page.getByRole("button", { name: "Save demo preferences" }).click();
    await expect(page.getByText("Demo preferences saved in this browser.")).toBeVisible();

    await page.getByText("View details", { exact: true }).first().click();
    await page.getByRole("button", { name: "I could help" }).first().click();
    await expect(
      page.getByText("Demo response saved in this browser. No message was sent."),
    ).toBeVisible();
    await expect(page.getByText("I could help", { exact: true }).last()).toBeVisible();

    await page.getByRole("button", { name: "Delete demo profile" }).click();
    await expect(page.getByText("Delete the demo donor profile from this browser?")).toBeVisible();
    await page.getByRole("button", { name: "Delete demo profile" }).last().click();
    await expect(page.getByText("Demo donor profile deleted from this browser.")).toBeVisible();
    await expect(page.getByText("No demo donor profile found")).toBeVisible();
  });
});
