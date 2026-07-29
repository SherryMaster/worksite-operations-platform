import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

import { getPhaseOneTestUser } from "./support/clerk-users";
import {
  cleanupPhaseFiveE2EData,
  setupPhaseFiveE2EData,
} from "./support/phase5-database";

test.beforeEach(async ({ isMobile }) => {
  test.skip(Boolean(isMobile), "CEO leave review runs in desktop Chromium.");
  setupPhaseFiveE2EData();
});

test.afterEach(async ({ isMobile }) => {
  if (!isMobile) cleanupPhaseFiveE2EData();
});

test("the CEO submits and approves full-day unpaid leave", async ({ page }) => {
  test.slow();
  const { signInTicket } = await getPhaseOneTestUser("CEO");

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto("/ceo/leave");

  await page
    .getByText("Submit leave on behalf of a worker", { exact: true })
    .click();
  const workerValue = await page
    .locator('select[name="workerId"] option')
    .filter({ hasText: "E2E Phase 5 Worker" })
    .getAttribute("value");
  await page.locator('select[name="workerId"]').selectOption(workerValue!);
  await page
    .getByLabel("Leave type")
    .selectOption({ label: "E2E Phase 5 Leave" });
  await page.getByLabel("First full day").fill("2026-08-20");
  await page.getByLabel("Last full day").fill("2026-08-20");
  await page.getByLabel("Reason (optional)").fill("E2E family matter");
  await page.getByRole("button", { name: "Submit for CEO review" }).click();

  await expect(page).toHaveURL(/result=submitted/);
  const request = page
    .getByRole("listitem")
    .filter({ hasText: "E2E Phase 5 Worker" });
  await expect(request.getByText("pending", { exact: true })).toBeVisible();
  await request.getByText("View request details").click();
  page.once("dialog", (dialog) => dialog.accept());
  await request
    .getByRole("button", { name: "Approve full-day unpaid leave" })
    .click();
  await expect(request).toHaveCount(0, {
    timeout: 20_000,
  });
  await page.locator('select[name="status"]').selectOption("APPROVED");
  await page.locator('select[name="worker"]').selectOption(workerValue!);
  await page.getByRole("button", { name: "Filter" }).click();
  const approvedRequest = page
    .getByRole("listitem")
    .filter({ hasText: "E2E Phase 5 Worker" });
  await expect(
    approvedRequest.getByText("approved", { exact: true }),
  ).toBeVisible({
    timeout: 20_000,
  });
  if (
    !(await approvedRequest
      .locator("details")
      .evaluate((details: HTMLDetailsElement) => details.open))
  ) {
    await approvedRequest.getByText("View request details").click();
  }
  await expect(
    approvedRequest.getByText(
      "Approved full-day unpaid leave · 0 payable hours",
    ),
  ).toBeVisible({ timeout: 20_000 });
});
