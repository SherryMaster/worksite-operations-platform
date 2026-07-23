# Worksite Operations Platform
## Implementation and Launch Plan

**File:** `PLAN.md`  
**Version:** 1.0  
**Status:** Final  
**Depends on:** `PRD.md` v1.1, `STACKS.md` v1.0, and `DESIGN.md` v1.0

---

## 1. Purpose

This document defines how Version 1 will be built, tested, reviewed, migrated, and launched.

The plan is intentionally practical. It exists to keep development moving in small, usable increments without recreating the large specification system that was intentionally removed.

The complete implementation specification consists only of:

- `PRD.md` — product requirements;
- `STACKS.md` — technology and engineering choices;
- `DESIGN.md` — pages, data boundaries, workflows, and interaction behavior;
- `PLAN.md` — delivery order, acceptance gates, migration, and launch.

Coding agents must not create additional planning or specification documents unless the developer explicitly requests them.

---

## 2. Confirmed Delivery Decisions

Version 1 will use the following delivery approach:

1. Source control is hosted on GitHub.
2. GitHub Actions validates every pull request.
3. Development proceeds through deployable vertical phases.
4. Every phase must be usable in a Vercel Preview deployment, tested, and accepted before the next phase begins.
5. Excel templates are prepared early.
6. At least two complete migration rehearsals are performed using copies of real company data.
7. User acceptance testing includes the CEO and at least one Foreman.
8. Coding-agent work is divided into small feature tasks with explicit acceptance checks.
9. Production launches through one controlled cutover.
10. Excel is not used as a parallel operational system after launch.

---

## 3. Planning Principles

### 3.1 Build Complete Workflows

Each phase should produce a usable workflow rather than disconnected database tables or static screens.

A phase is not complete merely because:

- tables exist;
- pages render;
- mock data looks correct;
- a coding agent reports that implementation is finished.

It is complete only when the intended user can perform the workflow against the real development backend and its acceptance checks pass.

### 3.2 Keep Tasks Small

A coding task should normally implement one focused behavior, such as:

- create a project;
- assign a Foreman;
- create a worker;
- record one attendance session offline;
- calculate Sunday minutes;
- approve one monthly payroll.

A task must not silently expand into unrelated refactoring, infrastructure, documentation, or new product features.

### 3.3 Prove Risky Rules Early

The highest-risk areas are:

- Clerk identity mapped to application roles;
- Supabase Row Level Security;
- Foreman project isolation;
- offline attendance synchronization;
- minute-accurate attendance calculations;
- payroll category calculations;
- payroll snapshots and correction behavior;
- migration from real Excel data.

These areas receive automated tests and realistic review before visual polish or secondary reporting work.

### 3.4 Prefer Direct Solutions

Version 1 should not introduce abstractions for possible future needs.

Do not add:

- a separate backend service;
- an ORM;
- generic workflow engines;
- custom form builders;
- custom report builders;
- queues, Redis, or event buses;
- broad repository frameworks;
- speculative multi-company or multi-tenant architecture.

---

## 4. Repository and Continuous Integration

## 4.1 Repository

The application uses one GitHub repository containing:

- the Next.js application;
- Supabase SQL migrations;
- generated database types;
- automated tests;
- fixed Excel import templates;
- the four approved Markdown specification files.

The repository uses short-lived feature branches and pull requests. Direct production changes should be avoided.

## 4.2 Required Pull Request Checks

GitHub Actions runs the following checks:

1. `npm ci`
2. formatting check;
3. ESLint;
4. TypeScript type checking;
5. unit and integration tests;
6. production build;
7. selected Playwright smoke tests when the affected workflow is available.

A pull request cannot be treated as complete while required checks are failing.

## 4.3 Database Changes

Every database change must be represented by a reviewed SQL migration in `supabase/migrations`.

Database changes must not exist only as manual edits in the Supabase dashboard. When an emergency dashboard edit is unavoidable, an equivalent migration must be added immediately before further feature work proceeds.

Generated TypeScript database types are refreshed whenever the schema changes materially.

---

## 5. Environments

Version 1 uses:

- local Next.js development connected to hosted development services;
- one hosted Supabase development project;
- Clerk development configuration;
- Vercel Preview deployments connected only to development services;
- one Supabase production project;
- Clerk production configuration;
- one Vercel production deployment.

Production credentials must never be available to Preview deployments.

