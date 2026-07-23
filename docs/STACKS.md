# Worksite Operations Platform
## Technology Stack

**File:** `STACKS.md`  
**Version:** 1.0  
**Status:** Final  
**Depends on:** `PRD.md` v1.1

---

## 1. Purpose

This document defines the technology choices for Version 1 of the Worksite Operations Platform.

The stack is intentionally small. Every dependency must support a confirmed product requirement. The application will not introduce a separate backend service, microservices, an ORM, message queues, Redis, GraphQL, Kubernetes, or other infrastructure that is unnecessary for this product.

---

## 2. Confirmed Stack

| Area | Choice | Purpose |
|---|---|---|
| Application framework | Next.js 16, App Router | Full-stack web application |
| Language | TypeScript, strict mode | Application and shared business logic |
| Package manager | npm | Dependency management and project scripts |
| UI foundation | shadcn/ui | Accessible application components owned in the repository |
| Styling | Tailwind CSS configured by shadcn | Responsive layout and component styling |
| Authentication | Clerk | CEO and Foreman sign-in and session management |
| Database | Supabase Postgres | All operational and historical application data |
| File storage | Supabase Storage | Private worker photos and documents |
| Database SDK | `@supabase/supabase-js` | Typed Postgres Data API and Storage access |
| Database changes | Supabase SQL migrations | Version-controlled schema, policies, and functions |
| Generated database types | Supabase CLI | TypeScript types generated from the database schema |
| Offline data | IndexedDB | Pending attendance actions and synchronized project data |
| PWA support | Serwist | Installable foreman experience and offline application shell |
| Hosting | Vercel | Next.js deployments and environment management |

Neon is not part of the Version 1 stack. Supabase is the single platform for database and file-storage responsibilities.

---

## 3. Application Architecture

Version 1 is one Next.js application.

```text
Browser / installed PWA
        |
        | Clerk session
        v
Next.js application
  - Server Components
  - Server Actions
  - Route Handlers
  - Offline synchronization endpoint
        |
        | Clerk token + Supabase RLS
        v
Supabase
  - PostgreSQL
  - Private Storage buckets
```

There is no separately deployed API server.

### 3.1 Server-first access

Normal pages load data through Next.js Server Components. Ordinary form mutations use Server Actions. HTTP endpoints are introduced only where a normal form action is unsuitable, including:

- offline attendance synchronization;
- private file upload and download flows;
- import and export operations;
- Clerk webhooks when user synchronization is required.

### 3.2 Browser access

The browser must not receive a Supabase secret key. Client-side Supabase access, when used, must use the publishable key together with the current Clerk session token and remain protected by Row Level Security.

Version 1 should prefer server-side reads and writes. Direct browser database writes are not the default architecture.

---

## 4. Authentication and Authorization

### 4.1 Clerk responsibilities

Clerk manages:

- sign-in;
- sign-out;
- sessions;
- password and account security;
- required multi-factor authentication for Foreman accounts;
- CEO-created or CEO-invited Foreman accounts.

There is no public registration.

### 4.2 Application responsibilities

Supabase stores the application user profile and operational access data, including:

- Clerk user ID;
- application role: `CEO` or `FOREMAN`;
- active/inactive status;
- current project assignment for a Foreman;
- relevant timestamps and audit information.

Clerk proves identity. The application database decides business access.

### 4.3 Supabase integration

Clerk is configured as a Supabase third-party authentication provider. Supabase Row Level Security policies inspect trusted Clerk JWT claims and application data.

RLS must be enabled for all exposed application tables and private Storage objects. It provides database-level defense in addition to checks performed by Next.js.

### 4.4 Authorization rule

Every server mutation must validate both:

1. the signed-in Clerk identity; and
2. the user's active application role and project scope in Supabase.

The UI hiding an action is never sufficient authorization.

---

## 5. Database and Migrations

### 5.1 PostgreSQL ownership

Supabase Postgres is the source of truth for:

