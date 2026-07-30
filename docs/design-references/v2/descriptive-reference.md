# Worksite Operations Platform — Screen-by-Screen Descriptive Image References

**Purpose:** prompt-ready visual references for generating high-fidelity UI mockups before implementation.  
**Source:** `worksite-ui-audit-and-reference-spec-v2.md`  
**Coverage:** all 40 mandatory references from the approved image manifest, plus supplementary references for omitted routes and shared access states.  
**Product:** internal construction workforce operations PWA for CEO and Foreman users.  
**Primary viewport:** mobile first; approximately 90% expected phone usage.

---

## 1. How to use this document

For each image, combine:

1. the **Global visual prefix**;
2. the relevant **Role shell prefix**;
3. the screen’s **screen-specific reference**;
4. the **Global negative constraints**.

The generated image is a design reference, not a marketing mockup. It must look implementable with Next.js, Tailwind CSS, shadcn/Base UI, Lucide icons, and ordinary responsive web layouts.

---

## 2. Global visual prefix

Create a high-fidelity interface reference for **Worksite Operations Platform**, a real internal construction workforce management PWA used to manage projects, workers, attendance, leave, payroll, reports, imports, and audit history. The design must feel like a calm, trustworthy mobile field-operations product rather than a consumer app or marketing website.

### Visual language

- light neutral application background: approximately `#F6F7F9`;
- white primary surfaces;
- near-black primary text: approximately `#111827`;
- slate secondary text: approximately `#64748B`;
- soft slate borders: approximately `#E2E8F0`;
- violet brand and primary action: approximately `#6D28D9` to `#7C3AED`;
- soft violet selected state: approximately `#F5F3FF`;
- emerald for active, approved, paid, on-site, and successful states;
- amber for pending, on-break, expiring, or needs-review states;
- red for invalid, expired, failed, destructive, or blocking states;
- sentence-case headings;
- modern neutral sans-serif typography similar to Inter or Geist;
- compact spacing, restrained shadows, 10–12 px corner radii;
- touch targets approximately 44–52 px for important actions;
- simple Lucide-style outline icons;
- strong hierarchy through spacing, type weight, and semantic status—not through oversized cards.

### Mobile framing

- render a full application viewport at approximately **390 × 844 px**;
- no physical phone frame;
- no Android navigation bar or unrelated browser chrome;
- retain a realistic top safe area and bottom safe area;
- fixed bottom navigation where specified;
- first useful task or first record must be visible in the initial viewport;
- show enough continuation below the fold to imply a real scrollable application;
- use compact record rows rather than one large card for every record.

### Desktop framing

- render at approximately **1440 × 900 px**;
- persistent labelled sidebar around 248 px wide;
- compact top utility bar;
- dense tables or split panes for high-volume information;
- no giant empty margins;
- no mobile-card grid where a desktop table is more efficient.

### Shared sample data

Use the following sample data consistently unless a screen states otherwise:

- Company display name: **Worksite Ops**
- Workspace label: **Company operations**
- Main project: **SAFAR**
- Client: **Microsoft**
- Location: **Cyberjaya, Selangor**
- Project status: **Active**
- Foreman: **Rashid Ahmed**
- Workers:
  - **Ahmed** — Electrician · Helper
  - **Muhammad Abbas** — Splicer · Skilled
  - **Imran Khan** — Network Technician · Semi Skilled
  - **Bilal Ahmad** — Plumber · General Worker
- Representative project workforce: **126 workers**
- Example work date: **Thu, 30 Jul 2026**
- Example payroll month: **July 2026**
- Currency: **MYR / RM**
- Timezone: **Asia/Kuala_Lumpur**

---

## 3. Role shell prefixes

### Foreman mobile shell

Top app bar with compact `WO` brand mark on the left, current project name **SAFAR** in the center with secondary label **Foreman workspace**, and profile or contextual status controls on the right. Bottom navigation has five items: **Today**, **Attendance**, **Workers**, **Leave**, and **More**. The selected item uses violet icon/text and a thin violet top indicator. Normal online status is silent; connection status appears only when offline, syncing, pending, or failed.

### CEO mobile shell

Top app bar with compact `WO` brand mark, text **Company operations** and secondary label **CEO workspace**, plus profile avatar on the right. Bottom navigation has **Home**, **Projects**, **Workers**, **Attendance**, and **More**. The selected item uses violet icon/text and a thin top indicator. Leave, Payroll, Reports, Settings, Import center, Audit, and account actions live inside the grouped More sheet.

### Foreman desktop shell

Persistent left sidebar with brand mark, a compact assigned-project panel showing **SAFAR**, navigation for Today, Attendance, Workers, Leave, and Reports, and quiet connection/install/sign-out controls near the bottom. Main content uses dense operational lists or tables.

### CEO desktop shell

Persistent left sidebar grouped into Operations, Finance, Reporting, and Administration. Navigation includes Home, Projects, Workers, Attendance, Leave, Payroll, Reports, Settings, Import center, and Audit. Main content uses a compact page title row, toolbar, table or split pane, and optional right-side detail panel.

---

## 4. Global negative constraints

Do not generate:

- gradients, glassmorphism, glossy 3D surfaces, neon effects, or decorative illustrations;
- oversized marketing headings or large hero sections;
- all-uppercase screen titles;
- excessive purple backgrounds;
- huge cards around every small item;
- dense unreadable text or tiny touch targets;
- random charts not required by the screen;
- invented roles, approval stages, payroll rules, bulk attendance controls, or automatic business decisions;
- exposed real identity numbers, passwords, tokens, or private files;
- dark mode;
- physical device mockups;
- lorem ipsum;
- impossible native-app interactions that cannot be implemented in the current web stack;
- unbounded lists pretending all 500 workers load at once.

---

# Part A — Mandatory Mobile References
## M-F01 — Foreman Today — live attendance operations

**Target file:** `mobile/foreman/F01-today-live.png`  
**Purpose:** Show the Foreman’s primary one-handed work screen for recording current-time attendance across a large assigned workforce.

### Screen-specific visual reference

Use the Foreman mobile shell. Below the app bar, show a compact page/task bar with title Today, the date Thu, 30 Jul, and a small day-type control reading Normal day. Follow with one slim operational summary strip showing 126 expected, 38 not entered, 72 on site, 5 on break, and 1 issue, but visually emphasize only the issue count. Add a sticky worker toolbar with a full-width search field, visible filters All, Not entered, On site, and a More filters button. The main content is a dense contained list of worker rows around 76 px high. Each row has worker name, trade and skill, a status chip, and exactly one context-aware action at the trailing edge. Include Ahmed as Not entered with Enter; Muhammad Abbas as On site with Exit; Imran Khan as On break with End break; Bilal Ahmad as an invalid-session exception with Fix. Put correction and details inside a three-dot overflow action, not as permanent full-width buttons.

