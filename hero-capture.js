/* 怪物收服系統 hero-capture.js ── 加／乘／除／四則勇者共用（總部也用它開圖鑑）
   流程：打倒魔王 → 問要不要收服 → 隨機小遊戲（井字／4×4翻牌／五子棋）三戰兩勝
         → 贏了開寶箱（品質用減法寶箱的機率 rollRarity）→ 住進「休息區」和「圖鑑」
   輸了給 1 片怪物碎片，集滿 3 片可以免玩直接收服（保底）。
   存檔：寫在原本的 heroRPG_v1:<學號> 裡的 pets 欄位，所以跟著勇者存檔走。
   可調整的數字都在下面的 CFG，也可以在載入前設定 window.HERO_CAPTURE_CFG={...} 覆蓋。 */
(function(){
'use strict';
if(window.HeroPets)return;
const CAT=window.HERO_PET_CATALOG||{};
const ACC=window.HERO_PET_ACC||{slots:[],items:[]};
const DEF={
 on:true,
 shardNeed:3,            /* 輸幾次（碎片幾片）可以直接收服 */
 restMax:6,              /* 休息區同時最多顯示幾隻 */
 missFirst:.4,           /* AI 在第一隻魔王時的失誤機率 */
 missLast:.1,            /* AI 在最後一隻魔王時的失誤機率 */
 teachBonus:.1,          /* 教學模式再多給的失誤機率 */
 gomokuSec:10,           /* 五子棋每步限時（秒） */
 tttDrawLimit:2,         /* 井字遊戲平手幾次後，AI 會開始放水 */
 logMax:300,
 forceResult:null,       /* 測試用：'w' 或 'l' 直接跳過小遊戲 */
 q:{same:.9,d1:.09,d2:.007,d3:.003},          /* 怪物品質機率（和減法寶箱同一套算法，但獨立設定） */
 skinPrice:{},                                /* 新樣貌價格覆蓋：{樣貌id:價格}（不分品質）*/
 price:{}                                     /* 打扮物品價格覆蓋：{物品id:價格} */
};
const dm=(a,b)=>{const r=Object.assign({},a);if(b&&typeof b==='object')for(const k in b){r[k]=(a[k]&&typeof a[k]==='object'&&b[k]&&typeof b[k]==='object')?dm(a[k],b[k]):b[k]}return r};
const CFG=dm(dm(DEF,(window.HERO_CONFIG||{}).capture),window.HERO_CAPTURE_CFG);
const RAR=['','普通','優良','精緻','傳說','神話'],RCOL=['','#9aa3ad','#4caf50','#2f80ed','#a24bd8','#ff9800'];
const GNAME={add:'加法勇者',mul:'乘法勇者',div:'除法勇者',ops:'四則運算勇者'};
const GORDER=['add','mul','div','ops'];
const $=(s,r)=> (r||document).querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ===================== 存檔（和 hero-core 同一個 key）===================== */
const Q=new URLSearchParams(location.search);
function sid(){let s=Q.get('student');if(!s){try{const a=JSON.parse(localStorage.getItem('keyagent_active_student')||'null');s=a&&a.studentNumber}catch(e){}}return s||'guest'}
const SKEY=()=>'heroRPG_v1:'+sid();
const loadAll=()=>{try{return JSON.parse(localStorage.getItem(SKEY()))||{}}catch(e){return{}}};
const blank=()=>({v:1,mons:{},rest:{},log:[],pending:null});
const read=()=>{const p=loadAll().pets||{};p.mons=p.mons||{};p.rest=p.rest||{};p.log=p.log||[];return p};
function upd(f){const o=loadAll();const p=o.pets=Object.assign(blank(),o.pets||{});p.mons=p.mons||{};p.rest=p.rest||{};p.log=p.log||[];f(p);
 if(p.log.length>CFG.logMax)p.log=p.log.slice(-CFG.logMax);
 try{localStorage.setItem(SKEY(),JSON.stringify(o))}catch(e){}return p}
const mon=(p,k)=>p.mons[k]||{n:0,best:0,sh:0,met:0,t:0};

/* ===================== 寶箱品質：沿用減法的 rollRarity ===================== */
function rollRarity(base){
 const c=CFG.q,r=Math.random();let acc=0;
 for(const d of [0,1,-1,2,-2,3,-3]){const t=base+d;if(t<1||t>5)continue;acc+=d===0?c.same:(Math.abs(d)===1?c.d1:Math.abs(d)===2?c.d2:c.d3)/2;if(r<acc)return t}
 return 0}
/* 收服不會開到空箱：減法的空箱機率用掉了，就給「和破關星等相同」的品質 */
const rollCapture=stars=>rollRarity(Math.max(1,Math.min(5,stars||1)))||Math.max(1,Math.min(5,stars||1));

/* ===================== 小工具：圖片、音效 ===================== */
const imgTag=(src,cls,sty)=>`<img class="${cls||''}" src="${esc(src||'')}" alt="" draggable="false"${sty?` style="filter:${sty}"`:''} onerror="this.outerHTML='<span class=&quot;cap-ph&quot;>👾</span>'">`;
/* 帶打扮的怪物圖：h＝圖高(px)，fit＝{head,face,neck,hold,color,aura} */
const accOf=id=>ACC.items.find(x=>x.id===id);
function fig(src,fit,h,flip,v){fit=fit||{};const it=s=>accOf(fit[s]),au=it('aura');
 const f=[v&&v.filter,au&&au.filter].filter(Boolean).join(' ');
 const ov=['head','face','neck','hold'].map(s=>it(s)?`<i class="cap-a ${s}">${it(s).icon}</i>`:'').join('');
 const an=(v&&v.anim)||(au&&au.anim)||'';
 return `<span class="cap-fig${an?' '+an:''}${flip?' flip':''}" style="--h:${h}px">${imgTag(src,'',f)}${ov}</span>`}
function figM(k,p,h){const f=infoOf(k),m=mon(p,k),v=curSkinOf(p,k);return fig(v&&v.img?v.img:f.s.img,m.fit,h,false,v)}
const accPrice=id=>{const x=accOf(id);return CFG.price[id]!=null?+CFG.price[id]:(x?x.price:0)};
/* 新樣貌：通用換色（STY）＋專屬圖（ART）*/
const STY=window.HERO_PET_STYLES||[],ART=window.HERO_PET_SKINS||{};
const skinsOf=k=>STY.map(x=>Object.assign({},x)).concat((ART[k]||[]).map(x=>Object.assign({icon:'🎭'},x)));
const skinPrice=v=>CFG.skinPrice[v.id]!=null?+CFG.skinPrice[v.id]:+v.price;
const skinOwned=(p,k,id)=>!!(p.skinOwn||{})[k+'|'+id];
const curSkinOf=(p,k)=>{const m=mon(p,k);return m.skin&&skinOwned(p,k,m.skin)?skinsOf(k).find(v=>v.id===m.skin)||null:null};
let AC;function beep(f,d,t,v){try{const H=window.HERO;if(H&&H.C&&H.C.sound&&H.C.sound.sfx===false)return;AC=AC||new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.type=t||'sine';o.frequency.value=f;g.gain.value=v||.06;o.connect(g);g.connect(AC.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+(d||.12));o.stop(AC.currentTime+(d||.12))}catch(e){}}
const sWin=()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.18,'triangle'),i*110));
const sLose=()=>[330,262,196].forEach((f,i)=>setTimeout(()=>beep(f,.2,'sawtooth',.04),i*130));

