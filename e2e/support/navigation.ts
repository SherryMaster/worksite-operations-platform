import type { Page } from "@playwright/test";

export async function recoverProtectedPage(page: Page) {
  const retryButton = page.getByRole("button", { name: "Try again" });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!(await retryButton.isVisible().catch(() => false))) return;
    await page.reload({ waitUntil: "domcontentloaded" });
  }
}
