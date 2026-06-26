'use strict';

/* Club Management — finances, board, and club overview */
Object.assign(UI, {

  p_clubManagement(){
    const club = G.club || (G.club = {funds:1500000, seasonRevenue:0, seasonWages:0});
    ensureClubFacilities();
    const t = myTeam();
    const lad = ladder();
    const pos = lad.findIndex(r=>r.id===t.id)+1;
    const rec = lad.find(r=>r.id===t.id)||{w:0,l:0,pts:0};

    const cap = G.config ? G.config.cap : 9500000;
    const payroll = teamSalary(t);
    const capUsed = payroll / cap;
    const capRoom = cap - payroll;

    const staffWages = (G.staff||[]).reduce((s,x)=>s+(x.salary||0),0);
    const scoutWages = ((G.scouting&&G.scouting.scouts)||[]).reduce((s,x)=>s+(x.salary||0),0);
    const allNonPlayerWages = staffWages + scoutWages;

    // Board expectation
    const conf = G.coach ? G.coach.conf : 50;
    const totalTeams = G.teams.length;
    const expectedPos = G.coach && G.coach.boardTarget ? G.coach.boardTarget : Math.ceil(totalTeams * 0.5);
    const onTrack = pos <= expectedPos;
    const boardStatus = conf >= 70 ? {label:'Happy', cls:'good'} : conf >= 40 ? {label:'Satisfied', cls:''} : conf >= 20 ? {label:'Concerned', cls:'bad'} : {label:'Critical', cls:'bad'};

    // Facility board expectations
    const prestige = typeof clubPrestigeTier === 'function' ? clubPrestigeTier(t) : {key:'solid'};
    const facilityKeys = Object.keys(FACILITY_DEFS);
    const facilityAvg = facilityKeys.reduce((s,k)=>s+facilityLevel(k),0) / facilityKeys.length;
    const facExpectMin = prestige.key==='dynasty'||prestige.key==='elite' ? 3.5
      : prestige.key==='strong' ? 2.5
      : prestige.key==='solid' ? 2.0
      : 1.5;
    const facExpectLabel = prestige.key==='dynasty'||prestige.key==='elite' ? 'Elite (avg Lv 4+)'
      : prestige.key==='strong' ? 'Professional (avg Lv 3+)'
      : prestige.key==='solid' ? 'Solid (avg Lv 2+)'
      : 'Basic (avg Lv 2)';
    const facOnTrack = facilityAvg >= facExpectMin;
    const facShortfall = facilityKeys.filter(k=>facilityLevel(k)<Math.ceil(facExpectMin));

    // Season progress estimate (how many rounds played)
    const totalRounds = G.fixtures ? G.fixtures.length : 24;
    const roundsDone = Math.max(0, G.round);
    const seasonProgress = Math.min(1, roundsDone / Math.max(1, totalRounds));
    const projectedRevenue = seasonProgress > 0
      ? Math.round(club.seasonRevenue / seasonProgress)
      : club.seasonRevenue;
    const projectedWages = seasonProgress > 0
      ? Math.round(club.seasonWages / seasonProgress)
      : club.seasonWages;
    const projectedNet = projectedRevenue - projectedWages;

    // Cap bar colour
    const capCls = capUsed > 0.95 ? 'var(--red)' : capUsed > 0.8 ? 'var(--brass)' : 'var(--green)';

    // Funds tone
    const fundsTone = club.funds < 0 ? 'var(--red)' : club.funds > 3000000 ? 'var(--green)' : club.funds > 1000000 ? 'var(--brass)' : 'var(--ink)';

    // Revenue breakdown rows
    const totalGate = club.gateRevenue === undefined ? Math.round(club.seasonRevenue * 0.27) : club.gateRevenue;
    const totalBcast = club.broadcastRevenue === undefined ? club.seasonRevenue - totalGate : club.broadcastRevenue;
    const totalMembers = club.membershipRevenue || 0;
    const totalSponsors = club.sponsorshipRevenue || 0;
    const totalVendors = club.vendorRevenue || 0;
    const totalMagic = club.magicRoundRevenue || 0;
    const membershipPrice = club.membershipPrice == null ? 160 : club.membershipPrice;
    const membership = typeof membershipProjection === 'function' ? membershipProjection(membershipPrice) : {price:membershipPrice, members:0, revenue:0};
    const leaguePrices = typeof leagueClubPrices === 'function' ? leagueClubPrices() : null;
    const priceCompare = (info) => {
      if(!info) return '';
      const diff = info.mine - info.avg;
      const tone = diff > 0 ? 'var(--brass)' : diff < 0 ? 'var(--green)' : 'var(--muted)';
      const dearest = info.total - info.rankFromCheapest + 1; // 1 = most expensive
      const verdict = diff === 0 ? 'at league average'
        : `${money(Math.abs(diff))} ${diff > 0 ? 'above' : 'below'} avg`;
      return `<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--muted);margin-top:5px">
        <span>Avg <b style="color:var(--ink)">${money(info.avg)}</b></span>
        <span>Low <b style="color:var(--ink)">${money(info.min)}</b></span>
        <span>High <b style="color:var(--ink)">${money(info.max)}</b></span>
        <span style="color:${tone}">${verdict} · ${ord(dearest)} dearest of ${info.total}</span>
      </div>`;
    };
    const currentHomeMatch = G.phase==='regular' && G.fixtures && G.fixtures[G.round]
      ? G.fixtures[G.round].find(m => m.h === G.coach.teamId && !m.played)
      : null;
    const projectedCrowd = currentHomeMatch
      ? (currentHomeMatch.projCrowd || matchCrowd(G.teams[currentHomeMatch.h], false))
      : null;

    // Vendor card builder
    const vendorCard = (key, label, desc) => {
      const vendors = club.vendors || {fb:1, merch:1};
      const lvl = vendors[key] || 1;
      const costs = key==='fb' ? VENDOR_FB_COSTS : VENDOR_MERCH_COSTS;
      const revs  = key==='fb' ? VENDOR_FB_REV   : VENDOR_MERCH_REV;
      const cost = lvl < 5 ? costs[lvl] : 0;
      const perHead = revs[lvl] || 0;
      return `<div class="facility-row">
        <div style="min-width:0;flex:1">
          <b>${label}</b>
          <div class="facility-bar">${Array.from({length:5}, (_,i)=>`<i class="${i<lvl?'on':''}"></i>`).join('')}</div>
          <p style="color:var(--muted);font-size:11px;margin:3px 0 0">${desc} · Level ${lvl}/5 · ${money(perHead)}/head per home match</p>
        </div>
        <button class="btn sm${lvl<5?' primary':''}" onclick="${lvl<5?`UI.upgradeVendor('${key}')`:''}" ${!cost?'disabled':''}>
          ${cost ? `Upgrade ${money(cost)}` : 'Maxed'}
        </button>
      </div>`;
    };

    // Magic round display info
    const mrHostTeam = G.magicRound ? G.teams.find(t=>t.id===G.magicRound.hostTeamId) : null;
    const mrIsHost = G.magicRound && G.magicRound.hostTeamId === G.coach.teamId;
    const magicRoundInfo = G.magicRound
      ? (mrIsHost
          ? `<div style="margin-top:10px;padding:8px 12px;background:rgba(210,165,62,.12);border:1px solid rgba(210,165,62,.4);border-radius:6px;font-size:12px">
              <b style="color:var(--brass)">Magic Round Host</b> — ${esc(G.magicRound.venue)} · Round ${G.magicRound.round+1} · Hosting windfall: <b>${money(1500000)}</b>
             </div>`
          : `<div style="margin-top:10px;padding:8px 12px;background:var(--card2);border-radius:6px;font-size:12px;color:var(--muted)">
              Magic Round — hosted by <b>${esc(mrHostTeam?mrHostTeam.nick:'?')}</b> in Round ${G.magicRound.round+1} · ${esc(G.magicRound.venue)}
             </div>`)
      : '';

    const capBar = pct => `<div style="height:8px;background:var(--card2);border-radius:4px;overflow:hidden;margin:6px 0">
      <div style="width:${Math.min(100, Math.round(pct*100))}%;height:100%;background:${capCls}"></div></div>`;

    const fundBar = `<div style="height:8px;background:var(--card2);border-radius:4px;overflow:hidden;margin:6px 0">
      <div style="width:${Math.min(100,Math.max(0,Math.round(club.funds/5000000*100)))}%;height:100%;background:var(--brass)"></div></div>`;
    const commercialControls = `<div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px">
        <div>
          <h2 class="sec" style="margin:0 0 4px">Commercial Settings</h2>
          <p class="page-sub" style="margin:0">Currency is display-only; club economics keep the same underlying values.</p>
        </div>
        <div class="field" style="min-width:160px;margin:0">
          <label>Currency</label>
          <select onchange="UI.setCurrency(this.value)">
            <option value="AUD" ${(club.currency||'AUD')==='AUD'?'selected':''}>AUD</option>
            <option value="GBP" ${club.currency==='GBP'?'selected':''}>Pounds</option>
          </select>
        </div>
      </div>
      <div class="grid2">
        <div class="field">
          <label>Home ticket price</label>
          <input type="number" min="10" max="120" step="1" value="${club.ticketPrice || 28}" oninput="UI.setClubTicketPrice(this.value, true)" onchange="UI.setClubTicketPrice(this.value)">
          <p style="font-size:11px;color:var(--muted);margin:4px 0 0">${projectedCrowd ? `Next home gate estimate: ${money(projectedCrowd * (club.ticketPrice || 28))} · crowd ${projectedCrowd.toLocaleString()}` : 'Used for projected home crowds and gate receipts.'}</p>
          ${leaguePrices ? priceCompare(leaguePrices.ticket) : ''}
        </div>
        <div class="field">
          <label>Season member price</label>
          <input type="number" min="80" max="500" step="1" value="${membership.price}" oninput="UI.setClubMembershipPrice(this.value, true)" onchange="UI.setClubMembershipPrice(this.value)">
          <p id="clubMembershipProjection" style="font-size:11px;color:var(--muted);margin:4px 0 0">Projected members ${membership.members.toLocaleString()} · revenue ${money(membership.revenue)}</p>
          ${leaguePrices ? priceCompare(leaguePrices.membership) : ''}
        </div>
      </div>
    </div>`;
    const godControls = G.godMode ? `<div class="card" style="margin-bottom:16px;border-color:rgba(200,90,79,.55)">
      <div class="god-badge" style="display:inline-flex;margin-bottom:10px">God Mode</div>
      <div class="grid2">
        <div class="field"><label>Club funds</label><input type="number" step="50000" value="${club.funds}" onchange="UI.setGodFunds(this.value)"></div>
        <div class="field"><label>Board confidence</label><input type="number" min="0" max="100" value="${Math.round(G.coach.conf)}" onchange="UI.setGodBoardConfidence(this.value)"></div>
      </div>
    </div>` : '';

    const statCard = (label, val, sub='', tone='') =>
      `<div class="card" style="padding:10px 16px;flex:1;min-width:140px">
        <span style="font-size:11px;color:var(--muted)">${label}</span>
        <div style="font-size:22px;font-weight:700;font-family:var(--disp);color:${tone||'inherit'}">${val}</div>
        ${sub ? `<div style="font-size:11px;color:var(--muted)">${sub}</div>` : ''}
      </div>`;
    const facilities = ensureClubFacilities();
    const prest = facilityPrestige();
    const facilityCard = key => {
      const def = FACILITY_DEFS[key];
      const lvl = facilityLevel(key);
      const cost = facilityUpgradeCost(key);
      const underConst = typeof facilityUnderConstruction === 'function' && facilityUnderConstruction(key);
      const constInfo = underConst && G.club.construction && G.club.construction[key];
      const weeksLeft = constInfo ? Math.max(0, constInfo.completesRound - G.round) : 0;
      const totalWeeks = constInfo ? (constInfo.completesRound - constInfo.startsRound) : 1;
      const pct = constInfo ? Math.round(100 * (1 - weeksLeft / totalWeeks)) : 0;
      const capLine = key === 'stadium'
        ? ` · capacity ${stadiumCapacity().toLocaleString()}${underConst?' (reduced during works)':''}`
        : '';
      const constBadge = underConst
        ? `<span class="pos-tag" style="background:rgba(210,165,62,.18);color:var(--brass)">🔨 Building Lv${constInfo.targetLevel} — ${weeksLeft}w left</span>`
        : '';
      const progressBar = underConst
        ? `<div style="height:4px;background:var(--line);border-radius:2px;margin:4px 0;overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--brass);border-radius:2px;transition:width .3s"></div></div>`
        : `<div class="facility-bar">${Array.from({length:FACILITY_MAX}, (_,i)=>`<i class="${i<lvl?'on':''}"></i>`).join('')}</div>`;
      return `<div class="facility-row">
        <div style="min-width:0;flex:1">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
            <b>${esc(def.label)}</b>
            <div style="display:flex;gap:6px;align-items:center">
              <span class="pos-tag">Level ${lvl}/${FACILITY_MAX}</span>${constBadge}
            </div>
          </div>
          ${progressBar}
          <p style="color:var(--muted);font-size:11px;margin:3px 0 0">${esc(def.desc)}${capLine}</p>
        </div>
        <button class="btn sm ${underConst?'':'primary'}" onclick="${underConst?'':'UI.upgradeFacility(\''+key+'\')'}"
          ${!cost||underConst?'disabled':''}>
          ${underConst?'Under construction':cost?`Upgrade ${money(cost)}`:'Maxed'}
        </button>
      </div>`;
    };

    return `<h1 class="page">Club Management</h1>
    <p class="page-sub">Overview of ${esc(teamName(t))}'s finances, board standing, and season outlook.</p>
    ${godControls}
    ${commercialControls}

    <h2 class="sec">Board Standing</h2>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
        <div style="flex:1;min-width:200px">
          <div style="font-size:13px;color:var(--muted)">Board sentiment</div>
          <div style="font-size:24px;font-weight:700;font-family:var(--disp);color:${boardStatus.cls==='good'?'var(--green)':boardStatus.cls==='bad'?'var(--red)':'var(--ink)'}">${boardStatus.label}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">Confidence: <b>${Math.round(conf)}%</b></div>
          <div style="height:6px;background:var(--card2);border-radius:3px;overflow:hidden;margin:6px 0;max-width:200px">
            <div style="width:${Math.round(conf)}%;height:100%;background:${conf>=70?'var(--green)':conf>=40?'var(--brass)':'var(--red)'}"></div>
          </div>
        </div>
        <div style="flex:1;min-width:200px">
          <div style="font-size:13px;color:var(--muted)">Season progress</div>
          <div style="font-size:14px;margin-top:4px">
            <b style="font-size:18px;font-family:var(--disp)">${ord(pos)}</b> of ${totalTeams}
            <span style="color:var(--muted);margin-left:8px">${rec.w}W–${rec.l}L</span>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">
            Board expects: <b>top ${expectedPos}</b>
            <span style="margin-left:8px;color:${onTrack?'var(--green)':'var(--red)'}">${onTrack ? '✓ On track' : '✗ Off target'}</span>
          </div>
          <div style="font-size:11px;color:var(--dim);margin-top:4px">Round ${roundsDone} of ${totalRounds}</div>
        </div>
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Facility Expectations</div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-size:13px">Standard: <b>${facExpectLabel}</b></span>
          <span style="font-size:13px;color:var(--muted)">Current: <b>${facilityAvg.toFixed(1)} avg</b></span>
          <span style="font-size:12px;font-weight:700;color:${facOnTrack?'var(--green)':'var(--red)'}">${facOnTrack ? '✓ Meets expectations' : '✗ Below standard'}</span>
        </div>
        ${!facOnTrack && facShortfall.length ? `<div style="font-size:11px;color:var(--red);margin-top:4px">Upgrade needed: ${facShortfall.map(k=>FACILITY_DEFS[k].label).join(', ')}</div>` : ''}
      </div>
    </div>

    <h2 class="sec">Club Finances</h2>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      ${statCard('Club Funds', money(club.funds), 'Current balance', fundsTone)}
      ${statCard('Season Revenue', money(club.seasonRevenue), `Projected: ${money(projectedRevenue)}`)}
      ${statCard('Season Wages', money(club.seasonWages), `Projected: ${money(projectedWages)}`)}
      ${statCard('Ticket Price', money(club.ticketPrice || 28), 'Managed below')}
      ${statCard('Member Price', money(membershipPrice), `${membership.members.toLocaleString()} projected`)}
      ${statCard('Projected Net', money(projectedNet), 'End of season estimate', projectedNet>=0?'var(--green)':'var(--red)')}
    </div>
    ${fundBar}
    <p style="font-size:11px;color:var(--muted);margin:-4px 0 16px">Funds bar: ${money(club.funds)} of ${money(5000000)} target</p>

    <h2 class="sec">Facilities</h2>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
        <div>
          <div style="font-size:11px;color:var(--muted)">Facility standard</div>
          <div style="font-family:var(--disp);font-size:24px;font-weight:700;color:${prest.cls==='good'?'var(--green)':prest.cls==='bad'?'var(--red)':'var(--brass)'}">${prest.label}</div>
        </div>
        <p style="color:var(--muted);font-size:12px;margin:0;max-width:480px">Upgrades are paid from club funds. Stadium capacity now caps home crowds and therefore the ceiling for gate receipts.</p>
      </div>
      <div class="facility-grid">${Object.keys(FACILITY_DEFS).map(facilityCard).join('')}</div>
    </div>

    <h2 class="sec">Concessions &amp; Merchandise</h2>
    <div class="card" style="margin-bottom:16px">
      <p style="font-size:12px;color:var(--muted);margin:0 0 10px">Vendor stalls earn revenue per attendee on home match days. Upgrades are instant — no build time.</p>
      <div class="facility-grid">
        ${vendorCard('fb', 'Food &amp; Beverage', 'Kiosk network across the stadium')}
        ${vendorCard('merch', 'Merchandise', 'Club store and match-day stall network')}
      </div>
      ${magicRoundInfo}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="card">
        <div style="font-size:11px;color:var(--brass);font-weight:700;text-transform:uppercase;margin-bottom:8px">Revenue This Season</div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin:5px 0"><span style="color:var(--muted)">Memberships</span><b>${money(totalMembers)}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin:5px 0"><span style="color:var(--muted)">Sponsorship</span><b>${money(totalSponsors)}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin:5px 0"><span style="color:var(--muted)">Gate receipts</span><b>${money(totalGate)}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin:5px 0"><span style="color:var(--muted)">Vendor revenue</span><b>${money(totalVendors)}</b></div>
        ${totalMagic ? `<div style="display:flex;justify-content:space-between;font-size:13px;margin:5px 0"><span style="color:var(--brass)">Magic Round windfall</span><b style="color:var(--brass)">${money(totalMagic)}</b></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:13px;margin:5px 0"><span style="color:var(--muted)">Broadcast share</span><b>${money(totalBcast)}</b></div>
        <div style="border-top:1px solid var(--line);margin:8px 0"></div>
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700"><span>Total</span><span>${money(club.seasonRevenue)}</span></div>
      </div>
      <div class="card">
        <div style="font-size:11px;color:var(--brass);font-weight:700;text-transform:uppercase;margin-bottom:8px">Wages This Season</div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin:5px 0"><span style="color:var(--muted)">Player wages</span><b>${money(Math.max(0,club.seasonWages - Math.round(allNonPlayerWages * (roundsDone/Math.max(1,totalRounds+3))*3))  )}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin:5px 0"><span style="color:var(--muted)">Staff wages</span><b>${money(Math.round(staffWages * (roundsDone/Math.max(1,totalRounds+3))*3))}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin:5px 0"><span style="color:var(--muted)">Scouts</span><b>${money(Math.round(scoutWages * (roundsDone/Math.max(1,totalRounds+3))*3))}</b></div>
        <div style="border-top:1px solid var(--line);margin:8px 0"></div>
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700"><span>Total</span><span>${money(club.seasonWages)}</span></div>
      </div>
    </div>

    <h2 class="sec">Sponsorship</h2>
    <div class="card" style="margin-bottom:16px">
      ${(()=>{
        const activeSponsors = (G.club.sponsorships||[]).filter(s=>s.yearsLeft>0);
        if(!activeSponsors.length) return '<p style="color:var(--muted);font-size:13px;margin:0">No active sponsorship deals. Sign sponsors during preseason.</p>';
        const rows = activeSponsors.map(s=>{
          const catCls = s.category==='major' ? 'var(--brass)' : 'var(--muted)';
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--line);gap:8px">
            <div style="flex:1;min-width:0">
              <span style="font-size:13px;font-weight:600">${esc(s.name)}</span>
              <span class="pos-tag" style="margin-left:6px;font-size:10px;color:${catCls};border-color:${catCls}">${s.category}</span>
            </div>
            <div style="text-align:right;white-space:nowrap">
              <div style="font-size:13px;font-weight:700">${money(s.value)}/yr</div>
              <div style="font-size:11px;color:var(--muted)">${s.yearsLeft} yr${s.yearsLeft===1?'':'s'} remaining</div>
            </div>
          </div>`;
        });
        const total = activeSponsors.reduce((s,x)=>s+(x.value||0),0);
        return rows.join('') + `<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-top:8px"><span>Total sponsor income</span><span>${money(total)}/yr</span></div>`;
      })()}
    </div>

    <h2 class="sec">Salary Cap</h2>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin:5px 0"><span style="color:var(--muted)">Cap limit</span><b>${money(cap)}</b></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin:5px 0"><span style="color:var(--muted)">Player payroll</span><b>${money(payroll)}</b></div>
      ${capBar(capUsed)}
      <div style="display:flex;justify-content:space-between;font-size:13px;margin:5px 0">
        <span style="color:var(--muted)">Cap room remaining</span>
        <b style="color:${capRoom < 200000 ? 'var(--red)' : capRoom < 800000 ? 'var(--brass)' : 'var(--green)'}">${money(capRoom)}</b>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin:5px 0;color:var(--muted)">
        <span>Staff wages (outside cap)</span><span>${money(staffWages + scoutWages)}/yr</span>
      </div>
      ${(()=>{
        // Total outstanding payout liability if all top-squad players were released today
        const playerLiability = t.players.map(id=>G.players[id]).filter(p=>p&&(p.squad==='top'||!p.squad)&&p.years>1).reduce((s,p)=>{
          const py = Math.max(0,(p.years||1)-1);
          return s + py*(p.salary||0);
        }, 0);
        const staffLiability = (G.staff||[]).reduce((s,x)=>{
          const py = Math.max(0,(x.yearsLeft||1)-1);
          return s + py*(x.salary||0);
        }, 0);
        const scoutLiability = ((G.scouting&&G.scouting.scouts)||[]).reduce((s,x)=>{
          const py = Math.max(0,(x.yearsLeft||1)-1);
          return s + py*(x.salary||0);
        }, 0);
        const totalLiability = playerLiability + staffLiability + scoutLiability;
        if(!totalLiability) return '';
        return `<div style="display:flex;justify-content:space-between;font-size:12px;margin:8px 0 0;padding-top:8px;border-top:1px solid var(--line)">
          <span style="color:var(--muted)">Total release liability (if all released today)</span>
          <span style="color:var(--red);font-weight:700">${money(totalLiability)}</span>
        </div>
        <div style="font-size:11px;color:var(--dim);margin:2px 0">Players ${money(playerLiability)} · Staff ${money(staffLiability)} · Scouts ${money(scoutLiability)}</div>`;
      })()}
      <div class="btnrow" style="margin-top:10px">
        <button class="btn sm" onclick="UI.go('contracts')">Manage Contracts</button>
        <button class="btn sm" onclick="UI.go('recruitment')">Recruitment</button>
      </div>
    </div>

    <h2 class="sec">Quick Links</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <button class="btn" onclick="UI.go('staff')">Staff</button>
      <button class="btn" onclick="UI.go('scouting')">Scouting</button>
      <button class="btn" onclick="UI.go('training')">Training</button>
      <button class="btn" onclick="UI.go('squad')">Squad</button>
      <button class="btn" onclick="UI.go('history')">History</button>
    </div>`;
  },

  // Alias for the nav key 'club-management'
  get ['p_club-management'](){
    return UI.p_clubManagement;
  },
  setGodFunds(value){
    if(!G.godMode) return;
    const club = G.club || (G.club = {funds:1500000, seasonRevenue:0, seasonWages:0});
    club.funds = Math.round(+value || 0);
    UI.toast(`Club funds set to ${money(club.funds)}.`);
    UI.render();
  },
  setGodBoardConfidence(value){
    if(!G.godMode) return;
    G.coach.conf = clamp(+value || 0, 0, 100);
    UI.toast(`Board confidence set to ${Math.round(G.coach.conf)}%.`);
    UI.render();
  },
  setCurrency(value){
    if(!G.club) return;
    G.club.currency = value === 'GBP' ? 'GBP' : 'AUD';
    UI.toast(`Currency display set to ${G.club.currency === 'GBP' ? 'Pounds' : 'AUD'}.`);
    UI.render();
  },
  setClubTicketPrice(value, live){
    if(!G.club) return;
    G.club.ticketPrice = clamp(Math.round(+value || G.club.ticketPrice || 28), 10, 120);
    const t = myTeam();
    const m = G.phase==='regular' && G.fixtures && G.fixtures[G.round] ? G.fixtures[G.round].find(m=>m.h===t.id&&!m.played) : null;
    if(m) m.projCrowd = matchCrowd(G.teams[m.h], false);
    if(!live) UI.render();
  },
  setClubMembershipPrice(value, live){
    if(!G.club) return;
    G.club.membershipPrice = clamp(Math.round(+value || G.club.membershipPrice || 160), 80, 500);
    const ps = G.offseason && G.offseason.preseason;
    if(ps) ps.membershipPrice = G.club.membershipPrice;
    if(live){
      const mem = membershipProjection(G.club.membershipPrice);
      const el = document.getElementById('clubMembershipProjection');
      if(el) el.textContent = `Projected members ${mem.members.toLocaleString()} · revenue ${money(mem.revenue)}`;
      return;
    }
    UI.render();
  },
  upgradeVendor(key){
    const club = G.club;
    if(!club) return;
    if(!club.vendors) club.vendors = {fb:1, merch:1};
    const lvl = club.vendors[key] || 1;
    if(lvl >= 5){ UI.toast('Already at maximum level.'); return; }
    const costs = key==='fb' ? VENDOR_FB_COSTS : VENDOR_MERCH_COSTS;
    const cost = costs[lvl];
    if((club.funds||0) < cost){ UI.toast(`Not enough funds. Need ${money(cost)}.`); return; }
    club.funds -= cost;
    club.vendors[key] = lvl + 1;
    const label = key==='fb' ? 'Food & Beverage' : 'Merchandise';
    addNews(`${label} stalls upgraded to Level ${club.vendors[key]} — ${money(key==='fb'?VENDOR_FB_REV[club.vendors[key]]:VENDOR_MERCH_REV[club.vendors[key]])}/head revenue per home match.`,
      {title:'Vendor Upgrade', type:'club', tone:'good', teamId:G.coach.teamId, tag:'Facilities'});
    UI.toast(`${label} upgraded to Level ${club.vendors[key]}.`);
    UI.render();
  },
  upgradeFacility(key){
    ensureClubFacilities();
    if(!FACILITY_DEFS[key]) return;
    const lvl = facilityLevel(key);
    if(lvl >= FACILITY_MAX){ UI.toast('That facility is already maxed.'); return; }
    if(typeof facilityUnderConstruction === 'function' && facilityUnderConstruction(key)){
      UI.toast('This facility is already under construction.'); return;
    }
    const cost = facilityUpgradeCost(key);
    if((G.club.funds || 0) < cost){ UI.toast(`Not enough club funds. Need ${money(cost)}.`); return; }
    G.club.funds = Math.round(G.club.funds - cost);
    if(!G.club.construction) G.club.construction = {};
    const FACILITY_BUILD_WEEKS_UI = {stadium:8, training:5, gym:3, medical:3, academy:5};
    const buildWeeks = FACILITY_BUILD_WEEKS_UI[key] || 4;
    G.club.construction[key] = { targetLevel: lvl + 1, completesRound: G.round + buildWeeks, startsRound: G.round };
    addNews(`${FACILITY_DEFS[key].label} upgrade to level ${lvl + 1} commenced — completion in ${buildWeeks} weeks.`, {
      title:'Construction Started',
      type:'club',
      tone:'good',
      teamId:G.coach.teamId,
      tag:'Facilities',
    });
    UI.toast(`${FACILITY_DEFS[key].label} construction started — ${buildWeeks} weeks.`);
    UI.render();
  },
});
