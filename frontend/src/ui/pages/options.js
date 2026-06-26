'use strict';

Object.assign(UI, {
  p_options(){
    setTimeout(()=>UI._loadSaveSlots(), 0);
    return `<h1 class="page">Options</h1>
    <div class="grid2">
      <div class="card">
        <h2 class="sec" style="margin-top:0">Saves</h2>
        <div id="save-slots-list"><p style="color:var(--muted);font-size:13px">Loading saves…</p></div>
        <div class="btnrow" style="margin-top:12px">
          ${G?`<button class="btn primary" onclick="UI._saveToSlot()">Save game</button>`:''}
          ${G?`<button class="btn" onclick="exportSave()">Export file</button>`:''}
          <label class="btn" style="display:inline-block;cursor:pointer">Import file<input type="file" accept=".json" style="display:none" onchange="if(this.files[0]) importSave(this.files[0])"></label>
        </div>
      </div>
      <div class="card">
        <h2 class="sec" style="margin-top:0">New career</h2>
        <p style="color:var(--muted);font-size:12px;margin-bottom:10px">Abandons the current save unless you save first.</p>
        <button class="btn danger" onclick="if(confirm('Start a new career? Unsaved progress is lost.')){G=null;UI.wizWorld=null;UI.render();}">Start new career</button>
      </div>
      <div class="card">
        <h2 class="sec" style="margin-top:0">God Mode</h2>
        <p style="color:var(--muted);font-size:12px;margin-bottom:10px">${G && G.godMode ? 'Enabled for this save. Achievements are locked.' : 'Permanently unlocks editor tools for this save and locks achievements.'}</p>
        ${G && G.godMode
          ? `<div class="god-badge" style="display:inline-flex;margin-bottom:12px">God Mode Active</div>
             <div class="field"><label>Salary cap</label><input type="number" value="${G.config.cap}" step="10000" onchange="UI.setGodCap(this.value)"></div>`
          : `<button class="btn danger" onclick="UI.enableGodMode()">Enable God Mode</button>`}
      </div>
    </div>`;
  },

  enableGodMode(){
    if(!G) return;
    if(!confirm('Enable God Mode for this save? This permanently disables achievements for this save.')) return;
    G.godMode = true;
    G.achievementsLocked = true;
    UI.toast('God Mode enabled.');
    UI.render();
  },
  setGodCap(value){
    if(!G || !G.godMode) return;
    const cap = Math.round(clamp(+value || G.config.cap, 1000000, 50000000) / 10000) * 10000;
    G.config.cap = cap;
    UI.toast(`Salary cap set to ${money(cap)}.`);
    UI.render();
  },

  async _loadSaveSlots(){
    const el = document.getElementById('save-slots-list');
    if(!el) return;
    const saves = await listSaves();
    if(!saves.length){
      el.innerHTML = '<p style="color:var(--muted);font-size:13px">No saves yet. Use <strong>Save game</strong> to create one.</p>';
      return;
    }
    el.innerHTML = saves.map(s=>{
      const m = s.meta;
      const isAuto = s.slot === 'autosave';
      const label = m ? `${esc(m.coach)} · ${esc(m.club)} · S${m.season} R${m.round} (${m.phase})` : esc(s.slot);
      const date  = m ? new Date(m.savedAt).toLocaleString() : '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
        <div>
          <span style="font-size:13px;font-weight:600">${isAuto?'Autosave':esc(s.slot)}</span>
          <span style="font-size:12px;color:var(--muted);margin-left:8px">${label}</span>
          ${date?`<div style="font-size:11px;color:var(--dim)">${date}</div>`:''}
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn" style="padding:3px 10px;font-size:12px" onclick="UI._loadSlot('${esc(s.slot)}')">Load</button>
          <button class="btn danger" style="padding:3px 10px;font-size:12px" onclick="UI._deleteSlot('${esc(s.slot)}')">Delete</button>
        </div>
      </div>`;
    }).join('');
  },

  async _saveToSlot(){
    const raw = prompt('Save slot name (letters, numbers, hyphens):', 'slot1');
    if(raw===null) return;
    const slot = raw.trim().replace(/[^a-zA-Z0-9_-]/g,'');
    if(!slot){ UI.toast('Invalid slot name.'); return; }
    UI.toast('Saving…');
    const ok = await saveToSlot(slot);
    if(ok){ UI.toast(`Saved to "${slot}".`); UI._loadSaveSlots(); }
    else UI.toast('Save failed — is the server running?');
  },

  async _loadSlot(slot){
    if(!confirm(`Load "${slot}"? Current progress will be lost unless saved.`)) return;
    const ok = await loadFromSlot(slot);
    if(ok){ UI.toast('Career loaded.'); UI.go('dashboard'); }
    else UI.toast('Could not load that save.');
  },

  async _deleteSlot(slot){
    if(!confirm(`Delete save "${slot}"? This cannot be undone.`)) return;
    const ok = await deleteSave(slot);
    if(ok){ UI.toast(`"${slot}" deleted.`); UI._loadSaveSlots(); }
    else UI.toast('Delete failed.');
  },
});
