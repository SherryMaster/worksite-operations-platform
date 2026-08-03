export const maximumWorkerFileBytes = 10 * 1024 * 1024;

const businessFileTypes = {
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  heic: ["image/heic"],
  heif: ["image/heif"],
  jpeg: ["image/jpeg"],
  jpg: ["image/jpeg"],
  pdf: ["application/pdf"],
  png: ["image/png"],
  webp: ["image/webp"],
} as const;

const photoExtensions = new Set(["heic", "heif", "jpeg", "jpg", "png", "webp"]);

export const workerDocumentAccept = Object.entries(businessFileTypes)
  .flatMap(([extension, mimeTypes]) => [`.${extension}`, ...mimeTypes])
  .join(",");

export const workerPhotoAccept = Object.entries(businessFileTypes)
  .filter(([extension]) => photoExtensions.has(extension))
  .flatMap(([extension, mimeTypes]) => [`.${extension}`, ...mimeTypes])
  .join(",");

export type WorkerFileKind = "DOCUMENT" | "PHOTO";

export type WorkerFileDescriptor = {
  extension: string;
  mimeType: string;
  originalFilename: string;
  size: number;
};

export type WorkerFileValidation =
  | { descriptor: WorkerFileDescriptor; ok: true }
  | { message: string; ok: false };

export function safeWorkerFilename(filename: string) {
  const normalized = filename
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(-120) || "worker-file";
}

export function validateWorkerFile(
  file: Pick<File, "name" | "size" | "type">,
  kind: WorkerFileKind,
): WorkerFileValidation {
  if (!file.name.trim() || file.name.length > 255) {
    return {
      message: "Choose a file with a name of 255 characters or fewer.",
      ok: false,
    };
  }
  if (file.size < 1 || file.size > maximumWorkerFileBytes) {
    return { message: "Choose a file between 1 byte and 10 MB.", ok: false };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedMimeTypes = businessFileTypes[
    extension as keyof typeof businessFileTypes
  ] as readonly string[] | undefined;
  if (
    !allowedMimeTypes ||
    (kind === "PHOTO" && !photoExtensions.has(extension))
  ) {
    return {
      message:
        kind === "PHOTO"
          ? "Choose a JPEG, PNG, WEBP, HEIC, or HEIF image."
          : "Choose a PDF, image, DOC, or DOCX business file.",
      ok: false,
    };
  }

  const mimeType = file.type.toLowerCase();
  if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
    return {
      message:
        "The file extension and content type do not match an allowed format.",
      ok: false,
    };
  }

  return {
    descriptor: {
      extension,
      mimeType,
      originalFilename: file.name,
      size: file.size,
    },
    ok: true,
  };
}

export type OptionalUploadResult = {
  failed: Array<{ clientKey: string; message: string }>;
  uploaded: string[];
};

export function hasOptionalUploadFailures(result: OptionalUploadResult) {
  return result.failed.length > 0;
}
