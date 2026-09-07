# DIMAX Design System

This document is the implementation contract for the current DIMAX Operations Suite UI. The source references are the approved files in `C:\Users\Hi-tech\Downloads\дизайн`, especially the brand codex, component library, dashboard, projects, calendar, reports, issues, and installer templates.

## Product Direction

DIMAX is an operational control system for door installation. The interface must feel strict, compact, calm, and easy to scan during repeated daily work. It is an application, not a marketing site.

The UI must support these business boundaries:

- administrators see all projects, doors, installers, prices, reports, sync errors, and audit data;
- installers see only assigned projects, doors, tasks, calendar events, completed work, and their own earnings;
- client prices and margins are never shown in installer surfaces;
- offline and synchronization state must always be understandable;
- photos and signatures are optional evidence, not mandatory workflow gates.

## Typography

- UI and prose: `Rubik` 400, 500, and 600;
- identifiers, dates, times, counts, prices, and percentages: `JetBrains Mono`;
- `Noto Sans Hebrew` and system fonts are fallbacks;
- letter spacing is always `0`;
- compact panels use compact headings; hero-size text is reserved for real page heroes.

## Color

- canvas: neutral light gray;
- surfaces: white and subtle neutral gray;
- structural text and shell: near black;
- DIMAX yellow `#ffc83a`: primary action, active selection, focus, and restrained emphasis;
- blue: in-progress and informational state;
- green: completed and healthy state;
- orange: warning and waiting state;
- red: problem and destructive state;
- purple: draft or exceptional catalog state only.

All application colors must come from CSS variables in `src/index.css` and Tailwind mappings in `tailwind.config.ts`. Do not place brand hex values directly in page components.

## Shape And Density

- standard cards and work panels use an 8 px radius or less;
- pills are reserved for statuses, compact filters, and primary/secondary command buttons;
- larger radii are allowed only for the outer application/login frame defined by an approved reference;
- page sections are unframed layouts or full-width bands;
- cards are for repeated records, dialogs, and genuinely bounded tools;
- regular work cards do not use decorative shadows; shadows indicate overlays or elevated transient UI;
- controls use stable heights and widths so loading, counts, and labels do not shift layout.

## Interaction

- use Lucide icons for known actions;
- icon-only buttons require an accessible name and tooltip where the meaning is not obvious;
- tabs, toggles, dialogs, and menus expose their semantic state;
- all interactive controls have visible keyboard focus;
- destructive actions require explicit confirmation;
- filters that define a shareable view should be reflected in the URL;
- loading, empty, offline, stale, and error states are required parts of each workflow.

## RTL And Data

- use logical `start`/`end`, `ps`/`pe`, and `border-s`/`border-e` properties;
- keep identifiers, phone numbers, dates, prices, and technical codes in isolated LTR spans;
- tables and door matrices must remain horizontally usable on narrow screens;
- long user or imported text must wrap or truncate without changing the surrounding layout.

## Canonical Components

- application shell: `DashboardLayout`, `AppSidebar`, `InstallerShell`;
- page heading: `DimaxPageHeader`;
- KPI and operational cards: components under `src/components/dimax` and `src/components/dashboard`;
- status rendering: `StatusBadge` plus `src/lib/status-tokens.ts`;
- primitives: components under `src/components/ui`;
- mobile design tokens and shared primitives: `mobile/src/lib/theme.ts` and `mobile/src/components/mobile-ui.tsx`.

## Screen Priorities

1. Login and access recovery
2. Admin dashboard and operations monitor
3. Projects list and project door matrix by floor
4. Calendar and selected-event panel
5. Issues and recovery workflows
6. Reports and earnings ledger
7. Installer projects, project detail, calendar, earnings, and sync queue

## Prohibited Drift

- old ivory, navy, burnt-orange, purple-first, or gradient-led themes;
- decorative card stacks, oversized headings inside tools, or marketing composition;
- hardcoded status colors in page components;
- hidden sync/offline state;
- mandatory photo/signature gates;
- client price or margin in installer UI;
- new logistics, customer portal, or billing flows without an approved business requirement.

## Verification

For visual changes run:

```powershell
npm run lint
npm run test
npm run build
npm run test:e2e:visual-brand
```

The visual smoke requires the configured preview and backend. Review generated desktop and mobile screenshots for overflow, overlapping controls, stale overlays, inaccessible dialogs, and RTL regressions.
