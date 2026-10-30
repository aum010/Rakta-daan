import { expect, test, type Page } from "@playwright/test";

const REFERENCE_PATTERN = /DEMO-[2-9A-HJ-NP-Z]{6}/;

async function createDemoRequest(page: Page) {
  await page.goto("/en/request/new");
  await expect(page.getByText("Demo request: this form validates and saves only in this browser.")).toBeVisible();

  // The persistent bottom footer is fixed over the page at every width, so
  // centre the (sr-only) radio in the viewport before forcing the click — at
  // desktop widths it can otherwise sit underneath the footer bar.
  const bloodGroup = page.locator('input[name="bloodGroup"][value="O_POS"]');
  await bloodGroup.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await bloodGroup.check({ force: true });
  await page.getByLabel("Units needed").fill("2");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Where is it needed?" })).toBeVisible();
  await page.getByLabel("Hospital or health facility").fill("Demo Teaching Hospital");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Who should a donor contact?" })).toBeVisible();
  await page.getByLabel("Your name or preferred name").fill("Demo Requester");
  await page.getByLabel("Phone number").fill("9800000000");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Review the request" })).toBeVisible();
  const optionalUpdates = page.locator("#consentUpdates");
  await expect(optionalUpdates).not.toBeChecked();
  await page.getByRole("button", { name: "Submit demo request" }).click();
  await expect(page.getByText("Confirm this to continue.").first()).toBeVisible();

  await page.locator("#consentAccuracy").check();
  await page.locator("#consentShare").check();
  await page.getByRole("button", { name: "Submit demo request" }).click();

  await expect(page.getByRole("heading", { name: "Demo request created" })).toBeVisible();
  const reference = (
    await page.getByText(REFERENCE_PATTERN).first().innerText()
  ).trim();
  expect(reference).toMatch(REFERENCE_PATTERN);
  return reference;
}

test.describe("demo blood request journey", () => {
  test("creates a request, exposes a safe status link, supports lookup, edit and cancel", async ({
    page,
  }) => {
    const reference = await createDemoRequest(page);

    await page.getByRole("link", { name: "Open status preview" }).click();
    await expect(page).toHaveURL(new RegExp(`/en/request/status/${reference}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Request status" })).toBeVisible();
    await expect(page.getByText(reference).first()).toBeVisible();
    await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();

    const safeLink = page.locator("#safe-link");
    await expect(safeLink).toHaveValue(
      new RegExp(`/en/request/status/${reference}$`),
    );
    await expect(safeLink).not.toHaveValue(/9800000000/);

    await page.goto("/en/request/status");
    await page.getByLabel("Request reference").fill(reference.toLowerCase());
    await page.getByRole("button", { name: "Open request" }).click();
    await expect(page).toHaveURL(new RegExp(`/en/request/status/${reference}$`));
    await expect(page.getByText(reference).first()).toBeVisible();

    await page.getByRole("link", { name: "Update this request" }).first().click();
    await expect(page).toHaveURL(new RegExp(`/en/request/edit/${reference}$`));
    await page.getByLabel("Units needed").fill("3");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Update this request" }).click();
    await expect(page).toHaveURL(new RegExp(`/en/request/status/${reference}$`));
    await expect(page.getByText(/3 units/)).toBeVisible();

    await page.getByRole("button", { name: "Cancel this request" }).first().click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel this request" }).click();
    await expect(page.getByText("Demo request cancelled in this browser.").first()).toBeVisible();
    await expect(page.getByText("Cancelled", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Update this request" })).toHaveCount(0);
  });

  test("unknown reference shows a recoverable lookup state", async ({ page }) => {
    await page.goto("/en/request/status/DEMO-ABC234");
    await expect(
      page.getByRole("heading", { name: "We could not find that demo request" }),
    ).toBeVisible();
    await expect(page.getByLabel("Request reference")).toBeVisible();
    await expect(
      page.getByText("Open this page on the same device, or enter the reference below."),
    ).toBeVisible();
  });
});
