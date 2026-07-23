# Worksite Operations Platform
## Product Requirements Document

**File:** `PRD.md`  
**Version:** 1.1  
**Status:** Final  
**Product owner:** CEO  
**System type:** Internal company application  
**Primary market settings:** Malaysia, MYR, `Asia/Kuala_Lumpur`  
**Primary source:** `DISCOVERY.md` Version 1 scope

---

## 1. Purpose

This document defines what Version 1 of the Worksite Operations Platform must deliver.

It is intentionally limited to product requirements. It describes:

- the business problem;
- the users;
- the Version 1 product boundary;
- the main workflows;
- the required capabilities;
- the release outcome.

It does **not** define database tables, API contracts, repository structure, deployment topology, framework internals, detailed UI components, or implementation tasks. Those decisions belong in `STACKS.md`, `DESIGN.md`, and `PLAN.md`.

`DISCOVERY.md` provides the original Version 1 scope and business baseline. Explicit decisions confirmed during this lean PRD interview supersede any conflicting earlier Discovery rule for Version 1. This PRD should summarize the active rules without duplicating the entire discovery record.

---

## 2. Product Summary

The Worksite Operations Platform is an internal workforce and project-operations application for a company that supplies workers to construction projects.

The company currently relies on manually maintained Excel sheets to manage workers, project assignments, attendance, payroll, payments, and operational status. Version 1 replaces those disconnected spreadsheets with one searchable and controlled application.

The product is more capable than a regular HR directory, but it is not intended to become a large enterprise resource planning system. Its purpose is to make the company’s existing workforce operations easier, clearer, and safer to manage.

---

## 3. Problem Statement

The current spreadsheet-based process makes it difficult to maintain a dependable view of the workforce.

Common problems include:

- worker information being spread across project sheets;
- duplicate or incomplete worker records;
- difficulty tracking worker transfers and employment history;
- slow daily attendance entry and review;
- missing or incorrect entrance and exit records;
- manual payroll calculations that are difficult to verify;
- weak visibility into payment status;
- limited tracking of expiring worker documents;
- difficulty finding historical changes;
- no reliable separation between projects for different foremen;
- significant manual work whenever reports are required.

The application must replace Excel as the active operational system while preserving import and export support for migration, reporting, and exceptional offline handoff needs.

---

## 4. Primary Product Outcome

The primary outcome of Version 1 is:

> Make the workforce, project status, attendance, payroll, payments, and history easier to manage than the current manual Excel-sheet process.

The platform should give the CEO a complete company-wide view and give each foreman a focused view of only the project they manage.

---

## 5. Product Goals

Version 1 must:

1. provide one reliable worker record across projects and time;
2. show the current workforce and project status clearly;
3. make daily attendance practical on mobile devices;
4. calculate monthly payroll from recorded attendance, worker rates, and confirmed payroll rules;
5. preserve payroll adjustments, statements, and payments;
6. track worker documents and expiry dates;
7. preserve project, assignment, employment, attendance, payroll, and payment history;
8. provide useful reports without manual spreadsheet reconstruction;
9. enforce project-level access for foremen;
10. preserve an audit trail for important changes;
11. import current operating data from Excel;
12. keep the product understandable for a small development team and coding agents.

---

## 6. Product Principles

### 6.1 Project-Centered

Projects are the main operating unit. Workers, foremen, attendance, payroll views, and reports must be easy to understand in project context.

### 6.2 One Worker Identity

A worker must keep one permanent profile even when transferred between projects, temporarily unassigned, inactive, or rehired.

### 6.3 Mobile-Friendly and Offline Daily Work

Foremen will primarily use mobile devices. Daily attendance and worker lookup must require minimal typing and few steps. Attendance must remain usable when a worksite temporarily has no internet connection and synchronize after connectivity returns.

### 6.4 Company-Wide CEO Control

The CEO has complete access to all projects, workers, operational records, settings, payroll and payment records, reports, and history.

### 6.5 Strict Foreman Scope

A foreman may access the same operational depth needed to manage work, but only for the currently assigned project. For attendance created within that assigned project, the responsible foreman is the operational source of truth during offline synchronization.

### 6.6 Preserve History

Important business records must not disappear through ordinary deletion. The system should use status changes, archival, effective dates, and history records.

### 6.7 Configuration Instead of Hardcoding

Trades, skill levels, document types, leave types, rates, and other company-defined categories should be configurable where required by Discovery.

