# Project Minto V2 — Roadmap

_Last updated: 2026-06-28 (session 3)_

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
- ✅ **Golden point extra time**: Finals draws go to golden point; winner determined by best kicker attributes; adds 1 point to winner's score; live feed shows "SCORES LEVEL" narrative then FG event then FULL TIME at min:83.
- ✅ **Sin bin / send-off system**: Each match chunk (0–40, 40–60, 60–80) has a chance to sin bin a player from either side (~9% per team per chunk); sin bin reduces team's expected tries for that chunk and boosts opponent; send-offs (rarer) last the full remaining game. Events show 🟨/🟥 in the live feed with named player, reason, and return event.

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
- ✅ **Board relationship system**: board confidence (`G.coach.conf`) affects contract renewal/sacking at season end. Press conference, team talks, and match results all move confidence. Mid-season board review fires at the halfway round. Coach page shows season target, trajectory, and projected outcome. Board Season Briefing fires at season start with target, cap, confidence sentiment, and contract status.
- ✅ **Player morale system**: rotation-based morale (dropped players lose morale each week; regular starters gain it). Win/loss streak morale (3+ game runs now affect whole squad mood each round). Squad mood visible on training page. One-on-one meetings from inbox. Man Management attribute now meaningfully scales team talk and meeting effectiveness.
- ✅ **Transfer request system**: players with morale < 28 AND 5+ weeks dropped trigger a formal request. Three response options: release, promise game time, or reject (each with distinct morale/confidence effects). Dashboard and squad alerts surface requests immediately.
- ✅ **Player career milestone notifications**: inbox news fires when a player reaches 50/100/150/200/250/300 career games or 25/50/75/100/150 career tries. Milestone inbox action links to contract page if player is expiring, otherwise to player modal.
- ✅ **Rival club interest**: every 3 rounds, expiring-contract players with OVR ≥ 62 have a 45% chance of attracting a named rival club's interest — nudges morale slightly and fires inbox alert. Flag `p._rivalInterestYear` prevents duplicate per season.
- ✅ **Farewell notification on retirement**: when a club player retires in the offseason, an inbox item summarises their career (games, tries, premierships, avg rating) and notes Hall of Fame induction if applicable. Fires before player is deleted from state.
- **Lower leagues & expansion:** second-tier competition, promotion/relegation,
  club merger/dissolution, loan system.
- Deeper **youth academy** pathway and youth-grade competition.
- ✅ **Rival club poaching** (offseason): when your quality expiring players (OVR 60+) go unsigned, AI clubs make specific offers with named rival + salary + years. The contracts screen shows "⚠️ Rival Interest" alerts — match the offer or release the player. Fires a news item for each outcome.
- ✅ **Coach attribute development**: at end of each season, Tactical Coaching, Man Management, Player Development, and Recruitment attrs each grow 1–2 points based on earned criteria (top-4 finish, squad morale health, youth growth, exceeding board expectation). Complementary to the existing manual upgrade system.
- ✅ **Career-threatening injury system**: ACL-type injuries (16+ weeks) have a 30% chance to flag `p.careerThreat`. Fires a named "Career-Threatening" inbox item; boosts offseason retirement probability; clears on return with a "Comeback" good-news item.
- ✅ **Upset alerts**: detects when a bottom-half team (pos ≥ 8) beats a top-4 side by 10+ pts in other matches each round, fires a named "Upset!" news item. Max one per round.
- ✅ **Media pressure storylines**: biweekly narrative news based on coached team's form — 4-game loss streaks, 4-game win streaks in top 4, and being well below expectation late in the season each fire varied-phrase inbox items.
- **Free agent signings** (NRL-accurate): clubs can sign free agents at any time for injury cover; no formal mid-season window. Transfer requests result in release-with-payout or resolution. Build a free agent market page where out-of-contract players are listed and can be approached.
- Deeper **board/finance**: transfer/loan budgets, stadium expansion projects, sponsorship negotiation.
- Better **bye/draw** handling: forced even-team byes, Origin-round blocks,
  multi-bye distribution.

### F. Game feel & UX
- ✅ Desktop app shell/navigation overhaul — persistent grouped sidebar, clearer topbar context, off-season nav fix, darker shared visual system.
- ✅ Shared form/dropdown styling pass — native selects now fit the dark desktop UI and remain readable.
- ✅ Team Sheet desktop rewrite — selection desk with grouped Starting XIII, compact pitch, metrics, bench/reserves, squad pool, and clearer submit/compliance state.
- ✅ Tactics desktop rewrite — match identity coaching desk, opponent report, specialist cards, field position plan, position roles.
- ✅ Match Day pre-match rewrite — fixture hero, metadata strip, action rail, coaching stack, and side-by-side lineups.
- ✅ Training page rewritten — development pipeline, attribute target dropdowns, key attr badges.
- ✅ Season Leaders page rewritten — 5 tabs, prominent top-3 leader cards, per-80-min column.
- ✅ Achievements page rewritten — gold/silver/bronze tiers, category grouping, progress hints.
- ✅ Ladder page rewritten — Win% column, Home/Away split tab with per-team records.
- ✅ Fantasy page rewritten — Team of the Round pitch layout, round scores table, season ladder.
- ✅ Match report grades (A+/A/B+/B/C/D), opponent recent form guide, richer watch-game narrative.
- Active direction: desktop-first UI overhaul. Prioritise dense, clear management screens over mobile compatibility for now.
- ✅ Squad page rewritten — position filter pills with counts, 4-card summary strip (cap/size/availability/alerts), mini-bars for cond/morale, rotation status badges (Out Xw / Xw starter), contract year warnings.
- ✅ Recruitment Squad Needs panel — position depth grid at top of page (squad count vs available, thin/depth/OK colour-coding), position pills with available-player counts on Browse and Free Agents tabs.
- ✅ Watch-game coaching panel — half tracking (1st/2nd label), live situation strip ("Leading by X" / "Trailing by X — chase?" / "Level"), squad mood snippet at HT showing starting 13 average morale.
- ✅ **Live match stats strip** — inline strip below scoreboard shows tries, possession %, line breaks, and errors for each side updated in real time as events fire. DOM-updated in place (no full re-render).
- Remaining: smoother transitions, reworked player avatars (current SVG heavy at small sizes), onboarding for new managers.

### G. World simulation realism
- AI clubs making smarter squad/tactical/transfer decisions.
- Richer media, narrative, and reputation systems.
- Long-term league evolution (records, dynasties, rule changes).

---

## Suggested near-term order

> Phases 1 and 2 are complete. Features B, C, E, and F have substantial progress.

1. **Continue desktop UI overhaul** — watch-game panel, Recruitment, and Squad done. Remaining: smoother transitions, avatar quality, onboarding.
2. **Free agent market page** — list out-of-contract players; allow signing for injury cover at any time (NRL-accurate, no formal window). Transfer requests provide the natural hook.
3. **Phase 3 step 1** (RNG + player gen in Rust) — learn Rust on a safe slice. Requires
   `cargo` on PATH: `. "$HOME/.cargo/env"`.
4. **Phase 3 step 3 + Feature A** (match engine port *with* added depth) — set-by-set possession
   and territory; the payoff of the Rust foundation.
5. Iterate outward through the feature track, with SQLite (Phase 4) once state ownership has
   moved to Rust.

> This roadmap is a living document — re-prioritise per session in HANDOVER.md.
