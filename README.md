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

1. Branch from `main`.
2. Implement the change.
3. Run the smallest relevant local checks.
4. Commit and push the branch.
5. Open or update one pull request.
6. Stop.

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
