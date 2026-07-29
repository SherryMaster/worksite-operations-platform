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

test("the CEO can open the responsive application shell", async ({
  isMobile,
  page,
}) => {
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
  await expect(
    page.getByRole("navigation", {
      name: isMobile ? "CEO mobile navigation" : "CEO navigation",
    }),
  ).toBeVisible();
});

test("an active Foreman can open the assigned responsive workspace", async ({
  page,
}) => {
  const { signInTicket } = await getPhaseOneTestUser("FOREMAN");

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
    page.getByRole("navigation", { name: "Foreman navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Company dashboard" }),
  ).not.toBeVisible();
});
