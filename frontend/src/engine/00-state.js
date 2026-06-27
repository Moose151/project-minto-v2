/* ---------- shared mutable game state ----------
   All engine modules import G (live binding) and call setG() when reassigning.
   setG() also syncs window.G so legacy UI page files can access it as a bare global. */

export let G = null;

export function setG(newG) {
  G = newG;
  if (typeof window !== 'undefined') window.G = G;
}

// Expose on window at module evaluation so later-evaluated modules can use bare G
if (typeof window !== 'undefined') {
  window.G = null;
  window.setG = setG;
}