/* ===================== 樣式 ===================== */
const css=document.createElement('style');css.textContent=`
#cap-ov{position:fixed;inset:0;z-index:100000;background:rgba(10,12,28,.82);display:flex;align-items:center;justify-content:center;padding:10px;font-family:inherit;-webkit-user-select:none;user-select:none}
.cap-box{background:linear-gradient(#fffaf0,#fff3d6);border:4px solid #8d5524;border-radius:18px;width:min(560px,100%);max-height:96vh;overflow:auto;padding:14px 14px 12px;color:#3b2a14;box-shadow:0 10px 40px #000a;text-align:center}
.cap-box h2{margin:0 0 6px;font-size:22px}
.cap-box button{font-family:inherit;cursor:pointer}
.cap-big{font-size:20px;font-weight:900;padding:10px 22px;border-radius:14px;border:3px solid #ffd24a;background:linear-gradient(#a0522d,#5c2e0e);color:#ffe9a0;margin:6px}
.cap-btn{font-size:16px;font-weight:800;padding:8px 16px;border-radius:12px;border:2px solid #8d5524;background:#fff;color:#5c2e0e;margin:4px}
.cap-btn.go{background:#2e9e5b;border-color:#1f7a43;color:#fff}
.cap-btn.no{background:#eee;border-color:#aaa;color:#666}
.cap-score{font-size:20px;font-weight:900;margin:2px 0 6px}
.cap-score small{display:block;font-size:13px;font-weight:700;color:#8a6a3b}
.cap-hint{min-height:24px;font-weight:800;font-size:16px;margin:4px 0;color:#7a3e00}
.cap-area{position:relative;min-height:200px}
.cap-banner{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;background:rgba(255,250,235,.86);border-radius:12px;animation:capPop .35s}
@keyframes capPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
.cap-ttt{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:min(300px,86%);margin:6px auto}
.cap-ttt button{aspect-ratio:1;font-size:46px;font-weight:900;border-radius:12px;border:3px solid #8d5524;background:#fff;line-height:1}
.cap-ttt button.X{color:#d63a3a}.cap-ttt button.O{color:#2f80ed}
.cap-mem{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:min(330px,92%);margin:6px auto}
.cap-mem button{aspect-ratio:1;font-size:34px;border-radius:12px;border:3px solid #8d5524;background:linear-gradient(#ffd98a,#e8a93a);color:#8d5524;font-weight:900;line-height:1;padding:0}
.cap-mem button.up{background:#fff;color:#000}
.cap-mem button.p{background:#d6f5df;border-color:#2e9e5b}.cap-mem button.a{background:#ffdede;border-color:#d63a3a}
.cap-gb{display:grid;grid-template-columns:repeat(var(--n),1fr);width:min(360px,94%);margin:4px auto;background:#e8b86a;border:3px solid #8d5524;border-radius:8px;overflow:hidden}
.cap-gb button{aspect-ratio:1;border:0!important;box-shadow:none!important;padding:0;margin:0;min-width:0;position:relative;transform:none!important;background-color:transparent;background-image:linear-gradient(#6b4513,#6b4513),linear-gradient(#6b4513,#6b4513);background-repeat:no-repeat;border-radius:0}
.cap-gb button[data-st]::before{content:'';position:absolute;left:50%;top:50%;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:#6b4513}
.cap-gb button.b::after,.cap-gb button.w::after{content:'';position:absolute;inset:9%;border-radius:50%;z-index:1}
.cap-gb button.b::after{background:radial-gradient(circle at 35% 35%,#777,#111)}
.cap-gb button.w::after{background:radial-gradient(circle at 35% 35%,#fff,#d4d4d4);border:1px solid #888}
.cap-gb button.last::after{outline:3px solid #ff4d4d;outline-offset:-1px}
.cap-tbar{height:8px;background:#eee;border-radius:5px;width:min(360px,94%);margin:2px auto;overflow:hidden}.cap-tbar i{display:block;height:100%;background:#2e9e5b;width:100%}
.cap-card{display:inline-block;width:190px;padding:10px 8px;border-radius:16px;border:5px solid var(--c);background:#fff;box-shadow:0 0 18px var(--c);margin:6px}
.cap-card img,.cap-card .cap-ph{height:130px;max-width:170px;object-fit:contain;display:block;margin:0 auto 4px}
.cap-card.r4,.cap-card.r5{animation:capGlow 1.4s infinite alternate}
.cap-card.r5{background:linear-gradient(135deg,#fff7e0,#ffe2f4,#e2f0ff)}
@keyframes capGlow{to{box-shadow:0 0 34px var(--c),0 0 8px #fff inset}}
.cap-ph{display:inline-block;font-size:70px;line-height:130px;text-align:center}
.cap-star{letter-spacing:2px}
.cap-note{font-weight:800;margin:4px 0;color:#7a3e00}
.cap-panel{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;background:#fff7e2;border:3px dashed #e0a030;border-radius:14px;padding:8px 10px;margin:8px 0;text-align:left;color:#3b2a14}
.cap-panel .cap-pimg img,.cap-panel .cap-pimg .cap-ph{height:76px;max-width:110px;object-fit:contain;display:block;line-height:76px;font-size:44px}
.cap-ptxt{flex:1 1 180px;font-size:16px;font-weight:700}
.cap-pbtns{display:flex;flex-wrap:wrap;gap:6px}
.cap-pbtns button{font-family:inherit;font-weight:900;font-size:16px;padding:8px 14px;border-radius:10px;border:0;cursor:pointer;background:#2e9e5b;color:#fff}
.cap-pbtns button.no{background:#e3e3e3;color:#555}.cap-pbtns button.free{background:#8e3fd1}
.cap-psh{width:100%;font-size:13px;color:#8a6a3b;font-weight:700}
#cap-dock{position:fixed;left:8px;bottom:6px;z-index:60;display:none;gap:6px;font-family:inherit}
#cap-dock button{font-family:inherit;font-size:14px;font-weight:800;padding:5px 10px;border-radius:999px;border:2px solid #8d5524;background:#fff8e6;color:#5c2e0e;cursor:pointer;opacity:.92}
#cap-rest{position:fixed;left:0;right:0;bottom:30px;height:130px;z-index:55;pointer-events:none;display:none;overflow:hidden}
.cap-pet{position:absolute;bottom:0;pointer-events:auto;cursor:pointer;animation:capWalk var(--d) linear infinite;animation-delay:var(--dl)}
.cap-pet img,.cap-pet .cap-ph{height:66px;max-width:100px;object-fit:contain;display:block;animation:capHop 1.6s ease-in-out infinite;animation-delay:var(--dl);line-height:66px;font-size:44px}
.cap-pet.q4 img,.cap-pet.q5 img{filter:drop-shadow(0 0 6px var(--c))}
@keyframes capWalk{0%{transform:translateX(0) scaleX(1)}49%{transform:translateX(var(--w)) scaleX(1)}50%{transform:translateX(var(--w)) scaleX(-1)}99%{transform:translateX(0) scaleX(-1)}100%{transform:translateX(0) scaleX(1)}}
@keyframes capHop{50%{transform:translateY(-6px)}}
.cap-bub{position:absolute;bottom:72px;left:50%;transform:translateX(-50%);background:#fff;color:#3b2a14;border:2px solid #8d5524;border-radius:12px;padding:5px 9px;font-size:13px;font-weight:800;white-space:nowrap;box-shadow:0 2px 8px #0004;z-index:2}
#cap-col{position:fixed;inset:0;z-index:100001;background:rgba(10,12,28,.84);display:flex;align-items:center;justify-content:center;padding:8px;font-family:inherit}
.cap-colbox{background:#fffaf0;border:4px solid #8d5524;border-radius:18px;width:min(900px,100%);max-height:96vh;display:flex;flex-direction:column;color:#3b2a14;overflow:hidden}
.cap-colhead{padding:10px 14px 4px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cap-colhead h2{margin:0;font-size:22px;flex:1}
.cap-x{border:0!important;box-shadow:none!important;background:#e3e3e3!important;border-radius:50%!important;width:34px;height:34px;font-size:18px;cursor:pointer;padding:0!important;color:#5c2e0e!important;line-height:34px}
.cap-tabs,.cap-chips{display:flex;gap:6px;flex-wrap:wrap;padding:3px 14px}
.cap-tabs button,.cap-chips button{font-family:inherit;font-size:14px;font-weight:800;padding:5px 11px;border-radius:999px;border:2px solid #c9a56a;background:#fff;color:#5c2e0e;cursor:pointer}
.cap-tabs button.on{background:#8d5524;color:#fff;border-color:#8d5524}
.cap-chips button.on{background:#ffd24a;border-color:#e0a030}
.cap-grid{overflow:auto;padding:8px 14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;flex:1}
.cap-item{border-radius:14px;border:4px solid var(--c,#d8c8a8);background:#fff;padding:6px 4px 8px;text-align:center;font-size:13px;font-weight:700;position:relative}
.cap-item img,.cap-item .cap-ph{height:84px;max-width:100%;object-fit:contain;display:block;margin:0 auto 3px;line-height:84px;font-size:50px}
.cap-item.sil img{filter:brightness(0) opacity(.5)}.cap-item.sil .cap-ph{opacity:.4;filter:grayscale(1)}
.cap-item.q4,.cap-item.q5{box-shadow:0 0 12px var(--c)}
.cap-item.q5{background:linear-gradient(135deg,#fff7e0,#ffe2f4,#e2f0ff)}
.cap-item .nm{font-size:14px;font-weight:900}
.cap-item .sub{font-size:12px;color:#7a6a50}
.cap-item button{font-family:inherit;margin-top:3px;font-size:12px;font-weight:800;padding:3px 8px;border-radius:8px;border:1.5px solid #8d5524;background:#fff8e6;cursor:pointer}
.cap-item button.on{background:#2e9e5b;color:#fff;border-color:#2e9e5b}
.cap-colfoot{padding:8px 14px;border-top:2px solid #eadbbd;font-size:13px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.cap-colfoot textarea{width:100%;height:60px;font-size:12px}
.cap-colfoot table{border-collapse:collapse;font-size:13px}.cap-colfoot td,.cap-colfoot th{border:1px solid #d8c8a8;padding:2px 8px}

.cap-fig{position:relative;display:inline-block;vertical-align:bottom}
.cap-fig img,.cap-fig .cap-ph{height:var(--h);max-width:calc(var(--h)*1.5);object-fit:contain;display:block;margin:0 auto;line-height:var(--h);font-size:calc(var(--h)*.62)}
.cap-a{position:absolute;font-style:normal;line-height:1;pointer-events:none;font-size:calc(var(--h)*.42);z-index:2}
.cap-a.head{left:50%;top:-2%;transform:translate(-50%,-45%)}
.cap-a.face{left:50%;top:36%;transform:translate(-50%,-50%);font-size:calc(var(--h)*.34)}
.cap-a.neck{left:50%;top:70%;transform:translate(-50%,-50%);font-size:calc(var(--h)*.3)}
.cap-a.hold{right:-6%;bottom:0;font-size:calc(var(--h)*.3)}
.cap-fig.flip img{scale:-1 1}
.cap-fig.rainbow img{animation:capHue 3s linear infinite}
@keyframes capHue{to{filter:drop-shadow(0 0 9px #fff) hue-rotate(360deg)}}
#cap-dress{position:fixed;inset:0;z-index:100003;background:rgba(10,12,28,.85);display:flex;align-items:center;justify-content:center;padding:8px}
.cap-dbox{background:#fffaf0;border:4px solid #8d5524;border-radius:18px;width:min(560px,100%);max-height:96vh;overflow:auto;padding:12px;color:#3b2a14;text-align:center}
.cap-dbox h2{margin:0 0 4px;font-size:20px}
.cap-dslot{text-align:left;margin:6px 0}.cap-dslot b{font-size:14px;color:#8a4f1c}
.cap-dchips{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px}
.cap-dchips button{font-family:inherit;font-size:13px;font-weight:800;padding:4px 9px;border-radius:999px;border:2px solid #c9a56a;background:#fff;color:#5c2e0e;cursor:pointer}
.cap-dchips button.on{background:#2e9e5b;border-color:#2e9e5b;color:#fff}
.cap-dchips button.lock{opacity:.5;cursor:default}
.cap-shop .gd2{display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px dashed #d8c8a8;text-align:left}
.cap-shop .gd2 .th2{width:64px;text-align:center;flex:none}
.cap-shop .gd2 .tx2{flex:1;font-size:14px}
.cap-dbox .cap-fig{margin-top:40px}
#cap-dock.hub{top:64px;bottom:auto;left:10px}
#cap-rest.hub{bottom:clamp(150px,25vh,230px)}
`;
document.head.appendChild(css);

