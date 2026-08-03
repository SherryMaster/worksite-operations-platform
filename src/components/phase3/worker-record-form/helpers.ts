import type {
  DraftErrors,
  WorkerDocumentDraft,
  WorkerDocumentType,
  WorkerFormValues,
} from "@/components/phase3/worker-record-form/types";

export const workerFormStages = [
  { description: "Name, phone, nationality, address", label: "Personal" },
  { description: "Rate, trade, skill, food deduction", label: "Work & pay" },
  { description: "Identity and supporting records", label: "Documents" },
  { description: "Optional profile photo", label: "Photo" },
  { description: "Confirm before saving", label: "Review" },
] as const;

export function createDocumentDraft(
  type: WorkerDocumentType,
  values: Partial<WorkerDocumentDraft> = {},
): WorkerDocumentDraft {
  return {
    clientKey: values.clientKey ?? crypto.randomUUID(),
    documentNumber: values.documentNumber ?? "",
    documentTypeId: type.id,
    expiryDate: values.expiryDate ?? "",
    file: values.file ?? null,
    fileAction: values.fileAction ?? "keep",
    hasFile: values.hasFile ?? false,
    id: values.id ?? null,
    issueDate: values.issueDate ?? "",
    metadata: values.metadata ?? {},
    originalFilename: values.originalFilename ?? "",
    systemCode: type.system_code,
  };
}

export function documentHasData(document: WorkerDocumentDraft) {
  return Boolean(
    document.documentNumber.trim() ||
    document.issueDate ||
    document.expiryDate ||
    document.file ||
    document.hasFile ||
    Object.values(document.metadata).some((value) => value.trim()),
  );
}

export function documentsForSave(documents: WorkerDocumentDraft[]) {
  return documents.filter(documentHasData).map(({ file, ...document }) => {
    void file;
    return document;
  });
}

export function serializeDraft(values: WorkerFormValues) {
  return JSON.stringify({
    ...values,
    documents: values.documents
      .filter(documentHasData)
      .map(({ file, ...document }) => ({
        ...document,
        selectedFile: file ? `${file.name}:${file.size}:${file.type}` : null,
      })),
    photoFile: values.photoFile
      ? `${values.photoFile.name}:${values.photoFile.size}`
      : null,
  });
}

export function hasDraftChanges(
  values: WorkerFormValues,
  initialValues: WorkerFormValues,
) {
  return serializeDraft(values) !== serializeDraft(initialValues);
}

export function maskDraftIdentifier(value: string) {
  const normalized = value.trim();
  if (!normalized) return "Not recorded";
  if (normalized.length <= 4) return "••••";
  return `${normalized.slice(0, 2)}${"•".repeat(
    Math.min(8, normalized.length - 4),
  )}${normalized.slice(-2)}`;
}

function validateDocument(
  document: WorkerDocumentDraft,
  type: WorkerDocumentType,
  errors: DraftErrors,
) {
  const prefix = `document-${document.clientKey}`;
  if (type.expects_document_number && !document.documentNumber.trim()) {
    errors[`${prefix}-number`] = `${type.name} requires a document number.`;
  }
  if (type.expects_issue_date && !document.issueDate) {
    errors[`${prefix}-issue`] = `${type.name} requires an issue date.`;
  }
  if (type.expects_expiry_date && !document.expiryDate) {
    errors[`${prefix}-expiry`] = `${type.name} requires an expiry date.`;
  }
  if (
    document.issueDate &&
    document.expiryDate &&
    document.expiryDate < document.issueDate
  ) {
    errors[`${prefix}-expiry`] =
      "Expiry cannot be earlier than the issue date.";
  }
}

export function validateWorkerStage(
  values: WorkerFormValues,
  stage: number,
  documentTypes: WorkerDocumentType[],
  initialValues: WorkerFormValues,
): DraftErrors {
  const errors: DraftErrors = {};
  if (stage === 0 || stage === 4) {
    if (values.legalName.trim().length < 2) {
      errors.legalName = "Full name is required.";
    }
    if (values.phoneNumber.trim().length < 5) {
      errors.phoneNumber = "Phone number is required.";
    }
    if (values.nationality.trim().length < 2) {
      errors.nationality = "Nationality is required.";
    }
  }
  if (stage === 1 || stage === 4) {
    const rate = Number(values.hourlyRate);
    const deduction = Number(values.foodDeduction);
    if (!Number.isFinite(rate) || rate <= 0) {
      errors.hourlyRate = "Hourly pay rate must be greater than zero.";
    }
    if (!values.tradeId) errors.tradeId = "Trade is required.";
    if (!values.skillLevelId) errors.skillLevelId = "Skill level is required.";
    if (!Number.isFinite(deduction) || deduction < 0) {
      errors.foodDeduction = "Food deduction must be zero or greater.";
    }
    if (
      values.hourlyRate !== initialValues.hourlyRate &&
      !values.rateEffectiveOn
    ) {
      errors.rateEffectiveOn = "Choose when the rate change takes effect.";
    }
  }
  if (stage === 2 || stage === 4) {
    const savedDocuments = values.documents.filter(documentHasData);
    for (const document of savedDocuments) {
      const type = documentTypes.find(
        (option) => option.id === document.documentTypeId,
      );
      if (type) validateDocument(document, type, errors);
    }
    if (
      !savedDocuments.some(
        (document) =>
          ["CNIC", "PASSPORT"].includes(document.systemCode ?? "") &&
          Boolean(document.documentNumber.trim()),
      )
    ) {
      errors.documents = "Add at least one complete CNIC or Passport section.";
    }
  }
  return errors;
}

export function changeStage(currentStage: number, targetStage: number) {
  return Math.min(Math.max(targetStage, 0), workerFormStages.length - 1);
}
