'use strict';

Object.assign(UI, {
  /* ---------- offseason ---------- */
  p_offseason(){
    const O = G.offseason;
    if(!O) return UI.p_dashboard();
    if(O.step==='review') return UI.osReview();
    if(O.step==='contracts') return UI.osContracts();
    return UI.osDone();
  },
  osReview(){
    const O = G.offseason;
    const poty = O.awards.poty ? G.players[O.awards.poty] : null;
    const tt = O.awards.topTry ? G.players[O.awards.topTry] : null;
    const offers = O.offers.length ? O.offers : (O.offers = generateJobOffers());
    if(O.sacked && !offers.length){ const lad=ladder(); offers.push(lad[lad.length-1].id===G.coach.teamId ? lad[lad.length-2].id : lad[lad.length-1].id); }
    const premier = G.teams[G.finals.premier];
    return `<h1 class="page">Season Review — ${G.year}</h1>
    <p class="page-sub">${esc(O.verdict)}</p>
    <div class="grid3">
      <div class="card click" onclick="UI.teamModal(${premier.id})"><div class="navsep" style="margin:0">Premiers</div><div style="font-family:var(--disp); font-size:26px; font-weight:700; margin-top:4px"><span class="team-spine" style="background:${premier.c1}; height:20px"></span>${esc(teamName(premier))}</div></div>
      <div class="card ${poty?'click':''}" ${poty?`onclick="UI.playerModal(${poty.id})"`:''}><div class="navsep" style="margin:0">Player of the Year</div><div style="font-family:var(--disp); font-size:26px; font-weight:700; margin-top:4px">${poty?esc(poty.name):'—'}</div><p style="color:var(--muted); font-size:12px">${poty?poty.s.votes+' votes · '+esc(teamOf(poty.id)):''}</p></div>
      <div class="card ${tt?'click':''}" ${tt?`onclick="UI.playerModal(${tt.id})"`:''}><div class="navsep" style="margin:0">Top tryscorer</div><div style="font-family:var(--disp); font-size:26px; font-weight:700; margin-top:4px">${tt?esc(tt.name):'—'}</div><p style="color:var(--muted); font-size:12px">${tt?tt.s.t+' tries':''}</p></div>
    </div>
    ${O.retirements.length?`<h2 class="sec">Retirements</h2><div class="card"><p style="font-size:13px; color:var(--muted)">${O.retirements.map(r=>`${esc(r.name)} (${r.team}, ${r.games} games)`).join(' · ')}</p></div>`:''}
    ${offers.length?`<h2 class="sec">${O.sacked?'You need a new job':'Job offers'}</h2>
    <p class="page-sub">${O.sacked?'The following clubs are willing to give you a shot.':'Other boards have noticed your work. Staying put is also an option.'}</p>
    <div class="team-pick">${offers.map(id=>{ const t=G.teams[id];
      return `<div class="tp" onclick="UI.takeJob(${id})"><div class="city">${esc(t.city)}</div><div class="nick">${esc(t.nick)}</div><div class="str">Squad ${Math.round(squadStrength(t))} · tap to accept</div></div>`;}).join('')}</div>`:''}
    <div class="btnrow" style="margin-top:18px">
      ${O.sacked?'':`<button class="btn primary" onclick="G.offseason.step='contracts'; UI.render()">Continue to contracts</button>`}
    </div>`;
  },
  takeJob(id){
    const old = teamName(myTeam());
    G.coach.teamId = id; G.coach.conf = 60; G.coach.seasonsAtClub = 0; G.offseason.sacked = false;
    addNews(`${G.coach.name} leaves ${old} to take over the ${teamName(myTeam())}.`);
    G.offseason.expiring = myTeam().players.filter(pid=>G.players[pid].years<=0);
    G.offseason.step='contracts';
    UI.toast(`Appointed at the ${myTeam().nick}.`);
    UI.render();
  },
  osContracts(){
    const O = G.offseason;
    const t = myTeam();
    const totalSal = teamSalary(t);
    const room = G.config.cap - totalSal;
    O.expiring = O.expiring.filter(id=>t.players.includes(id) && G.players[id]);
    const exp = O.expiring.map(id=>G.players[id]).filter(p=>p.years<=0).sort((a,b)=>b.ovr-a.ovr);
    const fas = O.freeAgents.map(id=>G.players[id]).filter(Boolean).sort((a,b)=>b.ovr-a.ovr).slice(0,30);
    const row = (p, kind) => `<tr><td class="click" onclick="UI.playerModal(${p.id})"><b>${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span></td>
      <td class="num">${p.age}</td><td class="num"><span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span></td><td class="num">${money(demandFor(p, myTeam()))}</td>
      <td><div class="btnrow" style="margin:0"><button class="btn sm primary" onclick="UI.offerModal(${p.id})">${kind==='exp'?'Re-sign':'Sign'}</button>${kind==='exp'?`<button class="btn sm danger" onclick="releasePlayer(myTeam(),${p.id}); UI.toast('Released to the open market.'); UI.render()">Let go</button>`:''}</div></td></tr>`;
    return `<h1 class="page">Off-Season — Contracts</h1>
    <p class="page-sub">Payroll ${money(totalSal)} · cap ${money(G.config.cap)} · <span style="color:${room<0?'var(--red)':'var(--green)'}">${money(Math.abs(room))} ${room<0?'OVER':'free'}</span> · squad ${t.players.length}</p>
    <h2 class="sec">Your off-contract players</h2>
    <div class="card" style="padding:6px"><table><thead><tr><th class="noclick">Player</th><th class="noclick num">Age</th><th class="noclick num">OVR</th><th class="noclick num">Demand</th><th class="noclick"></th></tr></thead><tbody>
    ${exp.map(p=>row(p,'exp')).join('')||'<tr><td colspan="5" style="color:var(--muted)">Everyone is signed.</td></tr>'}</tbody></table></div>
    <h2 class="sec">Free agents</h2>
    <div class="card" style="padding:6px; max-height:380px; overflow-y:auto"><table><thead><tr><th class="noclick">Player</th><th class="noclick num">Age</th><th class="noclick num">OVR</th><th class="noclick num">Demand</th><th class="noclick"></th></tr></thead><tbody>
    ${fas.map(p=>row(p,'fa')).join('')||'<tr><td colspan="5" style="color:var(--muted)">Market is empty.</td></tr>'}</tbody></table></div>
    <div class="btnrow" style="margin-top:16px"><button class="btn primary" onclick="UI.finishOffseason()">Finalise — unsigned players walk, rivals raid the market</button></div>`;
  },
  offerModal(pid){
    const p = G.players[pid];
    p._att = p._att || 0;
    const demand = demandFor(p, myTeam());
    UI._offer = {pid, salary: demand, years: clamp(p.age<=25?3:2,1,3)};
    UI.renderOffer(demand);
  },
  renderOffer(demand){
    const o = UI._offer; const p = G.players[o.pid];
    if(p._att>=3){ UI.modal(`<h3>${esc(p.name)}</h3><p style="margin:10px 0">"My client has heard enough. He won't be negotiating further this off-season."</p><div class="btnrow"><button class="btn" onclick="UI.closeModal()">Close</button></div>`); return; }
    const isMine = myTeam().players.includes(o.pid);
    const room = G.config.cap - teamSalary(myTeam()) + (isMine ? p.salary*0 : 0);
    UI.modal(`<h3>${isMine?'Re-sign':'Sign'} ${esc(p.name)}</h3>
    <p class="page-sub">${POS_NAME[p.pos]} · ${p.age}yo · OVR ${p.ovr} / POT ${p.pot} · agent expects around ${money(demand)} · attempts used ${p._att}/3</p>
    <div class="field"><label>Salary offer</label>
      <div class="btnrow" style="margin:0; align-items:center">
        <button class="btn sm" onclick="UI._offer.salary=Math.max(85000,UI._offer.salary-25000); UI.renderOffer(${demand})">−25k</button>
        <span style="font-family:var(--disp); font-size:26px; font-weight:700; min-width:110px; text-align:center">${money(o.salary)}</span>
        <button class="btn sm" onclick="UI._offer.salary+=25000; UI.renderOffer(${demand})">+25k</button>
      </div></div>
    <div class="field"><label>Years</label><div class="radio-row">${[1,2,3].map(y=>`<div class="opt ${o.years===y?'sel':''}" onclick="UI._offer.years=${y}; UI.renderOffer(${demand})">${y} year${y>1?'s':''}</div>`).join('')}</div></div>
    <p style="color:var(--muted); font-size:12px">Cap space after deal: ${money(room - o.salary)}</p>
    <div class="btnrow"><button class="btn primary" onclick="UI.submitOffer()">Table the offer</button><button class="btn" onclick="UI.closeModal()">Cancel</button></div>`);
  },
  submitOffer(){
    const o = UI._offer; const p = G.players[o.pid];
    const isMine = myTeam().players.includes(o.pid);
    const room = G.config.cap - teamSalary(myTeam());
    if(o.salary > room && !isMine){ UI.toast('That offer busts the salary cap.'); return; }
    p._att = (p._att||0)+1;
    const res = offerContract(p, o.salary, o.years, myTeam());
    if(res.ok){
      if(!isMine){ myTeam().players.push(p.id); G.offseason.freeAgents = G.offseason.freeAgents.filter(id=>id!==p.id); }
      G.offseason.expiring = G.offseason.expiring.filter(id=>id!==p.id);
      addNews(`${p.name} signs with the ${myTeam().nick} — ${money(o.salary)} a season for ${o.years} year${o.years>1?'s':''}.`);
      UI.toast(`${p.name} signed.`); UI.closeModal(); UI.render();
    } else {
      UI.toast(`${p.name.split(' ')[1]||p.name} knocked it back — wants closer to ${money(res.demand)}.`);
      UI.renderOffer(res.demand);
    }
  },
  finishOffseason(){
    const t = myTeam();
    const over = teamSalary(t) - G.config.cap;
    if(over > 0){ UI.toast(`You're ${money(over)} over the cap — release or let players walk first.`); return; }
    finishContractsPhase();
    for(const id in G.players) delete G.players[id]._att;
    startNewSeason();
    autoPick(myTeam());
    UI.toast(`Season ${G.year} — rookies have arrived.`);
    UI.go('dashboard');
  },
  osDone(){ return UI.p_dashboard(); }
});