/* ===================== 小遊戲 ===================== */
const GAMES=[
 {id:'ttt',name:'井字遊戲',icon:'⭕',rule:'你是 ✕，怪物是 ○。三個連成一線就贏！（平手要重下）'},
 {id:'mem',name:'4×4 翻牌對對碰',icon:'🃏',rule:'你和怪物輪流翻牌。翻到一對就算你的，還可以再翻一次；最後誰的對數多誰贏。'},
 {id:'gomoku',name:'五子棋（9×9 小棋盤）',icon:'⚫',rule:`你是 ●（先下）。橫、直、斜五個連成一線就贏！每步只有 ${CFG.gomokuSec} 秒，超過時間會自動幫你亂下一步。`}
];
/* --- 井字遊戲 --- */
const WL=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function tw(b){for(const[a,c,d]of WL)if(b[a]&&b[a]===b[c]&&b[c]===b[d])return b[a];return b.every(Boolean)?'d':''}
function mm(b,t){const w=tw(b);if(w==='O')return 1;if(w==='X')return -1;if(w==='d')return 0;let best=t==='O'?-2:2;for(let i=0;i<9;i++)if(!b[i]){b[i]=t;const v=mm(b,t==='O'?'X':'O');b[i]='';best=t==='O'?Math.max(best,v):Math.min(best,v)}return best}
function gTTT(host,o){return new Promise(res=>{
 const b=Array(9).fill('');let over=false,busy=false;
 host.innerHTML=`<div class="cap-hint" id="gh"></div><div class="cap-ttt">${b.map((_,i)=>`<button data-i="${i}"></button>`).join('')}</div>`;
 const hint=t=>{const e=$('#gh',host);if(e)e.innerHTML=t};
 const draw=()=>b.forEach((v,i)=>{const e=$(`[data-i="${i}"]`,host);if(e){e.textContent=v==='X'?'✕':v==='O'?'○':'';e.className=v}});
 const end=()=>{const w=tw(b);if(!w)return false;over=true;draw();setTimeout(()=>res(w==='X'?'w':w==='O'?'l':'d'),500);return true};
 async function ai(){
  if(!o.alive()||over)return;busy=true;hint('怪物在想……');await sleep(550);if(!o.alive())return;
  const empt=[...Array(9).keys()].filter(i=>!b[i]);
  const miss=o.draws>=CFG.tttDrawLimit?Math.max(o.miss,.7):o.miss;let m;
  if(Math.random()<miss)m=pick(empt);else{let bv=-2,arr=[];for(const i of empt){b[i]='O';const v=mm(b,'X');b[i]='';if(v>bv){bv=v;arr=[i]}else if(v===bv)arr.push(i)}m=pick(arr)}
  b[m]='O';beep(330,.08);draw();if(end())return;busy=false;hint('輪到你了：點一格放 ✕')}
 host.onclick=e=>{const el=e.target.closest('[data-i]');if(!el||over||busy)return;const i=+el.dataset.i;if(b[i])return;b[i]='X';beep(520,.08);draw();if(end())return;ai()};
 if(o.round%2===1)ai();else hint('你先下：點一格放 ✕')})}
/* --- 4×4 翻牌（和怪物比對數）--- */
function gMem(host,o){return new Promise(res=>{
 const EM=['🐲','👻','💀','🧟','🦇','🐺','🕷️','🐍'],cards=shuffle(EM.concat(EM)),done=Array(16).fill(0),seen=new Set(),sc={p:0,a:0};
 let turn='p',busy=false,first=-1,fin=false;
 host.innerHTML=`<div class="cap-hint" id="gh"></div><div class="cap-mem">${cards.map((_,i)=>`<button data-i="${i}">?</button>`).join('')}</div>`;
 const B=i=>$(`[data-i="${i}"]`,host);
 const hint=t=>{const e=$('#gh',host);if(e)e.innerHTML=t};
 const flip=(i,on)=>{const e=B(i);if(!e)return;e.classList.toggle('up',on);e.textContent=on?cards[i]:'?'};
 const mark=(a,b,w)=>{[a,b].forEach(i=>{const e=B(i);if(e){e.classList.add(w);e.classList.add('up');e.textContent=cards[i]}})};
 const remember=i=>{if(Math.random()>o.miss)seen.add(i)};
 const info=()=>hint(`你 <b style="color:#2e9e5b">${sc.p}</b> 對　怪物 <b style="color:#d63a3a">${sc.a}</b> 對`);
 const check=()=>{if(done.every(Boolean)){fin=true;setTimeout(()=>res(sc.p>sc.a?'w':sc.p<sc.a?'l':'d'),600);return true}return false};
 async function ai(){
  turn='a';busy=true;hint('怪物的回合……');await sleep(600);
  for(;;){
   if(!o.alive()||fin)return;
   const rem=[...Array(16).keys()].filter(i=>!done[i]),arr=[...seen].filter(i=>!done[i]);let pair=null;
   for(let x=0;x<arr.length&&!pair;x++)for(let y=x+1;y<arr.length;y++)if(cards[arr[x]]===cards[arr[y]]){pair=[arr[x],arr[y]];break}
   let a,c;
   if(pair){[a,c]=pair;flip(a,true);beep(440,.08);await sleep(650)}
   else{const unk=rem.filter(i=>!seen.has(i));a=pick(unk.length?unk:rem);flip(a,true);beep(440,.08);await sleep(650);
    const pr=[...seen].find(i=>i!==a&&!done[i]&&cards[i]===cards[a]);
    if(pr!==undefined)c=pr;else{const u2=rem.filter(i=>i!==a&&!seen.has(i));c=pick(u2.length?u2:rem.filter(i=>i!==a))}}
   if(!o.alive())return;flip(c,true);beep(494,.08);await sleep(900);if(!o.alive())return;
   if(cards[a]===cards[c]){done[a]=done[c]=1;sc.a++;seen.delete(a);seen.delete(c);mark(a,c,'a');info();if(check())return;await sleep(500);continue}
   remember(a);remember(c);flip(a,false);flip(c,false);break}
  turn='p';busy=false;hint('輪到你了：翻兩張牌')}
 host.onclick=async e=>{const el=e.target.closest('[data-i]');if(!el||turn!=='p'||busy||fin)return;const i=+el.dataset.i;if(done[i]||i===first)return;
  flip(i,true);beep(520,.08);remember(i);
  if(first<0){first=i;return}
  const a=first;first=-1;busy=true;
  if(cards[a]===cards[i]){done[a]=done[i]=1;sc.p++;seen.delete(a);seen.delete(i);mark(a,i,'p');sWin();busy=false;info();check();return}
  await sleep(900);if(!o.alive())return;flip(a,false);flip(i,false);ai()};
 info();hint(`輪到你了：翻兩張牌`)})}
