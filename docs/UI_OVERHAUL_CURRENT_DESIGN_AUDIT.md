# Current UI/UX Defects to Correct

This audit is included because the implementation agent may not receive the current-system screenshots. It describes the recurring problems that must be corrected during the overhaul.

The generated reference images are directional rather than pixel-perfect. Their accidental defects—such as slightly off-center text, malformed generated icons, impossible select controls, inconsistent sample counts, or awkward spacing—must not be copied.

## 1. Global interface problems

- The interface still partly resembles a marketing, editorial, or article-style product instead of a high-frequency workforce operations application.
- Too much vertical space is consumed before the first useful task, exception, or record appears.
- Page titles, descriptions, summaries, cards, and outer margins are frequently oversized on phones.
- Small pieces of information are placed in separate bordered cards when a compact row, definition list, or summary strip would be more efficient.
- Routine data receives nearly the same visual emphasis as blockers, warnings, and exceptions.
- The violet brand direction is not consistently used as a restrained operational accent.
- Component density, spacing, corner radii, border treatment, typography, icon sizing, and control heights vary between routes.
- Some controls use the design system while others resemble default browser controls.
- Button labels, icons, and content are not always optically centered or aligned.
- Fixed navigation, sticky actions, safe-area padding, and mobile keyboard behavior need systematic verification.
- Several phone layouts feel like compressed desktop layouts rather than deliberate mobile workflows.
- Loading, empty, validation, permission, offline, synchronization, and recoverable-error states are inconsistent across routes.
- High-volume lists do not always communicate result count, active filters, bounded loading, or pagination clearly.

## 2. Navigation and application shells

- CEO mobile navigation does not sufficiently prioritize frequent operational tasks.
- Important CEO modules under More need a clear grouped information architecture.
- Page headers repeat role, project, or workspace context already present in the shell.
- Shell height combined with page-header height wastes too much of the first mobile viewport.
- Connection indicators are too prominent during normal online operation; they should appear mainly for offline, pending, synchronizing, failed, or conflicted states.
- Mobile, tablet, and desktop navigation do not always feel like adaptations of one coherent system.
- Selected-navigation treatment, labels, icon sizes, spacing, and safe-area behavior need consistency.
- Desktop navigation should use a persistent sidebar, tablet should use an appropriate rail, and mobile should use bottom navigation or focused sheets without duplicating all three at once.

## 3. Foreman Today

- Too much introductory, selector, and summary UI appears before the worker list.
- Too many summary cards reduce the density needed for field operations.
- Status filtering depends too heavily on horizontally scrolling chips that can hide important options.
- Repeated full-width actions make each worker record unnecessarily tall.
- Secondary actions such as correction and details are too visually prominent.
- Exception records are not consistently prioritized ahead of routine records.
- The Foreman should be able to identify a worker and perform the current action with one hand and minimal scrolling.
- Each worker should expose one context-aware primary action, with secondary actions in overflow or detail UI.
- Offline, saved-on-device, pending, failed, conflicted, and synchronized states must remain visibly distinct and truthful.
- The normal online state should be quiet.

## 4. Foreman Attendance history

- Historical attendance looks too similar to the live Today workflow.
- Historical records must not contain Enter, Exit, Start break, or End break actions.
- Session summaries, payable time, correction state, and synchronization state need a clearer structure.
- Corrections should open in a focused audited sheet instead of rendering large repeated controls inside every record.
- Date navigation, issue count, search, and filters should fit in one compact control region.
- Missing exits and other exceptions should be visually prioritized without turning every row into an alert card.

## 5. Workers and projects

- Worker and project cards are too large for datasets containing hundreds of records.
- Too much metadata is repeated in each record.
- Permanent row buttons should be replaced with clickable rows, chevrons, and overflow actions where appropriate.
- Search placeholders and filters do not always fit naturally on narrow phones.
- Filtering is fragmented across chips, selects, and buttons.
- Result counts, active filters, bounded pagination, and incremental loading need to be clearer.
- Full identity-document numbers must remain masked.
- Foreman worker details must not expose CEO-only rate, deduction, payroll, transfer, or administrative controls.
- Worker and project detail screens are too long and render too many sections simultaneously.
- Worker identity headers and page titles are disproportionately large.
- Create and edit forms display too many fields at once instead of using focused, guided sections.
- Desktop project and worker collections should use dense tables and optional detail panels rather than large card grids.

