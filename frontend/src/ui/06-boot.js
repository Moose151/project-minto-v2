'use strict';

/* ---------- boot ---------- */
if(typeof document !== 'undefined' && document.getElementById('main')){
  listSaves().then(saves => {
    const auto = saves.find(s => s.slot === 'autosave');
    if(auto && auto.meta){
      const m = auto.meta;
      const when = new Date(m.savedAt).toLocaleString();
      const msg = `Restore autosave?\n\n${m.coach}  ·  ${m.club}\nSeason ${m.season}  Round ${m.round}  (${m.phase})\nSaved: ${when}`;
      if(confirm(msg)){
        loadFromSlot('autosave').then(ok => {
          if(ok) UI.go('dashboard');
          else{ UI.render(); UI.toast('Could not restore autosave.'); }
        });
        return;
      }
    }
    UI.render();
  }).catch(() => UI.render());
}