### 6.8 Exception-First

The system should make problems visible, including incomplete attendance, missing exits, pending approvals, expiring documents, unpaid payroll, and invalid or missing rates.

### 6.9 Keep the Product Simple

Version 1 should solve the confirmed workflow directly. It must not introduce microservices, complex event systems, speculative roles, unnecessary approval chains, or features that do not support the Discovery scope.

---

## 7. Users and Access

## 7.1 CEO

The CEO is the product owner and company-wide system user.

The CEO can:

- access every project and worker;
- create and manage foreman accounts;
- create and manage projects;
- assign or replace foremen;
- create, update, archive, manually assign, and transfer workers;
- manage trades, skill levels, rates, settings, and company categories;
- view and correct attendance;
- approve leave;
- review and approve payroll;
- record or review payroll payments;
- mark approved monthly payroll payments as paid;
- run imports, exports, dashboards, and reports;
- view audit history.

## 7.2 Foreman

A foreman is assigned to one active project at a time.

A foreman can:

- view the assigned project;
- view workers assigned to that project;
- search and open the operational information needed for attendance, leave, document alerts, and project work;
- record daily entrances and exits;
- review project attendance;
- record or submit leave information;
- access project-level dashboards and reports;
- view relevant worker information and document alerts.

A foreman cannot create or edit worker profiles and cannot access another project or company-wide information. Worker identity, contact details, documents, trade, skill level, hourly rate, fixed monthly food deduction, employment status, project assignment, transfer, suspension, archival state, and payroll-related information are controlled by the CEO.

## 7.3 Workers

Workers are managed records, not application users.

Workers do not sign in during Version 1. The system may generate monthly statements or payment vouchers for them.

## 7.4 Other Parties

Clients and contractors do not sign in during Version 1. Their information exists only where needed for project records.

---

## 8. Version 1 Scope

The Version 1 scope is taken directly from `DISCOVERY.md`.

### 8.1 Access and Dashboards

- Authentication
- CEO dashboard
- Foreman dashboard

### 8.2 Projects and Foremen

- Projects
- Foreman account management
- Foreman assignment history

### 8.3 Workforce Management

- Workers
- Worker employment history
- Worker project-assignment history
- Trades
- Skill levels
- Worker documents
- Document expiry alerts

### 8.4 Attendance and Leave

- Attendance
- Entrance and exit events
- Leave

### 8.5 Payroll and Worker Payments

- Monthly payroll
- Payroll adjustments
- Fixed monthly food deductions per worker
- Worker monthly statements or payment vouchers
- Payment records

### 8.6 Reporting and Administration

- Reports
- Settings
- Audit logs
- Excel import
- Excel export
- Current-year data migration

---

## 9. Core Workflows

## 9.1 Create and Operate a Project

1. The CEO creates a project.
2. The CEO assigns a foreman.
3. Workers are assigned or transferred to the project.
4. The foreman manages the project’s daily workforce records.
5. The project remains available with full history after completion or cancellation.

## 9.2 Add or Import a Worker

1. The CEO creates a worker manually or imports worker data from Excel.
2. The system checks for likely duplicate identities.
3. The CEO records the worker’s trade, skill level, rate, documents, and employment status.
4. The CEO manually assigns the worker to one active project or leaves the worker awaiting assignment.
5. A worker cannot be actively assigned to multiple projects at the same time.
6. Future manual transfers close the previous assignment and update assignment history without creating a new worker profile.

## 9.3 Record Daily Attendance

1. The foreman opens the assigned project and its previously synchronized worker list.
2. The foreman finds workers through search, filters, or the project workforce list.
3. Entrance and exit information can be recorded with or without an internet connection.
4. Offline entries are stored on the device and clearly marked as pending synchronization.
5. When connectivity returns, pending entries synchronize automatically without creating duplicate attendance events.
6. A worker may have multiple entrance-exit sessions on the same date, and the system sums the duration of every valid pair.
7. Separately recorded unpaid break minutes are subtracted from the paired session total without double-counting time already excluded between an exit and the next entrance.
8. Each project date has one foreman-controlled day type: **Normal**, **Sunday**, or **Public Holiday**.
9. The system defaults Sundays to **Sunday** and all other dates to **Normal**. The assigned foreman can manually change the day type for their own project, including marking a date as **Public Holiday**.
10. The system calculates pay from the selected project day type. It does not depend on an external public-holiday calendar.
11. On a **Normal** day, worked duration before 5:00 PM is ordinary time and worked duration from 5:00 PM onward is overtime, using the company timezone.
12. On a **Sunday** day type, all worked minutes are paid at 2×. On a **Public Holiday** day type, all worked minutes are paid at 3×.
13. Only one day type applies to a project date, so pay multipliers never stack.
14. An entrance without a matching exit is treated as an incomplete session, contributes no payable time, and remains highlighted until the assigned foreman corrects it. The system must never guess or automatically generate the missing exit time.
15. Other conflicting, failed-to-sync, or suspicious records are highlighted.
16. The assigned foreman may correct attendance and the project day type for their own project; every correction preserves a complete audit trail and follows the confirmed payroll correction lifecycle.
17. The CEO can review and correct attendance and project day types company-wide.

