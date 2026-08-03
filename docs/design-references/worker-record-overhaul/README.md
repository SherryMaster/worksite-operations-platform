# Worker Record Overhaul — UI Reference Pack

These references define the intended create, edit, and worker-detail direction for the Worksite Operations Platform. They are implementation references, not pixel-perfect screenshots. Preserve the existing Worksite visual language and business permissions while matching the information architecture and responsive behavior shown here.

## Required flow

1. **Personal** — full name, phone number, nationality, optional address only.
2. **Work & pay** — hourly pay rate, trade, skill level, monthly food deduction only.
3. **Documents** — CNIC, Passport, Work Permit, and additional configured document types. Metadata must be savable without a file. At least one of CNIC or Passport is required.
4. **Photo** — optional worker photo with preview and replacement/removal behavior.
5. **Review** — nothing is submitted merely by entering this step. The user reviews grouped details, returns to any section through Edit actions, and explicitly creates or saves the worker.

## Responsive rules

- Desktop uses a compact horizontal progress header and bounded content width.
- Mobile uses numbered progress dots, one focused section, a sticky action bar above the bottom navigation, safe-area spacing, and no horizontally scrolling step labels.
- The worker detail page uses normal desktop tabs but a mobile section picker/bottom sheet. Never require the user to drag a horizontal scrollbar to find a worker section.
- Attendance, leave, payroll, and audit sections render worker-scoped content inside the worker profile rather than acting as redirects to other modules.
- Rigid page chrome renders immediately; only the changing data region uses skeleton loading.

## Files

- `00-concept-board.png` — generated overview board for the whole direction.
- `01-create-personal-desktop.*` — first induction step.
- `02-create-documents-desktop.*` — document section model and optional-file behavior.
- `03-create-review-desktop.*` — explicit final review and save.
- `04-create-flow-mobile.*` — all five mobile induction states.
- `05-edit-review-desktop.*` and `06-edit-review-mobile.*` — edit review with before/after changes and effective-rate date.
- `07-worker-overview-desktop.*` — compact overview information architecture.
- `08-worker-documents-desktop.*` — document rows and actions.
- `09-worker-overview-mobile.*`, `10-worker-documents-mobile.*`, `11-worker-attendance-mobile.*` — focused mobile sections.
- `12-mobile-section-picker.*` — replacement for horizontally scrolling worker tabs.

Each `.svg` is the authoritative layout reference; the matching `.png` is provided for convenient visual inspection.