Test data, development uploads, and migration rehearsals must not modify production data.

---

## 6. Phase Completion Gate

Every phase must meet all applicable conditions below before the next phase starts:

- the phase workflow works in a Vercel Preview deployment;
- required database migrations are committed;
- role and project access rules are verified;
- important validation and failure states are implemented;
- high-risk business logic has automated tests;
- no known blocking defect remains;
- the developer reviews the workflow;
- the phase is explicitly accepted.

Minor visual refinements may be deferred when they do not affect usability, security, calculations, or data integrity. Deferred items must not block the next phase unless they are needed by a later workflow.

---

## 7. Implementation Phases

## 7.1 Phase 1 — Foundation, Authentication, Authorization, and RLS

### Objective

Create a deployable application foundation and prove that CEO and Foreman access can be enforced safely.

### Scope

- initialize Next.js 16 with TypeScript and the selected shadcn setup;
- establish the agreed project structure and environment-variable validation;
- configure Clerk development authentication;
- configure Supabase development access;
- create the initial application user/profile and role tables;
- map Clerk identities to application users;
- implement CEO and Foreman route protection;
- create the first RLS policies and authorization helpers;
- create the application shell for desktop and mobile layouts;
- configure npm scripts, formatting, linting, type checking, tests, and production builds;
- configure GitHub Actions;
- connect Vercel Preview deployments to development services;
- add structured server logging without sensitive values.

### Required Proof

- a CEO can sign in and open the CEO application shell;
- a Foreman can sign in only after required MFA setup;
- an unauthenticated user is denied;
- a Foreman cannot reach CEO routes;
- RLS tests demonstrate that unauthorized records cannot be read through the selected access path;
- a pull request passes CI and produces a working Vercel Preview deployment.

### Phase Gate

No product CRUD work begins until authentication, role resolution, environment separation, and basic database authorization are working.

---

## 7.2 Phase 2 — Projects, Foremen, and Settings

### Objective

Allow the CEO to establish the operating structure needed by every later workflow.

### Scope

- CEO dashboard foundation with action-oriented status cards;
- project list, creation, editing, status, and detail pages;
- lean project fields confirmed in `DESIGN.md`;
- CEO-controlled Foreman invitation/account setup;
- manual Foreman assignment and replacement;
- enforcement of one active project per Foreman and one active Foreman per project;
- Foreman project-scoped navigation shell;
- configurable trades and skill levels;
- company settings required by confirmed Version 1 behavior;
- audit entries for important project, account, assignment, and settings changes.

### Required Proof

- the CEO can create and update a project;
- the CEO can assign and replace a Foreman;
- invalid overlapping Foreman assignments are rejected;
- a Foreman sees only the assigned project;
- a Foreman cannot access another project by changing a URL or request value;
- project history remains visible after assignment changes.

### Phase Gate

Projects and Foreman scope must be reliable before workers or attendance are added.

---

## 7.3 Phase 3 — Workers, Assignments, Rates, and Documents

### Objective

Replace spreadsheet-based worker records with one controlled worker identity and history.

### Scope

- worker list, search, filters, creation, editing, suspension, and archival;
- confirmed personal, identity, permit, employment, trade, and skill fields;
- manual project assignment and transfer;
- enforcement of one active project per worker;
- periods where a worker is unassigned;
- one effective-dated hourly rate per worker;
- fixed monthly food deduction per worker;
- rate and assignment history;
- private Supabase Storage buckets for photos and documents;
- server-authorized upload, download, replacement, and removal;
- document metadata and expiry visibility;
- fixed Excel template definitions prepared early for projects, workers, assignments, rates, and relevant history;
- audit entries for sensitive worker and document changes.

### Required Proof

- only the CEO can create or edit worker profiles;
- the CEO can assign and transfer a worker without overlapping active assignments;
- past assignments and rates remain available;
- the effective rate for a selected date is correct;
- private documents cannot be retrieved without current permission;
- the assigned Foreman can view only the workers currently available to that project;
- template columns and validation rules are tested with representative spreadsheet rows.

### Phase Gate

Worker identity, assignment, and rate history must be trustworthy before attendance and payroll depend on them.

---

## 7.4 Phase 4 — Foreman PWA and Offline Attendance

### Objective

Deliver the main daily operational workflow, including reliable use during temporary internet loss.

### Scope