### Visible content and wording

Use real labels: “Working from current data” should not appear when online. Show one subtle row marker saying Saved on device only on a pending row if desired. Keep the first four workers visible in the initial viewport and imply continuation with a bottom count such as “Showing 1–20 of 126”.

### Required state

Default online state, high-volume workforce, one exception sorted first or near the top.

### Screen-specific exclusions

Do not show a giant selector card, six large metric cards, horizontal chip scroller, repeated Correct times buttons, or a bulk attendance action.

---

## M-F02 — Foreman Attendance history

**Target file:** `mobile/foreman/F02-attendance-history.png`  
**Purpose:** Show historical review and correction, clearly distinct from live Today actions.

### Screen-specific visual reference

Use the Foreman mobile shell with Attendance selected. Compact page title Attendance history. Add a date navigator with previous arrow, central Thu, 30 Jul 2026 button, and next arrow. Under it show a concise summary line: 126 workers · 118 recorded · 3 issues. Add search and a compact filter trigger. The list uses contained rows showing worker name, state, one-line session summary, payable time, and chevron. Ahmed shows 09:00–17:00 · 8h 00m · Complete. Muhammad Abbas shows 09:05–18:15 · 8h 40m · Overtime. Imran Khan shows Incomplete exit with a red issue marker. No Enter, Exit, Start break, or End break buttons appear anywhere.

### Visible content and wording

A small banner may show “3 records need correction” with an action to view issues. Selecting a row is implied to open the details sheet.

### Required state

Historical daily review with one incomplete record.

### Screen-specific exclusions

Do not visually reuse the live attendance action layout. No current-time action buttons.

---

## M-F03 — Foreman assigned workers

**Target file:** `mobile/foreman/F03-workers.png`  
**Purpose:** Show a fast, read-only mobile directory for the assigned project.

### Screen-specific visual reference

Use Foreman mobile shell with Workers selected. Page bar shows Workers and 126 assigned. Place one search field directly below with placeholder Search name, phone, or identifier. Use a compact contained list with 64–72 px rows. Each row contains name, trade · skill, masked identifier or phone, optional document-warning icon, and chevron. Ahmed shows Electrician · Helper and CNIC •••• 6789 with an amber Expiring document marker. Muhammad Abbas shows Splicer · Skilled and phone 0300 659 8777. Imran Khan shows Network Technician · Semi Skilled. Show a clear result footer or Load next 20 action.

### Visible content and wording

The list must feel capable of handling 126 workers without card inflation.

### Required state

Default list with one document alert.

### Screen-specific exclusions

No separate full-width Search button, no project name repeated in every row, no CEO-only edit/rate/payroll information.

---

## M-F04 — Foreman worker detail

**Target file:** `mobile/foreman/F04-worker-detail.png`  
**Purpose:** Show the reduced read-only worker profile available to a Foreman.

### Screen-specific visual reference

Use Foreman shell. Compact identity header with circular photo or initials AH, name Ahmed, Active status, Electrician · Helper, and SAFAR. Add a short segmented control with Overview selected and tabs Documents, Attendance, Leave. Overview uses grouped definition rows rather than cards: Phone, Nationality, masked CNIC, work permit expiry, address. Place an amber document warning near the top: Work Permit expires 18 Aug 2026 with View document details. At the bottom of the visible viewport show a Recent attendance section with two compact date rows.

### Visible content and wording

Clearly read-only. Use one back button and no edit controls.

### Required state

Overview with an expiring document.

### Screen-specific exclusions

Do not show hourly rate, food deduction, employment-status controls, project-transfer controls, payroll, audit, or private full identity numbers.

---

## M-F05 — Foreman leave queue

**Target file:** `mobile/foreman/F05-leave.png`  
**Purpose:** Show current leave requests with creation separated from history.

### Screen-specific visual reference

Use Foreman shell with Leave selected. Compact page bar: Leave, plus a primary New request button. Beneath it use status tabs Pending, Approved, Rejected, All, with Pending selected and counts. Show compact request rows: Ahmed · Illness · 31 Jul–1 Aug · Pending; Muhammad Abbas · Personal · 24 Jul · Approved; Imran Khan · Illness · 18 Jul · Rejected. Each row shows worker, date range, leave type, status chip, submitted time, and chevron. The pending item has a small note “Awaiting CEO review”.

### Visible content and wording

The first pending request should be immediately visible without introductory prose.

### Required state

Pending tab with mixed history below.

### Screen-specific exclusions

Do not permanently render the leave creation form above the list. No partial-day leave options.

---

## M-F06 — New leave request sheet

**Target file:** `mobile/foreman/F06-new-leave-sheet.png`  
**Purpose:** Show a focused full-height mobile sheet for submitting full-day unpaid leave.

### Screen-specific visual reference

Overlay a full-height bottom sheet over the Foreman Leave screen. Sheet header: New leave request, with close button and one-line rule “Full calendar days only · unpaid when approved”. Form fields: searchable Worker combobox showing Ahmed selected; Leave type combobox showing Illness; First day 31 Jul 2026; Last day 1 Aug 2026; collapsed Add reason and notes section opened to show a short reason; optional Attach document row. Use clear field labels and 48 px controls. Sticky bottom action bar with Cancel and Submit request.

### Visible content and wording

Show no attendance conflict in this reference. The form is clean and focused, with the background dimmed.

### Required state

Valid form ready to submit.

### Screen-specific exclusions

No partial-day controls, hourly leave, approval button, or giant instructional paragraphs.

---

## M-F07 — Foreman reports

**Target file:** `mobile/foreman/F07-reports.png`  
**Purpose:** Show predefined project-scoped reports in a compact mobile browsing experience.

### Screen-specific visual reference

Use Foreman shell with More active or Reports title visible. Page bar: Reports. Add a search field and Filters button. Result heading: Current project workforce, with 126 rows and a neutral outlined Export button. Main list uses compact rows with Ahmed, Electrician · Helper, Active, Document expiring; Muhammad Abbas, Splicer · Skilled, Active; Imran Khan, Network Technician · Semi Skilled. Each row has a More fields chevron that implies a detail sheet rather than expanding the entire list. Show page footer 1–20 of 126 and Next.

### Visible content and wording

A small filter summary chip reads Project: SAFAR. Keep export secondary to browsing.

### Required state

Current workforce report.

### Screen-specific exclusions

No large orange export button, no Import center button, no tall attribute/value card for each record, no native long select menu visible.

---

## M-C01 — CEO company dashboard

**Target file:** `mobile/ceo/C01-dashboard.png`  
**Purpose:** Show an exception-first mobile dashboard for company operations.

### Screen-specific visual reference

