import { describe, expect, it } from "vitest";

import { parseServerEnvironment } from "@/lib/env/schema";

const validEnvironment = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
  CLERK_SECRET_KEY: "sk_test_example",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    "sb_publishable_example_value_long_enough",
};

describe("server environment validation", () => {
  it("accepts the required development service configuration", () => {
    expect(parseServerEnvironment(validEnvironment)).toEqual(validEnvironment);
  });

  it("reports invalid variables without exposing their values", () => {
    expect(() =>
      parseServerEnvironment({
        ...validEnvironment,
        CLERK_SECRET_KEY: "wrong",
      }),
    ).toThrow("CLERK_SECRET_KEY");

    expect(() =>
      parseServerEnvironment({
        ...validEnvironment,
        CLERK_SECRET_KEY: "wrong",
      }),
    ).not.toThrow("wrong");
  });

  it.each([
    [undefined, "pk_test_example", "sk_test_example"],
    ["development", "pk_test_example", "sk_test_example"],
    ["preview", "pk_test_example", "sk_test_example"],
    ["production", "pk_test_example", "sk_test_example"],
    [undefined, "pk_live_example", "sk_live_example"],
    ["preview", "pk_live_example", "sk_live_example"],
    ["production", "pk_live_example", "sk_live_example"],
  ])(
    "accepts a matched Clerk key pair for VERCEL_ENV=%s",
    (vercelEnvironment, publishableKey, secretKey) => {
      expect(() =>
        parseServerEnvironment({
          ...validEnvironment,
          CLERK_SECRET_KEY: secretKey,
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
          VERCEL_ENV: vercelEnvironment,
        }),
      ).not.toThrow();
    },
  );

  it.each([
    [undefined, "pk_live_example", "sk_test_example"],
    [undefined, "pk_test_example", "sk_live_example"],
    ["development", "pk_live_example", "sk_test_example"],
    ["development", "pk_test_example", "sk_live_example"],
    ["production", "pk_live_example", "sk_test_example"],
    ["production", "pk_test_example", "sk_live_example"],
    ["preview", "pk_live_example", "sk_test_example"],
    ["preview", "pk_test_example", "sk_live_example"],
  ])(
    "rejects a mixed Clerk key pair for VERCEL_ENV=%s without exposing values",
    (vercelEnvironment, publishableKey, secretKey) => {
      let message = "";
      try {
        parseServerEnvironment({
          ...validEnvironment,
          CLERK_SECRET_KEY: secretKey,
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
          VERCEL_ENV: vercelEnvironment,
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      expect(message).toMatch(
        /CLERK_SECRET_KEY|NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/,
      );
      expect(message).not.toContain(publishableKey);
      expect(message).not.toContain(secretKey);
    },
  );
});
