import { UI } from "./01-core.js";

Object.assign(UI, {
  /* ---------- wizard ---------- */
  wizCfg: { nTeams: 17, cap: 10200000, coachName: '' },
  wizWorld: null,

  wizard() {
    const { nTeams, cap } = UI.wizCfg;
    const teamCards = UI.wizWorld ? `<h2 class="sec">Choose your club</h2>
      <p class="page-sub">Squad strength shown below. A weaker club means lower expectations — and more room to build a reputation.</p>
      <div class="team-pick">${G.teams.map(t => {
        const s = Math.round(squadStrength(t));
        const tier = s >= 64 ? 'Premiership contender' : s >= 60 ? 'Finals hopeful' : s >= 57 ? 'Mid-table' : 'Rebuilding';
        return `<div class="tp" onclick="UI.wizPick(${t.id})">
          ${teamLogo(t, 48)}
          <div class="city">${esc(t.city)}</div><div class="nick">${esc(t.nick)}</div>
          <div class="str">Squad ${s} · ${tier}</div></div>`;
      }).join('')}</div>` : '';

    return `<div id="wizard-wrap">
      <div class="hero-mark">Project <span>Minto</span></div>
      <div class="hero-tag">Rugby league management. Generated players, your coaching career.</div>
      <div class="card">
        <div class="field"><label>Coach name</label><input type="text" id="wzName" placeholder="e.g. Dan Carmody" value="${esc(UI.wizCfg.coachName)}"></div>
        <div class="field"><label>League size</label>
          <div class="radio-row">${[8, 10, 12, 14, 16, 17].map(n =>
            `<div class="opt ${nTeams === n ? 'sel' : ''}" onclick="UI.wizSet('nTeams',${n})">${n === 17 ? '17 clubs <span style="font-size:10px;opacity:.6">(Standard)</span>' : `${n} clubs`}</div>`
          ).join('')}</div>
        </div>
        <div class="field"><label>Salary cap</label>
          <div class="radio-row">${[[8000000, '$8.0m'], [10200000, '$10.2m'], [11000000, '$11.0m']].map(([v, l]) =>
            `<div class="opt ${cap === v ? 'sel' : ''}" onclick="UI.wizSet('cap',${v})">${l}${v === 10200000 ? ' <span style="font-size:10px;opacity:.6">(Standard)</span>' : ''}</div>`
          ).join('')}</div>
        </div>
        <button class="btn primary" onclick="UI.wizGenerate()">Generate League</button>
      </div>
      ${teamCards}
    </div>`;
  },

  wizSet(k, v) {
    UI.wizCfg[k] = v;
    UI.wizCfg.coachName = document.getElementById('wzName').value;
    UI.wizWorld = null;
    UI.render();
  },

  wizGenerate() {
    UI.wizCfg.coachName = document.getElementById('wzName').value.trim() || 'Coach Carmody';
    const { nTeams, cap, coachName } = UI.wizCfg;
    // Starting teams are the first 17 in IDENTITIES; expansion teams are the remainder.
    // For the standard 17-team league, use all 17 starting teams in order.
    // For smaller leagues, shuffle the starting 17 and take nTeams.
    const startingTeams = IDENTITIES.slice(0, 17);
    const pool = nTeams >= 17 ? startingTeams : shuffle(startingTeams.slice());
    startNewGame({
      nTeams,
      cap,
      coachName,
      teamId: null,
      identities: pool.slice(0, nTeams),
      leagueName: 'Minto Premiership',
      seasonRounds: nTeams === 17 ? 27 : null,
    });
    UI.wizWorld = true;
    UI.render();
  },

  wizPick(id) {
    G.coach.teamId = id;
    G.coach.expect = setExpectation();
    const firstSeason = G.year;
    addNews(`Season ${firstSeason}: ${G.coach.name} appointed head coach of the ${teamName(myTeam())}. Board expectation: ${G.coach.expect.label}.`);
    UI.wizWorld = null;
    UI.toast(`Welcome to the ${myTeam().nick}. Set up your pre-season before Round 1.`);
    G.year = firstSeason - 1;
    G.season = 0;
    G.phase = 'offseason';
    G.offseason = {
      step: 'preseason',
      preseason: createPreseasonPlan(),
      year: G.year,
      verdict: `Welcome to your first season as head coach of the ${teamName(myTeam())}!`,
      retirements: [],
      awards: {},
      offers: [],
      freeAgents: [...(G.freeAgents || [])],
    };
    UI.go('offseason');
  },
});