Use CEO mobile shell with Home selected. Compact page title Dashboard and a small overflow quick-actions button. Use one two-row metric strip rather than four tall cards: 4 active projects, 412 active workers, 4 Foremen, 12 actions required. Immediately below, show Action required as the dominant section, grouped by severity. Include a red Blocking row: 1 payroll exception; amber Needs review rows: 3 pending leave requests, 2 expiring work permits, 1 project without Foreman; neutral Upcoming row: July payroll unpaid for 37 workers. Each row has concise context and chevron. A small Recent activity section begins near the bottom.

### Visible content and wording

The action queue must occupy most of the first viewport. No decorative chart.

### Required state

Mixed priority queue with one blocker.

### Screen-specific exclusions

No promotional quick-access card, no large Create project hero button, no decorative analytics chart.

---

## M-C02 — CEO projects list

**Target file:** `mobile/ceo/C02-projects.png`  
**Purpose:** Show a scalable project directory with immediate creation and filtering.

### Screen-specific visual reference

Use CEO shell with Projects selected. Page bar shows Projects, 7 total, and New project. Sticky toolbar has search and Filters. Use compact 92 px project rows/cards. SAFAR shows Active, Microsoft, Cyberjaya, Rashid Ahmed, 126 workers, 1 issue. NORTHSTAR shows Active, Google, Johor Bahru, no Foreman, 84 workers, 2 issues. MERANTI shows Planned, 0 workers. Each row is fully clickable with status chip and chevron. Show active filter chip Status: Active and a result footer.

### Visible content and wording

Exception counts use semantic emphasis but routine rows remain quiet.

### Required state

Filtered active-project list.

### Screen-specific exclusions

No giant project cards, no repeated long descriptions, no budget or contract-management fields.

---

## M-C03 — CEO project detail

**Target file:** `mobile/ceo/C03-project-detail.png`  
**Purpose:** Show focused project information with one section rendered at a time.

### Screen-specific visual reference

Use CEO shell. Compact project header: SAFAR, Active status, Microsoft, Cyberjaya, Selangor. Include Edit button and overflow menu for Change status and Assign/replace Foreman. Use segmented tabs Overview, Workforce, Attendance, Leave, More; Workforce selected. Show a small summary: 126 active workers, 2 awaiting transfer, Foreman Rashid Ahmed. Then a compact worker list with search and an Assign workers action. Rows show Ahmed, Muhammad Abbas, Imran Khan with trade/skill and status. Only Workforce content is rendered.

### Visible content and wording

Keep project identity persistent but compact. Show a back button to Projects.

### Required state

Workforce section selected.

### Screen-specific exclusions

Do not show all overview, attendance, leave, and history sections in one endless page. No budget/expenses.

---

## M-C04 — CEO workers list

**Target file:** `mobile/ceo/C04-workers.png`  
**Purpose:** Show a high-volume company-wide worker directory optimized for mobile.

### Screen-specific visual reference

Use CEO shell with Workers selected. Page bar: Workers, 412 total, Add worker. Sticky toolbar: search field and Filters button. Active filters row shows Active and Project: SAFAR chips. Use compact contained rows around 76 px. Ahmed: Active, SAFAR · Electrician, CNIC •••• 6789, amber document warning. Muhammad Abbas: Active, SAFAR · Splicer, phone 0300 659 8777. Bilal Ahmad: Awaiting assignment · Plumber. Each row is clickable and has chevron. Footer reads Showing 1–20 of 126 filtered workers with Load next 20 or page controls.

### Visible content and wording

Search placeholder must fit without awkward truncation.

### Required state

Filtered worker list with one awaiting-assignment worker.

### Screen-specific exclusions

No field-per-card layout, no unbounded list, no repeated Edit buttons per row.

---

## M-C05 — CEO worker create/edit guided form

**Target file:** `mobile/ceo/C05-worker-form.png`  
**Purpose:** Show a mobile-friendly guided form for creating or editing a worker without changing the existing data model.

### Screen-specific visual reference

Use CEO shell. Header: Add worker with Back. Under it show a six-step progress indicator with Identity active and labels minimized to 1 Identity, 2 Employment, 3 Assignment, 4 Pay, 5 Documents, 6 Review. Form section Identity contains Full name, Phone, Nationality, CNIC, Passport, optional Date of birth, Gender, Address, and Photo upload. Use grouped fields with strong labels, required/optional markers, and 48 px inputs. Bottom sticky action bar has Cancel and Continue. Show a subtle duplicate-check note beneath CNIC/Passport.

### Visible content and wording

The screenshot should show the first step only, not every field in the entire workflow.

### Required state

New worker, Identity step.

### Screen-specific exclusions

No one-page mega-form, no invented fields, no worker self-registration, no save action before required identity fields are complete.

---

## M-C06 — CEO worker detail

**Target file:** `mobile/ceo/C06-worker-detail.png`  
**Purpose:** Show a manageable worker record with routed or focused sections instead of one very long page.

### Screen-specific visual reference

Use CEO shell. Compact identity header with initials AH, Ahmed, Active, SAFAR, Electrician · Helper, Edit button, and overflow menu. Use a tab row with Overview selected and visible tabs Employment, Assignments, Documents, More. Overview shows compact definition rows for phone, nationality, masked CNIC, passport, work permit, address, current hourly rate RM 12.50, and monthly food deduction RM 360.00. An amber work-permit expiry alert appears near the top. Only Overview content is shown; other sections are not rendered below.

### Visible content and wording

Use sentence case, moderate typography, and compact rows.

### Required state

Overview with document warning.

### Screen-specific exclusions

No oversized uppercase worker name, no all-sections-at-once page, no permanent status/assignment/rate forms.

---

## M-C07 — CEO attendance oversight

**Target file:** `mobile/ceo/C07-attendance.png`  
**Purpose:** Show company-wide daily attendance review and correction as a dense oversight workflow.

### Screen-specific visual reference

Use CEO shell with Attendance selected. Page bar: Attendance. Compact control bar combines Project SAFAR and date Thu, 30 Jul, plus Daily | Monthly segmented control with Daily selected. Add a slim red/amber banner: 3 synchronized actions need review, with Review action. Summary line: 126 workers · 118 recorded · 3 issues. Search + Filters toolbar. Main list uses compact worker rows with session summary, payable time, state, and chevron. Put issue rows first: Imran Khan · Missing exit · Fix; Bilal Ahmad · Failed sync · Review. Routine rows follow. Selecting a row opens correction details, but no sheet is open in this image.

### Visible content and wording

No live Enter/Exit actions. Keep project/date controls compact and always clear.

### Required state

Daily oversight with synchronization issues.

### Screen-specific exclusions

No separate giant selector card above another attendance card, no repeated Review or correct times button on every worker.

---

## M-C08 — CEO leave review

**Target file:** `mobile/ceo/C08-leave-review.png`  
**Purpose:** Show pending leave decisions as the default task.

### Screen-specific visual reference