## 9.4 Manage Leave

1. The foreman records or submits leave for a worker.
2. A reason, leave type, dates, and supporting document can be attached where required.
3. The CEO reviews and approves or rejects the leave.
4. Every approved leave period is unpaid and covers complete calendar dates only.
5. An approved leave date contributes zero payable hours while remaining distinguishable from an unexplained absence.
6. A worker who attends for part of a day and then leaves is not placed on partial-day leave; payroll is calculated only from the actual worked time recorded through attendance.

## 9.5 Process Monthly Payroll

1. There is no separate attendance-verification or attendance-approval workflow. The CEO reviews attendance exceptions and the resulting calculations as part of the monthly payroll review.
2. The system calculates payable time to the minute using the worker’s own effective hourly rate and the applicable pay category; hours may contain fractional values.
3. The worker’s full fixed monthly food deduction and any approved payroll adjustments are applied once at the end of the month.
4. Attendance corrections or food-deduction changes made while payroll is still a draft automatically recalculate that draft.
5. The CEO reviews and approves payroll.
6. Attendance corrections made after approval but before payment return the affected payroll to CEO review.
7. The system generates a worker monthly statement or payment voucher from the approved payroll.
8. The approved monthly payroll is settled through one complete cash or bank-transfer payment; Version 1 does not support partial or split payroll payments.
9. Attendance corrections made after payment create a traceable adjustment for the worker’s next payroll instead of rewriting the historical payroll or payment.
10. Payroll and payment remain separate records so the system can show what was owed and what was actually paid.

## 9.6 Review History and Reports

1. The CEO or foreman opens the relevant worker or project.
2. The system shows current status and historical records.
3. Reports can be filtered by worker, project, date, trade, skill, attendance state, payroll state, payment state, or document status where applicable.
4. Data can be exported to Excel for external use.

---

## 10. Functional Requirements

## 10.1 Authentication and Authorization

- Only CEO and foreman accounts may access the application.
- Foremen cannot self-register.
- The CEO controls foreman account creation, activation, deactivation, and project assignment.
- Project access must be enforced by the server, not only hidden in the interface.
- A foreman without an active project assignment has no project-operational access.

## 10.2 Dashboards

The CEO dashboard should summarize company-wide status, exceptions, pending work, payroll, payments, and document alerts.

The foreman dashboard should provide the same type of operational clarity for the assigned project only.

Dashboards should prioritize pending actions and exceptions rather than decorative charts.

## 10.3 Projects

The system must support:

- project creation and editing;
- client and contractor information;
- project dates, location, status, assigned foreman, and operational notes;
- one current foreman per active project;
- foreman replacement without losing history;
- completed, cancelled, and archived projects;
- reopening where permitted by the CEO;
- project workforce and operational history.

## 10.4 Workers

The system must support:

- permanent worker profiles;
- identity and contact information;
- CNIC and passport-based identification;
- employment status and employment periods;
- exactly one active project assignment at a time;
- manual project assignment and transfer by the CEO;
- worker creation and all worker-profile updates by the CEO only;
- audit history for worker-profile changes, including the changed fields and previous and new values;
- CEO-only control of worker identity, contact details, documents, trade, skill level, rates, fixed monthly food deductions, employment status, project assignment, transfer, suspension, archival state, and payroll-related fields;
- temporary awaiting-assignment state when no project is selected;
- transfers between projects that close the previous assignment before the new one begins;
- trade, skill, and rate history;
- an optional fixed monthly food-deduction amount;
- worker documents and expiry dates;
- inactive, left-company, suspended, and archived states;
- search using practical identifiers.

