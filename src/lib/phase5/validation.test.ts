import { describe, expect, it } from "vitest";

import {
  leavePayableMinutes,
  leaveSubmissionSchema,
} from "@/lib/phase5/validation";

const validRequest = {
  endsOn: "2026-08-02",
  leaveTypeId: "50000000-0000-4000-8000-000000000001",
  notes: "",
  projectId: "50000000-0000-4000-8000-000000000002",
  reason: "Family matter",
  startsOn: "2026-08-01",
  workerId: "50000000-0000-4000-8000-000000000003",
};

describe("phase 5 leave rules", () => {
  it("accepts an inclusive full-day date range", () => {
    const result = leaveSubmissionSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it("rejects a leave range that ends before it starts", () => {
    const result = leaveSubmissionSchema.safeParse({
      ...validRequest,
      endsOn: "2026-07-31",
    });
    expect(result.success).toBe(false);
  });

  it("represents approved leave as zero payable minutes", () => {
    expect(leavePayableMinutes("APPROVED")).toBe(0);
    expect(leavePayableMinutes("PENDING")).toBeNull();
    expect(leavePayableMinutes("REJECTED")).toBeNull();
  });
});
