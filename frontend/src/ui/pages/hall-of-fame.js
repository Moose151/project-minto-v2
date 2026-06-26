'use strict';

/* Hall of Fame — retired legends */
Object.assign(UI, {
  _hofSort: 'score',
  _hofSearch: '',
  _hofClub: false,

  p_halloffame(){
    const myTeamId = G.coach ? G.coach.teamId : null;
    const myT = myTeamId != null ? G.teams.find(t=>t.id===myTeamId) : null;
    const query = (UI._hofSearch || '').trim().toLowerCase();
    const vals = h => ({
      score:h.score || 0,
      newest:-(h.inductionYear || 0),
      games:h.career ? h.career.games || 0 : 0,
      points:h.career ? h.career.points || 0 : 0,
      tries:h.career ? h.career.tries || 0 : 0,
      peak:h.peakOvr || 0,
      name:h.name || '',
    }[UI._hofSort] ?? (h.score || 0));
    const all = (G.hallOfFame || []);
    const rows = all
      .filter(h=>!query || `${h.name} ${h.team} ${h.nationality} ${h.repTeam} ${h.pos}`.toLowerCase().includes(query))
      .filter(h=>!UI._hofClub || h.teamId===myTeamId)
      .sort((a,b)=>{
        const av = vals(a), bv = vals(b);
        if(typeof av === 'string') return av.localeCompare(bv);
        return bv - av;
      });
    const myLegends = all.filter(h=>h.teamId===myTeamId);
    const sortSelect = `<select onchange="UI._hofSort=this.value;UI.render()">
      ${[
        ['score','Sort: legacy score'],['newest','Sort: newest inducted'],['peak','Sort: peak OVR'],['games','Sort: games'],['points','Sort: points'],['tries','Sort: tries'],['name','Sort: name']
      ].map(([v,l])=>`<option value="${v}" ${UI._hofSort===v?'selected':''}>${l}</option>`).join('')}
    </select>`;

    const hofCard = h => {
      const c = h.career || {};
      const awards = (h.awards || []).slice(0,4).map(a=>`<span class="pos-tag">${esc(a.award)}</span>`).join(' ');
      const team = h.teamId != null && G.teams[h.teamId] ? G.teams[h.teamId] : null;
      const isMyClub = h.teamId === myTeamId;

      // Rep honour badges
      const repBadges = [
        h.repTeam === 'Kangaroos' ? `<span class="pos-tag" style="background:rgba(210,165,62,.18);color:var(--brass);border-color:var(--brass)">🌏 ${esc(h.repTeam)}</span>` : '',
        h.repTeam && h.repTeam !== 'Kangaroos' ? `<span class="pos-tag" style="color:var(--brass)">🌐 ${esc(h.repTeam)}</span>` : '',
        h.stateRep ? `<span class="pos-tag" style="color:var(--ink)">🏟 State Rep</span>` : '',
        (c.premierships || 0) >= 3 ? `<span class="pos-tag" style="background:rgba(210,165,62,.18);color:var(--brass)">🏆 Dynasty (${c.premierships}×)</span>` : (c.premierships || 0) >= 1 ? `<span class="pos-tag">🏆 ${c.premierships}× Prem</span>` : '',
        isMyClub ? `<span class="pos-tag" style="background:rgba(76,175,125,.12);color:var(--green);border-color:var(--green)">Club Legend</span>` : '',
      ].filter(Boolean).join(' ');

      // Career narrative
      const highlights = [];
      if((c.games||0)>=200) highlights.push(`${c.games} games`);
      if((c.tries||0)>=100) highlights.push(`${c.tries} tries`);
      if((c.points||0)>=500) highlights.push(`${c.points} pts`);
      const narrative = highlights.length ? highlights.join(' · ') : '';

      return `<div class="card" style="${isMyClub?'border-color:rgba(76,175,125,.35)':''}">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
          <div style="flex:1;min-width:0">
            <div style="font-family:var(--disp);font-size:20px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nationalityFlag(h.nationality)} ${esc(h.name)}</div>
            <p style="margin:3px 0;color:var(--muted);font-size:12px">${esc(h.pos || '')}${h.pos2?`/${esc(h.pos2)}`:''} · ${esc(h.nationality || 'Unknown')}</p>
            <p style="margin:3px 0;color:var(--brass);font-size:12px">Inducted ${h.inductionYear} · ${esc(h.quality || 'Legend')} · legacy ${h.score}</p>
            ${repBadges ? `<div style="margin:6px 0;display:flex;flex-wrap:wrap;gap:4px">${repBadges}</div>` : ''}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="ovr ${ovrCls(h.peakOvr || 0)}" style="font-size:20px">${h.peakOvr || '-'}</div>
            <div style="font-size:10px;color:var(--muted)">peak OVR</div>
          </div>
        </div>
        <div class="dash-strip" style="grid-template-columns:repeat(4,minmax(70px,1fr));margin:10px 0">
          <div class="dash-status"><div class="dash-label">Games</div><div class="dash-value">${c.games || 0}</div></div>
          <div class="dash-status"><div class="dash-label">Tries</div><div class="dash-value">${c.tries || 0}</div></div>
          <div class="dash-status"><div class="dash-label">Points</div><div class="dash-value">${c.points || 0}</div></div>
          <div class="dash-status"><div class="dash-label">Prems</div><div class="dash-value">${c.premierships || 0}</div></div>
        </div>
        ${narrative ? `<p style="font-size:11px;color:var(--green);margin:0 0 6px;font-weight:600">${narrative}</p>` : ''}
        <p style="font-size:12px;color:var(--muted);margin:0 0 8px">Final club: ${team?`<span onclick="UI.teamModal(${team.id})" style="cursor:pointer;text-decoration:underline">${esc(h.team)}</span>`:esc(h.team || 'Free Agent')}</p>
        <div style="display:flex;flex-wrap:wrap;gap:4px">${awards || '<span style="color:var(--dim);font-size:12px">No major awards recorded.</span>'}</div>
        <div class="btnrow" style="margin-top:10px"><button class="btn sm primary" onclick="UI.showHofCeremony(${h.id})">Ceremony</button></div>
      </div>`;
    };

    const clubTab = myT ? `<button class="btn sm${UI._hofClub?' primary':''}" onclick="UI._hofClub=${!UI._hofClub};UI.render()">${myT.nick} Legends${myLegends.length?' ('+myLegends.length+')':''}</button>` : '';

    return `<h1 class="page">Hall of Fame</h1>
    <p class="page-sub">Retired players with exceptional careers are inducted automatically at season review.</p>
    ${myLegends.length ? `<div class="card" style="margin-bottom:12px;border-color:rgba(76,175,125,.35)">
      <div style="font-size:11px;color:var(--green);font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Club Legend Wall — ${esc(myT?myT.nick:'Your Club')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${myLegends.slice(0,5).map(h=>`<span style="font-size:13px;font-weight:600">${nationalityFlag(h.nationality)} ${esc(h.name)}</span><span style="color:var(--muted);font-size:12px">(${h.pos}·${h.peakOvr||'?'})</span>`).join('<span style="color:var(--line);margin:0 4px">·</span>')}
        ${myLegends.length>5?`<span style="color:var(--muted);font-size:12px">+${myLegends.length-5} more</span>`:''}
      </div>
    </div>` : ''}
    <div class="card history-controls">
      <div class="field"><label>Search Hall of Fame</label><input type="search" value="${esc(UI._hofSearch||'')}" placeholder="Player, club, country..." oninput="UI._hofSearch=this.value;UI.render()"></div>
      <div class="field"><label>Sort</label>${sortSelect}</div>
      <div class="btnrow" style="margin:0;gap:6px">${clubTab}<button class="btn sm" onclick="UI._hofSearch='';UI._hofSort='score';UI._hofClub=false;UI.render()">Clear</button></div>
    </div>
    <div style="font-size:12px;color:var(--muted);margin:8px 0 12px">${rows.length} inductee${rows.length===1?'':'s'}${UI._hofClub?' (club only)':''}</div>
    <div class="grid2">${rows.map(hofCard).join('') || '<div class="card"><p style="color:var(--muted)">No Hall of Fame inductees yet. Legends will appear here when they retire.</p></div>'}</div>`;
  },
  showHofCeremony(id){
    const h = (G.hallOfFame || []).find(x=>x.id===id);
    if(!h) return;
    const c = h.career || {};
    const team = h.teamId != null && G.teams[h.teamId] ? G.teams[h.teamId] : null;
    const awards = (h.awards || []).slice(0,6).map(a=>`<span class="pos-tag">${esc(a.year || '')} ${esc(a.award || '')}</span>`).join(' ');
    const repLine = [h.repTeam, h.stateRep ? 'State Representative' : '', (c.premierships||0) ? `${c.premierships}x premiership winner` : ''].filter(Boolean).join(' · ');
    UI.modal(`<div style="text-align:center;padding:4px 0 2px">
      <div style="font-size:11px;color:var(--brass);font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px">Hall of Fame Induction</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;margin-bottom:12px">
        ${team ? teamLogo(team,58) : ''}
        <div style="width:82px;height:82px;border-radius:50%;background:linear-gradient(135deg,rgba(210,165,62,.22),rgba(255,255,255,.04));border:1px solid rgba(210,165,62,.5);display:flex;align-items:center;justify-content:center;font-family:var(--disp);font-size:34px;font-weight:900">${esc(String(h.name||'?').slice(0,1))}</div>
      </div>
      <h3 style="font-size:26px;margin:0 0 4px">${nationalityFlag(h.nationality)} ${esc(h.name)}</h3>
      <p class="page-sub" style="margin:0 0 12px">${esc(h.pos || '')}${h.pos2?`/${esc(h.pos2)}`:''} · ${esc(h.team || 'Free Agent')} · Inducted ${h.inductionYear}</p>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;text-align:left;margin-bottom:12px">
        <div class="card" style="padding:10px"><div style="font-size:10px;color:var(--muted)">Legacy</div><div style="font-family:var(--disp);font-size:24px;font-weight:800;color:var(--brass)">${h.score || 0}</div></div>
        <div class="card" style="padding:10px"><div style="font-size:10px;color:var(--muted)">Peak OVR</div><div class="ovr ${ovrCls(h.peakOvr||0)}" style="font-size:22px">${h.peakOvr || '-'}</div></div>
        <div class="card" style="padding:10px"><div style="font-size:10px;color:var(--muted)">Games</div><div style="font-family:var(--disp);font-size:24px;font-weight:800">${c.games || 0}</div></div>
        <div class="card" style="padding:10px"><div style="font-size:10px;color:var(--muted)">Points</div><div style="font-family:var(--disp);font-size:24px;font-weight:800">${c.points || 0}</div></div>
      </div>
      <p style="font-size:13px;color:var(--muted);margin:0 0 10px">${repLine ? esc(repLine) : esc(h.quality || 'League legend')}</p>
      <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-bottom:12px">${awards || '<span style="font-size:12px;color:var(--dim)">No major awards recorded.</span>'}</div>
      <div class="btnrow" style="justify-content:center">
        <button class="btn primary" onclick="UI.closeModal()">Close</button>
        ${team ? `<button class="btn" onclick="UI.closeModal();UI.teamModal(${team.id})">Final club</button>` : ''}
      </div>
    </div>`);
  },
});
