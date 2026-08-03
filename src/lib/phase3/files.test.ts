import { describe, expect, it } from "vitest";

import {
  hasOptionalUploadFailures,
  maximumWorkerFileBytes,
  validateWorkerFile,
  workerDocumentAccept,
} from "@/lib/phase3/files";

describe("worker file policy", () => {
  it("allows common business files and image-only photos", () => {
    expect(
      validateWorkerFile(
        { name: "permit.pdf", size: 42, type: "application/pdf" },
        "DOCUMENT",
      ).ok,
    ).toBe(true);
    expect(
      validateWorkerFile(
        { name: "portrait.webp", size: 42, type: "image/webp" },
        "PHOTO",
      ).ok,
    ).toBe(true);
    expect(workerDocumentAccept).not.toContain("*");
  });

  it("rejects scripts, mismatched MIME types, and files above 10 MB", () => {
    expect(
      validateWorkerFile(
        { name: "run.exe", size: 42, type: "application/octet-stream" },
        "DOCUMENT",
      ).ok,
    ).toBe(false);
    expect(
      validateWorkerFile(
        { name: "permit.pdf", size: 42, type: "text/javascript" },
        "DOCUMENT",
      ).ok,
    ).toBe(false);
    expect(
      validateWorkerFile(
        {
          name: "permit.pdf",
          size: maximumWorkerFileBytes + 1,
          type: "application/pdf",
        },
        "DOCUMENT",
      ).ok,
    ).toBe(false);
  });

  it("reports partial optional-upload results without losing saved metadata", () => {
    expect(
      hasOptionalUploadFailures({
        uploaded: ["passport"],
        failed: [{ clientKey: "photo", message: "Retry photo" }],
      }),
    ).toBe(true);
    expect(
      hasOptionalUploadFailures({ uploaded: ["passport"], failed: [] }),
    ).toBe(false);
  });
});
