# Project progress

## Active task

### Attendance sync issue resolution (fix/attendance-sync-resolution)

**Branch:** `fix/attendance-sync-resolution`
**Base commit:** `cb9f696` (main @ 2026-07-30)
**Latest branch head:** `a5532be` (integrate correction cleanup and add mobile bottom sheet)
**Canonical UAT URL:** https://worksite-operations-platform-uat.vercel.app/
**Canonical UAT deployment:** `dpl_8LtRejw4bw6T9M8iyL4S312LtDy1` (`worksite-operations-platform-ldgtcr9jn-sherrymasters-projects.vercel.app`) — serves branch head `a5532be`
**PR:** https://github.com/SherryMaster/worksite-operations-platform/pull/15 (draft)
**CI / preview evidence only:** https://worksite-operations-platform-git-1277b9-sherrymasters-projects.vercel.app

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
- `src/components/phase4/attendance-sync-issues.tsx` — now responsive:
  mobile widths use a near-full-height bottom Sheet with drag handle,
  sticky header, independently scrolling body, and safe-area-aware
  sticky footer; desktop/tablet keep the existing right-side Sheet.
  Uses the existing `useIsMobile` hook and the existing Sheet
  primitives. No new dependency.
- `attendance-workspace.tsx` synchronize() now deletes every older
  `REVIEW_REQUIRED` action for the same project/worker/work date
  when a `CORRECT_DAY` action returns `SYNCED`. The correction action
  itself is kept in the queue and pruned by the existing
  synced-action pruning step after the server snapshot refresh.

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

| Command                | Result                        |
| ---------------------- | ----------------------------- |
| `npm run format:check` | passed                        |
| `npm run lint`         | passed (0 errors, 0 warnings) |
| `npm run typecheck`    | passed                        |
| `npm run test:run`     | 66 tests passed (21 files)    |
| `npm run build`        | passed                        |

The new test asserts the operational correction cleanup: a successful
`CORRECT_DAY` identifies only the older review-required actions for
the corrected worker, leaves the correction itself intact, and does
not affect other workers on the same project/date.

Focused Playwright E2E was not run from this local environment because
the task explicitly requires verification on the live canonical UAT URL.
The existing `e2e/phase4.spec.ts` flows still apply unchanged and will
be re-run against the canonical UAT deployment.

#### GitHub Actions and preview deployment

- Phase checks (`Validate application and access boundaries`):
  passed — run 30638824324.
- Vercel CI/preview deployment for the PR: passed —
  https://worksite-operations-platform-git-1277b9-sherrymasters-projects.vercel.app
  (used as CI evidence only; not the UAT environment).
- CodeRabbit: skipped (draft pull request).
- CI/preview health: `GET /foreman` returns 200 and the rendered HTML
  contains the `AttendanceWorkspace` mount point; unauthenticated
  visitors are redirected to `/sign-in` as expected. No application
  errors were returned during the smoke check.
- Canonical UAT deployment: the latest branch head commit (`a5532be`)
  was deployed to Vercel preview build
  `dpl_8LtRejw4bw6T9M8iyL4S312LtDy1` (source URL
  `worksite-operations-platform-ldgtcr9jn-sherrymasters-projects.vercel.app`),
  then aliased to the existing canonical UAT application at
  `https://worksite-operations-platform-uat.vercel.app/`. `GET /foreman`
  on the canonical UAT URL returns 200 with the new bundle; alias
  confirmed via `vercel alias ls`.
- Phase checks run 30647307229 — passed (after the correction
  cleanup + mobile bottom sheet change).

#### Live UAT scenarios and results

**Interactive UAT status: pending owner verification.**

Interactive browser-based UAT on the canonical UAT URL was not performed
from the local sandbox because no headless browser or interactive
Clerk session is available there. The environment has no authenticated
Clerk browser session, so the task completion criteria for live
verification are still pending the repository owner. PR #15 remains
draft and this section must not be marked passed.

What was exercised on the canonical UAT URL (no authentication):

- `GET /foreman` against
  `https://worksite-operations-platform-uat.vercel.app/` — 200,
  redirects to `/sign-in`, mounts `AttendanceWorkspace`. Confirms the
  canonical UAT alias now resolves to the latest branch head commit
  `a5532be`.
- `GET /ceo/attendance` against the canonical URL — expected to
  redirect to `/sign-in` (the CEO requires an authenticated Clerk
  session).

What must be performed by the repository owner with the existing safe
UAT access mechanism (synthetic Clerk users) before the PR is marked
ready for review:

