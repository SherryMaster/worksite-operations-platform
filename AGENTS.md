# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Mission

Build the **Worksite Operations Platform**, a focused internal construction-workforce management application. Keep Version 1 simple, secure, and faithful to the approved workflows. It is not an ERP or a generic HR platform.

The application serves two company roles:

- **CEO** — company-wide operational and administrative access.
- **Foreman** — access limited to the Foreman’s current project.

Workers do not sign in to Version 1.

## Execution Discipline

- Work only on the task explicitly assigned.
- Prefer the smallest complete, reviewable vertical slice.
- Do not implement an entire phase unless the task explicitly authorizes it.
- Do not begin unrelated work because it appears useful.
- Do not continue beyond the task’s declared completion boundary.
- Do not silently convert a UI task into backend, infrastructure, migration, testing, or release work.
- Inspect existing behavior before replacing or restructuring it.
- Preserve working behavior unless the user explicitly requests a behavioral change.
- Surface material ambiguity instead of inventing a business rule.
- Use the shortest clear implementation that satisfies the approved requirements.
- Avoid over-engineering, speculative abstractions, and premature generalization.

For an explicitly authorized multi-checkpoint task, such as the approved UI overhaul, proceed through only the checkpoints named in that task. Do not add further checkpoints, deploy after every screen, or open separate pull requests for each small visual change.

## Incremental Usability

- Every implementation checkpoint must leave the affected application area working and reachable through the UI.
- Do not leave navigation pointing to unfinished, broken, or placeholder screens.
- Do not hide broken behavior behind static mock data unless the task explicitly authorizes a temporary mock.
- Completed workflows must work against the configured development or UAT services.
- Do not mark a phase accepted, complete, production-ready, or launched; that decision belongs to the user.
- Use `npx -y clerk@latest` for Clerk CLI commands in this repository; a global `clerk` command is not assumed to exist.

## Source of Truth

Before changing code, read the exact relevant sections of:

1. `docs/PRD.md` — product scope, roles, workflows, and business rules.
2. `docs/STACKS.md` — approved technology and engineering constraints.
3. `docs/DESIGN.md` — detailed permissions, data boundaries, screens, workflows, and calculations.
4. `docs/PLAN.md` — approved implementation order, phase gates, migration, and launch requirements.

These remain the only Version 1 product specification documents.

For UI implementation, also read the approved visual-reference package:

- `docs/design-references/v2/README.md`
- `docs/design-references/v2/manifest.md`
- `docs/design-references/v2/descriptive-reference.md`
- the relevant mobile and desktop reference images named in the manifest

The visual-reference package is implementation guidance, not a product specification. It defines intended visual hierarchy, density, layout patterns, interaction direction, responsive adaptation, and design language. It does not override business behavior, permissions, calculations, data relationships, or technical constraints.

Do not create additional plans, ADRs, architecture documents, requirement files, roadmaps, status documents, or phase documents unless the user explicitly requests them. Keep temporary working notes in the response.

### Conflict order

1. the user’s latest explicit instruction;
2. `docs/PRD.md` for product behavior and scope;
3. `docs/STACKS.md` for technology and architecture constraints;
4. `docs/DESIGN.md` for detailed behavior, permissions, workflows, and calculations;
5. the approved design-reference package for visual and interaction direction only;
6. `docs/PLAN.md` for delivery order and phase gates.

Do not silently invent, remove, or redesign business rules.

## Approved UI Reference Package

Treat the generated reference images as **design guides**, not screenshots that must be reproduced pixel for pixel.

Implement the intended:

- information hierarchy;
- navigation structure;
- content density;
- responsive behavior;
- interaction patterns;
- semantic status treatment;
- component relationships;
- mobile and desktop adaptation;
- visual rhythm and overall product character.

Correct obvious image-generation defects during implementation, including:

- text that is slightly off-center inside buttons;
- inconsistent icon geometry or icon style;
- awkward spacing;
- impossible truncation;
- inconsistent padding or alignment;
- malformed native controls;
- generated text mistakes;
- inconsistent illustrative counts;
- accidental visual artifacts;
- elements that would not be accessible or implementable in the approved web stack.

