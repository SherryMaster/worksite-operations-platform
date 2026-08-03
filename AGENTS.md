# AGENTS.md

## Role

The coding agent is an implementation executor only.

Its responsibility is to:

1. understand the assigned implementation task;
2. inspect only the relevant existing code and documentation;
3. implement the smallest complete change;
4. work in the existing task branch and pull request when one exists, or create
   one focused branch when it does not;
5. commit and push the completed implementation;
6. open or update one pull request;
7. stop.

The agent is not responsible for local validation, CI execution, CI monitoring,
deployment verification, release management, merging, or ongoing project
management unless the user explicitly assigns one of those as a separate task.

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
infrastructure, CI configuration, or deployment configuration unless the task
explicitly requires that exact change.

## Implementation rules

- Implement only what the user requested.
- Prefer the smallest complete change.
- Inspect existing code before replacing it.
- Preserve working behavior unless the task requires a change.
- Avoid unrelated cleanup, broad refactors, speculative abstractions, and
  premature generalization.
- Reuse existing components, helpers, conventions, and dependencies.
- Do not add a dependency when the current stack can solve the problem.
- Do not create duplicate routes, component systems, services, or workflows.
- Do not convert a UI task into backend, database, authentication,
  infrastructure, CI, or deployment work without a genuine requirement.
- Do not invent business rules when the specifications are unclear.
- Ask only when an unresolved decision materially affects implementation
  correctness.
- Keep comments concise and add them only where the reasoning is not obvious.
- Do not create or update `PROGRESS.md`, ADRs, status documents, deployment
  records, release notes, or additional planning files unless explicitly
  requested.

Commands may be used only when they directly perform the requested
implementation or Git workflow, such as installing an explicitly required
dependency, generating an explicitly required implementation file, or managing
the branch, commit, push, and pull request.

## Validation ownership

GitHub CI is solely responsible for validating pushed changes.

The coding agent must not run validation, check, test, build, audit, preview, or
verification commands before or after pushing.

This prohibition includes both complete suites and targeted checks, including:

- unit, integration, database, or end-to-end tests;
- Vitest, Jest, Playwright, Cypress, or similar test runners;
- lint commands;
- type-check commands;
- formatting check commands;
- build commands;
- database validation or policy-test commands;
- package audit commands;
- framework validation commands;
- starting a development server for verification;
- browser or preview-deployment verification;
- GitHub Actions or pull-request check inspection.

Examples that must not be run include:

- `npm test`;
- `npm run test`;
- `npm run test:run`;
- `npm run test:db`;
- `npm run lint`;
- `npm run typecheck`;
- `npm run format:check`;
- `npm run build`;
- `npx vitest`;
- `npx playwright test`;
- `npx tsc --noEmit`;
- `npm audit`.

Do not substitute a smaller or targeted check for a full check. Run no local
checks.

Do not wait for, poll, inspect, summarize, rerun, or troubleshoot CI as part of
an implementation task.

If CI later reports a failure, leave it for GitHub CI and the user. Investigate
or fix it only when the user explicitly assigns a separate follow-up task for
that failure.

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

Do not run destructive database commands or production data operations without
explicit user approval.

## Git workflow

For every repository implementation task:

1. Identify whether the task already has a branch or pull request.
2. When an existing task branch or pull request exists, continue using it.
3. Otherwise create one focused branch from the latest `main`.
4. Implement only the requested change.
5. Commit the completed implementation.
6. Push the branch.
7. Open one pull request, or update the existing pull request.
8. Stop immediately after reporting completion.

Do not create a second branch or pull request for the same task unless the user
explicitly requests it.

Do not merge the pull request unless explicitly requested.

Do not wait for, poll, monitor, or inspect:

- GitHub Actions;
- pull-request checks;
- Vercel deployments;
- CodeRabbit;
- automated reviews;
- preview readiness;
- deployment checks.

These systems continue automatically after the agent stops.

Keep the pull request title and description accurate and concise. Do not
repeatedly rewrite the pull request description after every commit.

Do not record changing commit SHAs, CI run IDs, deployment IDs, or preview URLs
inside repository files.

## Pull request content

The pull request should briefly state:

- what was implemented;
- the main files or areas changed;
- any relevant scope boundary or known blocker;
- that validation is delegated to GitHub CI.

Do not claim that tests, checks, builds, previews, or deployments passed unless
the user separately requested verification and supplied the result.

## Vercel and deployment

Rely on the existing Vercel Git integration.

- Feature-branch pushes automatically create or update Vercel Previews.
- Merges or pushes to `main` automatically update the Vercel Production
  deployment.
- The stable Production URL represents the latest merged application.

Do not:

- run a manual Vercel deployment;
- use `vercel alias set`;
- create or maintain a separate UAT deployment;
- manually promote a deployment;
- modify domains or Vercel project settings;
- wait for a Vercel build;
- inspect preview or deployment status;
- verify deployment IDs after pushing.

Only perform manual deployment or Vercel configuration work when the user
explicitly assigns that exact operation as a separate task.

Do not deploy production or merge a pull request unless explicitly requested.

## Completion report

After pushing and opening or updating the pull request, report only:

- what changed;
- files changed;
- commit SHA;
- branch name;
- pull request URL;
- any real implementation blocker;
- validation delegated to GitHub CI.

Then stop.

Do not produce a test report, CI summary, release report, deployment report,
UAT report, verification report, or long implementation diary unless
specifically requested.

## Compatibility

`AGENTS.md` is the canonical instruction file.

Keep `CLAUDE.md` as a symbolic link to `AGENTS.md` so both filenames always
resolve to the same instructions.
