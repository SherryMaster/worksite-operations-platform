# Worksite Operations Platform
## Product and System Design

**File:** `DESIGN.md`  
**Version:** 1.0  
**Status:** Final  
**Depends on:** `PRD.md` v1.1 and `STACKS.md` v1.0

---

## 1. Purpose

This document defines how Version 1 is organized and how its confirmed workflows behave in the application.

It covers:

- information architecture and navigation;
- role permissions;
- the conceptual data model;
- page and screen responsibilities;
- attendance, leave, payroll, document, reporting, and migration flows;
- offline behavior;
- validation, states, and audit behavior.

It does not repeat the complete product requirements or technology setup. It also does not prescribe every component filename, SQL statement, or implementation task. Those belong in the code and `PLAN.md`.

The design is intentionally operational and lean. Version 1 is one management application, not a collection of mini-products.

---

## 2. Confirmed Design Decisions

The following decisions are final for Version 1:

1. The CEO interface uses a permanent left sidebar.
2. The Foreman uses a separate, simplified mobile-first interface.
3. Attendance uses current-time `Enter` and `Exit` actions with manual correction available.
4. Unpaid breaks are recorded with break start and end times inside a work session.
5. Projects remain lean: name, client, contractor, location, dates, status, assigned Foreman, and notes.
6. One company payroll is generated for each calendar month, reviewed by project and worker, and approved as a complete monthly run.
7. Migration uses fixed downloadable Excel templates rather than arbitrary column mapping.
8. Reports are predefined pages with practical filters and Excel export.

These decisions supersede earlier ideas for project budgets, detailed contract management, a custom report builder, or a shared CEO/Foreman interface.

---

## 3. Design Principles

### 3.1 Actions Before Analytics

Dashboards prioritize work that needs attention: incomplete sessions, failed synchronization, pending leave, expiring documents, payroll exceptions, and unpaid workers. Decorative charts are secondary and should not be added unless they make a real decision easier.

### 3.2 Desktop CEO, Mobile Foreman

The CEO experience is optimized for desktop tables, filtering, review, and administration. The Foreman experience is optimized for fast one-handed attendance actions on a phone and remains installable as a PWA.

### 3.3 One Source of Truth

Current status is shown clearly, while previous values remain available through effective-dated history, snapshots, and audit records. Historical payroll and payments are never silently rewritten.

### 3.4 Visible Exceptions

The application does not guess missing times, hide failed synchronization, or silently resolve financial conflicts. A record requiring correction must visibly explain the problem and the action needed.

### 3.5 Progressive Disclosure

Lists show only the information needed to identify and act on a record. Detailed history, documents, payroll breakdowns, and audit entries appear inside the relevant detail view instead of crowding every table.

### 3.6 Simple State Models

Each business object uses the smallest set of states needed for the confirmed workflow. New approval levels, roles, or states must not be invented during implementation.

---

## 4. Information Architecture

## 4.1 CEO Navigation

The desktop application uses a persistent left sidebar with these primary areas:

1. **Dashboard**
2. **Projects**
3. **Workers**
4. **Attendance**
5. **Leave**
6. **Payroll**
7. **Reports**
8. **Settings**
9. **Audit**

The application header contains:

- the current page title;
- contextual search or filters where useful;
- notifications or action counts when applicable;
- the signed-in user menu.

Excel migration is available under **Settings → Data Import**. Account management is available under **Settings → Users**.

## 4.2 Foreman Navigation

The Foreman experience is a separate mobile-first shell with bottom navigation:

1. **Today**
2. **Attendance**
3. **Workers**
4. **Leave**

The top app bar shows:

- assigned project;
- connection and synchronization state;
- pending-action count;
- profile and sign-out access.

A Foreman without an active project sees a restricted screen explaining that a CEO assignment is required. No operational data is shown.

## 4.3 Responsive Behavior

