import { UI } from "../01-core.js";


Object.assign(UI, {
  _slTab: 'attack',

  p_seasonleaders(){
    const allPlayers = Object.values(G.players).filter(p => p && p.s && p.s.g > 0);
    const teamOf = p => G.teams.find(t => t.players.includes(p.id));

    const val = (p, key) => {
      if(key === 'pts')  return p.s.t*4 + p.s.gl*2 + (p.s.fg||0);
      if(key === 'avg')  return p.s.g ? p.s.rSum/p.s.g : 0;
      if(key === 'gkp')  return p.s.ga ? p.s.gl/p.s.ga*100 : 0;
      if(key === 'mpg')  return p.s.g ? (p.s.mins||0)/p.s.g : 0;
      return p.s[key] || 0;
    };

    const per80 = (p, key) => {
      const mins = p.s.mins || 0;
      if(!mins) return null;
      const raw = val(p, key);
      return (raw / mins) * 80;
    };

    const fmtVal = (v, key) => {
      if(key === 'avg' || key === 'gkp' || key === 'mpg') return v.toFixed(1) + (key === 'gkp' ? '%' : '');
      return Math.round(v).toLocaleString();
    };

    const top = (key, n=10) => allPlayers
      .map(p => ({ p, val: val(p, key) }))
      .filter(x => x.val > 0)
      .sort((a, b) => b.val - a.val)
      .slice(0, n);

    // Big leader card for the top 3 in a category
    const leaderCard = (p, rank, key) => {
      const t = teamOf(p);
      const v = val(p, key);
      const color = t ? t.c1 : 'var(--accent)';
      const rankColors = ['#FFD700','#C0C0C0','#CD7F32'];
      return `<div class="click" onclick="UI.playerModal(${p.id})" style="flex:1;min-width:0;padding:12px;border-radius:8px;background:var(--hover);cursor:pointer;border-left:3px solid ${rank===0?color:'transparent'}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:18px;font-weight:900;font-family:var(--disp);color:${rankColors[rank]||'var(--muted)'}">${rank+1}</span>
          ${playerAvatar(p, 36)}
          <div style="min-width:0">
            <div style="font-weight:700;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</div>
            <div style="font-size:11px;color:var(--muted)">${t?`<span style="display:inline-block;width:8px;height:8px;background:${t.c1};border-radius:2px;margin-right:3px;vertical-align:middle"></span>${esc(t.nick)}`:''} <span class="pos-tag" style="font-size:9px">${p.pos}</span></div>
          </div>
        </div>
        <div style="font-size:28px;font-weight:900;font-family:var(--disp);color:${rank===0?color:'var(--ink)'};line-height:1">${fmtVal(v, key)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">${p.s.g} games</div>
      </div>`;
    };

    const per80Cats = new Set(['t','ta','lb','lba','tk','mt','runs','m','ks','km','gl','pts','inf']);

    const leaderTable = (key, rows) => {
      const showPer80 = per80Cats.has(key);
      return `<div class="card" style="padding:6px;overflow-x:auto">
        <table><thead><tr>
          <th class="noclick"></th>
          <th class="noclick">Player</th>
          <th class="noclick">Club</th>
          <th class="noclick num">G</th>
          <th class="noclick num">Total</th>
          ${showPer80 ? '<th class="noclick num" style="color:var(--dim);font-size:10px">per 80</th>' : ''}
        </tr></thead><tbody>
          ${rows.map(({ p, val: v }, i) => {
            const t = teamOf(p);
            const p80 = showPer80 ? per80(p, key) : null;
            return `<tr class="click" onclick="UI.playerModal(${p.id})">
              <td class="lpos">${i+1}</td>
              <td><b>${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span></td>
              <td>${t ? `<span class="team-spine" style="background:${t.c1}"></span><span onclick="event.stopPropagation();UI.teamModal(${t.id})" style="cursor:pointer;text-decoration:underline">${esc(t.nick)}</span>` : '—'}</td>
              <td class="num">${p.s.g}</td>
              <td class="num"><b>${fmtVal(v, key)}</b></td>
              ${showPer80 ? `<td class="num" style="color:var(--dim);font-size:11px">${p80 != null ? p80.toFixed(1) : '—'}</td>` : ''}
            </tr>`;
          }).join('') || `<tr><td colspan="${showPer80 ? 6 : 5}" style="color:var(--muted)">No data yet.</td></tr>`}
        </tbody></table>
      </div>`;
    };

    // Section: prominent leaders + full table for a category
    const section = (key, label) => {
      const rows = top(key, 10);
      if(!rows.length) return `<p style="color:var(--muted);padding:8px">No data yet.</p>`;
      const top3 = rows.slice(0, 3);
      return `
        <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
          ${top3.map((r, i) => leaderCard(r.p, i, key)).join('')}
        </div>
        ${leaderTable(key, rows)}`;
    };

    const tabs = [
      { key: 'attack',   label: 'Attack' },
      { key: 'defence',  label: 'Defence' },
      { key: 'kicking',  label: 'Kicking' },
      { key: 'scoring',  label: 'Scoring' },
      { key: 'general',  label: 'General' },
    ];

    const tabContent = {
      attack: [
        { key: 'runs',  label: 'Carries' },
        { key: 'm',     label: 'Run Metres' },
        { key: 'lb',    label: 'Line Breaks' },
        { key: 'lba',   label: 'Line Break Assists' },
        { key: 'ta',    label: 'Try Assists' },
      ],
      defence: [
        { key: 'tk',   label: 'Tackles' },
        { key: 'mt',   label: 'Missed Tackles' },
        { key: 'fdo',  label: 'Forced Drop-Outs' },
        { key: 'inf',  label: 'Infringements' },
      ],
      kicking: [
        { key: 'ks',   label: 'Kicks' },
        { key: 'km',   label: 'Kick Metres' },
        { key: 'k4020',label: '40/20s' },
        { key: 'gkp',  label: 'Goal Kicking %', minGames: 5 },
        { key: 'gl',   label: 'Goals Kicked' },
        { key: 'fg',   label: 'Field Goals' },
      ],
      scoring: [
        { key: 'pts',  label: 'Points' },
        { key: 't',    label: 'Tries' },
      ],
      general: [
        { key: 'g',    label: 'Games Played' },
        { key: 'mins', label: 'Minutes Played' },
        { key: 'mpg',  label: 'Avg Minutes per Game' },
        { key: 'avg',  label: 'Avg Match Rating' },
        { key: 'votes','label': 'Medal Votes' },
      ],
    };

    const cats = tabContent[UI._slTab] || [];

    return `<h1 class="page">Season Leaders</h1>
    <p class="page-sub">${G.year} season · top performers across all clubs</p>
    <div class="btnrow" style="margin-bottom:16px">
      ${tabs.map(t => `<button class="btn ${UI._slTab === t.key ? 'primary' : ''}" onclick="UI._slTab='${t.key}';UI.render()">${t.label}</button>`).join('')}
    </div>
    ${cats.map(({ key, label }) => `
      <h2 class="sec">${esc(label)}</h2>
      ${section(key, label)}
    `).join('')}`;
  },
});
