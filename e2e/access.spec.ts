import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

import { getPhaseOneTestUsers } from "./support/clerk-users";

test("an unauthenticated visitor is sent to company sign-in", async ({
  page,
}) => {
  await page.goto("/ceo");

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(
    page.getByRole("heading", { name: "Sign in to continue" }),
  ).toBeVisible();
});

test("the CEO can open the desktop application shell", async ({ page }) => {
  const { ceoEmailAddress } = await getPhaseOneTestUsers();

  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: ceoEmailAddress });
  await page.goto("/");

  await expect(page).toHaveURL(/\/ceo$/);
  await expect(
    page.getByRole("heading", { name: "Company dashboard" }),
  ).toBeVisible();
  await expect(page.getByLabel("Access verified")).toBeVisible();
});

test("a Foreman can work without MFA when the CEO leaves it off", async ({
  page,
}) => {
  const { foremanEmailAddress, foremanMfaEnabled } =
    await getPhaseOneTestUsers();

  test.skip(
    foremanMfaEnabled,
    "The configured Clerk user already has MFA enrolled and requires a second-factor test helper.",
  );

  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: foremanEmailAddress });
  await page.goto("/ceo");

  await expect(page).toHaveURL(/\/foreman$/);
  await expect(
    page.getByRole("heading", { name: "Site operations" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Company dashboard" }),
  ).not.toBeVisible();
});
