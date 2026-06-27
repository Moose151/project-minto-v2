import { UI } from "../01-core.js";


const TEAM_CHANNELS = [
  {key:'middle', label:'Middle', slots:[7,8,9,12], atk:['strength','ballRunning','workRate','stamina'], def:['tackling','markerDef','strength','workRate']},
  {key:'leftEdge', label:'Left edge', slots:[3,4,11], atk:['speed','acceleration','ballRunning','finishing'], def:['tackling','defRead','markerDef','workRate']},
  {key:'rightEdge', label:'Right edge', slots:[1,2,10], atk:['speed','acceleration','ballRunning','finishing'], def:['tackling','defRead','markerDef','workRate']},
  {key:'backThree', label:'Back three', slots:[0,1,4], atk:['speed','acceleration','catching','ballRunning'], def:['catching','defRead','lastDitch','kickAccuracy']},
  {key:'spine', label:'Spine', slots:[0,5,6,8], atk:['playmaking','vision','shortPass','kickAccuracy'], def:['decisionMaking','composure','tackling','defRead']},
];

const TEAM_COMBINATIONS = [
  {key:'halves', label:'Halves', slots:[5,6]},
  {key:'hookerHalves', label:'Hooker/halves', slots:[5,6,8]},
  {key:'spine', label:'Spine', slots:[0,5,6,8]},
  {key:'leftEdge', label:'Left edge', slots:[3,4,11]},
  {key:'rightEdge', label:'Right edge', slots:[1,2,10]},
  {key:'middle', label:'Middle rotation', slots:[7,8,9,12,13,14,15,16]},
  {key:'backThree', label:'Back three', slots:[0,1,4]},
];

function diagPlayers(t, slots){
  return slots.map(i => ({slot:i, p:G.players[t.lineup && t.lineup[i]]})).filter(x=>x.p);
}
function diagAvg(players, attrs){
  if(!players.length) return 0;
  return Math.round(players.reduce((s,x)=>s + attrs.reduce((a,k)=>a+(x.p.attrs[k]||50),0) / attrs.length,0) / players.length);
}
function diagStats(players){
  return players.reduce((s,x)=>{
    const st = x.p.s || {};
    s.g += st.g || 0; s.t += st.t || 0; s.runs += st.runs || 0; s.m += st.m || 0;
    s.lb += st.lb || 0; s.err += st.err || 0; s.tk += st.tk || 0; s.mt += st.mt || 0;
    s.ks += st.ks || 0; s.km += st.km || 0;
    return s;
  }, {g:0,t:0,runs:0,m:0,lb:0,err:0,tk:0,mt:0,ks:0,km:0});
}
function diagSignature(ids){
  return ids.slice().sort((a,b)=>a-b).join('-');
}
function diagChemistry(t, combo){
  const players = diagPlayers(t, combo.slots);
  const ids = players.map(x=>x.p.id);
  const saved = t.combinations && t.combinations[combo.key];
  if(saved && saved.sig === diagSignature(ids)) return {rating:saved.rating, matches:saved.matches || 0, fresh:true};
  if(players.length < 2) return {rating:35, matches:0, fresh:false};
  const avgFit = players.reduce((s,x)=>s + slotSpecialistFit(x.p, x.slot) + familiarity(x.p, SLOTS[x.slot].pos), 0) / (players.length * 2);
  const avgIQ = players.reduce((s,x)=>s + ((x.p.attrs.decisionMaking||50) + (x.p.attrs.composure||50)) / 2, 0) / players.length;
  return {rating:clamp(Math.round(34 + avgFit * 22 + (avgIQ - 50) * .32 + ((t.cohesion || 50) - 50) * .18), 25, 88), matches:0, fresh:false};
}
function diagBar(v){
  const color = v >= 72 ? 'var(--green)' : v < 48 ? 'var(--red)' : 'var(--accent)';
  return `<span style="display:inline-flex;align-items:center;gap:5px;min-width:62px;justify-content:flex-end"><span style="width:34px;height:5px;background:var(--line);border-radius:4px;overflow:hidden"><span style="display:block;width:${clamp(v,0,100)}%;height:100%;background:${color}"></span></span><b style="color:${color}">${v}</b></span>`;
}

