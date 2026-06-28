import { UI } from "../01-core.js";


/* Inbox — club news and post-match communications */
Object.assign(UI, {
  _inboxFilter: 'all',
  _inboxExpanded: null,

  _inboxKey(n){
    return String(n.createdAt || (n.y+'_'+n.r+'_'+(n.title||'')));
  },

  _toggleInboxItem(key){
    key = String(key);
    UI._markRead(key);
    UI._inboxExpanded = key;
    UI.render();
  },

  _inboxActions(n){
    const playerLink = n.playerId && G.players[n.playerId]
      ? `<button class="btn sm" onclick="UI.playerModal(${n.playerId})">View ${esc(G.players[n.playerId].name)}</button>`
      : '';
    const teamLink = n.teamId != null && UI.teamModal
      ? `<button class="btn sm" onclick="UI.teamModal(${n.teamId})">View club</button>`
      : '';
    const actionBtn = {
      analysis:      `<button class="btn sm primary" onclick="UI.go('tactics')">Tactics</button>`,
      injury:        n.injPos
        ? `<button class="btn sm primary" onclick="UI._recPos='${n.injPos}';UI._recTab='freeAgents';UI.go('recruitment')">Find ${n.injPos} cover</button>`
        : `<button class="btn sm primary" onclick="UI.go('injuryward')">Injury Ward</button>`,
      contract:      `<button class="btn sm primary" onclick="UI.go('contracts')">Contracts</button>`,
      recommendation:`<button class="btn sm primary" onclick="UI.go('teamsheet')">Team Sheet</button>`,
      scouting:      `<button class="btn sm primary" onclick="UI.go('scouting')">Scouting</button>`,
      recruitment:   `<button class="btn sm primary" onclick="UI.go('recruitment')">Recruitment</button>`,
      form:          `<button class="btn sm primary" onclick="UI.go('squad')">Squad</button>`,
      player:        n.playerId && G.players[n.playerId] && (G.players[n.playerId].morale||50) < 50
        ? `<button class="btn sm primary" onclick="UI.playerMeeting(${n.playerId})">One-on-one meeting</button>`
        : `<button class="btn sm primary" onclick="UI.go('squad')">Squad</button>`,
      transfer:      n.playerId && G.players[n.playerId]
        ? `<button class="btn sm primary" style="background:var(--red)" onclick="UI.handleTransferRequest(${n.playerId})">Handle request</button>`
        : '',
      board:         `<button class="btn sm primary" onclick="UI.go('coach')">Coach</button>`,
      finance:       `<button class="btn sm primary" onclick="UI.go('club-management')">Club Management</button>`,
      milestone:     n.playerId && G.players[n.playerId] && (G.players[n.playerId].years||0) <= 1
        ? `<button class="btn sm primary" onclick="UI.go('contracts')">Renew Contract</button>`
        : `<button class="btn sm primary" onclick="UI.playerModal(${n.playerId})">View Player</button>`,
      league:        `<button class="btn sm primary" onclick="UI.go('ladder')">Ladder</button>`,
    }[n.type] || '';
    return [actionBtn, playerLink, teamLink].filter(Boolean).join('');
  },

  _inboxFormattedBody(n){
    const raw = n.body || n.txt || '';
    const sections = [];
    let current = null;
    const headings = new Set(['Summary','Staff read','League context','Expected XIII','Key threats','Plan']);
    for(const line of raw.split(/\n+/).map(x=>x.trim()).filter(Boolean)){
      if(headings.has(line)){
        current = {h:line, rows:[]};
        sections.push(current);
      } else if(current) current.rows.push(line);
      else{
        current = {h:'Report', rows:[line]};
        sections.push(current);
      }
    }
    return sections.map(s=>`<section class="inbox-section"><h3>${esc(s.h)}</h3>${s.rows.map(r=>`<p>${esc(r)}</p>`).join('')}</section>`).join('');
  },

  p_inbox(){
    const CATS = [
      ['all',            'All'],
      ['analysis',       'Match Analysis'],
      ['match',          'Results'],
      ['injury',         'Medical'],
      ['club',           'Club'],
      ['board',          'Board'],
      ['origin',         'State of Origin'],
      ['player',         'Player Messages'],
      ['transfer',       'Transfer Requests'],
      ['recommendation', 'Staff Reports'],
      ['form',           'Form Alerts'],
      ['scouting',       'Scouting'],
      ['recruitment',    'Recruitment'],
      ['contract',       'Contracts'],
      ['achievement',    'Achievements'],
      ['development',    'Development'],
      ['finance',        'Finance'],
      ['milestone',      'Milestones'],
      ['league',         'League News'],
    ];

    const news = G.news || [];
    const filtered = UI._inboxFilter === 'all'
      ? news
      : news.filter(n => n.type === UI._inboxFilter);

    const toneIcon  = t => t==='good'?'✓':t==='bad'?'!':'·';
    const toneColor = t => t==='good'?'var(--green)':t==='bad'?'var(--red)':'var(--accent)';

    const catUnread = k => k === 'all'
      ? news.filter(n => !n.read).length
      : news.filter(n => n.type === k && !n.read).length;
    const catCount  = k => k === 'all' ? news.length : news.filter(n=>n.type===k).length;

    const catTabs = CATS.map(([k,l]) => {
      const cnt = catCount(k);
      const unr = catUnread(k);
      if(cnt === 0 && k !== 'all') return '';
      const badge = unr > 0
        ? `<span style="background:var(--red);color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:0 4px;margin-left:3px;vertical-align:middle">${unr}</span>`
        : '';
      return `<button class="btn sm ${UI._inboxFilter===k?'primary':''}" onclick="UI._inboxFilter='${k}';UI._inboxExpanded=null;UI.render()">${l}${badge}</button>`;
    }).filter(Boolean).join('');

    if(filtered.length && !filtered.some(n => UI._inboxKey(n) === UI._inboxExpanded)) UI._inboxExpanded = UI._inboxKey(filtered[0]);
    const selected = filtered.find(n => UI._inboxKey(n) === UI._inboxExpanded) || filtered[0] || null;
    if(selected) UI._markRead(UI._inboxKey(selected));

    const itemHtml = n => {
      const key = UI._inboxKey(n);
      const jsKey = JSON.stringify(key).replace(/"/g, '&quot;');
      const sel = selected && UI._inboxKey(selected) === key;
      const isUnread = !n.read;
      const rawBody = n.body || n.txt || '';
      return `<div class="inbox-item${sel?' selected':''}${isUnread?' unread':''}" onclick="UI._toggleInboxItem(${jsKey})">
        <div class="inbox-header">
          <span class="inbox-tone" style="color:${toneColor(n.tone)}">${toneIcon(n.tone)}</span>
          <span class="inbox-title" style="${isUnread?'font-weight:700':'color:var(--muted)'}">${esc(n.title||n.tag||'Club News')}</span>
          ${isUnread ? `<span style="width:7px;height:7px;border-radius:50%;background:var(--red);display:inline-block;margin-left:4px;flex-shrink:0"></span>` : ''}
          <span class="inbox-meta" style="margin-left:auto">R${n.r||'?'} · ${n.y||G.year}</span>
        </div>
        <div class="inbox-preview" style="${isUnread?'color:var(--ink)':''}">${rawBody.length > 120 ? esc(rawBody.slice(0,120))+'…' : esc(rawBody)}</div>
      </div>`;
    };

    const totalUnread = news.filter(n => !n.read).length;
    const unreadBadge = totalUnread > 0
      ? `<span style="background:var(--red);color:#fff;border-radius:10px;font-size:10px;font-weight:700;padding:1px 6px;margin-left:6px">${totalUnread}</span>`
      : '';

    const reader = selected ? `<article class="inbox-reader">
      <div class="inbox-reader-head">
        <div>
          <div class="inbox-reader-tag">${esc(selected.tag || selected.type || 'News')} · R${selected.r||'?'} · ${selected.y||G.year}</div>
          <h2>${esc(selected.title || selected.tag || 'Club News')}</h2>
        </div>
        <span class="inbox-tone big" style="color:${toneColor(selected.tone)}">${toneIcon(selected.tone)}</span>
      </div>
      <div class="inbox-reader-body">${UI._inboxFormattedBody(selected)}</div>
      <div class="btnrow inbox-reader-actions">${UI._inboxActions(selected)}</div>
    </article>` : `<div class="inbox-reader empty"><p class="page-sub">No items in this category.</p></div>`;

    return `<h1 class="page">Inbox${unreadBadge}</h1>
    <p class="page-sub">Post-match reports, club communications, and staff updates.</p>
    <div class="btnrow" style="flex-wrap:wrap;gap:4px;margin-bottom:8px">${catTabs}</div>
    ${totalUnread > 0
      ? `<div style="text-align:right;margin-bottom:6px"><button class="btn sm" onclick="UI._markAllRead()">Mark all as read</button></div>`
      : ''}
    <div class="inbox-shell">
      <div class="inbox-list">${filtered.length ? filtered.map(itemHtml).join('') : `<p class="page-sub" style="padding:12px">No items in this category.</p>`}</div>
      ${reader}
    </div>`;
  },

  _markRead(key){
    key = String(key);
    const n = (G.news || []).find(x => {
      const k = UI._inboxKey(x);
      return k === key;
    });
    if(n) n.read = true;
  },

  _markAllRead(){
    (G.news || []).forEach(n => { n.read = true; });
    UI.render();
  },
});