When references disagree, choose one consistent system based on the descriptive reference, existing product behavior, accessibility, and reuse across screens.

Reference images contain illustrative sample data. Render real application data and approved empty, loading, error, offline, and permission states. Do not hard-code the reference values as production data.

Do not:

- embed screenshots as page backgrounds;
- trace screenshots with absolute-positioned HTML;
- add generated people, portraits, logos, or document images as production assets;
- copy accidental image defects;
- alter business logic to match illustrative text;
- treat generated sample statuses or counts as authoritative;
- import a second design system to imitate the images.

## Scope Discipline

- Work only on the assigned task.
- Prefer one reviewable vertical slice or one explicitly authorized checkpoint at a time.
- Do not implement a whole phase unless explicitly requested.
- Do not begin a later phase while an earlier required gate is incomplete.
- Do not modify the four specification files unless explicitly asked.
- Do not modify the design-reference package unless explicitly asked.
- Do not mark a phase accepted or production-ready.
- Avoid unrelated cleanup, broad refactors, package upgrades, formatting churn, speculative abstractions, and convenience dependencies.
- Do not rename routes, database fields, business concepts, or domain types merely for aesthetic consistency.
- Do not replace a working component when a focused refactor or styling change is sufficient.
- Do not create parallel “v2” route trees, component libraries, or duplicated workflows unless the task explicitly requires a temporary migration path.

## UI Overhaul Boundaries

The approved UI overhaul is a presentation, navigation, responsiveness, and interaction-quality task.

Unless the user explicitly authorizes a change, do not modify:

- database schemas or Supabase migrations;
- RLS policies;
- authentication architecture;
- authorization checks;
- Clerk or Supabase configuration;
- API contracts;
- server-action behavior;
- route-handler contracts;
- attendance rules or calculations;
- overtime, Sunday, public-holiday, break, or payable-time calculations;
- leave rules;
- payroll calculations, snapshots, approval, or payment rules;
- audit semantics;
- offline queue, conflict, retry, or idempotency algorithms;
- import workbook structure or validation rules;
- storage security;
- deployment architecture;
- CI configuration;
- production environment configuration;
- role permissions;
- company terminology;
- historical data behavior.

Do not rebuild working backend behavior merely to support a visual change. Adapt existing pages and components around current behavior.

A backend change is allowed only when all of the following are true:

1. the requested UI cannot function correctly without it;
2. the current specification supports it;
3. the change is minimal and localized;
4. authorization and audit behavior remain correct;
5. the response clearly identifies and justifies it before implementation when practical.

## Approved Stack

- Next.js 16 App Router
- TypeScript strict mode
- npm
- shadcn/ui
- Tailwind CSS
- Clerk authentication
- Supabase Postgres
- Supabase private Storage
- `@supabase/supabase-js`
- SQL migrations
- generated database types
- IndexedDB and Serwist for approved offline attendance/PWA behavior
- Vercel
- Zod
- ESLint
- Prettier
- Vitest
- React Testing Library
- Playwright

Do not add Neon, Supabase Auth, Prisma, Drizzle, a separate API server, GraphQL, Redux, Redis, queues, microservices, Realtime, Edge Functions, public document buckets, native mobile applications, or another component framework unless the user changes the approved stack.

Add dependencies only when the existing stack or platform cannot reasonably solve the assigned task. Explain the need. Do not add a dependency for a small component, formatting helper, animation, icon, or utility already covered by the current stack.

## Architecture Rules

- Use Server Components by default.
- Add `"use client"` only at the smallest interactive boundary.
- Use Server Actions for ordinary authenticated mutations.
- Use Route Handlers for offline synchronization, private file delivery, imports/exports, and necessary webhooks.
- On Next.js 16 use `proxy.ts`, not `middleware.ts`.
- Keep route- or feature-specific code close to that feature.
- Prefer existing feature and shared-component boundaries.
- Do not create a second internal component framework around shadcn/ui.
- Add only the shadcn components required by the current task.
- Keep shared primitives simple, composable, and visibly reused.
- Avoid abstractions that merely rename Tailwind classes or wrap a component once.
- Preserve server/client boundaries and avoid moving large trees to the client for styling convenience.
- Do not fetch data twice to support the same screen.
- Do not move authorization-sensitive decisions into client components.