- CEO tables may remain tables on desktop but must become cards, compact rows, or horizontally constrained summaries on small screens.
- Foreman screens must not depend on wide tables.
- Primary mobile actions remain reachable near the bottom of the screen.
- Filters use drawers or sheets on mobile and inline controls on desktop.
- Important actions use text labels, not icon-only controls.

---

## 5. Roles and Permissions

| Capability | CEO | Foreman |
|---|---:|---:|
| View company dashboard | Yes | No |
| View assigned-project dashboard | All projects | Assigned project only |
| Create or edit projects | Yes | No |
| Assign or replace Foremen | Yes | No |
| Create or edit worker profiles | Yes | No |
| Assign or transfer workers | Yes | No |
| View worker profile | All workers | Currently assigned workers only |
| View worker document status | All workers | Assigned workers only |
| Upload, replace, or remove documents | Yes | No |
| Open authorized worker document files | Yes | Assigned workers only |
| Record and correct attendance | All projects | Assigned project only |
| Change project day type | All projects | Assigned project only |
| Submit leave | Yes | Assigned workers only |
| Approve or reject leave | Yes | No |
| View payroll | Yes | No |
| Approve payroll | Yes | No |
| Mark worker payroll paid | Yes | No |
| View reports | Company-wide | Assigned-project operational reports only |
| Export data | Yes | Assigned-project operational exports only |
| Manage settings and categories | Yes | No |
| View full audit log | Yes | No |

Permission checks are enforced in Next.js and Supabase RLS. A hidden button is never treated as authorization.

When a worker or Foreman assignment changes, access changes immediately on the server. Previously cached Foreman data must become inaccessible after the next authorization or synchronization check.

---

## 6. Conceptual Data Model

Names below are conceptual. The implementation may use appropriate PostgreSQL naming conventions, but the relationships and constraints must remain.

## 6.1 Identity and Access

| Entity | Purpose | Important constraints |
|---|---|---|
| `ApplicationUser` | Links a Clerk identity to the application | Role is `CEO` or `FOREMAN`; active status required |
| `ForemanProjectAssignment` | Preserves Foreman-to-project history | One current Foreman per active project; one active project per Foreman |

## 6.2 Projects and Workforce

| Entity | Purpose | Important constraints |
|---|---|---|
| `Project` | Construction project record | Lean fields only; status history preserved |
| `Worker` | Permanent worker identity and current profile | Created and edited by CEO only |
| `EmploymentPeriod` | Records employment start, end, and state history | Periods cannot overlap incorrectly |
| `WorkerProjectAssignment` | Records project assignment and transfers | At most one active project per worker |
| `Trade` | CEO-managed trade category | Configurable; referenced by workers |
| `SkillLevel` | CEO-managed skill category | Configurable; referenced by workers |
| `WorkerRatePeriod` | Effective-dated hourly rate history | One rate per worker at a time; no overlapping periods |
| `WorkerFoodDeduction` | Current and historical fixed monthly deduction | Applied once per applicable payroll month |

A worker's trade and skill describe the worker. Neither determines or overrides the worker's hourly rate.

## 6.3 Documents

| Entity | Purpose | Important constraints |
|---|---|---|
| `DocumentType` | CEO-managed document category | May define whether issue or expiry dates are expected |
| `WorkerDocument` | Metadata for a private stored file | Belongs to one worker; replacement preserves history |

Binary files remain in private Supabase Storage. Database records contain object paths and metadata.

## 6.4 Attendance and Leave

| Entity | Purpose | Important constraints |
|---|---|---|
| `ProjectDay` | Defines the day type for one project and date | One record per project/date; `NORMAL`, `SUNDAY`, or `PUBLIC_HOLIDAY` |
| `AttendanceSession` | One entrance-to-exit work interval | May not overlap another valid session for the same worker |
| `BreakInterval` | One unpaid break inside an attendance session | Must remain within the parent session and not overlap another break |
| `AttendanceSyncAction` | Idempotency and synchronization record for offline actions | Client action ID is unique and immutable |
| `LeaveRequest` | Full-day leave request and decision | `PENDING`, `APPROVED`, or `REJECTED`; no partial-day leave |