- installable Foreman PWA;
- mobile-first Today screen;
- cached assigned-worker list needed for offline work;
- current-time `Enter` and `Exit` actions with manual correction;
- multiple sessions per worker per day;
- recorded break start and end times inside sessions;
- project-date day type with Normal and Sunday defaults and Foreman override;
- normal, after-5:00-PM, Sunday, and public-holiday minute allocation;
- incomplete, overlapping, reversed, and otherwise invalid session detection;
- IndexedDB offline queue;
- stable client action IDs and idempotent synchronization;
- visible pending, synchronized, failed, and conflict states;
- Foreman-owned conflict resolution within the assigned project;
- server protection for finalized financial records;
- CEO attendance workspace and exception visibility;
- permanent audited Foreman corrections.

### Required Proof

- a Foreman records entrances, exits, and breaks online;
- a Foreman performs the same actions with the network disabled;
- pending actions survive browser or PWA closure;
- reconnecting synchronizes the queue without duplicate events;
- retries remain idempotent;
- one date can contain multiple valid sessions;
- incomplete sessions contribute zero payable minutes;
- work crossing 5:00 PM is split correctly;
- Sunday and public-holiday rates do not stack with ordinary overtime;
- a Foreman cannot sync attendance for another project;
- minute-level totals match manually checked examples.

### Phase Gate

At least one typical Foreman phone must complete an offline-to-online synchronization test in the Vercel Preview environment.

---

## 7.5 Phase 5 — Leave

### Objective

Add the confirmed full-day unpaid leave workflow without creating a larger leave-management system.

### Scope

- Foreman leave submission for assigned workers;
- full calendar-day leave only;
- CEO review, approval, and rejection;
- unpaid leave presentation in worker and payroll views;
- validation against conflicting attendance;
- leave history and audit entries;
- no partial-day leave, balances, accruals, or paid leave categories.

### Required Proof

- a Foreman submits leave only for an assigned worker;
- the CEO approves or rejects it;
- approved leave contributes zero payable hours for that date;
- leave on an unscheduled day does not create a separate deduction;
- worked attendance and approved full-day leave cannot silently coexist;
- changes are traceable.

### Phase Gate

Leave must integrate cleanly with attendance before payroll calculation begins.

---

## 7.6 Phase 6 — Payroll, Statements, and Payments

### Objective

Move the company’s fixed monthly payroll calculation and payment status into the application.

### Scope

- fixed calendar-month payroll periods;
- payroll generation from valid attendance only;
- minute-based normal, overtime, Sunday, and public-holiday buckets;
- 1.5× after 5:00 PM on Normal days;
- 2× Sunday work;
- 3× public-holiday work;
- effective-dated worker rates;
- fixed monthly food deduction;
- explicit adjustments;
- review grouped by project and worker;
- blocking attendance exceptions;
- complete-month CEO approval;
- immutable approved payroll snapshot behavior;
- correction lifecycle for attendance and rate changes;
- next-payroll underpayment and overpayment adjustments after payment;
- worker statements or vouchers;
- one complete monthly payment per worker payroll;
- CEO-only `Paid` action;
- payment method and payment audit details.

### Required Proof

Automated tests and manually checked examples must cover:

- fractional-hour and minute calculations;
- multiple sessions and breaks;
- the 5:00 PM split;
- Normal, Sunday, and Public Holiday precedence;
- rate changes during a month;
- full monthly food deduction;
- unpaid leave;
- incomplete session exclusion;
- draft recalculation after corrections;
- approved-but-unpaid payroll returning to review;
- paid payroll retaining history and creating a later adjustment;
- prevention of partial or duplicate payments.

The CEO must be able to trace a worker’s payroll amount back to attendance, rates, deductions, and adjustments.

### Phase Gate

Representative payroll results must match trusted manual calculations before this phase is accepted.

---

## 7.7 Phase 7 — Reports, Audit, and Excel Migration

### Objective

Complete operational visibility and prove that existing spreadsheet data can enter the application safely.

### Scope

- predefined project, workforce, attendance, leave, payroll, payment, and document-expiry reports;
- useful filters and Excel exports;
- audit viewer with actor, action, date, entity, and before/after details;
- downloadable fixed import templates;
- server-side spreadsheet parsing and validation;
- clear row-level errors;
- preview-before-commit import flow;
- duplicate detection;
- import order for projects, workers, assignments, rates, documents metadata, and reliable history;
- migration reconciliation totals and exception lists;
- first complete migration rehearsal using a copy of real Excel data.

