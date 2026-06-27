# Project Minto V2 — Roadmap

_Last updated: 2026-06-27_

Two tracks run in parallel: a **technical track** (the Tauri/Rust migration)
and a **feature track** (deepening the game). The agreed priority is to lay the
**Rust engine foundation first**, then build feature depth on top of it.

Each phase keeps the game fully playable.

---

## Technical track — the migration

### Phase 1 — Desktop shell ✅ DONE
- Tauri shell hosts the existing web UI unchanged.
- Save/load handled by Rust commands (`list_saves`, `load_save`, `write_save`,
  `delete_save`) writing JSON to the OS app-data folder.
- Frontend auto-detects Tauri; falls back to the HTTP API in a browser.
- Wayland rendering crash fixed at startup.

### Phase 2 — Modern build
- Introduce **Vite** + ES modules; retire the hand-ordered 40-`<script>` chain.
- Establish a clean module boundary between **engine** and **UI**.
- (Optional, incremental) begin adopting **TypeScript** with `allowJs`, typing
  the `G` game-state shape first.

### Phase 3 — Rust simulation core ← **first priority after Phase 1**
Port the engine into a Rust crate, one self-contained system at a time, each
validated against the JS output before the JS version is retired.

1. **RNG + player generation** (`01-rng.js`, `03-players.js`) — small, pure,
   trivially validated. The Rust learning on-ramp.
2. **Team build, fixtures, selection** (`04-teams.js`, `06-selection.js`).
3. **Match engine** (`07-match.js`) — the heart; ported alongside the depth
   work in the feature track below.
4. **Progression, calendar, finals, offseason** (`08`–`11`).
5. Rust becomes the owner of game state; the frontend calls into it via Tauri
   commands and renders returned state.

### Phase 4 — Data & persistence
- **SQLite** saves (relational, scales to many seasons) replacing JSON blobs.
- Rust owns all state; JS is a pure view.
- **Data-driven identity** (see cross-cutting principle below) matures into a
  full **mod / data-pack system**: fictional teams/players ship as the base
  game; a loadable real-life NRL pack provides authentic names/logos/rosters.

> **Cross-cutting principle — data-driven identity from day one.** All club,
> player, and competition identity (names, logos, colours, rosters) must come
> from data, never hard-coded. The leaning is to ship **fictional by default**
> with the **real-life NRL set as an optional mod**. Build every system to read
> identity from data so this split is a configuration choice, not a rewrite —
> regardless of which way the final call goes (see SCOPE.md).

### Phase 5 — Distribution
- Windows (`.msi`/`.exe`) and macOS (`.dmg`) builds.
- App icon/branding, auto-update consideration, release packaging.

---

## Feature track — deepening the game

Inherited feature set from V1 is extensive and stays (player system, squad &
team sheet, recruitment & contracts, staff & scouting, club & finance,
pre-season, achievements/history, calendar/fatigue, inbox, finals, etc.). The
roadmap below is about **new depth**, prioritised toward the FM-level goal.

### A. Match engine depth (the headline — built during Phase 3 port)
Target: **full FM-level tactical depth**.
- Set-by-set possession and the six-tackle (0–5) structure.
- Field position / territory tracking.
- Ruck speed as a factor in fatigue, line speed, and completion rate.
- Play-by-play event model (runs, line breaks, offloads, kicks, errors).
- Attacking channels and try sources: middle, left edge, right edge, kicks,
  offloads, repeat sets, and key-player involvement.
- Defensive vulnerability model: metres conceded by channel, edge breaks,
  missed tackles, ruck speed allowed, kick pressure, and fatigue late in halves.
- Engine-tracked interchanges/substitutions (not just UI), with fatigue making
  bench rotation a real lever.
- Late-game decision logic: chasing vs protecting a lead, field-goal seeking,
  short kick-offs, 20m taps, scrums after knock-ons.
- HIA / concussion protocol: Cat 1 (out for match + next), Cat 2 (15-min
  assessment, return if cleared).
- Live feed surfaces tackle count, field position, possession, sub events.

### B. In-match management
- Mid-game pause to make substitutions/tactical changes during the second half
  (V1 already does half-time decisions; extend to live).
- Richer in-game tactical responses to momentum, score, weather, fatigue.
- Live tactical switches: middle/left/right attacking focus, tempo, offload
  risk, field-position kicking, expansive own-half play, defensive aggression,
  rush pressure on a key playmaker, and targeted big-hit pressure.
