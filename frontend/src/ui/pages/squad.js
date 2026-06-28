import { UI } from "../01-core.js";


/* Squad list — main, train & trial, and youth squads */
Object.assign(UI, {
  _squadPos: 'all',

  p_squad(){
    const t = myTeam();
    const all = t.players.map(id=>G.players[id]).filter(Boolean);
    const top   = all.filter(p=>p.squad==='top' || (!p.squad && p.squad!=='trial' && p.squad!=='dev'));
    const trial = all.filter(p=>p.squad==='trial');
    const dev   = all.filter(p=>p.squad==='dev');

    const posFilter = UI._squadPos || 'all';
    const POSITIONS = ['all','FB','WG','CE','FE','HB','PR','HK','SR','LK'];
    const matchPos = p => posFilter==='all' || p.pos===posFilter || p.pos2===posFilter;

    const k = UI.sortKey, dir = UI.sortDir;
    const val = p => k==='name'?p.name : k==='pos'?nrlPosIdx(p) : k==='sal'?p.salary : k==='yrs'?p.years : k==='avg'?(p.s.g?p.s.rSum/p.s.g:0) : k==='t'?p.s.t : k==='fp'?(p.s.fpts||0) : k==='cond'?p.cond : k==='form'?formText(p) : k==='mor'?(p.morale||50) : k==='age'?p.age : k==='pot'?scoutedPotential(p).mid : p.ovr;
    const sort = arr => {
      if(k==='pos') return arr.slice().sort((a,b)=>nrlSort(a,b)*dir);
      return arr.slice().sort((a,b)=>{ const x=val(a), y=val(b); return (x<y?-1:x>y?1:0)*dir; });
    };

    const totalSal = teamSalary(t);
    const capPct = Math.min(100, Math.round(totalSal/G.config.cap*100));
    const injured = top.filter(p=>p.injury);
    const expiring = top.filter(p=>p.years<=1 && !p.injury);
    const lowMorale = top.filter(p=>(p.morale||50)<40);
    const transferRequests = top.filter(p=>p.transferRequest);
    const alertCount = expiring.length + lowMorale.length + transferRequests.length;

    const miniBar = (pct, col) =>
      `<div style="height:4px;background:var(--card2);border-radius:2px;overflow:hidden;margin-top:3px;width:44px">
        <div style="width:${pct}%;height:100%;background:${col};border-radius:2px"></div></div>`;

    const summary = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0">
      <div class="card" style="padding:10px 14px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Cap Usage</div>
        <div style="font-size:18px;font-weight:700;font-family:var(--disp)">${money(totalSal)} <span style="font-size:11px;color:var(--muted)">/ ${money(G.config.cap)}</span></div>
        <div style="height:5px;background:var(--card2);border-radius:3px;overflow:hidden;margin:6px 0 4px">
          <div style="width:${capPct}%;height:100%;background:${capPct>95?'var(--red)':capPct>80?'var(--accent)':'var(--green)'};border-radius:3px"></div></div>
        <div style="font-size:11px;color:${totalSal>G.config.cap?'var(--red)':'var(--muted)'}">${totalSal>G.config.cap?`${money(totalSal-G.config.cap)} over cap`:`${money(G.config.cap-totalSal)} room`}</div>
      </div>
      <div class="card" style="padding:10px 14px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Squad Size</div>
        <div style="font-size:18px;font-weight:700;font-family:var(--disp)">${top.length}<span style="font-size:12px;color:var(--muted)">/${TOP_SQUAD_CAP}</span></div>
        <div style="height:5px;background:var(--card2);border-radius:3px;overflow:hidden;margin:6px 0 4px">
          <div style="width:${Math.round(top.length/TOP_SQUAD_CAP*100)}%;height:100%;background:${top.length>=TOP_SQUAD_CAP?'var(--red)':'var(--accent)'};border-radius:3px"></div></div>
        <div style="font-size:11px;color:var(--muted)">${trial.length} T&T · ${dev.length} youth</div>
      </div>
      <div class="card" style="padding:10px 14px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Availability</div>
        <div style="font-size:18px;font-weight:700;font-family:var(--disp);color:${injured.length?'var(--red)':'var(--ink)'}">${top.length-injured.length}<span style="font-size:12px;color:var(--muted)">/${top.length} fit</span></div>
        <div style="height:5px;background:var(--card2);border-radius:3px;overflow:hidden;margin:6px 0 4px">
          <div style="width:${top.length?Math.round((top.length-injured.length)/top.length*100):100}%;height:100%;background:${injured.length>3?'var(--red)':injured.length?'var(--accent)':'var(--green)'};border-radius:3px"></div></div>
        <div style="font-size:11px;color:${injured.length?'var(--red)':'var(--muted)'}">${injured.length?`${injured.length} injured`:'Full strength'}</div>
      </div>
      <div class="card" style="padding:10px 14px;cursor:pointer" onclick="UI.go('contracts')">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Alerts</div>
        <div style="font-size:18px;font-weight:700;font-family:var(--disp);color:${alertCount?'var(--accent)':'var(--green)'}">${alertCount||'✓'}</div>
        <div style="height:5px;background:var(--card2);border-radius:3px;overflow:hidden;margin:6px 0 4px">
          <div style="width:${alertCount?Math.min(100,alertCount*10):5}%;height:100%;background:${alertCount?'var(--accent)':'var(--green)'};border-radius:3px"></div></div>
        <div style="font-size:11px;color:var(--muted)">${[transferRequests.length?`${transferRequests.length} transfer req.`:'', expiring.length?`${expiring.length} expiring`:'', lowMorale.length?`${lowMorale.length} low morale`:''].filter(Boolean).join(' · ')||'All good'}</div>
      </div>
    </div>`;

    const posFilters = POSITIONS.map(pos=>{
      const count = pos==='all' ? top.length : top.filter(p=>p.pos===pos||p.pos2===pos).length;
      return `<button class="btn sm${posFilter===pos?' primary':''}" onclick="UI._squadPos='${pos}';UI.render()">${pos==='all'?'All':pos} <span style="opacity:.55;font-size:10px">${count}</span></button>`;
    }).join('');

    const navRow = `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <div class="btnrow" style="margin:0;flex-wrap:wrap">${posFilters}</div>
      <div class="btnrow" style="margin:0">
        <button class="btn sm" onclick="UI.go('teamsheet')">Team sheet</button>
        <button class="btn sm" onclick="UI.go('injuryward')">Injury ward</button>
        <button class="btn sm" onclick="UI.go('contracts')">Contracts</button>
        <button class="btn sm" onclick="UI.go('recruitment')">Sign T&T →</button>
        ${UI.sortKey!=='ovr'||UI.sortDir!==-1?`<button class="btn sm" onclick="UI.sortKey='ovr';UI.sortDir=-1;UI.render()">Reset sort</button>`:''}
      </div>
    </div>`;

    const th = (key,label,num)=>`<th class="${num?'num':''}" onclick="UI.sort('${key}')">${label}${UI.sortKey===key?(dir<0?' ▾':' ▴'):''}</th>`;
    const tableHead = `<tr>
      ${th('name','Player')}${th('age','Age',1)}${th('pos','Pos')}${th('ovr','OVR',1)}${th('pot','Est. POT',1)}
      ${th('cond','Cond',1)}${th('form','Form',1)}${th('mor','Morale',1)}
      ${th('t','T',1)}${th('fp','FP',1)}${th('avg','Avg',1)}
      ${th('sal','Salary',1)}${th('yrs','Yrs',1)}
      <th class="noclick">Status</th><th class="noclick"></th>
    </tr>`;

    const trialThHead = `<tr>
      ${th('name','Player')}${th('age','Age',1)}${th('pos','Pos')}${th('ovr','OVR',1)}
      ${th('cond','Cond',1)}${th('form','Form',1)}${th('t','T',1)}${th('avg','Avg',1)}${th('sal','Salary',1)}
      <th class="noclick">Games</th><th class="noclick"></th>
    </tr>`;

    const trialRow = p => {
      const g = trialGamesUsed(p);
      const atLimit = g >= TRIAL_GAME_CAP;
      const bar = `<div style="width:52px;height:5px;background:var(--card2);border-radius:3px;overflow:hidden;display:inline-block;vertical-align:middle;margin-left:4px"><div style="width:${Math.min(100,g/TRIAL_GAME_CAP*100)}%;height:100%;background:${atLimit?'var(--red)':'var(--accent)'}"></div></div>`;
      return `<tr class="click" onclick="UI.playerModal(${p.id})">
        <td><div class="player-cell">${playerAvatar(p,34)}<div><b>${playerTierBadge(p,true)} ${nationalityFlag(p.nationality)} ${esc(p.name)}</b><br><span style="font-size:9px;font-weight:800;letter-spacing:.06em;color:var(--accent);background:var(--accent-a18);padding:1px 5px;border-radius:8px">T&T CONTRACT</span></div></div></td>
        <td class="num">${p.age}</td>
        <td><span class="pos-tag">${p.pos}</span></td>
        <td class="num"><span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span></td>
        <td class="num" style="color:${p.cond<60?'var(--red)':'var(--muted)'}">${Math.round(p.cond)}</td>
        <td class="num">${formHtml(p)}</td>
        <td class="num">${p.s.t}</td>
        <td class="num">${p.s.g?(p.s.rSum/p.s.g).toFixed(1):'—'}</td>
        <td class="num">${money(p.salary)}</td>
        <td class="num" style="white-space:nowrap">${g}/${TRIAL_GAME_CAP}${bar}${atLimit?`<br><span style="color:var(--red);font-size:10px;font-weight:700">MUST UPGRADE</span>`:''}</td>
        <td onclick="event.stopPropagation()" style="white-space:nowrap">
          <div style="display:flex;flex-direction:column;gap:3px">
            <button class="btn sm primary" onclick="UI.upgradeTrialContract(${p.id})">Upgrade</button>
            <button class="btn sm" style="color:var(--red)" onclick="UI.releaseTrialPlayer(${p.id})">Release</button>
          </div>
        </td>
      </tr>`;
    };

    const filtered = sort(top).filter(matchPos);

    return `<h1 class="page">Squad</h1>
    ${summary}
    ${navRow}
    <div class="card" style="padding:6px;overflow-x:auto">
      <div class="navsep" style="margin:4px 0 6px">Main Squad${posFilter!=='all'?` · ${posFilter}`:''} (${filtered.length}${posFilter!=='all'?`/${top.filter(matchPos).length}`:''}/${TOP_SQUAD_CAP}) ${top.length>=TOP_SQUAD_CAP?`<span style="color:var(--red);font-size:11px;font-weight:700;margin-left:8px">SQUAD FULL — sign depth to T&T</span>`:''}</div>
      <table><thead>${tableHead}</thead><tbody>${filtered.map(p=>UI.playerRow(p,'none')).join('')}</tbody></table>
    </div>
    ${trial.length||top.length>=TOP_SQUAD_CAP?`<div class="card" style="padding:6px;overflow-x:auto;margin-top:12px">
      <div class="navsep" style="margin:4px 0 6px">Train & Trial (${trial.length}/${TRIAL_SQUAD_CAP})</div>
      <p style="color:var(--muted);font-size:12px;margin:0 0 8px">Short-term depth — 1-year contracts capped at ${money(TRIAL_SALARY_CAP)}. Do not count against the salary cap. After ${TRIAL_GAME_CAP} games they <b>must be upgraded</b> or released. <span class="click" style="color:var(--accent);cursor:pointer" onclick="UI.go('recruitment')">Sign a T&T player →</span></p>
      ${trial.length?`<table><thead>${trialThHead}</thead><tbody>${trial.map(trialRow).join('')}</tbody></table>`:'<p style="color:var(--dim);font-size:12px;padding:6px 0">No train & trial players currently signed.</p>'}
    </div>`:''}
    ${dev.length?`<div class="card" style="padding:6px;overflow-x:auto;margin-top:12px">
      <div class="navsep" style="margin:4px 0 6px">Youth Squad (${dev.length}/${YOUTH_SQUAD_CAP})</div>
      <p style="color:var(--muted);font-size:12px;margin:0 0 8px">Under-21 development group. Cannot be selected until promoted; once promoted they cannot return to youth. Salaries do not count against the cap.</p>
      <table><thead>${tableHead}</thead><tbody>${sort(dev).map(p=>UI.playerRow(p,'top')).join('')}</tbody></table>
    </div>`:''}`;
  },

  playerRow(p, promoteAction){
    const btn = promoteAction==='top'
      ? `<button class="btn sm" onclick="event.stopPropagation();UI.promotePlayer(${p.id})">↑ Promote</button>`
      : promoteAction==='dev'
        ? `<button class="btn sm" style="opacity:.7" onclick="event.stopPropagation();UI.demotePlayer(${p.id})">↓ Youth</button>`
        : '';

    const morale = p.morale || 50;
    const morCol = morale < 40 ? 'var(--red)' : morale > 70 ? 'var(--green)' : 'var(--muted)';
    const condCol = p.cond < 60 ? 'var(--red)' : p.cond < 75 ? 'var(--accent)' : 'var(--muted)';
    const miniBar = (pct, col) =>
      `<div style="height:3px;background:var(--card2);border-radius:2px;overflow:hidden;margin-top:3px;width:40px"><div style="width:${pct}%;height:100%;background:${col};border-radius:2px"></div></div>`;

    const rotBadge = (()=>{
      if(p.squad !== 'top') return '';
      const wd = p.weeksDropped || 0, ws = p.weeksStarting || 0;
      if(wd >= 3) return `<span style="color:var(--red);font-size:10px;font-weight:700">Out ${wd}w</span>`;
      if(ws >= 3) return `<span style="color:var(--green);font-size:10px">${ws}w starter</span>`;
      return '';
    })();

    const ovrDelta = (()=>{
      const g = (p.seasonStartOvr != null) ? p.ovr - p.seasonStartOvr : 0;
      if(!g) return '';
      return `<br><span style="color:${g>0?'var(--green)':'var(--red)'};font-size:10px;font-weight:700">${g>0?'+':''}${g}</span>`;
    })();

    const yrsStyle = p.years <= 1 ? 'color:var(--red);font-weight:700' : p.years === 2 ? 'color:var(--accent)' : 'color:var(--muted)';

    return `<tr class="click" onclick="UI.playerModal(${p.id})">
      <td><div class="player-cell">${playerAvatar(p,34)}<div>
        <b>${playerTierBadge(p,true)} ${nationalityFlag(p.nationality)} ${esc(p.name)}</b>
        <br><span class="pmeta" style="color:var(--muted);font-size:11px">${esc(p.style)}${p.repTeam?` · ${esc(p.repTeam)}`:''}</span>
        ${promiseSummary(p)?`<br><span style="color:var(--accent);font-size:10px">📋 ${esc(promiseSummary(p))}</span>`:''}
      </div></div></td>
      <td class="num">${p.age}</td>
      <td><span class="pos-tag">${p.pos}</span> <span class="pos-tag" style="opacity:.55">${p.pos2}</span></td>
      <td class="num"><span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span>${ovrDelta}</td>
      <td class="num" style="color:var(--muted)">${p.squad==='dev'&&p.ovr>=60?`<span style="color:var(--green)">${potText(p)} ★</span><br><span style="color:var(--dim);font-size:10px">${scoutedPotential(p).confidence} conf.</span>`:potHtml(p)}</td>
      <td class="num" style="color:${condCol}">${Math.round(p.cond)}${miniBar(Math.round(p.cond), condCol)}</td>
      <td class="num">${formHtml(p)}</td>
      <td class="num" style="color:${morCol}">${Math.round(morale)}${miniBar(morale, morCol)}${rotBadge?`<br>${rotBadge}`:''}</td>
      <td class="num">${p.s.t}</td>
      <td class="num">${p.s.fpts||0}</td>
      <td class="num">${p.s.g?(p.s.rSum/p.s.g).toFixed(1):'—'}</td>
      <td class="num">${money(p.salary)}</td>
      <td class="num" style="${yrsStyle}">${p.years}</td>
      <td>${p.transferRequest?`<span class="inj" style="background:var(--red-a12);color:var(--red)">Transfer req.</span>`:p.injury?`<span class="inj">${esc(p.injury.n)} · ${p.injury.weeks}w</span>`:''}</td>
      <td>${btn}</td>
    </tr>`;
  },

  promotePlayer(pid){
    const p = G.players[pid]; if(!p) return;
    const t = myTeam();
    if(G.godMode){
      const owner = G.teams.find(t=>t.players.includes(pid));
      if(owner) owner.lineup = (owner.lineup || []).map(id=>id===pid?null:id);
      p.squad = 'top';
      p.everTopSquad = true;
      UI.toast(`${p.name} promoted to top squad.`);
      UI.render();
      return;
    }
    if(squadCount(t,'top')>=TOP_SQUAD_CAP){ UI.toast(`Main squad is full (${TOP_SQUAD_CAP} max). Release a player first.`); return; }
    p.squad = 'top';
    p.everTopSquad = true;
    UI.toast(`${p.name} promoted to top squad.`);
    UI.render();
  },

  demotePlayer(pid){
    const p = G.players[pid]; if(!p) return;
    const t = myTeam();
    if(p.everTopSquad || p.squad==='top' || !p.squad){ UI.toast('Main squad players cannot be moved to the youth squad.'); return; }
    if(!canJoinYouthSquad(p)){ UI.toast('Youth squad is only for under-21 players who have never been in the main squad.'); return; }
    if(squadCount(t,'dev')>=YOUTH_SQUAD_CAP){ UI.toast(`Youth squad is full (${YOUTH_SQUAD_CAP} max).`); return; }
    if(t.lineup.slice(0,17).includes(pid)){ UI.toast(`${p.name} is in the current 19 — remove them from the team sheet first.`); return; }
    p.squad = 'dev';
    UI.toast(`${p.name} moved to youth squad.`);
    UI.render();
  },

  sort(k){ if(UI.sortKey===k) UI.sortDir*=-1; else{ UI.sortKey=k; UI.sortDir=-1; } UI.render(); },

  upgradeTrialContract(pid){
    const p = G.players[pid]; if(!p || p.squad!=='trial') return;
    const t = myTeam();
    if(squadCount(t,'top')>=TOP_SQUAD_CAP){ UI.toast(`Main squad is full (${TOP_SQUAD_CAP} max). Release a player first.`); return; }
    const demand = demandFor(p, t);
    UI._contractOffer = {pid, salary:demand, years:1, promises:{role:'none', captain:false, contractType:'flat'}, demand, isFreeAgent:false, isTrialUpgrade:true};
    UI.renderFreeAgentOffer();
  },

  releaseTrialPlayer(pid){
    const p = G.players[pid]; if(!p || p.squad!=='trial') return;
    UI.modal(`<h3>Release ${esc(p.name)}?</h3>
      <p class="page-sub">T&T contracts have no release payout. This player will become a free agent immediately.</p>
      <div class="btnrow">
        <button class="btn primary" style="background:var(--red)" onclick="UI._confirmReleaseTrial(${pid})">Release</button>
        <button class="btn" onclick="UI.closeModal()">Cancel</button>
      </div>`);
  },

  _confirmReleaseTrial(pid){
    const p = G.players[pid]; if(!p) return;
    const t = myTeam();
    t.players = t.players.filter(id=>id!==pid);
    t.lineup = t.lineup.map(id=>id===pid?null:id);
    p.squad = null;
    p.trialGames = 0;
    p.trialBreakout = false;
    if(!G.freeAgents) G.freeAgents = [];
    if(!G.freeAgents.includes(pid)) G.freeAgents.push(pid);
    addNews(`${p.name} released from train & trial contract.`, {type:'contract', tone:'neutral', tag:'Contracts', teamId:G.coach.teamId});
    UI.closeModal();
    UI.toast(`${p.name} released to free agency.`);
    UI.render();
  },
});
