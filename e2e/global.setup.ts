import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

setup("configure Clerk testing", async () => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await clerkSetup();
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
});