/* --- 五子棋 9×9 --- */
function gGomoku(host,o){return new Promise(res=>{
 const N=9,b=Array(N*N).fill(0),DIRS=[[1,0],[0,1],[1,1],[1,-1]];let over=false,busy=false,tm=null,last=-1;
 function cellHTML(i){const x=i%N,y=(i/N)|0,E=v=>v===0||v===N-1;
  const hp=x===0?'100% 50%':x===N-1?'0% 50%':'50% 50%',hs=E(x)?'50% 2px':'100% 2px',vp=y===0?'50% 100%':y===N-1?'50% 0%':'50% 50%',vs=E(y)?'2px 50%':'2px 100%';
  const st=[[2,2],[6,2],[2,6],[6,6],[4,4]].some(q=>q[0]===x&&q[1]===y);
  return `<button data-i="${i}"${st?' data-st="1"':''} style="background-position:${hp},${vp};background-size:${hs},${vs}"></button>`}
 host.innerHTML=`<div class="cap-hint" id="gh"></div><div class="cap-tbar"><i id="gb"></i></div><div class="cap-gb" style="--n:${N}">${b.map((_,i)=>cellHTML(i)).join('')}</div>`;
 const hint=t=>{const e=$('#gh',host);if(e)e.innerHTML=t};
 const inb=(x,y)=>x>=0&&x<N&&y>=0&&y<N;
 function score(i,p){let s=0;for(const[dx,dy]of DIRS){let c=1,open=0;for(const sg of[1,-1]){let x=(i%N)+dx*sg,y=((i/N)|0)+dy*sg;while(inb(x,y)&&b[y*N+x]===p){c++;x+=dx*sg;y+=dy*sg}if(inb(x,y)&&b[y*N+x]===0)open++}
  s+=c>=5?1e5:c===4?(open===2?1e4:open===1?1e3:0):c===3?(open===2?1e3:open===1?100:0):c===2?(open===2?100:open===1?10:0):1}return s}
 const near=()=>{const st=b.map((v,i)=>v?i:-1).filter(i=>i>=0);const e=b.map((v,i)=>v?-1:i).filter(i=>i>=0);if(!st.length)return[(N*N-1)/2];
  const c=e.filter(i=>st.some(s=>Math.abs((s%N)-(i%N))<=2&&Math.abs(((s/N)|0)-((i/N)|0))<=2));return c.length?c:e};
 function render(){b.forEach((v,i)=>{const e=$(`[data-i="${i}"]`,host);if(e)e.className=(v===1?'b':v===2?'w':'')+(i===last?' last':'')})}
 function put(i,p){b[i]=p;last=i;render();return fiveAt(i,p)}
 function fiveAt(i,p){for(const[dx,dy]of DIRS){let c=1;for(const sg of[1,-1]){let x=(i%N)+dx*sg,y=((i/N)|0)+dy*sg;while(inb(x,y)&&b[y*N+x]===p){c++;x+=dx*sg;y+=dy*sg}}if(c>=5)return true}return false}
 const finish=r=>{over=true;clearInterval(tm);setTimeout(()=>res(r),500)};
 function startTimer(){let left=CFG.gomokuSec;const bar=$('#gb',host);if(bar)bar.style.width='100%';clearInterval(tm);
  tm=setInterval(()=>{if(!o.alive()){clearInterval(tm);return}left-=.1;if(bar)bar.style.width=Math.max(0,left/CFG.gomokuSec*100)+'%';if(left<=0){clearInterval(tm);hint('時間到！幫你隨便下一步');const c=near();play(pick(c))}},100)}
 function play(i){if(over||busy||b[i])return;clearInterval(tm);beep(520,.08);if(put(i,1)){finish('w');return}
  if(b.every(Boolean)){finish('d');return}ai()}
 async function ai(){busy=true;hint('怪物在想……');await sleep(600);if(!o.alive()||over)return;
  let m;const cand=near();
  if(Math.random()<o.miss)m=pick(cand);else{let best=-1,arr=[];for(const i of cand){const v=score(i,2)*1.05+score(i,1)-(Math.abs((i%N)-4)+Math.abs(((i/N)|0)-4))*.5;if(v>best+1e-9){best=v;arr=[i]}else if(Math.abs(v-best)<1e-9)arr.push(i)}m=pick(arr)}
  beep(330,.08);if(put(m,2)){finish('l');return}
  if(b.every(Boolean)){finish('d');return}busy=false;hint(`輪到你了（${CFG.gomokuSec} 秒內）`);startTimer()}
 host.onclick=e=>{const el=e.target.closest('[data-i]');if(el)play(+el.dataset.i)};
 hint(`你先下（${CFG.gomokuSec} 秒內）`);render();startTimer()})}
const GFN={ttt:gTTT,mem:gMem,gomoku:gGomoku};

/* ===================== 收服流程（全螢幕）===================== */
let lastGame='';
function mkOv(){let ov=$('#cap-ov');if(ov)ov.remove();ov=document.createElement('div');ov.id='cap-ov';ov.innerHTML='<div class="cap-box"></div>';document.body.appendChild(ov);return{ov,box:$('.cap-box',ov)}}
const dots=(n,t)=>'●'.repeat(n)+'○'.repeat(Math.max(0,t-n));
function missFor(gid,stId){const st=(CAT[gid]||{stages:[]}).stages,i=Math.max(0,st.findIndex(s=>s.id===stId)),t=st.length>1?i/(st.length-1):0;
 let m=CFG.missFirst+(CFG.missLast-CFG.missFirst)*t;try{if(typeof playMode!=='undefined'&&playMode==='teach')m+=CFG.teachBonus}catch(e){}
 return Math.min(.7,Math.max(.03,m))}
function log(p,e){p.log.push(Object.assign({t:Date.now()},e))}

