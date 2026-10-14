/* 勇者共用核心 hero-core.js — 由「整數勇者總部」載入各章遊戲時共用
   功能：①網址 ?mode= 直接進入（略過遊戲內的模式選擇） ②教學／挑戰／地獄三種難度、進度共用、星等依難度封頂
         ③勇者等級／經驗值／能力值（公式比照負數勇者） ④怪物 10 下擊殺 ⑤連擊＋計時＋總分 HUD */
(function(){
'use strict';
const cfg=window.HERO_CFG||{}, q=new URLSearchParams(location.search);
const TIER=['teach','quick','hell'].includes(q.get('mode'))?q.get('mode'):null;
const CAP={teach:2,quick:4,hell:5}, TIERNAME={teach:'🎓教學',quick:'⚔️挑戰',hell:'🔥地獄'};
let stu=q.get('student');
if(!stu){try{const a=JSON.parse(localStorage.getItem('keyagent_active_student')||'null');stu=a&&a.studentNumber}catch(e){}}
const SK='heroRPG_v1:'+(stu||'guest');
const ld=()=>{try{return JSON.parse(localStorage.getItem(SK))||{}}catch(e){return{}}};
const sv=o=>{try{localStorage.setItem(SK,JSON.stringify(o))}catch(e){}};
const BASE={hp:1000,atk:50,def:20,spd:100},GROWTH={hp:100,atk:5,def:3,spd:1};
const need=l=>50+l*l*50;
function lvInfo(){let l=1,r=ld().exp||0;while(r>=need(l)){r-=need(l);l++}return{level:l,cur:r,need:need(l)}}
function stats(){const l=lvInfo().level,o={};for(const k in BASE)o[k]=BASE[k]+GROWTH[k]*(l-1);return o}
const H=window.HERO={tier:TIER,cap:CAP,cfg,score:0,gainXp:0,lvStart:1,mc:0,maxCombo:0,stageKey:null,t0:0,
 lvInfo,stats,
 /* 開戰：算出勇者血量、怪物血量（剛好連對 10 下打倒）*/
 begin(idx,stageKey){
  const lv=lvInfo().level,st=stats(),sf=1+.03*idx,hell=TIER==='hell'?1.5:1;
  H.pa=st.atk;H.pdef=st.def;H.lvStart=lv;H.score=0;H.gainXp=0;H.mc=0;H.maxCombo=0;H.stageKey=stageKey;H.t0=Date.now();
  H.ma=Math.round(2*(BASE.atk+GROWTH.atk*(lv-1))*sf*hell);
  H.md=Math.round(.5*(BASE.def+GROWTH.def*(lv-1))*sf);
  let mmax=0;for(let i=0;i<10;i++)mmax+=Math.max(1,Math.round(H.pa*(1+.2*i)*1.1-H.md));
  hud();return{pmax:st.hp,mmax};
 },
 addXp(n){const o=ld();o.exp=(o.exp||0)+n;sv(o);H.gainXp+=n},
 /* 答對：回傳傷害；順便加經驗與分數（每題 100×連擊÷秒數）*/
 hit(combo,sec){
  H.mc=0;H.maxCombo=Math.max(H.maxCombo,combo);H.addXp(10);
  H.score+=Math.round(100*Math.max(1,combo)/Math.max(3,sec||10));hud();
  return Math.max(1,Math.round(H.pa*(1+.2*(combo-1))*1.1-H.md))},
 heal(){return Math.max(1,Math.round((H.pa*.95-H.md)/2))},
 /* 答錯／超時：回傳勇者受到的傷害 */
 hurt(){H.mc++;H.addXp(1);hud();return Math.max(1,Math.round(H.ma*(1+.2*(H.mc-1))-H.pdef))},
 bonusText(c){return c>=2?'(連擊 ×'+(1+.2*(c-1)).toFixed(1)+')':''},
 /* 存本關總分（每關只留最高）*/
 saveScore(){
  if(!H.stageKey||H.score<=0)return;const o=ld();o.best=o.best||{};const b=o.best[cfg.id]=o.best[cfg.id]||{};
  const k=H.stageKey+'|'+(TIER||'quick');if(!(b[k]>=H.score))b[k]=H.score;o.lastPlay=o.lastPlay||{};o.lastPlay[cfg.id+'|'+(TIER||'quick')]=new Date().toISOString().slice(0,10);sv(o)},
 chapterScore(id){const b=(ld().best||{})[id]||{};return Object.values(b).reduce((a,c)=>a+c,0)}
};
/* ===== HUD：等級／能力／連擊／總分 ===== */
let box;
function hud(){
 if(!box){box=document.createElement('div');box.id='hero-hud';
  box.style.cssText='position:fixed;left:50%;bottom:4px;transform:translateX(-50%);z-index:60;pointer-events:none;background:#000b;color:#fff;border:1px solid #ffd24a;border-radius:99px;padding:3px 14px;font:600 13px/1.5 "Noto Sans TC","Microsoft JhengHei",sans-serif;white-space:nowrap;max-width:96vw;overflow:hidden';
  document.body.appendChild(box)}
 const li=lvInfo(),s=stats(),c=(typeof combo!=='undefined'?combo:H.neg||0);
 box.innerHTML=`${TIER?TIERNAME[TIER]+' ':''}Lv.${li.level} <span style="color:#7dff9b">XP ${li.cur}/${li.need}</span> ｜ ❤️${s.hp} ⚔️${s.atk} 🛡️${s.def} ｜ 🔥連擊 ${c} ｜ 🏆本關 ${H.score}`}
window.addEventListener('DOMContentLoaded',()=>{hud()});
/* ===== 掛進原本的遊戲函式 ===== */
function wrap(name,fn){const o=window[name];if(typeof o==='function')window[name]=function(){return fn.call(this,o,arguments)}}
window.addEventListener('load',()=>{
 /* 進度共用：教學版與挑戰版寫進同一份存檔 */
 if(cfg.key){
  window.progressKey=()=>cfg.key;
  if(typeof window.localKey==='function')window.localKey=()=>(window.LOCAL_KEY||'hero-local');
  wrap('loadProgress',(o,a)=>{const p=o.apply(null,a);try{
    const sh=(typeof loadSharedSave==='function'?loadSharedSave():{})[cfg.key+'Teach'];const t=sh&&(sh.stages||sh.layers);
    if(t)for(const id in t){const x=p[id]=p[id]||{unlocked:false,stars:0};if(t[id].unlocked)x.unlocked=true;if((t[id].stars||0)>(x.stars||0))x.stars=t[id].stars}}catch(e){}return p});
 }
 /* 地獄：限時 ×0.6 */
 if(TIER==='hell'){wrap('stageVal',(o,a)=>Math.max(3,Math.round(o.apply(null,a)*.6)));wrap('tpq',(o,a)=>Math.max(3,Math.round(o.apply(null,a)*.6)))}
 /* 星等依難度封頂：教學最高 2★、挑戰 4★、地獄 5★ */
 if(TIER){
  wrap('calculateStars',(o,a)=>Math.min(o.apply(null,a),CAP[TIER]));
  wrap('tierFor',(o,a)=>{const t=o.apply(null,a);if(!t||t.stars<=CAP[TIER])return t;return (window.TIERS||[]).find(x=>x.stars===CAP[TIER])||t});
 }
 /* 結算畫面補上：總分、經驗、升級 */
 wrap('endGame',(o,a)=>{H.saveScore();const r=o.apply(null,a);try{const el=document.getElementById('result-stats'),li=lvInfo();
  if(el)el.insertAdjacentHTML('beforeend',`<div><strong>本關總分：</strong> <span style="color:#E67E22">${H.score}</span>（最高連擊 ${H.maxCombo}）</div><div><strong>獲得經驗：</strong> +${H.gainXp}　Lv.${li.level}${li.level>H.lvStart?' 🎉升級！':''}</div>${TIER?`<div style="color:#7F8C8D">${TIERNAME[TIER]}模式最高 ${CAP[TIER]}★；想拿更高星等請到更高難度挑戰</div>`:''}`)}catch(e){}return r});
 /* 直接進入：略過遊戲內的「選擇教學／快速」畫面 */
 if(TIER){
  try{if(typeof chooseMode==='function')chooseMode(TIER==='teach'?'teach':'quick')}catch(e){}
  const b=document.getElementById('mode-switch');if(b)b.style.display='none';
 }
 /* 減法勇者（拼圖層）：沒有怪物，補連擊／分數／經驗 */
 if(cfg.type==='puzzle'){
  window.combo=0;let qs0=0;
  wrap('startLayer',(o,a)=>{H.begin(0,'L'+a[0]);H.score=0;window.combo=0;qs0=Date.now();return o.apply(null,a)});
  wrap('nextQuestion',(o,a)=>{qs0=Date.now();return o.apply(null,a)});
  wrap('processAnswer',(o,a)=>{const c0=typeof correctCount==='number'?correctCount:0;const r=o.apply(null,a);
   if(typeof correctCount==='number'&&correctCount>c0){window.combo++;H.hit(window.combo,(Date.now()-qs0)/1000)}else{window.combo=0;H.hurt()}hud();return r});
  wrap('finishLayer',(o,a)=>{H.saveScore();const r=o.apply(null,a);try{const li=lvInfo(),af=document.getElementById('rs-after');
   const old=document.getElementById('hero-rs');if(old)old.remove();
   if(af)af.insertAdjacentHTML('afterend',`<div id="hero-rs" style="text-align:center;margin:6px 0;font-weight:700">🏆 本層總分 ${H.score}　🔥最高連擊 ${H.maxCombo}　✨經驗 +${H.gainXp}　Lv.${li.level}${li.level>H.lvStart?' 🎉升級！':''}</div>`)}catch(e){}return r});
 }
 /* 負數勇者：已有等級／10 下擊殺，只補總分 */
 if(cfg.type==='neg'){
  if(TIER){try{const mp={teach:'teach',quick:'hard',hell:'hell'};if(typeof enterMode==='function')enterMode(mp[TIER])}catch(e){}}
  let lastS=null,lastTot=0,tq=0;
  setInterval(()=>{try{const S=window.eval('typeof S!=="undefined"&&S?S:null');
   if(S!==lastS){lastS=S;lastTot=S?S.total:0;tq=Date.now();H.score=0;H.maxCombo=0;H.stageKey=S&&S.stg?String(S.stg.id):null;H.neg=0;hud()}
   if(S){H.neg=S.pc||0;H.maxCombo=Math.max(H.maxCombo,S.pc||0);
    if(S.total>lastTot){const sec=(Date.now()-tq)/1000;tq=Date.now();lastTot=S.total;if(S.pc>0&&S.correct>0&&(S._lc||0)<S.correct){S._lc=S.correct;H.score+=Math.round(100*S.pc/Math.max(3,sec))}hud()}
    if(S.over&&!S._sv){S._sv=1;H.saveScore();hud()}}}catch(e){}},300);
 }
});
})();