Use CEO shell with More active. Compact page bar: Leave review, plus overflow action Submit for worker. Count tabs Pending 3, Approved 18, Rejected 2, All, with Pending selected. Add Filters button. Show compact request rows. Ahmed · SAFAR · Illness · 31 Jul–1 Aug · No attendance conflict · Pending. Muhammad Abbas · SAFAR · Personal · 30 Jul · Attendance conflict, red indicator. Imran Khan · NORTHSTAR · Illness · 2–3 Aug · Pending. Rows show submitted time and chevron. The conflict row is visually prioritized.

### Visible content and wording

First pending request is visible immediately. Approval/rejection actions live in the detail sheet, not in every row.

### Required state

Pending queue with one conflict.

### Screen-specific exclusions

No approved history dominating the page, no giant reason text blocks, no partial-day leave.

---

## M-C09 — CEO payroll months

**Target file:** `mobile/ceo/C09-payroll-months.png`  
**Purpose:** Show monthly payroll runs in a compact mobile summary list.

### Screen-specific visual reference

Use CEO shell with More active. Page bar: Payroll. A compact month control shows July 2026 and a violet Generate or recalculate action beside or directly below it without a large enclosing card. List monthly runs as contained summary cards around 112 px. July 2026: Draft, Net RM 4,382.40, 3 workers, 1 exception, 0 paid · 3 unpaid, chevron. June 2026: Approved, Net RM 148,220.35, 412 workers, 0 exceptions, 395 paid · 17 unpaid. May 2026: Paid, all workers paid. Use red/amber/emerald status treatment appropriately.

### Visible content and wording

The month row itself is clearly tappable.

### Required state

Current draft plus historical approved/paid months.

### Screen-specific exclusions

No tall vertical stack of separate Workers/Gross/Net/Exceptions/Payments labels. No disabled-looking arrow.

---

## M-C10 — CEO payroll run detail

**Target file:** `mobile/ceo/C10-payroll-run.png`  
**Purpose:** Show a monthly payroll review designed for hundreds of workers.

### Screen-specific visual reference

Use CEO shell. Sticky compact run bar: July 2026, Draft status, overflow Recalculate. Tabs: Exceptions 1, Workers 3, Summary, Payments, with Exceptions selected because a blocker exists. Show one red exception row: Imran Khan · SAFAR · Missing hourly rate for 30 Jul · Review worker rate. Below it show a small non-blocking warning row for an expiring document. Sticky bottom area or header indicates Approve run disabled with concise explanation “Resolve 1 blocking exception”. The Workers tab content is not rendered.

### Visible content and wording

Make the blocker and corrective action unmistakable without a giant warning card.

### Required state

Draft payroll with one blocking exception.

### Screen-specific exclusions

No large summary tiles before the exception, no worker cards with four repeated metrics, no payment controls before approval.

---

## M-C11 — CEO reports

**Target file:** `mobile/ceo/C11-reports.png`  
**Purpose:** Show company-wide predefined reports with mobile-friendly result browsing.

### Screen-specific visual reference

Use CEO shell with More active. Page bar: Reports. Sticky toolbar has Search within results and Filters. Result header: Current workforce and assignments, 126 rows, neutral outlined Export action. Active filter chips: Project SAFAR, Status Active. Main list uses compact rows showing worker, project, trade/skill, employment status, and document state. Tapping a row or More fields opens a detail sheet; do not expand all attributes inline. Footer shows 1–20 of 126 and Next.

### Visible content and wording

The report title and row count are more prominent than export.

### Required state

Filtered workforce report.

### Screen-specific exclusions

No orange full-width Download Excel button, no Import center shortcut in the page header, no giant expanded record cards.

---

## M-C12 — CEO settings landing

**Target file:** `mobile/ceo/C12-settings-home.png`  
**Purpose:** Show Settings as a navigable landing page rather than a monolithic page containing every form.

### Screen-specific visual reference

Use CEO shell with More active. Compact title Settings. Grouped contained-list sections: Access with Users and Foremen; Workforce categories with Trades, Skill levels, Document types, Leave types; Data and company with Import template and Company identity. Each row has a simple icon, title, concise summary or item count, and chevron. Example counts: 4 Foremen, 6 trades, 5 skill levels, 4 document types, 3 leave types. No forms or category records appear on this screen.

### Visible content and wording

The list should fit most groups within one or two viewports and feel like a settings index.

### Required state

Default settings landing.

### Screen-specific exclusions

No anchor-button grid followed by all settings sections, no permanent Create Foreman form, no editable category inputs.

---

## M-C13 — CEO category management

**Target file:** `mobile/ceo/C13-category-settings.png`  
**Purpose:** Show a reusable mobile pattern for managing Trades, Skills, Leave types, or Document types.

### Screen-specific visual reference

Use CEO shell. Header: Trades, 6 active, Add trade. Add search and status filter Active | Inactive | All. Compact rows: Electrician · Active; Network Technician · Active; Plumber · Active; Splicer · Active. Each row has name, state, and three-dot overflow with Rename and Deactivate. Show one inactive row lower in the list. An Add trade action opens a sheet but no sheet is open here.

### Visible content and wording

Use the same visual pattern for all company categories.

### Required state

Active category list.

### Screen-specific exclusions

No always-editable text input in every row, no permanent Rename and Deactivate buttons, no huge add form above the list.

---

## M-C14 — CEO Foreman account management

**Target file:** `mobile/ceo/C14-users-settings.png`  
**Purpose:** Show account creation and management as separate focused actions.

### Screen-specific visual reference

Use CEO shell. Header: Users and Foremen, 4 accounts, Create Foreman. Compact account rows: Rashid Ahmed · @rashid · Active · SAFAR; foreman · @foreman · Active · No current project; Saqib Ali · @saqib · Inactive · Previous SAFAR. Each row shows project assignment, status chip, and overflow menu. Overflow actions are Change password, Deactivate/Reactivate, and View assignment history. No creation form is permanently visible.

### Visible content and wording

The primary Create Foreman action is clear and opens a full-height sheet.

### Required state

Mixed active/inactive accounts.

### Screen-specific exclusions

No exposed initial passwords, no full-width Change Password button on every account, no account self-registration.

---

## M-C15 — CEO import workflow — upload step

**Target file:** `mobile/ceo/C15-import-step.png`  
**Purpose:** Show a guided fixed-template import process with one step visible at a time.

### Screen-specific visual reference

Use CEO shell. Page title Import center. Four-step progress indicator: 1 Prepare complete, 2 Upload active, 3 Validate, 4 Commit. Main focused panel heading Upload workbook. Show a compact reminder: Use the approved five-sheet template. File picker row for Workbook (.xlsx) with selected file SAFAR-migration.xlsx and Replace action. Second file picker for Matching documents with 12 files selected and Manage action. Small note explains exact filenames. Sticky bottom action Preview import. A Reconciliation history text link appears in the page action area, not as a huge section below.

