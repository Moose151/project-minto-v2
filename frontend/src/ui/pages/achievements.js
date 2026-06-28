import { UI } from "../01-core.js";


Object.assign(UI, {
  p_achievements(){
    const earned = new Map((G.achievements || []).map(a => [a.key, a]));
    const locked = !!G.achievementsLocked || !!G.godMode;
    const totalSeasons = (G.coach.history || []).length;
    const funds = (G.club || {}).funds || 0;
    const prems = G.coach.prems || 0;

    // Progress hints for trackable locked achievements
    const progress = {
      '10_seasons': totalSeasons < 10 ? `${totalSeasons}/10 seasons` : null,
      'debt_free': funds < 5000000 ? `${money(Math.max(0, funds))} / $5M` : null,
      'premiers': null,
      'dynasty': prems >= 1 && prems < 3 ? `${prems} consecutive prem${prems > 1 ? 's' : ''}` : null,
      'repeat': prems >= 1 ? null : 'Win a first premiership',
    };

    const TIER_DATA = {
      gold:   { label: 'Gold', color: '#FFD700', bg: 'rgba(255,215,0,.10)', border: 'rgba(255,215,0,.35)' },
      silver: { label: 'Silver', color: '#C0C0C0', bg: 'rgba(192,192,192,.08)', border: 'rgba(192,192,192,.30)' },
      bronze: { label: 'Bronze', color: '#CD7F32', bg: 'rgba(205,127,50,.08)', border: 'rgba(205,127,50,.25)' },
    };

    const tierOf = key => {
      if(['dynasty','perfect_season','century','immortal_player','bottom_to_top','scouting_star'].includes(key)) return 'gold';
      if(['premiers','repeat','minor','poty_winner','rookie_winner','full_house','debt_free','comeback'].includes(key)) return 'silver';
      return 'bronze';
    };

    const CATEGORY = {
      'Season Success':  ['premiers','repeat','dynasty','minor','wooden_spoon','perfect_season','grand_final_debut'],
      'Match Feats':     ['whitewash','century','shutout','comeback','upset'],
      'Club Milestones': ['10_seasons','full_house','debt_free','bottom_to_top'],
      'Player Talent':   ['poty_winner','rookie_winner','immortal_player','scouting_star'],
    };

    const ICON = {
      premiers:'🏆', repeat:'🔁', dynasty:'👑', minor:'🥇', wooden_spoon:'🥄',
      perfect_season:'⚡', grand_final_debut:'🌟', whitewash:'💥', century:'💯',
      shutout:'🔒', poty_winner:'🏅', rookie_winner:'🌱', immortal_player:'⭐',
      '10_seasons':'📅', full_house:'🏟', debt_free:'💰', bottom_to_top:'🔥',
      upset:'🎯', comeback:'⚔️', scouting_star:'🔭',
    };

    const when = got => {
      if(!got) return '';
      const parts = [`S${got.season || '?'}`, got.year].filter(Boolean);
      if(got.round) parts.push(`Rd ${got.round}`);
      return parts.join(' · ');
    };

    const achievementCard = a => {
      const got = earned.get(a.key);
      const tier = tierOf(a.key);
      const td = TIER_DATA[tier];
      const hint = progress[a.key];
      const icon = ICON[a.key] || '★';
      const whenStr = when(got);

      return `<div style="display:flex;gap:14px;align-items:flex-start;padding:12px 14px;border-radius:10px;border:1px solid ${got ? td.border : 'var(--line)'};background:${got ? td.bg : 'transparent'};${!got ? 'opacity:0.65' : ''}">
        <div style="font-size:28px;width:36px;text-align:center;flex-shrink:0;filter:${got ? 'none' : 'grayscale(1)'}">${icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <b style="font-size:13px;${got ? `color:${td.color}` : 'color:var(--ink)'}">${esc(a.name)}</b>
            <span style="font-size:10px;font-weight:700;color:${td.color};text-transform:uppercase;letter-spacing:.06em">${td.label}</span>
            ${got ? `<span style="font-size:10px;color:var(--muted)">${whenStr}</span>` : ''}
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:3px">${esc(a.desc)}</div>
          ${hint && !got ? `<div style="font-size:11px;color:var(--accent);margin-top:4px">${esc(hint)}</div>` : ''}
        </div>
        ${got ? `<div style="font-size:20px;color:${td.color};flex-shrink:0">✓</div>` : ''}
      </div>`;
    };

    // Build a set of achievements by key for quick lookup
    const achieveMap = new Map(ACHIEVEMENTS.map(a => [a.key, a]));

    const categoryHtml = Object.entries(CATEGORY).map(([catName, keys]) => {
      const achList = keys.map(k => achieveMap.get(k)).filter(Boolean);
      const catEarned = achList.filter(a => earned.has(a.key)).length;
      return `<div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <h2 class="sec" style="margin:0">${esc(catName)}</h2>
          <span style="font-size:11px;color:${catEarned===achList.length?'var(--green)':'var(--muted)'}">${catEarned}/${achList.length}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${achList.map(achievementCard).join('')}
        </div>
      </div>`;
    }).join('');

    const goldCount   = ACHIEVEMENTS.filter(a => tierOf(a.key) === 'gold'   && earned.has(a.key)).length;
    const silverCount = ACHIEVEMENTS.filter(a => tierOf(a.key) === 'silver' && earned.has(a.key)).length;
    const bronzeCount = ACHIEVEMENTS.filter(a => tierOf(a.key) === 'bronze' && earned.has(a.key)).length;
    const goldTotal   = ACHIEVEMENTS.filter(a => tierOf(a.key) === 'gold').length;
    const silverTotal = ACHIEVEMENTS.filter(a => tierOf(a.key) === 'silver').length;
    const bronzeTotal = ACHIEVEMENTS.filter(a => tierOf(a.key) === 'bronze').length;

    return `<h1 class="page">Achievements</h1>
    <p class="page-sub">${earned.size} of ${ACHIEVEMENTS.length} unlocked${locked ? ' · <span style="color:var(--red)">Locked in God Mode saves</span>' : ''}</p>
    <div class="dash-strip" style="margin-bottom:18px">
      <div class="dash-status"><div class="dash-label" style="color:#FFD700">Gold</div><div class="dash-value">${goldCount}/${goldTotal}</div></div>
      <div class="dash-status"><div class="dash-label" style="color:#C0C0C0">Silver</div><div class="dash-value">${silverCount}/${silverTotal}</div></div>
      <div class="dash-status"><div class="dash-label" style="color:#CD7F32">Bronze</div><div class="dash-value">${bronzeCount}/${bronzeTotal}</div></div>
      <div class="dash-status"><div class="dash-label">Seasons</div><div class="dash-value">${totalSeasons}</div></div>
      <div class="dash-status"><div class="dash-label">Premierships</div><div class="dash-value">${prems}</div></div>
    </div>
    <div class="grid2">
      <div>${Object.keys(CATEGORY).filter((_,i) => i % 2 === 0).map(cat => {
        const keys = CATEGORY[cat];
        const achList = keys.map(k => achieveMap.get(k)).filter(Boolean);
        const catEarned = achList.filter(a => earned.has(a.key)).length;
        return `<div style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <h2 class="sec" style="margin:0">${esc(cat)}</h2>
            <span style="font-size:11px;color:${catEarned===achList.length?'var(--green)':'var(--muted)'}">${catEarned}/${achList.length}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">${achList.map(achievementCard).join('')}</div>
        </div>`;
      }).join('')}</div>
      <div>${Object.keys(CATEGORY).filter((_,i) => i % 2 === 1).map(cat => {
        const keys = CATEGORY[cat];
        const achList = keys.map(k => achieveMap.get(k)).filter(Boolean);
        const catEarned = achList.filter(a => earned.has(a.key)).length;
        return `<div style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <h2 class="sec" style="margin:0">${esc(cat)}</h2>
            <span style="font-size:11px;color:${catEarned===achList.length?'var(--green)':'var(--muted)'}">${catEarned}/${achList.length}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">${achList.map(achievementCard).join('')}</div>
        </div>`;
      }).join('')}</div>
    </div>`;
  }
});
