# Worksite Operations Platform

Internal construction-workforce management application for company staff.

## Roles

- **CEO** — company-wide access.
- **Foreman** — access limited to the currently assigned project.

Workers do not sign in.

## Stack

- Next.js 16, React, TypeScript, Tailwind CSS, shadcn/ui
- Clerk authentication
- Supabase database and storage
- Vercel deployment

Currency: MYR. Business timezone: Asia/Kuala_Lumpur.

## Local development

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3000`.

## Environment variables

Provide values for these names in `.env.local`. Secrets are never committed.

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_DB_PASSWORD`

Clerk and Supabase must be paired by environment:

- local development and Vercel Preview should use a matching Clerk development
  key pair with the development Supabase project;
- Vercel Production rejects Clerk test keys and mixed test/live pairs during
  startup or build, without printing key values;
- Production requires matching `pk_live_...` and `sk_live_...` values and a
  Supabase Production Clerk third-party-auth integration that trusts the same
  production issuer/JWKS and required `role: authenticated` claim.

Repository code cannot configure the Clerk, Supabase, or Vercel dashboards.
Before treating Production recovery as complete, the owner must activate the
Clerk Production instance, configure its production domain, configure Supabase
Production third-party auth for that issuer/JWKS, set the matching live pair in
Vercel Production, redeploy through the existing Git integration, and complete
the desktop and installed-PWA recovery UAT. Preview/local may continue using
development credentials.

Dependency failures are logged as `external_dependency_failed`. The safe
reference shown in a workspace boundary or API response matches both the
`digest` and `correlationId` fields in that event. Monitor these events in
addition to HTTP status: a rejected React Server Component render can still be
carried by an HTTP 200 response.

## Useful scripts

```bash
npm run dev          # Local development server
npm run format:check # Prettier check
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test:run     # Unit and component tests
npm run test:db      # Database tests (run manually)
npm run test:e2e     # Playwright tests (run manually)
```

## Workflow

1. Reuse the existing task branch and pull request when one already exists.
2. Otherwise create a focused branch from the latest `main`.
3. Implement the change.
4. Run the smallest relevant local checks.
5. Commit and push the branch.
6. Open or update one pull request.
7. Stop.

Manual UAT aliases, manual Vercel deployments, and CI/Vercel monitoring are
not part of the normal workflow.

## Deployment

- Feature branches automatically create or update a Vercel Preview.
- Merges to `main` automatically update the Vercel Production deployment.

## Documentation

- `docs/PRD.md` — product scope and business behavior
- `docs/STACKS.md` — approved technology and architecture
- `docs/DESIGN.md` — detailed workflows, permissions, UI, and calculations
- `docs/PLAN.md` — implementation order and remaining work
- `AGENTS.md` — repository instructions for automated agents
