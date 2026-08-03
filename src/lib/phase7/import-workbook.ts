import readWorkbook from "read-excel-file/node";

type ImportCellValue = boolean | Date | number | string | null;
type ImportRow = { number: number; values: ImportCellValue[] };

export type ImportIssue = {
  field?: string;
  message: string;
  row: number;
  sheet: string;
};

export type ImportPayload = {
  assignments: Array<{
    effectiveDate: string;
    projectKey: string;
    workerKey: string;
  }>;
  documents: Array<{
    documentNumber: string;
    documentTypeName: string;
    expiryDate: string;
    fileName: string;
    issueDate: string;
    workerKey: string;
  }>;
  projects: Array<{
    clientName: string;
    contractorName: string;
    endDate: string;
    key: string;
    location: string;
    name: string;
    startDate: string;
    status: "ACTIVE" | "ARCHIVED" | "CANCELLED" | "COMPLETED" | "PLANNED";
  }>;
  rates: Array<{
    effectiveDate: string;
    hourlyRateSen: number;
    workerKey: string;
  }>;
  workers: Array<{
    address: string;
    alternatePhone: string;
    cnicNumber: string;
    employmentStartDate: string;
    employmentStatus: "ACTIVE" | "ARCHIVED" | "LEFT_COMPANY" | "SUSPENDED";
    key: string;
    legalName: string;
    monthlyFoodDeductionSen: number;
    nationality: string;
    notes: string;
    passportNumber: string;
    phoneNumber: string;
    skillName: string;
    tradeName: string;
    workPermitExpiryDate: string;
    workPermitIssueDate: string;
    workPermitNumber: string;
  }>;
};

export type ImportLookup = {
  documentTypes: Array<{
    expectsDocumentNumber: boolean;
    expectsExpiryDate: boolean;
    expectsIssueDate: boolean;
    name: string;
  }>;
  existingProjectIdentities: string[];
  existingWorkerIdentifiers: string[];
  skillNames: string[];
  tradeNames: string[];
};

export type ImportParseResult = {
  issues: ImportIssue[];
  payload: ImportPayload;
  summary: {
    assignments: number;
    documents: number;
    projects: number;
    rates: number;
    workers: number;
  };
};

const sheetHeaders = {
  Assignments: ["Worker Key*", "Project Key", "Effective Date*"],
  Projects: [
    "Project Key*",
    "Name*",
    "Client*",
    "Contractor",
    "Location*",
    "Start Date*",
    "End Date",
    "Status*",
  ],
  Rates: ["Worker Key*", "Hourly Rate (MYR)*", "Effective Date*"],
  WorkerDocuments: [
    "Worker Key*",
    "Document Type*",
    "Document Number",
    "Issue Date",
    "Expiry Date",
    "File Name*",
  ],
  Workers: [
    "Worker Key*",
    "Legal Name*",
    "Phone*",
    "Alternate Phone",
    "Address",
    "Nationality",
    "CNIC",
    "Passport",
    "Work Permit",
    "Permit Issue Date",
    "Permit Expiry Date",
    "Employment Status*",
    "Employment Start Date*",
    "Trade*",
    "Skill Level*",
    "Monthly Food Deduction (MYR)*",
    "Notes",
  ],
} as const;

