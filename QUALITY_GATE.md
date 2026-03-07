# Frontend Quality Gate

## CI workflows

This repository now exposes two GitHub Actions gates:

1. `Frontend Quality Gate / quality-gate`
2. `Installer Quality Gate / quality-gate`

## What they cover

`Frontend Quality Gate / quality-gate`:

- `npm ci`
- `npm run test`
- `npm run build`

`Installer Quality Gate / quality-gate`:

- installer-focused unit/integration tests
- strict Playwright installer E2E with required secrets

## Branch protection recommendation

For branch `main`, require both checks:

- `Frontend Quality Gate / quality-gate`
- `Installer Quality Gate / quality-gate`

This gives one gate for general web health and one gate for the installer flow that depends on external E2E credentials.

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
