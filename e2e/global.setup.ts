import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

setup("configure Clerk testing", async () => {
  await clerkSetup();
});
