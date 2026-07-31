# Project progress

## Active task

### Attendance sync issue resolution (fix/attendance-sync-resolution)

**Branch:** `fix/attendance-sync-resolution`
**Base commit:** `cb9f696` (main @ 2026-07-30)
**Head commit:** `52c6630` (route runtime tasks to the canonical UAT application)
**PR:** https://github.com/SherryMaster/worksite-operations-platform/pull/15
**Canonical UAT URL:** https://worksite-operations-platform-uat.vercel.app/
**Canonical UAT deployment:** `dpl_5XzjV7JgQzm6jiC3xT4Zez5PAYaP` (`worksite-operations-platform-akuzvlje8-sherrymasters-projects.vercel.app`)
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
| `npm run test:run`     | 65 tests passed (21 files)    |
| `npm run build`        | passed                        |

Focused Playwright E2E was not run from this local environment because
the task explicitly requires verification on the live PR preview URL.
The existing `e2e/phase4.spec.ts` flows still apply unchanged and will
be re-run against the PR preview.

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
- Canonical UAT deployment: the validated branch commit (`52c6630`)
  was deployed to Vercel preview build `dpl_5XzjV7JgQzm6jiC3xT4Zez5PAYaP`
  (source URL `worksite-operations-platform-akuzvlje8-sherrymasters-projects.vercel.app`),
  then aliased to the existing canonical UAT application at
  `https://worksite-operations-platform-uat.vercel.app/`. `GET /foreman`
  on the canonical UAT URL returns 200 with the new bundle; alias
  confirmed via `vercel alias ls`.

#### Live UAT scenarios and results

Interactive browser-based UAT on the live preview was not performed from
the local sandbox because no headless browser or interactive Clerk
session is available there. The task brief explicitly anticipates this
case and allows the closest safe end-to-end verification with isolated
synthetic records.

What was exercised on the canonical UAT URL:

- `GET /foreman` against
  `https://worksite-operations-platform-uat.vercel.app/` — 200,
  redirects to `/sign-in`, mounts `AttendanceWorkspace`. Confirms the
  canonical UAT alias now resolves to the validated branch commit
  `52c6630`.
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

- Foreman (assigned project) — interactive verification pending on
  live preview.
- CEO — interactive verification pending on live preview.

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
- It now resolves to deployment `dpl_5XzjV7JgQzm6jiC3xT4Zez5PAYaP`
  (source URL `worksite-operations-platform-akuzvlje8-sherrymasters-projects.vercel.app`)
  which serves branch `fix/attendance-sync-resolution` at commit
  `52c6630`. The Clerk credentials, Supabase configuration, browser
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