## Authentication and Authorization

Clerk proves identity. Supabase application data determines business access.

Every protected operation must verify:

1. a valid Clerk session;
2. an active application user;
3. the `CEO` or `FOREMAN` role;
4. project scope when applicable.

UI visibility is never authorization. Repeat authorization checks on every server mutation and protect exposed tables and Storage through appropriate RLS and server-side checks.

Non-negotiable boundaries:

- no public registration;
- only the CEO creates or manages Foreman accounts;
- only the CEO creates or edits worker profiles;
- Foremen access only their current project;
- workers do not sign in;
- no production role switcher;
- no client-controlled role escalation;
- never expose the Supabase service-role key to the browser;
- never reveal secrets, tokens, initial passwords, private files, or full identity-document numbers in UI, logs, screenshots, or test output.

## Database and Storage

- Commit every approved schema or policy change under `supabase/migrations/`.
- The Supabase Dashboard is not authoritative schema history.
- Refresh generated database types after material schema changes.
- Prefer small typed repository functions over scattered queries.
- Use database functions only when atomicity or database-side calculation requires them.
- Never run production or destructive database commands without explicit approval.
- Store money as integer sen.
- Store durations as integer minutes.
- Store timestamps with timezone.
- Use `Asia/Kuala_Lumpur` for business dates.
- Preserve history through statuses, effective dates, snapshots, and audit entries.
- Worker files belong in private Storage; Postgres stores metadata.
- Authorize file operations server-side and use short-lived signed access.
- Do not add migrations or change data shape during a pure UI task.

## Offline Attendance

Do not replace or redesign approved offline/PWA behavior during a UI overhaul.

For approved offline attendance behavior:

- IndexedDB stores only the minimum required attendance data;
- every action has an immutable client action ID;
- synchronization is idempotent and project-authorized;
- retries cannot create duplicates;
- pending, synchronized, failed, and conflict states remain distinguishable;
- the UI must never label pending local work as synchronized;
- failed actions remain visible and recoverable;
- never cache worker documents or payroll data offline;
- approved or paid financial history is never silently rewritten;
- offline UI changes must preserve queue safety and existing conflict rules.

## UI and Interaction Quality

Both roles are mobile-first because most real usage is expected on phones.

### Foreman

- Prioritize fast, one-handed field operations.
- Keep current attendance actions immediately reachable.
- Separate live attendance from historical review.
- Keep offline and synchronization state understandable without dominating the screen.
- Show exceptions prominently while keeping normal records quiet.

### CEO

- Prioritize compact exception review, oversight, and management on mobile.
- Make pending work and blockers visible before routine statistics.
- Keep high-volume records bounded through filtering, pagination, or incremental loading.
- Avoid forcing desktop-only tables onto phones.

### Desktop and tablet

- Adapt mobile workflows into persistent sidebars, tables, split panes, drawers, and denser toolbars where useful.
- Do not stretch mobile cards across a desktop viewport.
- Do not preserve mobile bottom navigation on desktop.
- Preserve the same routes, terminology, permissions, and task order across breakpoints.

### Shared requirements

- Use the approved reference package under `docs/design-references/v2/` as the final visual direction.
- Do not independently redesign the product from external inspiration during the assigned overhaul.
- Use external products only for small interaction research when specifications and references do not resolve a question.
- Avoid editorial, article-like, marketing-site, or decorative dashboard treatment.
- Use sentence case.
- Use restrained light surfaces and a consistent violet brand accent.
- Use semantic emerald, amber, and red states consistently.
- Avoid gradients, excessive purple surfaces, glassmorphism, decorative charts, and oversized hero sections.
- Keep the first useful task or first records visible in the initial mobile viewport.
- Prefer compact rows and contained lists over one oversized card per record.
- Use tables for high-volume desktop data.
- Keep filters in compact toolbars or mobile sheets rather than permanently expanded panels.
- Ensure buttons, fields, menus, dialogs, drawers, and sheets have correctly aligned content.
- Use a consistent icon family and sizing.
- Preserve keyboard access, visible labels, logical focus order, and accessible status text.
- Important mobile controls should normally provide a 44–52 px target area.
- Fixed navigation and sticky actions must not cover content.
- Support long names, long translations where relevant, empty results, validation errors, permission errors, network failures, offline states, pending synchronization, and loading states.
- Validate the layout at approximately 320, 360, 390, and 430 px mobile widths, plus tablet and desktop widths.
- Avoid horizontal page scrolling.
- Use truncation only when the full value remains available through an accessible detail view.
- Use tabular numerals where financial or duration comparison benefits from alignment.
- Write interface and audit text for non-technical company staff.
- Show plain-English audit descriptions by default and keep implementation identifiers inside optional technical details.