async function capture(ctx){      /* ctx:{gid,st,key,stars,free} → 回傳 'captured' | 'lost' | 'cancel' */
 const {ov,box}=mkOv();let alive=true;const close=()=>{alive=false;ov.remove()};
 const name=ctx.st.name;
 let res='w',gm=null;
 if(ctx.free){
  upd(p=>{const m=p.mons[ctx.key]=Object.assign(mon(p,ctx.key),{});m.sh=Math.max(0,(m.sh||0)-CFG.shardNeed);m.met=1;p.mons[ctx.key]=m});
  box.innerHTML=`<h2>🧩 碎片收服！</h2><div class="cap-note">${CFG.shardNeed} 片碎片組合成一個捕獸網，${esc(name)}乖乖被收服了！</div>`;await sleep(900);
 }else{
  gm=CFG.forceResult?GAMES[0]:pick(GAMES.filter(g=>g.id!==lastGame));lastGame=gm.id;
  const go=await new Promise(r=>{
   box.innerHTML=`<h2>${gm.icon} 收服挑戰：${gm.name}</h2><div class="cap-note">三戰兩勝，贏了就能收服${esc(name)}！</div>
    <div style="font-size:16px;font-weight:700;margin:8px 0">${gm.rule}</div>
    <div style="font-size:13px;color:#8a6a3b">輸了也不會白費：會得到 1 片「怪物碎片」，集滿 ${CFG.shardNeed} 片就能直接收服！</div>
    <button class="cap-btn go" id="c-go">▶ 開始！</button><button class="cap-btn no" id="c-no">先不要</button>`;
   $('#c-go',box).onclick=()=>r(true);$('#c-no',box).onclick=()=>r(false)});
  if(!go){close();return 'cancel'}
  upd(p=>{p.pending={k:ctx.key,t:Date.now(),g:gm.id}});      /* 先記一筆：中途關網頁也算挑戰過一次 */
  let w=0,l=0,draws=0,round=0,aborted=false,abortRes;
  const abortP=new Promise(r=>{abortRes=r});
  const miss=missFor(ctx.gid,ctx.st.id);
  box.innerHTML=`<div class="cap-score" id="c-sc"></div><div class="cap-area" id="c-area"></div><div style="margin-top:8px"><button class="cap-btn no" id="c-quit" style="font-size:13px;padding:4px 10px">🏳️ 放棄</button></div>`;
  const sc=()=>{const e=$('#c-sc',box);if(e)e.innerHTML=`你 ${dots(w,2)}　VS　${esc(name)} ${dots(l,2)}<small>${gm.icon} ${gm.name}｜第 ${round+1} 局｜先贏 2 局</small>`};
  $('#c-quit',box).onclick=()=>{if(confirm('放棄的話這次收服就算輸了喔（會得到 1 片碎片）。確定嗎？')){aborted=true;abortRes('x')}};
  while(w<2&&l<2&&!aborted){
   sc();const area=$('#c-area',box);area.onclick=null;
   const r=CFG.forceResult?CFG.forceResult:await Promise.race([GFN[gm.id](area,{miss,round,draws,alive:()=>alive&&!aborted}),abortP]);
   if(r==='x'||aborted)break;
   if(r==='w')w++;else if(r==='l')l++;else draws++;
   round++;sc();
   const bn=document.createElement('div');bn.className='cap-banner';bn.innerHTML=r==='w'?'<span style="color:#2e9e5b">🎉 這局你贏了！</span>':r==='l'?'<span style="color:#d63a3a">😵 這局輸了</span>':'<span style="color:#7a6a50">🤝 平手，重來一局</span>';
   area.appendChild(bn);r==='w'?sWin():r==='l'?sLose():beep(400,.15);await sleep(1300);if(!alive)return 'cancel'}
  res=(w>=2)?'w':'l';
  upd(p=>{p.pending=null;log(p,{k:ctx.key,g:gm.id,r:aborted?'x':res,w,l,d:draws,s:ctx.stars,m:Math.round(miss*100)})});
 }
 if(!alive)return 'cancel';
 if(res!=='w'){
  const p=upd(p=>{const m=mon(p,ctx.key);m.sh=(m.sh||0)+1;m.met=1;m.lose=(m.lose||0)+1;p.mons[ctx.key]=m});
  const sh=mon(p,ctx.key).sh;sLose();
  box.innerHTML=`<h2>💨 ${esc(name)}逃走了……</h2><div class="cap-note">沒關係！你得到 <b>1 片怪物碎片</b> 🧩<br>目前 ${Math.min(sh,CFG.shardNeed)} / ${CFG.shardNeed} 片${sh>=CFG.shardNeed?'<br>🎉 碎片集滿了！下次可以直接收服！':''}</div>
   <button class="cap-btn go" id="c-again">${sh>=CFG.shardNeed?'🧩 用碎片直接收服':'💪 再挑戰一次'}</button><button class="cap-btn no" id="c-out">回到結算畫面</button>`;
  return new Promise(r=>{
   $('#c-again',box).onclick=()=>{close();r(sh>=CFG.shardNeed?'again-free':'again')};
   $('#c-out',box).onclick=()=>{close();r('lost')}})}
 /* 贏了：先決定品質並存檔，再讓玩家開寶箱（開箱只是演出，關掉網頁也不會白贏）*/
 const rar=rollCapture(ctx.stars);let kind='new';
 upd(p=>{const m=mon(p,ctx.key);kind=m.n===0?'new':rar>m.best?'up':'dup';if(kind==='dup')m.sh=(m.sh||0)+1;m.n++;if(rar>m.best)m.best=rar;m.met=1;m.t=Date.now();m.lose=0;p.mons[ctx.key]=m;log(p,{k:ctx.key,g:ctx.free?'free':(gm&&gm.id),r:'cap',q:rar,s:ctx.stars})});
 await new Promise(r=>{
  box.innerHTML=`<h2>🎉 收服成功！</h2><div class="cap-note">${esc(name)}被你收服了！打開寶箱看看牠的品質～</div>
   <button class="cap-big" id="c-chest" style="animation:capPop 1s infinite alternate">🎁 打開寶箱</button>`;
  $('#c-chest',box).onclick=()=>r()});
 try{window.HERO&&HERO.emit&&HERO.emit('chest',{rar})}catch(e){}
 beep(300,.15,'square',.04);rar>=4?sWin():beep(660,.2,'triangle');
 const note=kind==='new'?'🆕 第一次收服！已加入圖鑑和休息區':kind==='up'?'⬆️ 品質升級了！':'已經有同樣或更好的了，轉成 1 片怪物碎片 🧩';
 box.innerHTML=`<h2>✨ 獲得【${RAR[rar]}】${esc(name)}！</h2>
  <div class="cap-card r${rar}" style="--c:${RCOL[rar]}">${figM(ctx.key,read(),130)}<div style="font-weight:900;font-size:17px">${esc(name)}</div><div class="cap-star" style="color:${RCOL[rar]}">${'★'.repeat(rar)}${'☆'.repeat(5-rar)}</div><div style="font-weight:900;color:${RCOL[rar]}">【${RAR[rar]}】</div></div>
  <div class="cap-note">${note}</div><button class="cap-btn go" id="c-ok">太棒了！</button>`;
 if(rar>=4)confetti(box);
 return new Promise(r=>{$('#c-ok',box).onclick=()=>{close();r('captured')}})}
function confetti(host){const c=document.createElement('div');c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:100002;overflow:hidden';
 for(let i=0;i<36;i++){const s=document.createElement('span');s.textContent=pick(['✨','⭐','🎉','💫','🌟']);s.style.cssText=`position:absolute;left:${Math.random()*100}%;top:-30px;font-size:${18+Math.random()*20}px;transition:transform ${1.6+Math.random()*1.4}s ease-in,opacity 2.8s;`;c.appendChild(s);
  setTimeout(()=>{s.style.transform=`translateY(${innerHeight+60}px) rotate(${Math.random()*540}deg)`;s.style.opacity='0'},30+Math.random()*400)}
 document.body.appendChild(c);setTimeout(()=>c.remove(),3500)}

/* ===================== 結算畫面上的「要收服嗎？」===================== */
function removePanel(){const o=$('#cap-panel');if(o)o.remove()}
function offerPanel(gid,st,stars){
 removePanel();const box=$('#result-overlay .modal-box');if(!box)return;
 const key=gid+'|'+st.id,p=document.createElement('div');p.id='cap-panel';p.className='cap-panel';
 const btns=$('.modal-buttons',box);btns?box.insertBefore(p,btns):box.appendChild(p);
 const ctx0={gid,st,key,stars};
 function render(state){
  const m=mon(read(),key),sh=m.sh||0;
  if(state==='done'){p.innerHTML=`<div class="cap-pimg">${figM(key,read(),76)}</div><div class="cap-ptxt">✅ 已收服 <b>${esc(st.name)}</b>【${RAR[m.best]}】<span style="color:#8a6a3b">（共 ${m.n} 次）</span><br><small>牠住在休息區和圖鑑裡囉！</small></div>`;return}
  if(state==='no'){p.innerHTML=`<div class="cap-ptxt">👋 這次先不收服。牠會在圖鑑裡留下一個剪影，再打贏一次就能再問你。</div>`;return}
  p.innerHTML=`<div class="cap-pimg">${figM(key,read(),76)}</div>
   <div class="cap-ptxt"><b>${esc(st.name)}</b> 被你打倒了！要收服牠嗎？<br><small style="color:#8a6a3b">${m.n>0?`牠已經在收藏裡（最高【${RAR[m.best]}】×${m.n}），再收服一次可能升級品質！`:'贏過小遊戲（三戰兩勝）就能收服，還能開寶箱！'}</small></div>
   <div class="cap-pbtns"><button id="cap-yes">🪢 收服牠！</button>${sh>=CFG.shardNeed?`<button class="free" id="cap-free">🧩 用 ${CFG.shardNeed} 片碎片收服</button>`:''}<button class="no" id="cap-no">不收服</button></div>
   ${sh?`<div class="cap-psh">🧩 ${esc(st.name)}的碎片：${Math.min(sh,CFG.shardNeed)} / ${CFG.shardNeed}</div>`:''}`;
  const run=async free=>{let r=await capture(Object.assign({},ctx0,{free}));
   while(r==='again'||r==='again-free')r=await capture(Object.assign({},ctx0,{free:r==='again-free'}));
   if(!document.body.contains(p))return;
   render(r==='captured'?'done':'')};
  $('#cap-yes',p).onclick=()=>run(false);
  const f=$('#cap-free',p);if(f)f.onclick=()=>run(true);
  $('#cap-no',p).onclick=()=>render('no')}
 render('');try{p.scrollIntoView({block:'nearest',behavior:'smooth'})}catch(e){}}

