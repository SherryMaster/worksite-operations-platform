import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

import { getPhaseOneTestUser } from "./support/clerk-users";
import { recoverProtectedPage } from "./support/navigation";
import {
  cleanupPhaseSixE2EData,
  setupPhaseSixE2EData,
} from "./support/phase6-database";

const serverMutationTimeout = 45_000;

async function renewCeoSession(page: import("@playwright/test").Page) {
  const returnUrl = page.url();
  await clerk.signOut({ page });
  await page.goto("/sign-in");
  const { signInTicket } = await getPhaseOneTestUser("CEO");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto(returnUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(returnUrl, { timeout: 20_000 });
  await recoverProtectedPage(page);
}

async function generatePayroll(page: import("@playwright/test").Page) {
  const payrollLink = page.getByRole("link", { name: /June 2098/ });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (await payrollLink.isVisible().catch(() => false)) return;
    await page.getByLabel("Calendar month").fill("2098-06");
    await page.getByRole("button", { name: "Generate or recalculate" }).click();
    if (
      await payrollLink
        .waitFor({ state: "visible", timeout: serverMutationTimeout })
        .then(() => true)
        .catch(() => false)
    ) {
      return;
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await recoverProtectedPage(page);
  }

  await expect(payrollLink).toBeVisible();
}

async function addPayrollAdjustment(page: import("@playwright/test").Page) {
  const adjustment = page.getByText("E2E payroll completion allowance", {
    exact: true,
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (await adjustment.isVisible().catch(() => false)) return;
    await renewCeoSession(page);
    await page.getByLabel("Amount (MYR)").fill("5.00");
    await page.getByLabel("Reason").fill("E2E payroll completion allowance");
    await page.getByRole("button", { name: "Add adjustment" }).click();
    if (
      await adjustment
        .waitFor({ state: "visible", timeout: serverMutationTimeout })
        .then(() => true)
        .catch(() => false)
    ) {
      return;
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await recoverProtectedPage(page);
  }

  await expect(adjustment).toBeVisible();
}

async function approvePayroll(page: import("@playwright/test").Page) {
  const approved = page.getByText("approved", { exact: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (await approved.isVisible().catch(() => false)) return;
    await renewCeoSession(page);
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Approve complete payroll" })
      .click();
    if (
      await approved
        .waitFor({ state: "visible", timeout: serverMutationTimeout })
        .then(() => true)
        .catch(() => false)
    ) {
      return;
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await recoverProtectedPage(page);
  }

  await expect(approved).toBeVisible();
}

async function recordPayrollPayment(page: import("@playwright/test").Page) {
  const recorded = page.getByText("Full payment recorded · RM 25.00");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (await recorded.isVisible().catch(() => false)) return;
    await renewCeoSession(page);
    await page.getByLabel("Payment date").fill("2098-06-30");
    await page.getByLabel("Reference (optional)").fill("E2E-TRANSFER-1");
    await page.locator('select[name="method"]').selectOption("BANK_TRANSFER");
    await page.getByRole("button", { name: /Record full payment/ }).click();
    if (
      await recorded
        .waitFor({ state: "visible", timeout: serverMutationTimeout })
        .then(() => true)
        .catch(() => false)
    ) {
      return;
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await recoverProtectedPage(page);
  }

  await expect(recorded).toBeVisible();
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
  test.setTimeout(300_000);
  const { signInTicket } = await getPhaseOneTestUser("CEO");

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto("/ceo/payroll");
  await recoverProtectedPage(page);

  await generatePayroll(page);

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

  await addPayrollAdjustment(page);
  await expect(page.getByText("RM 25.00", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /June 2098 payroll/ }).click();
  await expect(page).toHaveURL(/\/ceo\/payroll\/[^/]+$/, {
    timeout: 20_000,
  });
  await approvePayroll(page);

  await page
    .getByRole("row")
    .filter({ hasText: "E2E Phase 6 Payroll Worker" })
    .getByRole("link", { name: "Review" })
    .click();
  await expect(page).toHaveURL(/\/workers\/[^/]+$/, { timeout: 20_000 });
  await expect(
    page.getByRole("link", { name: /Worker payroll statement/ }),
  ).toBeVisible();

  await recordPayrollPayment(page);
});