## 10.5 Trades, Skills, Rates, and Settings

- The CEO can define and manage trades and skill levels.
- Each worker has one hourly rate at a time.
- The rate belongs directly to the worker, not to a project, trade, skill level, or project assignment.
- Transferring a worker between projects does not change the worker’s rate.
- Projects cannot override a worker’s rate in Version 1.
- Worker rates may still differ from one worker to another, even when their trade or skill level is the same.
- Every worker rate has an effective date, and a new rate applies from the start of that calendar date in the company timezone.
- Rate changes preserve their effective history so payroll for earlier work continues to use the earlier rate.
- A worker cannot have overlapping active rate periods.
- Company settings must support confirmed payroll, attendance, document, leave, and locale rules.
- Previously finalized records must not change merely because a setting is edited later.

## 10.6 Documents

- Multiple documents may be stored for a worker.
- Document types are configurable.
- Issue and expiry dates can be recorded.
- The system highlights expired and soon-to-expire documents.
- Sensitive files are accessible only to authorized users.

## 10.7 Attendance

- Foremen can record attendance for workers in their assigned project.
- Attendance is based on entrance and exit information.
- A worker may have multiple attendance sessions on the same calendar date.
- Every valid entrance-exit pair contributes its exact duration in minutes to the day’s worked total.
- Daily worked minutes are the sum of all valid entrance-exit pairs for that worker and date.
- Explicitly recorded unpaid break minutes are subtracted from the summed session duration.
- Time between an exit and the next entrance is already outside a work session and must not be deducted again as an unpaid break.
- Break minutes cannot reduce payable time below zero or exceed the valid session time available for that date.
- Unpaired, reversed, overlapping, or otherwise invalid attendance events are exceptions and must be corrected rather than silently estimated.
- An entrance event without a matching exit creates an incomplete session. That session contributes zero payable minutes until the assigned foreman supplies or corrects the exit.
- The system must never infer, estimate, or automatically insert a missing exit time.
- Attendance entry must work without an internet connection after the project workforce list has been synchronized to the device.
- Offline capability is required for attendance entry; other Version 1 modules may require connectivity.
- Offline attendance entries must be stored securely on the device until they are synchronized.
- The interface must show whether entries are synchronized, pending, or failed.
- Synchronization must retry safely and must not create duplicate entrance or exit events.
- When an offline attendance entry conflicts with a server-side attendance value for the same worker, date, and assigned project, the responsible foreman’s entry wins.
- This rule applies only while the foreman is assigned to that project and must never allow changes to another project.
- The assigned foreman retains permission to edit attendance for their own project without a verification, age, or payroll-period cutoff.
- Attendance does not have a separate CEO verification or approval status. The CEO reviews attendance and unresolved exceptions during monthly payroll review.
- Every attendance edit must retain the previous value and record who changed it, when it changed, and what changed.
- Attendance corrections made before payroll approval automatically update the draft payroll calculation.
- If attendance changes after payroll approval but before payment, the affected payroll returns to CEO review so the corrected amount can be approved before payment.
- If attendance changes after payment, the historical payroll and payment remain unchanged and the system creates a traceable underpayment or overpayment adjustment for the worker’s next payroll.
- The CEO may settle a post-payment adjustment separately by cash or bank transfer when necessary.
- A foreman must not lose valid pending entries merely by closing and reopening the application.
- Each project date has exactly one day type: **Normal**, **Sunday**, or **Public Holiday**.
- Sundays default to **Sunday**. All other dates default to **Normal**.
- The assigned foreman manually confirms or changes the day type for their project. A public holiday is created by selecting **Public Holiday** for that project date; the system does not automatically import an official holiday calendar.
- Day type is project-specific, allowing the responsible foreman to record the actual operating condition of that project.
- On a **Normal** day, worked duration before 5:00 PM is normal time, and only worked duration from 5:00 PM onward is overtime.
- Overtime is split at the 5:00 PM boundary. For example, a valid 4:30 PM–6:15 PM session contains 30 normal minutes and 75 overtime minutes.
- The cutoff is evaluated in the company timezone, `Asia/Kuala_Lumpur`.
- Unpaid breaks reduce the category in which the break occurred. A break from 5:00 PM onward reduces overtime minutes; a break before 5:00 PM reduces normal minutes. Breaks spanning the cutoff are split across both categories.
- On a **Sunday** day type, all valid worked minutes are categorized at a fixed **2×** the worker’s normal hourly rate.
- On a **Public Holiday** day type, all valid worked minutes are categorized at a fixed **3×** the worker’s normal hourly rate.
- Only one day type applies to a project date. The 1.5× after-5:00-PM overtime rule applies only to **Normal** days and is never stacked with Sunday or public-holiday pay.
- Changes to a day type must be audited. If a change affects payroll, it follows the same draft, approved-unpaid, and paid correction lifecycle as an attendance correction.
- Temporary exits do not count as worked time because each exit ends a session until the next entrance.
- Unpaid breaks recorded within an active session are subtracted in minutes and must not duplicate a gap already excluded by an exit and later entrance.
- Missing, duplicate, conflicting, invalid, unusually long, or failed-to-sync records must be visible as exceptions.
- The CEO can review company-wide attendance; foremen can review and edit only their assigned project.