An open attendance session has an entrance but no exit. It remains incomplete and non-payable until corrected. An open break also creates an exception and must be completed or corrected before payroll approval.

## 6.5 Payroll and Payments

| Entity | Purpose | Important constraints |
|---|---|---|
| `PayrollRun` | One company-wide calendar-month payroll | Unique month; `DRAFT`, `NEEDS_REVIEW`, or `APPROVED` |
| `PayrollWorker` | Approved or draft payroll result for one worker | Contains calculation snapshot and payment state |
| `PayrollEarningBucket` | Minute and amount totals grouped by rate and multiplier | Preserves traceability across effective rate changes |
| `PayrollAdjustment` | Manual or generated addition/deduction | Carries reason, source, month, and settlement state |
| `Payment` | One complete payment for one approved worker payroll | At most one payment; cash or bank transfer |
| `PayrollStatement` | Generated worker statement/voucher metadata | Generated only from approved snapshot |

The monthly payroll run is approved as one complete company run. Payments occur per worker because workers may be paid at different times or by different methods. Each worker payroll remains either `UNPAID` or `PAID`; partial payment is not supported.

## 6.6 Administration

| Entity | Purpose | Important constraints |
|---|---|---|
| `AuditEntry` | Immutable business-action history | Actor, action, entity, timestamp, and relevant before/after data |
| `ImportJob` | Records a migration/import attempt | Includes template version, validation results, and committed state |
| `CompanySetting` | Small set of confirmed company settings | Changes cannot rewrite finalized historical records |

---

## 7. Core State Models

## 7.1 Project

```text
PLANNED → ACTIVE → COMPLETED → ARCHIVED
              ↘ CANCELLED → ARCHIVED
```

The CEO may reopen a completed or cancelled project when business history allows it. Reopening is audited. Archived projects are read-only unless restored by the CEO.

## 7.2 Worker Employment

```text
ACTIVE ↔ SUSPENDED
ACTIVE → LEFT_COMPANY
LEFT_COMPANY → ACTIVE   (rehire creates a new employment period)
Any non-active record → ARCHIVED
```

Project assignment is separate from employment state. An active worker may be `AWAITING_ASSIGNMENT` when no project assignment is open.

## 7.3 Leave

```text
PENDING → APPROVED
        → REJECTED
```

Changing an approved leave record after payroll follows the same correction lifecycle as attendance.

## 7.4 Payroll and Payment

```text
Payroll: DRAFT → APPROVED
             ↘ NEEDS_REVIEW → APPROVED

Worker payment: UNPAID → PAID
```

A change affecting an approved but unpaid payroll moves the run to `NEEDS_REVIEW`. A change affecting a paid worker creates a later adjustment and does not reopen or rewrite that historical payment.

---

## 8. Page and Screen Design

## 8.1 CEO Dashboard

The CEO dashboard shows a compact operational summary:

- active projects;
- active, suspended, awaiting-assignment, and left workers;
- today's attendance coverage;
- incomplete or invalid attendance sessions;
- pending leave requests;
- documents expired or nearing expiry;
- current-month payroll state;
- unpaid approved worker payrolls;
- failed imports or synchronization issues.

The main section is an **Action Required** list. Each item links directly to the record that needs attention. Charts are optional and must not replace actionable counts.

## 8.2 Projects

### Project list

Supports search and filters for status, Foreman, dates, and location. Each row or card shows:

- project name;
- client;
- location;
- status;
- current Foreman;
- current worker count;
- relevant exception count.

### Project detail

Uses tabs:

1. **Overview** — lean project fields and current status
2. **Workforce** — current workers and transfer actions
3. **Attendance** — daily/monthly project attendance
4. **Leave** — project leave records
5. **History** — status, Foreman, and assignment timeline