## UI Task Resource Discipline

For presentation and interaction work:

- inspect existing routes, components, data loaders, mutations, and tests before editing;
- reuse existing components where practical;
- consolidate repeated patterns only when at least two real screens benefit;
- do not create a parallel component system;
- do not replace all shadcn components with custom primitives;
- do not upgrade packages unless the assigned task requires it;
- do not reformat unrelated files;
- do not rewrite data access for styling convenience;
- do not add tests for purely cosmetic details;
- add or update tests only when they protect a critical interaction, permission boundary, calculation, routing behavior, or regression-prone state;
- use targeted validation during intermediate checkpoints;
- run the full validation suite once after the complete authorized UI task, before final UAT;
- do not repeatedly build, deploy, commit, open pull requests, or update UAT after each screen;
- group related screens into reviewable checkpoints;
- keep one coherent implementation branch and one final reviewable pull request when the task explicitly includes repository actions;
- preserve intentional differences between mobile and desktop instead of forcing one DOM structure when it creates complexity;
- stop and report rather than expanding the task when a backend or product ambiguity blocks correct UI implementation.

## Testing and Validation

Use the smallest test set that protects the changed behavior.

### During intermediate UI checkpoints

Run only relevant commands, such as:

```bash
npm run format:check
npm run lint
npm run typecheck
```

Target affected tests when a critical interaction changed.

### Before final UAT

Run the complete applicable validation:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Run Playwright when the task changes a covered critical workflow or when end-to-end verification is required by the task.

Never claim a command passed unless it actually ran successfully. Report skipped commands and the reason.

Visual verification must include, where applicable:

- 320 px mobile;
- 360 px mobile;
- 390 px mobile;
- 430 px mobile;
- tablet;
- desktop;
- long names and long values;
- empty results;
- loading;
- validation failure;
- server or network failure;
- offline;
- pending synchronization;
- failed synchronization;
- mobile keyboard open;
- enough records to verify bounded rendering and pagination behavior.

## Default Repository and UAT Delivery Workflow

The repository owner cannot meaningfully review runtime application changes until a live UAT link exists. Therefore, unless the user explicitly says a task is local-only, documentation-only, research-only, or must not create repository/deployment changes, every task that changes application runtime behavior, user-facing UI, data flow, authorization behavior, or regression-protection tests must use this complete delivery workflow:

1. update the local checkout from the latest default branch;
2. create one focused feature branch;
3. implement the smallest complete authorized slice;
4. run targeted validation while developing;
5. run the complete applicable validation before final review;
6. update `PROGRESS.md` when the task uses it;
7. commit and push the branch;
8. open one draft pull request against the default branch;
9. monitor required CI and preview-deployment checks;
10. fix failures on the same branch and repeat until required checks pass;
11. deploy the exact validated branch commit to the canonical UAT application at `https://worksite-operations-platform-uat.vercel.app/`;
12. verify that the canonical UAT URL serves the current branch commit, then perform focused UAT there, including relevant desktop and mobile states;
13. mark the pull request ready for review only after required CI and canonical UAT succeed;
14. report the pull request URL, canonical UAT URL, tested roles, test-data limitations, checks, and UAT results.

The only user-review UAT origin is `https://worksite-operations-platform-uat.vercel.app/`. Always update that existing Vercel UAT project or alias so its Clerk credentials, Supabase configuration, browser storage, and installed PWA origin remain stable. Generated Vercel preview URLs may be used as intermediate CI evidence, but they are not the UAT environment and must not be reported or tested as the final UAT link.

Do not stop after local implementation when this workflow applies. A runtime implementation task is not complete merely because code, unit tests, a local build, or a generated preview deployment passes.

