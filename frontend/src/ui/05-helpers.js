'use strict';

/* ---------- helpers ---------- */
const NRL_POS_ORDER = ['FB','WG','CE','FE','HB','PR','HK','SR','LK'];
function nrlPosIdx(p){ const i = NRL_POS_ORDER.indexOf(p.pos); return i === -1 ? 99 : i; }
function nrlSort(a, b){ return nrlPosIdx(a) - nrlPosIdx(b) || b.ovr - a.ovr; }

function ovrCls(v){ return v>=78?'elite':v>=68?'good':v>=58?'avg':'poor'; }
function formCls(v){ return v>=72?'var(--green)':v>=56?'var(--brass)':v<40?'var(--red)':'var(--muted)'; }
function formText(p){ return Math.round(p && p.form != null ? p.form : 50); }
function formHtml(p){
  const v = formText(p);
  const label = v>=72 ? 'Hot' : v>=56 ? 'Good' : v<40 ? 'Cold' : 'Steady';
  return `<span style="color:${formCls(v)};font-weight:700" title="Form/confidence: ${label}">${v}</span>`;
}
function scoutConfCls(conf){ return conf==='High'?'scout-high':conf==='Med'?'scout-med':'scout-low'; }
function contrastText(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (r*.299+g*.587+b*.114) > 150 ? '#1A1A1A' : '#F4F2EA';
}
function scoutingAbility(){
  if(!G || !G.coach) return 45;
  if(G.staff && G.staff.scouting != null) return clamp(G.staff.scouting, 20, 99);
  const a = G.coach.attrs || {};
  return clamp((G.coach.rep || 30)*0.25 + (a.development || 42)*0.45 + (a.tactics || 42)*0.15 + (a.manMgmt || 42)*0.15, 20, 99);
}
function scoutedPotential(p){
  const t = G && G.teams ? G.teams.find(t=>t.players.includes(p.id)) : null;
  const isMine = t && G.coach && t.id === G.coach.teamId;
  const onShortlist = G && G.coach && (G.coach.shortlist || []).includes(p.id);
  let ability = scoutingAbility() + (isMine ? 15 : 0) + (onShortlist ? 6 : 0);
  if(p.s && p.s.g >= 8) ability += 5;
  ability = clamp(ability, 20, 99);
  const ageNoise = p.age <= 19 ? 5 : p.age <= 22 ? 3 : p.age <= 25 ? 1 : -1;
  const outsideNoise = isMine ? 0 : 3;
  const width = Math.round(clamp(17 - ability/8 + ageNoise + outsideNoise, 2, 18));
  const bias = p.scoutBias == null ? 0 : p.scoutBias;
  const center = clamp(p.pot + Math.round((bias/100) * width * 0.9), p.ovr, 97);
  const low = clamp(center - Math.ceil(width/2), p.ovr, 97);
  const high = clamp(center + Math.floor(width/2), low, 97);
  const conf = width <= 5 ? 'High' : width <= 9 ? 'Med' : 'Low';
  return {low, high, mid:Math.round((low+high)/2), confidence:conf, width};
}
/* Single mid value for POT — confidence is shown via colour */
function potText(p){
  return String(scoutedPotential(p).mid);
}
function potHtml(p){
  const s = scoutedPotential(p);
  return `<span class="${scoutConfCls(s.confidence)}" title="Estimated potential: ${s.confidence} confidence">${s.mid}</span>`;
}
function scoutedOvr(p){
  const t = G && G.teams ? G.teams.find(t=>t.players.includes(p.id)) : null;
  const isMine = t && G.coach && t.id === G.coach.teamId;
  const onShortlist = G && G.coach && (G.coach.shortlist || []).includes(p.id);
  let ability = scoutingAbility() + (isMine ? 20 : 0) + (onShortlist ? 6 : 0);
  ability = clamp(ability, 20, 99);
  const width = Math.round(clamp(13 - ability/10 + (isMine ? -3 : 3), 1, 14));
  const bias = p.scoutBias == null ? 0 : p.scoutBias;
  const center = clamp(p.ovr + Math.round((bias/100)*width*.7), 20, 99);
  const low = clamp(center - Math.ceil(width/2), 20, 99);
  const high = clamp(center + Math.floor(width/2), low, 99);
  return {low, high, mid:Math.round((low+high)/2), confidence:width<=4?'High':width<=8?'Med':'Low'};
}
/* Single mid value — confidence shown via colour */
function ovrText(p){
  const s = scoutedOvr(p);
  return String(s.mid);
}
/* Confidence-coloured OVR span */
function ovrHtml(p){
  const t = G && G.teams ? G.teams.find(t=>t.players.includes(p.id)) : null;
  const isMine = t && G.coach && t.id === G.coach.teamId;
  if(isMine) return `<span class="ovr ${ovrCls(p.ovr)}">${p.ovr}</span>`;
  const s = scoutedOvr(p);
  return `<span class="ovr ${ovrCls(s.mid)} ${scoutConfCls(s.confidence)}" title="Est. OVR — ${s.confidence} confidence (scouted)">${s.mid}</span>`;
}
/* Confidence-coloured attribute value for non-my-team players */
function scoutAttrHtml(p, attrKey, actualVal){
  const t = G && G.teams ? G.teams.find(t=>t.players.includes(p.id)) : null;
  const isMine = t && G.coach && t.id === G.coach.teamId;
  if(isMine) return String(actualVal);
  const s = scoutedOvr(p);
  return `<span class="${scoutConfCls(s.confidence)}" title="${s.confidence} confidence">${actualVal}</span>`;
}
function teamRatings(t){
  const ids = (t.lineup || []).slice(0,17).filter(id=>G.players[id]);
  const pool = (ids.length >= 13 ? ids : t.players.slice())
    .map(id=>G.players[id])
    .filter(Boolean)
    .sort((a,b)=>b.ovr-a.ovr)
    .slice(0,17);
  const avg = (fn, fallback) => Math.round(pool.length ? pool.reduce((s,p)=>s+fn(p),0)/pool.length : fallback);
  const atk = avg(p => p.attrs.playmaking*.18 + p.attrs.ballRunning*.18 + p.attrs.finishing*.13 + p.attrs.shortPass*.12 + p.attrs.longPass*.08 + p.attrs.vision*.10 + p.attrs.decisionMaking*.10 + p.attrs.ballSecurity*.06 + p.attrs.speed*.05, 50);
  const def = avg(p => p.attrs.tackling*.25 + p.attrs.defRead*.22 + p.attrs.markerDef*.13 + p.attrs.lastDitch*.13 + p.attrs.workRate*.12 + p.attrs.strength*.08 + p.attrs.bigHit*.07, 50);
  const coh = Math.round(t.cohesion == null ? 50 : t.cohesion);
  const overall = Math.round(atk*.38 + def*.38 + coh*.24);
  return {overall, atk, def, coh};
}
function scoutedTeamRating(t, key){
  const exact = teamRatings(t)[key];
  const isMine = G && G.coach && t.id === G.coach.teamId;
  if(isMine) return {low:exact, high:exact, mid:exact, confidence:'High', cls:'scout-high', text:String(exact)};
  const ability = scoutingAbility();
  const width = Math.round(clamp(20 - ability/6, 3, 17));
  const bias = ((t.id * 47 + key.length * 19) % 101) - 50;
  const center = clamp(exact + Math.round((bias/50)*width*.55), 20, 99);
  const low = clamp(center - Math.ceil(width/2), 20, 99);
  const high = clamp(center + Math.floor(width/2), low, 99);
  const confidence = width <= 6 ? 'High' : width <= 11 ? 'Med' : 'Low';
  // Return single mid value, confidence communicated via colour class
  return {low, high, mid:Math.round((low+high)/2), confidence, cls:confidence==='High'?'scout-high':confidence==='Med'?'scout-med':'scout-low', text:String(Math.round((low+high)/2))};
}
function teamRatingPill(t, key, label){
  const r = scoutedTeamRating(t, key);
  return `<span class="team-rating ${r.cls}" title="${label}: ${r.confidence} scouting confidence">${esc(label)} ${r.text}</span>`;
}
function clubPrestigeBadge(t, compact){
  if(!t || typeof clubPrestigeTier !== 'function') return '';
  const tier = clubPrestigeTier(t);
  return `<span class="prestige-badge prestige-${tier.key}" title="${esc(tier.label)} · prestige ${tier.score}">${esc(tier.icon)}${compact?'':` ${esc(tier.label)}`}</span>`;
}
function teamLogo(t, size){
  if(!t) return '';
  size = size || 42;
  if(typeof ensureTeamLogo === 'function') ensureTeamLogo(t);
  const logo = t.logo || {};
  const c1 = t.c1 || '#58616D';
  const c2 = t.c2 || '#D8D8D8';
  const letters = esc((logo.letters || t.abbr || 'TM').slice(0,3).toUpperCase());
  const shape = logo.shape || 'shield';
  const stripe = Number(logo.stripe || 0);
  const ink = contrastText(c1);
  // Determine a third accent colour (lightened or darkened c2 for detail work)
  const accent = c2;

  // Shape paths — each fills the main crest area
  const shapes = {
    shield: {
      outer: `<path d="M12 8 H68 Q72 8 72 12 L72 42 Q72 58 40 74 Q8 58 8 42 L8 12 Q8 8 12 8 Z" fill="${c1}" stroke="${accent}" stroke-width="3"/>`,
      inner: `<path d="M19 14 H61 Q64 14 64 17 L64 41 Q64 54 40 67 Q16 54 16 41 L16 17 Q16 14 19 14 Z" fill="none" stroke="${accent}" stroke-width="1.5" opacity=".5"/>`,
    },
    round: {
      outer: `<circle cx="40" cy="40" r="32" fill="${c1}" stroke="${accent}" stroke-width="3"/><circle cx="40" cy="40" r="27" fill="none" stroke="${accent}" stroke-width="1.5" opacity=".5"/>`,
      inner: '',
    },
    diamond: {
      outer: `<path d="M40 6 L74 40 L40 74 L6 40 Z" fill="${c1}" stroke="${accent}" stroke-width="3"/>`,
      inner: `<path d="M40 14 L66 40 L40 66 L14 40 Z" fill="none" stroke="${accent}" stroke-width="1.5" opacity=".5"/>`,
    },
    hex: {
      outer: `<path d="M22 8 H58 L76 40 L58 72 H22 L4 40 Z" fill="${c1}" stroke="${accent}" stroke-width="3"/>`,
      inner: `<path d="M26 14 H54 L70 40 L54 66 H26 L10 40 Z" fill="none" stroke="${accent}" stroke-width="1.5" opacity=".5"/>`,
    },
  };
  const sh = shapes[shape] || shapes.shield;

  // Stripe decorations
  let stripeSvg = '';
  if(stripe === 1){
    // diagonal slash
    stripeSvg = `<path d="M26 60 L54 18" stroke="${accent}" stroke-width="7" stroke-linecap="round" opacity=".45"/>`;
  } else if(stripe === 2){
    // double horizontal bands
    stripeSvg = `<path d="M14 33 H66" stroke="${accent}" stroke-width="6" stroke-linecap="round" opacity=".4"/>
                 <path d="M14 47 H66" stroke="${accent}" stroke-width="4" stroke-linecap="round" opacity=".35"/>`;
  } else {
    // vertical centre stripe
    stripeSvg = `<path d="M40 10 V70" stroke="${accent}" stroke-width="8" stroke-linecap="round" opacity=".35"/>`;
  }

  // Clip to the shape so stripes don't bleed outside
  const clipId = `lc${(t.id||0)}_${size}`;
  const clipPaths = {
    shield: `<path d="M12 8 H68 Q72 8 72 12 L72 42 Q72 58 40 74 Q8 58 8 42 L8 12 Q8 8 12 8 Z"/>`,
    round:  `<circle cx="40" cy="40" r="32"/>`,
    diamond:`<path d="M40 6 L74 40 L40 74 L6 40 Z"/>`,
    hex:    `<path d="M22 8 H58 L76 40 L58 72 H22 L4 40 Z"/>`,
  };

  const fontSize = letters.length > 2 ? 19 : letters.length > 1 ? 22 : 26;

  return `<svg class="team-logo" width="${size}" height="${size}" viewBox="0 0 80 80" role="img" aria-label="${esc(typeof teamName==='function'?teamName(t):(t.nick||''))} logo" style="vertical-align:middle;flex:0 0 auto">
    <defs>
      <clipPath id="${clipId}">${clipPaths[shape] || clipPaths.shield}</clipPath>
      <filter id="sh${clipId}" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="rgba(0,0,0,.55)"/>
      </filter>
    </defs>
    <rect width="80" height="80" rx="16" fill="#0D1117"/>
    ${sh.outer}
    <g clip-path="url(#${clipId})">${stripeSvg}</g>
    ${sh.inner}
    <text x="40" y="${shape==='diamond'?44:46}" text-anchor="middle" dominant-baseline="middle"
      font-family="Arial Black, Arial, sans-serif" font-size="${fontSize}" font-weight="900"
      fill="${ink}" filter="url(#sh${clipId})" letter-spacing="-0.5">${letters}</text>
  </svg>`;
}
function playerTierBadge(p, compact){
  if(!p) return '';
  const tier = playerTier(p.ovr || 0);
  return `<span class="player-tier-badge tier-${tier.key}" title="${esc(tier.label)}">${compact?esc(tier.label.split(' ').map(x=>x[0]).join('')):esc(tier.label)}</span>`;
}
function nationalityFlag(country){
  return {
    'Australia':        '🇦🇺',
    'New Zealand':      '🇳🇿',
    'Tonga':            '🇹🇴',
    'Samoa':            '🇼🇸',
    'Papua New Guinea': '🇵🇬',
    'England':          '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Fiji':             '🇫🇯',
    'Cook Islands':     '🇨🇰',
    'Lebanon':          '🇱🇧',
  }[country] || '🏉';
}
function repChip(team){
  if(!team) return '';
  const key = String(team).toLowerCase().replace(/[^a-z]+/g,'-');
  return `<span class="rep-chip rep-${key}">${esc(team)}</span>`;
}
Object.assign(UI, {
  showSigningCeremony(p, opts){
    if(!p) return;
    opts = opts || {};
    const t = opts.team || myTeam();
    const kind = opts.kind || 'Signing';
    const salary = opts.salary == null ? contractAvg(p) : opts.salary;
    const years = opts.years == null ? (p.years || 1) : opts.years;
    const total = opts.total == null ? (salary * Math.max(1, years)) : opts.total;
    const structure = opts.structure || contractTypeLabel(p.contractType || 'flat');
    const role = opts.role || (p.promises ? promiseSummary(p) : 'No promises');
    const tone = opts.tone || 'var(--brass)';
    const sub = opts.sub || `${years} year${years===1?'':'s'} · ${money(salary)} avg/yr`;
    UI.modal(`<div style="text-align:center;padding:4px 0 2px">
      <div style="font-size:11px;color:${tone};font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px">${esc(kind)}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;margin-bottom:12px">
        ${teamLogo(t,56)}
        <div style="width:78px;height:78px;border-radius:50%;background:linear-gradient(135deg,rgba(210,165,62,.18),rgba(255,255,255,.04));display:flex;align-items:center;justify-content:center;border:1px solid rgba(210,165,62,.45)">${playerAvatar(p,62)}</div>
      </div>
      <h3 style="margin:0 0 4px;font-size:24px">${esc(p.name)}</h3>
      <p class="page-sub" style="margin:0 0 14px">${esc(t.nick)} · ${p.pos}${p.pos2?'/'+p.pos2:''} · Age ${p.age} · OVR ${p.ovr}</p>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;text-align:left;margin:0 0 12px">
        <div class="card" style="padding:10px"><div style="font-size:10px;color:var(--muted)">Terms</div><div style="font-weight:800;font-family:var(--disp);font-size:20px">${esc(sub)}</div></div>
        <div class="card" style="padding:10px"><div style="font-size:10px;color:var(--muted)">Total Value</div><div style="font-weight:800;font-family:var(--disp);font-size:20px">${money(total)}</div></div>
        <div class="card" style="padding:10px"><div style="font-size:10px;color:var(--muted)">Structure</div><div style="font-weight:800;font-family:var(--disp);font-size:20px">${esc(structure)}</div></div>
      </div>
      <p style="font-size:12px;color:var(--muted);margin:0 0 12px">${esc(role)}</p>
      <div class="btnrow" style="justify-content:center">
        <button class="btn primary" onclick="UI.closeModal();UI.go('${opts.nextPage || 'squad'}')">${esc(opts.nextLabel || 'View squad')}</button>
        <button class="btn" onclick="UI.closeModal();UI.playerModal(${p.id})">Player profile</button>
        <button class="btn" onclick="UI.closeModal()">Close</button>
      </div>
    </div>`);
  }
});
function stateRepChip(state){
  if(!state) return '';
  const key = String(state).toLowerCase().replace(/[^a-z]+/g,'-');
  return `<span class="state-chip state-${key}">${esc(state)}</span>`;
}
function nationalityChip(p){
  if(!p || !p.nationality) return '';
  return `<span class="nat-chip" title="${esc(p.nationality)}">${nationalityFlag(p.nationality)} ${esc(p.nationality)}</span>`;
}
function playerRepLine(p){
  if(!p) return '';
  const bits = [
    nationalityChip(p),
    repChip(p.repTeam),
    stateRepChip(p.stateRep),
    p.indigenous ? stateRepChip('Indigenous All Stars') : '',
    p.maori ? stateRepChip('Maori All Stars') : '',
  ].filter(Boolean);
  return bits.length ? `<div class="rep-row">${bits.join('')}</div>` : '';
}
function playerAvatar(p, size){
  if(!p) return '';
  size = size || 42;
  if(!p.face) p.face = genPlayerFace(p);
  const t = G && G.teams ? G.teams.find(tm=>tm.players.includes(p.id)) : null;
  const c1 = t ? t.c1 : '#58616D';
  const c2 = t ? (t.c2 || '#D8D8D8') : '#D8D8D8';
  const f = p.face;

  // Head shape — kept modest to leave room for hair above and body below
  const hRx = f.headShape === 'square' ? 13 : f.headShape === 'long' ? 11 : 14;
  const hRy = f.headShape === 'long' ? 17 : f.headShape === 'square' ? 13 : 15;
  const headCy = 36;
  const topY = headCy - hRy;    // top of head
  const botY = headCy + hRy;    // bottom of head / neck start

  // Eyes — large so they're visible at 26px display size
  const eyeY = headCy - 2;
  const eyeRx = 5, eyeRy = 2.5;

  // Eyebrows — thick strokes, angled for character
  const browY = eyeY - 6;
  const brows = f.eyeShape === 'wide'
    ? `<line x1="27" y1="${browY+2}" x2="36" y2="${browY-1}" stroke="#1A1008" stroke-width="3" stroke-linecap="round"/>
       <line x1="44" y1="${browY-1}" x2="53" y2="${browY+2}" stroke="#1A1008" stroke-width="3" stroke-linecap="round"/>`
    : `<line x1="27" y1="${browY}" x2="37" y2="${browY+1}" stroke="#1A1008" stroke-width="2.5" stroke-linecap="round"/>
       <line x1="43" y1="${browY+1}" x2="53" y2="${browY}" stroke="#1A1008" stroke-width="2.5" stroke-linecap="round"/>`;

  // Mouth
  const mouthY = headCy + 9;
  const mouth = f.mouthShape === 'smile'
    ? `<path d="M33 ${mouthY} Q40 ${mouthY+5} 47 ${mouthY}" fill="none" stroke="#7A3030" stroke-width="2.5" stroke-linecap="round"/>`
    : f.mouthShape === 'stern'
      ? `<line x1="33" y1="${mouthY+1}" x2="47" y2="${mouthY+1}" stroke="#7A3030" stroke-width="2.5" stroke-linecap="round"/>`
      : `<path d="M34 ${mouthY} Q40 ${mouthY+2} 46 ${mouthY}" fill="none" stroke="#7A3030" stroke-width="2.5" stroke-linecap="round"/>`;

  // Facial hair — thick shape below mouth, visible at small sizes
  const facialHair = f.facialHair && (p.age || 24) >= 22
    ? `<path d="M31 ${mouthY+1} Q40 ${mouthY+9} 49 ${mouthY+1}" fill="${f.hair || '#2A1400'}" opacity=".55"/>`
    : '';

  // Hair — designed to be clear bold shapes at small sizes
  const hc = f.hair || '#2A1800';
  const hair = f.hairStyle === 'bald' ? ''
    : f.hairStyle === 'curly'
      ? `<ellipse cx="40" cy="${topY+1}" rx="${hRx+4}" ry="10" fill="${hc}"/>
         <circle cx="${40-hRx}" cy="${topY+7}" r="8" fill="${hc}"/>
         <circle cx="${40+hRx}" cy="${topY+7}" r="8" fill="${hc}"/>`
    : f.hairStyle === 'mohawk'
      ? `<rect x="36" y="${topY-11}" width="8" height="15" rx="3" fill="${hc}"/>`
    : f.hairStyle === 'dreadlocks'
      ? `<path d="M${40-hRx} ${topY+6} Q40 ${topY-4} ${40+hRx} ${topY+6} Z" fill="${hc}"/>
         <line x1="26" y1="${topY+7}" x2="20" y2="${botY+12}" stroke="${hc}" stroke-width="5" stroke-linecap="round"/>
         <line x1="32" y1="${topY+2}" x2="27" y2="${botY+16}" stroke="${hc}" stroke-width="4" stroke-linecap="round"/>
         <line x1="48" y1="${topY+2}" x2="53" y2="${botY+16}" stroke="${hc}" stroke-width="4" stroke-linecap="round"/>
         <line x1="54" y1="${topY+7}" x2="60" y2="${botY+12}" stroke="${hc}" stroke-width="5" stroke-linecap="round"/>`
    : f.hairStyle === 'ponytail'
      ? `<path d="M${40-hRx} ${topY+5} Q40 ${topY-5} ${40+hRx} ${topY+5} L${40+hRx} ${topY+10} Q40 ${topY+2} ${40-hRx} ${topY+10} Z" fill="${hc}"/>
         <path d="M${40+hRx-1} ${topY+9} Q${40+hRx+14} ${headCy} ${40+hRx+5} ${botY+4}" stroke="${hc}" stroke-width="6" fill="none" stroke-linecap="round"/>`
    : /* short / fade / crop — a solid cap shape */
      `<path d="M${40-hRx} ${topY+6} Q${40-hRx} ${topY-4} 40 ${topY-3} Q${40+hRx} ${topY-4} ${40+hRx} ${topY+6} L${40+hRx} ${topY+10} Q40 ${topY+4} ${40-hRx} ${topY+10} Z" fill="${hc}"/>`;

  // Body / jersey — simple trapezoid, team colours, bold enough to read
  const bw = f.bodyShape === 'power' ? 50 : f.bodyShape === 'lean' ? 36 : 43;
  const neckBot = botY - 1;
  const jerseyBody = `<path d="M${40-6} ${neckBot} L${40-bw/2} ${neckBot+8} L${40-bw/2} 82 L${40+bw/2} 82 L${40+bw/2} ${neckBot+8} L${40+6} ${neckBot} Z" fill="${c1}"/>`;
  const stripe = `<path d="M${40-bw/6} ${neckBot+9} L${40-bw/6+1} 82 L${40+bw/6-1} 82 L${40+bw/6} ${neckBot+9} Z" fill="${c2}" opacity=".6"/>`;

  return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 80 80" role="img" aria-label="${esc(p.name)} avatar">
    <rect width="80" height="80" rx="${size>38?13:9}" fill="#13171E"/>
    ${jerseyBody}
    ${stripe}
    <ellipse cx="40" cy="${headCy}" rx="${hRx}" ry="${hRy}" fill="${f.skin}"/>
    ${hair}
    ${brows}
    <ellipse cx="33" cy="${eyeY}" rx="${eyeRx}" ry="${eyeRy}" fill="#111"/>
    <ellipse cx="47" cy="${eyeY}" rx="${eyeRx}" ry="${eyeRy}" fill="#111"/>
    <ellipse cx="31.5" cy="${eyeY-1}" rx="2.2" ry="1.3" fill="rgba(255,255,255,.38)"/>
    <ellipse cx="45.5" cy="${eyeY-1}" rx="2.2" ry="1.3" fill="rgba(255,255,255,.38)"/>
    ${mouth}
    ${facialHair}
  </svg>`;
}