Projects do not contain expense, billing, budget, or detailed contract-management screens in Version 1.

## 8.3 Workers

### Worker list

Search supports name, phone, CNIC, passport, project, trade, skill, and employment state. Common filters remain visible or quickly accessible.

Each desktop row or mobile card shows:

- photo or initials;
- name and primary identifier;
- trade and skill;
- current project or awaiting-assignment state;
- employment state;
- document warning where applicable.

### Worker detail

Uses tabs:

1. **Overview** — identity, contact, trade, skill, current rate, deduction, status
2. **Employment** — employment periods and status changes
3. **Assignments** — project assignment and transfer history
4. **Rates** — effective-dated rate history
5. **Documents** — files, document numbers, issue/expiry dates, alerts
6. **Attendance** — attendance history and exceptions
7. **Leave** — leave history
8. **Payroll** — CEO-only monthly payroll and payment history
9. **Audit** — CEO-only worker-specific audit entries

The CEO creates and edits worker information. Foremen receive a read-only, reduced worker view containing only information needed for their assigned project.

## 8.4 Attendance Workspace — CEO

The CEO attendance page supports:

- project and date selection;
- daily and monthly views;
- worker search;
- status filters such as present, no attendance, incomplete, invalid, pending sync, and leave;
- session and break inspection;
- company-wide correction capability;
- direct links to payroll impact where applicable.

The CEO does not separately approve attendance. The page exists for monitoring and correction; payroll review is the financial control point.

## 8.5 Today — Foreman

This is the Foreman's primary screen.

The header shows:

- project name;
- selected work date, defaulting to today;
- project day type selector;
- online/offline and sync state.

The body contains:

- worker search;
- filters for not entered, on site, on break, exited, incomplete, and leave;
- worker cards with current attendance state;
- large context-aware action buttons.

Typical worker-card actions are:

- `Enter` when no session is open;
- `Start break` when a session is open and no break is open;
- `End break` when a break is open;
- `Exit` when a session is open and no break is open;
- `Correct` for manual editing.

Tapping `Enter`, `Start break`, `End break`, or `Exit` uses the current device time. The action is immediately visible locally. A correction sheet allows the Foreman to edit times, add missing events, remove an invalid event, or add a note.

## 8.6 Attendance History — Foreman

The Foreman can inspect only the assigned project's history. The page supports date selection, worker search, session details, correction, and visible synchronization status.

Attendance remains editable at any time. Changes are audited and trigger the appropriate payroll lifecycle rather than being blocked by age or payroll period.

## 8.7 Leave

### Foreman

The Foreman selects an assigned worker, full calendar dates, leave type, reason, and optional supporting file. The request is submitted as `PENDING`.

### CEO

The CEO list prioritizes pending requests and shows attendance conflicts. Approval is blocked when valid attendance already exists on a requested full leave date unless the conflict is corrected first. Approved leave remains unpaid and contributes zero payable time.

## 8.8 Payroll

### Payroll list

Shows one row per calendar month with:

- run status;
- worker count;
- gross earnings;
- deductions;
- adjustments;
- net payroll;
- unpaid and paid worker counts;
- blocking exception count.

### Monthly payroll detail

The payroll workspace contains:

1. **Summary** — company totals and status
2. **Projects** — totals grouped by project
3. **Workers** — one line per worker
4. **Exceptions** — records blocking approval or requiring attention

The CEO can drill into a worker payroll to see:

- normal minutes and pay;
- overtime minutes and pay;
- Sunday minutes and pay;
- public-holiday minutes and pay;
- rate periods used;
- adjustments;
- fixed monthly food deduction;
- net pay;
- attendance and leave source dates;
- payment record and statement.

### Approval

The CEO approves the complete monthly run, not individual projects or workers. Approval is blocked by:

