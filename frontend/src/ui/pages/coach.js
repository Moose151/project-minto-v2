import { UI } from "../01-core.js";


/* Coach profile — reputation, badge, record, attrs, history */
Object.assign(UI, {
  p_coach(){
    const c = G.coach;
    const badge = BADGES.slice().reverse().find(b=>c.rep>=b[0])[1];
    const coachBadges = typeof coachBadgeList === 'function' ? coachBadgeList(c) : [];
    const lad = ladder();
    const myRow = lad.find(r=>r.id===G.coach.teamId)||{w:0,l:0,d:0,p:0};
    const myPos = lad.findIndex(r=>r.id===G.coach.teamId)+1;
    const totalTeams = G.teams.length;
    const expect = c.expect || {label:'Compete', minPos: Math.ceil(totalTeams*0.5)};
    const totalRounds = G.fixtures ? G.fixtures.length : 24;
    const roundsDone = Math.max(0, G.round);
    const seasonPct = Math.min(1, roundsDone / Math.max(1, totalRounds));

    // Board relationship
    const onTrack = myPos <= expect.minPos;
    const trajectoryLabel = (() => {
      if(G.phase !== 'regular') return null;
      if(myPos <= 1) return { text: 'Premiership contenders', col: 'var(--green)' };
      if(onTrack && myPos <= expect.minPos - 2) return { text: 'Exceeding expectations', col: 'var(--green)' };
      if(onTrack) return { text: 'On track', col: 'var(--green)' };
      if(myPos <= expect.minPos + 2) return { text: 'Just short — pressure building', col: 'var(--accent)' };
      return { text: 'Below expectations — board concerned', col: 'var(--red)' };
    })();

    // Project end-of-season finish based on current form
    const recentForm = myRow.p > 0 ? (myRow.w + myRow.d * 0.5) / myRow.p : 0.5;
    const remainingRounds = totalRounds - roundsDone;
    const projectedWins = myRow.w + Math.round(recentForm * remainingRounds);
    const allProjected = lad.map(r => {
      const t = G.teams[r.id];
      const pct = r.p > 0 ? (r.w + r.d * 0.5) / r.p : 0.5;
      const proj = r.w + Math.round(pct * (totalRounds - r.p));
      return { id: r.id, proj };
    }).sort((a, b) => b.proj - a.proj);
    const projPos = allProjected.findIndex(x => x.id === G.coach.teamId) + 1;

    // Season-end outcome prediction
    const projOutcome = (() => {
      if(projPos === 1) return { text: 'Projected premiers', col: 'var(--green)', confD: '+40 → 95' };
      if(projPos <= expect.minPos) return { text: `Projected ${ord(projPos)} — target met`, col: 'var(--green)', confD: '+10' };
      if(projPos <= expect.minPos + 2) return { text: `Projected ${ord(projPos)} — just short`, col: 'var(--accent)', confD: '−8' };
      return { text: `Projected ${ord(projPos)} — below target`, col: 'var(--red)', confD: '−22' };
    })();

    const confColor = c.conf >= 70 ? 'var(--green)' : c.conf < 35 ? 'var(--red)' : 'var(--accent)';
    const confLabel = c.conf >= 80 ? 'Very strong' : c.conf >= 60 ? 'Good' : c.conf >= 40 ? 'Adequate' : c.conf >= 25 ? 'Fragile' : 'Critical';
    const contractSecurity = c.contractYears >= 3 ? 'Secure' : c.contractYears === 2 ? 'Stable' : c.contractYears === 1 ? 'Final year' : 'Expired';
    const contractColor = c.contractYears >= 2 ? 'var(--green)' : c.contractYears === 1 ? 'var(--accent)' : 'var(--red)';

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
          ${attrBar('Man Management', c.attrs.manMgmt, 'Reduces rotation morale penalties; amplifies team talk effects')}
        </div>
        <div class="card">
          ${attrBar('Fitness Management', c.attrs.fitness, 'Improves weekly condition recovery')}
          ${attrBar('Tactical Coaching', c.attrs.tactics, 'Small match-day performance bonus')}
        </div>
      </div>
      <div class="card" style="margin-top:12px"><h2 class="sec" style="margin-top:0">Professional development</h2>
        <p style="color:var(--muted);font-size:12px">Spend coaching cash to improve your skills.</p>
        <div class="btnrow">${upgrade('development','Development')}${upgrade('manMgmt','Man Mgmt')}${upgrade('fitness','Fitness')}${upgrade('tactics','Tactics')}</div>
      </div>` : '';

    const totalGames = (c.careerW||0) + (c.careerL||0);
    const winRate = totalGames > 0 ? Math.round((c.careerW||0) / totalGames * 100) : 0;
    const winRateColour = winRate >= 60 ? 'var(--green)' : winRate >= 45 ? 'var(--ink)' : 'var(--red)';
    const seasonRecord = myRow.p > 0 ? `${myRow.w}W ${myRow.l}L${myRow.d?' '+myRow.d+'D':''}` : 'Season not started';

    // Board objectives card
    const finalsSpots = totalTeams >= 8 ? 8 : 4;
    const targetLabel = expect.minPos <= 1 ? 'Win the premiership'
      : expect.minPos <= finalsSpots ? `Finish top ${expect.minPos} (make finals)`
      : `Finish ${ord(expect.minPos)} or better`;

    const boardObjectives = `<div class="card" style="margin-bottom:16px">
      <h2 class="sec" style="margin-top:0">Board Season Objectives</h2>
      <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Season Target</div>
          <div style="font-size:16px;font-weight:700">${esc(targetLabel)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">Expectation set at season start based on squad strength</div>
          ${G.phase === 'regular' ? `
          <div style="margin-top:10px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
              <span style="color:var(--muted)">Season progress</span>
              <span>${roundsDone} / ${totalRounds} rounds</span>
            </div>
            <div class="bar"><i style="width:${Math.round(seasonPct*100)}%"></i></div>
          </div>` : ''}
        </div>
        <div style="flex:1;min-width:200px">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Current Standing</div>
          <div style="display:flex;align-items:baseline;gap:10px">
            <span style="font-size:28px;font-weight:900;font-family:var(--disp);color:${onTrack?'var(--green)':'var(--red)'}">${ord(myPos)}</span>
            <span style="font-size:13px;color:var(--muted)">of ${totalTeams} · target ${ord(expect.minPos)}</span>
          </div>
          ${trajectoryLabel ? `<div style="font-size:12px;font-weight:600;color:${trajectoryLabel.col};margin-top:4px">${esc(trajectoryLabel.text)}</div>` : ''}
          ${G.phase === 'regular' && roundsDone >= 3 ? `
          <div style="margin-top:8px;padding:8px 10px;background:var(--card2);border-radius:6px;font-size:12px">
            <div style="color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Projection at season end</div>
            <span style="font-weight:700;color:${projOutcome.col}">${esc(projOutcome.text)}</span>
            <span style="color:var(--dim);font-size:11px;margin-left:6px">→ Board conf ${projOutcome.confD}</span>
          </div>` : ''}
        </div>
        <div style="flex:1;min-width:180px">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Board Confidence</div>
          <div style="font-size:36px;font-weight:900;font-family:var(--disp);color:${confColor};line-height:1">${Math.round(c.conf)}%</div>
          <div style="font-size:12px;color:${confColor};font-weight:600;margin-top:2px">${confLabel}</div>
          <div class="bar" style="margin-top:8px"><i style="width:${Math.round(c.conf)}%;background:${confColor}"></i></div>
          <div style="margin-top:8px;font-size:11px;color:var(--muted)">
            ${c.conf >= 70 ? 'Board is supportive. Contract security is high.'
              : c.conf >= 40 ? 'Board expects improvement this season.'
              : c.conf >= 20 ? 'Board patience is running thin. Results needed.'
              : 'Job is at risk. Win now or face the sack.'}
          </div>
        </div>
        <div style="flex:1;min-width:160px">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Contract</div>
          <div style="font-size:24px;font-weight:900;font-family:var(--disp)">${money(c.salary||0)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">per season</div>
          <div style="margin-top:6px;font-size:13px;font-weight:700;color:${contractColor}">${contractSecurity}</div>
          <div style="font-size:12px;color:var(--muted)">${c.contractYears||0} year${(c.contractYears||0)===1?'':'s'} remaining</div>
          ${(c.contractYears||0)<=1 ? `<button class="btn sm primary" style="margin-top:8px" onclick="UI.coachContractExtension()">Negotiate Extension</button>` : ''}
        </div>
      </div>
      <div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--line)">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">What affects board confidence?</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px">
          <span style="color:var(--green)">+Win results &nbsp;+Press conference responses &nbsp;+Exceeding expectations at season end</span>
          <span style="color:var(--red)">−Loss results &nbsp;−Finishing below ladder target</span>
        </div>
      </div>
    </div>`;

    return `<h1 class="page">Coach Profile</h1><p class="page-sub">${esc(c.name)} · ${esc(teamName(myTeam()))}</p>
    <div class="grid2" style="margin-bottom:16px">
      <div class="card">
        <div class="navsep" style="margin:0 0 6px">Reputation</div>
        <div style="display:flex;align-items:baseline;gap:12px">
          <div style="font-family:var(--disp);font-size:42px;font-weight:700;color:var(--accent)">${Math.round(c.rep)}</div>
          <div style="font-size:13px;color:var(--muted)">${esc(badge)}</div>
        </div>
        <div class="bar" style="margin-top:6px"><i style="width:${c.rep}%"></i></div>
        <div style="margin-top:10px;font-size:12px;color:var(--muted)">Cash: ${money(c.cash||0)}</div>
      </div>
      <div class="card">
        <div class="navsep" style="margin:0 0 6px">Career record</div>
        <div style="display:flex;align-items:baseline;gap:12px">
          <div style="font-family:var(--disp);font-size:38px;font-weight:700">${c.careerW||0}–${c.careerL||0}</div>
          <div style="font-size:20px;font-weight:700;color:${winRateColour}">${winRate}%</div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">${c.prems||0} prem${(c.prems||0)===1?'':'s'} · ${seasonRecord} this season</div>
      </div>
    </div>
    ${boardObjectives}
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
