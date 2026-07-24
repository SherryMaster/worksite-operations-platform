import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

import { getPhaseOneTestUser } from "./support/clerk-users";

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
  const { signInTicket } = await getPhaseOneTestUser("CEO");

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto("/");

  await expect(page).toHaveURL(/\/ceo$/);
  await expect(
    page.getByRole("heading", { name: "Company dashboard" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Access verified")).toBeVisible();
});

test("a Foreman can work without MFA when the CEO leaves it off", async ({
  page,
}) => {
  const { signInTicket, mfaEnabled } = await getPhaseOneTestUser("FOREMAN");

  test.skip(
    mfaEnabled,
    "The configured Clerk user already has MFA enrolled and requires a second-factor test helper.",
  );

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto("/ceo");

  await expect(page).toHaveURL(/\/foreman$/, { timeout: 20_000 });
  await expect(page.getByText("Today at the worksite")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByLabel("Work date")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Company dashboard" }),
  ).not.toBeVisible();
});