function text(value: ImportCellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return dateValue(value);
  return String(value).trim();
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

function normalizedIdentifier(value: string) {
  return value.replace(/[^A-Z0-9]+/gi, "").toLocaleUpperCase();
}

function dateValue(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateCell(value: ImportCellValue): string | null {
  if (value instanceof Date) return dateValue(value);
  const candidate = text(value);
  if (!candidate) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;
  const date = new Date(`${candidate}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || dateValue(date) !== candidate
    ? null
    : candidate;
}

function moneySen(value: ImportCellValue): number | null {
  const raw = typeof value === "number" ? value : Number(text(value));
  if (!Number.isFinite(raw) || raw < 0) return null;
  const sen = Math.round(raw * 100);
  return Math.abs(raw * 100 - sen) < 0.001 ? sen : null;
}

function rowsWithValues(sheet: ImportCellValue[][]): ImportRow[] {
  return sheet
    .slice(1)
    .map((values, index) => ({ number: index + 2, values }))
    .filter((row) => row.values.some((value) => text(value) !== ""));
}

function validateHeaders(
  workbook: Map<string, ImportCellValue[][]>,
  issues: ImportIssue[],
) {
  for (const [sheetName, headers] of Object.entries(sheetHeaders)) {
    const sheet = workbook.get(sheetName);
    if (!sheet) {
      issues.push({
        message: `The required “${sheetName}” sheet is missing.`,
        row: 1,
        sheet: sheetName,
      });
      continue;
    }
    headers.forEach((header, index) => {
      if (text(sheet[0]?.[index] ?? null) !== header) {
        issues.push({
          field: header,
          message: `Expected the fixed header “${header}”. Download a fresh template instead of renaming columns.`,
          row: 1,
          sheet: sheetName,
        });
      }
    });
  }
}

export async function parseImportWorkbook(
  source: Buffer | Uint8Array,
  lookup: ImportLookup,
): Promise<ImportParseResult> {
  const workbook = new Map(
    (await readWorkbook(Buffer.from(source))).map(({ data, sheet }) => [
      sheet,
      data as ImportCellValue[][],
    ]),
  );
  const issues: ImportIssue[] = [];
  const payload: ImportPayload = {
    assignments: [],
    documents: [],
    projects: [],
    rates: [],
    workers: [],
  };
  validateHeaders(workbook, issues);
  if (issues.some((issue) => issue.row === 1)) {
    return {
      issues,
      payload,
      summary: {
        assignments: 0,
        documents: 0,
        projects: 0,
        rates: 0,
        workers: 0,
      },
    };
  }

  const projectKeys = new Set<string>();
  const workerKeys = new Set<string>();
  const projectIdentities = new Set(lookup.existingProjectIdentities);
  const workerIdentifiers = new Set(lookup.existingWorkerIdentifiers);
  const tradeNames = new Set(lookup.tradeNames.map(normalized));
  const skillNames = new Set(lookup.skillNames.map(normalized));
  const documentTypes = new Map(
    lookup.documentTypes.map((item) => [normalized(item.name), item]),
  );

  for (const row of rowsWithValues(workbook.get("Projects")!)) {
    const values = row.values;
    const [key, name, clientName, contractorName, location] = values.map(text);
    const startDate = dateCell(values[5]);
    const endDate = dateCell(values[6]);
    const status = text(values[7]).toLocaleUpperCase();
    const rowIssues: ImportIssue[] = [];
    const add = (field: string, message: string) =>
      rowIssues.push({ field, message, row: row.number, sheet: "Projects" });

    if (!key) add("Project Key", "Project key is required.");
    else if (projectKeys.has(normalized(key)))
      add("Project Key", "Project key is repeated in this workbook.");
    if (name.length < 2 || name.length > 120)
      add("Name", "Project name must be 2–120 characters.");
    if (clientName.length < 2 || clientName.length > 120)
      add("Client", "Client name must be 2–120 characters.");
    if (location.length < 2 || location.length > 180)
      add("Location", "Location must be 2–180 characters.");
    if (!startDate) add("Start Date", "Use a valid date in YYYY-MM-DD format.");
    if (endDate === null)
      add("End Date", "Use a valid date in YYYY-MM-DD format or leave blank.");
    if (startDate && endDate && endDate < startDate)
      add("End Date", "End date cannot be earlier than start date.");
    if (
      !["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED", "ARCHIVED"].includes(
        status,
      )
    )
      add("Status", "Use PLANNED, ACTIVE, COMPLETED, CANCELLED, or ARCHIVED.");
    const identity = `${normalized(name)}|${normalized(clientName)}`;
    if (projectIdentities.has(identity))
      add(
        "Name",
        "A project with this name and client already exists. Use the existing project instead of importing a duplicate.",
      );

    issues.push(...rowIssues);
    if (rowIssues.length === 0) {
      projectKeys.add(normalized(key));
      projectIdentities.add(identity);
      payload.projects.push({
        clientName,
        contractorName,
        endDate: endDate ?? "",
        key: normalized(key),
        location,
        name,
        startDate: startDate!,
        status: status as ImportPayload["projects"][number]["status"],
      });
    }
  }

  for (const row of rowsWithValues(workbook.get("Workers")!)) {
    const values = row.values;
    const [
      key,
      legalName,
      phoneNumber,
      alternatePhone,
      address,
      nationality,
      rawCnic,
      rawPassport,
      rawPermit,
    ] = values.map(text);
    const cnicNumber = normalizedIdentifier(rawCnic);
    const passportNumber = normalizedIdentifier(rawPassport);
    const workPermitNumber = normalizedIdentifier(rawPermit);
    const workPermitIssueDate = dateCell(values[9]);
    const workPermitExpiryDate = dateCell(values[10]);
    const employmentStatus = text(values[11]).toLocaleUpperCase();
    const employmentStartDate = dateCell(values[12]);
    const tradeName = text(values[13]);
    const skillName = text(values[14]);
    const monthlyFoodDeductionSen = moneySen(values[15]);
    const notes = text(values[16]);
    const rowIssues: ImportIssue[] = [];
    const add = (field: string, message: string) =>
      rowIssues.push({ field, message, row: row.number, sheet: "Workers" });

    if (!key) add("Worker Key", "Worker key is required.");
    else if (workerKeys.has(normalized(key)))
      add("Worker Key", "Worker key is repeated in this workbook.");
    if (legalName.length < 2 || legalName.length > 160)
      add("Legal Name", "Legal name must be 2–160 characters.");
    if (phoneNumber.length < 5 || phoneNumber.length > 40)
      add("Phone", "Phone must be 5–40 characters.");
    if (!cnicNumber && !passportNumber)
      add("CNIC / Passport", "Enter at least one identity number.");
    for (const [field, identifier] of [
      ["CNIC", cnicNumber],
      ["Passport", passportNumber],
    ] as const) {
      if (identifier && workerIdentifiers.has(identifier))
        add(
          field,
          `A worker with this ${field} already exists or is repeated in the workbook.`,
        );
    }
    if (workPermitIssueDate === null)
      add("Permit Issue Date", "Use a valid YYYY-MM-DD date or leave blank.");
    if (workPermitExpiryDate === null)
      add("Permit Expiry Date", "Use a valid YYYY-MM-DD date or leave blank.");
    if (
      workPermitIssueDate &&
      workPermitExpiryDate &&
      workPermitExpiryDate < workPermitIssueDate
    )
      add("Permit Expiry Date", "Permit expiry cannot precede issue date.");
    if (
      !["ACTIVE", "SUSPENDED", "LEFT_COMPANY", "ARCHIVED"].includes(
        employmentStatus,
      )
    )
      add(
        "Employment Status",
        "Use ACTIVE, SUSPENDED, LEFT_COMPANY, or ARCHIVED.",
      );
    if (!employmentStartDate)
      add("Employment Start Date", "Use a valid YYYY-MM-DD date.");
    if (!tradeNames.has(normalized(tradeName)))
      add(
        "Trade",
        "This trade does not exist in Settings. Add it there or use an exact existing name.",
      );
    if (!skillNames.has(normalized(skillName)))
      add(
        "Skill Level",
        "This skill level does not exist in Settings. Add it there or use an exact existing name.",
      );
    if (monthlyFoodDeductionSen === null)
      add(
        "Monthly Food Deduction",
        "Enter a non-negative MYR amount with no more than two decimals.",
      );
    if (notes.length > 2000)
      add("Notes", "Notes cannot exceed 2,000 characters.");

    issues.push(...rowIssues);
    if (rowIssues.length === 0) {
      workerKeys.add(normalized(key));
      if (cnicNumber) workerIdentifiers.add(cnicNumber);
      if (passportNumber) workerIdentifiers.add(passportNumber);
      payload.workers.push({
        address,
        alternatePhone,
        cnicNumber,
        employmentStartDate: employmentStartDate!,
        employmentStatus:
          employmentStatus as ImportPayload["workers"][number]["employmentStatus"],
        key: normalized(key),
        legalName,
        monthlyFoodDeductionSen: monthlyFoodDeductionSen!,
        nationality,
        notes,
        passportNumber,
        phoneNumber,
        skillName,
        tradeName,
        workPermitExpiryDate: workPermitExpiryDate ?? "",
        workPermitIssueDate: workPermitIssueDate ?? "",
        workPermitNumber,
      });
    }
  }

  const assignmentWorkers = new Set<string>();
  for (const row of rowsWithValues(workbook.get("Assignments")!)) {
    const values = row.values;
    const workerKey = text(values[0]);
    const projectKey = text(values[1]);
    const effectiveDate = dateCell(values[2]);
    const rowIssues: ImportIssue[] = [];
    const add = (field: string, message: string) =>
      rowIssues.push({
        field,
        message,
        row: row.number,
        sheet: "Assignments",
      });
    if (!workerKeys.has(normalized(workerKey)))
      add("Worker Key", "Worker key must refer to a valid Workers row.");
    if (projectKey && !projectKeys.has(normalized(projectKey)))
      add("Project Key", "Project key must refer to a valid Projects row.");
    if (assignmentWorkers.has(normalized(workerKey)))
      add(
        "Worker Key",
        "Only one current project assignment can be imported per worker.",
      );
    if (!effectiveDate) add("Effective Date", "Use a valid YYYY-MM-DD date.");
    issues.push(...rowIssues);
    if (rowIssues.length === 0 && projectKey) {
      assignmentWorkers.add(normalized(workerKey));
      payload.assignments.push({
        effectiveDate: effectiveDate!,
        projectKey: normalized(projectKey),
        workerKey: normalized(workerKey),
      });
    }
  }

  const rateWorkers = new Set<string>();
  for (const row of rowsWithValues(workbook.get("Rates")!)) {
    const values = row.values;
    const workerKey = text(values[0]);
    const hourlyRateSen = moneySen(values[1]);
    const effectiveDate = dateCell(values[2]);
    const rowIssues: ImportIssue[] = [];
    const add = (field: string, message: string) =>
      rowIssues.push({ field, message, row: row.number, sheet: "Rates" });
    if (!workerKeys.has(normalized(workerKey)))
      add("Worker Key", "Worker key must refer to a valid Workers row.");
    if (rateWorkers.has(normalized(workerKey)))
      add("Worker Key", "Only one current rate can be imported per worker.");
    if (hourlyRateSen === null || hourlyRateSen <= 0)
      add("Hourly Rate", "Enter a positive MYR amount.");
    if (!effectiveDate) add("Effective Date", "Use a valid YYYY-MM-DD date.");
    issues.push(...rowIssues);
    if (rowIssues.length === 0) {
      rateWorkers.add(normalized(workerKey));
      payload.rates.push({
        effectiveDate: effectiveDate!,
        hourlyRateSen: hourlyRateSen!,
        workerKey: normalized(workerKey),
      });
    }
  }

  const documentFiles = new Set<string>();
  for (const row of rowsWithValues(workbook.get("WorkerDocuments")!)) {
    const values = row.values;
    const workerKey = text(values[0]);
    const documentTypeName = text(values[1]);
    const documentNumber = text(values[2]);
    const issueDate = dateCell(values[3]);
    const expiryDate = dateCell(values[4]);
    const fileName = text(values[5]);
    const documentType = documentTypes.get(normalized(documentTypeName));
    const rowIssues: ImportIssue[] = [];
    const add = (field: string, message: string) =>
      rowIssues.push({
        field,
        message,
        row: row.number,
        sheet: "WorkerDocuments",
      });
    if (!workerKeys.has(normalized(workerKey)))
      add("Worker Key", "Worker key must refer to a valid Workers row.");
    if (!documentType)
      add(
        "Document Type",
        "This document type does not exist in Settings. Use an exact existing name.",
      );
    if (issueDate === null)
      add("Issue Date", "Use a valid YYYY-MM-DD date or leave blank.");
    if (expiryDate === null)
      add("Expiry Date", "Use a valid YYYY-MM-DD date or leave blank.");
    if (issueDate && expiryDate && expiryDate < issueDate)
      add("Expiry Date", "Expiry date cannot precede issue date.");
    if (documentType?.expectsIssueDate && !issueDate)
      add("Issue Date", "This document type requires an issue date.");
    if (documentType?.expectsExpiryDate && !expiryDate)
      add("Expiry Date", "This document type requires an expiry date.");
    if (documentType?.expectsDocumentNumber && !documentNumber)
      add("Document Number", "This document type requires a document number.");
    if (!fileName) add("File Name", "File name is required.");
    else if (documentFiles.has(normalized(fileName)))
      add("File Name", "Each document file name must be unique in one import.");
    issues.push(...rowIssues);
    if (rowIssues.length === 0) {
      documentFiles.add(normalized(fileName));
      payload.documents.push({
        documentNumber,
        documentTypeName,
        expiryDate: expiryDate ?? "",
        fileName,
        issueDate: issueDate ?? "",
        workerKey: normalized(workerKey),
      });
    }
  }

  for (const worker of payload.workers) {
    if (!rateWorkers.has(normalized(worker.key))) {
      issues.push({
        field: "Worker Key",
        message:
          "Every imported worker needs one Rates row so payroll can be used immediately.",
        row: 0,
        sheet: "Rates",
      });
    }
  }

  if (
    payload.projects.length +
      payload.workers.length +
      payload.assignments.length +
      payload.rates.length +
      payload.documents.length ===
      0 &&
    issues.length === 0
  ) {
    issues.push({
      message: "The workbook contains no import rows.",
      row: 0,
      sheet: "Workbook",
    });
  }

  return {
    issues,
    payload,
    summary: {
      assignments: payload.assignments.length,
      documents: payload.documents.length,
      projects: payload.projects.length,
      rates: payload.rates.length,
      workers: payload.workers.length,
    },
  };
}
