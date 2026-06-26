'use strict';

/* Coach profile — reputation, badge, record, attrs, history */
Object.assign(UI, {
  p_coach(){
    const c = G.coach;
    const badge = BADGES.slice().reverse().find(b=>c.rep>=b[0])[1];
    const coachBadges = typeof coachBadgeList === 'function' ? coachBadgeList(c) : [];
    const attrBar = (label, val, desc) => `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${label}</span><b>${val}</b></div>
      <div class="bar"><i style="width:${val}%"></i></div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">${desc}</div></div>`;
    const upgrade = (key,label) => `<button class="btn sm" onclick="UI.upgradeCoachAttr('${key}')">${label} +1 (${money(UI.coachUpgradeCost())})</button>`;
    const attrsHtml = c.attrs ? `
      <h2 class="sec">Coaching Attributes</h2>
      <div class="grid2">
        <div class="card">
          ${attrBar('Player Development', c.attrs.development, 'Boosts player attribute growth rate')}
          ${attrBar('Man Management', c.attrs.manMgmt, 'Amplifies morale changes after results')}
        </div>
        <div class="card">
          ${attrBar('Fitness Management', c.attrs.fitness, 'Improves weekly condition recovery')}
          ${attrBar('Tactical Coaching', c.attrs.tactics, 'Small match-day performance bonus')}
        </div>
      </div>
      <div class="card" style="margin-top:12px"><h2 class="sec" style="margin-top:0">Professional development</h2>
        <p style="color:var(--muted);font-size:12px">Spend coaching salary/cash to improve your skills.</p>
        <div class="btnrow">${upgrade('development','Development')}${upgrade('manMgmt','Man Management')}${upgrade('fitness','Fitness')}${upgrade('tactics','Tactics')}</div>
      </div>` : '';
    const totalGames = (c.careerW||0) + (c.careerL||0);
    const winRate = totalGames > 0 ? Math.round((c.careerW||0) / totalGames * 100) : 0;
    const winRateColour = winRate >= 60 ? 'var(--green)' : winRate >= 45 ? 'var(--ink)' : 'var(--red)';
    const lad = ladder();
    const myRow = lad.find(r=>r.id===G.coach.teamId)||{w:0,l:0,d:0,p:0};
    const seasonRecord = myRow.p > 0 ? `${myRow.w}W ${myRow.l}L${myRow.d?' '+myRow.d+'D':''}` : 'Season not started';
    return `<h1 class="page">Coach Profile</h1><p class="page-sub">${esc(c.name)} · ${esc(teamName(myTeam()))}</p>
    <div class="grid3">
      <div class="card"><div class="navsep" style="margin:0">Reputation</div><div style="font-family:var(--disp);font-size:42px;font-weight:700;color:var(--brass)">${Math.round(c.rep)}</div><div class="bar"><i style="width:${c.rep}%"></i></div><p style="color:var(--muted);font-size:12px;margin-top:8px">${esc(badge)}</p></div>
      <div class="card"><div class="navsep" style="margin:0">Career record</div><div style="display:flex;align-items:baseline;gap:10px"><div style="font-family:var(--disp);font-size:38px;font-weight:700">${c.careerW||0}–${c.careerL||0}</div><div style="font-size:20px;font-weight:700;color:${winRateColour}">${winRate}%</div></div><p style="color:var(--muted);font-size:12px;margin-top:4px">${c.prems||0} prem${(c.prems||0)===1?'':'s'} · ${seasonRecord} this season</p></div>
      <div class="card"><div class="navsep" style="margin:0">Board confidence</div><div style="font-family:var(--disp);font-size:42px;font-weight:700;color:${c.conf<30?'var(--red)':c.conf>70?'var(--green)':'var(--ink)'}">${Math.round(c.conf)}%</div><p style="color:var(--muted);font-size:12px;margin-top:8px">Expectation: ${esc(c.expect.label)}</p></div>
      <div class="card"><div class="navsep" style="margin:0">Contract</div><div style="font-family:var(--disp);font-size:32px;font-weight:700">${money(c.salary||0)}</div><p style="color:var(--muted);font-size:12px;margin-top:8px">${c.contractYears||0} year${(c.contractYears||0)===1?'':'s'} remaining · cash ${money(c.cash||0)}</p>${(c.contractYears||0)<=1?`<button class="btn sm primary" style="margin-top:8px" onclick="UI.coachContractExtension()">Negotiate Extension</button>`:''}</div>
    </div>
    <h2 class="sec">Coach Badges</h2>
    <div class="card coach-badges">
      ${coachBadges.length ? coachBadges.map(b=>`<span class="coach-badge ${b.tier}" title="${esc(b.desc)}"><b>${esc(b.label)}</b><em>${esc(b.desc)}</em></span>`).join('') : '<p style="color:var(--muted);font-size:12px">No coaching badges yet. Wins, reputation, premierships, loyalty, and attribute milestones unlock them.</p>'}
    </div>
    ${attrsHtml}
    <h2 class="sec">Coaching history</h2>
    <div class="card" style="padding:6px"><table><thead><tr><th class="noclick">Year</th><th class="noclick">Club</th><th class="noclick num">W-L</th><th class="noclick num">Finish</th><th class="noclick"></th></tr></thead><tbody>
    ${c.history.map(h=>`<tr><td>${h.year}</td><td>${esc(h.team)}</td><td class="num" style="color:var(--muted)">${h.w!=null?`${h.w}–${h.l}`:'-'}</td><td class="num">${ord(h.pos)}</td><td>${h.premier?'<span style="color:var(--gold)">★ Premiers</span>':''}</td></tr>`).join('')||'<tr><td colspan="5" style="color:var(--muted)">First season underway.</td></tr>'}
    </tbody></table></div>`;
  },
  coachContractExtension(){
    const c = G.coach;
    // Board offer: salary scales with rep; more experienced coaches can demand more
    const baseDemand = Math.round((60000 + Math.pow((c.rep||30)/99, 1.8) * 340000) / 5000) * 5000;
    const salaryChange = baseDemand - (c.salary || 0);
    const salColour = salaryChange > 0 ? 'var(--red)' : 'var(--green)';
    UI.modal(`<h3>Contract Extension</h3>
      <p class="page-sub">${esc(c.name)} · Rep ${Math.round(c.rep||0)}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0">
        <div class="card" style="padding:10px">
          <div style="font-size:11px;color:var(--muted)">Current salary</div>
          <div style="font-size:18px;font-weight:700">${money(c.salary||0)}</div>
        </div>
        <div class="card" style="padding:10px">
          <div style="font-size:11px;color:var(--muted)">Board offer</div>
          <div style="font-size:18px;font-weight:700;color:${salColour}">${money(baseDemand)} <span style="font-size:12px">(${salaryChange>0?'+':''}${money(salaryChange)})</span></div>
        </div>
      </div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:12px">Choose extension length:</p>
      <div class="btnrow">
        <button class="btn sm primary" onclick="UI._confirmCoachExtension(1, ${baseDemand})">1 year</button>
        <button class="btn sm primary" onclick="UI._confirmCoachExtension(2, ${baseDemand})">2 years</button>
        <button class="btn sm primary" onclick="UI._confirmCoachExtension(3, ${baseDemand})">3 years</button>
        <button class="btn" onclick="UI.closeModal()">Decline</button>
      </div>`);
  },
  _confirmCoachExtension(years, newSalary){
    const c = G.coach;
    c.contractYears = (c.contractYears || 0) + years;
    c.salary = newSalary;
    UI.closeModal();
    UI.toast(`Contract extended ${years} year${years===1?'':'s'} at ${money(newSalary)}/yr.`);
    UI.render();
  },
  coachUpgradeCost(){ return 25000 + Math.round((G.coach.rep||30)*650); },
  upgradeCoachAttr(key){
    const cost = UI.coachUpgradeCost();
    if((G.coach.cash||0) < cost){ UI.toast('Not enough coaching cash.'); return; }
    G.coach.cash -= cost;
    G.coach.attrs[key] = clamp((G.coach.attrs[key]||40)+1, 20, 99);
    UI.toast('Coach skill improved.');
    UI.render();
  },
});