If repository permissions, CI secrets, authentication configuration, deployment integration, or the UAT environment blocks completion:

- keep completed work on the safest available branch or draft pull request;
- do not bypass security or use production data;
- report the exact failed step and evidence;
- state the single action required from the user or repository administrator;
- classify the task as blocked, not complete.

This default authorizes feature branches, commits, pushes, pull requests, required CI repair, and deployment of the validated branch commit to the existing canonical UAT application. It does not authorize merging, production deployment, destructive database operations, production environment changes, or production-data access.

## UAT and Deployment Safety

Deployment to the existing canonical UAT application at `https://worksite-operations-platform-uat.vercel.app/` is authorized by the default workflow above for runtime implementation tasks. Do not merge, deploy to production, perform destructive database operations, or alter production environment configuration unless the user explicitly authorizes it.

When a task requires a UAT deployment, whether through the default workflow or an explicit task instruction:

- deploy the exact validated branch commit to the existing canonical UAT application, never to a newly created Vercel project or a generated preview URL;
- use one stable canonical UAT update after the authorized implementation and final validation, not after every screen;
- preserve production authentication and authorization;
- never expose production data, production secrets, or private worker files;
- use isolated synthetic UAT data;
- use the existing safe UAT access mechanism when available;
- when the user explicitly requests access without normal sign-in friction, use a strictly UAT-only review mechanism guarded by deployment environment and isolated from production;
- a UAT review mechanism may expose role-specific synthetic views, but it must not create a production authentication bypass;
- no UAT role switcher, demo route, test credential, bypass flag, or synthetic data path may be reachable in production;
- clearly label UAT/demo-only behavior;
- verify both CEO and Foreman scopes;
- verify that Foreman access remains project-scoped;
- verify that UAT changes do not weaken server-side authorization;
- verify the canonical UAT URL is serving the intended validated commit before testing;
- report the canonical UAT URL, tested commit, test roles, synthetic-data limitations, and any intentional visual differences.

Do not merge a pull request or update production unless the user explicitly requests it.

## Required Task Workflow

For each task:

1. Read `AGENTS.md`.
2. Read the exact relevant specification sections.
3. For UI work, read the visual-reference README, manifest, descriptive reference, and relevant images.
4. Inspect existing code, routes, components, data flow, authorization, and relevant tests.
5. State a concise implementation plan in the response; do not create a plan file.
6. Identify the exact task boundary and non-goals.
7. Implement the smallest complete authorized slice or checkpoint.
8. Preserve business behavior and server-side authorization.
9. Add or update only risk-focused tests.
10. Run targeted validation.
11. Review the diff for:
    - scope creep;
    - unauthorized backend changes;
    - changed calculations or business rules;
    - authorization gaps;
    - secret exposure;
    - duplicated components;
    - unnecessary dependencies;
    - inaccessible interaction;
    - mobile overflow;
    - reference-image artifacts copied literally.
12. For a final implementation checkpoint, run the complete applicable validation.
13. When the default repository/UAT workflow applies, create or update the single pull request, wait for required CI, repair failures, deploy the validated commit to the canonical UAT application, and perform live UAT there.
14. Report completed behavior, files, tests, validation, CI, pull request, canonical UAT URL, tested commit, UAT results, intentional differences, exclusions, and blockers.

A well-formed task should specify:

- **Goal**
- **Relevant specification**
- **Relevant design references**
- **Scope**
- **Non-goals**
- **Checkpoint order**
- **Acceptance checks**
- **Required tests**
- **Validation commands**
- **UAT requirement**

When an implementation task omits repository or UAT wording, use the default repository and UAT delivery workflow. Do not interpret silence as permission to stop at local validation.

## Completion Format

End with:

- **Implemented**
- **Files changed**
- **Tests**
- **Validation**
- **Visual verification**
- **Intentional reference differences**
- **UAT**
- **Not included**

Do not claim completion when required validation, visual verification, or UAT work has not been performed.

For runtime implementation tasks covered by the default workflow, do not claim completion until `https://worksite-operations-platform-uat.vercel.app/` serves the validated branch commit and required UAT has been performed there. If an external dependency prevents that, report the task as blocked.