### Visible content and wording

The screenshot should make the next action obvious and avoid showing all process instructions at once.

### Required state

Valid files selected, ready to preview.

### Screen-specific exclusions

No three giant process cards, no large representative-workbook warning banner, no browser-default file input presentation.

---

## M-C16 — CEO audit log

**Target file:** `mobile/ceo/C16-audit.png`  
**Purpose:** Show an efficient investigative audit list with details deferred to a sheet.

### Screen-specific visual reference

Use CEO shell. Page bar: Audit log. Sticky toolbar has Search activity and Filters. Compact metadata line: 395 activities · showing 1–20. Each contained row shows timestamp, action title, concise actor/subject line, module chip, and chevron. Example: 30 Jul 2026, 08:15 · Foreman assigned · saqib assigned Rashid Ahmed to SAFAR · Foreman assignments. Next: Payroll recalculated · foreman · Payroll & payments. Next: Worker rate changed · CEO · Workers. Show pagination footer Page 1 of 20 and Next.

### Visible content and wording

Details are not expanded inline; selecting a row opens the audit detail sheet.

### Required state

Default audit results.

### Screen-specific exclusions

No 50 giant expanded entries, no repeated View Change Details rows, no technical references in the main list.

---

## M-S01 — Standard mobile filter sheet

**Target file:** `mobile/shared/S01-filter-sheet.png`  
**Purpose:** Define the shared pattern used by Workers, Attendance, Leave, Reports, and Audit.

### Screen-specific visual reference

Show a dimmed application background with a bottom sheet occupying about 75–85% of the viewport. Header: Filter records, one-line description, close button. Inside use stacked labelled controls with 48 px height: searchable Project combobox, searchable Worker combobox, Status choice, optional date range. Show selected values SAFAR and Active. At the bottom use a sticky action bar with large violet Apply filters and secondary Clear. The sheet supports scrolling while the action bar remains visible.

### Visible content and wording

Include an active-filter count badge on the obscured trigger in the background if visible.

### Required state

Two active filters ready to apply.

### Screen-specific exclusions

No browser-native dark select popup, no tiny controls, no filters hidden behind horizontal scrolling.

---

## M-S02 — Attendance correction sheet

**Target file:** `mobile/shared/S02-attendance-correction.png`  
**Purpose:** Define the focused audited correction experience for CEO or Foreman history.

### Screen-specific visual reference

Show a full-height mobile sheet over Attendance history. Header: Correct Ahmed, Permanent audited correction, close button. First show a concise session timeline card: Session 1, Enter 09:00, Exit 17:00, Break 13:00–13:30, Payable 7h 30m. Beneath it show editable date/time controls grouped by session, a compact Add break action, Remove session in destructive text style, and Reason for correction textarea with realistic text “Exit time corrected from site register”. Sticky bottom actions Cancel and Save correction. Use Malaysia-time context in small helper text.

### Visible content and wording

Keep the session summary visible before the form becomes detailed.

### Required state

Editing one complete session.

### Screen-specific exclusions

No guessed times, no save without reason, no giant 3D modal, no hidden sticky actions.

---

## M-S03 — Offline and pending attendance state

**Target file:** `mobile/shared/S03-offline-pending.png`  
**Purpose:** Show safe, understandable offline behavior without making the whole application look broken.

### Screen-specific visual reference

Use Foreman Today shell. Place a compact amber banner below the page bar: Offline — working from saved SAFAR data. Changes will sync when connected. Worker rows remain fully usable. Ahmed row shows Not entered and Enter. Muhammad Abbas row shows On site with a small amber Saved on device marker. Imran Khan row shows one failed action with red Needs attention and Retry. A small sync-center trigger shows 2 pending · 1 needs attention. Bottom navigation remains available.

### Visible content and wording

The design communicates that local data and queued changes are safe.

### Required state

Offline with two queued actions and one failed action.

### Screen-specific exclusions

Do not show a dead-end offline page, do not claim pending actions are synchronized, do not hide the worker list.

---

# Part B — Mandatory Desktop References

## D-F01 — Foreman Today — desktop/tablet

**Target file:** `desktop/foreman/F01-today.png`  
**Purpose:** Adapt live attendance operations to a larger screen without turning it into a decorative dashboard.

### Screen-specific visual reference

Use Foreman desktop shell. Main page header shows Today, Thu 30 Jul 2026, Normal day, and exception count. One compact toolbar combines search, visible status filters, and More filters. Use a dense table or structured list with columns Worker, Trade/skill, Current status, Latest time, Sync, Action. Show 12 representative rows with fixed header. Context-aware actions are Enter, Start break, End break, or Exit. Issue rows are sorted first and use Fix. Selecting a worker can open a narrow right-side session detail panel. Keep a compact summary strip above the table.

### Visible content and wording

The screen should look fast for supervisors using a tablet or laptop.

### Required state

Mixed live states with one issue.

### Screen-specific exclusions

No card grid, no giant metrics, no bulk attendance controls.

---

## D-F02 — Foreman attendance history — desktop

**Target file:** `desktop/foreman/F02-attendance.png`  
**Purpose:** Show historical attendance review with a persistent detail panel.

### Screen-specific visual reference

Use Foreman desktop shell. Header Attendance history. Inline date navigator and search/filter toolbar. Main table columns Worker, Sessions, Breaks, Payable time, State, Sync, Action. Select Imran Khan’s incomplete row; on the right show a detail panel with session timeline, missing-exit warning, payable time 0, audit context, and Correct attendance button. Table remains visible behind the detail panel.

### Visible content and wording

Clearly separate review from live Today operations.

### Required state

One selected incomplete record.

### Screen-specific exclusions

No Enter/Exit live actions, no mobile-card grid.

---

## D-C01 — CEO dashboard — desktop

**Target file:** `desktop/ceo/C01-dashboard.png`  
**Purpose:** Show an exception-first company overview optimized for operational review.

### Screen-specific visual reference

Use CEO desktop shell. Compact KPI row for Active projects 4, Active workers 412, Foremen 4, Actions required 12. Main left area is a wide Action required queue grouped by Blocking, Needs review, Upcoming, with columns Priority, Item, Context, Owner/area, Action. Right column contains Current payroll status, document alerts, and recent activity in compact panels. Use no chart unless a tiny progress indicator is operationally meaningful.

### Visible content and wording

The action queue is the dominant element.

### Required state

Mixed priorities with one payroll blocker.

### Screen-specific exclusions

No promotional quick-access card, no decorative analytics dashboard.

---

## D-C02 — CEO projects — desktop table

**Target file:** `desktop/ceo/C02-projects.png`  
**Purpose:** Show scalable project management with a table and optional preview.

### Screen-specific visual reference