### Required Proof

- predefined reports agree with source records;
- exports contain expected filtered data;
- audit history explains important changes;
- invalid spreadsheet rows do not commit silently;
- a repeated import does not create uncontrolled duplicates;
- the first rehearsal produces a documented list of source-data corrections or importer fixes;
- migrated counts and representative worker histories are reconciled.

### Phase Gate

The migration process must be repeatable before launch hardening begins.

---

## 7.8 Phase 8 — Launch Hardening and Cutover

### Objective

Prove the complete operating cycle, prepare production safely, and replace Excel in one controlled launch.

### Scope

- resolve defects from all accepted phases;
- production configuration review;
- Clerk production roles and MFA verification;
- Supabase production schema migration review;
- RLS and private Storage access review;
- backup and recovery procedure test;
- performance checks with representative worker, attendance, and payroll volumes;
- mobile PWA checks on representative Foreman devices;
- second complete migration rehearsal using a fresh copy of real data;
- reconciliation against trusted Excel totals;
- complete staging user acceptance test;
- final production data migration;
- launch readiness review and CEO approval;
- direct production cutover;
- immediate post-launch checks.

### Required Proof

The CEO and at least one Foreman complete this representative workflow in staging:

1. sign in with the correct access level;
2. create or review a project and Foreman assignment;
3. create or review workers and assignments;
4. record attendance online and offline;
5. synchronize and correct attendance;
6. submit and review leave;
7. generate and review monthly payroll;
8. generate a worker statement or voucher;
9. mark a payroll payment as paid;
10. review reports and audit history.

The second migration rehearsal must demonstrate that the import process, correction steps, reconciliation, and expected duration are understood before production cutover.

### Phase Gate

Production launch requires all release-readiness conditions in `PRD.md` and the launch checklist in this document to pass.

---

## 8. Testing Strategy

## 8.1 Unit and Business-Logic Tests

Vitest covers pure or isolated business rules, especially:

- attendance-minute allocation;
- break handling;
- day-type precedence;
- overtime multipliers;
- rate-effective dates;
- food deductions;
- payroll totals;
- correction lifecycle;
- offline idempotency and conflict decisions.

## 8.2 Database and Permission Tests

Database-focused tests cover:

- RLS policies;
- CEO access;
- Foreman project isolation;
- one-worker/one-project enforcement;
- one-Foreman/one-project enforcement;
- non-overlapping rate and assignment periods;
- duplicate offline action IDs;
- payroll and payment state guards.

## 8.3 Component Tests

React Testing Library is used selectively for forms and interactive states where browser-level testing would be unnecessarily slow.

## 8.4 End-to-End Tests

Playwright covers the smallest set of critical full workflows:

- authentication and route protection;
- CEO project and worker setup;
- Foreman attendance;
- attendance exception correction;
- leave review;
- payroll generation, approval, statement generation, and payment;
- migration preview and rejection of invalid rows.

Offline behavior must also be tested manually on a representative mobile device; automated browser tests alone are not sufficient proof.

## 8.5 No Arbitrary Coverage Target

Version 1 does not chase a percentage target. Testing effort is concentrated on financial accuracy, permissions, synchronization, migrations, and state transitions.

---

## 9. Coding-Agent Task Protocol

Every coding-agent task should contain:

1. **Goal** — one concrete user or system outcome.
2. **Relevant specification** — exact sections from the four approved files.
3. **Scope** — what may be changed.
4. **Non-goals** — what must not be added or refactored.
5. **Acceptance checks** — observable conditions that prove completion.
6. **Required tests** — tests that must be added or updated.
7. **Validation commands** — formatting, linting, type checking, tests, and build.

A good task is small enough to review as one coherent pull request.

### Example Task Shape

```text
Goal:
Allow the CEO to create a worker and assign the worker to one active project.

Scope:
Worker creation form, server mutation, required migration, assignment validation,
and success/error UI.

Non-goals:
Attendance, payroll, imports, document uploads, project-specific rates,
or broad repository refactoring.

Acceptance:
- CEO can create the worker.
- Foreman cannot create a worker.
- One active project assignment is stored.
- A second overlapping active assignment is rejected.
- Audit history records creation and assignment.
- Required automated tests pass.
```

Agents must not:

