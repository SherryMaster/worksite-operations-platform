import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

import { getPhaseOneTestUser } from "./support/clerk-users";
import {
  cleanupPhaseSixE2EData,
  setupPhaseSixE2EData,
} from "./support/phase6-database";

async function renewCeoSession(page: import("@playwright/test").Page) {
  const returnUrl = page.url();
  await clerk.signOut({ page });
  await page.goto("/sign-in");
  const { signInTicket } = await getPhaseOneTestUser("CEO");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto(returnUrl);
}

test.beforeEach(async ({ isMobile }) => {
  test.skip(Boolean(isMobile), "CEO payroll control runs in desktop Chromium.");
  setupPhaseSixE2EData();
});

test.afterEach(async ({ isMobile }) => {
  if (!isMobile) cleanupPhaseSixE2EData();
});

test("the CEO generates, adjusts, approves, and pays payroll", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const { signInTicket } = await getPhaseOneTestUser("CEO");

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto("/ceo/payroll");

  await page.getByLabel("Calendar month").fill("2098-06");
  await page.getByRole("button", { name: "Generate or recalculate" }).click();
  await expect(
    page.getByText(
      "Payroll generated. Review every exception before approval.",
    ),
  ).toBeVisible({ timeout: 20_000 });

  await page.getByRole("link", { name: /June 2098/ }).click();
  await expect(page).toHaveURL(/\/ceo\/payroll\/[^/]+$/, {
    timeout: 20_000,
  });
  await expect(page.getByText("No blocking payroll exceptions")).toBeVisible({
    timeout: 20_000,
  });

  const workerRow = page
    .getByRole("row")
    .filter({ hasText: "E2E Phase 6 Payroll Worker" });
  await workerRow.getByRole("link", { name: "Review" }).click();
  await expect(page).toHaveURL(/\/workers\/[^/]+$/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "E2E Phase 6 Payroll Worker" }),
  ).toBeVisible();

  await renewCeoSession(page);
  await page.getByLabel("Amount (MYR)").fill("5.00");
  await page.getByLabel("Reason").fill("E2E payroll completion allowance");
  await page.getByRole("button", { name: "Add adjustment" }).click();
  await expect(
    page.getByText("Adjustment added and draft payroll recalculated."),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("RM 25.00", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /June 2098 payroll/ }).click();
  await expect(page).toHaveURL(/\/ceo\/payroll\/[^/]+$/, {
    timeout: 20_000,
  });
  await renewCeoSession(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Approve complete payroll" }).click();
  await expect(page.getByText("approved", { exact: true })).toBeVisible({
    timeout: 20_000,
  });

  await page
    .getByRole("row")
    .filter({ hasText: "E2E Phase 6 Payroll Worker" })
    .getByRole("link", { name: "Review" })
    .click();
  await expect(page).toHaveURL(/\/workers\/[^/]+$/, { timeout: 20_000 });
  await expect(
    page.getByRole("link", { name: /Worker payroll statement/ }),
  ).toBeVisible();

  await renewCeoSession(page);
  await page.getByLabel("Payment date").fill("2098-06-30");
  await page.getByLabel("Reference (optional)").fill("E2E-TRANSFER-1");
  await page.locator('select[name="method"]').selectOption("BANK_TRANSFER");
  await page.getByRole("button", { name: /Record full payment/ }).click();
  await expect(page.getByText("Full payment recorded · RM 25.00")).toBeVisible({
    timeout: 20_000,
  });
});
