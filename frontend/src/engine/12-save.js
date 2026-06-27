/* ---------- save / load ----------
   Runs against Tauri's Rust commands when packaged as a desktop app
   (window.__TAURI__), and falls back to the old HTTP save API so the
   frontend still works when served in a plain browser during dev.       */

import { G, setG } from './00-state.js';

const _TAURI = (typeof window !== 'undefined' && window.__TAURI__) ? window.__TAURI__ : null;
function _invoke(cmd, args){ return _TAURI.core.invoke(cmd, args || {}); }

export async function listSaves(){
  if(_TAURI){
    try{ return await _invoke('list_saves'); }catch{ return []; }
  }
  try{
    const r = await fetch('/api/saves');
    if(!r.ok) return [];
    return await r.json();
  }catch{ return []; }
}

export async function saveToSlot(slot){
  const meta = {
    savedAt: new Date().toISOString(),
    season:  G.season,
    round:   G.round,
    phase:   G.phase,
    year:    G.year,
    coach:   G.coach.name,
    club:    myTeam().nick,
  };
  const payload = {minto:1, pid:getPid(), G, meta};
  if(_TAURI){
    try{ await _invoke('write_save', {slot, data:payload}); return true; }catch{ return false; }
  }
  try{
    const r = await fetch(`/api/saves/${slot}`, {
      method:  'PUT',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify(payload),
    });
    return r.ok;
  }catch{ return false; }
}

export async function loadFromSlot(slot){
  if(_TAURI){
    try{
      const d = await _invoke('load_save', {slot});
      if(!d || !d.minto || !d.G) return false;
      setG(d.G); setPid(d.pid || 99999);
      return true;
    }catch{ return false; }
  }
  try{
    const r = await fetch(`/api/saves/${slot}`);
    if(!r.ok) return false;
    const d = await r.json();
    if(!d.minto || !d.G) return false;
    setG(d.G); setPid(d.pid || 99999);
    return true;
  }catch{ return false; }
}

export async function deleteSave(slot){
  if(_TAURI){
    try{ await _invoke('delete_save', {slot}); return true; }catch{ return false; }
  }
  try{
    const r = await fetch(`/api/saves/${slot}`, {method:'DELETE'});
    return r.ok;
  }catch{ return false; }
}

export async function autoSave(){
  if(!G) return;
  await saveToSlot('autosave');
}

/* ---------- file export / import (manual backup) ---------- */

export function exportSave(){
  const blob = new Blob([JSON.stringify({minto:1, pid:getPid(), G})], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `minto-save-${G.year}-r${G.round+1}.json`;
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}

export function importSave(file){
  const fr = new FileReader();
  fr.onload = () => {
    try{
      const d = JSON.parse(fr.result);
      if(!d.minto || !d.G) throw new Error('bad file');
      setG(d.G); setPid(d.pid || 99999);
      UI.toast('Save loaded.');
      UI.go('dashboard');
    }catch(e){ UI.toast('Could not read that save file.'); }
  };
  fr.readAsText(file);
}

if (typeof window !== 'undefined') Object.assign(window, {
  listSaves, saveToSlot, loadFromSlot, deleteSave, autoSave, exportSave, importSave,
});
