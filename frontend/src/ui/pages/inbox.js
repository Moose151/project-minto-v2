'use strict';

/* Inbox — club news and post-match communications */
Object.assign(UI, {
  _inboxFilter: 'all',
  _inboxExpanded: null,

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
      ['recommendation', 'Staff Reports'],
      ['form',           'Form Alerts'],
      ['scouting',       'Scouting'],
      ['recruitment',    'Recruitment'],
      ['contract',       'Contracts'],
      ['achievement',    'Achievements'],
      ['development',    'Development'],
      ['finance',        'Finance'],
    ];

    const news = G.news || [];
    const filtered = UI._inboxFilter === 'all'
      ? news
      : news.filter(n => n.type === UI._inboxFilter);

    const toneIcon  = t => t==='good'?'✓':t==='bad'?'!':'·';
    const toneColor = t => t==='good'?'var(--green)':t==='bad'?'var(--red)':'var(--brass)';

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

    const itemHtml = n => {
      const key = n.createdAt || (n.y+'_'+n.r+'_'+(n.title||''));
      const exp = UI._inboxExpanded === key;
      const isUnread = !n.read;
      const preview = (n.body || n.txt || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const playerLink = n.playerId && G.players[n.playerId]
        ? `<button class="btn sm" style="margin-top:6px" onclick="event.stopPropagation();UI.playerModal(${n.playerId})">View ${esc(G.players[n.playerId].name)}</button>`
        : '';
      const teamLink = n.teamId != null && UI.teamModal
        ? `<button class="btn sm" style="margin-top:6px" onclick="event.stopPropagation();UI.teamModal(${n.teamId})">View club</button>`
        : '';
      const actionBtn = {
        injury:        `<button class="btn sm" onclick="event.stopPropagation();UI.go('injuryward')">Injury Ward →</button>`,
        contract:      `<button class="btn sm" onclick="event.stopPropagation();UI.go('contracts')">Contracts →</button>`,
        recommendation:`<button class="btn sm" onclick="event.stopPropagation();UI.go('teamsheet')">Team Sheet →</button>`,
        scouting:      `<button class="btn sm" onclick="event.stopPropagation();UI.go('scouting')">Scouting →</button>`,
        recruitment:   `<button class="btn sm" onclick="event.stopPropagation();UI.go('recruitment')">Recruitment →</button>`,
        form:          `<button class="btn sm" onclick="event.stopPropagation();UI.go('squad')">Squad →</button>`,
        player:        `<button class="btn sm" onclick="event.stopPropagation();UI.go('squad')">Squad →</button>`,
        board:         `<button class="btn sm" onclick="event.stopPropagation();UI.go('club-management')">Club Management →</button>`,
        finance:       `<button class="btn sm" onclick="event.stopPropagation();UI.go('club-management')">Club Management →</button>`,
      }[n.type] || '';
      return `<div class="inbox-item${exp?' expanded':''}${isUnread?' unread':''}" onclick="UI._markRead(\`${key}\`);UI._inboxExpanded=(UI._inboxExpanded===\`${key}\`?null:\`${key}\`);UI.render()">
        <div class="inbox-header">
          <span class="inbox-tone" style="color:${toneColor(n.tone)}">${toneIcon(n.tone)}</span>
          <span class="inbox-title" style="${isUnread?'font-weight:700':'color:var(--muted)'}">${esc(n.title||n.tag||'Club News')}</span>
          ${isUnread ? `<span style="width:7px;height:7px;border-radius:50%;background:var(--red);display:inline-block;margin-left:4px;flex-shrink:0"></span>` : ''}
          <span class="inbox-meta" style="margin-left:auto">R${n.r||'?'} · ${n.y||G.year}</span>
        </div>
        ${exp
          ? `<div class="inbox-body">${preview}<div class="btnrow" style="margin-top:8px">${playerLink}${teamLink}${actionBtn}</div></div>`
          : `<div class="inbox-preview" style="${isUnread?'color:var(--ink)':''}">${preview.length > 120 ? preview.slice(0,120)+'…' : preview}</div>`}
      </div>`;
    };

    const totalUnread = news.filter(n => !n.read).length;
    const unreadBadge = totalUnread > 0
      ? `<span style="background:var(--red);color:#fff;border-radius:10px;font-size:10px;font-weight:700;padding:1px 6px;margin-left:6px">${totalUnread}</span>`
      : '';

    return `<h1 class="page">Inbox${unreadBadge}</h1>
    <p class="page-sub">Post-match reports, club communications, and staff updates.</p>
    <div class="btnrow" style="flex-wrap:wrap;gap:4px;margin-bottom:8px">${catTabs}</div>
    ${totalUnread > 0
      ? `<div style="text-align:right;margin-bottom:6px"><button class="btn sm" onclick="UI._markAllRead()">Mark all as read</button></div>`
      : ''}
    <div style="margin-top:4px">
      ${filtered.length
        ? filtered.map(itemHtml).join('')
        : `<p class="page-sub">No items in this category.</p>`}
    </div>`;
  },

  _markRead(key){
    const n = (G.news || []).find(x => {
      const k = x.createdAt || (x.y+'_'+x.r+'_'+(x.title||''));
      return k == key || String(k) === String(key);
    });
    if(n) n.read = true;
  },

  _markAllRead(){
    (G.news || []).forEach(n => { n.read = true; });
    UI.render();
  },
});
