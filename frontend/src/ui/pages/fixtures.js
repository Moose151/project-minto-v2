'use strict';

/* Fixtures & Results — one round at a time with pagination */
Object.assign(UI, {
  _fixtRound: null,  // null = auto-select current/last played round

  p_fixtures(){
    const total = G.fixtures.length;

    // Auto-select appropriate round on first open
    if(UI._fixtRound === null){
      UI._fixtRound = G.phase === 'regular' ? Math.min(G.round, total - 1) : total - 1;
    }
    const r = Math.max(0, Math.min(UI._fixtRound, total - 1));

    const round = G.fixtures[r];
    const byeTeamIds = (G.byes && G.byes[r]) || [];
    const myBye = byeTeamIds.includes(G.coach.teamId);
    const isNext = r === G.round && G.phase === 'regular';
    const isCompleted = r < G.round || G.phase !== 'regular';
    const isMagicRound = G.magicRound && G.magicRound.round === r;
    const magicHostTeam = isMagicRound ? G.teams.find(t=>t.id===G.magicRound.hostTeamId) : null;
    const roundLabel = `Round ${r+1}${isMagicRound ? ' ★ Magic Round' : ''}${myBye ? ' — BYE' : ''}${isNext && !myBye ? ' — Next Up' : isCompleted ? ' — Completed' : !myBye ? ' — Upcoming' : ''}`;

    const sortedRound = sortMatchesBySlot(round);

    const gameRow = m => {
      const th = G.teams[m.h], ta = G.teams[m.a];
      const mine = m.h === G.coach.teamId || m.a === G.coach.teamId;
      const venue = m.played && m.det ? m.det.venue : (th.stadium || 'Home Ground');
      const crowd = m.played && m.det ? `${m.det.crowd.toLocaleString()} att.` : '';
      const slotLabel = m.slot ? m.slot.label : 'Sat Afternoon';
      const slotWeather = m.played && m.det ? ` · ${m.det.weather}` : '';
      const reportBtn = m.played && m.det
        ? `<div style="text-align:center;margin:-2px 0 4px"><button class="btn sm" onclick="G._lastPlayedMatch=G.fixtures[${r}].find(mm=>mm.h===${m.h}&&mm.a===${m.a});UI.go('match-report')" style="font-size:10px;padding:2px 10px">Match report →</button></div>`
        : '';
      return `<div style="${mine ? 'background:rgba(210,165,62,.06);border-radius:6px;margin:0 -6px;padding:2px 6px;' : ''}">
        <div style="font-size:9px;color:var(--brass);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">${esc(slotLabel)}${slotWeather}</div>
        <div class="score-line">
          ${teamLogo(th,24)}
          <span class="t ${m.played && m.hs > m.as ? 'winner' : ''}">${esc(th.nick)}</span>
          <span class="s">${m.played ? m.hs : ''}</span>
          <span style="color:var(--dim);min-width:14px;text-align:center">${m.played ? '–' : 'v'}</span>
          <span class="s">${m.played ? m.as : ''}</span>
          <span class="t ${m.played && m.as > m.hs ? 'winner' : ''}" style="text-align:right">${esc(ta.nick)}</span>
          ${teamLogo(ta,24)}
        </div>
        <div style="font-size:10px;color:var(--dim);text-align:center;margin:-4px 0 4px">${esc(venue)}${crowd ? ` · ${crowd}` : ''}</div>
        ${reportBtn}
      </div>`;
    };

    const byeCard = byeTeamIds.length ? `<div style="text-align:center;padding:10px 0 6px;border-top:1px solid var(--line);margin-top:8px">
      <span style="color:var(--brass);font-weight:700;font-size:12px;letter-spacing:.06em;text-transform:uppercase">BYE — </span>
      ${byeTeamIds.map(id=>{ const bt=G.teams[id]; return bt?`<span style="font-size:12px">${teamLogo(bt,16)} ${esc(bt.nick)}</span>`:''; }).join(' ')}
    </div>` : '';

    // Round navigation
    const jumpOpts = G.fixtures.map((_, i) => {
      const rByeIds = (G.byes && G.byes[i]) || [];
      const rMyBye = rByeIds.includes(G.coach.teamId);
      const rIsMR = G.magicRound && G.magicRound.round === i;
      return `<option value="${i}" ${i === r ? 'selected' : ''}>Round ${i+1}${rIsMR ? ' ★' : ''}${rMyBye ? ' (BYE)' : ''}${i === G.round && G.phase === 'regular' ? ' ▸' : ''}</option>`;
    }).join('');
    const nav = `<div class="btnrow" style="margin-bottom:12px;align-items:center;gap:6px">
      <button class="btn sm" onclick="UI._fixtRound=Math.max(0,UI._fixtRound-1);UI.render()" ${r===0?'disabled':''}>◀ Prev</button>
      <select style="flex:1;max-width:200px" onchange="UI._fixtRound=+this.value;UI.render()">${jumpOpts}</select>
      <button class="btn sm" onclick="UI._fixtRound=Math.min(${total-1},UI._fixtRound+1);UI.render()" ${r===total-1?'disabled':''}>Next ▶</button>
      ${G.phase==='regular' ? `<button class="btn sm" onclick="UI._fixtRound=${G.round};UI.render()">Now</button>` : ''}
    </div>`;

    const byeAlert = myBye ? `<div style="background:rgba(210,165,62,.1);border:1px solid var(--brass);border-radius:6px;padding:8px 12px;margin-bottom:10px;color:var(--brass);font-weight:700;text-align:center">YOUR TEAM HAS A BYE THIS ROUND · Players are resting and recovering</div>` : '';
    const magicRoundBanner = isMagicRound ? `<div style="background:linear-gradient(135deg,rgba(210,165,62,.18),rgba(210,165,62,.06));border:1px solid rgba(210,165,62,.5);border-radius:6px;padding:8px 12px;margin-bottom:10px;text-align:center">
      <div style="color:var(--brass);font-weight:700;font-size:13px;letter-spacing:.08em;text-transform:uppercase">★ Magic Round</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">All matches at ${magicHostTeam ? esc(magicHostTeam.stadium||magicHostTeam.city+' Stadium') : ''} · ${esc(G.magicRound.venue)}</div>
    </div>` : '';
    const roundCard = `<div class="card" style="padding:12px">
      <div class="navsep" style="margin:0 0 10px">${roundLabel}</div>
      ${magicRoundBanner}
      ${byeAlert}
      ${sortedRound.map(gameRow).join('')}
      ${byeCard}
    </div>`;

    // Finals bracket (shown above pagination when available)
    let finalsHtml = '';
    if(G.finals){
      const F = G.finals;
      const fg = (m, label) => {
        if(!m) return '';
        const th = G.teams[m.h], ta = G.teams[m.a];
        const mine = m.h === G.coach.teamId || m.a === G.coach.teamId;
        const venue = m.played && m.det ? m.det.venue : 'Grand Final Stadium';
        const crowd = m.played && m.det ? `${m.det.crowd.toLocaleString()} att.` : '';
        return `<div style="${mine ? 'background:rgba(210,165,62,.06);border-radius:6px;margin:0 -6px;padding:2px 6px;' : ''}">
          <div style="font-size:10px;color:var(--brass);font-weight:700;text-transform:uppercase;margin:8px 0 3px;letter-spacing:.05em">${esc(label)}</div>
          <div class="score-line">
            ${teamLogo(th,24)}
            <span class="t ${m.played && m.hs > m.as ? 'winner' : ''}">${esc(th.nick)}</span>
            <span class="s">${m.played ? m.hs : ''}</span>
            <span style="color:var(--dim);min-width:14px;text-align:center">${m.played ? '–' : 'v'}</span>
            <span class="s">${m.played ? m.as : ''}</span>
            <span class="t ${m.played && m.as > m.hs ? 'winner' : ''}" style="text-align:right">${esc(ta.nick)}</span>
            ${teamLogo(ta,24)}
          </div>
          <div style="font-size:10px;color:var(--dim);text-align:center;margin:-4px 0 4px">${esc(venue)}${crowd ? ` · ${crowd}` : ''}</div>
        </div>`;
      };

      const sections = [];
      const week = (title, matches, labels) => `<div>
        <div style="font-size:11px;font-weight:700;color:var(--brass);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${title}</div>
        ${matches.map((m, i) => fg(m, labels[i])).join('')}
      </div>`;

      if(F.useTop8 !== false){
        if(F.qf && F.qf.length === 4){
          sections.push(week('Week 1 — Qualifying & Elimination Finals', F.qf,
            ['Qualifying Final 1 (1st v 4th)', 'Qualifying Final 2 (2nd v 3rd)',
             'Elimination Final 1 (5th v 8th)', 'Elimination Final 2 (6th v 7th)']));
        }
        if(F.sf){
          sections.push(week('Week 2 — Semi Finals', F.sf, ['Semi Final 1', 'Semi Final 2']));
        }
        if(F.pf){
          sections.push(week('Week 3 — Preliminary Finals', F.pf, ['Preliminary Final 1', 'Preliminary Final 2']));
        }
        if(F.gf){
          const gfSection = week('Week 4 — Grand Final', [F.gf], ['Grand Final']);
          const premBanner = F.premier ? `<div style="text-align:center;color:var(--brass);font-family:var(--disp);font-size:20px;font-weight:700;margin:10px 0 4px">${esc(G.teams[F.premier].nick)} — ${G.year} Premiers</div>` : '';
          sections.push(gfSection + premBanner);
        }
      } else {
        // Legacy top-4
        const qMatches = F.qf || F.sf || [];
        if(qMatches.length) sections.push(week('Semi Finals', qMatches, qMatches.map((_,i) => `Semi Final ${i+1}`)));
        if(F.gf){
          const gfSection = week('Grand Final', [F.gf], ['Grand Final']);
          const premBanner = F.premier ? `<div style="text-align:center;color:var(--brass);font-family:var(--disp);font-size:20px;font-weight:700;margin:10px 0 4px">${esc(G.teams[F.premier].nick)} — ${G.year} Premiers</div>` : '';
          sections.push(gfSection + premBanner);
        }
      }

      if(sections.length){
        finalsHtml = `<div class="card" style="margin-bottom:16px;border-color:var(--brass);padding:12px">
          <div class="navsep" style="margin:0 0 10px;color:var(--brass)">Finals Series — ${G.year}</div>
          ${sections.join('<hr style="border:none;border-top:1px solid var(--line);margin:10px 0">')}
        </div>`;
      }
    }

    return `<h1 class="page">Fixtures & Results</h1>
    <p class="page-sub">Your matches are highlighted. Use the arrows or dropdown to navigate rounds.</p>
    ${finalsHtml}
    ${nav}
    ${roundCard}`;
  }
});
