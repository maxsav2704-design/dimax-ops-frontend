# Frontend Production Checklist

## Env contract

Required:

- `NEXT_PUBLIC_API_BASE_URL` must point to the production API

Optional compatibility alias:

- `VITE_API_BASE_URL`

Rules:

- if both `NEXT_PUBLIC_API_BASE_URL` and `VITE_API_BASE_URL` are set, they must match
- production API URL must be `https`
- production API URL must not point to `localhost` or `127.0.0.1`

Validate before deploy:

```bash
node scripts/validate-production-env.mjs --env-file .env.production.local
```

Or through npm:

```bash
npm run check:env:production -- --env-file .env.production.local
```

Starter example:

- `.env.production.example`

## CI and branch protection

Protected branch `main` should require:

- `Frontend Quality Gate / quality-gate`
- `Installer Quality Gate / quality-gate`

## Release smoke

After deploy:

1. open the login page
2. verify API-backed auth works
3. open installer workspace
4. open installer schedule
5. open one project details page

Release process source of truth:

- `../RELEASE_TEMPLATE.md`
- `../POST_DEPLOY_SMOKE.md`
