# Elite Health Nutrition OS

Elite Health Nutrition OS is a Next.js app that generates personalized nutrition plans and now includes daily progress tracking.

## Stack

- Next.js App Router + TypeScript
- PostgreSQL + Prisma
- NextAuth magic-link auth (Resend)
- BigModel (GLM) for plan generation
- Gamma export integration
- Tailwind CSS + shadcn/ui

## What Changed In This Upgrade

- Async, DB-backed plan generation queue
- Internal job runner route (`/api/internal/jobs/run`) + Vercel cron
- Plan status model (`generating`, `ready`, `failed`)
- Daily progress tracking:
  - `POST /api/progress/check-ins`
  - `GET /api/progress/check-ins`
  - `GET /api/progress/summary`
  - `/progress` dashboard page
- DB-native rate limiting on heavy generation routes
- Structured server logging + analytics event tracking
- Sentry wiring for server/client/edge
- CI workflow with lint, typecheck, tests, build, and gitleaks secret scanning
- Secret placeholders in docs (removed hardcoded keys)

## Environment Variables

Copy `.env.example` to `.env.local` and set values.

Required:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `GLM_5_API_KEY`
- `GAMMA_API_KEY`
- `INTERNAL_JOB_SECRET` (or `CRON_SECRET` on Vercel)

Feature flags:

- `FEATURE_ASYNC_PLAN_PIPELINE=true`
- `FEATURE_PROGRESS_TRACKING=true`

Optional observability:

- `SENTRY_DSN`
- `SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`

## Local Setup

```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

## Quality Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run build
```

## Queue Processing

- Job worker endpoint: `GET/POST /api/internal/jobs/run`
- Requires `Authorization: Bearer <INTERNAL_JOB_SECRET>` or `x-internal-job-secret`.
- `vercel.json` runs this endpoint every minute via cron.

## Notes

- Rotate any previously exposed API keys before production rollout.
- Ensure Vercel cron secret matches internal job secret handling.
- Progress tracking stores one check-in per user per local date (`YYYY-MM-DD`).

