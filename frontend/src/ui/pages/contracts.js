'use strict';

/* Contracts — players coming off contract this season */
Object.assign(UI, {
  _conPos: 'all',
  _conAge: 'all',
  _conOvr: 'all',
  _conPot: 'all',
  _conIntent: 'all',
  _conYear: 'all',
  _conSalary: 'all',
  _conSort: 'ovr',
  p_contracts(){
    const t = myTeam();
    const ageOk = p => UI._conAge==='all' || (UI._conAge==='u21' ? p.age<=21 : UI._conAge==='22-26' ? p.age>=22&&p.age<=26 : UI._conAge==='27-30' ? p.age>=27&&p.age<=30 : p.age>=31);
    const rangeOk = (v, key) => key==='all' || (key==='60' ? v>=60 : key==='70' ? v>=70 : key==='80' ? v>=80 : v<60);
    const statVal = p => ({
      ovr:p.ovr, pot:scoutedPotential(p).mid, age:-p.age, ageOld:p.age, demand:-demandFor(p, t),
      current:currentSalary(p), avg:contractAvg(p), total:contractTotal(p), years:p.years || 0,
      runs:p.s.runs||0, tries:p.s.t||0, tackles:p.s.tk||0, fantasy:p.s.fpts||0,
      form:formText(p),
      goal:p.attrs.placeKick||0, kicking:((p.attrs.kickPower||0)+(p.attrs.kickAccuracy||0))/2,
      speed:p.attrs.speed||0, playmaking:p.attrs.playmaking||0, defence:((p.attrs.tackling||0)+(p.attrs.defRead||0))/2
    }[UI._conSort] ?? p.ovr);
    const intentOk = p => {
      const intent = contractIntent(p, t);
      if(UI._conIntent === 'all') return true;
      if(UI._conIntent === 'final') return p.years <= 1;
      if(UI._conIntent === 'early') return p.years > 1 && intent.open;
      if(UI._conIntent === 'risk') return ['test_market','wants_out','undecided'].includes(intent.key);
      return p.years <= 1 || intent.open;
    };
    const yearOk = p => UI._conYear==='all' || (UI._conYear==='0' ? (p.years||0)<=0 : UI._conYear==='1' ? p.years===1 : UI._conYear==='2' ? p.years===2 : UI._conYear==='3' ? p.years===3 : p.years>=4);
    const salaryOk = p => {
      const s = currentSalary(p);
      return UI._conSalary==='all' || (UI._conSalary==='under200' ? s<200000 : UI._conSalary==='200-500' ? s>=200000&&s<500000 : UI._conSalary==='500-900' ? s>=500000&&s<900000 : UI._conSalary==='900+' ? s>=900000 : true);
    };
    const players = t.players.map(id=>G.players[id])
      .filter(p=>p && intentOk(p) && yearOk(p) && salaryOk(p))
      .filter(p=>(UI._conPos==='all'||p.pos===UI._conPos||p.pos2===UI._conPos) && ageOk(p) && rangeOk(p.ovr, UI._conOvr) && rangeOk(scoutedPotential(p).mid, UI._conPot))
      .sort((a,b)=>statVal(b)-statVal(a));
    const totalSal = teamSalary(t);
    const futureRows = [0,1,2,3,4].map(i=>{
      const cap = t.players.reduce((s,id)=>{
        const p = G.players[id];
        if(!salaryCountsForCap(p)) return s;
        if(!p || !p.contractSchedule || !p.contractSchedule[i]) return s;
        return s + p.contractSchedule[i];
      }, 0);
      return cap ? `<span style="font-size:11px;color:var(--muted)">Y${i+1}: <b>${money(cap)}</b></span>` : '';
    }).filter(Boolean).join(' · ');
    const select = (prop, opts) => `<select style="max-width:170px" onchange="UI.${prop}=this.value;UI.render()">${opts.map(([v,l])=>`<option value="${v}" ${UI[prop]===v?'selected':''}>${l}</option>`).join('')}</select>`;
    const posFilters = ['all','FB','WG','CE','FE','HB','PR','HK','SR','LK'].map(pos=>
      `<button class="btn sm ${UI._conPos===pos?'primary':''}" onclick="UI._conPos='${pos}';UI.render()">${pos==='all'?'All':pos}</button>`
    ).join('');
    return `<h1 class="page">Contracts</h1>
    <p class="page-sub">Full squad contract ledger. Current payroll ${money(totalSal)} of ${money(G.config.cap)} cap.${futureRows?`<br>${futureRows}`:''}</p>
    <h2 class="sec">Contract ledger</h2>
    <div class="btnrow">${posFilters}</div>
    <div class="btnrow" style="align-items:center;flex-wrap:wrap">
      ${select('_conAge', [['all','All ages'],['u21','21 and under'],['22-26','22-26'],['27-30','27-30'],['31+','31+']])}
      ${select('_conOvr', [['all','Any OVR'],['60','OVR 60+'],['70','OVR 70+'],['80','OVR 80+'],['under60','Under 60']])}
      ${select('_conPot', [['all','Any potential'],['60','POT 60+'],['70','POT 70+'],['80','POT 80+'],['under60','POT under 60']])}
      ${select('_conIntent', [['all','All players'],['open','Open/final-year'],['early','Early extensions'],['final','Final year only'],['risk','At risk']])}
      ${select('_conYear', [['all','Any years left'],['0','Off contract'],['1','1 year'],['2','2 years'],['3','3 years'],['4+','4+ years']])}
      ${select('_conSalary', [['all','Any salary'],['under200','Under $200k'],['200-500','$200k-$500k'],['500-900','$500k-$900k'],['900+','$900k+']])}
      ${select('_conSort', [['ovr','Sort: OVR'],['current','Sort: current salary'],['avg','Sort: avg salary'],['total','Sort: total value'],['years','Sort: years left'],['pot','Sort: potential'],['age','Sort: youngest'],['ageOld','Sort: oldest'],['demand','Sort: cheapest demand'],['form','Sort: form'],['runs','Sort: runs'],['tries','Sort: tries'],['tackles','Sort: tackles'],['fantasy','Sort: fantasy'],['goal','Sort: goal kicking'],['kicking','Sort: general kicking'],['speed','Sort: speed'],['playmaking','Sort: playmaking'],['defence','Sort: defence']])}
      <button class="btn sm" onclick="UI.resetContractFilters()">Reset Filters</button>
    </div>
    <div class="card" style="padding:6px;overflow-x:auto"><table><thead><tr><th class="noclick">Player</th><th class="noclick num">Age</th><th class="noclick num">OVR</th><th class="noclick num">Current</th><th class="noclick num">Avg</th><th class="noclick num">Total</th><th class="noclick num">Yrs</th><th class="noclick">Structure</th><th class="noclick">Intent</th><th class="noclick"></th></tr></thead><tbody>
    ${players.map(p=>{
      const intent=contractIntent(p,t);
      const sched=(p.contractSchedule&&p.contractSchedule.length?p.contractSchedule:Array(Math.max(0,p.years||0)).fill(p.salary||0));
      const schedText=sched.length?sched.map((v,i)=>`Y${i+1} ${money(v)}`).join(' · '):'Off contract';
      return `<tr class="click" onclick="UI.playerModal(${p.id})">
        <td><b>${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span>${p.releaseRequest?` <span class="inj">Release requested</span>`:''}
          <br><span style="color:var(--muted);font-size:11px">${esc(promiseSummary(p))} · Loyalty ${p.loyalty} · Form ${formText(p)}</span></td>
        <td class="num">${p.age}</td>
        <td class="num"><span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span>${(()=>{const g=(p.seasonStartOvr!=null)?p.ovr-p.seasonStartOvr:0;return g>0?`<span style="color:var(--green);font-size:10px"> +${g}</span>`:g<0?`<span style="color:var(--red);font-size:10px"> ${g}</span>`:''})()}</td>
        <td class="num">${money(currentSalary(p))}</td>
        <td class="num">${money(contractAvg(p))}</td>
        <td class="num">${money(contractTotal(p))}</td>
        <td class="num">${p.years||0}</td>
        <td><b>${contractTypeLabel(p.contractType)}</b><br><span style="color:var(--muted);font-size:10px">${schedText}</span></td>
        <td><span style="color:${intent.open?'var(--green)':intent.key==='wants_out'||intent.key==='test_market'?'var(--red)':'var(--muted)'};font-size:11px">${esc(intent.label)}</span></td>
        <td><button class="btn sm primary" onclick="event.stopPropagation();UI.manageContractModal(${p.id})">Negotiate</button></td>
      </tr>`;
    }).join('')||'<tr><td colspan="10" style="color:var(--muted)">No players match those contract filters.</td></tr>'}
    </tbody></table></div>`;
  },
  resetContractFilters(){
    UI._conPos='all'; UI._conAge='all'; UI._conOvr='all'; UI._conPot='all';
    UI._conIntent='all'; UI._conYear='all'; UI._conSalary='all'; UI._conSort='ovr';
    UI.render();
  },
  contractOfferModal(id){
    const p = G.players[id]; if(!p) return;
    const t = myTeam();
    const intent = contractIntent(p, t);
    if(p.years > 1 && !intent.open){ UI.toast(`${p.name}: ${intent.label}. ${intent.reason}`); return; }
    const demand = demandFor(p, t);  // computed ONCE — demand stays stable for this negotiation
    const defaultYears = p.years > 1 ? Math.min(5, p.years + 2) : (p.age<=26?3:2);
    const promises = normalisePromises(p.promises);
    promises.contractType = p.contractType || 'flat';
    UI._contractOffer = {pid:id, salary:demand, years:defaultYears, promises, demand};
    UI.renderContractOffer();
  },
  renderContractOffer(){
    const o = UI._contractOffer, p = G.players[o.pid], t = myTeam();
    const chance = contractSignChance(p, o.salary, o.years, t, o.promises, o.demand);
    const schedule = contractScheduleFor(o.salary, o.years, o.promises.contractType);
    const firstYear = schedule[0] || o.salary;
    const existingSal = salaryCountsForCap(p) ? currentSalary(p) : 0;
    const afterCap = G.config.cap - teamSalary(t) + existingSal - firstYear;
    const pct = Math.round(chance.prob*100);
    const setRole = role => { o.promises.role = role; UI.renderContractOffer(); };
    const promiseBtn = (role,label) => `<button class="btn sm ${o.promises.role===role?'primary':''}" onclick="UI._contractOffer.promises.role='${role}';UI.renderContractOffer()">${label}</button>`;
    const typeBtn = (type,label) => `<button class="btn sm ${o.promises.contractType===type?'primary':''}" onclick="UI._contractOffer.promises.contractType='${type}';UI.renderContractOffer()">${label}</button>`;
    const intent = contractIntent(p, t);
    UI.modal(`<h3>Negotiate With ${esc(p.name)}</h3>
      <p class="page-sub">${p.pos}/${p.pos2} · ${p.age}yo · OVR ${p.ovr} · ${intent.label} · ${p.years} yr${p.years===1?'':'s'} left · Demand ${money(chance.demand)} avg/yr</p>
      <div class="field"><label>Average salary offer</label><div class="btnrow" style="align-items:center;margin:0">
        <button class="btn sm" onclick="UI._contractOffer.salary=Math.max(85000,UI._contractOffer.salary-25000);UI.renderContractOffer()">-25k</button>
        <span style="font-family:var(--disp);font-size:26px;font-weight:700;min-width:120px;text-align:center">${money(o.salary)}</span>
        <button class="btn sm" onclick="UI._contractOffer.salary+=25000;UI.renderContractOffer()">+25k</button>
      </div></div>
      <div class="field"><label>Years</label><div class="radio-row">${[1,2,3,4,5].map(y=>`<div class="opt ${o.years===y?'sel':''}" onclick="UI._contractOffer.years=${y};UI.renderContractOffer()">${y} year${y>1?'s':''}</div>`).join('')}</div></div>
      <div class="field"><label>Contract structure</label>
        <div class="btnrow" style="margin:0">${typeBtn('flat','Flat')}${typeBtn('front','Front-loaded')}${typeBtn('back','Back-loaded')}</div>
        <p style="color:var(--muted);font-size:11px;margin:6px 0 0">${schedule.map((v,i)=>`Y${i+1}: ${money(v)}`).join(' · ')}</p>
      </div>
      <div class="field"><label>Role promise</label>
        <div class="btnrow" style="margin:0">${promiseBtn('none','No role')}${promiseBtn('bench','Bench')}${promiseBtn('starter','Starter')}${promiseBtn('superstar','Superstar')}</div>
        ${o.promises.role==='bench' && p.ovr>=68 ? `<p style="color:var(--red);font-size:11px;margin:4px 0 0">⚠ Bench role reduces signing chance — this player considers themselves a starter.</p>` : ''}
      </div>
      <div class="field"><label>Additional promises</label>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
          <label style="display:flex;gap:8px;align-items:flex-start;color:var(--muted);font-size:13px">
            <input type="checkbox" ${o.promises.captain?'checked':''} onchange="UI._contractOffer.promises.captain=this.checked;UI.renderContractOffer()" style="margin-top:2px">
            <span><b>Captaincy</b> <span style="font-size:11px">— Appoint as captain (breach if captain changes). <span style="color:var(--green)">+signing chance</span></span></span>
          </label>
          <label style="display:flex;gap:8px;align-items:flex-start;color:var(--muted);font-size:13px">
            <input type="checkbox" ${o.promises.minutes?'checked':''} onchange="UI._contractOffer.promises.minutes=this.checked;UI.renderContractOffer()" style="margin-top:2px">
            <span><b>Guaranteed game time</b> <span style="font-size:11px">— Appear in ≥55% of games (breach checked after Rd 8). <span style="color:var(--green)">+signing chance</span></span></span>
          </label>
          <label style="display:flex;gap:8px;align-items:flex-start;color:var(--muted);font-size:13px">
            <input type="checkbox" ${o.promises.finals?'checked':''} onchange="UI._contractOffer.promises.finals=this.checked;UI.renderContractOffer()" style="margin-top:2px">
            <span><b>Finals selection</b> <span style="font-size:11px">— Selected if team qualifies for finals. <span style="${p.age>=30?'color:var(--green)':'color:var(--muted)'}">+${p.age>=30?'strong ':''}signing chance${p.age>=30?' (veteran)':''}</span></span></span>
          </label>
          ${p.age<=24 ? `<label style="display:flex;gap:8px;align-items:flex-start;color:var(--muted);font-size:13px">
            <input type="checkbox" ${o.promises.pathway?'checked':''} onchange="UI._contractOffer.promises.pathway=this.checked;UI.renderContractOffer()" style="margin-top:2px">
            <span><b>Development pathway</b> <span style="font-size:11px">— Regular game time as part of a dev plan (≥35% appearances). <span style="color:var(--green)">+signing chance for young players</span></span></span>
          </label>` : ''}
        </div>
      </div>
      <div class="sign-meter"><i style="width:${pct}%"></i></div>
      <p style="color:var(--muted);font-size:12px">Estimated signing chance: <b style="color:${pct>=70?'var(--green)':pct<40?'var(--red)':'var(--brass)'}">${pct}%</b> · first-year cap hit ${money(firstYear)} · cap after deal: ${money(afterCap)}</p>
      <div class="btnrow"><button class="btn primary" onclick="UI.submitContractOffer()">Submit offer</button><button class="btn" onclick="UI.closeModal()">Cancel</button></div>`);
  },
  submitContractOffer(){
    const o = UI._contractOffer, p = G.players[o.pid], t = myTeam();
    const firstYear = contractScheduleFor(o.salary, o.years, o.promises.contractType)[0] || o.salary;
    const existingSal = salaryCountsForCap(p) ? currentSalary(p) : 0;
    const addingToMain = !salaryCountsForCap(p);
    if(addingToMain && squadCount(t, 'top') >= TOP_SQUAD_CAP){ UI.toast(`Main squad is full (${TOP_SQUAD_CAP} max).`); return; }
    if(teamSalary(t) - existingSal + firstYear > G.config.cap){ UI.toast('That re-signing would exceed the cap.'); return; }
    const res = offerContract(p, o.salary, o.years, t, o.promises, o.demand);
    if(res.ok){
      p.squad = 'top';
      p.everTopSquad = true;
      p.trialGames = undefined;
      p.trialBreakout = false;
      UI.toast(`${p.name} re-signed on a ${contractTypeLabel(p.contractType).toLowerCase()} deal.`);
      addNews(`${p.name} re-signs with the ${t.nick} on a ${contractTypeLabel(p.contractType).toLowerCase()} deal averaging ${money(contractAvg(p))}. Promises: ${promiseSummary(p)}.`, {title:'Contract Extension', type:'contract', tone:'good', playerId:p.id, teamId:t.id, tag:'Contracts'});
      UI.render();
      UI.showSigningCeremony(p, {
        team:t,
        kind:'Contract Extension',
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
      UI.renderContractOffer();
    }
  },
  manageContractModal(id){
    const p = G.players[id]; if(!p) return;
    const t = myTeam();
    const intent = contractIntent(p, t);
    const sched = (p.contractSchedule && p.contractSchedule.length)
      ? p.contractSchedule
      : Array(Math.max(0, p.years || 0)).fill(p.salary || 0);
    const isFree = !!p.releaseRequest;
    const payoutYears = Math.max(0, (p.years || 0) - 1);
    const payout = isFree ? 0 : payoutYears * (p.salary || 0);
    const capAfterRelease = G.config.cap - teamSalary(t) + (salaryCountsForCap(p) ? currentSalary(p) : 0);
    const demand = demandFor(p, t);

    const payoutSection = isFree
      ? `<div style="background:rgba(60,180,80,.1);border:1px solid var(--green);border-radius:6px;padding:10px;margin:10px 0">
           <b style="color:var(--green);font-size:12px">Player has requested release — no payout required</b>
         </div>`
      : payout > 0
        ? `<div style="background:rgba(200,50,50,.08);border:1px solid var(--red);border-radius:6px;padding:10px;margin:10px 0">
             <b style="font-size:13px">Release payout: ${money(payout)}</b>
             <p style="color:var(--muted);font-size:11px;margin:4px 0 0">${payoutYears} year${payoutYears===1?'':'s'} remaining after this season × ${money(p.salary||0)} cap hit · Cap room after release: ${money(capAfterRelease)}</p>
           </div>`
        : `<div style="background:rgba(100,100,100,.08);border:1px solid var(--line);border-radius:6px;padding:10px;margin:10px 0">
             <b style="font-size:13px;color:var(--muted)">No payout</b>
             <p style="color:var(--muted);font-size:11px;margin:4px 0 0">Contract expires at the end of this season.</p>
           </div>`;

    const releaseLabel = isFree ? 'Release (free)' : payout > 0 ? `Release (${money(payout)} payout)` : 'Release player';

    UI.modal(`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:12px">
        <div>
          <h3 style="margin:0 0 2px">${esc(p.name)}</h3>
          <p style="margin:0;color:var(--muted);font-size:12px">${p.pos}${p.pos2?'/'+p.pos2:''} · ${p.age}yo · <span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span> OVR · ${esc(nationalityFlag(p.nationality))} ${esc(p.nationality)}</p>
        </div>
        <button class="btn sm" onclick="UI.closeModal();UI.playerModal(${p.id})">View profile</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
        <div class="card" style="padding:8px">
          <div style="font-size:10px;color:var(--muted)">This season</div>
          <div style="font-size:18px;font-weight:700;font-family:var(--disp)">${money(currentSalary(p))}</div>
          <div style="font-size:11px;color:var(--muted)">${contractTypeLabel(p.contractType)}</div>
        </div>
        <div class="card" style="padding:8px">
          <div style="font-size:10px;color:var(--muted)">Avg / yr</div>
          <div style="font-size:18px;font-weight:700;font-family:var(--disp)">${money(contractAvg(p))}</div>
          <div style="font-size:11px;color:var(--muted)">${p.years||0} yr${(p.years||0)===1?'':'s'} remaining</div>
        </div>
        <div class="card" style="padding:8px">
          <div style="font-size:10px;color:var(--muted)">Total value</div>
          <div style="font-size:18px;font-weight:700;font-family:var(--disp)">${money(contractTotal(p))}</div>
          <div style="font-size:11px;color:var(--muted)">Market demand ${money(demand)}</div>
        </div>
      </div>

      ${sched.length > 1 ? `<div style="margin-bottom:10px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Schedule</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${sched.map((v,i)=>`<span style="font-size:12px;background:var(--card2);padding:3px 8px;border-radius:4px">Y${i+1} <b>${money(v)}</b></span>`).join('')}
        </div>
      </div>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px;font-size:12px">
        <div><span style="color:var(--muted)">Intent</span> <b style="color:${intent.open?'var(--green)':intent.key==='wants_out'||intent.key==='test_market'?'var(--red)':'var(--ink)'}">${esc(intent.label)}</b></div>
        <div><span style="color:var(--muted)">Form</span> <b>${formText(p)}</b></div>
        <div><span style="color:var(--muted)">Loyalty</span> <b>${p.loyalty}</b></div>
        <div><span style="color:var(--muted)">Morale</span> <b>${p.morale}</b></div>
        ${p.personality ? `<div style="grid-column:1/-1"><span style="color:var(--muted)">Personality</span> <b>${{'money':'Money-Driven','winner':'Win-Hungry','loyal':'Club Loyalist','ambitious':'Prestige-Seeker','homesick':'Homesick','balanced':'Balanced'}[p.personality]||p.personality}</b></div>` : ''}
      </div>
      ${intent.reason ? `<p style="font-size:11px;color:var(--dim);margin:4px 0 8px;font-style:italic">"${esc(intent.reason)}"</p>` : ''}
      ${promiseSummary(p) !== 'No promises' ? `<p style="font-size:11px;color:var(--brass);margin:0 0 8px">Promises: ${esc(promiseSummary(p))}</p>` : ''}

      ${payoutSection}

      <div class="btnrow" style="margin-top:12px">
        ${intent.open || (p.years||0) <= 1
          ? `<button class="btn primary" onclick="UI.closeModal();UI.contractOfferModal(${p.id})">Negotiate contract</button>`
          : `<span style="font-size:12px;color:var(--dim);padding:6px 0" title="${esc(intent.reason)}">Not open to talks</span>`}
        <button class="btn" style="color:var(--red)" onclick="UI._confirmCutPlayer(${id}, ${payout})">${releaseLabel}</button>
        <button class="btn" onclick="UI.closeModal()">Close</button>
      </div>`);
  },
  _confirmCutPlayer(id, payout){
    const p = G.players[id]; if(!p) return;
    const t = myTeam();
    if(payout > 0){
      G.club.funds = (G.club.funds || 0) - payout;
      addNews(`${esc(p.name)} released mid-contract. Club pays ${money(payout)} payout.`, {title:'Contract Payout', type:'finance', tone:'bad', playerId:p.id, teamId:t.id, tag:'Contracts'});
    }
    releasePlayer(t, id);
    UI.closeModal();
    UI.toast(payout > 0 ? `${p.name} released. ${money(payout)} deducted from club funds.` : `${p.name} released.`);
    UI.render();
  },
  reSignCurrent(id){
    const p = G.players[id]; if(!p) return;
    const t = myTeam();
    const demand = demandFor(p, t);
    const existingSal = salaryCountsForCap(p) ? currentSalary(p) : 0;
    if(!salaryCountsForCap(p) && squadCount(t, 'top') >= TOP_SQUAD_CAP){ UI.toast(`Main squad is full (${TOP_SQUAD_CAP} max).`); return; }
    if(teamSalary(t) - existingSal + demand > G.config.cap){ UI.toast('That re-signing would exceed the cap.'); return; }
    setPlayerContract(p, demand, p.age<=26 ? 3 : 2, 'flat');
    p.squad = 'top';
    p.everTopSquad = true;
    p.trialGames = undefined;
    p.trialBreakout = false;
    UI.toast(`${p.name} re-signed for ${money(demand)}.`);
    addNews(`${p.name} re-signs with the ${t.nick}.`, {title:'Contract Extension', type:'contract', tone:'good', playerId:p.id, teamId:t.id, tag:'Contracts'});
    UI.render();
    UI.showSigningCeremony(p, {
      team:t,
      kind:'Contract Extension',
      salary:contractAvg(p),
      years:p.years || (p.age<=26 ? 3 : 2),
      total:contractTotal(p),
      structure:contractTypeLabel(p.contractType),
      role:'No promises',
      nextPage:'contracts',
      nextLabel:'View contracts'
    });
  }
});