/* ===================== 休息區（地圖上）＋ 圖鑑 ===================== */
const LINES={
 add:['個位加個位，滿十就要進位喔！','加法可以交換：3＋5 和 5＋3 一樣大！','先湊成整十會算得更快！'],
 mul:['九九乘法表背熟，速度會變兩倍！','乘法就是「很多個一樣的數字相加」。','任何數字乘以 0 都是 0！'],
 div:['除法就是乘法倒過來想～','有餘數的時候，餘數一定比除數小喔！','不會除的時候，想想「幾乘幾是它」。'],
 ops:['先乘除、後加減；有括號先算括號！','一步一步算，每一步都檢查一下。','括號就像保護罩，先處理裡面的。'],
 any:['今天也辛苦了，休息一下再出發！','我在這裡等你回來～','加油！下一隻魔王也交給你了！','你好厲害，我最喜歡你了！']};
function allMons(){const out=[];GORDER.forEach(g=>{const c=CAT[g];if(c)c.stages.forEach(s=>out.push({g,k:g+'|'+s.id,s}))});return out}
const infoOf=k=>{const [g,id]=k.split('|'),c=CAT[g];return {g,id,s:c&&c.stages.find(x=>x.id===id)}};
let restSig='',dock,rest;
function ensureDock(){
 if(dock)return;dock=document.createElement('div');dock.id='cap-dock';const isHub=!window.HERO&&!!$('#room');
 dock.innerHTML='<button id="cap-bk">📖 怪物圖鑑</button><button id="cap-bt">🏕️ 休息區</button>';document.body.appendChild(dock);
 rest=document.createElement('div');rest.id='cap-rest';if(isHub){dock.classList.add('hub');rest.classList.add('hub')}document.body.appendChild(rest);
 $('#cap-bk',dock).onclick=()=>openCollection();
 $('#cap-bt',dock).onclick=()=>{upd(p=>{p.rest.hide=!p.rest.hide});restSig='';tick()};
 rest.addEventListener('click',e=>{const el=e.target.closest('.cap-pet');if(!el)return;const old=$('.cap-bub',el);if(old)old.remove();
  const g=el.dataset.g,b=document.createElement('div');b.className='cap-bub';b.textContent=pick((LINES[g]||[]).concat(LINES.any));el.appendChild(b);setTimeout(()=>b.remove(),2600)})}
function shownKeys(p){const caps=Object.keys(p.mons).filter(k=>p.mons[k].n>0&&infoOf(k).s);
 let show=Array.isArray(p.rest.show)?p.rest.show.filter(k=>caps.includes(k)):caps.sort((a,b)=>p.mons[b].t-p.mons[a].t);return show.slice(0,CFG.restMax)}
function tick(){
 const mp=$('#map-screen'),hubRoom=!window.HERO&&$('#room'),mm=$('#mm');
 const onMap=((!!mp&&!mp.classList.contains('hidden')&&mp.offsetParent!==null)||(!!hubRoom&&!(mm&&mm.classList.contains('on'))))&&!$('#cap-ov')&&!$('#cap-col')&&!$('#cap-dress');
 ensureDock();const p=read();const keys=shownKeys(p);
 dock.style.display=onMap?'flex':'none';
 const hide=!!p.rest.hide,has=keys.length>0;
 $('#cap-bt',dock).textContent=hide?'🏕️ 顯示休息區':'🏕️ 隱藏休息區';
 $('#cap-bt',dock).style.display=Object.keys(p.mons).some(k=>p.mons[k].n>0)?'':'none';
 rest.style.display=(onMap&&!hide&&has)?'block':'none';
 const sig=keys.join(',')+'|'+keys.map(k=>p.mons[k].best+JSON.stringify(p.mons[k].fit||{})+(p.mons[k].skin||'')).join('');
 if(sig!==restSig){restSig=sig;rest.innerHTML=keys.map((k,i)=>{const f=infoOf(k),m=p.mons[k],c=RCOL[m.best];
  const x=6+(i*(82/Math.max(1,keys.length)))+Math.random()*3,w=Math.round(40+Math.random()*60);
  return `<div class="cap-pet q${m.best}" data-g="${f.g}" title="${esc(f.s.name)}【${RAR[m.best]}】" style="left:${x}%;--c:${c};--d:${14+Math.random()*10}s;--dl:-${Math.random()*10}s;--w:${w}px">${figM(k,p,66)}</div>`}).join('')}}
setInterval(()=>{try{tick()}catch(e){}},700);

let colState={tab:'add',filter:'all'};
function openCollection(){
 const old=$('#cap-col');if(old)old.remove();
 const ov=document.createElement('div');ov.id='cap-col';document.body.appendChild(ov);ov.onclick=e=>{if(e.target===ov)ov.remove()};
 const draw=()=>{
  const p=read(),list=allMons(),total=list.length,got=list.filter(x=>mon(p,x.k).n>0).length,met=list.filter(x=>mon(p,x.k).met||mon(p,x.k).n>0).length;
  const tabs=GORDER.filter(g=>CAT[g]).map(g=>{const l=list.filter(x=>x.g===g);return `<button data-t="${g}" class="${colState.tab===g?'on':''}">${GNAME[g]} ${l.filter(x=>mon(p,x.k).n>0).length}/${l.length}</button>`}).join('');
  const FL=[['all','全部'],['got','已收服'],['no','未收服']].concat([1,2,3,4,5].map(i=>['q'+i,RAR[i]]));
  const chips=FL.map(([id,t])=>`<button data-f="${id}" class="${colState.filter===id?'on':''}">${t}</button>`).join('');
  const shown=new Set(shownKeys(p));
  const items=list.filter(x=>x.g===colState.tab).filter(x=>{const m=mon(p,x.k),f=colState.filter;return f==='all'||(f==='got'&&m.n>0)||(f==='no'&&m.n===0)||(f[0]==='q'&&m.best===+f[1])}).map(x=>{
   const m=mon(p,x.k),has=m.n>0,seen=has||m.met;
   if(has)return `<div class="cap-item q${m.best}" style="--c:${RCOL[m.best]}">${figM(x.k,p,84)}<div class="nm">${esc(x.s.name)}</div><div class="cap-star" style="color:${RCOL[m.best]}">${'★'.repeat(m.best)}</div><div class="sub">最高【${RAR[m.best]}】×${m.n}</div><button data-s="${x.k}" class="${shown.has(x.k)?'on':''}">${shown.has(x.k)?'🏕️ 展示中':'放進休息區'}</button> <button data-d="${x.k}">🎨 打扮</button></div>`;
   return `<div class="cap-item sil">${imgTag(x.s.img)}<div class="nm">${seen?esc(x.s.name):'？？？'}</div><div class="sub">${seen?'已遇見・未收服':'第 '+x.s.id+' 關的魔王'}${m.sh?`<br>🧩 ${Math.min(m.sh,CFG.shardNeed)}/${CFG.shardNeed}`:''}</div></div>`}).join('');
  ov.innerHTML=`<div class="cap-colbox"><div class="cap-colhead"><h2>📖 怪物圖鑑 <small style="font-size:14px;color:#8a6a3b">已收服 ${got}/${total}　遇見 ${met}/${total}</small></h2><button class="cap-x" id="cap-cx">✕</button></div>
   <div class="cap-tabs">${tabs}</div><div class="cap-chips">${chips}</div>
   <div class="cap-grid">${items||'<div style="grid-column:1/-1;color:#8a6a3b;padding:20px">這裡還沒有怪物。去打倒魔王、贏下收服挑戰吧！</div>'}</div>
   <div class="cap-colfoot"><button class="cap-btn" id="cap-ex" style="font-size:13px;padding:3px 10px">📤 匯出存檔碼</button><button class="cap-btn" id="cap-im" style="font-size:13px;padding:3px 10px">📥 匯入存檔碼</button><button class="cap-btn" id="cap-st" style="font-size:13px;padding:3px 10px">📊 老師數據</button><span style="color:#8a6a3b">換電腦時，用存檔碼就能帶走收藏。</span><div id="cap-ft" style="width:100%"></div></div></div>`;
  $('#cap-cx',ov).onclick=()=>ov.remove();
  ov.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{colState.tab=b.dataset.t;draw()});
  ov.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{colState.filter=b.dataset.f;draw()});
  ov.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>openDress(b.dataset.d,draw));
  ov.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{const k=b.dataset.s;upd(q=>{let cur=shownKeys(q);cur=cur.includes(k)?cur.filter(x=>x!==k):cur.concat(k).slice(-CFG.restMax);q.rest.show=cur;q.rest.hide=false});restSig='';draw()});
  const ft=$('#cap-ft',ov);
  $('#cap-ex',ov).onclick=()=>{const code=exportCode();ft.innerHTML=`<textarea readonly>${code}</textarea>請把這串文字整段複製起來保存。`;const t=$('textarea',ft);t.focus();t.select()};
  $('#cap-im',ov).onclick=()=>{ft.innerHTML=`<textarea id="cap-ta" placeholder="把存檔碼貼在這裡"></textarea><button class="cap-btn go" id="cap-go" style="font-size:13px;padding:3px 10px">匯入</button><span id="cap-im-msg"></span>`;
   $('#cap-go',ft).onclick=()=>{const r=importCode($('#cap-ta',ft).value);$('#cap-im-msg',ft).textContent=r?'✅ 匯入完成！':'❌ 存檔碼看不懂，請確認有完整複製';if(r){restSig='';draw()}}};
  $('#cap-st',ov).onclick=()=>{ft.innerHTML=statsHTML()}};
 draw()}
