# Screenshot Routes

Use these routes for design review, demos and regression screenshots.

## Admin

Login:

- `/login`

Core control:

- `/`
- `/operations`
- `/reports`
- `/projects`
- `/issues`
- `/journal`
- `/installers`

## Installer

Core field flow:

- `/installer`
- `/installer/calendar`
- `/installer/projects/<id>`

## Review Order

Recommended visual review order:

1. `Login`
2. `Operations`
3. `Reports`
4. `Projects`
5. `Issues`
6. `Journal`
7. `Installers`
8. `Installer Workspace`
9. `Installer Schedule`
10. `Installer Project`

## What to check

For every route, check:

1. hero hierarchy
2. spacing rhythm
3. action clarity
4. card depth consistency
5. focus/hover states
6. empty/loading/error visual quality
7. mobile/desktop resilience

## Local Review

Preferred local preview:

```bash
cd ..
..\\workspace.cmd preview-web
```

Frontend preview URL:

- `http://localhost:5174/login`

Seeded demo credentials are managed by workspace bootstrap.