1. Sign in as the Phase 4 Foreman UAT user, open the assigned project
   date, and confirm the existing happy path still works:
   - Enter, Start break, End break, Exit, second Enter, Exit all show
     `Saved on device` briefly, then `Attendance synchronized.` with no
     banner.
   - The compact `Sync` indicator disappears.
2. Force a true conflict by going offline, performing `Enter`, returning
   online, then opening the same worker in a second browser tab and
   synchronizing an `Enter` for the same worker and time. The first
   client must show:
   - the red banner `1 attendance record needs review · 1 device action
could not be applied` with a primary `Review issues` button;
   - the affected worker row with a `Sync issue` chip and reason
     `Device changes conflict with the current server record` plus a
     trailing `Review` action.
3. Open the issue center, expand the card, confirm the plain-English
   reason, the current server record summary, and the `Technical
details` disclosure contain the raw `status: "CONFLICT"` message.
4. Tap `Discard actions` and confirm the dialog names the affected
   worker, date, and action count, that the card disappears, that
   IndexedDB no longer contains the discarded ids (visible after a
   reload), and that the server attendance is unchanged.
5. Repeat the conflict, but this time use `Review attendance` to open
   the correction panel against the current server snapshot, save a
   correction, and confirm the issue card disappears after the
   correction synchronizes.
6. Force a 401/403 path (e.g. revoke the foreman's project assignment
   while they have a pending action) and confirm the banner shows
   `Some changes could not be sent and can be retried.` plus an amber
   `Retry eligible` action, and that pressing it after access is
   restored clears the row without re-introducing a conflict.
7. Verify mobile layouts at 320, 360, 390, and 430 px — the bottom
   Sheet has a drag handle, sticky header, and a safe-area-aware
   sticky footer. The issue cards remain at least 44 px tall and no
   horizontal overflow appears.
8. Sign in as the CEO UAT user, open the project attendance page, and
   confirm the same grouped issues are visible, that the Foreman's
   foreman project remains the only one whose attendance is exposed,
   and that no other project's worker metadata is visible in any card.

Tested roles:

- Foreman (assigned project) — interactive verification **pending
  owner verification** on the canonical UAT URL.
- CEO — interactive verification **pending owner verification** on
  the canonical UAT URL.

Shortest exact owner checklist for canonical UAT verification
(https://worksite-operations-platform-uat.vercel.app/):

1. Sign in as the Phase 4 Foreman UAT user. Open the assigned project
   date. Confirm that a conflict, when reproduced, is **resolved by a
   successful correction**: the red banner and grouped issue card
   disappear and the older `REVIEW_REQUIRED` actions no longer
   reappear after a page reload.
2. Sign in as the Phase 4 Foreman UAT user. Reproduce a conflict and
   use `Discard device actions`. Confirm the dialog names the affected
   worker, date, and action count; the card disappears; IndexedDB no
   longer contains the discarded ids after a reload; and the server
   attendance is unchanged.
3. Open the issue center at 320, 360, 390, and 430 px. Confirm the
   bottom Sheet has a drag handle, sticky header, independently
   scrolling body, safe-area-aware sticky footer, no horizontal
   overflow, and 44 px controls.
4. At a desktop or tablet width, reopen the issue center and confirm
   it opens from the right (unchanged behavior).
5. Sign in as the CEO UAT user. Confirm the same grouped issues are
   visible and that only the Foreman's assigned project is exposed
   (project scope is preserved).

Synthetic-data limitations:

- The existing Phase 4 UAT dataset is sufficient to exercise the happy
  path. True conflict scenarios are reproduced by interleaving two
  Foreman clients or by replaying an offline `Enter` against an
  existing server session for the same worker and timestamp; the
  per-id idempotency of the RPC guarantees a deterministic `CONFLICT`
  response in both cases.

#### Canonical UAT alias history

- `worksite-operations-platform-uat.vercel.app` was previously aliased
  to deployment `worksite-operations-platform-58cdfk8r7-sherrymasters-projects.vercel.app`
  (7 days old).
- It now resolves to deployment `dpl_622pPZFxYkCkcJLPHUYS5deyRucV`
  (source URL `worksite-operations-platform-qs3n9w03w-sherrymasters-projects.vercel.app`)
  which serves branch `fix/attendance-sync-resolution` at commit
  `a3ea895`. The Clerk credentials, Supabase configuration, browser
  storage origin, and PWA installation origin are preserved.

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
