/* 勇者共用核心 hero-core.js — 各章遊戲共用的「整合層」
   ①?mode= 直接進入 ②地圖三段難度切換 ③星等＝負數標準（正確率），難度封頂；超出封頂的星顯示成「半亮」
   ④勇者等級／經驗／能力（比照負數）、怪物 10 下擊殺 ⑤連擊＋計時＋總分（教學×1、挑戰×2、地獄×3）
   ⑥連續失敗溫柔提示 ⑦大關／全章無限模式 ⑧錯題收集 ⑨四則通關後與負數合併等級 ⑩角色名稱 */
(function(){
'use strict';
const cfg=window.HERO_CFG||{}, q=new URLSearchParams(location.search);
let TIER=['teach','quick','hell'].includes(q.get('mode'))?q.get('mode'):null;
const CAP={teach:2,quick:4,hell:5}, MULT={teach:1,quick:2,hell:3}, TIERNAME={teach:'🎓教學',quick:'⚔️挑戰',hell:'🔥地獄'};
const rawStars=a=>a>=1?5:a>=.9?4:a>=.8?3:a>=.7?2:a>=.6?1:0;
let stu=q.get('student');
if(!stu){try{const a=JSON.parse(localStorage.getItem('keyagent_active_student')||'null');stu=a&&a.studentNumber}catch(e){}}
const SK='heroRPG_v1:'+(stu||'guest');
const ld=()=>{try{return JSON.parse(localStorage.getItem(SK))||{}}catch(e){return{}}};
const sv=o=>{try{localStorage.setItem(SK,JSON.stringify(o))}catch(e){}};
const upd=f=>{const o=ld();f(o);sv(o);return o};
const BASE={hp:1000,atk:50,def:20,spd:100},GROWTH={hp:100,atk:5,def:3,spd:1};
const need=l=>50+l*l*50;
function lvInfo(){let l=1,r=ld().exp||0;while(r>=need(l)){r-=need(l);l++}return{level:l,cur:r,need:need(l)}}
function stats(){const l=lvInfo().level,o={};for(const k in BASE)o[k]=BASE[k]+GROWTH[k]*(l-1);return o}
const today=()=>new Date().toISOString().slice(0,10);
const E=(tag,css,html)=>{const e=document.createElement(tag);if(css)e.style.cssText=css;if(html!=null)e.innerHTML=html;return e};
const H=window.HERO={cap:CAP,mult:MULT,cfg,score:0,gainXp:0,pend:0,lvStart:1,mc:0,maxCombo:0,stageKey:null,t0:0,lastRaw:0,endless:null,lvInfo,stats,rawStars,
 setTier(t){TIER=t;hud();syncSwitch()},
 begin(idx,stageKey){
  const lv=lvInfo().level,st=stats(),sf=1+.03*idx,hell=TIER==='hell'?1.5:1;
  H.pa=st.atk;H.pdef=st.def;H.lvStart=lv;H.score=0;H.gainXp=0;H.pend=0;H.mc=0;H.maxCombo=0;H.stageKey=stageKey;H.t0=Date.now();
  H.ma=Math.round(2*(BASE.atk+GROWTH.atk*(lv-1))*sf*hell);
  H.md=Math.round(.5*(BASE.def+GROWTH.def*(lv-1))*sf);
  let mmax=0;for(let i=0;i<10;i++)mmax+=Math.max(1,Math.round(H.pa*(1+.2*i)*1.1-H.md));
  hud();return{pmax:st.hp,mmax}},
 /* 經驗：一般關卡立刻存；無限模式先暫存，打倒怪物才結算 */
 addXp(n){H.gainXp+=n;if(H.endless)H.pend+=n;else upd(o=>{o.exp=(o.exp||0)+n})},
 commitXp(){if(H.pend>0){const n=H.pend;upd(o=>{o.exp=(o.exp||0)+n})}H.pend=0},
 pts(combo,sec,tier){return Math.round(100*Math.max(1,combo)/Math.max(3,sec||10)*MULT[tier||TIER||'quick'])},
 hit(combo,sec){H.mc=0;H.maxCombo=Math.max(H.maxCombo,combo);H.addXp(10);H.score+=H.pts(combo,sec);hud();
  return Math.max(1,Math.round(H.pa*(1+.2*(combo-1))*1.1-H.md))},
 heal(){return Math.max(1,Math.round((H.pa*.95-H.md)/2))},
 hurt(){H.mc++;H.addXp(1);H.recWrong();hud();return Math.max(1,Math.round(H.ma*(1+.2*(H.mc-1))-H.pdef))},
 bonusText(c){return c>=2?'(連擊 ×'+(1+.2*(c-1)).toFixed(1)+')':''},
 /* 錯題收集：題目文字＋正確答案；到總部「錯題練習」答對 3 次才會消失 */
 recWrong(){try{
  const el=(typeof ui!=='undefined'&&ui&&ui.question)||document.getElementById('pz-question')||document.getElementById('question');
  const t=(el&&el.innerText||'').replace(/\s+/g,' ').trim();
  let a=typeof currentAnswer!=='undefined'?currentAnswer:(typeof curAns!=='undefined'?curAns:null);
  if(!t||!/\d/.test(t)||a==null||a===''||typeof a==='object')return;
  const r=(cfg.id==='div'&&typeof currentRem!=='undefined')?currentRem:null;
  upd(o=>{o.wrong=o.wrong||[];const k=cfg.id+'|'+t,it=o.wrong.find(x=>x.k===k);
   if(it)it.n=0;else{o.wrong.push({k,c:cfg.id,q:t,a,r,n:0});if(o.wrong.length>200)o.wrong.shift()}})}catch(e){}},
 saveScore(){
  if(!H.stageKey||H.score<=0)return;const o=ld();o.best=o.best||{};const b=o.best[cfg.id]=o.best[cfg.id]||{};
  const k=H.stageKey+'|'+(TIER||'quick');if(!(b[k]>=H.score))b[k]=H.score;
  o.lastPlay=o.lastPlay||{};o.lastPlay[cfg.id+'|'+(TIER||'quick')]=today();sv(o)},
 chapterScore(id){const b=(ld().best||{})[id]||{};return Object.values(b).reduce((a,c)=>a+c,0)}
};
Object.defineProperty(H,'tier',{get:()=>TIER});
/* ===== 彈出視窗（溫柔提示、無限模式結算共用）===== */
function modal(html,btns){
 const old=document.getElementById('hero-modal');if(old)old.remove();
 const m=E('div','position:fixed;inset:0;z-index:300;background:#000b;display:flex;align-items:center;justify-content:center;padding:14px;font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif');m.id='hero-modal';
 const b=E('div','background:#1b1e3b;color:#fff;border:3px solid #ffd24a;border-radius:18px;padding:18px;max-width:480px;width:100%;text-align:center;font-size:18px;line-height:1.7',html+'<div id="hm-b" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px"></div>');
 m.appendChild(b);document.body.appendChild(m);
 btns.forEach(([t,f,c])=>{const x=E('button','font:800 18px inherit;padding:10px 16px;border-radius:12px;border:0;color:#fff;cursor:pointer;background:'+(c||'#4a5bd8'),t);x.onclick=()=>{m.remove();f&&f()};b.querySelector('#hm-b').appendChild(x)});
}
H.modal=modal;
/* ===== 下方狀態列 ===== */
let box;
function hud(){
 if(!document.body)return;
 if(!box){box=E('div','position:fixed;left:50%;bottom:4px;transform:translateX(-50%);z-index:60;pointer-events:none;background:#000b;color:#fff;border:1px solid #ffd24a;border-radius:99px;padding:3px 14px;font:600 14px/1.5 "Noto Sans TC","Microsoft JhengHei",sans-serif;white-space:nowrap;max-width:98vw;overflow:hidden');box.id='hero-hud';document.body.appendChild(box)}
 const li=lvInfo(),s=stats(),c=(typeof combo!=='undefined'?combo:H.neg||0),nm=ld().name;
 box.innerHTML=`${nm?'🧙'+nm.replace(/</g,'&lt;')+' ':''}${H.endless?'♾️無限 擊殺'+H.endless.kills+' ':''}${TIER?TIERNAME[TIER]+' ':''}Lv.${li.level} <span style="color:#7dff9b">XP ${li.cur}/${li.need}</span> ｜ ❤️${s.hp} ⚔️${s.atk} 🛡️${s.def} ｜ 🔥連擊 ${c} ｜ 🏆本關 ${H.score}${TIER?'（×'+MULT[TIER]+'）':''}`}
/* ===== 地圖左上角：難度切換＋無限模式面板 ===== */
let sw,ep;
const mapVisible=()=>{const m=document.getElementById('map-screen');return !!m&&!m.classList.contains('hidden')&&getComputedStyle(m).display!=='none'};
function buildPanels(){
 if(sw||cfg.type==='neg')return;
 const st=E('style',null,'#hero-tier,#hero-endless{position:fixed;left:6px;z-index:70;display:none;gap:6px;flex-wrap:wrap;font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;max-width:96vw}#hero-tier{top:6px}#hero-endless{top:60px}#hero-tier button,#hero-endless button{font:900 clamp(16px,4.4vw,24px)/1.2 inherit;white-space:nowrap;padding:7px clamp(8px,2.6vw,14px);border-radius:12px;border:3px solid #fff;color:#fff;cursor:pointer;box-shadow:0 4px 0 #0007;opacity:.72}#hero-tier button.on{opacity:1;transform:translateY(-2px);outline:4px solid #ffd24a}#hero-tier .t{background:#2e9e5b}#hero-tier .c{background:#d9472f}#hero-tier .h{background:#7a1fd1}#hero-endless button{font-size:clamp(15px,4vw,20px);background:#0e7490}#hero-endless button.lock{background:#4b5563;opacity:.6}#hero-endless button.open{opacity:1;box-shadow:0 0 14px #67e8f9}');
 document.head.appendChild(st);
 sw=E('div',null,'<button class="t" data-t="teach">🎓 教學</button><button class="c" data-t="quick">⚔️ 挑戰</button><button class="h" data-t="hell">🔥 地獄</button>');sw.id='hero-tier';
 sw.onclick=e=>{const t=e.target.closest('button');if(t)switchTier(t.dataset.t)};
 ep=E('div');ep.id='hero-endless';ep.onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.classList.contains('lock')){toast(b.dataset.msg);return}H.startEndless(b.dataset.s)};
 document.body.appendChild(sw);document.body.appendChild(ep);
 setInterval(()=>{const v=mapVisible();sw.style.display=v?'flex':'none';ep.style.display=v&&!H.endless?'flex':'none';if(v)refreshEndless()},400);
}
function syncSwitch(){if(!sw)return;sw.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.t===TIER))}
function toast(m){if(typeof showMapToast==='function')showMapToast(m);else modal(m,[['好',null]])}
function switchTier(t){
 if(t===TIER||H.endless)return;
 if(typeof mapBusy!=='undefined'&&mapBusy)return;
 TIER=t;
 try{setMode(t==='teach'?'teach':'quick');
  const f=typeof findFrontierStageId==='function'?findFrontierStageId():(typeof findFrontierId==='function'?findFrontierId():null);
  if(typeof placeHeroInstant==='function')placeHeroInstant(f);if(typeof refreshMap==='function')refreshMap();
  toast(TIERNAME[t]+'模式（進度共用，最高 '+CAP[t]+'★，分數 ×'+MULT[t]+'）')}catch(e){}
 hud();syncSwitch()}
