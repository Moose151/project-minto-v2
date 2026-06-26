'use strict';

/* Recruitment — shortlist + browse all players not on my team */
Object.assign(UI, {
  _recTab: 'shortlist',
  _recPos: 'all',
  _recAge: 'all',
  _recOvr: 'all',
  _recPot: 'all',
  _recSort: 'ovr',
  _recSortDir: 'desc',
  _faMinAge: '',
  _faMaxAge: '',
  _faMinOvr: '',
  _faSalaryMode: 'any',
  _faSalaryValue: '',
  _faAffordable: false,
  _faReady: false,
  _recFinalYear: false,

  p_recruitment(){
    const sl = G.coach.shortlist || [];
    const my = myTeam();
    const myIds = new Set(my.players);
    const faIds = new Set(G.freeAgents || []);
    const capRoom = G.config.cap - teamSalary(my);

    // Count active pre-contract approaches this season
    const MAX_APPROACHES = 3;
    const activeApproaches = Object.values(G.players).filter(p=>p && p.approachTeam===G.coach.teamId).length;
    const approachesLeft = Math.max(0, MAX_APPROACHES - activeApproaches);

    const pool = Object.values(G.players).filter(p => !myIds.has(p.id) && (faIds.has(p.id) || G.teams.some(t=>t.players.includes(p.id))));
    const shortlisted = sl.map(id=>G.players[id]).filter(Boolean);
    const ageOk = p => UI._recAge==='all' || (UI._recAge==='u21' ? p.age<=21 : UI._recAge==='22-26' ? p.age>=22&&p.age<=26 : UI._recAge==='27-30' ? p.age>=27&&p.age<=30 : p.age>=31);
    const rangeOk = (v, key) => key==='all' || (key==='60' ? v>=60 : key==='70' ? v>=70 : key==='80' ? v>=80 : v<60);
    const browse = pool
      .filter(p => UI._recPos === 'all' || p.pos === UI._recPos || p.pos2 === UI._recPos)
      .filter(p => ageOk(p) && rangeOk(scoutedOvr(p).mid, UI._recOvr) && rangeOk(scoutedPotential(p).mid, UI._recPot));
    const statVal = p => ({
      ovr: scoutedOvr(p).mid, pot: scoutedPotential(p).mid, age: -p.age, ageOld: p.age,
      salary: faIds.has(p.id) && !G.teams.some(t=>t.players.includes(p.id)) ? demandFor(p, my) : (p.salary || 0),
      name: p.name.toLowerCase(), pos: p.pos,
      runs: p.s.runs||0, tries: p.s.t||0, tackles: p.s.tk||0, fantasy: p.s.fpts||0,
      form: formText(p),
      goal: p.attrs.placeKick||0, kicking: ((p.attrs.kickPower||0)+(p.attrs.kickAccuracy||0))/2,
      speed: p.attrs.speed||0, playmaking: p.attrs.playmaking||0, defence: ((p.attrs.tackling||0)+(p.attrs.defRead||0))/2
    }[UI._recSort] ?? scoutedOvr(p).mid);
    const sortPlayers = list => list.sort((a,b)=>{
      const av = statVal(a), bv = statVal(b);
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return UI._recSortDir === 'asc' ? cmp : -cmp;
    });
    sortPlayers(browse);

    const teamOf = p => G.teams.find(t=>t.players.includes(p.id));

    const row = p => {
      const t = teamOf(p);
      const isFA = faIds.has(p.id) && !t;
      const onSl = sl.includes(p.id);
      const approached = p.approachTeam === G.coach.teamId;
      const salaryVal = isFA ? demandFor(p, my) : (p.salary || 0);
      const contractTag = p.years<=0
        ? `<span style="color:var(--red);font-size:11px">Off-contract</span>`
        : p.years===1
          ? `<span style="color:var(--brass);font-size:11px">Final year</span>`
          : `<span style="color:var(--muted);font-size:11px">${p.years}yr</span>`;
      const canApproach = G.phase==='regular' && p.years<=1 && !approached && approachesLeft > 0;
      const approachExhausted = G.phase==='regular' && p.years<=1 && !approached && approachesLeft <= 0;
      return `<tr class="click" onclick="UI.playerModal(${p.id})">
        <td><div class="player-cell">${playerAvatar(p,34)}<div><b>${playerTierBadge(p,true)} ${nationalityFlag(p.nationality)} ${esc(p.name)}</b>${approached?` <span style="color:var(--green);font-size:10px">✓ approached</span>`:''}
          <br><span class="pmeta" style="font-size:11px;color:var(--muted)">${esc(p.style)} · Form ${formText(p)}${p.repTeam?` · ${esc(p.repTeam)}`:''}</span></div></div></td>
        <td><span class="pos-tag">${p.pos}</span></td>
        <td class="num"><span class="ovr ${ovrCls(scoutedOvr(p).mid)}">${ovrText(p)}</span></td>
        <td class="num" style="color:var(--muted)">${potHtml(p)}</td>
        <td class="num">${p.age}</td>
        <td>${t?`${clubPrestigeBadge(t,true)} <span class="team-spine" style="background:${t.c1}"></span>${esc(t.nick)}`:'<i style="color:var(--muted)">Free agent</i>'}</td>
        <td>${contractTag}</td>
        <td class="num">${money(salaryVal)}</td>
        <td>
          <div class="btnrow" style="margin:0;gap:4px">
            <button class="btn sm${onSl?' primary':''}" onclick="event.stopPropagation();UI.toggleShortlist(${p.id})" title="${onSl?'Remove from shortlist':'Add to shortlist'}">${onSl?'★':'☆'}</button>
            ${isFA?`<button class="btn sm primary" onclick="event.stopPropagation();UI.signFreeAgent(${p.id})">Sign</button>`:''}
            ${isFA?`<button class="btn sm" onclick="event.stopPropagation();UI.signTrialContract(${p.id})" title="Train & Trial: 1-year cover deal, up to ${TRIAL_GAME_CAP} games">T&T</button>`:''}
            ${canApproach && !isFA?`<button class="btn sm" onclick="event.stopPropagation();UI.doApproach(${p.id})">Approach</button>`:''}
            ${approachExhausted && !isFA?`<span style="font-size:10px;color:var(--dim)" title="${MAX_APPROACHES} approach limit reached">Limit reached</span>`:''}
          </div>
        </td>
      </tr>`;
    };

    const sortTh = (key, label, cls='') => `<th class="${cls}" onclick="UI.setRecruitmentSort('${key}')">${label}${UI._recSort===key?` ${UI._recSortDir==='asc'?'▲':'▼'}`:''}</th>`;
    const tableHead = `<thead><tr>
      ${sortTh('name','Player')} ${sortTh('pos','Pos')}
      ${sortTh('ovr','OVR','num')} ${sortTh('pot','Est. POT','num')} ${sortTh('ageOld','Age','num')}
      <th class="noclick">Club</th><th class="noclick">Contract</th>${sortTh('salary','Salary','num')}
      <th class="noclick"></th>
    </tr></thead>`;

    const posFilters = ['all','FB','WG','CE','FE','HB','PR','HK','SR','LK'].map(pos=>
      `<button class="btn sm ${UI._recPos===pos?'primary':''}" onclick="UI._recPos='${pos}';UI.render()">${pos==='all'?'All':pos}</button>`
    ).join('');
    const select = (prop, opts) => `<select style="max-width:170px" onchange="UI.${prop}=this.value;UI.render()">${opts.map(([v,l])=>`<option value="${v}" ${UI[prop]===v?'selected':''}>${l}</option>`).join('')}</select>`;

    const approachStatus = `<div style="display:flex;align-items:center;gap:8px;margin:4px 0 0;flex-wrap:wrap">
      <span style="font-size:12px;color:var(--muted)">Pre-contract approaches: <b style="color:${approachesLeft===0?'var(--red)':approachesLeft===1?'var(--brass)':'var(--green)'}">${activeApproaches}/${MAX_APPROACHES} used</b> this season.</span>
      ${approachesLeft>0?`<span style="font-size:12px;color:var(--muted)">${approachesLeft} remaining. Approaches give a +15% signing bonus in the off-season.</span>`:`<span style="font-size:12px;color:var(--red)">Approach limit reached for this season.</span>`}
    </div>`;

    const tabBtn = (id, label) =>
      `<button class="btn${UI._recTab===id?' primary':''}" onclick="UI._recTab='${id}';UI.render()">${label}</button>`;

    const shortlistContent = shortlisted.length
      ? `<div class="card" style="padding:6px;overflow-x:auto"><table>${tableHead}<tbody>${shortlisted.map(row).join('')}</tbody></table></div>`
      : `<div class="card"><p style="color:var(--muted)">No players shortlisted yet. Browse below and tap ☆ to watch a player.</p></div>`;

    const browseFinal = browse.filter(p => !UI._recFinalYear || (p.years != null && p.years <= 1));
    const browseContent = `
      <div class="btnrow" style="flex-wrap:wrap">${posFilters}</div>
      <div class="btnrow" style="align-items:center;flex-wrap:wrap">
        ${select('_recAge', [['all','All ages'],['u21','21 and under'],['22-26','22-26'],['27-30','27-30'],['31+','31+']])}
        ${select('_recOvr', [['all','Any OVR'],['60','OVR 60+'],['70','OVR 70+'],['80','OVR 80+'],['under60','Under 60']])}
        ${select('_recPot', [['all','Any potential'],['60','POT 60+'],['70','POT 70+'],['80','POT 80+'],['under60','POT under 60']])}
        ${select('_recSort', [['ovr','Sort: OVR'],['pot','Sort: potential'],['age','Sort: youngest'],['ageOld','Sort: oldest'],['salary','Sort: salary'],['form','Sort: form'],['runs','Sort: runs'],['tries','Sort: tries'],['tackles','Sort: tackles'],['fantasy','Sort: fantasy'],['goal','Sort: goal kicking'],['kicking','Sort: general kicking'],['speed','Sort: speed'],['playmaking','Sort: playmaking'],['defence','Sort: defence']])}
        <label style="display:flex;gap:6px;align-items:center;color:var(--brass);font-size:12px;white-space:nowrap"><input type="checkbox" ${UI._recFinalYear?'checked':''} onchange="UI._recFinalYear=this.checked;UI.render()"> Final year only</label>
      </div>
      <div class="card" style="padding:6px;overflow-x:auto;max-height:520px">
        <table>${tableHead}<tbody>${browseFinal.slice(0,60).map(row).join('')}</tbody></table>
        ${browseFinal.length>60?`<p style="color:var(--muted);font-size:12px;padding:6px">Showing top 60 — filter by position to narrow results.</p>`:''}
      </div>`;

    const minAge = UI._faMinAge === '' ? null : Number(UI._faMinAge);
    const maxAge = UI._faMaxAge === '' ? null : Number(UI._faMaxAge);
    const minOvr = UI._faMinOvr === '' ? null : Number(UI._faMinOvr);
    const salaryValue = UI._faSalaryValue === '' ? null : Number(UI._faSalaryValue);
    const freeAgents = sortPlayers(Object.values(G.players)
      .filter(p => p && faIds.has(p.id) && !teamOf(p))
      .filter(p => UI._recPos === 'all' || p.pos === UI._recPos || p.pos2 === UI._recPos)
      .filter(p => minAge == null || p.age >= minAge)
      .filter(p => maxAge == null || p.age <= maxAge)
      .filter(p => minOvr == null || scoutedOvr(p).mid >= minOvr)
      .filter(p => !UI._faReady || (p.age > 21 && scoutedOvr(p).mid > 75))
      .filter(p => !UI._faAffordable || demandFor(p, my) <= capRoom)
      .filter(p => UI._faSalaryMode === 'any' || salaryValue == null || (UI._faSalaryMode === 'under' ? demandFor(p, my) <= salaryValue : demandFor(p, my) >= salaryValue)));
    const typedInput = (prop, label, min, step, placeholder) => `<div class="field" style="min-width:120px"><label>${label}</label><input type="number" min="${min}" step="${step}" value="${esc(UI[prop])}" placeholder="${placeholder}" onchange="UI.${prop}=this.value;UI.render()"></div>`;
    const freeAgentContent = `
      <div class="btnrow" style="flex-wrap:wrap">${posFilters}</div>
      <div class="card" style="margin-bottom:10px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end">
          ${typedInput('_faMinAge','Min age',16,1,'Any')}
          ${typedInput('_faMaxAge','Max age',16,1,'Any')}
          ${typedInput('_faMinOvr','Min OVR',1,1,'Any')}
          <div class="field" style="min-width:120px"><label>Salary</label><select onchange="UI._faSalaryMode=this.value;UI.render()">${[['any','Any'],['under','Under'],['over','Over']].map(([v,l])=>`<option value="${v}" ${UI._faSalaryMode===v?'selected':''}>${l}</option>`).join('')}</select></div>
          ${typedInput('_faSalaryValue','Salary value',0,5000,'Any')}
          <label style="display:flex;gap:8px;align-items:center;color:var(--muted);font-size:12px;margin:0 0 8px"><input type="checkbox" ${UI._faAffordable?'checked':''} onchange="UI._faAffordable=this.checked;UI.render()"> Affordable only</label>
          <label style="display:flex;gap:8px;align-items:center;color:var(--muted);font-size:12px;margin:0 0 8px"><input type="checkbox" ${UI._faReady?'checked':''} onchange="UI._faReady=this.checked;UI.render()"> Age &gt;21 and OVR &gt;75</label>
          <button class="btn sm" onclick="UI.resetFreeAgentFilters()">Reset Filters</button>
          <button class="btn sm${UI._recFinalYear?' primary':''}" onclick="UI._recFinalYear=!UI._recFinalYear;UI.render()" title="Show only players on their final year of contract or off-contract">Final year</button>
        </div>
        <p style="font-size:11px;color:var(--muted);margin:4px 0 0">Cap room: <b>${money(capRoom)}</b> · ${freeAgents.length} free agent${freeAgents.length===1?'':'s'} match.</p>
      </div>
      <div class="card" style="padding:6px;overflow-x:auto;max-height:560px">
        <table>${tableHead}<tbody>${freeAgents.slice(0,80).map(row).join('') || '<tr><td colspan="9" style="color:var(--muted)">No free agents match those filters.</td></tr>'}</tbody></table>
        ${freeAgents.length>80?`<p style="color:var(--muted);font-size:12px;padding:6px">Showing top 80 — tighten filters to narrow results.</p>`:''}
      </div>`;

    return `<h1 class="page">Recruitment</h1>
    <p class="page-sub">Watch targets, lodge pre-contract approaches, and sign free agents.</p>
    ${approachStatus}
    <div class="btnrow" style="margin-top:12px">${tabBtn('shortlist',`★ Shortlist (${shortlisted.length})`)}${tabBtn('browse','Browse all players')}${tabBtn('freeAgents','Free Agents')}</div>
    <div style="margin-top:10px">${UI._recTab==='shortlist' ? shortlistContent : UI._recTab==='freeAgents' ? freeAgentContent : browseContent}</div>`;
  },

  setRecruitmentSort(key){
    if(UI._recSort === key) UI._recSortDir = UI._recSortDir === 'asc' ? 'desc' : 'asc';
    else { UI._recSort = key; UI._recSortDir = ['name','pos','ageOld','salary'].includes(key) ? 'asc' : 'desc'; }
    UI.render();
  },
  resetFreeAgentFilters(){
    UI._recPos = 'all';
    UI._faMinAge = '';
    UI._faMaxAge = '';
    UI._faMinOvr = '';
    UI._faSalaryMode = 'any';
    UI._faSalaryValue = '';
    UI._faAffordable = false;
    UI._faReady = false;
    UI._recFinalYear = false;
    UI._recSort = 'ovr';
    UI._recSortDir = 'desc';
    UI.render();
  },

  doApproach(id){
    const p = G.players[id]; if(!p) return;
    const MAX_APPROACHES = 3;
    const activeApproaches = Object.values(G.players).filter(q=>q && q.approachTeam===G.coach.teamId).length;
    if(activeApproaches >= MAX_APPROACHES){ UI.toast(`Approach limit (${MAX_APPROACHES}) reached for this season.`); return; }
    p.approachTeam = G.coach.teamId;
    const club = G.teams.find(t=>t.players.includes(id));
    addNews(`${G.coach.name} lodges a pre-contract approach for ${p.name} (${club?club.nick:'free agent'}).`, {title:'Pre-Contract Approach', type:'recruitment', tone:'neutral', playerId:id, tag:'Recruitment'});
    UI.toast(`Pre-contract approach made to ${p.name}.`);
    const m = document.getElementById('main');
    const prevTop = m ? m.scrollTop : 0;
    UI.render();
    if(m && prevTop > 0) requestAnimationFrame(() => { m.scrollTop = prevTop; });
  },

  signFreeAgent(id){
    const p = G.players[id]; if(!p) return;
    const t = myTeam();
    if(squadCount(t, 'top') >= TOP_SQUAD_CAP){ UI.modal(`<h3>Main Squad Full</h3><p>Your main squad has ${TOP_SQUAD_CAP} players — the hard maximum. Release a player before signing another full contract.</p><p style="color:var(--muted);font-size:12px">You can still sign players on a <b>Train & Trial</b> contract (T&T button) without needing a main-squad spot.</p><div class="btnrow"><button class="btn primary" onclick="UI.closeModal();UI.go('squad')">Go to Squad</button><button class="btn" onclick="UI.closeModal()">Cancel</button></div>`); return; }
    // Show full negotiation modal rather than auto-signing
    const demand = demandFor(p, t);
    UI._contractOffer = {pid:id, salary:demand, years:1, promises:{role:'none', captain:false, contractType:'flat'}, demand, isFreeAgent:true};
    UI.renderFreeAgentOffer();
  },

  signTrialContract(id){
    const p = G.players[id]; if(!p) return;
    const t = myTeam();
    if(squadCount(t, 'trial') >= TRIAL_SQUAD_CAP){ UI.toast(`You already have ${TRIAL_SQUAD_CAP} train & trial players (maximum).`); return; }
    // T&T salary: 40% of market rate, capped at the T&T maximum, rounded to $5k.
    const demand = demandFor(p, t);
    const trialSalary = Math.min(TRIAL_SALARY_CAP, Math.round(demand * 0.4 / 5000) * 5000);
    // High-ambition players unlikely to accept
    const willAccept = p.ambition < 60 || p.ovr < 65 || p.age >= 32;
    UI.modal(`<h3>Train & Trial Contract</h3>
      <p class="page-sub">${esc(p.name)} · ${p.pos} · Age ${p.age} · OVR ${p.ovr}</p>
      <div class="card" style="padding:10px 14px;margin-bottom:12px">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:var(--brass)">T&T Terms (non-negotiable)</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--muted)">
          <span>Salary: <b style="color:var(--ink)">${money(trialSalary)}/yr</b> (market: ${money(demand)})</span>
          <span>Length: <b style="color:var(--ink)">1 year</b></span>
          <span>Game limit: <b style="color:var(--ink)">${TRIAL_GAME_CAP} games</b> before upgrade required</span>
        </div>
        <p style="margin:8px 0 0;font-size:11px;color:var(--muted)">T&T salaries do not count against the salary cap · No release payout.</p>
      </div>
      ${!willAccept?`<p style="color:var(--red);font-size:12px">⚠ This player may be reluctant to accept a T&T deal given their ability and ambition.</p>`:''}
      <p style="font-size:12px;color:var(--muted)">T&T players can be selected in the match-day 19 but cannot play more than ${TRIAL_GAME_CAP} games this season without a contract upgrade.</p>
      <div class="btnrow">
        <button class="btn primary" onclick="UI._confirmTrialSign(${id},${trialSalary})">Sign T&T</button>
        <button class="btn" onclick="UI.closeModal()">Cancel</button>
      </div>`);
  },

  _confirmTrialSign(id, trialSalary){
    const p = G.players[id]; if(!p) return;
    const t = myTeam();
    if(squadCount(t, 'trial') >= TRIAL_SQUAD_CAP){ UI.toast(`Train & trial squad is full (${TRIAL_SQUAD_CAP} max).`); return; }
    // Check if player accepts (high-ambition/quality players may decline)
    const willAccept = p.ambition < 60 || p.ovr < 65 || p.age >= 32 || Math.random() < 0.55;
    if(!willAccept){
      UI.toast(`${p.name} turned down the T&T offer — seek a better deal.`);
      UI.closeModal(); return;
    }
    p.squad = 'trial';
    if(p.seasonStartOvr == null) p.seasonStartOvr = p.ovr;
    p.salary = trialSalary;
    p.years = 1;
    p.contractType = 'flat';
    p.contractSchedule = [trialSalary];
    p.trialGames = 0;
    p.trialBreakout = false;
    t.players.push(id);
    G.freeAgents = (G.freeAgents || []).filter(pid => pid !== id);
    if(G.offseason) G.offseason.freeAgents = (G.offseason.freeAgents || []).filter(pid => pid !== id);
    addNews(`${p.name} joins ${t.nick} on a train & trial contract.`, {title:'T&T Signing', type:'recruitment', tone:'good', playerId:id, teamId:t.id, tag:'Recruitment'});
    UI.toast(`${p.name} signed on a T&T deal at ${money(trialSalary)}/yr.`);
    UI.render();
    UI.showSigningCeremony(p, {team:t, kind:'Train & Trial Signing', salary:trialSalary, years:1, total:trialSalary, structure:'Train & Trial', role:`Depth contract · up to ${TRIAL_GAME_CAP} games`, nextPage:'squad'});
  },

  renderFreeAgentOffer(){
    const o = UI._contractOffer, p = G.players[o.pid], t = myTeam();
    const chance = contractSignChance(p, o.salary, o.years, t, o.promises, o.demand);
    const schedule = contractScheduleFor(o.salary, o.years, o.promises.contractType);
    const firstYear = schedule[0] || o.salary;
    const existingSal = o.isTrialUpgrade || salaryCountsForCap(p) ? currentSalary(p) : 0;
    const afterCap = G.config.cap - teamSalary(t) + existingSal - firstYear;
    const pct = Math.round(chance.prob*100);
    const promiseBtn = (role,label) => `<button class="btn sm ${o.promises.role===role?'primary':''}" onclick="UI._contractOffer.promises.role='${role}';UI.renderFreeAgentOffer()">${label}</button>`;
    const typeBtn = (type,label) => `<button class="btn sm ${o.promises.contractType===type?'primary':''}" onclick="UI._contractOffer.promises.contractType='${type}';UI.renderFreeAgentOffer()">${label}</button>`;
    const psnlLabels = {money:'Money-Driven',winner:'Win-Hungry',loyal:'Club Loyalist',ambitious:'Prestige-Seeker',homesick:'Homesick',balanced:'Balanced'};
    const psnlNote = {money:' (demands top dollar)',winner:' (wants a title contender)',loyal:' (very loyal — hard to poach)',ambitious:' (drawn to elite clubs)',homesick:' (strong city preference)',balanced:''};
    UI.modal(`<h3>Sign ${esc(p.name)}</h3>
      <p class="page-sub">${p.pos}/${p.pos2} · ${p.age}yo · OVR ${p.ovr} · Market value ${money(o.demand)} avg/yr${p.personality?` · <b>${psnlLabels[p.personality]||p.personality}</b>${psnlNote[p.personality]||''}`:''}</p>
      <div class="field"><label>Average salary offer</label><div class="btnrow" style="align-items:center;margin:0">
        <button class="btn sm" onclick="UI._contractOffer.salary=Math.max(85000,UI._contractOffer.salary-25000);UI.renderFreeAgentOffer()">-25k</button>
        <span style="font-family:var(--disp);font-size:26px;font-weight:700;min-width:120px;text-align:center">${money(o.salary)}</span>
        <button class="btn sm" onclick="UI._contractOffer.salary+=25000;UI.renderFreeAgentOffer()">+25k</button>
      </div></div>
      <div class="field"><label>Contract length</label><div class="radio-row">${[1,2,3].map(y=>`<div class="opt ${o.years===y?'sel':''}" onclick="UI._contractOffer.years=${y};UI.renderFreeAgentOffer()">${y} year${y>1?'s':''}</div>`).join('')}</div></div>
      <div class="field"><label>Contract structure</label><div class="btnrow" style="margin:0">${typeBtn('flat','Flat')}${typeBtn('front','Front-loaded')}${typeBtn('back','Back-loaded')}</div>
        <p style="color:var(--muted);font-size:11px;margin:6px 0 0">${schedule.map((v,i)=>`Y${i+1}: ${money(v)}`).join(' · ')}</p></div>
      <div class="field"><label>Promises</label><div class="btnrow" style="margin:0">${promiseBtn('none','No role promise')}${promiseBtn('bench','Bench')}${promiseBtn('starter','Starter')}${promiseBtn('superstar','Superstar')}</div>
        ${o.promises.role==='bench' && p.ovr>=68 ? `<p style="color:var(--red);font-size:11px;margin:4px 0 0">⚠ Bench role reduces signing chance for this player.</p>` : ''}
        <label style="display:flex;gap:8px;align-items:center;margin-top:8px;color:var(--muted);font-size:13px"><input type="checkbox" ${o.promises.captain?'checked':''} onchange="UI._contractOffer.promises.captain=this.checked;UI.renderFreeAgentOffer()"> Promise captaincy</label>
      </div>
      <div class="sign-meter"><i style="width:${pct}%"></i></div>
      <p style="color:var(--muted);font-size:12px">Estimated signing chance: <b style="color:${pct>=70?'var(--green)':pct<40?'var(--red)':'var(--brass)'}">${pct}%</b> · first-year cap hit ${money(firstYear)} · cap after deal: ${money(afterCap)}</p>
      <div class="btnrow"><button class="btn primary" onclick="UI.submitFreeAgentOffer()">Submit offer</button><button class="btn" onclick="UI.closeModal()">Cancel</button></div>`);
  },

  submitFreeAgentOffer(){
    const o = UI._contractOffer, p = G.players[o.pid], t = myTeam();
    const firstYear = contractScheduleFor(o.salary, o.years, o.promises.contractType)[0] || o.salary;
    const existingSal = o.isTrialUpgrade || salaryCountsForCap(p) ? currentSalary(p) : 0;
    if(teamSalary(t) - existingSal + firstYear > G.config.cap){ UI.toast('That signing would exceed the cap.'); return; }
    if(!o.isTrialUpgrade && !t.players.includes(p.id) && squadCount(t, 'top') >= TOP_SQUAD_CAP){ UI.toast(`Main squad is full (${TOP_SQUAD_CAP} max).`); return; }
    const res = offerContract(p, o.salary, o.years, t, o.promises, o.demand);
    if(res.ok){
      p.squad = 'top';
      p.everTopSquad = true;
      p.trialGames = undefined;
      p.trialBreakout = false;
      if(p.seasonStartOvr == null) p.seasonStartOvr = p.ovr;
      if(o.isTrialUpgrade){
        // Already on the team — just update contract terms
        addNews(`${p.name} upgraded from train & trial to a full contract at ${money(o.salary)}/yr.`, {title:'Contract Upgrade', type:'contract', tone:'good', playerId:p.id, teamId:t.id, tag:'Contracts'});
      } else {
        t.players.push(p.id);
        G.freeAgents = (G.freeAgents || []).filter(pid=>pid!==p.id);
        addNews(`${p.name} joins the ${t.nick} as a free agent.`, {title:'Free Agent Signing', type:'recruitment', tone:'good', playerId:p.id, teamId:t.id, tag:'Recruitment'});
      }
      UI.toast(`${p.name} signed for ${money(o.salary)}.`);
      UI.render();
      UI.showSigningCeremony(p, {
        team:t,
        kind:o.isTrialUpgrade ? 'Contract Upgrade' : 'Free Agent Signing',
        salary:contractAvg(p),
        years:p.years || o.years,
        total:contractTotal(p),
        structure:contractTypeLabel(p.contractType),
        role:`Promises: ${promiseSummary(p)}`,
        nextPage:'contracts',
        nextLabel:'View contracts'
      });
    } else {
      UI.toast(`${p.name} rejected the offer.`);
      UI.renderFreeAgentOffer();
    }
  },
});
