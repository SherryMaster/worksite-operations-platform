import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

import { getPhaseOneTestUser } from "./support/clerk-users";

test("@smoke an unauthenticated visitor is sent to company sign-in", async ({
  page,
}) => {
  await page.goto("/ceo", { waitUntil: "commit" });

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(
    page.getByRole("heading", { name: "Sign in to continue" }),
  ).toBeVisible();
});

test("@smoke the CEO can open the responsive application shell", async ({
  isMobile,
  page,
}) => {
  const { signInTicket } = await getPhaseOneTestUser("CEO");

  await page.goto("/sign-in", { waitUntil: "commit" });
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto("/", { waitUntil: "commit" });

  await expect(page).toHaveURL(/\/ceo$/);
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("navigation", {
      name: isMobile ? "CEO mobile navigation" : "CEO navigation",
    }),
  ).toBeVisible();
});

test("@smoke an active Foreman can open the assigned responsive workspace", async ({
  isMobile,
  page,
}) => {
  const { signInTicket } = await getPhaseOneTestUser("FOREMAN");

  await page.goto("/sign-in", { waitUntil: "commit" });
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto("/ceo", { waitUntil: "commit" });

  await expect(page).toHaveURL(/\/foreman$/, { timeout: 20_000 });
  await expect(page.getByText("Live operations")).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole("heading", { name: "Today", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Day type")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: isMobile ? "Foreman mobile navigation" : "Foreman navigation",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).not.toBeVisible();
});