/* Clubs browser + club squad modal */
Object.assign(UI, {
  _teamsSort: 'ladder',

  p_teams(){
    const lad = ladder();
    const sortFn = {
      ladder:   (a, b) => lad.findIndex(r=>r.id===a.id) - lad.findIndex(r=>r.id===b.id),
      ovr:      (a, b) => squadStrength(b) - squadStrength(a),
      name:     (a, b) => a.nick.localeCompare(b.nick),
      prestige: (a, b) => (typeof clubPrestigeScore==='function'?clubPrestigeScore(b)-clubPrestigeScore(a):0),
    }[UI._teamsSort] || ((a,b) => 0);

    const sorted = [...G.teams].sort(sortFn);
    const sortBtn = key => `<button class="btn sm ${UI._teamsSort===key?'primary':''}" onclick="UI._teamsSort='${key}';UI.render()">${{ladder:'Ladder',ovr:'OVR',name:'Name',prestige:'Prestige'}[key]}</button>`;

    const hofByTeam = {};
    (G.hallOfFame||[]).forEach(h=>{ if(h.teamId!=null) hofByTeam[h.teamId]=(hofByTeam[h.teamId]||0)+1; });

    const cards = sorted.map(t => {
      const r = lad.find(x=>x.id===t.id) || {w:0,l:0,pts:0};
      const pos = lad.findIndex(x=>x.id===t.id)+1;
      const tr = scoutedTeamRating(t, 'overall');
      const coach = t.headCoach;
      const coachRep = coach ? (coach.rep>=60?'Elite coach':coach.rep>=45?'Experienced':coach.rep>=30?'Developing':'Junior') : '';
      const newCoach = coach && (coach.seasons||0) === 0;
      const legends = hofByTeam[t.id] || 0;
      const facAvg = typeof teamFacilityAverage === 'function' ? teamFacilityAverage(t) : 2;
      return `<div class="tp" onclick="UI.teamModal(${t.id})">
        <div style="float:right">${teamLogo(t,46)}</div>
        <div class="city">${esc(t.city)}</div>
        <div class="nick">${esc(t.nick)}</div>
        <div style="margin:5px 0">${clubPrestigeBadge(t)}</div>
        <div class="str">${ord(pos)} · ${r.w}-${r.l} · OVR <span class="${tr.cls}">${tr.text}</span></div>
        <div class="team-rating-row">${teamRatingPill(t,'atk','ATT')}${teamRatingPill(t,'def','DEF')}${teamRatingPill(t,'coh','COH')}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">Facilities avg Lv ${facAvg.toFixed(1)}</div>
        ${coach ? `<div style="font-size:10px;color:var(--muted);margin-top:4px">HC: ${esc(coach.name)} · ${coachRep}${newCoach?' <span style="color:var(--accent)">NEW</span>':''}</div>` : ''}
        ${legends ? `<div style="font-size:10px;color:var(--accent);margin-top:2px">HoF: ${legends} legend${legends===1?'':'s'}</div>` : ''}
      </div>`;
    }).join('');

    return `<h1 class="page">Clubs</h1>
    <p class="page-sub">Every club in the ${esc(G.config.leagueName)}. Tap to inspect a squad.</p>
    <div class="btnrow" style="margin-bottom:12px">${sortBtn('ladder')}${sortBtn('ovr')}${sortBtn('prestige')}${sortBtn('name')}</div>
    <div class="team-pick">${cards}</div>`;
  },

  teamModal(id){
    const t = G.teams[id];
    const lad = ladder();
    const pos = lad.findIndex(r=>r.id===t.id)+1;
    const rec = lad.find(r=>r.id===t.id)||{w:0,l:0,pts:0};
    const rows = t.players.map(i=>G.players[i]).filter(Boolean).sort(nrlSort);
    const coach = t.headCoach;
    const coachPhilInfo = coach && coach.philosophy ? (COACH_PHILOSOPHIES||[]).find(p=>p.key===coach.philosophy) : null;
    const coachLine = coach ? `<p style="font-size:12px;color:var(--muted);margin:4px 0 0">Head coach: <b>${esc(coach.name)}</b> · Rep ${coach.rep}${coachPhilInfo?` · <span style="color:var(--ink)">${coachPhilInfo.label}</span>`:''}</p>` : '';
    const godTeam = G.godMode ? `<div class="btnrow" style="margin:8px 0"><button class="btn danger sm" onclick="UI.teamEditModal(${t.id})">Edit team</button></div>` : '';
    const godActions = p => G.godMode ? `<div class="btnrow" style="margin:0;gap:4px">
      <button class="btn sm" onclick="event.stopPropagation();UI.godToggleSquad(${p.id})">${p.squad==='dev'?'Main':'Youth'}</button>
      <button class="btn sm danger" onclick="event.stopPropagation();UI.godReleasePlayer(${p.id})">Release</button>
    </div>` : '';
    const hofLegends = (G.hallOfFame||[]).filter(h=>h.teamId===t.id);
    const legendLine = hofLegends.length ? `<p style="font-size:11px;color:var(--accent);margin:4px 0 0">Hall of Fame legends: ${hofLegends.slice(0,4).map(h=>esc(h.name)).join(', ')}${hofLegends.length>4?` +${hofLegends.length-4} more`:''}</p>` : '';
    const newCoachBadge = t.headCoach && (t.headCoach.seasons||0)===0 ? `<span style="font-size:10px;background:var(--accent-a18);color:var(--accent);padding:1px 5px;border-radius:4px;margin-left:6px">NEW COACH</span>` : '';
    const facKeys = Object.keys(FACILITY_DEFS);
    const facSummary = typeof teamFacilityLevel === 'function' ? `<div class="card" style="padding:8px;margin:8px 0">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Facilities · Avg Lv ${teamFacilityAverage(t).toFixed(1)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${facKeys.map(k=>`<span style="font-size:11px;color:var(--muted)">${esc(FACILITY_DEFS[k].label)} <b style="color:var(--ink)">Lv ${teamFacilityLevel(t,k)}</b></span>`).join('')}</div>
    </div>` : '';
    UI.modal(`<h3 style="display:flex;align-items:center;gap:10px">${teamLogo(t,54)}<span>${esc(teamName(t))}</span></h3>
    <p class="page-sub">${ord(pos)} · ${rec.w}-${rec.l} · Payroll ${money(teamSalary(t))} · ${t.id===G.coach.teamId?'ratings exact':'opposition — scouting estimates'}</p>
    <div style="margin:6px 0">${clubPrestigeBadge(t)}</div>
    ${legendLine}
    ${coachLine}${newCoachBadge}
    ${facSummary}
    <div class="team-rating-row" style="margin:8px 0 12px">${teamRatingPill(t,'overall','OVR')}${teamRatingPill(t,'atk','ATT')}${teamRatingPill(t,'def','DEF')}${teamRatingPill(t,'coh','COH')}</div>
    ${UI.teamDiagnosticsHtml(t)}
    ${godTeam}
    <div style="max-height:440px;overflow-y:auto"><table><thead><tr>
      <th class="noclick">Player</th><th class="noclick num">Age</th><th class="noclick">Pos</th>
      <th class="noclick num">OVR</th><th class="noclick num">Salary</th><th class="noclick num">Yrs</th>${G.godMode?'<th class="noclick"></th>':''}
    </tr></thead><tbody>
    ${rows.map(p=>`<tr class="click" onclick="UI.playerModal(${p.id})">
      <td>${playerTierBadge(p,true)} ${esc(p.name)}</td><td class="num">${p.age}</td>
      <td><span class="pos-tag">${p.pos}</span></td>
      <td class="num"><span class="ovr ${ovrCls(scoutedOvr(p).mid)}">${t.id===G.coach.teamId?p.ovr:ovrText(p)}</span></td>
      <td class="num">${money(p.salary)}</td><td class="num">${Math.max(0,p.years)}</td>${G.godMode?`<td>${godActions(p)}</td>`:''}
    </tr>`).join('')}
    </tbody></table></div>
    <div class="btnrow" style="margin-top:12px"><button class="btn" onclick="UI.closeModal()">Close</button></div>`);
	  },

  teamDiagnosticsHtml(t){
    if(!t || !t.lineup) return '';
    const channelRows = TEAM_CHANNELS.map(ch => {
      const players = diagPlayers(t, ch.slots);
      const names = players.map(x=>G.players[x.p.id]).filter(Boolean).map(p=>p.name.split(' ').slice(-1)[0]).join(' / ') || '-';
      const atk = diagAvg(players, ch.atk);
      const def = diagAvg(players, ch.def);
      const st = diagStats(players);
      return `<tr>
        <td><b>${esc(ch.label)}</b><br><span style="font-size:10px;color:var(--muted)">${esc(names)}</span></td>
        <td class="num">${diagBar(atk)}</td>
        <td class="num">${diagBar(def)}</td>
        <td class="num">${st.t}T · ${st.lb}LB</td>
        <td class="num">${st.m}m · ${st.runs}R</td>
        <td class="num">${st.tk}/${st.mt}</td>
        <td class="num">${st.err}</td>
      </tr>`;
    }).join('');
    const comboRows = TEAM_COMBINATIONS.map(c => {
      const players = diagPlayers(t, c.slots);
      const chem = diagChemistry(t, c);
      const names = players.map(x=>x.p.name.split(' ').slice(-1)[0]).join(' / ') || '-';
      const status = chem.matches ? `${chem.matches} match${chem.matches===1?'':'es'} together` : 'projected';
      return `<tr>
        <td><b>${esc(c.label)}</b><br><span style="font-size:10px;color:var(--muted)">${esc(names)}</span></td>
        <td class="num">${diagBar(chem.rating)}</td>
        <td style="font-size:11px;color:var(--muted)">${esc(status)}</td>
      </tr>`;
    }).join('');
    return `<div class="grid2" style="gap:10px;margin:10px 0 12px">
      <div class="card" style="padding:8px;overflow-x:auto">
        <h2 class="sec" style="margin:2px 4px 8px;font-size:12px">Channel diagnostics</h2>
        <table><thead><tr><th class="noclick">Channel</th><th class="noclick num">Attack</th><th class="noclick num">Defence</th><th class="noclick num">Score</th><th class="noclick num">Yardage</th><th class="noclick num">Tk/MT</th><th class="noclick num">Err</th></tr></thead><tbody>${channelRows}</tbody></table>
      </div>
      <div class="card" style="padding:8px;overflow-x:auto">
        <h2 class="sec" style="margin:2px 4px 8px;font-size:12px">Combination chemistry</h2>
        <table><thead><tr><th class="noclick">Group</th><th class="noclick num">Chem</th><th class="noclick">Built from</th></tr></thead><tbody>${comboRows}</tbody></table>
        <p style="font-size:10px;color:var(--muted);margin:6px 4px 0">Playing matches together raises chemistry. New combinations are projected from role fit, position familiarity, decision making and team cohesion.</p>
      </div>
    </div>`;
  },

  teamEditModal(id){
    if(!G.godMode) return;
    const t = G.teams[id]; if(!t) return;
    UI.modal(`<h3>Edit Team</h3>
      <p class="page-sub">God Mode changes apply immediately.</p>
      <div class="grid2">
        <div class="field"><label>City</label><input id="edit_team_city" type="text" value="${esc(t.city)}"></div>
        <div class="field"><label>Nickname</label><input id="edit_team_nick" type="text" value="${esc(t.nick)}"></div>
        <div class="field"><label>Abbreviation</label><input id="edit_team_abbr" type="text" maxlength="4" value="${esc(t.abbr)}"></div>
        <div class="field"><label>Stadium</label><input id="edit_team_stadium" type="text" value="${esc(t.stadium||'Home Ground')}"></div>
        <div class="field"><label>Primary colour</label><input id="edit_team_c1" type="color" value="${esc(t.c1)}"></div>
        <div class="field"><label>Secondary colour</label><input id="edit_team_c2" type="color" value="${esc(t.c2||'#ffffff')}"></div>
        <div class="field"><label>Logo letters</label><input id="edit_team_logo_letters" type="text" maxlength="3" value="${esc((ensureTeamLogo(t).letters||t.abbr||'').slice(0,3))}"></div>
        <div class="field"><label>Logo shape</label><select id="edit_team_logo_shape">${['shield','round','diamond','hex'].map(s=>`<option value="${s}" ${ensureTeamLogo(t).shape===s?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="field"><label>Logo stripe</label><select id="edit_team_logo_stripe">${[[0,'Vertical'],[1,'Diagonal'],[2,'Hoops']].map(([v,l])=>`<option value="${v}" ${Number(ensureTeamLogo(t).stripe||0)===v?'selected':''}>${l}</option>`).join('')}</select></div>
        <div class="card" style="display:flex;align-items:center;justify-content:center">${teamLogo(t,88)}</div>
      </div>
      <div class="btnrow"><button class="btn primary" onclick="UI.saveTeamEdit(${t.id})">Save team</button><button class="btn" onclick="UI.teamModal(${t.id})">Cancel</button></div>`);
  },
  saveTeamEdit(id){
    if(!G.godMode) return;
    const t = G.teams[id]; if(!t) return;
    const val = key => document.getElementById(key).value.trim();
    t.city = val('edit_team_city') || t.city;
    t.nick = val('edit_team_nick') || t.nick;
    t.abbr = (val('edit_team_abbr') || t.abbr).slice(0,4).toUpperCase();
    t.stadium = val('edit_team_stadium') || t.stadium || 'Home Ground';
    t.c1 = val('edit_team_c1') || t.c1;
    t.c2 = val('edit_team_c2') || t.c2;
    t.logo = t.logo || {};
    t.logo.letters = (val('edit_team_logo_letters') || t.abbr).replace(/[^A-Za-z0-9]/g,'').slice(0,3).toUpperCase() || t.abbr.slice(0,3);
    t.logo.shape = document.getElementById('edit_team_logo_shape').value;
    t.logo.stripe = +document.getElementById('edit_team_logo_stripe').value || 0;
    UI.toast(`${teamName(t)} updated.`);
    UI.teamModal(id);
    UI.nav();
    UI.topbar();
  },
  godToggleSquad(pid){
    if(!G.godMode) return;
    const p = G.players[pid]; if(!p) return;
    const t = G.teams.find(t=>t.players.includes(pid));
    if(p.squad === 'dev'){
      if(t && squadCount(t, 'top') >= TOP_SQUAD_CAP){ UI.toast(`Main squad is full (${TOP_SQUAD_CAP} max).`); return; }
      p.squad = 'top';
      p.everTopSquad = true;
    }
    else{
      if(p.everTopSquad || p.squad === 'top' || !p.squad){ UI.toast('Main squad players cannot be moved to the youth squad.'); return; }
      if(!canJoinYouthSquad(p)){ UI.toast('Youth squad is only for under-21 players who have never been in the main squad.'); return; }
      if(t && squadCount(t, 'dev') >= YOUTH_SQUAD_CAP){ UI.toast(`Youth squad is full (${YOUTH_SQUAD_CAP} max).`); return; }
      if(t) t.lineup = (t.lineup || []).map(id=>id===pid?null:id);
      p.squad = 'dev';
    }
    UI.toast(`${p.name} moved to ${p.squad==='dev'?'youth':'main'} squad.`);
    if(t) UI.teamModal(t.id); else UI.render();
  },
  godReleasePlayer(pid){
    if(!G.godMode) return;
    const p = G.players[pid]; if(!p) return;
    const t = G.teams.find(t=>t.players.includes(pid));
    if(!t) return;
    if(!confirm(`Release ${p.name} from ${teamName(t)}?`)) return;
    t.players = t.players.filter(id=>id!==pid);
    t.lineup = (t.lineup || []).map(id=>id===pid?null:id);
    setPlayerContract(p, p.salary || salaryFor(p), 0, 'flat');
    p.squad = 'top';
    p.everTopSquad = true;
    p.trialGames = 0;
    p.trialBreakout = false;
    p.promises = null;
    p.promiseTeam = null;
    if(!G.freeAgents) G.freeAgents = [];
    if(!G.freeAgents.includes(pid)) G.freeAgents.push(pid);
    addNews(`${p.name} has been released by ${teamName(t)} via God Mode.`, {title:'God Mode Release', type:'godmode', tone:'neutral', playerId:p.id, teamId:t.id, tag:'God Mode'});
    UI.toast(`${p.name} released to free agency.`);
    UI.teamModal(t.id);
  }
});
