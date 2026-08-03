import { ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { documentHasData } from "@/components/phase3/worker-record-form/helpers";
import type {
  DraftErrors,
  WorkerDocumentDraft,
  WorkerDocumentType,
} from "@/components/phase3/worker-record-form/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { workerDocumentAccept } from "@/lib/phase3/files";

const metadataLabels: Record<string, string> = {
  certificateType: "Course / certificate type",
  contractEndDate: "Contract end date",
  contractStartDate: "Contract start date",
  employer: "Employer",
  employerSponsor: "Employer / sponsor",
  examinationDate: "Examination / certificate date",
  issuer: "Issuer",
  issuingAuthority: "Issuing authority",
  issuingCountry: "Issuing country",
  notes: "Short notes",
  permitType: "Permit / pass type",
  provider: "Provider",
  providerClinic: "Provider / clinic",
  registrationCategory: "Registration / category detail",
  sectorCardType: "Sector / card type",
};

const pinnedCodes = new Set(["CNIC", "PASSPORT", "WORK_PERMIT"]);

function metadataFieldNames(type: WorkerDocumentType) {
  return Array.isArray(type.metadata_fields)
    ? type.metadata_fields.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
}

export function DocumentEditor({
  documentTypes,
  documents,
  errors,
  setDocuments,
}: {
  documentTypes: WorkerDocumentType[];
  documents: WorkerDocumentDraft[];
  errors: DraftErrors;
  setDocuments: (documents: WorkerDocumentDraft[]) => void;
}) {
  const [activeKey, setActiveKey] = useState(documents[0]?.clientKey ?? "");
  const [typeToAdd, setTypeToAdd] = useState("");
  useEffect(() => {
    if (!documents.some((document) => document.clientKey === activeKey)) {
      setActiveKey(documents[0]?.clientKey ?? "");
    }
  }, [activeKey, documents]);
  useEffect(() => {
    const firstDocumentError = Object.keys(errors).find((key) =>
      key.startsWith("document-"),
    );
    if (!firstDocumentError) return;
    const document = documents.find((item) =>
      firstDocumentError.startsWith(`document-${item.clientKey}-`),
    );
    if (!document) return;
    setActiveKey(document.clientKey);
    requestAnimationFrame(() =>
      window.document.getElementById(firstDocumentError)?.focus(),
    );
  }, [documents, errors]);
  const active = documents.find((document) => document.clientKey === activeKey);
  const activeType = active
    ? documentTypes.find((type) => type.id === active.documentTypeId)
    : null;
  const availableTypes = useMemo(
    () =>
      documentTypes.filter(
        (type) =>
          type.is_repeatable ||
          !documents.some((document) => document.documentTypeId === type.id),
      ),
    [documentTypes, documents],
  );
  const update = (clientKey: string, patch: Partial<WorkerDocumentDraft>) =>
    setDocuments(
      documents.map((document) =>
        document.clientKey === clientKey ? { ...document, ...patch } : document,
      ),
    );

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)_12rem]">
      <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h3 className="font-semibold">Document sections</h3>
          <p className="mt-1 text-xs text-slate-500">
            Blank optional sections are not saved.
          </p>
        </div>
        <div className="space-y-1 p-3">
          {documents.map((document) => {
            const type = documentTypes.find(
              (option) => option.id === document.documentTypeId,
            );
            const added = documentHasData(document);
            return (
              <button
                key={document.clientKey}
                type="button"
                onClick={() => setActiveKey(document.clientKey)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ${document.clientKey === activeKey ? "border-violet-200 bg-violet-50" : "border-transparent hover:bg-slate-50"}`}
              >
                <FileText
                  className="size-4 shrink-0 text-violet-700"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold">
                    {type?.name ?? "Document"}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {added
                      ? "Added"
                      : pinnedCodes.has(type?.system_code ?? "")
                        ? "Pinned"
                        : "Optional"}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
              </button>
            );
          })}
          <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3">
            <Label htmlFor="addDocumentType" className="sr-only">
              Add another document
            </Label>
            <select
              id="addDocumentType"
              value={typeToAdd}
              onChange={(event) => setTypeToAdd(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Add another document</option>
              {availableTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              disabled={!typeToAdd}
              onClick={() => {
                const type = documentTypes.find(
                  (option) => option.id === typeToAdd,
                );
                if (!type) return;
                const document: WorkerDocumentDraft = {
                  clientKey: crypto.randomUUID(),
                  documentNumber: "",
                  documentTypeId: type.id,
                  expiryDate: "",
                  file: null,
                  fileAction: "keep",
                  hasFile: false,
                  id: null,
                  issueDate: "",
                  metadata: {},
                  originalFilename: "",
                  systemCode: type.system_code,
                };
                setDocuments([...documents, document]);
                setActiveKey(document.clientKey);
                setTypeToAdd("");
              }}
            >
              <Plus aria-hidden="true" />
              Add section
            </Button>
          </div>
        </div>
      </aside>

      <section className="min-w-0 rounded-xl border border-slate-200 bg-white">
        {active && activeType ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h3 className="break-words text-lg font-semibold">
                  {activeType.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Structured metadata · private file optional
                </p>
              </div>
              {!pinnedCodes.has(activeType.system_code ?? "") ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    setDocuments(
                      documents.filter(
                        (document) => document.clientKey !== active.clientKey,
                      ),
                    )
                  }
                >
                  <Trash2 aria-hidden="true" />
                  Remove section
                </Button>
              ) : null}
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`document-${active.clientKey}-number`}>
                  Document number
                  {activeType.expects_document_number ? " *" : ""}
                </Label>
                <Input
                  id={`document-${active.clientKey}-number`}
                  value={active.documentNumber}
                  onChange={(event) =>
                    update(active.clientKey, {
                      documentNumber: event.target.value,
                    })
                  }
                  maxLength={100}
                  spellCheck={false}
                  aria-invalid={Boolean(
                    errors[`document-${active.clientKey}-number`],
                  )}
                  className="h-11"
                />
                {errors[`document-${active.clientKey}-number`] ? (
                  <p className="text-xs text-red-700">
                    {errors[`document-${active.clientKey}-number`]}
                  </p>
                ) : null}
              </div>
              {metadataFieldNames(activeType).map((field) => (
                <div
                  key={field}
                  className={`space-y-2 ${field === "notes" ? "sm:col-span-2" : ""}`}
                >
                  <Label htmlFor={`document-${active.clientKey}-${field}`}>
                    {metadataLabels[field] ?? field}
                  </Label>
                  <Input
                    id={`document-${active.clientKey}-${field}`}
                    type={
                      field.toLowerCase().includes("date") ? "date" : "text"
                    }
                    value={active.metadata[field] ?? ""}
                    onChange={(event) =>
                      update(active.clientKey, {
                        metadata: {
                          ...active.metadata,
                          [field]: event.target.value,
                        },
                      })
                    }
                    maxLength={300}
                    className="h-11"
                  />
                </div>
              ))}
              {activeType.expects_issue_date || active.issueDate ? (
                <div className="space-y-2">
                  <Label htmlFor={`document-${active.clientKey}-issue`}>
                    Issue date{activeType.expects_issue_date ? " *" : ""}
                  </Label>
                  <Input
                    id={`document-${active.clientKey}-issue`}
                    type="date"
                    value={active.issueDate}
                    onChange={(event) =>
                      update(active.clientKey, {
                        issueDate: event.target.value,
                      })
                    }
                    aria-invalid={Boolean(
                      errors[`document-${active.clientKey}-issue`],
                    )}
                    className="h-11"
                  />
                  {errors[`document-${active.clientKey}-issue`] ? (
                    <p className="text-xs text-red-700">
                      {errors[`document-${active.clientKey}-issue`]}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {activeType.expects_expiry_date || active.expiryDate ? (
                <div className="space-y-2">
                  <Label htmlFor={`document-${active.clientKey}-expiry`}>
                    Expiry date{activeType.expects_expiry_date ? " *" : ""}
                  </Label>
                  <Input
                    id={`document-${active.clientKey}-expiry`}
                    type="date"
                    value={active.expiryDate}
                    onChange={(event) =>
                      update(active.clientKey, {
                        expiryDate: event.target.value,
                      })
                    }
                    aria-invalid={Boolean(
                      errors[`document-${active.clientKey}-expiry`],
                    )}
                    className="h-11"
                  />
                  {errors[`document-${active.clientKey}-expiry`] ? (
                    <p className="text-xs text-red-700">
                      {errors[`document-${active.clientKey}-expiry`]}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`document-file-${active.clientKey}`}>
                  Private file (optional)
                </Label>
                <input
                  id={`document-file-${active.clientKey}`}
                  name={`documentFile-${active.clientKey}`}
                  type="file"
                  accept={workerDocumentAccept}
                  className="block min-h-11 w-full rounded-lg border border-slate-200 p-2 text-sm"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    update(active.clientKey, {
                      file,
                      fileAction: file
                        ? "replace"
                        : active.hasFile
                          ? "keep"
                          : "keep",
                    });
                  }}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="break-all">
                    {active.file
                      ? `${active.file.name} · selected`
                      : active.hasFile && active.fileAction !== "remove"
                        ? `${active.originalFilename} · Attached`
                        : "No file attached"}
                  </span>
                  {active.file ||
                  (active.hasFile && active.fileAction !== "remove") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        update(active.clientKey, {
                          file: null,
                          fileAction: active.hasFile ? "remove" : "keep",
                        })
                      }
                    >
                      {active.hasFile ? "Remove file" : "Clear selection"}
                    </Button>
                  ) : active.hasFile && active.fileAction === "remove" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        update(active.clientKey, { fileAction: "keep" })
                      }
                    >
                      Keep attached file
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">
                  PDF, JPEG, PNG, WEBP, HEIC/HEIF, DOC, or DOCX · maximum 10 MB.
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="p-5 text-sm text-slate-500">
            Choose a document section.
          </p>
        )}
      </section>

      <aside className="h-fit rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <h3 className="font-semibold">Completeness</h3>
        <ul className="mt-3 space-y-2 text-xs">
          {documents
            .filter((document) => pinnedCodes.has(document.systemCode ?? ""))
            .map((document) => (
              <li key={document.clientKey}>
                {documentHasData(document) ? "✓" : "○"}{" "}
                {
                  documentTypes.find(
                    (type) => type.id === document.documentTypeId,
                  )?.name
                }
              </li>
            ))}
        </ul>
        <p className="mt-3 text-xs">
          At least one complete CNIC or Passport is required.
        </p>
        {errors.documents ? (
          <p className="mt-3 font-medium text-red-700">{errors.documents}</p>
        ) : null}
      </aside>
    </div>
  );
}
