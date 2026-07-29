import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

import { cleanupPhaseTwoE2EProjects } from "./support/phase2-database";
import { getPhaseOneTestUser } from "./support/clerk-users";

test.beforeEach(async ({ isMobile }) => {
  test.skip(
    Boolean(isMobile),
    "CEO Phase 2 creation runs in desktop Chromium.",
  );
  cleanupPhaseTwoE2EProjects();
});

test.afterEach(async ({ isMobile }) => {
  if (!isMobile) {
    cleanupPhaseTwoE2EProjects();
  }
});

test("the CEO can create, update, and audit a project from the app", async ({
  page,
}) => {
  test.slow();
  const { signInTicket } = await getPhaseOneTestUser("CEO");
  const projectName = `E2E Phase 2 ${Date.now()}`;

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: { strategy: "ticket", ticket: signInTicket },
  });
  await page.goto("/ceo/settings");
  await expect(
    page.getByRole("heading", { name: "Create a Foreman account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByLabel("Initial Password")).toBeVisible();
  await page.goto("/ceo/projects/new");

  await page.getByLabel("Project name").fill(projectName);
  await page.getByLabel("Client").fill("Phase 2 Client");
  await page.getByLabel("Contractor").fill("Phase 2 Contractor");
  await page.getByLabel("Location").fill("Kuala Lumpur");
  await page.getByLabel("Start date").fill("2026-07-24");
  await page
    .getByLabel("Operational notes")
    .fill("Created by the repeatable Phase 2 browser test.");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page).toHaveURL(/\/ceo\/projects\/[a-f0-9-]+$/, {
    timeout: 20_000,
  });
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  await expect(page.getByText("Phase 2 Client", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Edit project" }).click();
  await page.getByLabel("Client").fill("Updated Phase 2 Client");
  await page.getByRole("button", { name: "Save project" }).click();

  await expect(page.getByText("Project details saved.")).toBeVisible({
    timeout: 20_000,
  });

  await page.goto("/ceo/audit");
  await expect(
    page.getByRole("heading", { name: "Audit log", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Project created" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Project details updated" }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(`created the project “${projectName}”.`, { exact: false }),
  ).toBeVisible();
});