## 6. CEO dashboard

- Routine metrics dominate the first viewport.
- The dashboard does not sufficiently prioritize work requiring intervention.
- Quick-access cards duplicate application navigation.
- Payroll blockers, pending leave, expiring documents, missing Foreman assignments, synchronization issues, and unpaid payroll should appear before routine statistics.
- Decorative charts or promotional dashboard patterns should not replace an actionable queue.
- The dashboard must answer “What requires action now?” before “What are the totals?”

## 7. CEO attendance

- Project, date, mode, summaries, filters, and records are separated into too many containers.
- Selector and context information is repeated.
- Correction actions are repeated excessively.
- Synchronization problems need a distinct, compact treatment.
- CEO attendance must remain oversight and correction, not a copy of Foreman live attendance.
- Daily and monthly modes need a compact, consistent switch.
- Exception rows should appear first; routine rows should remain quiet.

## 8. Leave

- Leave creation and leave history are mixed too closely.
- Creation forms consume space even when the user is reviewing requests.
- Pending requests are not always the first and strongest CEO workflow.
- Approval and rejection should occur in a focused request-detail interface.
- Attendance conflicts require clearer warning treatment.
- Full-day unpaid leave rules must remain unchanged.
- No partial-day leave controls may be introduced.
- Foreman submission and CEO review must remain distinct.

## 9. Payroll

- Payroll months use tall cards with vertically repeated labels and poor comparative density.
- Payroll summaries can appear before blocking exceptions.
- Worker payroll records do not scale when represented as large cards.
- Approval state, payment state, exceptions, calculations, and corrective actions need clearer hierarchy.
- Payment controls must remain unavailable before approval.
- Worker calculation details should move into focused drawers or panels.
- Statements need a readable document-style layout with actions outside the printable area.
- Existing payroll snapshots, calculation rules, full-payment behavior, and audit trail must remain unchanged.

## 10. Reports

- Report records are too expanded on mobile.
- Export receives excessive visual emphasis.
- Import and report actions are mixed unnecessarily.
- Browsing and filtering results should be primary; export should be secondary.
- Desktop reports should use bounded tables.
- Mobile reports should use compact rows with additional fields in a sheet or detail view.
- Browser-native long selects should be replaced with consistent searchable filters where the existing stack already supports them.
- Result count, active filters, and pagination should remain visible.

## 11. Settings

- Settings is too monolithic.
- Multiple management sections, forms, and category lists appear on one continuous page.
- Creation forms remain visible when the user only needs to browse.
- Category rows expose permanent rename and deactivate buttons.
- Users and Foremen, Trades, Skill levels, Leave types, Document types, Import template, and Company identity need distinct focused modules.
- Account creation, password change, activation/deactivation, and assignment-history behavior must remain unchanged.
- Category deactivation must preserve historical records.

## 12. Imports

- The import workflow shows too much process explanation simultaneously.
- Preparation, upload, validation, commit, and reconciliation compete on one page.
- File inputs look too close to browser defaults.
- The next required action is not sufficiently obvious.
- The workflow should visibly progress through Prepare, Upload, Validate, and Commit without changing workbook structure or validation behavior.
- Validation errors need actionable row-level presentation.
- Commit must remain unavailable while blocking errors exist.

## 13. Audit

- Audit entries are too large and too expanded.
- Technical details appear too close to the primary activity description.
- Too few events fit in the initial viewport.
- Main rows should show human-readable descriptions.
- Full before/after values and technical identifiers should appear only in a detail sheet or panel.
- Search, actor, area/module, date, source, result count, and pagination controls need one consistent toolbar structure.
- Existing audit semantics and retained history must not change.

## 14. Shared application states

- Loading behavior is inconsistent and sometimes leaves large blank regions.
- Skeletons do not always match the final content structure.
- Empty datasets and empty filtered results are not always distinguished.
- Recoverable errors need clear retry actions.
- Permission, inactive-account, and unmapped-account states need focused explanations.
- Offline fallback must not become a dead-end.
- Pending synchronization must never be presented as completed synchronization.
- Failed queued actions must remain visible and recoverable.
- Long names, narrow screens, mobile keyboard visibility, focus return, safe areas, and reduced viewport height need explicit verification.
- Fixed bottom navigation and sticky action bars must never cover content.
- Button text, icons, badges, and field content must be correctly aligned even where generated references contain small defects.
