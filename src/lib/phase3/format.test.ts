import { describe, expect, it } from "vitest";

import { documentExpiryState, maskIdentifier } from "@/lib/phase3/format";

describe("Phase 3 formatting", () => {
  it("masks identity numbers", () => {
    expect(maskIdentifier("AB 1234567")).toBe("AB•••••67");
  });

  it("distinguishes expired and 30-day document warnings", () => {
    expect(documentExpiryState("2026-07-23", "2026-07-24")).toBe("EXPIRED");
    expect(documentExpiryState("2026-08-23", "2026-07-24")).toBe("EXPIRING");
    expect(documentExpiryState("2026-08-24", "2026-07-24")).toBe("VALID");
  });
});
