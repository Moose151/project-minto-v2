'use strict';

/* Scouting — dispatch scouts to find young talent */
Object.assign(UI, {

  p_scouting(){
    const sc = G.scouting || (G.scouting = {scouts:[], missions:[], prospects:[]});
    const scouts   = sc.scouts   || [];
    const missions = sc.missions || [];
    const prospects = sc.prospects || [];
    const weeks = Math.max(1, (G.fixtures ? G.fixtures.length : 24) + 3);

    const busyScoutIds = new Set(missions.map(m=>m.scoutId));

    // --- Scouts panel ---
    const scoutCards = scouts.map(s => {
      const mission = missions.find(m=>m.scoutId===s.id);
      const pick_state = UI._scoutPick && UI._scoutPick.scoutId === s.id ? UI._scoutPick : null;
      const abilityBar = `<div style="display:flex;align-items:center;gap:6px;margin:6px 0">
        <div style="flex:1;height:6px;background:var(--card2);border-radius:3px;overflow:hidden">
          <div style="width:${s.ability}%;height:100%;background:${s.ability>=70?'var(--green)':s.ability>=50?'var(--brass)':'var(--red)'}"></div>
        </div>
        <span style="font-size:12px;font-weight:700;min-width:24px">${s.ability}</span>
      </div>`;

      let dispatchSection = '';
      if(mission){
        const mRegion = SCOUT_REGIONS.find(r=>r.key===mission.region);
        const targetLabel = mission.targetPos ? ` · Looking for ${POS_NAME[mission.targetPos]||mission.targetPos}` : '';
        dispatchSection = `<p style="font-size:12px;color:var(--brass);margin:4px 0">On mission — ${esc(mRegion?.label||mission.region)} · ${mission.weeksLeft}w left${targetLabel}</p>`;
      } else if(pick_state){
        // Step 2: position picker for the selected region
        const region = SCOUT_REGIONS.find(r=>r.key===pick_state.regionKey);
        const posBtns = (region ? region.posPool : POS).map(pos => {
          const chance = Math.round(scoutTargetChance(s, pos) * 100);
          const spec = s.posSpecialty === pos ? ' ★' : '';
          return `<button class="btn sm" style="margin:2px" onclick="UI.dispatchScout(${s.id},'${pick_state.regionKey}','${pos}')">${POS_NAME[pos]||pos}${spec} · ${chance}%</button>`;
        }).join('');
        dispatchSection = `<div style="margin-top:8px;border-top:1px solid var(--line);padding-top:8px">
          <p style="font-size:11px;color:var(--muted);margin:0 0 4px">
            <b>${esc(region?.label||pick_state.regionKey)}</b> — target position:
          </p>
          <button class="btn sm" style="margin:2px;background:var(--card2)" onclick="UI.dispatchScout(${s.id},'${pick_state.regionKey}','any')">Any Position</button>
          ${posBtns}
          <button class="btn sm" style="margin:2px;color:var(--muted)" onclick="UI._scoutPick=null;UI.render()">Back</button>
        </div>`;
      } else {
        // Step 1: region table
        const regionRows = SCOUT_REGIONS.map(r =>
          `<tr>
            <td style="padding:3px 6px">${esc(r.label)}</td>
            <td style="padding:3px 6px;color:var(--muted);font-size:11px">${scoutRegionPositionWeights(r).slice(0,3).map(x=>x.pos).join('/')}</td>
            <td style="padding:3px 6px;color:var(--muted);font-size:11px">${r.weeks}w</td>
            <td style="padding:3px 2px"><button class="btn sm" onclick="UI.selectScoutRegion(${s.id},'${r.key}')">Select</button></td>
          </tr>`
        ).join('');
        dispatchSection = `<div style="margin-top:8px">
          <p style="font-size:11px;color:var(--muted);margin:0 0 4px">Dispatch to region:</p>
          <div style="max-height:160px;overflow-y:auto;border:1px solid var(--line);border-radius:6px">
            <table style="width:100%;border-collapse:collapse"><tbody>${regionRows}</tbody></table>
          </div>
        </div>`;
      }

      const expiring = s.yearsLeft <= 1;
      const payoutYears = Math.max(0, (s.yearsLeft || 1) - 1);
      const payout = payoutYears * (s.salary || 0);
      return `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px">
          <div style="min-width:0;flex:1">
            <b style="font-size:15px">${esc(s.name)}</b>
            ${expiring ? `<span style="margin-left:6px;font-size:10px;font-weight:700;color:var(--red);background:rgba(200,50,50,.12);padding:2px 6px;border-radius:8px">CONTRACT EXPIRING</span>` : ''}
            <p style="margin:2px 0;font-size:12px;color:var(--muted)">Scout · ${money(s.salary)}/yr · ${s.yearsLeft} yr${s.yearsLeft===1?'':'s'} left · Specialty: ${POS_NAME[s.posSpecialty]||s.posSpecialty||'General'}</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
            ${expiring ? `<button class="btn sm primary" onclick="UI.extendScout(${s.id})">Extend</button>` : ''}
            <button class="btn sm" style="color:var(--red)" onclick="UI.fireScout(${s.id})">${payout > 0 ? `Fire (${money(payout)})` : 'Release'}</button>
          </div>
        </div>
        ${abilityBar}
        ${!mission ? `<p style="font-size:12px;color:var(--green);margin:4px 0">Available</p>` : ''}
        ${dispatchSection}
      </div>`;
    }).join('') || `<div class="card"><p style="color:var(--muted)">No scouts on payroll. Hire from the market below.</p></div>`;

    // --- Prospects panel ---
    const prospectCards = prospects.length ? prospects.map(pr => {
      const p = G.players[pr.playerId];
      if(!p) return '';
      const region = SCOUT_REGIONS.find(r=>r.key===pr.region);
      const myT = myTeam();
      const cost = Math.round(clamp(salaryFor(p)*0.55, 65000, 180000)/5000)*5000;
      const youthRoom = Math.max(0, YOUTH_SQUAD_CAP - squadCount(myT, 'dev'));
      const canSign = youthRoom > 0 && canJoinYouthSquad(p);
      const targetNote = pr.targetPos
        ? `<p style="margin:2px 0;font-size:11px;color:${pr.targetHit?'var(--green)':'var(--brass)'}">Target: ${POS_NAME[pr.targetPos]||pr.targetPos} · ${pr.targetHit?'matched':'missed'}</p>`
        : '';
      return `<div class="card" style="display:flex;gap:12px;align-items:flex-start">
        <div style="flex:1">
          <b class="click" onclick="UI.playerModal(${p.id})" style="text-decoration:underline;cursor:pointer">${esc(p.name)}</b>
          <p style="margin:2px 0;font-size:12px;color:var(--muted)">${POS_NAME[p.pos]||p.pos} · ${p.age}yo · OVR ${p.ovr} · POT ~${p.pot}</p>
          <p style="margin:2px 0;font-size:11px;color:var(--dim)">Found in ${region?esc(region.label):pr.region} (${pr.foundYear})</p>
          ${targetNote}
          ${p.backstory ? `<p style="margin:2px 0;font-size:11px;color:var(--muted);font-style:italic">"${esc(p.backstory)}"</p>` : ''}
          <p style="font-size:11px;color:var(--muted)">Youth squad offer: ${money(cost)} · salary cap exempt</p>
          ${!canJoinYouthSquad(p) ? `<p style="font-size:11px;color:var(--red)">⚠ Youth squad is only for under-21 players who have never been in the main squad.</p>` : youthRoom <= 0 ? `<p style="font-size:11px;color:var(--red)">⚠ Youth squad is full (${YOUTH_SQUAD_CAP} max)</p>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn sm primary" ${canSign?'':'disabled'} onclick="UI.signProspect(${pr.playerId})">Sign to youth squad</button>
          <button class="btn sm" onclick="UI.dismissProspect(${pr.playerId})">Dismiss</button>
        </div>
      </div>`;
    }).join('') : '';

    // --- Scout market ---
    if(!UI._scoutMarket || UI._scoutMarket.year !== G.year){
      UI._scoutMarket = { year: G.year, list: UI._genScoutMarket() };
    }
    const marketScouts = (UI._scoutMarket.list || []).filter(s => !scouts.some(x=>x.id===s.id));
    const marketRows = marketScouts.map(s => {
      const abilityBar = `<div style="display:flex;align-items:center;gap:6px">
        <div style="flex:1;height:5px;background:var(--card2);border-radius:3px;overflow:hidden">
          <div style="width:${s.ability}%;height:100%;background:${s.ability>=70?'var(--green)':s.ability>=50?'var(--brass)':'var(--red)'}"></div>
        </div><span style="font-size:11px;font-weight:700">${s.ability}</span></div>`;
      return `<tr>
        <td><b>${esc(s.name)}</b><br><span style="font-size:11px;color:var(--muted)">Specialty: ${POS_NAME[s.posSpecialty]||s.posSpecialty||'General'}</span></td>
        <td>${abilityBar}</td>
        <td class="num">${money(s.salary)}</td>
        <td class="num">${s.yearsLeft}yr</td>
        <td><button class="btn sm primary" onclick="UI.hireScout(${s.id})">Hire</button></td>
      </tr>`;
    }).join('');

    const totalScoutCost = scouts.reduce((s,x)=>s+(x.salary||0),0);

    return `<h1 class="page">Scouting</h1>
    <p class="page-sub">Dispatch scouts to find young talent for the youth squad. Scout ability determines prospect quality.</p>
    <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      <div class="card" style="padding:10px 16px;flex:1;min-width:130px"><span style="font-size:11px;color:var(--muted)">Scouts employed</span><div style="font-size:22px;font-weight:700;font-family:var(--disp)">${scouts.length}</div></div>
      <div class="card" style="padding:10px 16px;flex:1;min-width:130px"><span style="font-size:11px;color:var(--muted)">Active missions</span><div style="font-size:22px;font-weight:700;font-family:var(--disp)">${missions.length}</div></div>
      <div class="card" style="padding:10px 16px;flex:1;min-width:130px"><span style="font-size:11px;color:var(--muted)">Prospects waiting</span><div style="font-size:22px;font-weight:700;font-family:var(--disp)">${prospects.length}</div></div>
      <div class="card" style="padding:10px 16px;flex:1;min-width:130px"><span style="font-size:11px;color:var(--muted)">Total scout cost</span><div style="font-size:22px;font-weight:700;font-family:var(--disp)">${money(totalScoutCost)}</div></div>
    </div>
    <h2 class="sec">Your Scouts</h2>
    <div class="grid3" style="margin-bottom:16px">${scoutCards}</div>
    ${prospects.length ? `<h2 class="sec">Prospects</h2><div class="grid2" style="margin-bottom:16px">${prospectCards}</div>` : ''}
    <h2 class="sec">Scout Market</h2>
    <p style="font-size:12px;color:var(--muted);margin:-6px 0 10px">Market refreshes each season. Scout salaries are paid from club funds.</p>
    <div class="card" style="padding:6px;overflow-x:auto">
      <table><thead><tr>
        <th class="noclick">Name</th><th class="noclick" style="min-width:90px">Ability</th>
        <th class="noclick num">Salary</th><th class="noclick num">Length</th><th class="noclick"></th>
      </tr></thead>
      <tbody>${marketRows||'<tr><td colspan="5" style="color:var(--muted)">No scouts available.</td></tr>'}</tbody>
      </table>
    </div>`;
  },

  _genScoutMarket(){
    const list = [];
    for(let i=0;i<4;i++){
      const ability = clamp(Math.round(30 + Math.random()*55), 20, 88);
      const salary = Math.round((20000 + Math.pow(ability/90, 2)*90000)/5000)*5000;
      list.push({id: 8000 + i + 1, name:`${pick(FIRST)} ${pick(LAST)}`, ability, salary, yearsLeft:ri(1,3), posSpecialty:pick(POS)});
    }
    return list;
  },

  selectScoutRegion(scoutId, regionKey){
    UI._scoutPick = {scoutId, regionKey};
    UI.render();
  },

  dispatchScout(scoutId, regionKey, targetPos){
    const sc = G.scouting;
    if(!sc) return;
    if(sc.missions.some(m=>m.scoutId===scoutId)){ UI.toast('That scout is already on a mission.'); return; }
    const region = SCOUT_REGIONS.find(r=>r.key===regionKey);
    if(!region){ UI.toast('Unknown region.'); return; }
    if(G.phase!=='regular'){ UI.toast('Scouts can only be dispatched during the regular season.'); return; }
    const posTarget = targetPos && targetPos !== 'any' ? targetPos : null;
    const mission = {scoutId, region:regionKey, weeksLeft:region.weeks};
    if(posTarget) mission.targetPos = posTarget;
    sc.missions.push(mission);
    UI._scoutPick = null;
    const posLabel = posTarget ? ` looking for ${POS_NAME[posTarget]||posTarget}` : '';
    UI.toast(`Scout dispatched to ${region.label}${posLabel}. Report in ${region.weeks} weeks.`);
    UI.render();
  },

  signProspect(playerId){
    const sc = G.scouting;
    if(!sc) return;
    const pr = (sc.prospects||[]).find(p=>p.playerId===playerId);
    if(!pr) return;
    const p = G.players[playerId];
    if(!p) return;
    const t = myTeam();
    const cost = Math.round(clamp(salaryFor(p)*0.55, 65000, 180000)/5000)*5000;
    if(!canJoinYouthSquad(p)){ UI.toast('Youth squad is only for under-21 players who have never been in the main squad.'); return; }
    if(squadCount(t, 'dev') >= YOUTH_SQUAD_CAP){ UI.toast(`Youth squad is full (${YOUTH_SQUAD_CAP} max).`); return; }
    setPlayerContract(p, cost, 2, 'flat'); p.squad = 'dev'; p.everTopSquad = false; p.fromScouting = true;
    t.players.push(p.id);
    sc.prospects = sc.prospects.filter(x=>x.playerId!==playerId);
    UI.toast(`${p.name} signed to the youth squad.`);
    addNews(`${p.name} (${p.pos}, ${p.age}yo) signs with the ${t.nick} youth squad from the scouting pipeline.`, {title:'Youth Squad Signing', type:'recruitment', tone:'good', playerId:p.id, teamId:t.id, tag:'Scouting'});
    UI.render();
    UI.showSigningCeremony(p, {team:t, kind:'Youth Squad Signing', salary:cost, years:2, total:cost*2, structure:'Youth contract', role:'Youth squad · salary cap exempt', nextPage:'squad'});
  },

  dismissProspect(playerId){
    if(!G.scouting) return;
    G.scouting.prospects = (G.scouting.prospects||[]).filter(p=>p.playerId!==playerId);
    delete G.players[playerId];
    UI.toast('Prospect dismissed.');
    UI.render();
  },

  hireScout(id){
    const market = (UI._scoutMarket&&UI._scoutMarket.list)||[];
    const s = market.find(x=>x.id===id);
    if(!s){ UI.toast('Scout not found.'); return; }
    G.scouting = G.scouting||{scouts:[],missions:[],prospects:[]};
    G.scouting.scouts.push(s);
    UI.toast(`${s.name} hired as a scout.`);
    UI.render();
  },

  fireScout(id){
    if(!G.scouting) return;
    const s = G.scouting.scouts.find(x=>x.id===id);
    if(!s) return;
    const payoutYears = Math.max(0, (s.yearsLeft || 1) - 1);
    const payout = payoutYears * (s.salary || 0);
    const payoutLine = payout > 0
      ? `<p style="color:var(--red);font-size:13px">Contract payout: <b>${money(payout)}</b> (${payoutYears} year${payoutYears===1?'':'s'} remaining × ${money(s.salary)})</p>`
      : `<p style="color:var(--muted);font-size:13px">No payout — contract is in its final year.</p>`;
    UI.modal(`<h3>Release ${esc(s.name)}?</h3>
      ${payoutLine}
      <p style="font-size:12px;color:var(--muted)">Any active missions will be cancelled.</p>
      <div class="btnrow">
        <button class="btn primary" style="background:var(--red)" onclick="UI._confirmFireScout(${id}, ${payout})">Confirm</button>
        <button class="btn" onclick="UI.closeModal()">Cancel</button>
      </div>`);
  },

  _confirmFireScout(id, payout){
    if(!G.scouting) return;
    if(payout > 0){
      G.club.funds = (G.club.funds || 0) - payout;
      addNews(`Scout release payout: ${money(payout)} paid from club funds.`, {type:'finance', tone:'bad', tag:'Staff', teamId:G.coach.teamId});
    }
    G.scouting.scouts   = G.scouting.scouts.filter(s=>s.id!==id);
    G.scouting.missions = G.scouting.missions.filter(m=>m.scoutId!==id);
    UI.closeModal();
    UI.toast(payout > 0 ? `Scout released. ${money(payout)} payout deducted.` : 'Scout released.');
    UI.render();
  },

  extendScout(id){
    const s = (G.scouting && G.scouting.scouts || []).find(x=>x.id===id);
    if(!s) return;
    const demandMult = 1.05 + (s.ability / 90) * 0.18;
    const newSalary = Math.round(s.salary * demandMult / 5000) * 5000;
    const salaryChange = newSalary - s.salary;
    const salColour = salaryChange > 0 ? 'var(--red)' : 'var(--green)';
    UI.modal(`<h3>Extend ${esc(s.name)}</h3>
      <p class="page-sub">Scout · Ability ${s.ability}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0">
        <div class="card" style="padding:10px">
          <div style="font-size:11px;color:var(--muted)">Current salary</div>
          <div style="font-size:18px;font-weight:700">${money(s.salary)}</div>
        </div>
        <div class="card" style="padding:10px">
          <div style="font-size:11px;color:var(--muted)">Demand</div>
          <div style="font-size:18px;font-weight:700;color:${salColour}">${money(newSalary)} <span style="font-size:12px">(${salaryChange>0?'+':''}${money(salaryChange)})</span></div>
        </div>
      </div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:12px">Choose extension length:</p>
      <div class="btnrow">
        <button class="btn sm primary" onclick="UI._confirmExtendScout(${id}, 1, ${newSalary})">1 year</button>
        <button class="btn sm primary" onclick="UI._confirmExtendScout(${id}, 2, ${newSalary})">2 years</button>
        <button class="btn sm primary" onclick="UI._confirmExtendScout(${id}, 3, ${newSalary})">3 years</button>
        <button class="btn" onclick="UI.closeModal()">Cancel</button>
      </div>`);
  },

  _confirmExtendScout(id, years, newSalary){
    const s = (G.scouting && G.scouting.scouts || []).find(x=>x.id===id);
    if(!s) return;
    s.yearsLeft = (s.yearsLeft || 1) + years;
    s.salary = newSalary;
    UI.closeModal();
    UI.toast(`${s.name} extended for ${years} year${years===1?'':'s'} at ${money(newSalary)}/yr.`);
    UI.render();
  },
});