- incomplete or invalid attendance used by the month;
- open break intervals;
- missing worker rate for worked dates;
- unresolved attendance/leave conflicts;
- negative worker net pay;
- other calculation failures.

Document-expiry warnings and ordinary missing attendance on days with no recorded work are non-blocking unless the CEO determines they indicate an error.

Approval creates immutable payroll snapshots for the run and every worker line.

### Payment

After approval, each worker line can be marked paid once. The CEO records:

- payment date;
- full approved net amount;
- method: cash or bank transfer;
- optional reference and notes.

The amount defaults to and must equal the approved net pay. Split methods, partial amounts, and installments are not available.

## 8.9 Reports

Version 1 provides predefined reports:

1. Current workforce and assignments
2. Project workforce summary
3. Daily attendance
4. Monthly attendance
5. Attendance exceptions
6. Leave
7. Payroll and adjustments
8. Payment status
9. Worker assignment and rate history
10. Expiring and expired documents
11. Audit activity

Each report exposes only relevant filters such as project, worker, trade, skill, date range, state, or document status. Results can be exported to Excel. There is no custom report builder.

## 8.10 Settings

Settings are grouped into:

- **Users** — Foreman account creation, activation, password reset, project assignment
- **Trades and Skills**
- **Document Types**
- **Leave Types**
- **Company** — legal/display name, MYR, `Asia/Kuala_Lumpur`
- **Data Import** — templates and import jobs

Fixed payroll multipliers and the 5:00 PM overtime cutoff are displayed as Version 1 rules and are not editable settings.

## 8.11 Audit

The CEO audit page supports filters for actor, action, module, entity, and date. Each entry shows:

- who performed the action;
- what changed;
- when it happened;
- the affected record;
- source such as online, offline synchronization, or import;
- relevant before and after values.

Sensitive document contents, passwords, tokens, and secret values are never copied into the audit log. Identity numbers should be masked in general audit-list views.

---

## 9. Attendance Design

## 9.1 Session Rules

- A worker can have multiple sessions on one project date.
- A valid session has one entrance and one later exit.
- Sessions for the same worker may not overlap.
- An entrance without an exit is incomplete and contributes zero payable minutes.
- Reversed or overlapping times are invalid and contribute zero payable minutes until corrected.
- The system never guesses an exit.

## 9.2 Break Rules

- Breaks are recorded as start and end timestamps inside a specific attendance session.
- A valid break must fall fully inside its session.
- Breaks may not overlap.
- An open or invalid break is a blocking payroll exception.
- Time between one session's exit and the next session's entrance is already unpaid and is not represented as a break.
- Payable session minutes equal session duration minus valid break duration.

Recording break intervals rather than a single daily number allows the system to assign the deducted minutes correctly when a normal-day session crosses the 5:00 PM overtime boundary.

## 9.3 Day Type

Each project/date uses one day type:

- `NORMAL` by default on Monday through Saturday;
- `SUNDAY` by default on Sunday;
- `PUBLIC_HOLIDAY` when manually selected.

The assigned Foreman or CEO may change the type. The selected type applies to all workers on that project/date. A change is audited and recalculates draft payroll or triggers the confirmed correction lifecycle.

## 9.4 Pay Category Allocation

For a `NORMAL` project day:

- valid payable minutes before 5:00 PM are normal minutes;
- valid payable minutes from 5:00 PM onward are overtime minutes at 1.5×.

For a `SUNDAY` project day:

- every valid payable minute is paid at 2×.

For a `PUBLIC_HOLIDAY` project day:

- every valid payable minute is paid at 3×.

Multipliers never stack. Break minutes are removed from the category in which the break occurred.

## 9.5 Offline Behavior

The Foreman can perform these actions offline:

- open the cached assigned-project worker list;
- search workers;
- change the current project date's day type;
- enter or exit a worker;
- start or end a break;
- correct locally available attendance;
- inspect pending actions.

Each action is written to IndexedDB first and receives a unique client action ID. UI states are:

