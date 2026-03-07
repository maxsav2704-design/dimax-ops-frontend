# DIMAX Operations Suite Frontend

Web frontend for the DIMAX Operations Suite.

## Scope

This repository is the shipped web client for:

- installer workspace
- installer schedule/calendar
- installer project flow
- admin-facing web surfaces already integrated in the current stack

The current production baseline is web-first. Mobile exists as a separate repository and is not required to run the released installer flow.

## Stack

- Next.js
- React
- TypeScript
- Tailwind
- Vitest
- Playwright

## Key commands

Install dependencies:

```bash
npm ci
```

Run locally:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm run start
```

## Quality gates

Main checks:

```bash
npm run test
npm run build
```

Installer-focused checks:

```bash
npm run test:installer
npm run test:e2e:installer
npm run test:e2e:installer:strict
```

Local strict installer gate with env file:

```bash
npm run test:e2e:installer:strict:local
```

See `TESTING.md` for the full bootstrap and local flow.

## Environment

The frontend expects an API base URL in environment configuration.

Use `.env.example` as the starting point for local setup.
Use `.env.production.example` as the starting point for production setup.

For strict installer E2E, use `.env.e2e.local` with valid installer credentials and company identifiers.

Validate production env before deploy:

```bash
npm run check:env:production -- --env-file .env.production.local
```

## Repository role

This repository owns frontend code only.

- backend lives in `dimax-ops-backend`
- mobile lives in `dimax-ops-mobile`
- workspace orchestration lives in `dimax-ops-workspace`
