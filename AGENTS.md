# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Mission

Build the **Worksite Operations Platform**, a focused internal construction-workforce management application. Keep Version 1 simple, secure, and faithful to the approved workflows. It is not an ERP or a generic HR platform.

## Incremental Phase Usability

- Every implementation phase must end as a working, independently usable application increment.
- Completed features must be reachable and testable through the application UI when a frontend workflow applies.
- Do not advance to the next phase until the current phase passes its automated checks, works against the development services, and is explicitly accepted by the user.
- Use `npx -y clerk@latest` for Clerk CLI commands in this repository; a global `clerk` command is not assumed to exist.

## Source of Truth

Before changing code, read the relevant sections of:

1. `docs/PRD.md` — scope and business rules.
2. `docs/STACKS.md` — approved technology and engineering constraints.
3. `docs/DESIGN.md` — permissions, data boundaries, screens, workflows, and calculations.
4. `docs/PLAN.md` — implementation order, tests, phase gates, migration, and launch.

These are the only Version 1 specification documents.

Do not create additional plans, ADRs, architecture documents, requirement files, roadmaps, status documents, or phase documents unless the user explicitly requests one. Keep working notes in the response.

Conflict order:

1. the user's latest explicit instruction;
2. `PRD.md` for product behavior;
3. `STACKS.md` for technology;
4. `DESIGN.md` for detailed behavior;
5. `PLAN.md` for delivery order.

Do not silently invent or redesign business rules. Surface material ambiguity.

## Scope Discipline

- Work only on the assigned task.
- Prefer one reviewable vertical slice per task.
- Do not implement a whole phase unless explicitly requested.
- Do not begin a later phase while an earlier phase gate is incomplete.
- Do not modify the four specification files unless explicitly asked.
- Do not mark a phase accepted or production-ready; that belongs to the user.
- Avoid unrelated cleanup, broad refactors, speculative abstractions, and convenience dependencies.

## Approved Stack

- Next.js 16 App Router, TypeScript strict mode, npm
- shadcn/ui and Tailwind CSS
- Clerk authentication
- Supabase Postgres and private Storage
- `@supabase/supabase-js`, SQL migrations, generated database types
- IndexedDB and Serwist for Phase 4 offline attendance/PWA
- Vercel
- Zod, ESLint, Prettier, Vitest, React Testing Library, Playwright

Do not add Neon, Supabase Auth, Prisma, Drizzle, a separate API server, GraphQL, Redux, Redis, queues, microservices, Realtime, Edge Functions, public document buckets, or native mobile apps unless the user changes the approved stack.

Add dependencies only when the current stack or platform cannot reasonably solve the assigned task. Explain the need.

## Architecture Rules

- Use Server Components by default.
- Add `"use client"` only at the smallest interactive boundary.
- Use Server Actions for ordinary authenticated mutations.
- Use Route Handlers for offline sync, private file delivery, imports/exports, and necessary webhooks.
- On Next.js 16 use `proxy.ts`, not `middleware.ts`.
- Keep route- or feature-specific code close to that feature.
- Do not create a second internal component framework around shadcn/ui.
- Add only the shadcn components needed by the current task.

## Authentication and Authorization

Clerk proves identity. Supabase application data determines business access.

Every protected operation must verify:

1. a valid Clerk session;
2. an active application user;
3. the `CEO` or `FOREMAN` role;
4. project scope when applicable.

UI visibility is never authorization. Repeat checks on every server mutation and protect exposed tables/Storage with RLS.

Non-negotiable boundaries:

- no public registration;
- only the CEO creates/invites Foremen;
- only the CEO creates/edits worker profiles;
- Foremen access only their current project;
- never expose the Supabase service-role key to the browser.

## Database and Storage

- Commit every schema/policy change under `supabase/migrations/`.
- The Supabase Dashboard is not authoritative schema history.
- Refresh generated database types after material schema changes.
- Prefer small typed repository functions over scattered queries.
- Use database functions only when atomicity or database-side calculation requires them.
- Never run production or destructive database commands without explicit approval.
- Store money as integer sen and durations as integer minutes.
- Store timestamps with timezone; use `Asia/Kuala_Lumpur` for business dates.
- Preserve history through statuses, effective dates, snapshots, and audit entries.
- Worker files belong in private Storage; Postgres stores metadata.
- Authorize file operations server-side and use short-lived signed access.

## Offline Attendance

Do not add offline/PWA infrastructure before Phase 4 unless explicitly requested.

For Phase 4:

- IndexedDB stores only minimum attendance data;
- every action has an immutable client action ID;
- synchronization is idempotent and project-authorized;
- retries cannot create duplicates;
- pending, synced, failed, and conflict states remain visible;
- never cache worker documents or payroll data offline;
- approved/paid financial history is never silently rewritten.

## UI and Code Quality

- CEO screens are desktop-first and responsive; Foreman screens are mobile-first.
- Provide mobile alternatives for wide tables.
- Implement relevant loading, empty, validation, permission, offline, and failure states.
- Preserve keyboard access, labels, focus, and accessible status text.
- Validate untrusted input with Zod.
- Keep business calculations pure where practical.
- Do not bypass strict TypeScript with broad `any`, unsafe casts, or disabled rules.
- Never log secrets, tokens, document contents, or full identity-document numbers.
- Remove temporary logging, dead code, mock shortcuts, and unused dependencies.

### Final UI Theme Direction

- Keep feature delivery usable during phased development; perform the broad navigation and visual-system overhaul during the final UI polish stage.
- The approved reference direction is [Resourceinn](https://resourceinn.com/): a professional company/HRMS product interface with structured navigation, restrained light surfaces, subtle lavender/purple brand color, selective warm call-to-action accents, rounded cards, and clear enterprise workflows.
- Do not copy Resourceinn assets or layouts literally. Translate that product character into the Worksite Operations brand and construction context.
- Avoid the current editorial/article-like prototype treatment in the final theme.
- Write interface and audit text for non-technical company staff. Show plain-English activity descriptions by default and keep implementation identifiers inside optional technical details.

Read the exact attendance, payroll, correction, permission, and state rules in the approved documents before implementing those areas.

## Required Task Workflow

For each task:

1. Read `AGENTS.md` and the exact relevant specification sections.
2. Inspect existing code and tests.
3. State a concise plan in the response; do not create a plan file.
4. Implement the smallest complete vertical slice.
5. Add or update risk-focused tests.
6. Run relevant validation commands.
7. Review the diff for scope creep, authorization gaps, secret exposure, and changed business behavior.
8. Report completed behavior, important files, tests, commands, and exclusions.

A task should specify:

- **Goal**
- **Relevant specification**
- **Scope**
- **Non-goals**
- **Acceptance checks**
- **Required tests**
- **Validation commands**

Expected full validation:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Run Playwright when the task changes a covered critical workflow. Never claim a command passed unless it actually ran successfully.

## Completion Format

End with:

- **Implemented**
- **Files changed**
- **Tests**
- **Validation**
- **Not included**
