import type { Tables } from "@/types/database";

export type WorkerRecordMode = "create" | "edit";

export type WorkerDocumentDraft = {
  clientKey: string;
  documentNumber: string;
  documentTypeId: string;
  expiryDate: string;
  file: File | null;
  fileAction: "keep" | "remove" | "replace";
  hasFile: boolean;
  id: string | null;
  issueDate: string;
  metadata: Record<string, string>;
  originalFilename: string;
  systemCode: string | null;
};

export type WorkerFormValues = {
  address: string;
  documents: WorkerDocumentDraft[];
  foodDeduction: string;
  hourlyRate: string;
  legalName: string;
  nationality: string;
  phoneNumber: string;
  photoAction: "keep" | "remove" | "replace";
  photoFile: File | null;
  photoId: string | null;
  rateEffectiveOn: string;
  skillLevelId: string;
  tradeId: string;
  workerId: string | null;
};

export type WorkerDocumentType = Tables<"document_types">;
export type WorkerOption = { id: string; name: string };

export type WorkerRecordFormProps = {
  action: (
    previousState: import("@/lib/phase3/validation").Phase3ActionState,
    formData: FormData,
  ) => Promise<import("@/lib/phase3/validation").Phase3ActionState>;
  documentTypes: WorkerDocumentType[];
  initialStage?: number;
  mode: WorkerRecordMode;
  skills: WorkerOption[];
  trades: WorkerOption[];
  values: WorkerFormValues;
};

export type DraftErrors = Record<string, string>;
