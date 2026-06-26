'use strict';

/* Team sheet — pitch layout plus bench/reserves */
const FIELD_SLOT_POS = {
  0:{x:50,y:96},                              // 1 FB — fullback (deepest)
  1:{x:91,y:83}, 4:{x:9,y:83},               // 2 WG right, 5 WG left — far flanks, 13% above FB
  2:{x:71,y:69}, 3:{x:29,y:69},              // 3 CE right, 4 CE left — 14% above WG, clear of overlap
  5:{x:63,y:56}, 6:{x:37,y:56},              // 6 FE, 7 HB — halves, 13% above CE
  9:{x:74,y:43}, 7:{x:26,y:43}, 8:{x:50,y:43}, // 10 PR, 8 PR, 9 HK — front row
  11:{x:68,y:30}, 10:{x:32,y:30},            // 12 SR, 11 SR — second row
  12:{x:50,y:18}                              // 13 LK — lock
};
const COH_LINKS = [[0,1],[0,4],[1,2],[2,5],[3,4],[3,6],[5,6],[5,11],[6,10],[7,8],[8,9],[7,10],[9,11],[10,12],[11,12]];

Object.assign(UI, {
  _teamSheetMode: 'stats',
  _sheetSort: 'ovr',
  _sheetPos: 'all',
  p_teamsheet(){
    const t = myTeam();
    assignDefaultTeamRoles(t);

    const roleBits = p => {
      const out = [];
      if(t.roles.captain===p.id) out.push('C');
      if(t.roles.goalKicker===p.id) out.push('GK');
      if(t.roles.primaryKicker===p.id) out.push('K1');
      if(t.roles.primaryPlaymaker===p.id) out.push('PM1');
      return out.map(r=>`<span class="pos-tag sheet-role">${r}</span>`).join('');
    };
    const playerMeta = (p, slotIdx) => {
      if(!p) return '';
      const s = SLOTS[slotIdx];
      const fam = familiarity(p, s.pos);
      const fit = slotSpecialistFit(p, slotIdx);
      const fitLevel = positionFitLevel(p, slotIdx);
      const effOvr = Math.round(p.ovr * fam * fit);
      const delta = effOvr - p.ovr;
      const deltaHtml = delta < -1 ? ` <span style="color:var(--red);font-size:11px">${delta} eff.</span>` : delta > 1 ? ` <span style="color:var(--green);font-size:11px">+${delta} eff.</span>` : '';
      const extra = UI._teamSheetMode==='skills'
        ? `Atk ${Math.round((p.attrs.playmaking+p.attrs.ballRunning+p.attrs.finishing)/3)} · Def ${Math.round((p.attrs.tackling+p.attrs.defRead+p.attrs.markerDef)/3)} · Kick ${Math.round((p.attrs.kickPower+p.attrs.kickAccuracy)/2)}`
        : `${p.s.g}g · ${p.s.t}T · ${p.s.runs||0} runs · ${p.s.tk}Tk · avg ${p.s.g?(p.s.rSum/p.s.g).toFixed(1):'-'}`;
      const fitText = fit < .98 ? ` · <span style="color:var(--red)">wrong ${slotSide(slotIdx)} side</span>` : fit > 1.02 ? ` · <span style="color:var(--green)">preferred side</span>` : '';
      const fatigue = Math.round(p.fatigue || ((100-p.cond)*0.72 + (p.load||0)*0.48));
      const fatigueHtml = fatigue >= 72 || p.cond < 62 || (p.load||0) > 74 ? ` · <span style="color:var(--red)">fatigue ${fatigue}</span>` : fatigue >= 55 ? ` · <span style="color:var(--brass)">fatigue ${fatigue}</span>` : '';
      return `${s.pos} · <span class="fit-pill fit-${fitLevel.level}">${fitLevel.label}</span> · <span class="ovr ${ovrCls(p.ovr)}" style="font-size:13px">${p.ovr}</span>${deltaHtml} · cond ${Math.round(p.cond)}${fatigueHtml} · form ${formText(p)} · ${specialistLabel(p)} · ${extra}${fam<1?` · ${Math.round(fam*100)}% pos`:''}${fitText}`;
    };
    const chip = i => {
      const s = SLOTS[i], p = t.lineup[i] != null ? G.players[t.lineup[i]] : null;
      const pos = FIELD_SLOT_POS[i];
      const fit = p ? positionFitLevel(p, i).level : 'empty';
      const jerseyBg = p ? fitColour(fit) : '#707783';
      return `<button class="pitch-player fit-${fit}" data-slot-idx="${i}" data-slot-pos="${s.pos}" style="left:${pos.x}%;top:${pos.y}%" onclick="UI.pickSlot(${i})" ondragover="event.preventDefault();event.dataTransfer.dropEffect='move'" ondragenter="this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="this.classList.remove('drag-over');UI.dropOnSlot(event,${i})" ${p?`draggable="true" ondragstart="UI.dragPlayer(event,${p.id})" ondragend="UI.dragEnd()"`:''}>
        <span class="status-stack">${p?playerStatusIcons(p):''}</span>
        ${p
          ? `<span class="pitch-avatar">${playerAvatar(p,30)}</span>
             <span class="pitch-name"><span class="jersey pitch-num" style="background:${jerseyBg};color:${contrastText(jerseyBg)}">${s.n}</span>${esc(p.name.split(' ').slice(-1)[0])}</span>
             <span class="pitch-sub"><span class="pitch-pos">${p.pos}</span><b class="ovr-xs ovr-${ovrCls(p.ovr)}">${p.ovr}</b></span>`
          : `<span class="jersey pitch-jersey" style="background:${jerseyBg};color:${contrastText(jerseyBg)}">${s.n}</span>
             <span class="pitch-name" style="color:var(--dim);font-style:italic;font-size:10px">Select</span>
             <span class="pitch-sub"><span class="pitch-pos">${s.pos}</span></span>`}
      </button>`;
    };
    const line = ([a,b]) => {
      const pa = FIELD_SLOT_POS[a], pb = FIELD_SLOT_POS[b];
      const p1 = G.players[t.lineup[a]], p2 = G.players[t.lineup[b]];
      const score = cohesionPair(p1, p2, a, b);
      const x = (pa.x+pb.x)/2, y = (pa.y+pb.y)/2;
      const dx = pb.x-pa.x, dy = pb.y-pa.y;
      const len = Math.sqrt(dx*dx+dy*dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const cls = score>=72?'good':score<48?'bad':'';
      return `<span class="coh-line ${cls}" style="left:${x}%;top:${y}%;width:${len}%;transform:translate(-50%,-50%) rotate(${angle}deg)"></span>`;
    };
    const makeRow = (i) => {
      const s = SLOTS[i];
      const p = t.lineup[i] != null ? G.players[t.lineup[i]] : null;
      if(!p) return `<div class="sheet-row empty" onclick="UI.pickSlot(${i})" ondragover="event.preventDefault()" ondrop="UI.dropOnSlot(event,${i})"><span class="jersey" style="background:#707783;color:#111">${s.n}</span><span class="pname">Select player...</span><span class="pmeta">${s.pos}</span></div>`;
      const fit = positionFitLevel(p,i).level;
      const jerseyBg = fitColour(fit);
      const isBench = i >= 13;
      const fatigue = Math.round(p.fatigue || ((100-p.cond)*0.72 + (p.load||0)*0.48));
      const fatigueHtml = fatigue >= 72 || p.cond < 62 || (p.load||0) > 74 ? ` · <span style="color:var(--red)">fatigue ${fatigue}</span>` : fatigue >= 55 ? ` · <span style="color:var(--brass)">fatigue ${fatigue}</span>` : '';
      const benchMeta = `${nationalityFlag(p.nationality)} <span class="pos-tag" style="font-size:10px">${p.pos}</span> <span class="ovr ${ovrCls(p.ovr)}" style="font-size:13px">${p.ovr}</span> · cond ${Math.round(p.cond)}${fatigueHtml} · form ${formText(p)} · ${specialistLabel(p)}`;
      return `<div class="sheet-row fit-${fit}" onclick="UI.pickSlot(${i})" ondragover="event.preventDefault()" ondrop="UI.dropOnSlot(event,${i})" draggable="true" ondragstart="UI.dragPlayer(event,${p.id})" ondragend="UI.dragEnd()">
        <span class="jersey" style="background:${jerseyBg};color:${contrastText(jerseyBg)}">${s.n}</span>
        <span class="pname">${playerAvatar(p,28)} ${playerStatusIcons(p)} ${esc(p.name)} ${roleBits(p)}</span>
        <span class="pmeta">${isBench ? benchMeta : nationalityFlag(p.nationality)+' '+playerMeta(p, i)}</span>
      </div>`;
    };
    const squadRow = p => {
      const inIdx = t.lineup.indexOf(p.id);
      const isTrial = p.squad === 'trial';
      const canDrag = (!p.injury || p.playInjured) && !(p.suspended && p.suspended.weeks>0) && !p.repDuty && selectionSquadEligible(p);
      const trialBadge = isTrial ? `<span style="font-size:9px;font-weight:800;letter-spacing:.06em;color:var(--brass);background:rgba(210,165,62,.18);padding:1px 5px;border-radius:8px;margin-left:3px">T&T</span>` : '';
      const fatigue = Math.round(p.fatigue || ((100-p.cond)*0.72 + (p.load||0)*0.48));
      const fatigueBit = p.squad==='dev' || isTrial ? '' : fatigue >= 72 || p.cond < 62 || (p.load||0) > 74 ? ` · <span style="color:var(--red)">fatigue ${fatigue}</span>` : fatigue >= 55 ? ` · <span style="color:var(--brass)">fatigue ${fatigue}</span>` : '';
      return `<div class="squad-drag-row ${canDrag?'':'disabled'}" ${canDrag?`draggable="true" ondragstart="UI.dragPlayer(event,${p.id})" ondragend="UI.dragEnd()"`:''} onclick="UI.playerModal(${p.id})">
        <span class="pos-tag">${p.pos}${p.pos2?`/${p.pos2}`:''}</span>
        <span class="pname">${playerAvatar(p,28)} ${playerStatusIcons(p)} ${esc(p.name)}${trialBadge}${inIdx>=0?` <span style="color:var(--brass);font-size:11px">#${SLOTS[inIdx].n}</span>`:''}</span>
        <span class="pmeta">${nationalityFlag(p.nationality)} <span class="ovr ${ovrCls(p.ovr)}" style="font-size:13px">${p.ovr}</span> · form ${formHtml(p)} · ${specialistLabel(p)} · ${p.squad==='dev'?'youth':isTrial?`T&T ${trialGamesUsed(p)}/${TRIAL_GAME_CAP}g`:Math.round(p.cond)+'%'}${fatigueBit}</span>
      </div>`;
    };

    const active = t.lineup.slice(0,17).map(id=>G.players[id]).filter(Boolean);
    const avgCond = active.length ? Math.round(active.reduce((s,p)=>s+p.cond,0)/active.length) : 0;
    const highFatigue = active.filter(p=>(p.fatigue || ((100-p.cond)*0.72 + (p.load||0)*0.48)) >= 72 || (p.load||0)>74 || p.cond<62).length;
    const avgOvr = active.length ? Math.round(active.reduce((s,p)=>s+p.ovr,0)/active.length) : 0;
    const cap = G.players[t.roles.captain], gk = G.players[t.roles.goalKicker], pk = G.players[t.roles.primaryKicker];
    const bench = Array.from({length:4}, (_,i)=>makeRow(13+i)).join('');
    const reserves = Array.from({length:2}, (_,i)=>makeRow(17+i)).join('');
    const sortVal = p => ({
      ovr:p.ovr, pos:p.pos, age:-p.age, ageOld:p.age, cond:p.cond, pot:scoutedPotential(p).mid,
      name:p.name, morale:p.morale, form:formText(p), salary:p.salary
    }[UI._sheetSort] ?? p.ovr);
    const cmp = (a,b) => {
      const va = sortVal(a), vb = sortVal(b);
      if(typeof va === 'string') return va.localeCompare(vb);
      return vb - va;
    };
    const unpicked = t.players.map(id=>G.players[id]).filter(Boolean)
      .filter(p=>UI._sheetPos==='all' || p.pos===UI._sheetPos || p.pos2===UI._sheetPos)
      .sort((a,b)=>{
      const ia = t.lineup.includes(a.id), ib = t.lineup.includes(b.id);
      if(ia !== ib) return ia ? 1 : -1;
      return cmp(a,b);
    });
    const sortSelect = `<select style="max-width:190px" onchange="UI._sheetSort=this.value;UI.render()">${[
      ['ovr','Sort: OVR'],['pos','Sort: position'],['age','Sort: youngest'],['ageOld','Sort: oldest'],['cond','Sort: condition'],['form','Sort: form'],['pot','Sort: potential'],['name','Sort: name'],['morale','Sort: morale'],['salary','Sort: salary']
    ].map(([v,l])=>`<option value="${v}" ${UI._sheetSort===v?'selected':''}>${l}</option>`).join('')}</select>`;
    const posFilters = ['all','FB','WG','CE','FE','HB','PR','HK','SR','LK'].map(pos=>
      `<button class="btn sm ${UI._sheetPos===pos?'primary':''}" onclick="UI._sheetPos='${pos}';UI.render()">${pos==='all'?'All':pos}</button>`
    ).join('');

    return `<h1 class="page">Team Sheet</h1>
    <p class="page-sub">Round ${G.round+1} selection. Drag players from the squad list onto a jersey, or tap a jersey to choose from a modal.</p>
    <div class="btnrow fit-legend">
      <span class="fit-pill fit-green">Preferred position</span>
      <span class="fit-pill fit-yellow">Preferred position wrong side / similar halves role</span>
      <span class="fit-pill fit-orange">Can cover</span>
      <span class="fit-pill fit-red">Bad fit</span>
    </div>
    <div class="dash-strip" style="grid-template-columns:repeat(6,minmax(110px,1fr))">
      <div class="dash-status ${avgOvr>=75?'good':avgOvr<60?'bad':''}"><div class="dash-label">Squad OVR</div><div class="dash-value ovr-stat" style="font-size:32px;font-family:var(--disp)">${avgOvr}</div><div class="dash-sub">17-man average</div></div>
      <div class="dash-status ${avgCond<70?'bad':avgCond>=85?'good':''}"><div class="dash-label">Condition</div><div class="dash-value">${avgCond}<span style="font-size:14px">%</span></div><div class="dash-sub"><div style="height:4px;background:var(--line);border-radius:2px;margin:4px 0 2px"><div style="height:4px;width:${avgCond}%;background:${avgCond>=85?'var(--green)':avgCond<70?'var(--red)':'var(--brass)'};border-radius:2px"></div></div>match-day 17</div></div>
      <div class="dash-status ${highFatigue?'bad':'good'}"><div class="dash-label">Fatigue Risk</div><div class="dash-value">${highFatigue}</div><div class="dash-sub">selected players at high load</div></div>
      <div class="dash-status ${(t.cohesion||50)>=70?'good':(t.cohesion||50)<40?'bad':''}"><div class="dash-label">Cohesion</div><div class="dash-value">${Math.round(t.cohesion||50)}<span style="font-size:14px">%</span></div><div class="dash-sub"><div style="height:4px;background:var(--line);border-radius:2px;margin:4px 0 2px"><div style="height:4px;width:${Math.round(t.cohesion||50)}%;background:${(t.cohesion||50)>=70?'var(--green)':(t.cohesion||50)<40?'var(--red)':'var(--brass)'};border-radius:2px"></div></div>lineup rhythm</div></div>
      <div class="dash-status"><div class="dash-label">Captain</div><div class="dash-value" style="font-size:20px">${cap?esc(cap.name.split(' ').slice(-1)[0]):'-'}</div><div class="dash-sub">${cap?'leadership '+cap.attrs.leadership:'set tactics'}</div></div>
      <div class="dash-status"><div class="dash-label">Kickers</div><div class="dash-value" style="font-size:20px">${gk?esc(gk.name.split(' ').slice(-1)[0]):'-'}</div><div class="dash-sub">${pk?'territory '+esc(pk.name.split(' ').slice(-1)[0]):'set tactics'}</div></div>
    </div>
    ${(()=>{
      const onBye = G.phase==='regular' && ((G.byes && G.byes[G.round])||[]).includes(G.coach.teamId);
      const submitted = !onBye && t.teamSubmitted === G.round;
      const issues = lineupIssues(t);
      if(!onBye && !submitted && issues.length === 0){
        return `<div class="card" style="border-color:var(--brass);padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div>
            <b style="color:var(--brass)">Team List Not Submitted</b>
            <p style="font-size:12px;color:var(--muted);margin:2px 0 0">Confirm your 19 before the Tuesday deadline to advance.</p>
          </div>
          <button class="btn primary" onclick="UI.confirmTeamList()">Confirm Team List</button>
        </div>`;
      } else if(!onBye && submitted){
        return `<div class="card" style="border-color:var(--green);padding:8px 14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:12px">
          <span style="color:var(--green);font-weight:700">✓ Team list submitted for Round ${G.round+1}</span>
          <button class="btn sm" onclick="myTeam().teamSubmitted=null;UI.render()">Undo</button>
        </div>`;
      }
      return '';
    })()}
    <div class="btnrow">
      <button class="btn primary" onclick="autoPick(myTeam());UI.render();UI.toast('Best 19 selected.')">Auto-pick best 19</button>
      <button class="btn danger" onclick="UI.clearTeamSelection()">Clear selection</button>
      <button class="btn sm ${UI._teamSheetMode==='stats'?'primary':''}" onclick="UI._teamSheetMode='stats';UI.render()">Season stats</button>
      <button class="btn sm ${UI._teamSheetMode==='skills'?'primary':''}" onclick="UI._teamSheetMode='skills';UI.render()">Skill view</button>
      ${['attacking','balanced','grinding'].map(pl=>`<button class="btn sm ${t.plan===pl?'primary':''}" onclick="myTeam().plan='${pl}';UI.render()">${pl[0].toUpperCase()+pl.slice(1)}</button>`).join('')}
      <button class="btn sm" onclick="UI.go('tactics')">Roles/tactics</button>
      <button class="btn sm" onclick="UI.go('training')">Training</button>
      <button class="btn sm" onclick="UI.go('matchday')">Match day</button>
    </div>
    <div class="team-sheet-layout">
      <div class="pitch-card">
        <div class="rl-pitch">
          <span class="goal-post top"><svg width="52" height="28" viewBox="0 0 52 28"><rect x="0" y="22" width="52" height="6" fill="white" rx="2"/><rect x="4" y="0" width="6" height="28" fill="white" rx="2"/><rect x="42" y="0" width="6" height="28" fill="white" rx="2"/></svg></span>
          <span class="goal-post bottom"><svg width="52" height="28" viewBox="0 0 52 28"><rect x="0" y="0" width="52" height="6" fill="white" rx="2"/><rect x="4" y="0" width="6" height="28" fill="white" rx="2"/><rect x="42" y="0" width="6" height="28" fill="white" rx="2"/></svg></span>
          <span class="pitch-halfway"></span>
          ${[20,30,40,60,70,80].map(y=>`<span class="pitch-mark ${y===20||y===80?'redline':''}" style="top:${y}%"></span>`).join('')}
          ${COH_LINKS.map(line).join('')}
          ${Array.from({length:13}, (_,i)=>chip(i)).join('')}
        </div>
      </div>
      <div class="card bench-card">
        <div class="navsep" style="margin:0 0 8px">Active Bench (14-17)</div>
        ${bench}
        <div class="navsep" style="margin:12px 0 8px">Named Reserves (18-19)</div>
        ${reserves}
        <div class="navsep" style="margin:12px 0 8px">Full squad</div>
        <div class="btnrow" style="margin-top:0">${sortSelect}</div>
        <div class="btnrow" style="margin-top:0">${posFilters}</div>
        <div class="squad-drag-list">${unpicked.map(squadRow).join('')}</div>
      </div>
    </div>`;
  },

  pickSlot(slotIdx){
    const t = myTeam();
    const s = SLOTS[slotIdx];
    const isReserve = slotIdx >= 17;
    const cands = t.players
      .map(id=>G.players[id])
      .filter(p=>p && (!p.injury || p.playInjured) && !(p.suspended && p.suspended.weeks>0) && selectionSquadEligible(p))
      .sort((a,b)=> b.ovr*familiarity(b,s.pos)*slotSpecialistFit(b,slotIdx) - a.ovr*familiarity(a,s.pos)*slotSpecialistFit(a,slotIdx));

    const currOccupant = t.lineup[slotIdx] != null ? G.players[t.lineup[slotIdx]] : null;
    const currEffOvr = currOccupant ? Math.round(currOccupant.ovr * familiarity(currOccupant, s.pos) * slotSpecialistFit(currOccupant, slotIdx)) : 0;
    UI.modal(`<h3>Jersey #${s.n} — ${isReserve?'Named Reserve':(s.pos==='BE'?'Active Bench':POS_NAME[s.pos])}</h3>
      <p class="page-sub">Picking a player already in the 19 swaps the two jerseys. <b>Eff. OVR</b> = overall rating adjusted for position fit and side preference.</p>
      <div style="max-height:420px;overflow-y:auto">
      ${cands.map(p=>{
        const inIdx = t.lineup.indexOf(p.id);
        const fam = familiarity(p, s.pos);
        const fit = slotSpecialistFit(p, slotIdx);
        const level = positionFitLevel(p, slotIdx);
        const effOvr = Math.round(p.ovr * fam * fit);
        const delta = effOvr - p.ovr;
        const vsCurr = currOccupant && currOccupant.id !== p.id ? effOvr - currEffOvr : null;
        const deltaStr = delta < -1 ? `<span style="color:var(--red)">${delta}</span>` : delta > 1 ? `<span style="color:var(--green)">+${delta}</span>` : '±0';
        const vsStr = vsCurr !== null ? (vsCurr > 0 ? `<span style="color:var(--green)"> ▲${vsCurr} vs current</span>` : vsCurr < 0 ? `<span style="color:var(--red)"> ▼${Math.abs(vsCurr)} vs current</span>` : `<span style="color:var(--muted)"> ≡ current</span>`) : '';
        return `<div class="sheet-row fit-${level.level}" onclick="UI.assignSlot(${slotIdx},${p.id})">
          <span class="pos-tag">${p.pos}</span>
          <span class="pname">${esc(p.name)}</span>
          <span class="pmeta"><span class="fit-pill fit-${level.level}">${level.label}</span> · OVR <span class="ovr ${ovrCls(p.ovr)}" style="font-size:13px">${p.ovr}</span> → eff. <b>${effOvr}</b> (${deltaStr})${vsStr} · ${specialistLabel(p)} · cond ${Math.round(p.cond)}${inIdx>=0?` · #${SLOTS[inIdx].n}`:''}</span>
        </div>`;
      }).join('')}
      </div>
      <div class="btnrow">
        ${t.lineup[slotIdx]!=null?`<button class="btn danger" onclick="UI.clearSlot(${slotIdx})">Clear slot</button>`:''}
        <button class="btn" onclick="UI.closeModal()">Cancel</button>
      </div>`);
  },

  assignSlot(slotIdx, pid){
    const t = myTeam();
    const p = G.players[pid];
    if(!p || (p.injury && !p.playInjured) || (p.suspended && p.suspended.weeks>0) || p.repDuty || !selectionSquadEligible(p)){ UI.toast('That player is not available for the match-day squad.'); return; }
    const existing = t.lineup.indexOf(pid);
    if(existing>=0) t.lineup[existing] = t.lineup[slotIdx];
    t.lineup[slotIdx] = pid;
    UI.closeModal(); UI.render();
  },
  dragPlayer(event, pid){
    event.dataTransfer.setData('text/plain', String(pid));
    event.dataTransfer.effectAllowed = 'move';
    UI._draggingPid = pid;
    // Highlight slots after a brief delay so drag preview renders first
    requestAnimationFrame(() => {
      const p = G.players[pid];
      if(!p) return;
      document.querySelectorAll('.pitch-player[data-slot-idx]').forEach(el => {
        const sIdx = +el.dataset.slotIdx;
        if(isNaN(sIdx)) return;
        el.dataset.dragFit = positionFitLevel(p, sIdx).level;
      });
      document.querySelector('.rl-pitch')?.classList.add('drag-active');
    });
  },
  dragEnd(){
    UI._draggingPid = null;
    document.querySelectorAll('.pitch-player[data-slot-idx]').forEach(el => delete el.dataset.dragFit);
    document.querySelector('.rl-pitch')?.classList.remove('drag-active');
  },
  dropOnSlot(event, slotIdx){
    event.preventDefault();
    UI.dragEnd();
    const pid = +(event.dataTransfer.getData('text/plain') || 0);
    if(pid) UI.assignSlot(slotIdx, pid);
  },

  clearSlot(slotIdx){
    myTeam().lineup[slotIdx] = null;
    UI.closeModal(); UI.render();
  },
  clearTeamSelection(){
    if(!confirm('Clear the entire match-day selection?')) return;
    myTeam().lineup = Array(19).fill(null);
    UI.toast('Team sheet cleared.');
    UI.render();
  },

  confirmTeamList(){
    const t = myTeam();
    const issues = lineupIssues(t);
    if(issues.length){
      UI.modal(`<h3>Team Sheet Not Compliant</h3>
        <p class="page-sub">Fix these issues before confirming.</p>
        <div class="card" style="padding:10px">${issues.map(x=>`<div style="padding:4px 0;color:var(--red)">${esc(x)}</div>`).join('')}</div>
        <div class="btnrow"><button class="btn primary" onclick="UI.closeModal()">OK</button></div>`);
      return;
    }
    t.teamSubmitted = G.round;
    UI.toast('Team list confirmed and submitted for Round ' + (G.round + 1) + '.');
    UI.render();
  },
});

function fitColour(level){
  return {green:'#4CAF7D', yellow:'#D8BE54', orange:'#D98A38', red:'#C85A4F', empty:'#707783'}[level] || '#707783';
}
function playerStatusIcons(p){
  if(!p) return '';
  const bits = [];
  if(p.injury) bits.push(`<span class="status-icon ${p.playInjured?'warn':'bad'}" title="${esc(p.injury.n)}">${p.playInjured?'✚':'✚'}</span>`);
  if(p.suspended && p.suspended.weeks>0) bits.push(`<span class="status-icon bad" title="Suspended">!</span>`);
  if(p.repDuty) bits.push(`<span class="status-icon rep" title="Representative duty">REP</span>`);
  return bits.join('');
}

function cohesionPair(p1, p2, a, b){
  if(!p1 || !p2) return 35;
  let score = 52;
  score += (slotSpecialistFit(p1,a)-1)*260 + (slotSpecialistFit(p2,b)-1)*260;
  score += (familiarity(p1,SLOTS[a].pos)-0.9)*120 + (familiarity(p2,SLOTS[b].pos)-0.9)*120;
  score += ((p1.attrs.decisionMaking+p2.attrs.decisionMaking+p1.attrs.composure+p2.attrs.composure)/4 - 55) * .45;
  if(p1.pos===p2.pos || p1.pos2===p2.pos || p2.pos2===p1.pos) score += 4;
  return clamp(Math.round(score), 20, 92);
}
