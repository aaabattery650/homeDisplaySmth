# homeDisplay — Implementation Plan

A wall-mounted family info display: Raspberry Pi 5 → 1080p landscape monitor → Chromium kiosk → Vite + Svelte UI with a PixiJS ambient weather layer, fed by a small local Fastify proxy on the Pi.

## Locked decisions

| Area | Choice | Notes |
|---|---|---|
| Hardware | Raspberry Pi 5, 1920×1080, landscape | Single-tenant, central wall in the home |
| Runtime | Chromium in kiosk mode | Pi 5 has enough GPU for WebGL |
| Frontend | Vite + Svelte 5 | Small runtime, reactive widgets, fast on Pi |
| Animation | PixiJS (WebGL) + custom particle physics | Hand-rolled rain, AABB collision against widget rects |
| Backend | Local Node + Fastify proxy | Holds API keys, exposes clean JSON, proxies the local FlightRadar feed |
| Weather data (v1) | Open-Meteo | Free, no key |
| Layout | Persistent top bar (clock + weather summary) + rotating main stage; full-screen ambient weather canvas behind everything | |
| Rotation | calendar 25s · launches 20s · flights 12s · 1.5s crossfade | Priority-pause if calendar event <30 min or launch <1 hr |
| Quiet hours | 23:00–06:00 | Rotation paused, single muted "night" view, animations dimmed and slowed |

## Project structure

```
homeDisplaySmth/
  PLAN.md
  package.json                # root, runs client + server concurrently
  client/                     # Vite + Svelte
    package.json
    vite.config.js
    index.html
    src/
      main.js
      App.svelte
      lib/
        rotation.svelte.js    # rotation store + scheduler
        time.js               # quiet-hours + time-of-day helpers
        api.js                # fetch wrappers for /api/*
        weatherFx/
          RainSystem.js       # PixiJS particle system
          collision.js        # widget-rect registry for AABB
      widgets/
        topbar/
          Clock.svelte
          WeatherSummary.svelte
        slides/
          Slide.svelte        # crossfade wrapper
          CalendarSlide.svelte
          LaunchesSlide.svelte
          FlightsSlide.svelte
      styles/
        tokens.css            # colors, type scale, spacing, easing
        global.css
  server/                     # Fastify proxy
    package.json
    src/
      index.js
      routes/
        weather.js            # GET /api/weather?lat=&lon= → Open-Meteo
```

Vite dev proxies `/api/*` → `http://localhost:8787` so the browser never sees CORS in dev. In production the server can serve the built `client/dist` directly.

## Build sequence

### Phase 1 — vertical slice (this work)
1. Root scaffolding + `concurrently` dev script
2. Server: Fastify boot, `/health`, `/api/weather` proxying Open-Meteo
3. Client: Vite + Svelte 5 scaffolding, design tokens, layout shell
4. PixiJS background canvas + RainSystem + collision registry
5. Top-bar widgets: Clock, WeatherSummary (live data through the proxy)
6. Rotation engine + stub Calendar / Launches / Flights slides
7. Verify `npm run dev` brings the whole thing up

### Phase 2 — real data widgets (later)
- **Calendar:** Google Calendar OAuth in the proxy, render next 3–5 events
- **Launches:** Launch Library 2 (free, no key) — next 1–3 launches with countdown
- **Flights:** local FlightRadar / dump1090 / readsb JSON feed on the LAN

### Phase 3 — polish (later)
- Event-driven priority overrides (a flight overhead claims focus briefly, etc.)
- Additional weather states: snow, wind streaks, clear-sky particles, lightning flashes
- Time-of-day palette shifts (warm dawn/dusk, cool blue night, neutral midday)
- Boot-on-Pi: systemd unit + Chromium kiosk autostart, screen-blanking suppression

## Non-goals (for now)

- Mobile or responsive layout — single 1080p landscape target
- User-facing settings UI — config is code-level for v1
- Multi-user accounts — single-household device
- Auth on the local proxy — it's bound to localhost on the Pi