- `Saved on device`;
- `Syncing`;
- `Synced`;
- `Needs attention`.

The app attempts synchronization after connectivity returns and always provides a manual retry control.

The server rejects an action when the Foreman no longer owns the project. Ordinary valid conflicts within the Foreman's currently assigned project use the Foreman's submitted correction. If the affected period is approved or paid, the attendance change is still preserved but the payroll correction lifecycle is invoked instead of silently rewriting financial history.

---

## 10. Payroll Calculation Design

## 10.1 Calculation Inputs

For every worker and calendar month, payroll uses:

- valid payable attendance minutes;
- project day type;
- the worker rate effective on each worked date;
- fixed multipliers;
- approved payroll adjustments;
- the worker's fixed monthly food deduction;
- approved full-day unpaid leave for statement visibility.

## 10.2 Calculation Buckets

Minutes are grouped by:

1. worker;
2. effective hourly rate;
3. multiplier category: 1×, 1.5×, 2×, or 3×.

For each bucket:

```text
amount = round_to_sen(minutes × hourly_rate_in_sen × multiplier ÷ 60)
```

Rounding occurs once per worker/rate/multiplier bucket using ordinary half-up currency rounding. The bucket amounts are summed to produce gross earnings. This prevents floating-point money errors and avoids excessive per-minute or per-event rounding.

```text
gross earnings
+ additions
- deductions
- fixed monthly food deduction
= net pay
```

A negative net pay is a blocking exception. The CEO must correct or defer an adjustment before payroll can be approved; Version 1 does not create a negative payment.

## 10.3 Snapshot Behavior

Draft payroll is reproducible but recalculates when source records change. Approval stores the exact inputs and results used, including:

- minute totals by bucket;
- rates and multipliers;
- adjustments;
- food deduction;
- gross and net amounts;
- source-record references.

Approved snapshots do not automatically change.

## 10.4 Correction Lifecycle

- **Draft:** source correction automatically recalculates the affected worker.
- **Approved and unpaid:** the run becomes `NEEDS_REVIEW`; the CEO reviews and approves it again.
- **Paid:** the original snapshot and payment remain unchanged; the difference becomes a traceable adjustment for a later payroll or separate CEO settlement.

---

## 11. Worker and Project Workflows

## 11.1 Create Worker

1. CEO starts a worker form.
2. Required identity and contact fields are validated.
3. CNIC/passport checks warn about likely duplicates.
4. CEO selects trade, skill, current rate, optional monthly food deduction, documents, and employment state.
5. CEO assigns one project or leaves the worker awaiting assignment.
6. The system creates initial employment, rate, and assignment history records as applicable.

A duplicate warning does not automatically merge workers. The CEO must inspect the existing record before continuing.

## 11.2 Transfer Worker

1. CEO opens the current assignment.
2. CEO selects the destination project and effective date.
3. The system closes the old assignment immediately before the new assignment begins.
4. Attendance remains attached to the project where it was recorded.
5. The worker's rate does not change.
6. Access moves from the old Foreman to the new Foreman according to the effective assignment.

A worker cannot have two active project assignments.

## 11.3 Replace Foreman

1. CEO ends the current Foreman assignment.
2. CEO selects the replacement and effective date.
3. Project history retains both assignments.
4. Server authorization and future synchronization use the current assignment only.

---

## 12. Excel Migration and Import

## 12.1 Fixed Template

Version 1 provides a versioned migration workbook with fixed sheets:

- `ReferenceData`
- `Projects`
- `Workers`
- `WorkerDocuments`
- `Assignments`
- `Rates`
- `Attendance`
- `Leave`
- `Payroll`
- `Payments`

Only sheets required for the chosen migration scope need data. Column names and accepted values are fixed and documented inside the workbook. Arbitrary source-column mapping is not supported.

## 12.2 Import Flow