## 10.8 Leave

- Leave can be recorded for a worker.
- Leave types are configurable.
- Requests may include reason, dates, notes, and proof documents.
- The CEO controls approval or rejection.
- Leave must not silently conflict with attendance.
- All approved leave is unpaid.
- Approved unpaid leave covers complete calendar dates only and contributes zero payable hours for those dates; it is not treated as a separate deduction from already-earned pay.
- Version 1 does not support partial-day leave.
- If a worker attends for part of a day and does not return after the final recorded exit, the day remains an attendance day and payroll uses only the actual worked duration.
- Leave must not replace or reduce valid worked time. A date containing worked attendance cannot silently become a full-day leave date.
- Payroll statements should show approved unpaid-leave days for transparency.
- Leave approved or corrected after payroll calculation follows the same draft, approved, and paid correction lifecycle used for attendance changes.

## 10.9 Payroll

- Payroll is processed in fixed calendar-month periods.
- Each payroll period begins on the first calendar day of the month and ends on the final calendar day of that month in the company timezone.
- Version 1 does not support custom, weekly, biweekly, rolling, or overlapping payroll periods.
- Payroll is calculated from valid attendance, applicable rates, pay categories, and approved unpaid leave.
- Each payable minute uses the worker rate that was effective on the calendar date when that minute was worked.
- When a rate changes during a payroll month, earlier work remains at the earlier rate and work from the new rate's effective date uses the new rate. The latest rate is not applied retroactively to the whole month.
- A rate becomes effective from 12:00 AM on its selected effective date in the company timezone; Version 1 does not require rate changes within the middle of a workday.
- A rate correction follows the same payroll lifecycle as an attendance correction: draft payroll recalculates, approved unpaid payroll returns to CEO review, and paid payroll creates a traceable later adjustment without rewriting the historical payment.
- Payroll uses the day type selected for each project date: **Normal**, **Sunday**, or **Public Holiday**.
- Sundays default to **Sunday** and other dates default to **Normal**, but the assigned foreman may change the day type for their project. Public holidays are manually marked; no external holiday calendar is required.
- On a **Normal** day, only valid worked duration from 5:00 PM onward is categorized and paid as overtime; valid worked duration before 5:00 PM remains normal time.
- A session crossing 5:00 PM is split at the cutoff so payroll applies the worker’s normal hourly rate to the earlier minutes and the overtime rate only to the later minutes.
- The overtime rate is fixed at **1.5× the worker’s applicable normal hourly rate**. It is not entered separately per worker and is not configurable in Version 1.
- Overtime pay is calculated from overtime minutes using the same minute-accurate basis as normal pay.
- On a **Sunday** day type, every valid worked minute is paid at a fixed **2×** the worker’s applicable normal hourly rate.
- On a **Public Holiday** day type, every valid worked minute is paid at a fixed **3×** the worker’s applicable normal hourly rate.
- A project date has only one day type, so a worked minute can belong to only one pay category. Sunday and public-holiday minutes do not also receive the after-5:00-PM overtime multiplier.
- A day-type correction that affects payroll follows the same lifecycle as an attendance correction: draft payroll recalculates, approved unpaid payroll returns to CEO review, and paid payroll creates a later adjustment without rewriting history.
- Incomplete attendance sessions are excluded from payable time and visibly flagged for correction before payroll approval.
- Worked duration is minute-accurate. Hours are not restricted to whole numbers, and every payable minute contributes to payroll according to the applicable rate.
- For each worker and date, payable minutes are calculated from the sum of all valid entrance-exit sessions minus the minutes derived from valid recorded unpaid break intervals.
- A gap between an exit and a later entrance is not worked time and is not deducted a second time as a break.
- Payroll calculations should use total minutes as the authoritative duration and may display the result as hours and minutes or fractional hours.
- Approved unpaid leave generates zero payable hours for full leave dates rather than a separate monetary deduction from earned wages.
- Each worker may have a fixed monthly food-deduction amount in MYR. A zero or empty amount means no food deduction.
- The full fixed food-deduction amount is applied once at the end of each monthly payroll, not per day, meal, attendance session, or project.
- The deduction is not prorated for joining, leaving, transfer, absence, leave, or partial-month work. If the worker has a non-zero monthly food-deduction amount for that payroll month, the full amount is deducted.
- The worker’s monthly statement or voucher must show the food deduction as a separate line item.
- Changes to a worker’s food-deduction amount apply to draft and future payrolls; approved or paid payroll snapshots do not change automatically.
- The system supports other additions and deductions through payroll adjustments.
- The CEO reviews and approves payroll before it is treated as final.
- Approved payroll must preserve the values used for its calculation.
- Attendance corrections made before approval automatically recalculate the draft payroll.
- Attendance corrections made after approval but before payment return the affected payroll to CEO review.
- Attendance corrections made after payment must not rewrite the historical payroll or payment; they create a traceable underpayment or overpayment adjustment for the worker’s next payroll.
- The CEO may settle such an adjustment separately when required.
- Worker statements or payment vouchers are generated from approved payroll.