H.switchTier=switchTier;
/* ===== 無限模式 ===== */
const isBattle=()=>cfg.type==='battle';
const prog=()=>typeof playerProgress!=='undefined'?playerProgress:(typeof progress!=='undefined'?progress:{});
const stageList=()=>isBattle()?allStagesList:(typeof layers!=='undefined'?layers:[]);
const poolOf=s=>s==='chapter'?stageList():stageList().filter(x=>x.terrainId===+s.split(':')[1]);
const clearedAll=l=>l.length>0&&l.every(x=>prog()[x.id]&&prog()[x.id].stars>0);
function refreshEndless(){
 if(!ep||(!isBattle()&&cfg.type!=='puzzle'))return;
 let h='';
 if(isBattle()&&typeof terrains!=='undefined'){
  terrains.forEach(t=>{const ok=clearedAll(poolOf('t:'+t.id));h+=`<button class="${ok?'open':'lock'}" data-s="t:${t.id}" data-msg="通關「${(t.short||t.name||'').replace(/"/g,'')}」的所有小關後開啟無限練習">${ok?'♾️':'🔒'} 第${t.id}關</button>`});
 }
 const okc=clearedAll(poolOf('chapter'));
 h+=`<button class="${okc?'open':'lock'}" data-s="chapter" data-msg="通關整個章節後開啟全章無限練習">${okc?'♾️':'🔒'} 全章</button>`;
 if(ep.dataset.h!==h){ep.innerHTML=h;ep.dataset.h=h}
}
H.startEndless=function(scope){
 const list=poolOf(scope);
 if(!clearedAll(list)){toast('還沒通關，無限模式尚未開啟');return}
 H.endless={scope,list,kills:0,score:0,xp:0};nextMonster()};
