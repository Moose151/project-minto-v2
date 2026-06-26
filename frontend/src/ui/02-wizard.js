'use strict';

Object.assign(UI, {
  /* ---------- wizard ---------- */
  wizCfg:{nTeams:12, cap:9500000, coachName:'', mode:'custom'},
  wizWorld:null,
  wizard(){
    const isNRL = UI.wizCfg.mode === 'nrl';
    const teamCards = UI.wizWorld ? `<h2 class="sec">Choose your club</h2>
      <p class="page-sub">Squad strength shown below. A weaker club means lower expectations — and more room to build a reputation.</p>
      <div class="team-pick">${G.teams.map(t=>{
        const s = Math.round(squadStrength(t));
        const tier = s>=64?'Premiership contender':s>=60?'Finals hopeful':s>=57?'Mid-table':'Rebuilding';
        return `<div class="tp" onclick="UI.wizPick(${t.id})">
          ${teamLogo(t,48)}
          <div class="city">${esc(t.city)}</div><div class="nick">${esc(t.nick)}</div>
          <div class="str">Squad ${s} · ${tier}</div></div>`;
      }).join('')}</div>` : '';
    return `<div id="wizard-wrap">
      <div class="hero-mark">Project <span>Minto</span></div>
      <div class="hero-tag">Rugby league management. Generated players, your coaching career.</div>
      <div class="card">
        <div class="field"><label>League type</label>
          <div class="radio-row">
            <div class="opt ${!isNRL?'sel':''}" onclick="UI.wizSetMode('custom')">Custom League</div>
            <div class="opt ${isNRL?'sel':''}" onclick="UI.wizSetMode('nrl')">NRL Standard</div>
          </div>
        </div>
        ${isNRL ? `<div style="font-size:12px;color:var(--muted);margin:0 0 12px;padding:8px 12px;background:var(--card2);border-radius:6px">17 NRL clubs · 27-round season · Top-8 finals · $10.2M salary cap</div>` : ''}
        <div class="field"><label>Coach name</label><input type="text" id="wzName" placeholder="e.g. Dan Carmody" value="${esc(UI.wizCfg.coachName)}"></div>
        ${!isNRL ? `<div class="field"><label>League size</label>
          <div class="radio-row">${[8,10,12,14,16].map(n=>`<div class="opt ${UI.wizCfg.nTeams===n?'sel':''}" onclick="UI.wizSet('nTeams',${n})">${n} clubs</div>`).join('')}</div></div>` : ''}
        <div class="field"><label>Salary cap</label>
          <div class="radio-row">${isNRL
            ? `<div class="opt sel">$10.2m · NRL standard</div>`
            : [[8000000,'$8.0m'],[9500000,'$9.5m'],[11000000,'$11.0m']].map(([v,l])=>`<div class="opt ${UI.wizCfg.cap===v?'sel':''}" onclick="UI.wizSet('cap',${v})">${l}</div>`).join('')}
          </div>
        </div>
        <button class="btn primary" onclick="UI.wizGenerate()">Generate league</button>
      </div>
      ${teamCards}
    </div>`;
  },
  wizSetMode(mode){
    UI.wizCfg.coachName = document.getElementById('wzName')?.value || UI.wizCfg.coachName;
    UI.wizCfg.mode = mode;
    if(mode === 'nrl'){ UI.wizCfg.nTeams = 17; UI.wizCfg.cap = 10200000; }
    UI.wizWorld = null;
    UI.render();
  },
  wizSet(k,v){ UI.wizCfg[k]=v; UI.wizCfg.coachName = document.getElementById('wzName').value; UI.render(); },
  wizGenerate(){
    UI.wizCfg.coachName = document.getElementById('wzName').value.trim() || 'Coach Carmody';
    const isNRL = UI.wizCfg.mode === 'nrl';
    startNewGame({
      nTeams: UI.wizCfg.nTeams,
      cap: UI.wizCfg.cap,
      coachName: UI.wizCfg.coachName,
      teamId: null,
      identities: isNRL ? NRL_IDENTITIES : null,
      leagueName: isNRL ? 'NRL Premiership' : 'Minto Premiership',
      seasonRounds: isNRL ? 27 : null,
    });
    UI.wizWorld = true;
    UI.render();
  },
  wizPick(id){
    G.coach.teamId = id;
    G.coach.expect = setExpectation();
    const firstSeason = G.year;
    addNews(`Season ${firstSeason}: ${G.coach.name} appointed head coach of the ${teamName(myTeam())}. Board expectation: ${G.coach.expect.label}.`);
    UI.wizWorld = null;
    UI.toast(`Welcome to the ${myTeam().nick}. Set up your pre-season before Round 1.`);
    // Decrement year/season so completePreseason→startNewSeason increments back to the correct values
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