function exportCode(){const p=read();const o={v:1,mons:p.mons,rest:p.rest};return btoa(unescape(encodeURIComponent(JSON.stringify(o))))}
function importCode(s){try{const o=JSON.parse(decodeURIComponent(escape(atob(String(s).trim()))));if(!o||!o.mons)return false;
 upd(p=>{for(const k in o.mons){const a=p.mons[k]||{n:0,best:0,sh:0,met:0,t:0},b=o.mons[k];p.mons[k]={n:Math.max(a.n||0,b.n||0),best:Math.max(a.best||0,b.best||0),sh:Math.max(a.sh||0,b.sh||0),met:(a.met||b.met)?1:0,t:Math.max(a.t||0,b.t||0),lose:0}}
  if(o.rest&&Array.isArray(o.rest.show)&&!Array.isArray(p.rest.show))p.rest.show=o.rest.show});return true}catch(e){return false}}
function statsHTML(){const lg=read().log,by={};lg.forEach(e=>{if(!e.g||e.r==='cap')return;const b=by[e.g]=by[e.g]||{n:0,w:0,l:0,x:0};b.n++;if(e.r==='w')b.w++;else if(e.r==='x')b.x++;else b.l++});
 const qs=[0,0,0,0,0,0];lg.filter(e=>e.r==='cap').forEach(e=>qs[e.q]++);
 const nm={ttt:'井字遊戲',mem:'翻牌對對碰',gomoku:'五子棋'};
 return `<table><tr><th>小遊戲</th><th>挑戰</th><th>贏</th><th>輸</th><th>放棄</th><th>勝率</th></tr>${Object.keys(by).map(g=>`<tr><td>${nm[g]||g}</td><td>${by[g].n}</td><td>${by[g].w}</td><td>${by[g].l}</td><td>${by[g].x}</td><td>${Math.round(by[g].w/by[g].n*100)}%</td></tr>`).join('')||'<tr><td colspan=6>還沒有紀錄</td></tr>'}</table>
 <div style="margin-top:4px">開出的品質：${[1,2,3,4,5].map(i=>`${RAR[i]} ${qs[i]}`).join('　')}　（只統計這個勇者最近 ${CFG.logMax} 筆）</div>`}

/* ===================== 打扮・商店・頭像 ===================== */
function updRoot(f){const o=loadAll();f(o);try{localStorage.setItem(SKEY(),JSON.stringify(o))}catch(e){}return o}
function setFit(k,slot,id){upd(p=>{const m=mon(p,k);m.fit=Object.assign({},m.fit||{});if(id)m.fit[slot]=id;else delete m.fit[slot];p.mons[k]=m});restSig=''}
function openDress(k,after){
 const old=$('#cap-dress');if(old)old.remove();
 const ov=document.createElement('div');ov.id='cap-dress';document.body.appendChild(ov);const f=infoOf(k);
 const draw=()=>{const p=read(),m=mon(p,k),own=p.own||{},fit=m.fit||{};
  ov.innerHTML=`<div class="cap-dbox"><h2>🎨 幫「${esc(f.s.name)}」打扮</h2><div>${figM(k,p,150)}</div><div style="color:${RCOL[m.best]};font-weight:900">【${RAR[m.best]}】</div>
  <div class="cap-dslot"><b>🎭 樣貌</b><div class="cap-dchips"><button data-sk="" class="${m.skin&&skinOwned(p,k,m.skin)?'':'on'}">原樣</button>${skinsOf(k).map(v=>{const has=skinOwned(p,k,v.id);return `<button data-sk="${v.id}" class="${m.skin===v.id&&has?'on':''}${has?'':' lock'}"${has?'':' data-lock="1"'}>${v.icon} ${v.name}${has?'':' 🔒'}</button>`}).join('')}</div></div>
  ${ACC.slots.map(sl=>`<div class="cap-dslot"><b>${sl.icon} ${sl.name}</b><div class="cap-dchips"><button data-s="${sl.id}" data-id="" class="${fit[sl.id]?'':'on'}">無</button>${ACC.items.filter(x=>x.slot===sl.id).map(x=>{const has=own[x.id];return `<button data-s="${sl.id}" data-id="${x.id}" class="${fit[sl.id]===x.id?'on':''}${has?'':' lock'}"${has?'':' data-lock="1"'}>${x.icon} ${x.name}${has?'':' 🔒'}</button>`}).join('')}</div></div>`).join('')}
  <div style="font-size:12px;color:#8a6a3b;margin:6px 0">🔒 的物品要到「勇者小屋 → 商店 → 👾 怪物」用勇者幣購買。打扮物品買一次所有怪物都能穿；新樣貌每隻怪物各買各的。</div><button class="cap-btn go" id="dr-ok">完成</button></div>`;
  ov.querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>{if(b.dataset.lock)return;useSkin(k,b.dataset.sk,true);draw()});
  ov.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{if(b.dataset.lock)return;setFit(k,b.dataset.s,b.dataset.id);draw()});
  $('#dr-ok',ov).onclick=()=>{ov.remove();if(after)after()}};
 draw()}