- Late-game intent presets: protect lead, manage territory, chase points,
  field-goal setup, or controlled possession.
- First tactical switch is live: attacking focus can be set pre-match from the
  Tactics page or Match Day, and it influences expected tries, run distribution,
  metres, line-break chance, kicking volume, and error risk.

### C. Tactical intelligence and pre-match analysis
- Wednesday staff report for the upcoming opponent, generated from coaching and
  scouting staff ratings plus available data.
- Report accuracy depends on staff quality: weak staff can miss key players,
  misread attacking tendencies, or overstate vulnerabilities.
- Report includes expected lineup, key players, attacking channels, scoring
  methods, vulnerable defensive channels, kick/repeat-set threat, fatigue
  patterns, and suggested matchup issues.
- Analysis becomes actionable: swap a defender onto a strike centre, target a
  halfback/five-eighth in defence to tire them, rush a playmaker, focus attack
  at a weak edge, dominate the middle, or use kicks to pin a weak backfield.
- Reports and tactical choices feed directly into the match engine, where player
  attributes, suitability, fatigue, weather, staff accuracy, and opposition
  counters determine whether the plan works.
- First slice implemented: Wednesday report stores `G.matchIntel`, appears in
  inbox, links to Tactics, and quick-applies attacking focus.
- Report copy should use real analyst context instead of game ratings: league
  ranks for middle metres, edge scoring, defensive vulnerability, player leader
  notes such as tackle-bust leaders, and clear caveats when a claim is staff
  modelled rather than directly tracked.
- Analysis presentation should feel like a real staff packet: readable inbox
  message pane first, then later charts/tables/graphics for channel tendencies,
  player leaders, scoring sources, and conceded zones once the engine tracks
  those directly.
- Team-page diagnostics view: show attacking and defensive output/weakness by
  middle, left edge, right edge, back three/backfield (wingers + fullback), and
  spine (fullback + halves + hooker). Include metres, tries, line breaks,
  missed tackles, errors, kick pressure, ruck speed, territory, and scoring
  involvement as the engine begins tracking them.
- Add **combination chemistry** ratings for player groups: halves pairing,
  hooker/halves, spine, left edge, right edge, middle rotation, back three, and
  full-team cohesion. Playing together raises chemistry; low chemistry increases
  timing errors and defensive misreads, while high chemistry improves execution.
- First diagnostics slice implemented: club modals show channel attack/defence
  ratings, channel stat output, and persisted combination chemistry that grows
  when groups keep playing together. Remaining work is wiring chemistry into
  match-engine execution/misread outcomes and adding richer channel telemetry as
  the set-by-set engine lands.

### D. Representative & international depth
- In-season Test fixtures/windows (V1 has State of Origin + a post-season
  international window already).
- Coach representative-job offers and dual-role management.

### E. Management breadth
- **Lower leagues & expansion:** second-tier competition, promotion/relegation,
  club merger/dissolution, loan system.
- Deeper **youth academy** pathway and youth-grade competition.
- Deeper **board/finance**: expectations, transfer/loan budgets, stadium
  expansion projects, sponsorship negotiation.
- Better **bye/draw** handling: forced even-team byes, Origin-round blocks,
  multi-bye distribution.

### F. Game feel & UX
- Smoother navigation, transitions, and match-view presentation.
- Reworked/simplified player avatars (current SVG is heavy at small sizes).
- Onboarding for new managers; clearer surfacing of how decisions affect results.

### G. World simulation realism
- AI clubs making smarter squad/tactical/transfer decisions.
- Richer media, narrative, and reputation systems.
- Long-term league evolution (records, dynasties, rule changes).

---

## Suggested near-term order

1. **Phase 2** (Vite + module boundary) — makes the Rust port tractable.
2. **Phase 3 step 1** (RNG + player gen in Rust) — learn Rust on a safe slice.
3. **Phase 3 step 3 + Feature A** (match engine port *with* added depth) — the
   payoff: a deeper, faster, Rust-powered match engine where decisions matter.
4. **Feature C foundation** — staff-generated Wednesday opponent reports,
   backed by real match tendencies and imperfect staff accuracy.
5. **Feature B tactical controls** — make the report actionable before and
   during matches with visible trade-offs.
6. Iterate outward through the feature track, with SQLite (Phase 4) once state
   ownership has moved to Rust.

> This roadmap is a living document — re-prioritise per session in HANDOVER.md.
