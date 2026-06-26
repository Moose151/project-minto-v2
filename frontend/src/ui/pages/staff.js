'use strict';

/* Staff — assistant coaches, fitness & kicking coaches */
Object.assign(UI, {
  _staffMarket: null,
  _staffFilter: 'all',
  _staffSearch: '',

  p_staff(){
    const staff = G.staff || [];
    const scouts = (G.scouting && G.scouting.scouts) || [];
    const weeks = Math.max(1, (G.fixtures ? G.fixtures.length : 24) + 3);

    const roleInfo = key => STAFF_ROLES.find(r => r.key === key) || {label: key, desc: '', trainingKeys: []};
    const abilityBar = ability => {
      const cls = ability >= 75 ? 'var(--green)' : ability >= 55 ? 'var(--brass)' : 'var(--red)';
      return `<div style="display:flex;align-items:center;gap:6px">
        <div style="flex:1;height:6px;background:var(--card2);border-radius:3px;overflow:hidden">
          <div style="width:${ability}%;height:100%;background:${cls}"></div>
        </div>
        <span style="font-size:12px;font-weight:700;color:${cls};min-width:24px">${ability}</span>
      </div>`;
    };

    const coachStaff  = staff.filter(s => s.role !== 'medical');
    const medStaff    = staff.filter(s => s.role === 'medical');
    const totalStaffSal = staff.reduce((s, x) => s + (x.salary || 0), 0) + scouts.reduce((s, x) => s + (x.salary || 0), 0);
    const weeklyStaffCost = (staff.length + scouts.length) ? Math.round(totalStaffSal / weeks) : 0;

    const specialtyLabel = s => s.posSpecialty ? `${POS_NAME[s.posSpecialty] || s.posSpecialty} Specialist` : '';
    const staffAffects = (s, info) => {
      const base = info.trainingKeys.length ? info.trainingKeys.slice(0,5).map(k=>ATTR_LABEL[k]||k).join(', ') : (info.key==='youth'?'Youth development':'');
      const spec = s.posSpecialty && POS_PROFILE[s.posSpecialty]
        ? `Retraining: ${POS_NAME[s.posSpecialty]} · Key skills: ${Object.entries(POS_PROFILE[s.posSpecialty]).filter(([,v])=>v[1]>=.07).map(([k])=>ATTR_LABEL[k]||k).slice(0,4).join(', ')}`
        : '';
      return [base, spec].filter(Boolean).join(' · ');
    };

    // Type badge helpers
    const typeBadge = (label, color) =>
      `<span style="font-size:10px;font-weight:800;letter-spacing:.06em;color:${color};background:${color}22;padding:2px 7px;border-radius:10px;border:1px solid ${color}55">${label}</span>`;
    const coachBadge  = () => typeBadge('COACH', '#4A9EFF');
    const medBadge    = () => typeBadge('MEDICAL', 'var(--green)');
    const scoutBadge  = () => typeBadge('SCOUT', 'var(--brass)');

    // Shared card renderer for coaches and medical
    const staffCard = (s, badgeFn) => {
      const info = roleInfo(s.role);
      const affects = staffAffects(s, info);
      const specLbl = specialtyLabel(s);
      const expiring = s.yearsLeft <= 1;
      const payoutYears = Math.max(0, (s.yearsLeft || 1) - 1);
      const payout = payoutYears * (s.salary || 0);
      return `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
          <div style="min-width:0;flex:1">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
              ${badgeFn()}
              ${expiring ? `<span style="font-size:10px;font-weight:700;color:var(--red);background:rgba(200,50,50,.12);padding:2px 6px;border-radius:8px">CONTRACT EXPIRING</span>` : ''}
            </div>
            <b style="font-size:15px">${esc(s.name)}</b>
            <p style="margin:2px 0;color:var(--brass);font-size:12px;font-weight:600">${esc(info.label)}${specLbl?` <span style="color:#4A9EFF;font-weight:500">· ${esc(specLbl)}</span>`:''}</p>
            <p style="margin:2px 0;color:var(--muted);font-size:11px">${esc(info.desc)}</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
            ${expiring ? `<button class="btn sm primary" onclick="UI.extendStaff(${s.id})">Extend</button>` : ''}
            <button class="btn sm" style="color:var(--red)" onclick="UI.fireStaff(${s.id})">${payout > 0 ? `Fire (${money(payout)})` : 'Release'}</button>
          </div>
        </div>
        <div style="margin:6px 0">${abilityBar(s.ability)}</div>
        <div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--muted)">Contract: <b>${s.yearsLeft} yr${s.yearsLeft===1?'':'s'}</b></span>
          <span style="font-size:12px;color:var(--muted)">Salary: <b>${money(s.salary)}</b></span>
          ${payout > 0 ? `<span style="font-size:12px;color:var(--dim)">Release payout: <b>${money(payout)}</b></span>` : ''}
        </div>
        ${affects ? `<p style="margin:6px 0 0;font-size:11px;color:var(--dim)">Boosts: ${esc(affects)}</p>` : ''}
      </div>`;
    };

    const scoutCard = s => {
      const expiring = s.yearsLeft <= 1;
      const payoutYears = Math.max(0, (s.yearsLeft || 1) - 1);
      const payout = payoutYears * (s.salary || 0);
      const mission = (G.scouting.missions || []).find(m => m.scoutId === s.id);
      const statusLine = mission
        ? (() => { const r = SCOUT_REGIONS.find(x => x.key === mission.region); return `On mission — ${esc(r ? r.label : mission.region)} · ${mission.weeksLeft}w left`; })()
        : 'Available';
      const statusColor = mission ? 'var(--brass)' : 'var(--green)';
      return `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
          <div style="min-width:0;flex:1">
            <div style="margin-bottom:3px">${scoutBadge()}${expiring?` <span style="font-size:10px;font-weight:700;color:var(--red);background:rgba(200,50,50,.12);padding:2px 6px;border-radius:8px;margin-left:4px">CONTRACT EXPIRING</span>`:''}</div>
            <b style="font-size:15px">${esc(s.name)}</b>
            <p style="margin:2px 0;color:var(--brass);font-size:12px;font-weight:600">Scout</p>
            <p style="margin:2px 0;color:var(--muted);font-size:11px">Finds young talent in regional scouting areas</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
            ${expiring ? `<button class="btn sm primary" onclick="UI.extendScout(${s.id})">Extend</button>` : ''}
            <button class="btn sm" style="color:var(--red)" onclick="UI.fireScout(${s.id})">${payout > 0 ? `Fire (${money(payout)})` : 'Release'}</button>
          </div>
        </div>
        <div style="margin:6px 0">${abilityBar(s.ability)}</div>
        <div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--muted)">Contract: <b>${s.yearsLeft} yr${s.yearsLeft===1?'':'s'}</b></span>
          <span style="font-size:12px;color:var(--muted)">Salary: <b>${money(s.salary)}</b></span>
          ${payout > 0 ? `<span style="font-size:12px;color:var(--dim)">Release payout: <b>${money(payout)}</b></span>` : ''}
        </div>
        <p style="margin:6px 0 0;font-size:11px;color:${statusColor}">${statusLine}</p>
      </div>`;
    };

    // Filter + search state
    const filt = UI._staffFilter || 'all';
    const srch = (UI._staffSearch || '').toLowerCase();
    const matchName = (s) => !srch || s.name.toLowerCase().includes(srch);

    const showCoach  = filt === 'all' || filt === 'coaches';
    const showMed    = filt === 'all' || filt === 'medical';
    const showScout  = filt === 'all' || filt === 'scouts';

    const filtCoach  = coachStaff.filter(matchName);
    const filtMed    = medStaff.filter(matchName);
    const filtScout  = scouts.filter(matchName);

    const filterBar = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
      <input type="text" placeholder="Search staff..." value="${esc(UI._staffSearch||'')}"
        oninput="UI._staffSearch=this.value;UI.render()"
        style="padding:6px 10px;border-radius:6px;border:1px solid var(--line);background:var(--card2);color:var(--ink);font-size:13px;width:200px">
      ${['all','coaches','medical','scouts'].map(f =>
        `<button class="btn sm ${filt===f?'primary':''}" onclick="UI._staffFilter='${f}';UI.render()">${{all:'All',coaches:'Coaches',medical:'Medical',scouts:'Scouts'}[f]}</button>`
      ).join('')}
      ${(filt!=='all'||srch)?`<button class="btn sm" onclick="UI._staffFilter='all';UI._staffSearch='';UI.render()">Reset</button>`:''}
    </div>`;

    // Generate market on new season; refresh the candidate pool periodically in-season
    UI._ensureStaffMarket();
    const curRound = G.round || 0;
    const market = UI._staffMarket.list.filter(s => !staff.some(x => x.id === s.id));

    const marketBadgeFor = s => s.role === 'medical' ? medBadge() : coachBadge();
    const filteredMarket = market.filter(s => {
      const catOk = filt === 'all'
        || (filt === 'coaches' && s.role !== 'medical')
        || (filt === 'medical' && s.role === 'medical');
      return catOk && (!srch || s.name.toLowerCase().includes(srch));
    });

    const marketRows = filteredMarket.map(s => {
      const info = roleInfo(s.role);
      const alreadyHaveRole = staff.some(x => x.role === s.role);
      const affects = staffAffects(s, info);
      const specLbl = specialtyLabel(s);
      const isNew = s.addedRound === UI._staffMarket.refreshRound && curRound > 0;
      return `<tr>
        <td style="white-space:nowrap">${marketBadgeFor(s)}${isNew?` <span class="pos-tag" style="background:rgba(95,170,110,.18);color:var(--green)">NEW</span>`:''}</td>
        <td><b>${esc(s.name)}</b><br><span style="font-size:11px;color:var(--brass)">${esc(info.label)}${specLbl?` · ${esc(specLbl)}`:''}</span></td>
        <td style="min-width:100px">${abilityBar(s.ability)}</td>
        <td class="num" style="white-space:nowrap">${money(s.salary)}</td>
        <td class="num" style="white-space:nowrap">${s.yearsLeft}yr</td>
        <td style="font-size:11px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis">${esc(affects)}</td>
        <td style="white-space:nowrap">
          ${alreadyHaveRole
            ? `<span style="font-size:11px;color:var(--dim)" title="You already have a ${info.label}">Role filled</span>`
            : `<button class="btn sm primary" onclick="UI.hireStaff(${s.id})">Hire</button>`}
        </td>
      </tr>`;
    }).join('');

    const coachSection = showCoach ? `
      <h2 class="sec">Coaches (${filtCoach.length}${filtCoach.length!==coachStaff.length?` of ${coachStaff.length}`:''})</h2>
      <div class="grid3" style="margin-bottom:16px">${filtCoach.length ? filtCoach.map(s=>staffCard(s,coachBadge)).join('') : `<div class="card"><p style="color:var(--muted)">${srch?'No coaches match your search.':'No assistant coaches hired.'}</p></div>`}</div>` : '';

    const medSection = showMed ? `
      <h2 class="sec">Medical Staff (${filtMed.length}${filtMed.length!==medStaff.length?` of ${medStaff.length}`:''})</h2>
      <p style="font-size:12px;color:var(--muted);margin:-6px 0 10px">Physios give each injured player a weekly chance of extra recovery. Stack multiple physios for a larger combined bonus.</p>
      <div class="grid3" style="margin-bottom:16px">${filtMed.length ? filtMed.map(s=>staffCard(s,medBadge)).join('') : `<div class="card"><p style="color:var(--muted)">${srch?'No medical staff match your search.':'No medical staff hired — find a Physio on the market below.'}</p></div>`}</div>` : '';

    const scoutSection = showScout ? `
      <h2 class="sec">Scouts (${filtScout.length}${filtScout.length!==scouts.length?` of ${scouts.length}`:''})</h2>
      <p style="font-size:12px;color:var(--muted);margin:-6px 0 10px">Contracts and releases managed here. Dispatch scouts on the <span class="click" onclick="UI.go('scouting')" style="color:var(--brass);cursor:pointer">Scouting page</span>.</p>
      <div class="grid3" style="margin-bottom:16px">${filtScout.length ? filtScout.map(scoutCard).join('') : `<div class="card"><p style="color:var(--muted)">${srch?'No scouts match your search.':'No scouts on payroll.'}</p></div>`}</div>` : '';

    const marketSection = (filt !== 'scouts') ? `
      <h2 class="sec">Hire — Available on Market</h2>
      <p style="font-size:12px;color:var(--muted);margin:-6px 0 10px">Pool refreshes every ${UI._STAFF_REFRESH_EVERY} rounds — un-hired candidates eventually move on and fresh names (tagged <span class="pos-tag" style="background:rgba(95,170,110,.18);color:var(--green)">NEW</span>) arrive. You can only hold one coach per role.</p>
      <div class="card" style="padding:6px;overflow-x:auto">
        <table>
          <thead><tr>
            <th class="noclick">Type</th>
            <th class="noclick">Name / Role</th>
            <th class="noclick" style="min-width:100px">Ability</th>
            <th class="noclick num">Salary</th>
            <th class="noclick num">Length</th>
            <th class="noclick">Boosts</th>
            <th class="noclick"></th>
          </tr></thead>
          <tbody>${marketRows || '<tr><td colspan="7" style="color:var(--muted)">No staff match your current filter.</td></tr>'}</tbody>
        </table>
      </div>` : '';

    return `<h1 class="page">Staff</h1>
    <p class="page-sub">Assistant coaches improve player development. Medical staff accelerate recovery. All staff salaries paid from club funds.</p>
    <div style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap">
      <div class="card" style="padding:10px 16px;flex:1;min-width:120px">
        <span style="font-size:11px;color:var(--muted)">Coaches</span>
        <div style="font-size:22px;font-weight:700;font-family:var(--disp)">${coachStaff.length}</div>
      </div>
      <div class="card" style="padding:10px 16px;flex:1;min-width:120px">
        <span style="font-size:11px;color:var(--muted)">Medical</span>
        <div style="font-size:22px;font-weight:700;font-family:var(--disp)">${medStaff.length}</div>
      </div>
      <div class="card" style="padding:10px 16px;flex:1;min-width:120px">
        <span style="font-size:11px;color:var(--muted)">Scouts</span>
        <div style="font-size:22px;font-weight:700;font-family:var(--disp)">${scouts.length}</div>
      </div>
      <div class="card" style="padding:10px 16px;flex:1;min-width:120px">
        <span style="font-size:11px;color:var(--muted)">Total salary</span>
        <div style="font-size:22px;font-weight:700;font-family:var(--disp)">${money(totalStaffSal)}</div>
      </div>
      <div class="card" style="padding:10px 16px;flex:1;min-width:120px">
        <span style="font-size:11px;color:var(--muted)">Weekly cost</span>
        <div style="font-size:22px;font-weight:700;font-family:var(--disp)">${money(weeklyStaffCost)}</div>
      </div>
    </div>
    ${filterBar}
    ${coachSection}
    ${medSection}
    ${scoutSection}
    ${marketSection}`;
  },

  _STAFF_MARKET_CAP: 12,        // max un-hired candidates in the pool
  _STAFF_REFRESH_EVERY: 4,      // rounds between refreshes
  _STAFF_STALE_ROUNDS: 9,       // un-hired candidates older than this are dropped

  _ensureStaffMarket(){
    const round = G.round || 0;
    if(!UI._staffMarket || UI._staffMarket.year !== G.year){
      const list = UI._genStaffMarket();
      list.forEach(s => s.addedRound = round);
      UI._staffMarket = { year: G.year, list, refreshRound: round };
      return;
    }
    if(UI._staffMarket.refreshRound == null) UI._staffMarket.refreshRound = round;
    if(round - UI._staffMarket.refreshRound >= UI._STAFF_REFRESH_EVERY){
      UI._refreshStaffMarket(round);
      UI._staffMarket.refreshRound = round;
    }
  },

  // Drop stale un-hired candidates and top the pool back up to the cap with fresh names.
  _refreshStaffMarket(round){
    const m = UI._staffMarket;
    const hiredIds = new Set((G.staff || []).map(x => x.id));
    const stale = UI._STAFF_STALE_ROUNDS;
    const hired = m.list.filter(s => hiredIds.has(s.id));
    // Un-hired: drop stale, then trim to the cap keeping the freshest candidates.
    let pool = m.list.filter(s => !hiredIds.has(s.id) && (round - (s.addedRound || round)) < stale);
    pool.sort((a, b) => (b.addedRound || 0) - (a.addedRound || 0));
    pool = pool.slice(0, UI._STAFF_MARKET_CAP);
    const kept = hired.concat(pool);
    const need = UI._STAFF_MARKET_CAP - pool.length;
    let nextId = m.list.reduce((mx, s) => Math.max(mx, s.id), 9000) + 1;
    const fresh = [];
    if(need > 0){
      const newCands = (typeof shuffle === 'function' ? shuffle(UI._genStaffMarket()) : UI._genStaffMarket());
      const haveRoles = new Set(pool.map(s => s.role));
      // Prefer candidates for roles not already represented in the pool, then fill the rest.
      const ordered = newCands.slice().sort((a, b) => (haveRoles.has(a.role) ? 1 : 0) - (haveRoles.has(b.role) ? 1 : 0));
      for(const c of ordered){
        if(fresh.length >= need) break;
        c.id = nextId++;
        c.addedRound = round;
        fresh.push(c);
      }
    }
    m.list = kept.concat(fresh);
  },

  _genStaffMarket(){
    const list = [];
    const usedSpecialties = {};
    for(const role of STAFF_ROLES){
      const n = role.key === 'youth' ? 1 : 2;
      for(let i = 0; i < n; i++){
        const ability = clamp(Math.round(35 + Math.random() * 50), 25, 90);
        const name = `${pick(FIRST)} ${pick(LAST)}`;
        const salary = Math.round((40000 + Math.pow(ability/90, 2.2)*260000)/5000)*5000;
        const yearsLeft = 1 + Math.floor(Math.random() * 3);
        let posSpecialty = null;
        if(role.canHaveSpecialty){
          const tried = usedSpecialties[role.key] || [];
          const remaining = POS.filter(p => !tried.includes(p));
          posSpecialty = pick(remaining.length ? remaining : POS);
          usedSpecialties[role.key] = [...tried, posSpecialty];
        }
        const s = {id: 9000 + list.length + 1, name, role: role.key, ability, salary, yearsLeft};
        if(posSpecialty) s.posSpecialty = posSpecialty;
        list.push(s);
      }
    }
    return list;
  },

  hireStaff(id){
    const market = (UI._staffMarket && UI._staffMarket.list) || [];
    const s = market.find(x => x.id === id);
    if(!s){ UI.toast('Staff member not found.'); return; }
    if((G.staff || []).some(x => x.role === s.role)){
      UI.toast(`You already have a ${STAFF_ROLES.find(r=>r.key===s.role)?.label || s.role}.`);
      return;
    }
    G.staff = G.staff || [];
    G.staff.push(s);
    UI.toast(`${s.name} hired as ${STAFF_ROLES.find(r=>r.key===s.role)?.label || s.role}.`);
    UI.render();
  },

  fireStaff(id){
    if(!G.staff) return;
    const s = G.staff.find(x => x.id === id);
    if(!s) return;
    const payoutYears = Math.max(0, (s.yearsLeft || 1) - 1);
    const payout = payoutYears * (s.salary || 0);
    const payoutLine = payout > 0
      ? `<p style="color:var(--red);font-size:13px">Contract payout: <b>${money(payout)}</b> (${payoutYears} year${payoutYears===1?'':'s'} remaining × ${money(s.salary)})</p>`
      : `<p style="color:var(--muted);font-size:13px">No payout — contract is in its final year.</p>`;
    UI.modal(`<h3>Release ${esc(s.name)}?</h3>
      ${payoutLine}
      <p style="font-size:12px;color:var(--muted)">This will remove them from your coaching staff immediately.</p>
      <div class="btnrow">
        <button class="btn primary" style="background:var(--red)" onclick="UI._confirmFireStaff(${id}, ${payout})">Confirm</button>
        <button class="btn" onclick="UI.closeModal()">Cancel</button>
      </div>`);
  },

  _confirmFireStaff(id, payout){
    if(payout > 0){
      G.club.funds = (G.club.funds || 0) - payout;
      addNews(`Staff release payout: ${money(payout)} paid from club funds.`, {type:'finance', tone:'bad', tag:'Staff', teamId:G.coach.teamId});
    }
    G.staff = (G.staff || []).filter(s => s.id !== id);
    UI.closeModal();
    UI.toast(payout > 0 ? `Staff released. ${money(payout)} payout deducted.` : 'Staff member released.');
    UI.render();
  },

  extendStaff(id){
    const s = (G.staff || []).find(x => x.id === id);
    if(!s) return;
    const info = STAFF_ROLES.find(r => r.key === s.role) || {label: s.role};
    // Demand: current salary × multiplier (ability-weighted), rounded to $5k
    const demandMult = 1.05 + (s.ability / 90) * 0.18;
    const newSalary = Math.round(s.salary * demandMult / 5000) * 5000;
    const salaryChange = newSalary - s.salary;
    const salColour = salaryChange > 0 ? 'var(--red)' : 'var(--green)';
    UI.modal(`<h3>Extend ${esc(s.name)}</h3>
      <p class="page-sub">${esc(info.label)}${s.posSpecialty ? ` · ${POS_NAME[s.posSpecialty]||s.posSpecialty} Specialist` : ''} · Ability ${s.ability}</p>
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
        <button class="btn sm primary" onclick="UI._confirmExtendStaff(${id}, 1, ${newSalary})">1 year</button>
        <button class="btn sm primary" onclick="UI._confirmExtendStaff(${id}, 2, ${newSalary})">2 years</button>
        <button class="btn sm primary" onclick="UI._confirmExtendStaff(${id}, 3, ${newSalary})">3 years</button>
        <button class="btn" onclick="UI.closeModal()">Cancel</button>
      </div>`);
  },

  _confirmExtendStaff(id, years, newSalary){
    const s = (G.staff || []).find(x => x.id === id);
    if(!s) return;
    s.yearsLeft = (s.yearsLeft || 1) + years;
    s.salary = newSalary;
    UI.closeModal();
    UI.toast(`${s.name} extended for ${years} year${years===1?'':'s'} at ${money(newSalary)}/yr.`);
    UI.render();
  },
});
