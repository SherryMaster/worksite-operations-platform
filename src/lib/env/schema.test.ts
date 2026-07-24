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
});
