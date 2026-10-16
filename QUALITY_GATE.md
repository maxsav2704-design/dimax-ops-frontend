# Frontend Quality Gate

## CI workflows

This repository now exposes two GitHub Actions gates:

1. `Frontend Quality Gate / quality-gate`
2. `Installer Quality Gate / quality-gate`

## What they cover

`Frontend Quality Gate / quality-gate` runs `npm ci`, then `npm run quality-gate`, which is:

- `npm run lint`
- `npm run test:production-env` — production env contract
- `npm run test:standalone` — standalone runtime contract
- `npm run test:repo-config` — ESLint ignores, Playwright trace policy
- `npm run test:security-headers` — `next.config.mjs` headers
- `npm run test:type-scale` — `text-[Npx]` ratchet against `scripts/type-scale-baseline.json`
- `npm run test:i18n-helpers` — no hand-rolled `(en, ru, he)` helpers; use `useCopy()` / `pickLocale()`
- `npm run test:coverage-contract` — every Vitest and Playwright file is discovered
- `npm run test` — Vitest in batches (`scripts/run-vitest-gate.mjs`)
- `npm run build`

After the gate the workflow installs Chromium and runs the mocked Playwright specs (they stub the API with `page.route()`, no backend or secrets): execution-time correction, missing factory price, factory price approval, work price approval, factory price management, reconciliation and activation.

Coverage is not part of the gate (a full run takes about ten minutes on the dev host). Run it on demand:

```bash
npm run test:coverage
```

The report lands in `test-results/coverage` (git-ignored): `text-summary` in the terminal, `html` and `lcov` on disk.

`Installer Quality Gate / quality-gate`:

- installer-focused unit/integration tests
- strict Playwright installer E2E with required secrets

## Branch protection recommendation

For branch `main`, require both checks:

- `Frontend Quality Gate / quality-gate`
- `Installer Quality Gate / quality-gate`

This gives one gate for general web health and one gate for the installer flow that depends on external E2E credentials.

Normal workflow rule:

- merge through PR only
- wait for both required checks
- do not use admin bypass for routine changes

## Local equivalents

General frontend gate:

```bash
npm run quality-gate
```

Installer gate:

```bash
npm run quality-gate:installer:strict
```

Workspace shortcuts:

```powershell
.\workspace.cmd test-frontend-gate
.\workspace.cmd installer-gate
```

Merge checklist reference:

- `../PR_MERGE_CHECKLIST.md`
