# AGENTS.md

Guidance for AI coding agents and human contributors working in this repository.

## What this project is

A **wall-mounted family information display**: Raspberry Pi 5 + 1080p landscape monitor, running **Chromium in kiosk mode**, showing a single full-screen UI that aggregates live data (see `specs.md` for the product vision).

**Authoritative product requirements** live in `specs.md`. **Implementation decisions and phase plan** live in `PLAN.md`. This file is for **how to work in the repo**, not a duplicate of the full spec.

## User priorities (from the spec)

- The owner cares most about **what appears on screen** and the **UI/UX**; language/framework is secondary.
- Features may be **shipped incrementally** — it is fine to stub or defer widgets and revisit later.
- **Weather** must be **animated** (e.g. rain in the background) and particles should **interact with other UI** (e.g. bounce off widget areas). This drove the choice of a WebGL-friendly animation layer.
- **Flights** come from a **local** FlightRadar / ADS-B setup on the user’s network — **not** a generic third-party flight API. Design with a local JSON feed in mind.
- Over time, content may **change by time of day**; quiet hours and rotation behavior are part of the plan (`PLAN.md`).

## Current stack (locked)

| Layer | Choice |
| --- | --- |
| Frontend | Vite, **Svelte 5** |
| Ambient weather / physics | **PixiJS** (WebGL), custom particles + AABB-style collision (see `client/src/lib/weatherFx/`) |
| Backend (Pi-local) | **Node** + **Fastify** — proxies weather, will hold API keys and calendar/flight integrations |
| Weather API (v1) | **Open-Meteo** (no key) via `/api/weather` |

**Non-goals for v1** (from `PLAN.md`): no mobile layout, no multi-user or settings UI; local proxy is not user-authenticated (LAN/localhost use).

## Repository layout

```
homeDisplaySmth/
  specs.md              # Product / UX intent
  PLAN.md               # Architecture, phases, structure (some filenames evolved — see below)
  package.json          # root: `dev`, `build`, `start`, `install:all`
  client/               # Vite + Svelte app
    src/
      App.svelte        # Shell: top bar, slides, WeatherFx instance
      main.js
      lib/
        api.js            # fetches to /api/*
        rotation.svelte.js
        time.js
        weatherFx/        # Pixi + collision (e.g. WeatherFx.js, collision.js)
        palettes.js
      widgets/
        topbar/           # Clock, WeatherSummary
        slides/           # Calendar, Launches, Flights + Slide wrapper
      styles/             # tokens.css, global.css
  server/                 # Fastify
    src/
      index.js
      routes/weather.js
```

`PLAN.md` mentions files like `RainSystem.js`; the implementation uses **`WeatherFx.js`** as the main ambient layer. Prefer matching **existing** names in `client/src` when extending behavior.

## Commands

From the **repository root** (after dependencies are installed):

| Command | Purpose |
| --- | --- |
| `npm run install:all` | Install root, `server/`, and `client/` |
| `npm run dev` | Run Fastify and Vite **together** (via `concurrently`) |
| `npm run build` | Build the client to `client/dist` |
| `npm start` | Run the server (production-style; can serve static build as extended in `PLAN.md`) |

**Dev ports** (default): Vite `127.0.0.1:5173`, Fastify `127.0.0.1:8787`. The Vite dev server **proxies `/api` → `http://127.0.0.1:8787`**, so the browser can call same-origin `/api/...` without CORS issues.

Do **not** commit secrets. Use environment variables and local untracked files (e.g. `.env.local`) for keys when those integrations land.

## Conventions for agents

- **Prefer the smallest change** that meets the request; do not refactor unrelated code or add unsolicited docs.
- **Match existing style** in the file you touch (Svelte 5 runes, module layout, CSS tokens in `styles/tokens.css` where appropriate).
- **Pi-class constraints**: keep the client bundle and runtime reasonable; avoid heavy dependencies without need. Target **1920×1080 landscape** only unless the spec changes.
- **Physics / layers**: new “widgets” that should deflect or interact with weather should register geometry through the same collision approach used in `lib/weatherFx/` rather than ad-hoc one-offs.
- **Data flow**: new backend routes belong under `server/src` with small route modules; client calls them via `api.js` or sibling helpers, not hard-coded full URLs in components.

## Parallel work (multiple people or agents)

To avoid painful merges:

- Use **separate branches per feature** and integrate from `main` often (`merge` or `rebase` — team preference).
- **Coordinate ownership** of hot files (`App.svelte`, `package.json`, shared CSS) or merge frequently in tiny slices.
- Optional: **`git worktree`** for two checkouts of the same repo on different branches if you need two working trees simultaneously.
- When adding dependencies or changing ports, **document in the PR** so others are not surprised.

## Related files

- `specs.md` — what the display should do for the family.
- `PLAN.md` — architecture, build phases, rotation timings, quiet hours.
- `CLAUDE.md` — additional notes for Claude Code (may be partially historical; if it conflicts with code or `PLAN.md`, **trust the repo and `PLAN.md`** and fix `CLAUDE.md` when you notice drift).

If you add stack-specific “how to run” or troubleshooting that humans need every time, put it in **`README.md`**; keep **`AGENTS.md`** aimed at **agent and contributor behavior** plus pointers to the rest.