Use CEO desktop shell. Page title Projects, New project action. Toolbar with search, Status, Foreman, Location, Date filters. Main sticky-header table columns Project, Client, Location, Status, Foreman, Workers, Exceptions, Dates. Select SAFAR; a narrow right preview panel shows key details, current Foreman, worker count, and quick links to Workforce and Attendance. Pagination at bottom.

### Visible content and wording

Use compact row density and semantic exception counts.

### Required state

Active-project filter with SAFAR selected.

### Screen-specific exclusions

No grid of oversized cards, no budget/expense columns.

---

## D-C03 — CEO project detail — desktop

**Target file:** `desktop/ceo/C03-project-detail.png`  
**Purpose:** Show a focused tabbed project workspace.

### Screen-specific visual reference

Use CEO desktop shell. Project summary header: SAFAR, Active, Microsoft, Cyberjaya, Rashid Ahmed, Edit and overflow actions. Horizontal tabs Overview, Workforce, Attendance, Leave, History, with Workforce selected. Main area contains search/filter toolbar and worker table. Right or top summary shows 126 active workers and 2 awaiting transfer. Only selected tab content is rendered.

### Visible content and wording

The page should feel like one project workspace, not a long document.

### Required state

Workforce tab selected.

### Screen-specific exclusions

No all-sections-at-once layout, no budget or billing modules.

---

## D-C04 — CEO workers — desktop table

**Target file:** `desktop/ceo/C04-workers.png`  
**Purpose:** Show a dense, bounded company worker directory.

### Screen-specific visual reference

Use CEO desktop shell. Page title Workers, Add worker. Toolbar with search, project, trade, skill, employment status, document status, and Columns control. Sticky table columns Worker, Project, Trade, Skill, Status, Document state, Identifier, Actions. Show 10–12 rows and pagination 1–25 of 412. Select Ahmed; optional right preview panel shows photo, contact, assignment, rate, deduction, and alerts.

### Visible content and wording

Use compact typography and clear column alignment.

### Required state

Company-wide list with one selected worker.

### Screen-specific exclusions

No mobile cards, no unbounded results, no full identifiers.

---

## D-C05 — CEO worker detail — desktop

**Target file:** `desktop/ceo/C05-worker-detail.png`  
**Purpose:** Show a worker profile with focused tabs and management actions in drawers/dialogs.

### Screen-specific visual reference

Use CEO desktop shell. Left summary panel shows Ahmed, photo/initials, Active, SAFAR, Electrician · Helper, work-permit warning, current rate, food deduction, Edit. Right content area has tabs Overview, Employment, Assignments, Rates, Documents, Attendance, Leave, Payroll, Audit. Overview selected, using a two-column definition layout and recent activity. No other tab content is rendered below.

### Visible content and wording

The screen should remain compact and professional at 1440×900.

### Required state

Overview selected.

### Screen-specific exclusions

No huge uppercase name, no continuous nine-section page, no permanent forms for every management action.

---

## D-C06 — CEO attendance oversight — desktop

**Target file:** `desktop/ceo/C06-attendance.png`  
**Purpose:** Show daily attendance review with correction in a side drawer.

### Screen-specific visual reference

Use CEO desktop shell. Header Attendance. One toolbar contains Project SAFAR, Thu 30 Jul 2026, Daily/Monthly mode, search, status filters. A compact banner shows 3 synchronized actions need review. Main table columns Worker, Sessions, Breaks, Payable time, State, Sync, Issues, Action. Select Imran Khan’s missing-exit row; right drawer shows session timeline, issue reason, payroll impact, audit note, and Correct attendance action.

### Visible content and wording

Exceptions appear first, routine rows remain quiet.

### Required state

Daily view with selected issue.

### Screen-specific exclusions

No nested giant selector cards, no live attendance buttons.

---

## D-C07 — CEO leave review — desktop split view

**Target file:** `desktop/ceo/C07-leave.png`  
**Purpose:** Show efficient pending leave decisions with list and detail visible together.

### Screen-specific visual reference

Use CEO desktop shell. Header Leave review. Tabs Pending 3, Approved 18, Rejected 2, All. Inline filters. Left table columns Worker, Project, Type, Dates, Conflict, Submitted, Status. Select Muhammad Abbas with an attendance conflict. Right detail panel shows reason, notes, evidence, attendance conflict details, audit context, and sticky Reject plus disabled Approve with explicit conflict explanation.

### Visible content and wording

Pending is the default and review actions stay visible.

### Required state

Conflict selected.

### Screen-specific exclusions

No large request cards, no approved history dominating the initial view.

---

## D-C08 — CEO payroll run — desktop

**Target file:** `desktop/ceo/C08-payroll.png`  
**Purpose:** Show one monthly run with exceptions and worker calculations at scale.

### Screen-specific visual reference

Use CEO desktop shell. Sticky run header: July 2026, Draft, Recalculate, Approve run disabled due to 1 blocker. Tabs Exceptions 1, Workers 412, Summary, Payments, with Workers selected or Exceptions selected if emphasizing blocker. Main table columns Worker, Project, Payable time, Gross, Deductions, Adjustments, Net, Exception, Payment. Selecting Ahmed opens a right calculation panel with earning buckets, rate periods, food deduction, adjustments, attendance source dates, payment status, and statement action.

### Visible content and wording

Use dense tables and a persistent detail panel.

### Required state

Draft run with one blocking exception and selected worker.

### Screen-specific exclusions

No grid of worker cards, no giant metric tiles, no payment before approval.

---

## D-C09 — CEO reports — desktop

**Target file:** `desktop/ceo/C09-reports.png`  
**Purpose:** Show a predefined report workspace built around a sticky data table.

### Screen-specific visual reference

Use CEO desktop shell. Page title Reports. Single toolbar with report selector Current workforce and assignments, search, Project SAFAR, Status Active, Columns, Export. Result count 126 rows. Sticky table columns Worker, Phone, Employment status, Project, Trade, Skill, Document status. Show 12 rows with pagination. Selecting a row may open a detail drawer.

### Visible content and wording

Export is secondary and neutral.

### Required state

Filtered workforce report.

### Screen-specific exclusions

No card-per-record layout, no orange primary export button, no Import center shortcut.

---

## D-C10 — CEO settings — desktop

**Target file:** `desktop/ceo/C10-settings.png`  
**Purpose:** Show settings as persistent navigation plus one selected focused panel.

### Screen-specific visual reference

Use CEO desktop shell. Within the page, add a secondary left settings navigation listing Users and Foremen, Trades, Skill levels, Document types, Leave types, Import template, Company identity. Select Trades. Main panel contains title Trades, item count, search/status filters, Add trade button, and compact table of names, states, updated dates, and actions. A small help panel explains deactivation preserves history.

### Visible content and wording

Only the selected settings module is mounted and visible.

### Required state

Trades selected.

### Screen-specific exclusions

