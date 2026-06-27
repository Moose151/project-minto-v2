# Project Minto V2 — Scope

_Last updated: 2026-06-27_

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

### Tactical intelligence and coach agency

The player should feel like their coaching decisions directly change matches,
not just squad strength. The sim should support a loop where staff analysis
identifies tactical opportunities, the coach chooses a plan, and the match
engine rewards or punishes that plan based on player attributes, opposition
quality, fatigue, weather, form, and execution.

**Pre-match analysis:** Each Wednesday, coaching and scouting staff provide a
report on the upcoming opponent. The report's accuracy depends on staff ratings
and scouting coverage, so weak staff may miss threats, misread tendencies, or
overstate vulnerabilities. Strong staff should surface useful details such as:

- expected opponent lineup and late injury/selection risks
- key players and primary attacking channels
- where the opponent scores points: through the middle, left/right edge,
  kicks, offloads, repeat sets, or through a specific playmaker/strike player
- where the opponent concedes: metres through the middle, edge breaks, kicks,
  ruck speed, fatigue late in halves, or repeat defensive errors
- tactical matchups, such as a strike left centre facing the coach's right
  centre, or a halfback who can be tired by forcing defensive involvements

**Tactical decisions from analysis:** The coach can respond by changing lineup,
roles, and match instructions before kick-off. Examples include:

- selecting a more defensively sound centre to mark a dangerous strike centre
- focusing attack through the middle if the opposition concedes middle metres
- shifting attack to the left/right edge when the opponent defends that side
  poorly
- instructing back-rowers to hit gaps, halves to play short sides, or middles
  to chase fast play-the-balls
- targeting a halfback/five-eighth in defence to fatigue them
- rushing a key playmaker to reduce decision time, with the trade-off that a
  mistimed rush can create an overlap

**In-match tactical control:** During matches, the coach can adapt when the
original plan is failing or the game state changes. Tactical levers should
include tempo, risk, territory, and targeting:

- shift focus from middle to left/right edge, or vice versa
- play calm and patient, waiting for opportunities, or play erratically/high
  risk when chasing points
- protect a narrow lead by kicking for field position, finding corners, and
  pinning the opponent inside their own 20
- chase the game by increasing offloads, expansive shapes, short-side raids,
  and broken-play creation
- attempt more or fewer offloads
- try to force errors with bigger defensive contact, accepting a higher
  penalty/missed-tackle risk
- be more expansive in the team's own half with two or three passes from the
  ruck, accepting turnover risk
- react to an opponent having a huge game by assigning pressure, big-hit, or
  reduced-time instructions

The implementation target is not that every instruction is always correct. The
target is that the match engine resolves these trade-offs credibly: good plans
with suitable players should improve the odds; poor plans, unsuitable players,
bad scouting, fatigue, or elite opposition should expose the coach.

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
