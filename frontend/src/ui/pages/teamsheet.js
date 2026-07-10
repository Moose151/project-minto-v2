import { UI } from "../01-core.js";


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
      const fatigueHtml = fatigue >= 72 || p.cond < 62 || (p.load||0) > 74 ? ` · <span style="color:var(--red)">fatigue ${fatigue}</span>` : fatigue >= 55 ? ` · <span style="color:var(--accent)">fatigue ${fatigue}</span>` : '';
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
      const fatigueHtml = fatigue >= 72 || p.cond < 62 || (p.load||0) > 74 ? ` · <span style="color:var(--red)">fatigue ${fatigue}</span>` : fatigue >= 55 ? ` · <span style="color:var(--accent)">fatigue ${fatigue}</span>` : '';
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
      const trialBadge = isTrial ? `<span style="font-size:9px;font-weight:800;letter-spacing:.06em;color:var(--accent);background:var(--accent-a18);padding:1px 5px;border-radius:8px;margin-left:3px">T&T</span>` : '';
      const fatigue = Math.round(p.fatigue || ((100-p.cond)*0.72 + (p.load||0)*0.48));
      const fatigueBit = p.squad==='dev' || isTrial ? '' : fatigue >= 72 || p.cond < 62 || (p.load||0) > 74 ? ` · <span style="color:var(--red)">fatigue ${fatigue}</span>` : fatigue >= 55 ? ` · <span style="color:var(--accent)">fatigue ${fatigue}</span>` : '';
      return `<div class="squad-drag-row ${canDrag?'':'disabled'}" ${canDrag?`draggable="true" ondragstart="UI.dragPlayer(event,${p.id})" ondragend="UI.dragEnd()"`:''} onclick="UI.playerModal(${p.id})">
        <span class="pos-tag">${p.pos}${p.pos2?`/${p.pos2}`:''}</span>
        <span class="pname">${playerAvatar(p,28)} ${playerStatusIcons(p)} ${esc(p.name)}${trialBadge}${inIdx>=0?` <span style="color:var(--accent);font-size:11px">#${SLOTS[inIdx].n}</span>`:''}</span>
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
    const roleGroup = (label, slots) => `<section class="ts-group">
      <div class="ts-group-title">${label}</div>
      <div class="ts-slot-list">${slots.map(makeRow).join('')}</div>
    </section>`;
    const roleGroups = [
      roleGroup('Back three', [0,1,4]),
      roleGroup('Centres', [2,3]),
      roleGroup('Halves', [5,6]),
      roleGroup('Middle unit', [7,8,9,12]),
      roleGroup('Edges', [10,11]),
    ].join('');
    const onBye = G.phase==='regular' && ((G.byes && G.byes[G.round])||[]).includes(G.coach.teamId);
    const submitted = !onBye && t.teamSubmitted === G.round;
    const issues = lineupIssues(t);
    const complianceHtml = onBye ? ''
      : issues.length
        ? `<div class="ts-submit-card bad">
            <div><b>Selection Issues</b><p>${issues.slice(0,3).map(esc).join(' · ')}${issues.length>3?' ...':''}</p></div>
            <button class="btn sm" onclick="UI.confirmTeamList()">Review</button>
          </div>`
        : submitted
          ? `<div class="ts-submit-card good">
              <div><b>Team list submitted</b><p>Round ${G.round+1} selection is locked in.</p></div>
              <button class="btn sm" onclick="myTeam().teamSubmitted=null;UI.render()">Undo</button>
            </div>`
          : `<div class="ts-submit-card">
              <div><b>Ready to submit</b><p>Confirm your 19 before advancing.</p></div>
              <button class="btn primary" onclick="UI.confirmTeamList()">Confirm Team List</button>
            </div>`;
    const selectedCount = t.lineup.filter(id=>id!=null).length;

    return `<h1 class="page">Team Sheet</h1>
    <p class="page-sub">Round ${G.round+1} selection desk. Drag from the squad pool, or click any jersey row to pick a player.</p>
    ${UI.workflowStrip ? UI.workflowStrip() : ''}
    <div class="ts-toolbar">
      <div class="ts-toolbar-main">
        <button class="btn primary" onclick="autoPick(myTeam());UI.render();UI.toast('Best 19 selected.')">Auto-pick best 19</button>
        <button class="btn danger" onclick="UI.clearTeamSelection()">Clear</button>
        <button class="btn sm ${UI._teamSheetMode==='stats'?'primary':''}" onclick="UI._teamSheetMode='stats';UI.render()">Stats</button>
        <button class="btn sm ${UI._teamSheetMode==='skills'?'primary':''}" onclick="UI._teamSheetMode='skills';UI.render()">Skills</button>
        ${['attacking','balanced','grinding'].map(pl=>`<button class="btn sm ${t.plan===pl?'primary':''}" onclick="myTeam().plan='${pl}';UI.render()">${pl[0].toUpperCase()+pl.slice(1)}</button>`).join('')}
      </div>
      <div class="ts-toolbar-links">
        <button class="btn sm" onclick="UI.go('tactics')">Roles/tactics</button>
        <button class="btn sm" onclick="UI.go('training')">Training</button>
        <button class="btn sm" onclick="UI.go('matchday')">Match day</button>
      </div>
    </div>
    ${complianceHtml}
    <div class="team-sheet-layout">
      <div class="card ts-starters-card">
        <div class="ts-card-head">
          <div><span class="navsep">Starting XIII</span><p>${selectedCount}/19 selected · click a row to change it</p></div>
          <div class="fit-legend">
            <span class="fit-pill fit-green">Best</span><span class="fit-pill fit-yellow">Ok</span><span class="fit-pill fit-orange">Cover</span><span class="fit-pill fit-red">Risk</span>
          </div>
        </div>
        ${roleGroups}
      </div>
      <div class="ts-middle">
        <div class="ts-metrics">
          <div class="dash-status ${avgOvr>=75?'good':avgOvr<60?'bad':''}"><div class="dash-label">17 OVR</div><div class="dash-value">${avgOvr}</div><div class="dash-sub">average selected</div></div>
          <div class="dash-status ${avgCond<70?'bad':avgCond>=85?'good':''}"><div class="dash-label">Condition</div><div class="dash-value">${avgCond}<span style="font-size:14px">%</span></div><div class="dash-sub">match-day 17</div></div>
          <div class="dash-status ${highFatigue?'bad':'good'}"><div class="dash-label">Fatigue</div><div class="dash-value">${highFatigue}</div><div class="dash-sub">high load players</div></div>
          <div class="dash-status ${(t.cohesion||50)>=70?'good':(t.cohesion||50)<40?'bad':''}"><div class="dash-label">Cohesion</div><div class="dash-value">${Math.round(t.cohesion||50)}<span style="font-size:14px">%</span></div><div class="dash-sub">lineup rhythm</div></div>
        </div>
        <div class="pitch-card ts-compact-pitch">
          <div class="rl-pitch">
            <span class="pitch-halfway"></span>
            ${[20,30,40,60,70,80].map(y=>`<span class="pitch-mark ${y===20||y===80?'redline':''}" style="top:${y}%"></span>`).join('')}
            ${COH_LINKS.map(line).join('')}
            ${Array.from({length:13}, (_,i)=>chip(i)).join('')}
          </div>
        </div>
        <div class="card bench-card ts-bench-card">
          <div class="ts-card-head"><span class="navsep">Interchange</span><p>14-17 active bench</p></div>
          ${bench}
          <div class="ts-card-head ts-reserve-head"><span class="navsep">Reserves</span><p>18-19 named cover</p></div>
          ${reserves}
        </div>
      </div>
      <div class="card ts-pool-card">
        <div class="ts-card-head">
          <div><span class="navsep">Squad Pool</span><p>Drag onto a jersey or open a profile.</p></div>
          <div class="ts-role-summary">
            <b>${cap?esc(cap.name.split(' ').slice(-1)[0]):'-'}</b><span>Captain</span>
            <b>${gk?esc(gk.name.split(' ').slice(-1)[0]):'-'}</b><span>Goal kicker</span>
          </div>
        </div>
        <div class="ts-pool-controls">
          ${sortSelect}
          <div class="ts-pos-filters">${posFilters}</div>
        </div>
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
          <span class="pmeta"><span class="fit-pill fit-${level.level}">${level.label}</span> · OVR <span class="ovr ${ovrCls(p.ovr)}" style="font-size:13px">${p.ovr}</span> → eff. <b>${effOvr}</b> (${deltaStr})${vsStr} · ${specialistLabel(p)} · cond ${Math.round(p.cond)} · form ${formHtml(p)}${inIdx>=0?` · #${SLOTS[inIdx].n}`:''}</span>
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
    const stop = typeof calendarStopForDay === 'function' ? calendarStopForDay(ensureCalendar().day) : null;
    UI.toast('Team list confirmed for Round ' + (G.round + 1) + '.');
    if(stop && stop.key === 'selection') UI.go('tactics');
    else UI.render();
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
