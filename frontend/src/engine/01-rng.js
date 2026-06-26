'use strict';

/* ---------- RNG & utils ---------- */
let _seed = Date.now() % 2147483647;
function srand(s){ _seed = s % 2147483647; if(_seed<=0) _seed += 2147483646; }
function rnd(){ _seed = _seed * 16807 % 2147483647; return (_seed - 1) / 2147483646; }
function ri(a,b){ return a + Math.floor(rnd()*(b-a+1)); }
function rf(a,b){ return a + rnd()*(b-a); }
function pick(arr){ return arr[Math.floor(rnd()*arr.length)]; }
function gauss(mean, sd){ let u=0,v=0; while(u===0)u=rnd(); while(v===0)v=rnd(); return mean + sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }
function shuffle(a){ const x=a.slice(); for(let i=x.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1)); [x[i],x[j]]=[x[j],x[i]];} return x; }
function poisson(lambda){ let L=Math.exp(-lambda), k=0, p=1; do{ k++; p*=rnd(); }while(p>L); return k-1; }
function currencyCode(){
  return (typeof G !== 'undefined' && G && G.club && G.club.currency === 'GBP') ? 'GBP' : 'AUD';
}
function currencySymbol(){ return currencyCode() === 'GBP' ? '£' : '$'; }
function money(n){
  n = Math.round(Number(n) || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return sign + currencySymbol() + abs.toLocaleString();
}
function esc(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