1. CEO downloads the latest template.
2. CEO uploads a completed workbook.
3. The server parses the workbook into staging data.
4. The application shows counts, warnings, duplicate candidates, and rejected rows.
5. No operational data changes during preview.
6. CEO confirms the valid rows.
7. The import commits in a safe dependency order.
8. The application produces a result workbook containing rejected rows and reasons.
9. The import is audited.

## 12.3 Import Order

Imports are committed in this order:

1. categories needed by referenced records;
2. projects;
3. workers;
4. rates;
5. project assignments;
6. attendance and leave history where provided;
7. payroll and payment history where provided.

Historical payroll imported as finalized history is not recalculated from imported attendance unless the CEO intentionally imports it as a draft migration check.

---

## 13. Common UI Patterns

## 13.1 Status Presentation

Use consistent text badges for business states. Color may reinforce meaning but must not be the only signal.

Examples:

- green: active, approved, paid, synchronized;
- amber: pending, expiring, incomplete, needs review;
- red: invalid, failed, expired, rejected;
- neutral: archived, left company, no assignment.

## 13.2 Forms

- Complex records such as workers and projects use full pages.
- Small edits and confirmations use dialogs, drawers, or sheets.
- Required fields are minimal and clearly marked.
- Dates and times display in `Asia/Kuala_Lumpur`.
- Money displays in MYR with two decimal places.
- Save actions remain disabled while submission is in progress.
- Financial and destructive actions require confirmation.

## 13.3 Lists

Lists support search, useful filters, sortable columns where relevant, pagination, and clear empty states. Filters must be reflected in the URL for CEO report and administration pages so views can be revisited.

## 13.4 Feedback

Every mutation provides a visible result:

- success confirmation;
- field-specific validation failure;
- recoverable error with retry;
- offline saved state;
- permission or stale-assignment explanation.

The UI never reports an offline action as synchronized before the server confirms it.

## 13.5 Accessibility

- Components use keyboard-accessible shadcn primitives.
- Inputs have visible labels.
- Dialog focus is managed correctly.
- Touch targets are large enough for worksite mobile use.
- Tables and status information remain understandable with screen readers.
- The application respects reduced-motion preferences.

---

## 14. Validation and Business Guards

The following rules are enforced on the server and, where useful, repeated in the interface:

- one active project per worker;
- one active project per Foreman;
- one current Foreman per active project;
- no overlapping worker rate periods;
- no overlapping valid attendance sessions for the same worker;
- breaks remain inside their session and do not overlap;
- full-day approved leave cannot silently coexist with worked attendance;
- attendance and day-type edits stay within the actor's project permission;
- payroll month is a fixed calendar month;
- payroll approval requires all blocking exceptions to be resolved;
- payment requires approved payroll and the full approved amount;
- one payment per worker payroll;
- private file access requires current authorization;
- duplicate offline action IDs cannot create duplicate events;
- imports do not commit invalid rows silently.

---

## 15. Loading, Empty, and Failure States

Every major page must define:

- a useful loading state;
- an empty state explaining the next action;
- a permission-denied state;
- a recoverable server-error state;
- an offline state where applicable.

Examples:

- no active projects → show `Create project` to the CEO;
- no workers assigned → show assignment guidance;
- no attendance for a date → distinguish `No attendance recorded` from a loading failure;
- no network on Foreman screens → retain cached attendance capability and label online-only features unavailable;
- failed sync → preserve the local action and show retry or correction details.

---

## 16. Design Boundary

Version 1 does not include:

- expense or billing screens;
- project budgets or detailed contract workflows;
- public holiday API integration;
- custom report construction;
- worker login or self-service;
- biometric, QR, GPS, or face attendance;
- partial-day leave;
- partial or split payroll payments;
- native mobile applications;
- arbitrary Excel column mapping;
- separate CEO attendance approval;
- project-specific worker rates.

`DESIGN.md` is complete. Implementation should not create additional design-specification files unless explicitly requested.
