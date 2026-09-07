# Demo Review Pack

Use this pack when you need to review the product as a coherent demo, not just as a set of routes.

## Preview Baseline

Start local preview from workspace root:

```powershell
.\workspace.cmd preview-web
```

Verify:

- `http://localhost:5174/welcome`
- `http://localhost:5174/login`
- `http://localhost:8000/health`

## Roles

Admin demo account:

- `company_id`: seeded by workspace bootstrap
- `email`: `admin@dimax.dev`
- `password`: `admin12345`

Installer demo account:

- `company_id`: seeded by workspace bootstrap
- `email`: `installer1@dimax.dev`
- `password`: `installer12345`

## Review Narrative

### 1. Public product entry

Open:

- `/welcome`

Check:

- product promise
- route-driven previews
- trust and readiness signals
- architecture strip
- use-case narratives
- closing CTA

### 2. Secure entry

Open:

- `/login`

Check:

- visual continuity from `/welcome`
- role-safe entry
- language switcher behavior
- overall polish under `en / ru / he`

### 3. Admin control path

Open in order:

1. `/operations`
2. `/reports`
3. `/projects`
4. `/issues`
5. `/journal`
6. `/installers`

Check:

- action density remains readable
- route-to-route consistency
- premium data surfaces
- recovery and drilldown logic stays visually clear

### 4. Installer execution path

Open in order:

1. `/installer`
2. `/installer/calendar`
3. `/installer/projects/<id>`

Check:

- priorities are obvious
- issue continuity is preserved
- schedule and project context feel fast and field-ready

## Screenshot Order

Recommended screenshot set:

1. `welcome`
2. `login`
3. `operations`
4. `reports`
5. `projects`
6. `issues`
7. `journal`
8. `installers`
9. `installer-workspace`
10. `installer-calendar`
11. `installer-project`

## Naming

Use this pattern:

- `01-welcome-desktop.png`
- `02-login-desktop.png`
- `03-operations-desktop.png`

And mobile if needed:

- `01-welcome-mobile.png`

## Final Gate

Before calling the demo pack ready:

- `/welcome` returns `200`
- `/login` returns `200`
- frontend build passes
- language switcher works
- admin and installer routes open after login