- users and roles;
- projects and Foreman assignments;
- workers and worker history;
- project assignments;
- attendance and day types;
- leave;
- rates and food deductions;
- payroll, adjustments, statements, and payments;
- documents and file metadata;
- settings;
- audit logs;
- import records.

### 5.2 No ORM in Version 1

Version 1 does not add Prisma or Drizzle.

The application uses:

- `@supabase/supabase-js` for queries and Storage;
- PostgreSQL functions only for calculations or transactions that genuinely need database atomicity;
- generated `database.types.ts` for type safety;
- small repository functions to prevent query duplication.

An ORM may be reconsidered only if the direct Supabase approach creates demonstrated maintenance problems.

### 5.3 Schema workflow

All schema changes must be stored as SQL files under:

```text
supabase/migrations/
```

The Supabase Dashboard is not the authoritative schema history. Any dashboard-made schema change must be captured in a migration before it is considered complete.

The repository also stores deterministic seed data for local or development use where helpful.

### 5.4 Monetary and time values

- Money is stored as integer sen, not floating-point currency.
- Attendance duration is stored and calculated as integer minutes.
- Calendar dates use the business date in `Asia/Kuala_Lumpur`.
- Event timestamps are stored with timezone information.
- Payroll calculations convert minutes and rates using explicit decimal-safe logic.

---

## 6. Supabase Storage

### 6.1 Private buckets

Version 1 uses private buckets, initially:

```text
worker-photos
worker-documents
```

Files are not publicly accessible.

### 6.2 Database metadata

The application database stores file metadata such as:

- associated worker;
- bucket and object path;
- document type;
- original filename;
- MIME type;
- byte size;
- issue and expiry dates where relevant;
- uploader;
- upload timestamp;
- active or replaced status.

The database does not store the binary file itself.

### 6.3 File authorization

Next.js checks the user's Clerk session and application permission before upload, download, replacement, or deletion. Authorized downloads use a short-lived signed URL or a controlled server response.

The Supabase service-role secret is server-only and should be reserved for trusted administrative operations that cannot use normal user-scoped RLS.

---

## 7. Offline Attendance

Offline capability is limited to the attendance workflow confirmed in `PRD.md`. Other modules remain online-only unless later justified.

### 7.1 Device data

IndexedDB stores only the minimum data necessary for offline attendance:

- the Foreman's assigned project identity;
- a compact synchronized worker list;
- project day type data needed for the attendance screen;
- pending entrance, exit, break, and correction actions;
- synchronization status and failure information.

Sensitive worker documents and payroll data must not be cached for offline use.

### 7.2 Queue model

Each offline action receives a client-generated immutable ID. Synchronization submits actions to a Next.js Route Handler in batches.

The server:

1. authenticates the Clerk user;
2. confirms the Foreman still owns the project;
3. checks whether each action ID was already processed;
4. applies valid actions transactionally;
5. returns per-action success, conflict, or failure results.

This makes retries idempotent and prevents duplicate attendance events.

### 7.3 Conflict behavior

The synchronization implementation follows the PRD rule that the assigned Foreman wins ordinary conflicts for their own project. Records affecting already approved or paid payroll are not silently rewritten; the normal payroll correction lifecycle applies.

### 7.4 PWA

The confirmed implementation is an installable PWA using Serwist to provide the cached application shell and offline attendance entry screen. IndexedDB remains the source of truth for the pending action queue; the service worker is not treated as the business database.

Synchronization runs when the app detects connectivity and may also use browser background synchronization where supported. The visible in-app retry action remains mandatory because browser background-sync support is not universal.

---

## 8. UI and Forms

- shadcn/ui components are copied into and owned by the repository.
- UI primitives should be composed rather than wrapped in an additional internal component framework.
- Forms use native Server Actions where practical.
- Zod validates external and user-submitted data at application boundaries.
- React Hook Form is used only for forms that need complex client-side interactions; it is not mandatory for every form.
- Tables must support mobile alternatives rather than assuming desktop width.
- The application uses responsive layouts for CEO desktop use and Foreman mobile use.