function nextMonster(){
 const e=H.endless;if(!e)return;const s=e.list[Math.floor(Math.random()*e.list.length)];
 H.pend=0;
 if(isBattle())startBattle(s.id,true);else startLayer(s.id);
 hud()}
function endlessDone(win,name){
 const e=H.endless;if(!e)return;
 let xpTxt='';
 if(win){e.kills++;e.score+=H.score;e.xp+=H.pend;xpTxt=`<br>✨ 經驗 +${H.pend}（已存檔）`;H.commitXp();
  upd(o=>{o.endless=o.endless||{};const k=cfg.id+'|'+e.scope,b=o.endless[k]=o.endless[k]||{kills:0,score:0};b.kills=Math.max(b.kills,e.kills);b.score=Math.max(b.score,e.score)})}
 else{H.pend=0;xpTxt='<br>這一隻沒打贏，這一隻的經驗不計。'}
 const li=lvInfo();hud();
 modal(`<div style="font-size:24px;font-weight:900">${win?'🏆 打敗了 '+name+'！':'💀 倒下了…'}</div>本隻得分 ${win?H.score:0}${xpTxt}<br>累計擊殺 <b>${e.kills}</b>　累計得分 <b>${e.score}</b><br>Lv.${li.level}　XP ${li.cur}/${li.need}`,
  [['▶ '+(win?'下一隻':'再來一隻'),nextMonster,'#2e9e5b'],['💾 存檔離開',exitEndless,'#6b7280']]);
}
function exitEndless(){
 H.endless=null;H.pend=0;hud();
 try{if(typeof quitToMap==='function')quitToMap();else if(typeof showMap==='function')showMap()}catch(e){}
 try{if(typeof showMap==='function')showMap()}catch(e){}
}
/* ===== 掛進原本的遊戲函式 ===== */
function wrap(name,fn){const o=window[name];if(typeof o==='function')window[name]=function(){return fn.call(this,o,arguments)}}
function failStreak(win){ // 挑戰／地獄連續失敗 3 次 → 溫柔提示去教學
 if(TIER==='teach'||H.endless)return false;
 let show=false;
 upd(o=>{o.fails=o.fails||{};const n=win?0:(o.fails[cfg.id]||0)+1;o.fails[cfg.id]=n;if(n>=3){show=true;o.fails[cfg.id]=0}});
 return show}