function refresh(msg){try{window.render&&window.render()}catch(e){}restSig='';if(window.openShop)window.openShop(msg,'pet')}
function shopBody(){
 const p=read(),own=p.own||{},coin=loadAll().coin||0,caps=Object.keys(p.mons).filter(k=>p.mons[k].n>0&&infoOf(k).s);
 if(!caps.length)return `<div class="story" style="margin-top:8px">還沒有收服的怪物。去打倒魔王、贏下收服挑戰，這裡就會開啟牠的新樣貌和打扮物品！</div>`;
 const block=k=>{const f=infoOf(k),m=p.mons[k];
  const chips=skinsOf(k).map(v=>{const has=skinOwned(p,k,v.id),pr=skinPrice(v),on=has&&m.skin===v.id;
   return has?`<button class="sbtn ${on?'b':'g'}" onclick="HeroPets.useSkin('${k}','${on?'':v.id}')">${v.icon} ${v.name}${on?'（使用中・點一下換回原樣）':'（已擁有・套用）'}</button>`
    :`<button class="sbtn o" ${coin<pr?'disabled':''} onclick="HeroPets.buy('skin','${k}|${v.id}')">${v.icon} ${v.name} 🪙${pr}</button>`}).join(' ');
  return `<div class="gd2"><div class="th2">${figM(k,p,56)}</div><div class="tx2"><b>${esc(f.s.name)}</b> <span style="color:${RCOL[m.best]}">【${RAR[m.best]}】</span><div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">${chips}</div></div></div>`};
 const irow=x=>{const has=own[x.id],pr=accPrice(x.id);
  return `<div class="gd2"><div class="th2" style="font-size:34px">${x.icon}</div><div class="tx2"><b>${esc(x.name)}</b><br><small>${has?'✔ 已擁有（到圖鑑幫怪物穿上）':'🪙 '+pr}</small></div><div class="bt">${has?'':`<button class="sbtn o" ${coin<pr?'disabled':''} onclick="HeroPets.buy('acc','${x.id}')">🪙 ${pr} 購買</button>`}</div></div>`};
 return `<div class="cap-shop"><div class="story" style="margin-top:8px">打倒並收服的怪物，會在這裡開啟牠的<b>新樣貌</b>（同一種怪物的不同外型，每個樣貌一個價錢、不分品質，買了之後牠在戰鬥畫面、休息區、小屋和圖鑑都會變成新樣貌）和<b>打扮物品</b>（穿戴在怪物身上的配件，買一次所有怪物都能穿，到 📖 圖鑑按「🎨 打扮」穿上）。<br><button class="sbtn b" style="margin-top:6px" onclick="HeroPets.openCollection()">📖 打開圖鑑幫怪物打扮</button></div>
 <div class="shopsec">🎭 怪物新樣貌</div>${caps.sort((a,b)=>p.mons[b].best-p.mons[a].best).map(block).join('')}
 ${ACC.slots.map(sl=>`<div class="shopsec">${sl.icon} ${sl.name}</div>`+ACC.items.filter(x=>x.slot===sl.id).map(irow).join('')).join('')}</div>`}
function buy(kind,id){
 const p=read(),coin=loadAll().coin||0;let price,name,k,sid2;
 if(kind==='skin'){const i=id.lastIndexOf('|');k=id.slice(0,i);sid2=id.slice(i+1);const v=skinsOf(k).find(x=>x.id===sid2),f=infoOf(k);if(!v||!f.s||!(mon(p,k).n>0))return;
  if(skinOwned(p,k,sid2))return refresh('✅ 已經擁有了');price=skinPrice(v);name=f.s.name+'的「'+v.name+'」樣貌'}
 else{const x=accOf(id);if(!x)return;if((p.own||{})[id])return refresh('✅ 你已經擁有了');price=accPrice(id);name=x.name}
 if(coin<price)return refresh(`❌ 勇者幣不夠，還差 ${price-coin} 枚，再去打幾場吧！`);
 if(price>=500&&!confirm(`確定要花 ${price} 枚勇者幣買「${name}」嗎？`))return;
 updRoot(o=>{o.coin=(o.coin||0)-price;o.stat=o.stat||{buy:{},use:{},spent:0};o.stat.buy=o.stat.buy||{};o.stat.use=o.stat.use||{};o.stat.spent=(o.stat.spent||0)+price;o.stat.buy['pet:'+id]=(o.stat.buy['pet:'+id]||0)+1;
  const pp=o.pets=Object.assign(blank(),o.pets||{});pp.mons=pp.mons||{};pp.rest=pp.rest||{};pp.log=pp.log||[];
  if(kind==='skin'){pp.skinOwn=Object.assign({},pp.skinOwn,{[id]:1});const m=pp.mons[k]=Object.assign({n:0,best:0,sh:0,met:1,t:0},pp.mons[k]);m.skin=sid2}else pp.own=Object.assign({},pp.own,{[id]:1})});
 refresh(`✅ 購買成功！「${name}」`+(kind==='skin'?'，已經幫牠換上了，到休息區或小屋看看吧':'，到圖鑑幫怪物穿上吧'))}
function useSkin(k,id,silent){upd(p=>{const m=mon(p,k);if(id)m.skin=id;else delete m.skin;p.mons[k]=m});restSig='';if(!silent)refresh(id?'✅ 樣貌換好了':'✅ 已換回原樣')}
/* 戰鬥畫面：打到已收服的怪物時，魔王圖用你買的新樣貌＋打扮 */
let bossFit=null,bossObs=null;
function applyBoss(){
 if(bossObs){bossObs.disconnect();bossObs=null}bossFit=null;
 const img=$('#boss-img');if(!img)return;img.style.filter='';
 let gid,st;try{gid=(window.HERO_CFG||{}).id;st=currentStageObj}catch(e){return}if(!CAT[gid]||!st)return;
 const k=gid+'|'+st.id,p=read(),m=mon(p,k);if(!(m.n>0))return;
 const v=curSkinOf(p,k),au=accOf((m.fit||{}).aura),want=v&&v.img?v.img:null;
 img.style.filter=[v&&v.filter,au&&au.filter].filter(Boolean).join(' ');
 if(!want&&img.dataset.capSkin&&st.img){img.src=st.img;delete img.dataset.capSkin}
 if(want){img.dataset.capSkin='1';if(img.getAttribute('src')!==want)img.src=want;bossObs=new MutationObserver(()=>{if(img.getAttribute('src')!==want)img.src=want});bossObs.observe(img,{attributes:true,attributeFilter:['src']})}
 bossFit=m.fit||null}
function bossOverlay(){
 const SL=['head','face','neck','hold'];let el=null,key='';
 function tick(){
  const img=$('#boss-img');
  if(img&&bossFit&&SL.some(x=>bossFit[x])){
   const par=img.parentNode;
   if(!el||el.parentNode!==par){el=document.createElement('div');el.className='cap-hgl';el.style.cssText='position:absolute;pointer-events:none;margin:0;padding:0;border:0';if(getComputedStyle(img).position==='static')img.style.position='relative';par.insertBefore(el,img.nextSibling);key=''}
   const cs=getComputedStyle(img),iw=img.offsetWidth,ih=img.offsetHeight,hide=!img.naturalWidth||!iw||cs.display==='none'||cs.visibility==='hidden'||par.classList.contains('boss-defeated');
   el.style.display=hide?'none':'';
   if(!hide){const k2=JSON.stringify(bossFit)+ih;if(k2!==key){key=k2;el.innerHTML=SL.map(x=>{const it=accOf(bossFit[x]);return it?`<i class="cap-a ${x}">${it.icon}</i>`:''}).join('')}
    const st=el.style;st.left=img.offsetLeft+'px';st.top=img.offsetTop+'px';st.width=iw+'px';st.height=ih+'px';st.setProperty('--h',ih+'px');st.transform=cs.transform==='none'?'':cs.transform;st.transformOrigin=cs.transformOrigin;st.opacity=cs.opacity}}
  else if(el)el.style.display='none';
  requestAnimationFrame(tick)}
 requestAnimationFrame(tick)}

/* ===================== 接上遊戲事件 ===================== */
function recoverPending(){const p=read();if(!p.pending)return;const k=p.pending.k;
 upd(q=>{const m=mon(q,k);m.sh=(m.sh||0)+1;m.met=1;q.mons[k]=m;log(q,{k,g:q.pending.g,r:'x',w:0,l:0,d:0});q.pending=null})}
function hook(){
 const H=window.HERO;if(!H||!H.on)return;
 H.on('start',()=>{removePanel();setTimeout(applyBoss,30);try{const gid=(window.HERO_CFG||{}).id,st=currentStageObj;if(CAT[gid]&&st)upd(p=>{const m=mon(p,gid+'|'+st.id);m.met=1;p.mons[gid+'|'+st.id]=m})}catch(e){}});
 H.on('lose',removePanel);
 H.on('win',d=>{
  if(!CFG.on||H.endless)return;const gid=(window.HERO_CFG||{}).id;if(!CAT[gid])return;
  let st;try{st=currentStageObj}catch(e){return}if(!st)return;
  const cs=CAT[gid].stages.find(s=>s.id===st.id)||{};
  offerPanel(gid,{id:st.id,name:st.boss||cs.name||'魔王',img:st.img||cs.img},(d&&d.stars)||1)})}
try{recoverPending()}catch(e){}
hook();if(window.HERO)try{bossOverlay()}catch(e){}
window.HeroPets={games:GFN,openCollection,openDress,shopBody,buy,useSkin,read,rollRarity,rollCapture,offer:offerPanel,capture,exportCode,importCode,CFG,CAT,_tick:tick};
})();