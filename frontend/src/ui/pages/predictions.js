'use strict';

/* Predictions — bookie odds, season projections, award frontrunners, media */
Object.assign(UI, {

  /* ---- odds helpers ---- */
  _matchOdds(m){
    const th = G.teams[m.h], ta = G.teams[m.a];
    const hStr = squadStrength(th) * 1.035;  // home advantage
    const aStr = squadStrength(ta);
    const total = hStr + aStr;
    const pH = clamp(hStr / total, 0.22, 0.78);
    const pA = 1 - pH;
    const margin = 1.08;  // 8% overround — bookmaker takes their cut, so odds are LOWER than fair
    const oddsH = 1 / (pH * margin);
    const oddsA = 1 / (pA * margin);
    return { pH, pA, oddsH, oddsA, favoured: pH >= pA ? 'h' : 'a' };
  },

  _oddsStr(o){ return `$${o.toFixed(2)}`; },

  _matchOddsHtml(m){
    const o = UI._matchOdds(m);
    const h = G.teams[m.h], a = G.teams[m.a];
    const favH = o.favoured === 'h';
    const favA = o.favoured === 'a';
    return `<div class="card" style="margin-bottom:12px">
      <h2 class="sec" style="margin-top:0">Bookie odds — Round ${G.round+1}</h2>
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="text-align:center;flex:1;min-width:120px">
          <div style="font-size:11px;color:var(--muted)">${esc(h.city)}</div>
          <div style="font-family:var(--disp);font-size:18px;font-weight:700">${esc(h.nick)}</div>
          <div style="font-size:26px;font-weight:700;color:${favH?'var(--brass)':'var(--ink)'}">${UI._oddsStr(o.oddsH)}</div>
          <div style="font-size:11px;color:var(--muted)">${Math.round(o.pH*100)}% implied win</div>
        </div>
        <div style="text-align:center;color:var(--muted);font-size:18px;font-weight:300">v</div>
        <div style="text-align:center;flex:1;min-width:120px">
          <div style="font-size:11px;color:var(--muted)">${esc(a.city)}</div>
          <div style="font-family:var(--disp);font-size:18px;font-weight:700">${esc(a.nick)}</div>
          <div style="font-size:26px;font-weight:700;color:${favA?'var(--brass)':'var(--ink)'}">${UI._oddsStr(o.oddsA)}</div>
          <div style="font-size:11px;color:var(--muted)">${Math.round(o.pA*100)}% implied win</div>
        </div>
      </div>
      ${UI._mediaSnippets(m, o)}
    </div>`;
  },

  _mediaSnippets(m, o){
    const h = G.teams[m.h], a = G.teams[m.a];
    const fav = o.favoured==='h' ? h : a;
    const dog = o.favoured==='h' ? a : h;
    const lad = ladder();
    const favPos = lad.findIndex(r=>r.id===fav.id)+1;
    const dogPos = lad.findIndex(r=>r.id===dog.id)+1;
    const favRec = lad.find(r=>r.id===fav.id);
    const dogRec = lad.find(r=>r.id===dog.id);
    const streakStr = rec => {
      const form = rec ? rec.form.slice().reverse().filter(f=>f==='W'||f==='L') : [];
      if(form.length < 2) return '';
      const t0 = form[0]; let count = 0;
      for(const f of form){ if(f===t0) count++; else break; }
      if(count < 2) return '';
      return ` — on a ${count}-game ${t0==='W'?'winning':'losing'} run`;
    };
    const snippets = [
      `${esc(fav.nick)} head in as ${o.favoured==='h'?'the home side':'favourites'}, sitting ${ord(favPos)} on the ladder (${favRec.w}-${favRec.l})${streakStr(favRec)}.`,
      `${esc(dog.nick)} will need to cause an upset — they're currently ${ord(dogPos)} (${dogRec.w}-${dogRec.l})${streakStr(dogRec)}.`,
    ];
    const myT = myTeam();
    if(m.h===myT.id || m.a===myT.id){
      const isHome = m.h===myT.id;
      const weather = m.projWeather;
      const badWx = weather === 'Heavy rain' || weather === 'Windy';
      if(o.favoured===(isHome?'h':'a')){
        snippets.push(`The ${esc(myT.nick)} are expected to get the result${isHome?' in front of their home crowd':''}.`);
      } else {
        snippets.push(`The ${esc(myT.nick)} face a tough ask${isHome?' despite home advantage':''}, but an upset would be massive for their season.`);
      }
      if(badWx) snippets.push(`Conditions forecast: ${esc(weather)}. Both sides will need to adapt their game plan to the elements.`);
    }
    const inj = myTeam().players.filter(id=>{ const p=G.players[id]; return p&&p.injury&&!p.playInjured; });
    if(inj.length){
      const names = inj.slice(0,2).map(id=>{ const p=G.players[id]; return p?p.name:''; }).filter(Boolean);
      snippets.push(`${esc(myTeam().nick)} are missing ${names.join(' and ')}${inj.length>2?` and ${inj.length-2} more`:''} through injury heading into this clash.`);
    }
    return `<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px">
      <div style="font-size:11px;color:var(--brass);font-weight:600;margin-bottom:6px">MEDIA PREVIEW</div>
      ${snippets.map(s=>`<p style="font-size:12px;color:var(--muted);margin:4px 0">${s}</p>`).join('')}
    </div>`;
  },

  /* ---- projected ladder ---- */
  _projectedLadder(){
    const lad = ladder();
    const teamsN = G.teams.length;
    const roundsLeft = G.fixtures.length - G.round;
    if(roundsLeft <= 0) return lad;  // season over

    // Expected points per remaining round for each team, weighted by squad strength
    const totalStr = G.teams.reduce((s,t)=>s+squadStrength(t), 0);
    const avgStr = totalStr / teamsN;
    return lad.map(r=>{
      const t = G.teams[r.id];
      const str = squadStrength(t);
      const winRate = clamp(str / (avgStr * 2) + 0.3, 0.1, 0.9);
      const projPts = r.pts + Math.round(roundsLeft * winRate * 2);
      return {...r, projPts, winRate};
    }).sort((a,b)=>b.projPts-a.projPts);
  },

  /* ---- award frontrunners ---- */
  _awardFrontrunners(){
    const allP = Object.values(G.players).filter(p=>p.s && p.s.g >= 3);
    const voteLeaders = allP.slice().sort((a,b)=>b.s.votes-a.s.votes).slice(0,5);
    const tryLeaders  = allP.slice().sort((a,b)=>b.s.t-a.s.t).slice(0,5);
    const avgLeaders  = allP.filter(p=>p.s.g>=5).slice().sort((a,b)=>(b.s.rSum/b.s.g)-(a.s.rSum/a.s.g)).slice(0,5);
    const rookieLeaders = allP.filter(p=>{ const h=p.history||[]; return p.age<=22 || h.length<=1; }).sort((a,b)=>b.s.votes-a.s.votes).slice(0,3);
    const row = (p, stat) => {
      const t = G.teams.find(t=>t.players.includes(p.id));
      return `<tr class="click" onclick="UI.playerModal(${p.id})"><td><b>${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span></td><td>${t?`<span class="team-spine" style="background:${t.c1}"></span>${esc(t.nick)}`:'—'}</td><td class="num"><b>${stat}</b></td></tr>`;
    };
    const table = (rows) => `<table><thead><tr><th class="noclick">Player</th><th class="noclick">Club</th><th class="noclick num">Stat</th></tr></thead><tbody>${rows}</tbody></table>`;
    return {
      votes:  table(voteLeaders.map(p=>row(p, p.s.votes+' votes'))),
      tries:  table(tryLeaders.map(p=>row(p, p.s.t+' tries'))),
      avg:    table(avgLeaders.map(p=>row(p, (p.s.rSum/p.s.g).toFixed(1)+' avg'))),
      rookie: table(rookieLeaders.map(p=>row(p, p.s.votes+' votes'))),
    };
  },

  /* ---- form/hot players ---- */
  _formWatchHtml(){
    const allP = Object.values(G.players).filter(p => p.s && p.s.g >= 2);
    if(!allP.length) return '';
    const hot  = allP.filter(p => (p.form||50) >= 72).sort((a,b) => (b.form||50)-(a.form||50)).slice(0,5);
    const cold = allP.filter(p => (p.form||50) < 40).sort((a,b) => (a.form||50)-(b.form||50)).slice(0,5);
    if(!hot.length && !cold.length) return '';
    const formRow = p => {
      const t = G.teams.find(t => t.players.includes(p.id));
      const fv = Math.round(p.form || 50);
      const label = fv >= 72 ? 'Hot 🔥' : fv < 40 ? 'Cold ❄' : 'Steady';
      const col = fv >= 72 ? 'var(--green)' : fv < 40 ? 'var(--red)' : 'var(--muted)';
      const avg = p.s.g ? (p.s.rSum / p.s.g).toFixed(1) : '—';
      return `<tr class="click" onclick="UI.playerModal(${p.id})">
        <td><b>${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span></td>
        <td>${t ? `<span class="team-spine" style="background:${t.c1}"></span>${esc(t.nick)}` : '—'}</td>
        <td class="num" style="color:${col};font-weight:700">${fv}</td>
        <td class="num" style="font-size:11px;color:var(--muted)">${avg} avg</td>
      </tr>`;
    };
    const tbl = rows => `<table><thead><tr><th class="noclick">Player</th><th class="noclick">Club</th><th class="noclick num">Form</th><th class="noclick num">Avg</th></tr></thead><tbody>${rows}</tbody></table>`;
    return `<h2 class="sec">Form Watch</h2>
    <p style="font-size:12px;color:var(--muted);margin:-6px 0 10px">Players running hot or cold heading into this round. Form affects match-day performance and auto-pick selection.</p>
    <div class="grid2">
      ${hot.length ? `<div class="card"><h2 class="sec" style="margin-top:0;color:var(--green)">Hot Form 🔥</h2><p style="font-size:11px;color:var(--muted);margin:-4px 0 8px">Top confidence players this week</p>${tbl(hot.map(formRow).join(''))}</div>` : ''}
      ${cold.length ? `<div class="card"><h2 class="sec" style="margin-top:0;color:var(--red)">Cold Streak ❄</h2><p style="font-size:11px;color:var(--muted);margin:-4px 0 8px">Players struggling for confidence</p>${tbl(cold.map(formRow).join(''))}</div>` : ''}
    </div>`;
  },

  p_predictions(){
    const lad = ladder();
    const t = myTeam();
    const next = G.phase==='regular' && G.fixtures[G.round] ? G.fixtures[G.round].find(m=>m.h===t.id||m.a===t.id) : null;

    // Match odds block (only during regular season)
    const oddsBlock = next ? UI._matchOddsHtml(next) : '';

    // All round matches odds summary (collapsible list)
    let roundOddsHtml = '';
    if(G.phase==='regular' && G.fixtures[G.round]){
      const rows = G.fixtures[G.round].map(m=>{
        const mh = G.teams[m.h], ma = G.teams[m.a];
        const o = UI._matchOdds(m);
        const fav = o.favoured==='h' ? mh : ma;
        return `<tr><td><span class="team-spine" style="background:${mh.c1}"></span>${esc(mh.nick)}</td><td style="text-align:center;color:${o.favoured==='h'?'var(--brass)':'var(--muted)'}">${UI._oddsStr(o.oddsH)}</td><td style="text-align:center;color:${o.favoured==='a'?'var(--brass)':'var(--muted)'}">${UI._oddsStr(o.oddsA)}</td><td><span class="team-spine" style="background:${ma.c1}"></span>${esc(ma.nick)}</td><td style="color:var(--brass);font-size:11px">${esc(fav.nick)} fav.</td></tr>`;
      }).join('');
      roundOddsHtml = `<div class="card" style="padding:6px;margin-bottom:12px"><h2 class="sec" style="margin:8px 10px">Round ${G.round+1} — all odds</h2>
        <table><thead><tr><th class="noclick">Home</th><th class="noclick num">Home $</th><th class="noclick num">Away $</th><th class="noclick">Away</th><th class="noclick">Tip</th></tr></thead><tbody>${rows}</tbody></table>
      </div>`;
    }

    // Projected ladder
    const proj = UI._projectedLadder();
    const projRows = proj.map((r,i)=>{
      const tm = G.teams[r.id];
      const myRow = tm.id === t.id;
      return `<tr style="${myRow?'background:rgba(210,165,62,.07)':''}"><td class="lpos">${i+1}</td><td><span class="team-spine" style="background:${tm.c1}"></span>${esc(tm.nick)}</td><td class="num">${r.pts}</td><td class="num" style="color:var(--brass)">${r.projPts}</td><td class="num" style="color:var(--muted)">${Math.round(r.winRate*100)}%</td></tr>`;
    }).join('');

    // Award frontrunners
    const awards = G.round > 0 ? UI._awardFrontrunners() : null;

    const formWatch = G.round > 0 ? UI._formWatchHtml() : '';

    return `<h1 class="page">Predictions</h1><p class="page-sub">Bookie odds, season projections and award frontrunners. Updated each round.</p>
    ${oddsBlock}
    ${roundOddsHtml}
    <h2 class="sec">Projected final ladder</h2>
    <div class="card" style="padding:6px;margin-bottom:12px">
      <table><thead><tr><th class="noclick lpos">#</th><th class="noclick">Club</th><th class="noclick num">Current pts</th><th class="noclick num" style="color:var(--brass)">Projected pts</th><th class="noclick num">Est. win%</th></tr></thead><tbody>${projRows}</tbody></table>
      <p style="color:var(--dim);font-size:11px;padding:6px 8px 0">Projection uses squad strength and current points. Does not account for schedule difficulty or injuries.</p>
    </div>
    ${formWatch}
    ${awards ? `
    <h2 class="sec">Award frontrunners</h2>
    <div class="grid2">
      <div class="card"><h2 class="sec" style="margin-top:0">Player of the Year</h2><p style="font-size:11px;color:var(--muted);margin:-4px 0 8px">Dally M votes this season</p>${awards.votes}</div>
      <div class="card"><h2 class="sec" style="margin-top:0">Top Try Scorer</h2><p style="font-size:11px;color:var(--muted);margin:-4px 0 8px">Tries scored this season</p>${awards.tries}</div>
      <div class="card"><h2 class="sec" style="margin-top:0">Best Average Rating</h2><p style="font-size:11px;color:var(--muted);margin:-4px 0 8px">Min. 5 games played</p>${awards.avg}</div>
      <div class="card"><h2 class="sec" style="margin-top:0">Rookie Watch</h2><p style="font-size:11px;color:var(--muted);margin:-4px 0 8px">Under-22 or first season</p>${awards.rookie}</div>
    </div>` : '<p class="page-sub">Award frontrunners appear after the first round is played.</p>'}`;
  }
});