function gentleHint(goTeach){
 modal('💡 卡關了嗎？<br><span style="font-size:17px;font-weight:600">要不要先去<b>教學模式</b>領取提示並練習，<br>還可以拿到基礎星等？</span>',
  [['🎓 去教學模式',goTeach,'#2e9e5b'],['繼續挑戰',null,'#6b7280']])}
window.addEventListener('DOMContentLoaded',()=>{hud();buildPanels();syncSwitch()});
window.addEventListener('load',()=>{
 if(!TIER&&cfg.type!=='neg'&&typeof playMode!=='undefined')TIER=playMode==='teach'?'teach':'quick';
 if(cfg.type!=='neg')wrap('setMode',(o,a)=>{const r=o.apply(null,a);if(a[0]==='teach')TIER='teach';else if(TIER!=='hell')TIER='quick';hud();syncSwitch();return r});
 if(cfg.key){
  window.progressKey=()=>cfg.key;
  if(typeof window.localKey==='function')window.localKey=()=>(window.LOCAL_KEY||'hero-local');
  wrap('loadProgress',(o,a)=>{const p=o.apply(null,a);try{
    const sh=(typeof loadSharedSave==='function'?loadSharedSave():{})[cfg.key+'Teach'];const t=sh&&(sh.stages||sh.layers);
    if(t)for(const id in t){const x=p[id]=p[id]||{unlocked:false,stars:0};if(t[id].unlocked)x.unlocked=true;if((t[id].stars||0)>(x.stars||0))x.stars=t[id].stars}}catch(e){}return p});
 }
 wrap('stageVal',(o,a)=>{const v=o.apply(null,a);return TIER==='hell'?Math.max(3,Math.round(v*.6)):v});
 wrap('tpq',(o,a)=>{const v=o.apply(null,a);return TIER==='hell'?Math.max(3,Math.round(v*.6)):v});
 /* ===== 星等：負數標準；超出本模式封頂的星用「半亮」顯示 ===== */
 if(isBattle()){
  window.calculateStars=()=>{const a=stageStats.total?stageStats.correct/stageStats.total:0,raw=rawStars(a);H.lastRaw=raw;
   upd(o=>{o.rawStars=o.rawStars||{};const k=cfg.id+'|'+(typeof currentStageObj!=='undefined'?currentStageObj.id:'');if(!(o.rawStars[k]>=raw))o.rawStars[k]=raw});
   return Math.min(raw,CAP[TIER||'quick'])};
  wrap('endGame',(o,a)=>{
   const acc=(typeof stageStats!=='undefined'&&stageStats.total)?stageStats.correct/stageStats.total:0;
   const tooLow=a[0]===true&&rawStars(acc)<1, win=a[0]===true&&!tooLow;
   if(H.endless){const nm=typeof currentStageObj!=='undefined'?currentStageObj.boss:'怪物';endlessDone(win,nm);return}
   H.saveScore();
   const r=o.apply(null,tooLow?[false]:a);
   try{
    const el=document.getElementById('result-stats'),li=lvInfo(),tier=TIER||'quick',cap=CAP[tier];
    if(tooLow&&el)el.innerHTML=`<div style="color:#C0392B"><strong>打倒怪物了，但答對率只有 ${Math.round(acc*100)}%</strong></div><div>答對率要達到 60% 才算通關（跟負數章一樣），再挑戰一次吧！</div>`;
    if(win){
     const st=document.getElementById('result-stars'),raw=H.lastRaw,shown=Math.min(raw,cap);
     if(st&&raw>cap)st.innerHTML='★'.repeat(shown)+'<span style="color:#F5B041;opacity:.5" title="半亮：超出本模式封頂">'+'★'.repeat(raw-shown)+'</span>'+`<span style="color:#7F8C8D">${'☆'.repeat(5-raw)}</span>`;
     if(el&&raw>cap)el.insertAdjacentHTML('beforeend',`<div style="color:#B9770E"><strong>✨ 半亮的星星：</strong>你的表現其實有 ${raw}★ 水準，但${TIERNAME[tier]}模式最高只算 ${cap}★。<br>建議改玩 ${tier==='teach'?'⚔️挑戰或🔥地獄模式，或繼續練習教學':'🔥地獄模式，或繼續練習挑戰'}。</div>`);
    }
    if(el)el.insertAdjacentHTML('beforeend',`<div><strong>本關總分：</strong> <span style="color:#E67E22">${H.score}</span>（最高連擊 ${H.maxCombo}，難度倍率 ×${MULT[tier]}）</div><div><strong>獲得經驗：</strong> +${H.gainXp}　Lv.${li.level}${li.level>H.lvStart?' 🎉升級！':''}</div><div style="color:#7F8C8D">${TIERNAME[tier]}模式最高 ${cap}★</div>`)}catch(e){}
   if(failStreak(win))setTimeout(()=>gentleHint(()=>{switchTier('teach');try{showMap()}catch(e){}}),700);
   return r});
 }
 if(cfg.type==='puzzle'){
  wrap('tierFor',(o,a)=>{const t=o.apply(null,a),cp=CAP[TIER||'quick'];if(!t||t.stars<=cp)return t;return (window.TIERS||[]).find(x=>x.stars===cp)||t});
 }
 if(q.get('mode')&&cfg.type!=='neg'){try{if(typeof chooseMode==='function')chooseMode(TIER==='teach'?'teach':'quick')}catch(e){}}
 const old=document.getElementById('mode-switch');if(old)old.style.display='none';
 hud();syncSwitch();
 /* ===== 減法勇者（拼圖層）===== */
 if(cfg.type==='puzzle'){
  window.combo=0;let qs0=0;
  wrap('startLayer',(o,a)=>{H.begin(0,'L'+a[0]);H.score=0;window.combo=0;qs0=Date.now();return o.apply(null,a)});
  wrap('nextQuestion',(o,a)=>{qs0=Date.now();return o.apply(null,a)});
  wrap('processAnswer',(o,a)=>{const c0=typeof correctCount==='number'?correctCount:0;const r=o.apply(null,a);
   if(typeof correctCount==='number'&&correctCount>c0){window.combo++;H.hit(window.combo,(Date.now()-qs0)/1000)}else{window.combo=0;H.hurt()}hud();return r});
  wrap('finishLayer',(o,a)=>{
   const acc=Math.round(correctCount/QUESTIONS_PER_LAYER*100),win=!!tierFor(acc);
   if(H.endless){clearInterval(timerInterval);acceptingInput=false;try{stopMusic()}catch(e){}endlessDone(win,'第 '+curLayer.id+' 層');return}
   H.saveScore();const r=o.apply(null,a);
   try{const li=lvInfo(),af=document.getElementById('rs-after');
    const od=document.getElementById('hero-rs');if(od)od.remove();
    if(af)af.insertAdjacentHTML('afterend',`<div id="hero-rs" style="text-align:center;margin:6px 0;font-weight:700">🏆 本層總分 ${H.score}（×${MULT[TIER||'quick']}）　🔥最高連擊 ${H.maxCombo}　✨經驗 +${H.gainXp}　Lv.${li.level}${li.level>H.lvStart?' 🎉升級！':''}</div>`)}catch(e){}
   if(failStreak(win))setTimeout(()=>gentleHint(()=>{switchTier('teach');try{showMap()}catch(e){}}),700);
   return r});
 }
 /* 從總部直接進入章節無限模式 */
 if(q.get('endless')&&cfg.type!=='neg'){setTimeout(()=>{try{H.startEndless('chapter')}catch(e){}},900)}
 /* ===== 負數勇者 ===== */
 if(cfg.type==='neg'){
  if(TIER){try{const mp={teach:'teach',quick:'hard',hell:'hell'};if(typeof enterMode==='function')enterMode(mp[TIER])}catch(e){}}
  /* 四則勇者全通關 → 負數與其他章合併等級／經驗值（只做一次，之後共用同一份）*/
  try{
   const sh=(()=>{const s=stu;const a=s?JSON.parse(localStorage.getItem('keyagent_save_v1:'+s)||'{}'):{};const b=JSON.parse(localStorage.getItem('fourOpsHero_local_save_v1')||'{}');return Object.assign({},b,a)})();
   const fo=(sh.fourOpsHero||{}).stages||{},cleared=Object.keys(fo).filter(k=>fo[k]&&fo[k].stars>0).length>=8;
   if(cleared){
    const Qo=window.eval('Q');
    if(Qo&&!ld().negMerged)upd(o=>{o.exp=(o.exp||0)+(Qo.exp||0);o.negMerged=true});
    if(Qo)Object.defineProperty(Qo,'exp',{get:()=>ld().exp||0,set:v=>upd(o=>{o.exp=v}),enumerable:true,configurable:true});
    H.merged=true}
  }catch(e){}
  wrap('end',(o,a)=>{const S=window.eval('S'),win=!!a[0],r=o.apply(null,a);
   try{if(S&&S.mode!=='teach'&&!S.stg.endless&&failStreak(win))setTimeout(()=>gentleHint(()=>{try{setMode('teach')}catch(e){}}),700)}catch(e){}return r});
  let lastS=null,lastTot=0,tq=0;const NM={teach:'teach',hard:'quick',hell:'hell'};
  setInterval(()=>{try{const S=window.eval('typeof S!=="undefined"&&S?S:null');
   if(S!==lastS){lastS=S;lastTot=S?S.total:0;tq=Date.now();H.score=0;H.maxCombo=0;H.stageKey=S&&S.stg?String(S.stg.id):null;H.neg=0;if(S)TIER=NM[S.mode]||'quick';hud()}
   if(S){H.neg=S.pc||0;H.maxCombo=Math.max(H.maxCombo,S.pc||0);
    if(S.total>lastTot){const sec=(Date.now()-tq)/1000;tq=Date.now();lastTot=S.total;if(S.pc>0&&S.correct>0&&(S._lc||0)<S.correct){S._lc=S.correct;H.score+=H.pts(S.pc,sec,NM[S.mode]||'quick')}hud()}
    if(S.over&&!S._sv){S._sv=1;H.saveScore();hud()}}}catch(e){}},300);
 }
});
})();
