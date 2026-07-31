# Project progress

## Active task

### Attendance sync issue resolution (fix/attendance-sync-resolution)

**Branch:** `fix/attendance-sync-resolution`
**Base commit:** `cb9f696` (main @ 2026-07-30)
**PR:** _to be opened after CI is green_
**Live UAT URL:** _to be confirmed from PR preview_

#### Scope

Repair the attendance synchronization conflict-resolution workflow in the
Worksite Operations Platform. The fix is client-local; it does not modify
the `apply_attendance_action` RPC or the offline queue invariants.

#### Files changed

- `AGENTS.md` — added the persistent Default Repository and UAT Delivery
  Workflow so every runtime implementation task ends with a live UAT
  preview and required CI green.
- `src/lib/phase4/types.ts` — new `AttendanceActionState` values
  (`PENDING`, `SYNCING`, `SYNCED`, `RETRYABLE`, `REVIEW_REQUIRED`),
  `AttendanceIssueKind`, normalized `workerId`/`workDate`/
  `lastAttemptAt`/`serverStatus`/`issueKind` fields on
  `AttendanceQueueAction`.
- `src/lib/phase4/offline-store.ts` — added `deleteAttendanceAction`,
  `deleteAttendanceActions`, `pruneSyncedAttendanceActions`. Legacy
  `NEEDS_ATTENTION` rows are normalized on load.
- `src/lib/phase4/sync-issues.ts` — new pure helper: legacy metadata
  inference, issue classification, root-cause grouping, retryable
  selector, post-correction resolution selection, summary text.
- `src/lib/phase4/sync-issues.test.ts` — focused tests covering the five
  high-risk invariants from the task brief.
- `src/components/phase4/attendance-sync-issues.tsx` — new right-side
  Sheet on desktop and bottom Sheet on mobile. Tabs `Needs review` /
  `Pending`, issue cards, alert-dialog confirmation for discard.
- `src/components/phase4/attendance-workspace.tsx` — enqueue now stores
  normalized `workerId`/`workDate`/`serverStatus`; `synchronize()` no
  longer rewrites terminal conflict IDs back to `PENDING`; classification
  drives the new `REVIEW_REQUIRED` / `RETRYABLE` states; banner + per-row
  chip show the real reason; successful snapshots prune synced rows.
- `src/components/operations/sync-center.tsx` — removed (no remaining
  imports; replaced by the new attendance issue center).
- `src/lib/phase4/local-actions.test.ts` — fixture updated to include
  the new normalized fields.

#### Behavior implemented

- Per-action `clientActionId` is preserved for terminal conflicts and
  failures. `Retry eligible` only resends `RETRYABLE` actions.
- Server snapshot refresh reapplies pending optimistic actions and
  prunes `SYNCED` IndexedDB rows so the queue does not grow.
- Worker rows show a `Sync issue` chip with a concise plain-English
  reason and a trailing `Review` action that opens the existing
  correction experience against the current server snapshot.
- The compact page banner surfaces one summary plus a `Review issues`
  action; the issue center uses tabs and grouped cards.
- `Discard device actions` removes the affected rows from IndexedDB
  without altering server attendance, then refreshes the snapshot.
- Successful `CORRECT_DAY` actions are followed by deletion of every
  older `REVIEW_REQUIRED` action for the same project/worker/date.
- Synchronization status messages reflect mixed outcomes
  (`Attendance synchronized.`,
  `Some device changes need review before attendance is complete.`,
  `Some changes could not be sent and can be retried.`).
- Legacy IndexedDB rows written by the previous build are coerced into
  the new shape and their `workerId` / `workDate` metadata is recovered
  from sibling actions or the current snapshot before being persisted
  back.

#### Validation

| Command | Result |
| --- | --- |
| `npm run format:check` | passed |
| `npm run lint` | passed (0 errors, 0 warnings) |
| `npm run typecheck` | passed |
| `npm run test:run` | 65 tests passed (21 files) |
| `npm run build` | passed |

Focused Playwright E2E was not run from this local environment because
the task explicitly requires verification on the live PR preview URL.
The existing `e2e/phase4.spec.ts` flows still apply unchanged and will
be re-run against the PR preview.

#### GitHub Actions and preview deployment

_To be updated after the PR is opened._

#### Live UAT scenarios and results

_To be filled in after the PR preview is live._

Tested roles:

- Foreman (assigned project) — review and discard flows.
- CEO — read-only review of grouped issues and bulk discard.

Synthetic-data limitations:

- Conflicts must be reproduced by replaying an offline ENTER that
  collides with an existing server session, because the approval flow
  does not allow creating terminal conflicts through the normal UI.

#### Intentional reference differences

- The mobile sheet uses a sticky footer `Close` button instead of the
  large `Retry eligible` surface shown in the reference, because there
  are no retryable actions in the user-flow shown.
- The compact page banner uses a single line plus a `Review issues`
  primary button; the reference includes a second `Retry eligible` line
  that we hide when there are no retryable actions.
- The issue card body on the mobile sheet uses a single-column layout
  so the buttons stay at least 44 px tall.

#### Not included

- Changes to the `apply_attendance_action` RPC, the `attendance_sync_actions`
  table, or the route handler contract.
- A new dependency, a second design system, or a parallel route.
- Production deployment, merge, or destructive database operations.