No Redux or general-purpose global state library is included. Local React state and focused context providers are sufficient. Offline attendance state is managed by the IndexedDB repository and synchronization layer.

---

## 9. Import, Export, and Documents

- Excel import/export uses a maintained JavaScript workbook library selected during implementation.
- Imports are parsed and validated on the server.
- Large imports use explicit progress states but do not introduce a queue service in Version 1.
- Payroll statements and payment vouchers are generated from approved payroll snapshots.
- PDF generation should use a server-compatible library selected during implementation; headless browser infrastructure is not added unless ordinary PDF generation proves insufficient.

---

## 10. Testing and Quality

Recommended Version 1 quality stack:

- ESLint for static checks;
- Prettier for formatting;
- Vitest for payroll, attendance, permission, and synchronization business logic;
- React Testing Library for selected interactive components;
- Playwright for critical end-to-end workflows;
- Supabase database tests for important RLS policies and database functions.

Critical automated coverage includes:

- minute-accurate attendance totals;
- normal, overtime, Sunday, and public-holiday rates;
- effective-dated worker rates;
- monthly food deductions;
- late attendance and rate corrections;
- incomplete attendance exclusion;
- one-worker/one-project enforcement;
- Foreman project isolation;
- offline retry idempotency;
- payroll approval and payment transitions.

A full coverage-percentage target is not required. Tests focus on financial, permission, and synchronization risk.

---

## 11. Deployment and Environments

Confirmed deployment model:

- Vercel for the Next.js application;
- one hosted Supabase development project;
- one Supabase production project;
- separate Clerk development and production instances;
- Vercel Preview deployments connected only to development services;
- production secrets available only to the production deployment.

Database migrations are reviewed and applied deliberately. Preview deployments must not create uncontrolled per-branch production database schemas.

---

## 12. Logging and Monitoring

Version 1 keeps observability small:

- structured server logs;
- Vercel deployment and function logs;
- Supabase database and API logs;
- application audit logs for business changes;
- clear client-side synchronization error records.

Version 1 begins with Vercel and Supabase logs only. A third-party error-monitoring service is not part of the initial stack and may be added later only if operational evidence justifies it.

Logs must not contain passwords, Clerk tokens, Supabase secrets, full identity-document numbers, or document contents.

---


## 13. Package and Command Workflow

The project uses npm consistently. Initial setup and component installation use commands such as:

```bash
npx create-next-app@latest
npx shadcn@latest init
npx shadcn@latest add <component>
```

The repository commits `package-lock.json`. CI and production builds use `npm ci` for deterministic installation. Alternative lockfiles must not be committed.

---

## 14. Foreman Account Security

Multi-factor authentication is required for every active Foreman account at launch. Clerk enforces enrollment and sign-in verification. A Foreman who has not completed the required setup cannot access project or worker data.

The CEO account should also use multi-factor authentication, although the mandatory Version 1 rule specifically applies to Foremen. Recovery and account reset actions remain controlled through Clerk and the CEO-managed account process.

---

## 15. Explicitly Excluded Technology

Version 1 does not use:

- Neon;
- Supabase Auth;
- a separate Node.js/NestJS/Express backend;
- Prisma or Drizzle;
- GraphQL;
- Redux;
- Redis;
- message brokers or job queues;
- microservices;
- Docker or Kubernetes for production deployment;
- Supabase Realtime unless a later confirmed workflow requires it;
- Supabase Edge Functions unless a task cannot reasonably run in Next.js;
- public Storage buckets for worker documents;
- native Android or iOS applications.

---

## 16. Final Stack Decisions

The owner confirmed the following Version 1 choices:

1. Vercel hosts the Next.js application.
2. npm is the package manager.
3. The Foreman experience is an installable PWA.
4. Development uses a hosted Supabase development project rather than requiring the full local Docker stack.
5. Initial monitoring uses Vercel and Supabase logs only.
6. Foreman accounts require multi-factor authentication.

`STACKS.md` is complete. New technology should not be introduced unless it solves a confirmed requirement that the current stack cannot reasonably satisfy.

