'use strict';

/* Season Leaders — top performers per stat this season */
Object.assign(UI, {
  _slTab: 'positive',

  p_seasonleaders(){
    const allPlayers = Object.values(G.players).filter(p => p.s && p.s.g > 0);

    const top = (key, n=5) => allPlayers
      .map(p => ({ p, val: key === 'pts' ? p.s.t*4 + p.s.gl*2 + (p.s.fg||0) : (p.s[key] || 0) }))
      .filter(x => x.val > 0)
      .sort((a,b) => b.val - a.val)
      .slice(0, n);

    const teamOf = p => G.teams.find(t => t.players.includes(p.id));

    const miniTable = (label, rows) => {
      if(!rows.length) return `<div class="card" style="padding:6px;overflow-x:auto">
        <h2 class="sec" style="margin:8px 10px">${esc(label)}</h2>
        <p style="color:var(--muted);font-size:12px;padding:6px 10px">No data yet.</p></div>`;
      return `<div class="card" style="padding:6px;overflow-x:auto">
        <h2 class="sec" style="margin:8px 10px">${esc(label)}</h2>
        <table><thead><tr>
          <th class="noclick"></th>
          <th class="noclick">Player</th>
          <th class="noclick">Club</th>
          <th class="noclick num">Total</th>
        </tr></thead><tbody>
          ${rows.map(({p, val}, i) => {
            const t = teamOf(p);
            return `<tr class="click" onclick="UI.playerModal(${p.id})">
              <td class="lpos">${i+1}</td>
              <td><b>${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span></td>
              <td>${t ? `<span class="team-spine" style="background:${t.c1}"></span><span onclick="event.stopPropagation();UI.teamModal(${t.id})" style="cursor:pointer;text-decoration:underline">${esc(t.nick)}</span>` : '—'}</td>
              <td class="num"><b>${Math.round(val).toLocaleString()}</b></td>
            </tr>`;
          }).join('')}
        </tbody></table>
      </div>`;
    };

    const posStats = [
      ['t','Tries'], ['ta','Try Assists'], ['tk','Tackles'],
      ['m','Run Metres'], ['runs','Carries'], ['fdo','Forced Drop-Outs'],
      ['lb','Line Breaks'], ['mins','Minutes Played'], ['g','Games Played'],
    ];
    const negStats = [
      ['err','Errors'], ['mt','Missed Tackles'], ['inf','Infringements'],
    ];

    const cats = UI._slTab === 'positive' ? posStats : negStats;

    return `<h1 class="page">Season Leaders</h1>
    <p class="page-sub">${G.year} season · top performers across all clubs</p>
    <div class="btnrow" style="margin-bottom:14px">
      <button class="btn ${UI._slTab==='positive'?'primary':''}" onclick="UI._slTab='positive';UI.render()">Positive Stats</button>
      <button class="btn ${UI._slTab==='negative'?'primary':''}" onclick="UI._slTab='negative';UI.render()">Negative Stats</button>
    </div>
    <div class="grid3">
      ${cats.map(([key, label]) => miniTable(label, top(key))).join('')}
    </div>`;
  },
});
