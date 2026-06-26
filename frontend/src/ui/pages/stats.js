'use strict';

/* Stat leaders — switchable categories + position filter */
Object.assign(UI, {
  _statPos: 'all',

  p_stats(){
    const cats = [
      ['t','Tries'],['ta','Try assists'],['lb','Line breaks'],['lba','LB assists'],
      ['tk','Tackles'],['mt','Missed tackles'],['runs','Carries'],['m','Run metres'],
      ['ks','Kicks'],['km','Kick metres'],['k4020','40/20s'],['fdo','Forced drop-outs'],
      ['gl','Goals'],['gkp','Goal %'],['fg','Field goals'],['pts','Points'],
      ['mins','Minutes'],['inf','Infringements'],['votes','Medal votes'],['avg','Avg rating'],
    ];
    const positions = ['all','FB','WG','CE','FE','HB','PR','HK','SR','LK'];
    const per80Cats = new Set(['t','ta','lb','lba','tk','mt','runs','m','ks','km','gl','pts','inf']);
    const showPer80 = per80Cats.has(UI.statCat);
    const v = p => {
      if(UI.statCat==='pts')  return p.s.t*4 + p.s.gl*2 + (p.s.fg||0);
      if(UI.statCat==='avg')  return p.s.g ? p.s.rSum/p.s.g : 0;
      if(UI.statCat==='gkp') return p.s.ga ? p.s.gl/p.s.ga*100 : 0;
      return p.s[UI.statCat] || 0;
    };
    const per80 = p => {
      const mins = p.s.mins || 0;
      if(!mins) return null;
      const raw = UI.statCat==='pts' ? p.s.t*4+p.s.gl*2+(p.s.fg||0) : (p.s[UI.statCat]||0);
      return (raw / mins) * 80;
    };
    const fmt = val => UI.statCat==='avg'||UI.statCat==='gkp' ? val.toFixed(1)+(UI.statCat==='gkp'?'%':'') : Math.round(val);

    let players = Object.values(G.players).filter(p=>p.s.g>0);
    if(UI._statPos !== 'all') players = players.filter(p=>p.pos===UI._statPos);
    const rows = players.sort((a,b)=>v(b)-v(a)).slice(0,25);
    const catLabel = (cats.find(c=>c[0]===UI.statCat)||[,''])[1];

    return `<h1 class="page">Stat Leaders</h1>
    <p class="page-sub">${G.year} season · all clubs</p>
    <div class="btnrow" style="margin-bottom:8px">${cats.map(([k,l])=>`<button class="btn sm ${UI.statCat===k?'primary':''}" onclick="UI.statCat='${k}';UI.render()">${l}</button>`).join('')}</div>
    <div class="btnrow" style="margin-bottom:10px"><span style="font-size:11px;color:var(--muted);margin-right:4px;align-self:center">Position:</span>
    ${positions.map(pos=>`<button class="btn sm ${UI._statPos===pos?'primary':''}" onclick="UI._statPos='${pos}';UI.render()">${pos==='all'?'All':pos}</button>`).join('')}
    ${UI._statPos!=='all'?`<button class="btn sm" onclick="UI._statPos='all';UI.render()">Reset</button>`:''}
    </div>
    <div class="card" style="padding:6px">
      <table><thead><tr>
        <th class="noclick"></th>
        <th class="noclick">Player</th>
        <th class="noclick">Club</th>
        <th class="noclick num">G</th>
        <th class="noclick num">${catLabel}</th>
        ${showPer80 ? `<th class="noclick num" style="color:var(--dim);font-size:10px" title="Per 80 minutes played">per 80</th>` : ''}
      </tr></thead><tbody>
    ${rows.map((p,i)=>{
      const t = G.teams.find(t=>t.players.includes(p.id));
      const p80 = showPer80 ? per80(p) : null;
      const p80Html = p80 != null ? `<td class="num" style="color:var(--dim);font-size:11px">${p80.toFixed(1)}</td>` : (showPer80 ? `<td class="num" style="color:var(--dim)">—</td>` : '');
      return `<tr class="click" onclick="UI.playerModal(${p.id})">
        <td class="lpos">${i+1}</td>
        <td><div class="player-cell">${playerAvatar(p,34)}<div><b>${playerTierBadge(p,true)} ${nationalityFlag(p.nationality)} ${esc(p.name)}</b> <span class="pos-tag">${p.pos}</span><br><span class="pmeta" style="font-size:10px;color:var(--muted)">${p.repTeam?esc(p.repTeam):''}</span></div></div></td>
        <td>${t?`${clubPrestigeBadge(t,true)} <span class="team-spine" style="background:${t.c1}"></span><span onclick="event.stopPropagation();UI.teamModal(${t.id})" style="cursor:pointer;text-decoration:underline">${esc(t.nick)}</span>`:'—'}</td>
        <td class="num">${p.s.g}</td>
        <td class="num"><b>${fmt(v(p))}</b></td>
        ${p80Html}
      </tr>`;
    }).join('')}
    ${rows.length===0?`<tr><td colspan="${showPer80?6:5}" style="color:var(--muted)">No players match this filter.</td></tr>`:''}
    </tbody></table>
    </div>`;
  },
});
