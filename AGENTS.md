# AGENTS.md

## Project

This repository contains the Worksite Operations Platform, an internal
construction-workforce management application.

Version 1 has two application roles:

- CEO: company-wide access.
- Foreman: access limited to the currently assigned project.

Workers do not sign in.

Business defaults:

- Currency: MYR.
- Business timezone: Asia/Kuala_Lumpur.
- Frontend: Next.js 16, React, TypeScript, Tailwind CSS, shadcn/ui.
- Authentication: Clerk.
- Database and storage: Supabase.
- Deployment: Vercel.

## Source of truth

Use the user's latest instruction as the primary task definition.

Read only the relevant sections of these documents when the task requires them:

1. `docs/PRD.md` — product scope and business behavior.
2. `docs/STACKS.md` — approved technology and architecture.
3. `docs/DESIGN.md` — detailed workflows, permissions, UI, and calculations.
4. `docs/PLAN.md` — implementation order and remaining work.

For visual tasks, inspect only the relevant design references under
`docs/design-references/`.

Do not reread every document for every task.

Do not edit product specifications, design references, planning documents,
or infrastructure unless the task explicitly requires it.

## Working style

- Implement only what the user requested.
- Prefer the smallest complete change.
- Inspect existing code before replacing it.
- Preserve working behavior unless the task requires a change.
- Avoid unrelated cleanup, broad refactors, speculative abstractions, and
  premature generalization.
- Reuse existing components, helpers, conventions, and dependencies.
- Do not add a dependency when the current stack can solve the problem.
- Do not create duplicate routes, component systems, services, or workflows.
- Do not convert a UI task into backend or infrastructure work without a
  genuine requirement.
- Do not invent business rules when the specifications are unclear.
- Ask only when an unresolved decision materially affects correctness.
- Keep comments concise and add them only where the reasoning is not obvious.

Do not create or update `PROGRESS.md`, ADRs, status documents, deployment
records, or additional planning files unless the user explicitly requests
them.

## Important boundaries

Preserve these behaviors unless the assigned task explicitly changes them:

- CEO and Foreman authorization boundaries.
- Foreman project scoping.
- Clerk authentication.
- Supabase RLS and server-side authorization.
- Attendance calculation rules.
- Payroll calculation and approval rules.
- Audit behavior.
- Offline attendance action IDs and idempotency.
- IndexedDB queue safety.
- Private worker-document access.

Never expose secrets, tokens, service-role keys, private files, passwords, or
full identity-document numbers.

Do not run destructive database commands or production data operations
without explicit user approval.

## Testing

GitHub CI is the primary validator after a branch is pushed. Do not duplicate
the complete CI suite locally by default.

### No local validation required

For documentation, copy, comments, and minor visual-only changes, implement,
commit, push, and stop. Let CI validate the branch.

### Targeted validation

For behavior or application-logic changes, run at most one directly relevant
local check when it can catch an obvious problem quickly, such as:

- one affected Vitest file;
- `npm run typecheck` for substantial TypeScript changes;
- lint for a focused lint-sensitive change.

Prefer targeted tests over `npm run test:run`.

### Special subsystems

Run relevant specialized validation only when changing that subsystem:

- database migrations, policies, RPCs, or database authorization:
  `npm run test:db`;
- critical end-to-end workflows: targeted Playwright only when explicitly
  requested or clearly necessary;
- dependencies, Next.js configuration, or build configuration:
  `npm run build`.

Do not routinely run all of the following locally:

- `npm run format:check`;
- `npm run lint`;
- `npm run typecheck`;
- `npm run test:run`.

CI runs the standard quality suite automatically after push.

Do not wait for or monitor CI after pushing.

## Git workflow

For repository implementation work:

1. Use the existing task branch and pull request when one already exists.
2. Otherwise create one focused branch from the latest `main`.
3. Implement the requested change.
4. Run the smallest relevant local validation.
5. Commit the completed change.
6. Push the branch.
7. Open or update one pull request.
8. Stop.

Do not wait for, poll, or monitor:

- GitHub Actions;
- Vercel deployments;
- CodeRabbit;
- automated reviews;
- preview readiness;
- deployment checks.

These services continue automatically after the agent stops.

Do not repeatedly update the pull request description after every commit.
Keep it accurate and concise.

Do not record changing commit SHAs, CI run IDs, deployment IDs, or preview
URLs in repository files.

## Vercel and deployment

Rely on the existing Vercel Git integration.

- Feature-branch pushes automatically create or update Vercel Previews.
- Merges or pushes to `main` automatically update the Vercel Production
  deployment.
- The stable Production URL is the URL for the latest merged application.

Do not:

- run a manual Vercel deployment;
- use `vercel alias set`;
- create or maintain a separate UAT deployment;
- manually promote a deployment;
- modify domains or Vercel project settings;
- wait for a Vercel build;
- verify deployment IDs after every push.

Only perform manual deployment or Vercel configuration work when the user
explicitly requests that exact operation.

Do not merge a pull request or deploy production manually unless explicitly
requested.

## Completion report

After pushing and opening or updating the pull request, report only:

- what changed;
- files changed;
- local checks run;
- commit SHA;
- branch name;
- pull request URL;
- any real blocker or skipped validation.

Then stop.

Do not produce a release report, deployment report, UAT report, CI summary,
or long implementation diary unless specifically requested.

## Compatibility

`AGENTS.md` is the canonical instruction file.

Keep `CLAUDE.md` as a symbolic link to `AGENTS.md` so both filenames always
resolve to the same instructions.
