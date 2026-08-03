import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";

import { getPhaseOneTestUser } from "./support/clerk-users";
import {
  cleanupPhaseThreeE2EWorkers,
  setupPhaseThreeE2EData,
} from "./support/phase3-database";

async function signIn(page: Page, role: "CEO" | "FOREMAN" = "CEO") {
  const { signInTicket } = await getPhaseOneTestUser(role);
  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
}

async function fillWorkerDraft(
  page: Page,
  workerName: string,
  identifier: string,
  withFiles = false,
) {
  await page.goto("/ceo/workers/new");
  await page.getByLabel("Full name *").fill(workerName);
  await page.getByLabel("Phone number *").fill("+60123456789");
  await page.getByLabel("Nationality *").fill("Pakistan");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Hourly pay rate (MYR) *").fill("15.50");
  await page.getByLabel("Trade *").selectOption({ label: "E2E Phase 3 Trade" });
  await page
    .getByLabel("Skill level *")
    .selectOption({ label: "E2E Phase 3 Skill" });
  await page.getByLabel("Monthly food deduction (MYR) *").fill("120.00");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Passport/ }).click();
  await page.getByLabel("Document number *").fill(identifier);
  await page.getByLabel("Issue date *").fill("2026-01-01");
  await page.getByLabel("Expiry date *").fill("2031-01-01");
  if (withFiles)
    await page.getByLabel("Private file (optional)").setInputFiles({
      name: "passport.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("private-test-document"),
    });
  await page.getByRole("button", { name: "Continue" }).click();
  if (withFiles)
    await page.getByLabel("Worker photo (optional)").setInputFiles({
      name: "worker.png",
      mimeType: "image/png",
      buffer: Buffer.from("89504e470d0a1a0a", "hex"),
    });
  await page.getByRole("button", { name: "Continue" }).click();
}

test.beforeEach(() => setupPhaseThreeE2EData());
test.afterEach(() => cleanupPhaseThreeE2EWorkers());

test("CEO creates a metadata-only worker through five reviewed stages and edits with rate history", async ({
  page,
  isMobile,
}) => {
  test.skip(Boolean(isMobile), "Desktop worker lifecycle coverage.");
  test.slow();
  await signIn(page);
  const suffix = Date.now();
  const workerName = `E2E Phase 3 Worker ${suffix}`;
  await fillWorkerDraft(page, workerName, `E2E-P3-${suffix}`);
  await expect(
    page.getByRole("heading", { name: "Review worker details" }),
  ).toBeVisible();
  await expect(page.getByText("No file attached")).toBeVisible();
  await expect(page).toHaveURL(/\/ceo\/workers\/new/);
  await page.getByRole("button", { name: "Create worker" }).click();
  await expect(page).toHaveURL(/\/ceo\/workers\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
  await expect(page.getByRole("heading", { name: workerName })).toBeVisible();
  await expect(page.getByText("Awaiting assignment").first()).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Worker sections" }).getByRole("link"),
  ).toHaveCount(6);

  await page.getByRole("link", { name: "Edit worker" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Hourly pay rate (MYR) *").fill("16.50");
  await expect(page.getByLabel("Effective from *")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/RM 15.50/)).toBeVisible();
  await expect(page.getByText(/RM 16.50/)).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/ceo\/workers\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
  await page.getByRole("link", { name: "Work history" }).click();
  await expect(page.getByText("RM 15.50", { exact: false })).toBeVisible();
  await expect(page.getByText("RM 16.50", { exact: false })).toBeVisible();
});

test("Review blocks duplicates until deliberate override and optional private files can be selected", async ({
  page,
  isMobile,
}) => {
  test.skip(Boolean(isMobile), "Desktop duplicate and file coverage.");
  test.slow();
  await signIn(page);
  const identifier = `E2E-DUP-${Date.now()}`;
  await fillWorkerDraft(
    page,
    `E2E Phase 3 Worker First ${Date.now()}`,
    identifier,
    true,
  );
  await expect(page).toHaveURL(/\/ceo\/workers\/new/);
  await page.getByRole("button", { name: "Create worker" }).click();
  await expect(page).toHaveURL(/\/ceo\/workers\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });

  await fillWorkerDraft(
    page,
    `E2E Phase 3 Worker Duplicate ${Date.now()}`,
    identifier.toLowerCase().replaceAll("-", " "),
  );
  await page.getByRole("button", { name: "Create worker" }).click();
  await expect(
    page.getByRole("link", { name: /Open possible match/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Review worker details" }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create worker" }).click();
  await expect(page).toHaveURL(/\/ceo\/workers\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
});

test("worker detail uses a mobile section sheet and keeps CEO-only information out of the Foreman view", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Mobile responsive worker detail coverage.");
  test.slow();
  await signIn(page);
  const workerName = `E2E Phase 3 Worker Mobile ${Date.now()}`;
  await fillWorkerDraft(page, workerName, `E2E-MOBILE-${Date.now()}`);
  await page.getByRole("button", { name: "Create worker" }).click();
  await expect(page).toHaveURL(/\/ceo\/workers\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.getByRole("button", { name: /Section Overview/ }).click();
  await page.getByRole("link", { name: "Attendance & leave" }).click();
  await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible();
  await signIn(page, "FOREMAN");
  await page.goto("/foreman/workers");
  await page.getByRole("link", { name: /Open / }).first().click();
  await expect(
    page.getByText(/Hourly rate|Food deduction|Payroll|Activity/),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Section/ }).click();
  await expect(page.getByRole("link", { name: "Attendance" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Leave" })).toBeVisible();
});
