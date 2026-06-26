# Project Minto V2 — Scope

_Last updated: 2026-06-26_

## Vision

A deep, native desktop **rugby league management simulation** — Football Manager
for the NRL, minus the 3D match engine. The player is a head coach / manager:
they pick squads, set tactics, manage contracts, finances, staff, scouting,
youth, and morale, and watch matches play out through a rich 2D/text match view
whose result is genuinely driven by their decisions.

The guiding principle: **management decisions must meaningfully affect results.**
Depth of simulation is the headline feature, not graphics.

## What it is

- A single-player, offline desktop application (Linux first; Windows and macOS later).
- A simulation-first game: the engine models players, matches, development,
  finances, and a living league across many seasons.
- Built as a **Tauri** shell (Rust) hosting a web-tech UI, with the simulation
  engine migrating into Rust over time.

## What it is not (non-goals)

- No 3D or real-time graphical match engine.
- No multiplayer / online play (not in current scope).
- No mobile release (Tauri keeps the door open, but it is not a target).
- Not a web/hosted product — V2 is a distributed desktop app. (The original
  web version, V1, is frozen as a reference; see below.)

## Target platforms

| Platform | Priority | Notes |
|---|---|---|
| Linux (Fedora) | **Now** | Primary dev + first release (AppImage / .deb) |
| Windows | Later | `.exe`/`.msi` via electron-… no — via Tauri/WiX; cross-compile or build on Windows |
| macOS | Later | `.dmg`; signing/notarisation needs a Mac + Apple cert |

## Identity & licensing

**Current use:** real NRL club names, logos, and player identities (as in V1's
"NRL Standard" preset) for maximum authenticity during personal development.

**Direction (leaning):** ship **fictional teams and players by default**, and
provide the real-life NRL data as a separate **"mod"** / data pack that the
user can load. This is the FM-community model and the distribution-safe one —
real names/logos are a licensing grey area, so keeping them out of the base
game removes that risk while still letting anyone who wants authenticity opt in.

The user may adopt the fictional-first + real-life mod split **from the start**
rather than retrofitting it later.

**Architectural implication (important):** design the **data layer to be
swappable from day one** — all club/player/competition identity (names, logos,
colours, rosters) loaded from data, never hard-coded. That makes "fictional
base + real-life mod" a configuration choice, not a rewrite, whichever way the
final call goes.

## Simulation depth target

**Ceiling: full FM-level tactical depth.** The long-term match engine models:

- Set-by-set possession and the six-tackle structure
- Field position / territory
- Ruck speed and its effect on fatigue, line speed, and completion
- Play-by-play events (runs, breaks, kicks, errors, penalties, tries)
- Fatigue and interchange management as live tactical levers
- Late-game decision logic (chasing/protecting a lead, field goals, kick-offs)
- HIA/concussion protocols

This is the destination, reached incrementally. Today's abstract Poisson-based
result model is the starting point we evolve from.

## Architecture (intent)

```
Frontend (web UI)  ──invoke──▶  Rust engine + state  ──▶  SQLite saves
  view layer only                owns all simulation
```

The end-state separates a **pure, fast, typed Rust simulation core** from a
**web-tech view layer**. This mirrors how Football Manager itself is built
(C++ core + separate UI) and is the most future-proof shape for deep simulation.

## Success criteria

- Runs as a polished native app on Linux, then Windows/macOS.
- A season can be simulated quickly even as league depth grows (Rust core).
- Coaching/management choices produce visibly different results over a season.
- Saves are robust and scale to many seasons of history.

## Relationship to V1

V1 (`../project-minto`, the HTML/web version) is **frozen as a working
reference**. No new features are added to V1; V2 is the sole line of
development. V1 remains useful as the source of truth for game logic during the
Rust port and as a fallback.
