import { describe, expect, it } from "vitest";

import { nextProjectStatuses } from "@/lib/phase2/status";

describe("project status transitions", () => {
  it("matches the approved project lifecycle", () => {
    expect(nextProjectStatuses("PLANNED")).toEqual(["ACTIVE"]);
    expect(nextProjectStatuses("ACTIVE")).toEqual(["COMPLETED", "CANCELLED"]);
    expect(nextProjectStatuses("COMPLETED")).toEqual(["ACTIVE", "ARCHIVED"]);
    expect(nextProjectStatuses("CANCELLED")).toEqual(["ACTIVE", "ARCHIVED"]);
    expect(nextProjectStatuses("ARCHIVED")).toEqual(["PLANNED"]);
  });
});