## 10.10 Payments

- Payments are recorded separately from payroll.
- Payroll remains monthly, and each approved worker payroll is settled through one complete payment.
- Cash and bank transfer are supported as payment methods, but a single payroll payment cannot be split across methods.
- Version 1 does not support payroll installments or partial payments.
- The system records payment date, amount, method, reference, and notes where applicable.
- The system shows only unpaid and paid states for the monthly payroll.
- Only the CEO can mark an approved monthly payroll as paid.
- Marking payroll as paid records the payment details and preserves the identity and time of the CEO who completed the action.
- Recording a payment must not recalculate payroll.
- A separately settled post-payment correction is recorded against its adjustment and does not turn the original monthly payroll into a partial payment.

## 10.11 Reports and Export

Reports must cover the operational areas included in Version 1, especially:

- current workforce and assignments;
- daily and monthly attendance;
- leave;
- payroll and adjustments;
- payment status;
- project workforce summaries;
- worker, assignment, and rate history;
- expiring documents;
- audit activity.

Reports should support practical filters and Excel export.

## 10.12 Audit History

The application must audit important actions, including:

- account and permission changes;
- project and assignment changes;
- worker identity, contact, document, trade, skill, rate, deduction, assignment, and status changes made by the CEO, including before and after values;
- rate changes;
- attendance and project day-type corrections;
- leave decisions;
- payroll approval and revision;
- payment changes;
- settings changes;
- imports and exports of sensitive operational data.

An audit entry should identify the actor, action, time, affected record, and relevant before/after information.

## 10.13 Excel Import and Migration

- Existing active project and worker data must be importable.
- Current-year reliable attendance and payroll data should be migrated before the system replaces the spreadsheet workflow.
- Imports should provide validation and rejected-row feedback.
- The import process must avoid creating duplicate workers.
- Excel export remains available for operational continuity.

---

## 11. User Experience Requirements

- The interface must work smoothly on mobile and desktop.
- Foreman workflows should be optimized for one-handed or quick mobile use.
- Common attendance actions should require few interactions.
- Worker and project search must be available from relevant screens.
- Large lists must support filtering, sorting, and pagination.
- Forms should use sensible defaults and avoid exposing technical concepts.
- Error messages must explain what happened and how to fix it.
- Confirmation should be required for destructive, approval, reopening, and financial actions.
- Historical information should be understandable as a timeline or ordered record.
- The application should use consistent terms from Discovery rather than inventing alternative names.

---

## 12. Non-Functional Requirements

### 12.1 Scale

The system must comfortably support the current workforce of more than 400 workers and multiple long-running projects.

### 12.2 Performance

Common dashboards, lists, searches, and daily attendance actions should feel responsive under normal company usage.

### 12.3 Security

