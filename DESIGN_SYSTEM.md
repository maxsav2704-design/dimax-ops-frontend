# Design System

## Direction

DIMAX frontend is intentionally positioned as an operational product, not a generic SaaS dashboard.

The visual language should feel:

- controlled
- premium
- calm under pressure
- fast to scan
- serious enough for field and ops work

## Core Decisions

### Typography

- body: `Instrument Sans`
- display/headings: `Space Grotesk`

Use display typography for:

- page titles
- hero statements
- major section headings

Use body typography for:

- controls
- data tables
- operational descriptions

### Color

Primary direction:

- warm ivory background
- dark ink/navy structural contrast
- burnt-orange accent

Avoid:

- purple-first styling
- flat monochrome admin panels
- neon/crypto aesthetics

Accent color is for:

- primary actions
- active state emphasis
- controlled visual energy

Not for:

- flooding whole screens
- replacing hierarchy

### Surfaces

Primary reusable layers:

- `page-hero`
- `surface-panel`
- `surface-subtle`
- `metric-chip`
- `btn-premium`

Rules:

- page-level framing goes through `page-hero`
- functional sections go through `surface-panel`
- secondary controls/scope blocks go through `surface-subtle`
- short operational signals go through `metric-chip`

### Motion

Motion is restrained and product-grade.

Use:

- `motion-page`
- `motion-stagger`
- hero settle animation

Do not use:

- decorative bouncing
- heavy parallax
- unrelated micro-animation spam

Motion must support orientation and hierarchy, not spectacle.

## Screen Priorities

The strongest screens in the system should remain:

1. `Login`
2. `Operations`
3. `Reports`
4. `Installer Workspace`
5. `Installer Project`

These are the product identity screens. New work should preserve that level.

## Component Guidance

### Buttons

- primary actions use `btn-premium`
- secondary actions stay quieter but still tactile
- destructive actions keep strong contrast, not loud decoration

### Tables and data lanes

- use stronger section framing than plain white tables
- alternate background subtly where helpful
- preserve operational readability first

### Cards

- cards should feel layered, not flat
- important cards can use gradient-backed panels
- avoid random card styles per page

## Non-goals

This system is not trying to look like:

- a crypto dashboard
- a startup template
- a playful consumer app

The target is a premium operations suite with clear authority.
