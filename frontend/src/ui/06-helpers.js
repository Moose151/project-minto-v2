'use strict';

/* ---------- helpers ---------- */
function ovrCls(v){ return v>=78?'elite':v>=68?'good':v>=58?'avg':'poor'; }
function contrastText(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (r*.299+g*.587+b*.114) > 150 ? '#1A1A1A' : '#F4F2EA';
}