No monolithic page containing every form and category, no always-editable inputs.

---

## D-C11 — CEO import center — desktop

**Target file:** `desktop/ceo/C11-import.png`  
**Purpose:** Show the fixed-template migration workflow with validation-focused layout.

### Screen-specific visual reference

Use CEO desktop shell. Page title Import center. Left vertical stepper: Prepare complete, Upload complete, Validate active, Commit. Main panel shows validation summary: 482 accepted, 14 rejected, 6 warnings. Rejected rows table columns Sheet, Row, Field, Submitted value, Correction required. Right panel shows workbook name, matching document count, duplicate protection, and Commit unavailable until errors resolved. Top actions include Download template and Reconciliation history.

### Visible content and wording

The active step is Validate; show actionable row-level errors.

### Required state

Preview with rejected rows.

### Screen-specific exclusions

No long process-card page, no commit while rejected rows remain.

---

## D-C12 — CEO audit log — desktop

**Target file:** `desktop/ceo/C12-audit.png`  
**Purpose:** Show a searchable audit investigation workspace with table/timeline and detail panel.

### Screen-specific visual reference

Use CEO desktop shell. Page title Audit log. Toolbar with search, actor, area, source, date range. Results table/timeline columns Time, Action, Actor, Area, Subject, Source. Show 12 rows and pagination. Select Foreman assignment ended. Right detail panel displays human-readable description, previous and new values, affected project, actor, source Made in the app, and collapsed Technical reference section.

### Visible content and wording

Keep before/after values easy to compare.

### Required state

One selected audit event.

### Screen-specific exclusions

No 50 vertically expanded cards, no technical IDs in the main table.

---

# Part C — Supplementary Route and State References

These references cover important routes and states omitted from the mandatory 40-image manifest. Generate them after the mandatory set when full product coverage is required.

## M-X01 — Mobile sign-in

**Target file:** `mobile/shared/X01-sign-in.png`  
**Purpose:** Show a simple secure entry point consistent with the product shell.

### Screen-specific visual reference

Light neutral background, centered compact Worksite Ops brand mark, title Sign in, one-line explanation for CEO and Foreman access, Clerk-style username/email and password fields, violet Sign in button, forgot-password link, and no self-registration option. Keep the form within a compact white panel and show no company data.

### Visible content and wording

Use realistic labels and focus state on the username field.

### Required state

Default sign-in.

### Screen-specific exclusions

No Sign up link, no social-login clutter unless already configured, no marketing hero.

---

## M-X02 — Unmapped account state

**Target file:** `mobile/shared/X02-access-unmapped.png`  
**Purpose:** Explain that authentication succeeded but the account is not mapped to a company role.

### Screen-specific visual reference

Use compact brand header and centered state panel with shield/user icon, title Access not configured, concise text asking the user to contact the CEO, signed-in identity summary, Sign out button, and Retry access check secondary action.

### Visible content and wording

No operational navigation is visible.

### Required state

Authenticated but unmapped.

### Screen-specific exclusions

No project or worker data, no role-selection control.

---

## M-X03 — Inactive account state

**Target file:** `mobile/shared/X03-access-inactive.png`  
**Purpose:** Explain a deactivated Foreman/CEO account safely.

### Screen-specific visual reference

Centered state panel with title Account inactive, concise explanation that access was disabled by the company, signed-in username, Sign out primary action, and Contact company administrator helper text.

### Visible content and wording

Use red/amber semantic icon without alarming full-screen red.

### Required state

Inactive account.

### Screen-specific exclusions

No reactivation button for the user, no operational data.

---

## M-X04 — Offline fallback route

**Target file:** `mobile/shared/X04-offline-fallback.png`  
**Purpose:** Show what remains possible when the app opens without a usable cached operational screen.

### Screen-specific visual reference

Compact Worksite Ops header. State panel: You are offline. Explain that saved Foreman attendance is available from Today when previously synchronized; otherwise reconnect to load company data. Buttons: Open saved attendance if available, Retry connection. Include a small list of what remains safe on device.

### Visible content and wording

Use calm amber/neutral styling.

### Required state

Offline with no current route data.

### Screen-specific exclusions

No dead-end error, no claim that all modules work offline.

---

## M-X05 — Mobile route loading

**Target file:** `mobile/shared/X05-loading.png`  
**Purpose:** Define a realistic skeleton matching the final layouts.

### Screen-specific visual reference

Stable app shell and bottom navigation remain visible. Compact page title skeleton, toolbar skeleton, then six contained row skeletons matching 72 px records. Use soft neutral shimmer or static skeleton blocks, no large blank card.

### Visible content and wording

No content jump.

### Required state

Loading worker list.

### Screen-specific exclusions

No generic full-page spinner, no giant hero skeleton.

---

## M-X06 — Mobile recoverable error

**Target file:** `mobile/shared/X06-error.png`  
**Purpose:** Show a clear recoverable route error without losing trust.

### Screen-specific visual reference

Stable app shell. Compact error panel with alert icon, title This page could not be loaded, one sentence explaining saved changes remain safe where applicable, Retry primary button, Go home secondary button, and a collapsed Technical details link for support.

### Visible content and wording

Keep message non-technical.

### Required state

Recoverable data-loading failure.

### Screen-specific exclusions

No raw stack trace, no provider names, no destructive reload warning.

---

## M-C17 — Mobile project create/edit form

**Target file:** `mobile/ceo/C17-project-form.png`  
**Purpose:** Show a focused lean project form.

### Screen-specific visual reference

CEO shell. Header New project or Edit SAFAR. Group fields into Project identity, Location and dates, Foreman assignment, Notes. Inputs: Name, Client, Contractor optional, City, Country, Start date, End date, Status, searchable Foreman, Notes. Sticky bottom Save project action. Use a single-column form with short sections.

### Visible content and wording

Use only lean confirmed fields.

### Required state

New project form.

### Screen-specific exclusions

No budget, detailed contract, expenses, billing, or complex wizard unless needed.

---

## M-C18 — Mobile payroll statement

**Target file:** `mobile/ceo/C18-payroll-statement.png`  
**Purpose:** Show a readable worker payment statement/voucher.

### Screen-specific visual reference

Document-style screen with worker Ahmed, July 2026, Approved or Paid status, project SAFAR, normal/overtime/Sunday/public-holiday earning rows, adjustments, food deduction, net pay, payment method/reference, and Download/Print actions. Keep application actions outside the printable statement area.

### Visible content and wording

Use tabular numerals and clear totals.

### Required state

Approved paid statement.

### Screen-specific exclusions

No editable amounts, no partial-payment controls.

---

## M-C19 — Mobile company identity settings

**Target file:** `mobile/ceo/C19-company-identity.png`  
**Purpose:** Show a focused company configuration form.

### Screen-specific visual reference

