import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import { join } from "node:path";

import { getPhaseOneTestUser } from "./support/clerk-users";
import { cleanupPhaseSevenE2EData } from "./support/phase7-database";

test.beforeEach(async ({ isMobile }) => {
  test.skip(
    Boolean(isMobile),
    "CEO report export and migration control run in desktop Chromium.",
  );
  cleanupPhaseSevenE2EData();
});

test.afterEach(async ({ isMobile }) => {
  if (!isMobile) cleanupPhaseSevenE2EData();
});

test("the CEO filters reports, exports Excel, and previews an invalid import", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { signInTicket } = await getPhaseOneTestUser("CEO");
  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });

  await page.goto("/ceo/reports");
  await expect(
    page.getByRole("heading", { name: "Reports Center" }),
  ).toBeVisible();
  await expect(page.getByLabel("Report").locator("option")).toHaveCount(11);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download Excel" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^current-workforce-and-assignments-\d{4}-\d{2}-\d{2}\.xlsx$/,
  );

  await page.getByRole("link", { name: "Open Import Center" }).click();
  await expect(
    page.getByRole("heading", { name: "Import Center" }),
  ).toBeVisible({ timeout: 30_000 });
  await page
    .getByLabel("Import workbook (.xlsx)")
    .setInputFiles(
      join(process.cwd(), "public/templates/worksite-import-template.xlsx"),
    );
  await page.getByRole("button", { name: "Preview Import" }).click();
  await expect(
    page.getByText("The workbook contains no import rows."),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("button", { name: "Commit This Import" }),
  ).toHaveCount(0);
});
