import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

import { getPhaseOneTestUser } from "./support/clerk-users";
import {
  cleanupPhaseFourE2EData,
  setupPhaseFourE2EData,
} from "./support/phase4-database";

async function expectAttendanceSynchronized(
  page: import("@playwright/test").Page,
) {
  await expect(
    page.getByText(/Saved on device|Syncing|waiting to synchronize/),
  ).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByText(/need attention/i)).toHaveCount(0);
}

test.beforeEach(async ({ isMobile }, testInfo) => {
  const ceoTest = testInfo.title.startsWith("the CEO");
  test.skip(
    ceoTest ? Boolean(isMobile) : !isMobile,
    ceoTest
      ? "CEO attendance review runs in desktop Chromium."
      : "Foreman attendance runs in mobile Chromium.",
  );
  setupPhaseFourE2EData(ceoTest ? "CEO" : "FOREMAN");
});

test.afterEach(async ({ isMobile }, testInfo) => {
  const ceoTest = testInfo.title.startsWith("the CEO");
  if ((ceoTest && !isMobile) || (!ceoTest && isMobile)) {
    cleanupPhaseFourE2EData(ceoTest ? "CEO" : "FOREMAN");
  }
});

test("a Foreman records a complete multi-session attendance day", async ({
  page,
}) => {
  test.slow();
  const { signInTicket } = await getPhaseOneTestUser("FOREMAN");

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto("/foreman");

  const worker = page
    .getByRole("article")
    .filter({ hasText: "E2E Phase 4 Worker" });
  await expect(worker).toBeVisible();
  await worker.getByRole("button", { name: "Enter" }).click();
  await expect(worker.getByText("On site", { exact: true })).toBeVisible();
  await expectAttendanceSynchronized(page);

  await worker.getByRole("button", { name: "Start break" }).click();
  await expect(worker.getByText("On break", { exact: true })).toBeVisible();
  await expectAttendanceSynchronized(page);
  await worker.getByRole("button", { name: "End break" }).click();
  await expectAttendanceSynchronized(page);
  await worker.getByRole("button", { name: "Exit" }).click();
  await expect(worker.getByText("Exited", { exact: true })).toBeVisible();
  await expectAttendanceSynchronized(page);

  await worker.getByRole("button", { name: "Enter" }).click();
  await expectAttendanceSynchronized(page);
  await worker.getByRole("button", { name: "Exit" }).click();
  await expect(worker.getByText("Session 2", { exact: true })).toBeVisible();
  await expectAttendanceSynchronized(page);
});

test("an offline Foreman action survives a reload and synchronizes later", async ({
  context,
  page,
}) => {
  test.slow();
  const { signInTicket } = await getPhaseOneTestUser("FOREMAN");

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto("/foreman");
  await expect(page.getByText("E2E Phase 4 Worker")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByText("E2E Phase 4 Worker")).toBeVisible();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  await context.setOffline(true);
  const worker = page
    .getByRole("article")
    .filter({ hasText: "E2E Phase 4 Worker" });
  await worker.getByRole("button", { name: "Enter" }).click();
  await expect(
    page.getByText("Saved on this device. It will synchronize", {
      exact: false,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("E2E Phase 4 Worker")).toBeVisible();
  await expect(
    page
      .getByRole("article")
      .filter({ hasText: "E2E Phase 4 Worker" })
      .getByText("On site", { exact: true }),
  ).toBeVisible();

  await context.setOffline(false);
  await expectAttendanceSynchronized(page);
});

test("the CEO can inspect and correct project attendance", async ({ page }) => {
  test.slow();
  const { signInTicket } = await getPhaseOneTestUser("CEO");

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto("/ceo/attendance");

  const worker = page
    .getByRole("article")
    .filter({ hasText: "E2E Phase 4 CEO Worker" });
  await expect(worker).toBeVisible();
  await worker.getByRole("button", { name: /correct times/i }).click();
  await page.getByRole("button", { name: "Add session" }).click();
  await page
    .getByLabel("Reason for correction")
    .fill("Matched the signed worksite sheet");
  await page.getByRole("button", { name: "Save correction" }).click();
  await expectAttendanceSynchronized(page);
  await expect(worker.getByText("On site", { exact: true })).toBeVisible();
});
