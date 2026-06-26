'use strict';

Object.assign(UI, {
  p_achievements(){
    const earned = new Map((G.achievements || []).map(a=>[a.key,a]));
    const locked = !!G.achievementsLocked || !!G.godMode;
    const iconMap = {
      premiers:'P', repeat:'2', dynasty:'D', minor:'M', wooden_spoon:'W', perfect_season:'U', grand_final_debut:'GF',
      whitewash:'50', century:'100', shutout:'0', poty_winner:'POY', rookie_winner:'ROY', immortal_player:'I',
      '10_seasons':'10', full_house:'FH', debt_free:'$', bottom_to_top:'BT', upset:'UP'
    };
    const tier = key => ['dynasty','perfect_season','century','immortal_player','bottom_to_top'].includes(key) ? 'gold'
      : ['premiers','repeat','minor','poty_winner','rookie_winner','full_house','debt_free'].includes(key) ? 'silver'
      : 'bronze';
    const when = got => got ? `Unlocked S${got.season || '?'} · ${got.year}${got.round?` · Rd ${got.round}`:''}` : '';
    return `<h1 class="page">Achievements</h1>
    <p class="page-sub">${earned.size} of ${ACHIEVEMENTS.length} unlocked.${locked?' <span style="color:var(--red)">Achievements are locked for this God Mode save.</span>':''}</p>
    <div class="achievement-grid">${ACHIEVEMENTS.map(a=>{
      const got = earned.get(a.key);
      return `<div class="achievement-card ${got?'unlocked':'locked'} ${tier(a.key)}">
        <div class="achievement-icon">${got?(iconMap[a.key]||'A'):'?'}</div>
        <div><h3>${esc(a.name)}</h3>
        <p>${got?esc(a.desc):'Locked achievement'}</p>
        ${got?`<span>${when(got)}</span>`:''}</div>
      </div>`;
    }).join('')}</div>`;
  }
});