CEO shell. Header Company identity. Compact fixed-values definition list for Currency MYR and Timezone Asia/Kuala_Lumpur. Fields Legal name Ops Con and Display name Worksite Ops. Sticky Save company settings action.

### Visible content and wording

Simple, centered, no unrelated settings.

### Required state

Editable identity form.

### Screen-specific exclusions

No currency/timezone editing if fixed, no giant identity card.

---

## M-C20 — Mobile import template settings

**Target file:** `mobile/ceo/C20-import-template.png`  
**Purpose:** Show the approved workbook download page.

### Screen-specific visual reference

CEO shell. Header Import template. Show template version, five included sheets, short preparation rules, last updated date, and primary Download template action. Include a link Open Import center. Use a compact information layout.

### Visible content and wording

Explain that import execution occurs in Import center.

### Required state

Template available.

### Screen-specific exclusions

No upload controls on this settings page, no giant instructional prose.

---

## D-X01 — Desktop sign-in

**Target file:** `desktop/shared/X01-sign-in.png`  
**Purpose:** Show a restrained desktop authentication page.

### Screen-specific visual reference

Centered sign-in panel on light background with Worksite Ops brand, title Sign in, identity/password fields, violet action, and a small side note “CEO and Foreman accounts only”. No full application sidebar before authentication.

### Visible content and wording

Approximate panel width 420–480 px.

### Required state

Default sign-in.

### Screen-specific exclusions

No self-registration, no marketing illustration.

---

## D-X02 — Desktop access restriction state

**Target file:** `desktop/shared/X02-access-state.png`  
**Purpose:** Show unmapped or inactive access cleanly.

### Screen-specific visual reference

Centered compact status panel with clear title, account identity, explanation, sign-out action, and retry/contact guidance. No company navigation or operational data.

### Visible content and wording

Use neutral professional styling.

### Required state

Unmapped account.

### Screen-specific exclusions

No role selector or unauthorized data.

---

## D-C13 — Desktop project form

**Target file:** `desktop/ceo/C13-project-form.png`  
**Purpose:** Show lean project creation/editing at a readable width.

### Screen-specific visual reference

CEO desktop shell. Page title New project. Centered form panel maximum width about 900 px, two-column layout for location and dates, searchable Foreman field, notes full width, Save and Cancel actions. Optional right summary only if it helps review.

### Visible content and wording

Use confirmed project fields only.

### Required state

New project.

### Screen-specific exclusions

No budget, contracts, expenses, billing.

---

## D-C14 — Desktop worker guided form

**Target file:** `desktop/ceo/C14-worker-form.png`  
**Purpose:** Show the same guided worker workflow adapted to desktop.

### Screen-specific visual reference

CEO desktop shell. Left vertical step navigation Identity, Employment, Assignment, Pay, Documents, Review. Main form panel shows Identity fields in two columns. Right side contains a compact completion/duplicate-check summary. Bottom actions Back, Continue, Save when appropriate.

### Visible content and wording

Preserve entered data and show current step clearly.

### Required state

Identity step.

### Screen-specific exclusions

No one-page mega-form.

---

## D-C15 — Desktop payroll statement

**Target file:** `desktop/ceo/C15-payroll-statement.png`  
**Purpose:** Show a print-ready statement with actions outside the document.

### Screen-specific visual reference

CEO desktop shell with a neutral toolbar containing Back, Download PDF/Print. Center an A4-like white statement preview with worker identity, month, earning buckets, deductions, adjustments, net pay, approval/payment information, and company identity.

### Visible content and wording

Use precise tabular alignment and generous print margins.

### Required state

Paid statement.

### Screen-specific exclusions

No sidebar inside print area, no editable values.

---

## D-C16 — Desktop category management

**Target file:** `desktop/ceo/C16-category-settings.png`  
**Purpose:** Show reusable category CRUD with compact table.

### Screen-specific visual reference

CEO desktop shell and settings secondary navigation. Main panel title Document types or Trades, search/status filters, Add action, table with Name, configuration summary, State, Updated, Actions. Add/edit opens side drawer. Deactivate confirmation explains history preservation.

### Visible content and wording

Use compact rows and clear actions.

### Required state

Active category list.

### Screen-specific exclusions

No permanently editable inputs per row.

---

# Part D — Batch generation order

Generate images in the following order so visual consistency can be corrected early rather than after the entire package is complete.

## Batch 1 — Core mobile operating language

1. `M-F01` Foreman Today
2. `M-F02` Foreman Attendance history
3. `M-C01` CEO Dashboard
4. `M-C07` CEO Attendance
5. `M-S01` Filter sheet
6. `M-S02` Attendance correction
7. `M-S03` Offline/pending

Validate shell, density, typography, color semantics, safe areas, bottom navigation, and row patterns before generating later screens.

## Batch 2 — Mobile workforce and project management

1. `M-F03`
2. `M-F04`
3. `M-C02`
4. `M-C03`
5. `M-C04`
6. `M-C05`
7. `M-C06`

## Batch 3 — Mobile leave, payroll, reports, and administration

1. `M-F05`
2. `M-F06`
3. `M-F07`
4. `M-C08`
5. `M-C09`
6. `M-C10`
7. `M-C11`
8. `M-C12`
9. `M-C13`
10. `M-C14`
11. `M-C15`
12. `M-C16`

## Batch 4 — Desktop operating language

1. `D-F01`
2. `D-F02`
3. `D-C01`
4. `D-C02`
5. `D-C04`
6. `D-C06`
7. `D-C08`

Validate sidebar, table density, toolbars, split panes, and right drawers before generating remaining desktop screens.

## Batch 5 — Remaining desktop and supplementary screens

Generate the remaining mandatory desktop screens, then the supplementary access, form, statement, and state references.

---

# Part E — Visual acceptance rules for generated images

A reference image is accepted only when all applicable conditions are true:

- the screen’s primary task is visible without excessive introductory space;
- the app shell matches the same role and viewport across images;
- all visible labels are spelled correctly and use sentence case;
- sample data remains consistent across related screens;
- status colors are semantically consistent;
- no private full identity number or secret is visible;
- no invented product behavior appears;
- routine data is quiet and exceptions are more prominent;
- mobile lists demonstrate scalable density;
- desktop collections use tables or split views where appropriate;
- fixed navigation does not cover content;
- the design looks realistically implementable with the existing web stack;
- the reference does not silently redesign business logic, authorization, synchronization, payroll, or data relationships.

---

# Part F — File naming and review notes

Each generated image should be saved using the exact filename listed in its reference. Add a matching entry to `docs/design-references/v2/manifest.md` containing:

- reference ID;
- filename;
- generation date;
- generation model/tool;
- source prompt version;
- accepted or rejected status;
- short review notes;
- known differences from this descriptive reference.

Do not replace an accepted reference without preserving the previous version or recording why it was superseded.
