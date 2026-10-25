/* 小屋房間飾品與背景樣式的「美術」hero-decor.js（只有小屋 index.html 會載入）
   座標都是小屋 SVG 的座標（1600×900）。想新增飾品：
   ① 在 hero-items.js 的 decor 清單加一筆（id、slot、名稱、價格）
   ② 在這裡的 art 加上同一個 id 的 { vb:[x,y,寬,高]（縮圖範圍）, svg:'…' } */
(function(){
'use strict';
const cyc=(arr,i)=>arr[i%arr.length];

/* 左右各一條垂下來的彩帶曲線上的點 */
function festoon(x0,x1,y0,sag,n){const a=[];for(let i=0;i<=n;i++){const t=i/n;a.push([x0+(x1-x0)*t,y0+sag*4*t*(1-t)])}return a}
const FES=[festoon(-10,630,12,48,16),festoon(970,1610,12,48,16)];
function stringPath(p){return 'M'+p.map(q=>q[0].toFixed(0)+' '+q[1].toFixed(0)).join(' L')}

/* ---------- 窗簾 ---------- */
function curtain(c1,c2,dots){
 const side=(m)=>{const X=x=>m?1600-x:x;
  return `<path d="M${X(548)} 86 H${X(662)} Q${X(640)} 170 ${X(654)} 250 Q${X(640)} 300 ${X(664)} 334 L${X(548)} 334Z" fill="${c1}" stroke="${c2}" stroke-width="4"/>
  <path d="M${X(578)} 92 Q${X(590)} 210 ${X(574)} 330 M${X(610)} 92 Q${X(626)} 210 ${X(612)} 330 M${X(640)} 96 Q${X(650)} 210 ${X(640)} 330" stroke="${c2}" stroke-width="3" fill="none" opacity=".55"/>
  <rect x="${m?X(668):548}" y="240" width="120" height="16" rx="8" fill="${c2}" opacity=".9"/>
  ${dots?[[580,130],[620,170],[590,210],[630,290],[580,300],[604,350]].map(d=>`<circle cx="${X(d[0])}" cy="${d[1]-20}" r="6" fill="#fff" opacity=".85"/>`).join(''):''}`};
 return `<rect x="528" y="76" width="544" height="12" rx="6" fill="#7a4518"/><circle cx="528" cy="82" r="10" fill="#d99a00"/><circle cx="1072" cy="82" r="10" fill="#d99a00"/>${side(0)}${side(1)}`}

/* ---------- 寵物 ---------- */
const PET=(inner)=>`<g transform="translate(560,734)"><ellipse cx="0" cy="2" rx="48" ry="8" fill="#0003"/><g class="petbob">${inner}</g></g>`;
const pets={
 pet_cat:PET(`<g class="tail"><path d="M30 -22 Q74 -30 64 -78" fill="none" stroke="#f0a35e" stroke-width="13" stroke-linecap="round"/></g>
  <ellipse cx="0" cy="-28" rx="38" ry="28" fill="#f0a35e"/><rect x="-26" y="-12" width="14" height="14" rx="6" fill="#e48b42"/><rect x="10" y="-12" width="14" height="14" rx="6" fill="#e48b42"/>
  <circle cx="-14" cy="-62" r="27" fill="#f0a35e"/><path d="M-36 -78 L-33 -104 L-16 -86Z M8 -86 L14 -104 L22 -78Z" fill="#f0a35e"/><path d="M-32 -82 L-31 -96 L-22 -86Z M12 -86 L15 -96 L19 -82Z" fill="#ffb3b3"/>
  <path d="M-14 -88 v8 M-22 -86 v7 M-6 -86 v7" stroke="#d9772b" stroke-width="3" stroke-linecap="round"/>
  <circle cx="-24" cy="-64" r="4.5" fill="#222"/><circle cx="-4" cy="-64" r="4.5" fill="#222"/><circle cx="-23" cy="-65.5" r="1.5" fill="#fff"/><circle cx="-3" cy="-65.5" r="1.5" fill="#fff"/>
  <path d="M-17 -55 l3 4 l3 -4Z" fill="#ff7a8a"/><path d="M-14 -51 v3 M-14 -48 q-5 3 -9 0 M-14 -48 q5 3 9 0" stroke="#7a3b10" stroke-width="2" fill="none"/>
  <path d="M-40 -58 h-14 M-40 -52 l-13 4 M10 -58 h14 M10 -52 l13 4" stroke="#fff" stroke-width="2" opacity=".8"/>`),
 pet_dog:PET(`<g class="tail"><path d="M34 -30 Q62 -40 60 -66" fill="none" stroke="#b9772f" stroke-width="12" stroke-linecap="round"/></g>
  <ellipse cx="0" cy="-30" rx="40" ry="28" fill="#c98a4b"/><rect x="-28" y="-14" width="15" height="16" rx="6" fill="#b9772f"/><rect x="12" y="-14" width="15" height="16" rx="6" fill="#b9772f"/>
  <ellipse cx="-16" cy="-30" rx="14" ry="10" fill="#f3e3c5"/>
  <circle cx="-18" cy="-66" r="27" fill="#c98a4b"/><ellipse cx="-48" cy="-60" rx="11" ry="22" fill="#7a4518" transform="rotate(12 -48 -60)"/><ellipse cx="14" cy="-60" rx="11" ry="22" fill="#7a4518" transform="rotate(-12 14 -60)"/>
  <ellipse cx="-18" cy="-56" rx="15" ry="11" fill="#f3e3c5"/><circle cx="-28" cy="-70" r="4.5" fill="#222"/><circle cx="-8" cy="-70" r="4.5" fill="#222"/><circle cx="-27" cy="-71.5" r="1.5" fill="#fff"/><circle cx="-7" cy="-71.5" r="1.5" fill="#fff"/>
  <ellipse cx="-18" cy="-60" rx="6" ry="4.5" fill="#222"/><path d="M-18 -55 v5 q-6 6 -10 0 M-18 -50 q6 6 10 0" stroke="#7a3b10" stroke-width="2" fill="none"/><path d="M-24 -48 q6 12 12 0Z" fill="#ff6b8a"/>`),
 pet_owl:`<g transform="translate(560,734)"><ellipse cx="0" cy="2" rx="40" ry="7" fill="#0003"/><rect x="-4" y="-96" width="8" height="96" fill="#7a4518"/><rect x="-26" y="-4" width="52" height="8" rx="4" fill="#7a4518"/><rect x="-34" y="-108" width="68" height="10" rx="5" fill="#a0632b"/>
  <g class="petbob"><ellipse cx="0" cy="-152" rx="34" ry="44" fill="#8a5a2b"/><ellipse cx="0" cy="-142" rx="22" ry="30" fill="#f3e3c5"/>
  <g fill="#8a5a2b" stroke="#5a3a1a" stroke-width="2"><path d="M-26 -190 L-22 -208 L-8 -190Z M26 -190 L22 -208 L8 -190Z"/></g>
  <path d="M-34 -150 Q-48 -128 -34 -108 Q-26 -128 -26 -150Z M34 -150 Q48 -128 34 -108 Q26 -128 26 -150Z" fill="#6e4520"/>
  <circle cx="-14" cy="-170" r="14" fill="#fff"/><circle cx="14" cy="-170" r="14" fill="#fff"/><circle cx="-14" cy="-170" r="6" fill="#222"/><circle cx="14" cy="-170" r="6" fill="#222"/>
  <circle cx="-14" cy="-170" r="17" fill="none" stroke="#333" stroke-width="3"/><circle cx="14" cy="-170" r="17" fill="none" stroke="#333" stroke-width="3"/><path d="M-3 -170 h6" stroke="#333" stroke-width="3"/>
  <path d="M-6 -158 L0 -146 L6 -158Z" fill="#ff9f1c"/><path d="M-12 -126 q4 6 8 0 M4 -126 q4 6 8 0 M-6 -116 q4 6 8 0" stroke="#d6bf94" stroke-width="2.5" fill="none"/>
  <path d="M-12 -108 l-4 6 M12 -108 l4 6" stroke="#ff9f1c" stroke-width="4" stroke-linecap="round"/></g></g>`,
 pet_dragon:PET(`<g class="tail"><path d="M30 -20 Q72 -16 70 -52 Q68 -66 56 -62" fill="none" stroke="#3fa34d" stroke-width="14" stroke-linecap="round"/></g>
  <path d="M-6 -50 Q-40 -96 -18 -92 Q-8 -78 4 -52Z" fill="#7ed56f" stroke="#2f7d32" stroke-width="3"/><path d="M6 -52 Q34 -98 46 -88 Q46 -70 18 -46Z" fill="#7ed56f" stroke="#2f7d32" stroke-width="3"/>
  <ellipse cx="0" cy="-30" rx="38" ry="30" fill="#4caf50" stroke="#2f7d32" stroke-width="3"/><ellipse cx="-6" cy="-24" rx="22" ry="20" fill="#ffe28a"/>
  <rect x="-26" y="-12" width="15" height="14" rx="6" fill="#43a047"/><rect x="10" y="-12" width="15" height="14" rx="6" fill="#43a047"/>
  <circle cx="-16" cy="-66" r="26" fill="#4caf50" stroke="#2f7d32" stroke-width="3"/><path d="M-34 -84 L-40 -106 L-24 -90Z M2 -88 L8 -108 L10 -84Z" fill="#ffd24a" stroke="#a86a00" stroke-width="2"/>
  <circle cx="-26" cy="-70" r="5" fill="#fff"/><circle cx="-6" cy="-70" r="5" fill="#fff"/><circle cx="-25" cy="-70" r="2.8" fill="#222"/><circle cx="-5" cy="-70" r="2.8" fill="#222"/>
  <ellipse cx="-16" cy="-56" rx="11" ry="7" fill="#7ed56f"/><circle cx="-20" cy="-57" r="1.6" fill="#2f7d32"/><circle cx="-12" cy="-57" r="1.6" fill="#2f7d32"/>
  <g class="flame"><path d="M-40 -56 Q-56 -62 -52 -74 Q-46 -66 -40 -68Z" fill="#ff9f1c"/></g>`)
};

/* ---------- 飾品美術 ---------- */
const art={
 w_frame:{vb:[370,175,150,120],svg:`<g transform="translate(380,185)"><rect width="130" height="100" rx="6" fill="#8a5222" stroke="#5a3210" stroke-width="5"/><rect x="9" y="9" width="112" height="82" fill="#9bd7ff"/><circle cx="92" cy="30" r="12" fill="#ffe66d"/><path d="M9 91 V62 L40 38 L66 60 L84 48 L121 76 V91Z" fill="#6cb956"/><path d="M9 91 V74 L44 62 L88 78 L121 70 V91Z" fill="#4f9a3f"/></g>`},
 w_map:{vb:[365,155,160,160],svg:`<g transform="translate(445,235) rotate(-4)"><rect x="-62" y="-70" width="124" height="140" rx="6" fill="#f3dfb0" stroke="#a0632b" stroke-width="5"/><rect x="-70" y="-78" width="12" height="156" rx="6" fill="#8a5222"/><rect x="58" y="-78" width="12" height="156" rx="6" fill="#8a5222"/><path d="M-40 -30 Q-10 -55 20 -30 T40 10 T-10 40" fill="none" stroke="#c0392b" stroke-width="4" stroke-dasharray="8 6"/><path d="M28 20 l24 24 m0 -24 l-24 24" stroke="#c0392b" stroke-width="7" stroke-linecap="round"/><circle cx="-40" cy="-30" r="5" fill="#2f80ed"/></g>`},
 w_portrait:{vb:[375,150,140,170],svg:`<g transform="translate(445,235)"><rect x="-58" y="-80" width="116" height="150" rx="8" fill="#e0b13a" stroke="#8a5a00" stroke-width="6"/><rect x="-46" y="-68" width="92" height="126" fill="#274a7a"/><path d="M-30 58 Q-30 8 0 8 Q30 8 30 58Z" fill="#c0392b"/><circle cx="0" cy="-12" r="22" fill="#f1c9a0"/><circle cx="-8" cy="-10" r="2.5" fill="#222"/><circle cx="8" cy="-10" r="2.5" fill="#222"/><path d="M-6 0 q6 5 12 0" stroke="#7a3b10" stroke-width="2" fill="none"/><path d="M-26 -14 Q-26 -44 0 -44 Q26 -44 26 -14 L16 -24 H-16Z" fill="#b9c4d0" stroke="#6b7a8c" stroke-width="3"/><rect x="-3" y="-48" width="6" height="16" fill="#c0392b"/></g>`},
 w_banner:{vb:[380,110,130,185],svg:`<g transform="translate(445,120)"><rect x="-60" y="0" width="120" height="10" rx="5" fill="#7a4518"/><path d="M-50 10 H50 V150 L0 185 L-50 150Z" fill="#b8302a" stroke="#7a1f14" stroke-width="5"/><path d="M0 52 V132 M-24 78 H24" stroke="#ffd24a" stroke-width="9" stroke-linecap="round"/><circle cx="0" cy="44" r="9" fill="#ffd24a"/></g>`},
 m_candle:{vb:[130,185,120,90],svg:`<g transform="translate(190,270)"><rect x="-44" y="-34" width="18" height="34" rx="3" fill="#fff3d6" stroke="#caa66a" stroke-width="2"/><rect x="-9" y="-48" width="18" height="48" rx="3" fill="#fff3d6" stroke="#caa66a" stroke-width="2"/><rect x="26" y="-28" width="18" height="28" rx="3" fill="#fff3d6" stroke="#caa66a" stroke-width="2"/><g class="flame"><path d="M-35 -38 Q-41 -52 -35 -64 Q-29 -52 -35 -38Z" fill="#ffb347"/></g><g class="flame f2"><path d="M0 -52 Q-6 -68 0 -82 Q6 -68 0 -52Z" fill="#ffb347"/></g><g class="flame f3"><path d="M35 -32 Q29 -46 35 -58 Q41 -46 35 -32Z" fill="#ffb347"/></g></g>`},
 m_vase:{vb:[130,140,120,135],svg:`<g transform="translate(190,270)"><path d="M-22 0 Q-34 -30 -14 -48 L-10 -62 H10 L14 -48 Q34 -30 22 0Z" fill="#3a8fd8" stroke="#1f5c9a" stroke-width="4"/><path d="M-4 -62 Q-30 -100 -40 -88 M2 -62 Q4 -110 0 -118 M6 -62 Q34 -96 44 -84" stroke="#4f9a3f" stroke-width="4" fill="none"/><circle cx="-40" cy="-88" r="10" fill="#ff6b8a"/><circle cx="0" cy="-118" r="11" fill="#ffd24a"/><circle cx="44" cy="-84" r="10" fill="#ff6b8a"/></g>`},
 m_hourglass:{vb:[150,185,80,90],svg:`<g transform="translate(190,270)"><rect x="-24" y="-80" width="48" height="8" rx="3" fill="#7a4518"/><rect x="-24" y="-8" width="48" height="8" rx="3" fill="#7a4518"/><path d="M-18 -72 H18 Q18 -48 4 -40 Q18 -32 18 -8 H-18 Q-18 -32 -4 -40 Q-18 -48 -18 -72Z" fill="#d8f1ff" opacity=".85" stroke="#6b8ba8" stroke-width="3"/><path d="M-12 -14 H12 Q8 -26 0 -30 Q-8 -26 -12 -14Z" fill="#ffd24a"/><path d="M-12 -68 H12 Q8 -58 0 -50 Q-8 -58 -12 -68Z" fill="#ffd24a"/></g>`},
 m_trophy:{vb:[140,175,100,100],svg:`<g transform="translate(190,270)"><rect x="-28" y="-12" width="56" height="12" rx="3" fill="#7a4518"/><rect x="-6" y="-30" width="12" height="20" fill="#d99a00"/><path d="M-30 -86 H30 Q30 -40 0 -32 Q-30 -40 -30 -86Z" fill="url(#gold)" stroke="#a86a00" stroke-width="4"/><path d="M-30 -78 Q-50 -78 -44 -58 Q-40 -48 -28 -48 M30 -78 Q50 -78 44 -58 Q40 -48 28 -48" fill="none" stroke="#d99a00" stroke-width="5"/><text y="-52" text-anchor="middle" font-size="24" font-weight="900" fill="#7a4518">1</text></g>`},
 cu_red:{vb:[520,70,560,280],svg:curtain('#c0392b','#7a1f14',0)},
 cu_blue:{vb:[520,70,560,280],svg:curtain('#2f6fdb','#16407f',0)},
 cu_pink:{vb:[520,70,560,280],svg:curtain('#ff9ccb','#d6568a',1)},
 c_bunting:{vb:[0,0,1600,100],svg:()=>FES.map((p,k)=>`<path d="${stringPath(p)}" fill="none" stroke="#6b5a3a" stroke-width="3"/>`+p.filter((_,i)=>i%2===1&&i<p.length-1).map((q,i)=>`<path d="M${(q[0]-14).toFixed(0)} ${(q[1]).toFixed(0)} h28 l-14 30Z" fill="${cyc(['#ef5b4c','#ffd24a','#4a8cff','#35b46a','#a46bff'],i+k)}" stroke="#0003" stroke-width="1.5"/>`).join('')).join('')},
 c_lights:{vb:[0,0,1600,100],svg:()=>FES.map((p,k)=>`<path d="${stringPath(p)}" fill="none" stroke="#3a2a1a" stroke-width="3"/>`+p.filter((_,i)=>i%2===1&&i<p.length-1).map((q,i)=>{const c=cyc(['#ff5a5a','#ffd24a','#5ad7ff','#7dff9b','#c58bff'],i+k);return `<circle class="tw" style="animation-delay:${((i*0.37+k*.5)%1.6).toFixed(2)}s" cx="${q[0].toFixed(0)}" cy="${(q[1]+9).toFixed(0)}" r="8" fill="${c}"/><circle cx="${q[0].toFixed(0)}" cy="${(q[1]+9).toFixed(0)}" r="16" fill="${c}" opacity=".25"/>`}).join('')).join('')},
 c_lamp:{vb:[230,0,200,150],svg:`<g transform="translate(330,0)"><circle cx="0" cy="92" r="100" fill="url(#glow)"/><path d="M0 0 V50" stroke="#6b5a3a" stroke-width="5"/><rect x="-14" y="46" width="28" height="22" rx="6" fill="#d99a00"/><path d="M-76 98 Q-66 70 0 66 Q66 70 76 98" fill="none" stroke="#d99a00" stroke-width="7"/>${[-72,-36,0,36,72].map((x,i)=>`<rect x="${x-6}" y="${i%2?84:90}" width="12" height="${i%2?14:8}" fill="#fff3d6"/><g class="flame f${(i%3)+1}"><path d="M${x} ${i%2?82:88} q-6 -10 0 -20 q6 10 0 20Z" fill="#ffb347"/></g>`).join('')}<circle cx="0" cy="106" r="6" fill="#74d0ff"/><circle cx="-36" cy="102" r="4" fill="#74d0ff"/><circle cx="36" cy="102" r="4" fill="#74d0ff"/></g>`},
 p_cactus:{vb:[1430,552,120,190],svg:`<g transform="translate(1490,732)"><ellipse cx="0" cy="2" rx="46" ry="9" fill="#0003"/><path d="M-34 -50 H34 L26 0 H-26Z" fill="#c8693a" stroke="#8a431f" stroke-width="4"/><rect x="-38" y="-58" width="76" height="12" rx="4" fill="#d9794a" stroke="#8a431f" stroke-width="3"/><rect x="-16" y="-170" width="32" height="116" rx="16" fill="#4f9a3f" stroke="#2f6b25" stroke-width="4"/><path d="M-16 -110 H-30 Q-36 -110 -36 -120 V-140 M16 -90 H30 Q36 -90 36 -100 V-124" fill="none" stroke="#4f9a3f" stroke-width="14" stroke-linecap="round"/><path d="M-6 -150 v6 M6 -130 v6 M-6 -110 v6 M6 -90 v6 M-6 -70 v6" stroke="#e8f5c8" stroke-width="2"/><circle cx="0" cy="-174" r="7" fill="#ff6b8a"/></g>`},
 p_pot:{vb:[1420,542,140,200],svg:`<g transform="translate(1490,732)"><ellipse cx="0" cy="2" rx="50" ry="9" fill="#0003"/><path d="M-38 -56 H38 L28 0 H-28Z" fill="#9b5de5" stroke="#5e2bb5" stroke-width="4"/><g fill="#3fa34d" stroke="#25702f" stroke-width="3"><ellipse cx="-34" cy="-100" rx="14" ry="44" transform="rotate(-35 -34 -100)"/><ellipse cx="34" cy="-100" rx="14" ry="44" transform="rotate(35 34 -100)"/><ellipse cx="-12" cy="-120" rx="14" ry="50" transform="rotate(-12 -12 -120)"/><ellipse cx="14" cy="-124" rx="14" ry="50" transform="rotate(12 14 -124)"/><ellipse cx="0" cy="-130" rx="13" ry="46"/></g></g>`},
 p_tree:{vb:[1410,512,160,230],svg:`<g transform="translate(1490,732)"><ellipse cx="0" cy="2" rx="52" ry="9" fill="#0003"/><path d="M-36 -44 H36 L28 0 H-28Z" fill="#c98a4b" stroke="#7a4518" stroke-width="4"/><rect x="-9" y="-130" width="18" height="90" fill="#8a5222"/><circle cx="0" cy="-170" r="52" fill="#4caf50" stroke="#2f7d32" stroke-width="4"/><circle cx="-34" cy="-140" r="32" fill="#43a047"/><circle cx="34" cy="-142" r="32" fill="#43a047"/><circle cx="-14" cy="-182" r="6" fill="#ff5252"/><circle cx="20" cy="-160" r="6" fill="#ff5252"/><circle cx="-30" cy="-146" r="6" fill="#ff5252"/></g>`}
};
/* 寵物縮圖範圍 */
const petVb={pet_cat:[495,612,130,130],pet_dog:[495,612,130,130],pet_owl:[505,512,110,230],pet_dragon:[480,612,170,130]};
for(const k in pets)art[k]={vb:petVb[k],svg:pets[k]};

/* ---------- 地毯（取代原本的紅地毯）---------- */
const rugs={
 r_blue:`<ellipse cx="800" cy="690" rx="270" ry="52" fill="#1f3b8a"/><ellipse cx="800" cy="690" rx="238" ry="42" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="4 12" stroke-linecap="round"/>${[0,1,2,3,4,5,6,7].map(i=>{const a=i*Math.PI/4;return `<text x="${(800+185*Math.cos(a)).toFixed(0)}" y="${(698+31*Math.sin(a)).toFixed(0)}" text-anchor="middle" font-size="22" fill="#fff">★</text>`}).join('')}`,
 r_green:`<ellipse cx="800" cy="690" rx="270" ry="52" fill="#2e7d32"/><ellipse cx="800" cy="690" rx="236" ry="42" fill="#3f9b45"/><ellipse cx="800" cy="690" rx="190" ry="32" fill="none" stroke="#c8f0c0" stroke-width="5" stroke-dasharray="16 10"/>${[0,1,2,3,4,5].map(i=>{const a=i*Math.PI/3+.3;return `<ellipse cx="${(800+120*Math.cos(a)).toFixed(0)}" cy="${(690+20*Math.sin(a)).toFixed(0)}" rx="14" ry="6" fill="#a5d6a7" transform="rotate(${i*30} ${(800+120*Math.cos(a)).toFixed(0)} ${(690+20*Math.sin(a)).toFixed(0)})"/>`}).join('')}`,
 r_rainbow:['#ef4444','#f59e0b','#fde047','#22c55e','#3b82f6','#8b5cf6'].map((c,i)=>`<ellipse cx="800" cy="690" rx="${270-i*36}" ry="${52-i*7}" fill="${c}"/>`).join(''),
 r_gold:`<ellipse cx="800" cy="690" rx="270" ry="52" fill="#4b1d7a"/><ellipse cx="800" cy="690" rx="262" ry="48" fill="none" stroke="#ffd24a" stroke-width="8"/><ellipse cx="800" cy="690" rx="210" ry="36" fill="none" stroke="#ffd24a" stroke-width="4" stroke-dasharray="3 9" stroke-linecap="round"/><path d="M800 664 L836 690 L800 716 L764 690Z" fill="#ffd24a" stroke="#a86a00" stroke-width="3"/>`
};
art.r_blue={vb:[520,630,560,120],svg:rugs.r_blue};art.r_green={vb:[520,630,560,120],svg:rugs.r_green};art.r_rainbow={vb:[520,630,560,120],svg:rugs.r_rainbow};art.r_gold={vb:[520,630,560,120],svg:rugs.r_gold};

/* ---------- 背景樣式：背景全部是完整的圖片（assets/shop/themes/主題id.png），這裡只剩木頭顏色與天色 ---------- */
const themeSpec={
 xianxia:{wood:'#5a331c'},default:{wood:'#7a4518'},castle:{wood:'#4d4f58'},magic:{wood:'#2d1b55'},
 ocean:{wood:'#1f5f86'},forest:{wood:'#5a3a1a'},candy:{wood:'#d6568a'},space:{wood:'#5a5f8a',sky:'space'}
};
window.HERO_DECOR={art,rugs,themeSpec,slotAnchor:{}};
})();