- Authentication and access control are mandatory.
- Foreman project isolation must be enforced server-side.
- Personal, document, payroll, and payment data must not be publicly accessible.
- Sensitive actions must be audited.

### 12.4 Reliability

- Important write operations must not create duplicate records when retried.
- Pending offline attendance must survive ordinary application closure and temporary connectivity loss.
- Attendance synchronization must apply project ownership consistently: the assigned foreman wins attendance conflicts within that project.
- Attendance synchronization must expose failures instead of silently dropping entries.
- Later attendance corrections may affect payroll, but must never silently rewrite an approved payroll snapshot.
- Approved payroll and historical records must remain reproducible.
- Imports must fail safely and report invalid data.
- Backups and recovery are implementation requirements to be defined in `STACKS.md` and `PLAN.md`.

### 12.5 Maintainability

- The application should remain a straightforward modular application.
- Business modules should have clear boundaries without becoming separate services.
- Managed backend services may be used for authentication, database, storage, and related infrastructure where appropriate.
- The implementation must avoid infrastructure that is not justified by the actual scale or workflow.

---

## 13. Out of Scope for Version 1

The following are explicitly deferred:

- recruitment;
- applicant tracking;
- training management;
- performance management;
- inventory;
- equipment and machinery management;
- vehicle management;
- worker self-service portal;
- worker mobile application;
- biometric attendance;
- GPS attendance;
- QR attendance;
- facial-recognition attendance;
- external client portal;
- formal tax invoices;
- client payment collection;
- banking integrations or payment execution;
- expense recording, expense calculations, and expense approval workflows;
- accommodation, transportation, company, and project expense modules;
- internal client billing summaries;
- full accounting-system replacement;
- multi-company SaaS tenancy;
- daily meal tracking, per-meal charging, and automated food-cost recovery beyond the fixed monthly worker deduction.

These features must not influence Version 1 implementation unless a simple compatibility decision is required.

---

## 14. Success Criteria

Version 1 is successful when:

- the CEO can see the current status of projects and workers without combining multiple spreadsheets;
- foremen can manage daily attendance from mobile devices even during temporary internet outages, then synchronize it later;
- one worker record remains consistent across project transfers;
- monthly attendance can be reviewed and payroll calculated in the application;
- payroll amounts can be traced back to attendance, rates, and adjustments;
- worker statements or payment vouchers can be generated;
- payment status is visible;
- document expiry risks are visible;
- important changes can be traced through audit history;
- current active data and reliable current-year history have been migrated;
- foremen cannot access another project;
- the application becomes the company’s operational system of record from the launch date, with Excel no longer used for parallel day-to-day workforce management.

---

## 15. Release Readiness

Version 1 is ready for operational use when:

1. CEO and foreman access boundaries are verified.
2. Worker and project data have been migrated and validated.
3. Daily attendance works reliably on a typical foreman mobile device both online and offline, and pending entries synchronize safely after connectivity returns.
4. Daily attendance states, exceptions, and corrections behave correctly in realistic project scenarios.
5. Payroll calculations have been verified against trusted historical or manually checked samples before launch.
6. Statements or vouchers match approved payroll.
7. Payment records behave independently of payroll calculations.
8. Reports and exports contain the required operational data.
9. Backup and recovery procedures are tested.
10. The CEO approves the launch cutover, after which the application immediately replaces active spreadsheet workflows as the system of record.

---

## 16. Launch and Excel Cutover

Version 1 uses a direct operational cutover. The company will not run Excel and the application as parallel day-to-day systems after launch.

Before launch:

- current operational data is imported and validated;
- representative attendance, payroll, payment, and report results are checked against trusted existing records;
- user access and mobile attendance workflows are tested;
- the CEO approves the cutover.

From the launch date:

- the application is the single operational system of record;
- new attendance, payroll, payments, worker changes, and project changes are recorded in the application;
- Excel is retained only for historical reference, approved imports, and exports—not as a parallel source of truth.

---

## 17. Documentation Boundary

To prevent the project from becoming overcomplicated, these four files are the complete implementation specification set:

- `PRD.md` — what the product must do;
- `STACKS.md` — technologies, managed services, infrastructure, and engineering conventions;
- `DESIGN.md` — data model, permissions, workflows, pages, and UI behavior;
- `PLAN.md` — implementation phases, tasks, tests, migration, and release gates.

Coding agents should not create additional specification documents unless the developer explicitly requests them.

