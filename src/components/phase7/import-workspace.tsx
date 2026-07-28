"use client";

import { createClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ImportIssue = {
  field?: string;
  message: string;
  row: number;
  sheet: string;
};

type ImportSummary = {
  assignments: number;
  documents: number;
  projects: number;
  rates: number;
  workers: number;
};

type Preview = {
  batchId: string;
  canCommit: boolean;
  fileName: string;
  issues: ImportIssue[];
  message: string;
  summary: ImportSummary;
};

type SignedUpload = {
  id: string;
  name: string;
  path: string;
  size: number;
  token: string;
  type: "application/pdf" | "image/jpeg" | "image/png";
};

const summaryLabels: Array<[keyof ImportSummary, string]> = [
  ["projects", "Projects"],
  ["workers", "Workers"],
  ["assignments", "Assignments"],
  ["rates", "Rates"],
  ["documents", "Documents"],
];

export function ImportWorkspace() {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<
    "idle" | "previewing" | "ready" | "committing" | "complete" | "error"
  >("idle");

  async function previewWorkbook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const documentInput = form.elements.namedItem(
      "documents",
    ) as HTMLInputElement | null;
    const documentFiles = Array.from(documentInput?.files ?? []);
    setState("previewing");
    setMessage(
      documentFiles.length > 0
        ? "Preparing secure document uploads…"
        : "Reading and validating every populated row…",
    );
    setPreview(null);
    let batchId = "";
    let uploads: SignedUpload[] = [];
    if (documentFiles.length > 0) {
      const tokenResponse = await fetch("/api/imports/uploads", {
        body: JSON.stringify({
          files: documentFiles.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }).catch(() => null);
      if (!tokenResponse) {
        setState("error");
        setMessage("Secure document uploads could not be prepared.");
        return;
      }
      const tokenBody = (await tokenResponse.json().catch(() => ({}))) as {
        batchId?: string;
        message?: string;
        uploads?: SignedUpload[];
      };
      if (!tokenResponse.ok || !tokenBody.batchId || !tokenBody.uploads) {
        setState("error");
        setMessage(
          tokenBody.message ?? "Secure document uploads could not be prepared.",
        );
        return;
      }
      batchId = tokenBody.batchId;
      uploads = tokenBody.uploads;
      const storage = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false } },
      );
      for (const [index, upload] of uploads.entries()) {
        setMessage(
          `Uploading private document ${index + 1} of ${uploads.length}…`,
        );
        const file = documentFiles.find(
          (item) =>
            item.name.toLocaleLowerCase() === upload.name.toLocaleLowerCase(),
        );
        if (!file) {
          setState("error");
          setMessage(
            `The selected file “${upload.name}” is no longer available.`,
          );
          return;
        }
        const uploaded = await storage.storage
          .from("worker-documents")
          .uploadToSignedUrl(upload.path, upload.token, file, {
            contentType: upload.type,
          });
        if (uploaded.error) {
          setState("error");
          setMessage(`“${upload.name}” could not be uploaded. Try again.`);
          return;
        }
      }
      setMessage("Reading and validating every populated row…");
    }

    const requestData = new FormData(form);
    requestData.delete("documents");
    if (batchId) requestData.set("batchId", batchId);
    requestData.set(
      "stagedDocuments",
      JSON.stringify(
        uploads.map(({ id, name, path, size, type }) => ({
          id,
          name,
          path,
          size,
          type,
        })),
      ),
    );
    const response = await fetch("/api/imports/preview", {
      body: requestData,
      method: "POST",
    }).catch(() => null);
    if (!response) {
      setState("error");
      setMessage("The preview request could not reach the server.");
      return;
    }
    const body = (await response.json().catch(() => ({}))) as Partial<
      Preview & { message: string }
    >;
    if (!response.ok || !body.batchId) {
      setState("error");
      setMessage(body.message ?? "The workbook could not be previewed.");
      return;
    }
    const nextPreview = body as Preview;
    setPreview(nextPreview);
    setMessage(nextPreview.message);
    setState(nextPreview.canCommit ? "ready" : "error");
    router.refresh();
  }

  async function commitImport() {
    if (!preview?.canCommit) return;
    setState("committing");
    setMessage("Importing the validated rows as one transaction…");
    const response = await fetch("/api/imports/commit", {
      body: JSON.stringify({ batchId: preview.batchId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => null);
    if (!response) {
      setState("error");
      setMessage("The import request could not reach the server.");
      return;
    }
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    if (!response.ok) {
      setState("error");
      setMessage(body.message ?? "The import was not committed.");
      return;
    }
    setState("complete");
    setMessage(
      body.message ??
        "Import committed. The new records are now available throughout the app.",
    );
    router.refresh();
  }

  const pending = state === "previewing" || state === "committing";

  return (
    <section className="mt-6 border border-stone-300 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <FileSpreadsheet
          className="mt-1 size-6 shrink-0 text-amber-700"
          aria-hidden="true"
        />
        <div>
          <h2 className="font-heading text-2xl font-semibold uppercase">
            Preview a fixed-template workbook
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Preview never changes company records. If the WorkerDocuments sheet
            contains rows, attach the matching PDF, JPEG, or PNG files using the
            exact file names written in the sheet.
          </p>
        </div>
      </div>

      <form
        onSubmit={previewWorkbook}
        className="mt-5 grid gap-4 border-t border-stone-200 pt-5 lg:grid-cols-2"
      >
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
          Import workbook (.xlsx)
          <input
            name="workbook"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            disabled={pending}
            className="mt-2 block min-h-11 w-full border border-stone-300 bg-stone-50 p-2 text-sm file:mr-3 file:border-0 file:bg-stone-950 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
          Matching document files (when listed)
          <input
            name="documents"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            multiple
            disabled={pending}
            className="mt-2 block min-h-11 w-full border border-stone-300 bg-stone-50 p-2 text-sm file:mr-3 file:border-0 file:bg-stone-950 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-stone-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-2 lg:w-fit"
        >
          {state === "previewing" ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-4" aria-hidden="true" />
          )}
          {state === "previewing" ? "Validating workbook…" : "Preview Import"}
        </button>
      </form>

      {message ? (
        <div
          className={`mt-5 flex items-start gap-3 border p-4 text-sm ${
            state === "ready" || state === "complete"
              ? "border-emerald-300 bg-emerald-50 text-emerald-950"
              : state === "previewing" || state === "committing"
                ? "border-amber-300 bg-amber-50 text-amber-950"
                : "border-red-300 bg-red-50 text-red-950"
          }`}
          role="status"
          aria-live="polite"
        >
          {state === "ready" || state === "complete" ? (
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          ) : state === "previewing" || state === "committing" ? (
            <LoaderCircle
              className="mt-0.5 size-4 shrink-0 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          )}
          <p>{message}</p>
        </div>
      ) : null}

      {preview ? (
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {summaryLabels.map(([key, label]) => (
              <div key={key} className="border border-stone-200 p-3">
                <p className="text-2xl font-semibold tabular-nums">
                  {preview.summary[key]}
                </p>
                <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-stone-500">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {preview.issues.length > 0 ? (
            <div className="mt-5">
              <h3 className="font-heading text-xl font-semibold uppercase">
                Rows to correct ({preview.issues.length})
              </h3>
              <div className="mt-3 overflow-x-auto border border-stone-300">
                <table className="w-full min-w-[42rem] text-left text-sm">
                  <thead className="bg-stone-950 text-white">
                    <tr>
                      <th className="px-3 py-3">Sheet</th>
                      <th className="px-3 py-3">Row</th>
                      <th className="px-3 py-3">Field</th>
                      <th className="px-3 py-3">What to fix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {preview.issues.map((issue, index) => (
                      <tr key={`${issue.sheet}-${issue.row}-${index}`}>
                        <td className="px-3 py-3 font-medium">{issue.sheet}</td>
                        <td className="px-3 py-3 tabular-nums">
                          {issue.row || "—"}
                        </td>
                        <td className="px-3 py-3">{issue.field ?? "—"}</td>
                        <td className="px-3 py-3 text-stone-600">
                          {issue.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {preview.canCommit && state !== "complete" ? (
            <div className="mt-5 border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm leading-6 text-amber-950">
                Review the totals above. Committing creates these records
                together; a database error rolls back the whole batch.
              </p>
              <button
                type="button"
                onClick={commitImport}
                disabled={pending}
                className="mt-3 inline-flex min-h-11 items-center gap-2 bg-amber-700 px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {state === "committing" ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                )}
                {state === "committing"
                  ? "Committing import…"
                  : "Commit This Import"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
