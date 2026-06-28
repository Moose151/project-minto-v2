# Project Minto V2 — Roadmap

_Last updated: 2026-06-28 (session 2)_

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

### Phase 2 — Modern build ✅ DONE
- Introduced **Vite** + ES modules; retired the hand-ordered 40-`<script>` chain.
- Established a clean module boundary between **engine** and **UI**.
- All 13 engine files are ES modules that also assign exports to `window` for UI globals.
- 54 modules → single JS bundle (~643 kB). `vite build` clean.
- (TypeScript migration deferred — not yet started.)

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

### B. In-match management ✅ SUBSTANTIALLY COMPLETE
- Continuous event-stream watch-game replaces the old split-phase system; subs and
  tactical changes can happen at any point.
- Coaching panel: attack focus, game intent (Chase/Normal/Protect), offloads
  (Low/Normal/High), defence (Structured/Aggressive), pressure target (specific opponent
  player), penalty preference, game plan — all wired into the match engine with real effects.
- **Pre-match team talk** (5 options): applies morale and cohesion boosts that feed
  directly into `squadStrength()` before kick-off.
- **Post-match press conference** (context-sensitive question + 3–4 choices): applies
  board confidence, player morale, and team cohesion effects after full time.
- AI teams receive random tactical settings each match (`autoSetAIMatchPrefs`).
- Speed slider (0.25–16×), pause/resume, sub queue with add/remove.
- Remaining: deeper real-time score/event reactivity; mid-game momentum swings tied to
  in-match tactical changes retroactively shifting outcome (currently pre-simmed).

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
- ✅ **Board relationship system**: board confidence (`G.coach.conf`) affects contract renewal/sacking at season end. Press conference, team talks, and match results all move confidence. Mid-season board review fires at the halfway round. Coach page shows season target, trajectory, and projected outcome.
- ✅ **Player morale system**: rotation-based morale (dropped players lose morale each week; regular starters gain it). Squad mood visible on training page. One-on-one meetings from inbox. Man Management attribute now meaningfully scales team talk and meeting effectiveness.
- **Lower leagues & expansion:** second-tier competition, promotion/relegation,
  club merger/dissolution, loan system.
- Deeper **youth academy** pathway and youth-grade competition.
- **Transfer/loan window**: mid-season player movement. Low-morale dropped players provide natural hook for transfer requests.
- Deeper **board/finance**: transfer/loan budgets, stadium expansion projects, sponsorship negotiation.
- Better **bye/draw** handling: forced even-team byes, Origin-round blocks,
  multi-bye distribution.

### F. Game feel & UX
- ✅ Training page rewritten — development pipeline, attribute target dropdowns, key attr badges.
- ✅ Season Leaders page rewritten — 5 tabs, prominent top-3 leader cards, per-80-min column.
- ✅ Achievements page rewritten — gold/silver/bronze tiers, category grouping, progress hints.
- ✅ Ladder page rewritten — Win% column, Home/Away split tab with per-team records.
- ✅ Fantasy page rewritten — Team of the Round pitch layout, round scores table, season ladder.
- ✅ Match report grades (A+/A/B+/B/C/D), opponent recent form guide, richer watch-game narrative.
- Remaining: Smoother navigation/transitions; reworked player avatars (current SVG heavy at small sizes); onboarding for new managers.

### G. World simulation realism
- AI clubs making smarter squad/tactical/transfer decisions.
- Richer media, narrative, and reputation systems.
- Long-term league evolution (records, dynasties, rule changes).

---

## Suggested near-term order

> Phases 1 and 2 are complete. Features B, C, and F have substantial progress.

1. **Board/contract system** — `G.coach.conf` exists and the press conference writes to it.
   Surface confidence on the dashboard; wire it to end-of-season renewal/firing; add board
   objectives at season start.
2. **Player morale depth** — expand morale sources (rotation, contract, media, minutes played)
   beyond team talk + press conference. Consider a "squad mood" summary on the training page.
3. **Transfer/recruitment window** — mid-season loan/trade or end-of-season free agency to give
   squad management real in-season decisions.
4. **Phase 3 step 1** (RNG + player gen in Rust) — learn Rust on a safe slice. Requires
   `cargo` on PATH: `. "$HOME/.cargo/env"`.
5. **Phase 3 step 3 + Feature A** (match engine port *with* added depth) — set-by-set possession
   and territory; the payoff of the Rust foundation.
6. Iterate outward through the feature track, with SQLite (Phase 4) once state ownership has
   moved to Rust.

> This roadmap is a living document — re-prioritise per session in HANDOVER.md.
