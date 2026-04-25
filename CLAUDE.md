# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repo is **pre-implementation**. It currently contains only `specs.md`, `README.md`, `LICENSE`, and `.gitattributes` — no source code, no build system, no tests, no framework yet. Treat early tasks as greenfield: design choices (language, framework, runtime) are still open per the spec.

## Project goal (from `specs.md`)

A wall-mounted information display driven by a Raspberry Pi + monitor, placed centrally in the user's home. The screen aggregates several live data sources into a single view:

- Current time and the day's weather (weather must be **animated** — e.g. rain particles in the background that **interact with / bounce off other widgets on the page**)
- Upcoming rocket launches (SpaceX, NASA, etc.)
- Flights currently overhead, sourced from the user's local FlightRadar antenna
- Upcoming kids' classes / extracurriculars from Google Calendar

The spec explicitly states the user is **agnostic about language/framework** and is currently most interested in deciding **what the screen shows** and **the UI**. Some data sources are intended to be **added incrementally** — it's acceptable to drop later widgets from an initial build and revisit. The display should also be able to **change content based on time of day** over time.

## Working in this repo

- When proposing structure or tooling, prefer the smallest viable setup that lets the user see the UI on a Pi-class device. Don't scaffold large frameworks unless the user agrees on a direction.
- The animated-weather-with-physics requirement (rain bouncing off widgets) is a meaningful constraint on the rendering choice — surface this when framework/stack decisions come up rather than picking a stack that makes it awkward.
- The flight feed is **local** (the user's own FlightRadar antenna), not a third-party API — design data flow accordingly.
- No commands to document yet (no `package.json`, `Makefile`, `pyproject.toml`, etc.). Update this section once a stack is chosen.
