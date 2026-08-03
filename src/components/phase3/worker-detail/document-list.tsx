import { FileText } from "lucide-react";
import Link from "next/link";

import { StatusChip } from "@/components/operations/status-chip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { workerDocumentAccept } from "@/lib/phase3/files";
import type { WorkerDetail } from "@/lib/phase3/data";
import { formatDate } from "@/lib/phase2/format";
import { maskIdentifier } from "@/lib/phase3/format";

export function WorkerDocumentList({
  canManage,
  worker,
}: {
  canManage: boolean;
  worker: WorkerDetail;
}) {
  const active = worker.documents.filter(
    (item) => item.file_kind === "DOCUMENT" && item.status === "ACTIVE",
  );
  const history = worker.documents.filter((item) => item.status !== "ACTIVE");
  return (
    <div className="divide-y divide-slate-100">
      {active.length ? (
        active.map((document) => (
          <article
            key={document.id}
            className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <FileText
                  className="size-4 text-slate-500"
                  aria-hidden="true"
                />
                <h3 className="break-words font-semibold">
                  {document.documentTypeName ?? "Document"}
                </h3>
                <StatusChip
                  tone={
                    document.expiryState === "EXPIRED"
                      ? "danger"
                      : document.expiryState === "EXPIRING"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {document.expiryState}
                </StatusChip>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {maskIdentifier(document.document_number)} · Issued{" "}
                {document.issue_date
                  ? formatDate(document.issue_date)
                  : "not recorded"}{" "}
                · Expires{" "}
                {document.expiry_date
                  ? formatDate(document.expiry_date)
                  : "not recorded"}
              </p>
              {document.metadata &&
              typeof document.metadata === "object" &&
              !Array.isArray(document.metadata) ? (
                <p className="mt-1 break-words text-xs text-slate-500">
                  {Object.entries(document.metadata)
                    .filter(([, value]) => value)
                    .map(
                      ([key, value]) =>
                        `${key.replaceAll("_", " ")}: ${String(value)}`,
                    )
                    .join(" · ")}
                </p>
              ) : null}
              <p className="mt-1 text-xs font-medium text-slate-500">
                {document.object_path ? "Attached" : "No file attached"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {document.object_path ? (
                <Link
                  className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold"
                  href={`/api/workers/${worker.id}/documents/${document.id}`}
                >
                  Open
                </Link>
              ) : null}
              {canManage ? (
                <Sheet>
                  <SheetTrigger className="inline-flex min-h-11 items-center rounded-lg border border-violet-200 px-3 text-sm font-semibold text-violet-800">
                    Manage
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>
                        {document.documentTypeName ?? "Document"}
                      </SheetTitle>
                      <SheetDescription>
                        Edit structured metadata in the reviewed worker flow, or
                        manage this private file.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="grid gap-4 px-4">
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-violet-700 px-3 text-sm font-semibold text-white"
                        href={`/ceo/workers/${worker.id}/edit?stage=documents`}
                      >
                        Edit metadata
                      </Link>
                      <form
                        action={`/api/workers/${worker.id}/documents`}
                        method="post"
                        encType="multipart/form-data"
                        className="grid gap-3 rounded-lg border border-slate-200 p-3"
                      >
                        <input type="hidden" name="intent" value="save" />
                        <input type="hidden" name="fileKind" value="DOCUMENT" />
                        <input
                          type="hidden"
                          name="replaceDocumentId"
                          value={document.id}
                        />
                        <input
                          type="hidden"
                          name="documentTypeId"
                          value={document.document_type_id ?? ""}
                        />
                        <input
                          type="hidden"
                          name="documentNumber"
                          value={document.document_number ?? ""}
                        />
                        <input
                          type="hidden"
                          name="issueDate"
                          value={document.issue_date ?? ""}
                        />
                        <input
                          type="hidden"
                          name="expiryDate"
                          value={document.expiry_date ?? ""}
                        />
                        <input
                          type="hidden"
                          name="metadata"
                          value={JSON.stringify(document.metadata)}
                        />
                        <label className="grid gap-2 text-sm font-medium">
                          {document.object_path
                            ? "Replace file"
                            : "Attach file"}
                          <input
                            required
                            name="file"
                            type="file"
                            accept={workerDocumentAccept}
                            className="min-h-11 rounded-lg border border-slate-300 p-2"
                          />
                        </label>
                        <button className="min-h-11 rounded-lg border border-violet-200 text-sm font-semibold text-violet-800">
                          {document.object_path
                            ? "Replace file"
                            : "Attach file"}
                        </button>
                      </form>
                      {document.object_path ? (
                        <form
                          action={`/api/workers/${worker.id}/documents`}
                          method="post"
                        >
                          <input
                            type="hidden"
                            name="intent"
                            value="remove-file"
                          />
                          <input
                            type="hidden"
                            name="documentId"
                            value={document.id}
                          />
                          <button className="min-h-11 w-full rounded-lg border border-amber-300 text-sm font-semibold text-amber-900">
                            Remove file only
                          </button>
                        </form>
                      ) : null}
                      <form
                        action={`/api/workers/${worker.id}/documents`}
                        method="post"
                      >
                        <input
                          type="hidden"
                          name="intent"
                          value="remove-document"
                        />
                        <input
                          type="hidden"
                          name="documentId"
                          value={document.id}
                        />
                        <button className="min-h-11 w-full rounded-lg border border-red-300 text-sm font-semibold text-red-800">
                          Remove document
                        </button>
                      </form>
                    </div>
                  </SheetContent>
                </Sheet>
              ) : null}
            </div>
          </article>
        ))
      ) : (
        <p className="p-4 text-sm text-slate-500">No active documents.</p>
      )}
      {history.length ? (
        <details className="p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Replaced and removed history ({history.length})
          </summary>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            {history.map((item) => (
              <li key={item.id}>
                {item.file_kind === "PHOTO"
                  ? "Worker photo"
                  : (item.documentTypeName ?? "Document")}{" "}
                · {item.status} · {formatDate(item.created_at.slice(0, 10))}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