- generate additional specification documents;
- redesign confirmed workflows without approval;
- add libraries for convenience when the current stack already solves the task;
- perform broad cleanup unrelated to the assigned feature;
- replace tested business rules with inferred alternatives;
- mark work complete while required checks fail.

---

## 10. Excel Migration Plan

## 10.1 Early Preparation

Fixed import templates and required-column definitions are prepared during Phase 3 so the company can begin cleaning source spreadsheets before launch.

The application does not attempt to support arbitrary spreadsheet layouts. Source data must be converted into the approved templates.

## 10.2 Rehearsal One

Performed in Phase 7 using a copy of real data.

Purpose:

- discover missing or inconsistent source values;
- validate template design;
- identify duplicate workers and projects;
- verify import order;
- improve row-level errors;
- reconcile record counts and selected histories.

## 10.3 Rehearsal Two

Performed in Phase 8 using a fresh source copy and the corrected process.

Purpose:

- prove repeatability;
- verify that earlier issues were resolved;
- reconcile workforce, project, assignment, rate, attendance-history, and payroll-history totals that are included in migration;
- prepare the exact production cutover procedure.

## 10.4 Production Migration

Production migration occurs only after operational data entry has stopped in Excel for the cutover window and a backup copy has been retained.

After migration:

- record totals are reconciled;
- representative worker histories are reviewed;
- current assignments and rates are checked;
- required users and permissions are verified;
- the CEO approves the application as the new system of record.

---

## 11. User Acceptance Testing

User acceptance testing takes place in the staging/Preview environment using representative data.

Required participants:

- the CEO;
- at least one Foreman;
- the developer facilitating and recording defects.

Acceptance focuses on real work rather than isolated screens. Test participants should complete the representative workflow listed in Phase 8 and verify that terminology, mobile usability, reports, and payroll explanations are understandable.

A defect blocks launch when it can cause:

- unauthorized access;
- lost or duplicated attendance;
- incorrect payable minutes or payroll;
- incorrect worker or project assignment;
- inaccessible required documents;
- failed migration or unreconciled data;
- inability to complete the monthly payroll and payment workflow.

---

## 12. Launch Checklist

Production cutover requires all of the following:

### Access and Security

- CEO production access works.
- Every active Foreman has the correct project and required MFA.
- Former or unauthorized users cannot access the application.
- RLS and private Storage checks pass.
- Production secrets are present only in production.

### Data and Migration

- a pre-migration backup copy of source spreadsheets exists;
- production migrations have been reviewed and applied;
- final imports complete without unresolved blocking errors;
- project, worker, assignment, and rate totals reconcile;
- representative histories and document links are verified.

### Attendance and Payroll

- mobile online attendance works;
- offline attendance and later synchronization work;
- blocking attendance exceptions are visible;
- representative payroll calculations match trusted manual checks;
- statements or vouchers generate correctly;
- CEO payment marking works.

### Operations

- backup and recovery procedures have been tested;
- Vercel and Supabase logs are accessible;
- a clear owner exists for launch-day issue decisions;
- CEO gives final cutover approval.

### Cutover

- new operational entries stop in Excel;
- final migration and reconciliation complete;
- the production application becomes the single system of record;
- Excel remains read-only historical reference and an import/export format;
- no parallel day-to-day Excel workflow continues.

---

## 13. Post-Launch Stabilization

Immediately after cutover, the team checks:

- user access and project assignments;
- first live attendance entries;
- offline queue behavior on Foreman devices;
- synchronization failures;
- worker and document access;
- calculation exceptions;
- Vercel and Supabase logs.

Only defects affecting confirmed Version 1 workflows are treated as stabilization work. New feature ideas are recorded separately and do not enter the launch branch unless they resolve a blocking operational problem.

Food-deduction changes, expenses, billing, project budgets, partial payments, custom reports, worker self-service, and other deferred functionality remain outside Version 1.

---

## 14. Final Completion Rule

Version 1 is complete when:

- all eight phases pass their gates;
- the CEO and at least one Foreman pass staging user acceptance testing;
- two migration rehearsals and the final production migration reconcile successfully;
- all release-readiness conditions pass;
- the CEO approves direct cutover;
- the company performs current operational work in the application rather than parallel Excel sheets.

`PLAN.md` is complete. Implementation should now proceed through small, reviewed feature tasks based only on the four approved specification files.
