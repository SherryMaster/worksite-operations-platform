import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

import { getPhaseOneTestUsers } from "./support/clerk-users";
import {
  cleanupPhaseThreeE2EWorkers,
  setupPhaseThreeE2EData,
} from "./support/phase3-database";

test.beforeEach(async ({ isMobile }) => {
  test.skip(Boolean(isMobile), "CEO worker creation runs in desktop Chromium.");
  setupPhaseThreeE2EData();
});

test.afterEach(async ({ isMobile }) => {
  if (!isMobile) cleanupPhaseThreeE2EWorkers();
});

test("the CEO can create, find, update, and audit a worker", async ({
  page,
}) => {
  test.slow();
  const { ceoEmailAddress } = await getPhaseOneTestUsers();
  const suffix = Date.now();
  const workerName = `E2E Phase 3 Worker ${suffix}`;

  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: ceoEmailAddress });
  await page.goto("/ceo/workers/new");

  await page.getByLabel("Legal Name").fill(workerName);
  await page.getByLabel("Phone Number").fill("+60123456789");
  await page.getByLabel("Nationality").fill("Pakistan");
  await page.getByLabel("Passport Number").fill(`E2E-P3-${suffix}`);
  await page.getByLabel("Trade").selectOption({ label: "E2E Phase 3 Trade" });
  await page
    .getByLabel("Skill Level")
    .selectOption({ label: "E2E Phase 3 Skill" });
  await page.getByLabel("Monthly Food Deduction").fill("120.00");
  await page.getByLabel("Employment Start Date").fill("2026-07-24");
  await page.getByLabel("Hourly Rate").fill("15.50");
  await page.getByLabel("Rate Effective Date").fill("2026-07-24");
  await page
    .getByLabel("Initial Project")
    .selectOption({ label: "E2E Phase 3 Project" });
  await page.getByLabel("Assignment Effective Date").fill("2026-07-24");
  await page.getByRole("button", { name: "Create Worker" }).click();

  await expect(page).toHaveURL(/\/ceo\/workers\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
  await expect(page.getByRole("heading", { name: workerName })).toBeVisible();
  await expect(page.getByText("E2E Phase 3 Project")).toBeVisible();
  await expect(page.getByText("RM 15.50")).toBeVisible();

  await page.getByRole("link", { name: "Edit Worker" }).click();
  await page.getByLabel("Phone Number").fill("+60129876543");
  await page.getByRole("button", { name: "Save Worker" }).click();
  await expect(page.getByText("Worker profile saved.")).toBeVisible({
    timeout: 20_000,
  });

  await page.goto(`/ceo/workers?query=${encodeURIComponent(workerName)}`);
  await expect(page.getByText(workerName).first()).toBeVisible();

  await page.goto(`/ceo/audit?query=${encodeURIComponent(workerName)}`);
  await expect(
    page.getByRole("heading", { name: "Worker profile created" }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(`created the worker profile for ${workerName}.`, {
      exact: false,
    }),
  ).toBeVisible();
});
