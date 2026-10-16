/* 勇者共用核心 hero-core.js — 各章遊戲共用的「整合層」
   ①?mode= 直接進入 ②地圖三段難度切換 ③星等＝負數標準（正確率），難度封頂；超出封頂的星顯示成「半亮」
   ④勇者等級／經驗／能力（比照負數）、怪物 10 下擊殺 ⑤連擊＋計時＋總分（教學×1、挑戰×2、地獄×3）
   ⑥連續失敗溫柔提示 ⑦大關／全章無限模式 ⑧錯題收集 ⑨四則通關後與負數合併等級 ⑩角色名稱 */
(function(){
'use strict';
const cfg=window.HERO_CFG||{}, q=new URLSearchParams(location.search);
/* ===== 所有可調整的數值：預設值＋hero-config.js（修改器產生）覆蓋 ===== */
const DEFAULTS={base:{hp:1000,atk:50,def:20,spd:100},growth:{hp:100,atk:5,def:3,spd:1},exp:{a:50,b:50},
 battle:{hits:10,comboStep:.2,dmgFactor:1.1,monAtk:2,monDef:.5,stageScale:.03,hellAtk:1.5,healFactor:.5,missStep:.2},
 xp:{correct:10,wrong:1},score:{base:100,minSec:3,mult:{teach:1,quick:2,hell:3}},
 stars:[1,.9,.8,.7,.6],caps:{teach:2,quick:4,hell:5},hellTime:.6,failHint:3,graduate:3,nameMax:12,teacherPass:'1234',
 time:{},teachTime:1.5,mapZoom:2,
 bonus:{on:true,every:5,scoreMult:5,bossMult:3},
 chest:{same:.9,d1:.09,d2:.007,d3:.003},scenarios:{}};
const merge=(d,o)=>{const r=Array.isArray(d)?d.slice():Object.assign({},d);if(o&&typeof o==='object')for(const k in o){r[k]=(d&&typeof d[k]==='object'&&!Array.isArray(d[k])&&typeof o[k]==='object'&&o[k])?merge(d[k],o[k]):o[k]}return r};
const C=merge(DEFAULTS,q.get('nocfg')?{}:window.HERO_CONFIG);
let TIER=['teach','quick','hell'].includes(q.get('mode'))?q.get('mode'):null;
const CAP=C.caps, MULT=C.score.mult, TIERNAME={teach:'🎓教學',quick:'⚔️挑戰',hell:'🔥地獄'};
const rawStars=a=>{const t=C.stars;return a>=t[0]?5:a>=t[1]?4:a>=t[2]?3:a>=t[3]?2:a>=t[4]?1:0};
let stu=q.get('student');
if(!stu){try{const a=JSON.parse(localStorage.getItem('keyagent_active_student')||'null');stu=a&&a.studentNumber}catch(e){}}
const SK='heroRPG_v1:'+(stu||'guest');
const ld=()=>{try{return JSON.parse(localStorage.getItem(SK))||{}}catch(e){return{}}};
const sv=o=>{try{localStorage.setItem(SK,JSON.stringify(o))}catch(e){}};
const upd=f=>{const o=ld();f(o);sv(o);return o};
const BASE=C.base,GROWTH=C.growth;
const need=l=>C.exp.a+l*l*C.exp.b;
function lvInfo(){let l=1,r=ld().exp||0;while(r>=need(l)){r-=need(l);l++}return{level:l,cur:r,need:need(l)}}
function stats(){const l=lvInfo().level,o={};for(const k in BASE)o[k]=BASE[k]+GROWTH[k]*(l-1);return o}
const today=()=>new Date().toISOString().slice(0,10);
const E=(tag,css,html)=>{const e=document.createElement(tag);if(css)e.style.cssText=css;if(html!=null)e.innerHTML=html;return e};
const H=window.HERO={cap:CAP,mult:MULT,cfg,score:0,gainXp:0,pend:0,lvStart:1,mc:0,maxCombo:0,stageKey:null,t0:0,lastRaw:0,endless:null,lvInfo,stats,rawStars,
 setTier(t){TIER=t;hud();syncSwitch()},
 begin(idx,stageKey){
  H.qn=0;H.lastBonus=0;
  const B=C.battle,lv=lvInfo().level,st=stats(),sf=1+B.stageScale*idx,hell=TIER==='hell'?B.hellAtk:1;
  H.pa=st.atk;H.pdef=st.def;H.lvStart=lv;H.score=0;H.gainXp=0;H.pend=0;H.mc=0;H.maxCombo=0;H.stageKey=stageKey;H.t0=Date.now();
  H.ma=Math.round(B.monAtk*(BASE.atk+GROWTH.atk*(lv-1))*sf*hell);
  H.md=Math.round(B.monDef*(BASE.def+GROWTH.def*(lv-1))*sf);
  let mmax=0;for(let i=0;i<B.hits;i++)mmax+=Math.max(1,Math.round(H.pa*(1+B.comboStep*i)*B.dmgFactor-H.md));
  hud();return{pmax:st.hp,mmax}},
 /* 經驗：一般關卡立刻存；無限模式先暫存，打倒怪物才結算 */
 addXp(n){H.gainXp+=n;if(H.endless)H.pend+=n;else upd(o=>{o.exp=(o.exp||0)+n})},
 commitXp(){if(H.pend>0){const n=H.pend;upd(o=>{o.exp=(o.exp||0)+n})}H.pend=0},
 pts(combo,sec,tier){return Math.round(C.score.base*Math.max(1,combo)/Math.max(C.score.minSec,sec||10)*MULT[tier||TIER||'quick'])},
 hit(combo,sec){if(!H._inBonus)H.qn++;H.mc=0;H.maxCombo=Math.max(H.maxCombo,combo);H.addXp(C.xp.correct);H.score+=H.pts(combo,sec);hud();
  return Math.max(1,Math.round(H.pa*(1+C.battle.comboStep*(combo-1))*C.battle.dmgFactor-H.md))},
 heal(){return Math.max(1,Math.round((H.pa*.95-H.md)*C.battle.healFactor))},
 hurt(){H.qn++;H.mc++;H.addXp(C.xp.wrong);H.recWrong();hud();return Math.max(1,Math.round(H.ma*(1+C.battle.missStep*(H.mc-1))-H.pdef))},
 bonusText(c){return c>=2?'(連擊 ×'+(1+C.battle.comboStep*(c-1)).toFixed(1)+')':''},
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
 upd(o=>{o.fails=o.fails||{};const n=win?0:(o.fails[cfg.id]||0)+1;o.fails[cfg.id]=n;if(n>=C.failHint){show=true;o.fails[cfg.id]=0}});
 return show}
function gentleHint(goTeach){
 modal('💡 卡關了嗎？<br><span style="font-size:17px;font-weight:600">要不要先去<b>教學模式</b>領取提示並練習，<br>還可以拿到基礎星等？</span>',
  [['🎓 去教學模式',goTeach,'#2e9e5b'],['繼續挑戰',null,'#6b7280']])}

/* ===================== 減法：通關寶箱（隨機稀有度碎片）===================== */
const RAR=['','普通','優良','精緻','傳說','神話'],RCOL=['','#9aa3ad','#4caf50','#2f80ed','#a24bd8','#ff9800'];
function rollRarity(base){
 const c=C.chest,r=Math.random();let acc=0;
 for(const d of [0,1,-1,2,-2,3,-3]){const t=base+d;if(t<1||t>5)continue;acc+=d===0?c.same:(Math.abs(d)===1?c.d1:Math.abs(d)===2?c.d2:c.d3)/2;if(r<acc)return t}
 return 0}
H.rollRarity=rollRarity;
function armChest(tier){
 if(!tier)return;const btn=document.getElementById('rs-synth');if(!btn)return;
 btn.addEventListener('click',()=>setTimeout(()=>{
  const ban=document.querySelector('#rs-after .tier-banner');if(!ban)return;
  const layer=curLayer,box=E('div','text-align:center;margin:6px 0');
  box.innerHTML='<button id="hero-chest" style="font:900 22px inherit;padding:10px 22px;border-radius:14px;border:3px solid #ffd24a;background:linear-gradient(#a0522d,#5c2e0e);color:#ffe9a0;cursor:pointer;animation:hchest 1s infinite">🎁 打開寶箱</button><style>@keyframes hchest{50%{transform:scale(1.08) rotate(-2deg)}}</style>';
  ban.replaceWith(box);
  box.querySelector('#hero-chest').onclick=()=>{
   const rar=rollRarity(tier.stars);let txt;
   if(rar){const o=upd(x=>{x.shards=x.shards||{};const k='sub|'+layer.id,s=x.shards[k]=x.shards[k]||{best:0,n:0,by:{}};s.n++;s.by[rar]=(s.by[rar]||0)+1;if(rar>s.best)s.best=rar});
    const sh=o.shards['sub|'+layer.id];
    txt=`<div style="font-size:20px;font-weight:900">✨ 獲得 <span style="color:${RCOL[rar]}">【${RAR[rar]}】</span>${layer.shard||layer.item+'碎片'}！</div><div style="color:#666">${'★'.repeat(rar)}　（這一層的碎片你已收集 ${sh.n} 片，最高【${RAR[sh.best]}】）</div>`}
   else txt='<div style="font-size:20px;font-weight:900">📭 寶箱裡空空的……</div><div style="color:#666">下次再來試試手氣！</div>';
   box.innerHTML=txt};
 },1600));
}
/* ===================== 大地圖：不壓縮，可滑動，自動對準勇者 ===================== */
function follower(sc,getWrap,getHero){
 let last='',until=0,wasVis=false;
 const target=()=>{const w=getWrap(),h=getHero();if(!w||!h)return null;return[h.offsetLeft+w.offsetLeft-sc.clientWidth/2,h.offsetTop+w.offsetTop-sc.clientHeight*.6]};
 setInterval(()=>{
  const vis=sc.isConnected&&sc.offsetParent!==null&&sc.clientWidth>0;
  if(!vis){wasVis=false;return}
  const t=target();if(!t)return;const key=getHero().style.left+'|'+getHero().style.top;
  if(!wasVis){wasVis=true;last=key;sc.scrollLeft=t[0];sc.scrollTop=t[1];return}
  if(key!==last){last=key;until=Date.now()+2600}
  if(Date.now()<until){sc.scrollLeft+=(t[0]-sc.scrollLeft)*.3;sc.scrollTop+=(t[1]-sc.scrollTop)*.3}
 },50);
 // 滑鼠拖曳也能捲動
 let d=null;
 sc.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;d={x:e.clientX,y:e.clientY,l:sc.scrollLeft,t:sc.scrollTop,m:false}});
 window.addEventListener('pointermove',e=>{if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.m&&Math.hypot(dx,dy)>6)d.m=true;if(d.m){const s=sc.getBoundingClientRect().width/sc.offsetWidth||1;sc.scrollLeft=d.l-dx/s;sc.scrollTop=d.t-dy/s}});
 window.addEventListener('pointerup',()=>{if(d&&d.m){const k=ev=>{ev.stopPropagation();ev.preventDefault();window.removeEventListener('click',k,true)};window.addEventListener('click',k,true);setTimeout(()=>window.removeEventListener('click',k,true),50)}d=null});
}
function setupMap(){
 const z=Math.max(1,+C.mapZoom||1);if(z<=1)return;
 if(cfg.type==='battle'||cfg.type==='puzzle'){
  const mw=document.getElementById('map-wrap'),hero=document.getElementById('map-hero');if(!mw||!hero)return;
  const sc=E('div','position:relative;flex:1 1 0;min-height:0;width:calc(100% - 16px);overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;border-radius:10px;cursor:grab');
  sc.id='hero-mapscroll';mw.parentNode.insertBefore(sc,mw);sc.appendChild(mw);
  if(cfg.type==='puzzle'){const h=parseFloat(getComputedStyle(mw).height)||636;mw.style.height=Math.round(h*z)+'px';mw.style.width='auto'}
  else{mw.style.width=(z*100)+'%';const hw=parseFloat(hero.style.width||getComputedStyle(hero).width);hero.style.width=(7.6/Math.sqrt(z)).toFixed(2)+'%'}
  mw.style.flexShrink='0';mw.style.margin='0';
  follower(sc,()=>mw,()=>document.getElementById('map-hero'));
 }
}
function setupNegMap(){
 const z=Math.max(1,+C.mapZoom||1);if(z<=1)return;
 const st=E('style',null,`#chs{position:relative;overflow:auto;max-height:calc(100vh - 140px);-webkit-overflow-scrolling:touch;overscroll-behavior:contain;cursor:grab}#chs #mapw{width:${z*100}%!important;max-width:none!important;margin:0!important}#chs #mh{width:${(7/Math.sqrt(z)).toFixed(2)}%}`);
 document.head.appendChild(st);
 const sc=document.getElementById('chs');if(sc)follower(sc,()=>document.getElementById('mapw'),()=>document.getElementById('mh'));
}
/* ===================== 情境題 BONUS ===================== */
const SCN=()=>{const own=(C.scenarios||{})[cfg.id];const def=(window.HERO_SCENARIOS_DEFAULT||{})[cfg.id]||[];return Array.isArray(own)&&own.length?own:def};
let deck=[];
const SAFE=/^[A-Za-z0-9_\s+\-*/().<>=!&|%]*$/;
function ev(expr,vars){expr=String(expr);if(!SAFE.test(expr)||/=>/.test(expr)||(expr.match(/[A-Za-z_]\w*/g)||[]).some(n=>!(n in vars)))throw new Error('bad expr: '+expr);const k=Object.keys(vars);return Function(...k,'"use strict";return ('+expr+')')(...k.map(x=>vars[x]))}
const neg=n=>n<0?'−'+Math.abs(n):String(n);
function showExpr(f,vars){
 return f.replace(/[A-Za-z_]\w*/g,m=>m in vars?(vars[m]<0?'('+neg(vars[m])+')':String(vars[m])):m).replace(/\*/g,' × ').replace(/\//g,' ÷ ').replace(/\+/g,' + ').replace(/(^|[^(])-/g,(m,p)=>p+' − ').replace(/\(-/g,'(−').replace(/\s+/g,' ').trim()}
function genFrom(t){
 for(let i=0;i<80;i++){
  const vars={};
  for(const part of String(t.v||'').split(/[;；]/)){const m=part.trim().match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);if(!m)continue;
   const r=m[2].trim().match(/^(-?\d+)\s*~\s*(-?\d+)$/);
   vars[m[1]]=r?(+r[1]+Math.floor(Math.random()*(+r[2]-+r[1]+1))):ev(m[2],vars)}
  if(t.ok&&!ev(t.ok,vars))continue;
  const ans=ev(t.f,vars);if(!Number.isInteger(ans)||Math.abs(ans)>1e7)continue;
  if(Object.values(vars).some(v=>!Number.isFinite(v)))continue;
  return {vars,ans,text:String(t.t).replace(/\{([A-Za-z_]\w*)\}/g,(m,k)=>k in vars?neg(vars[k]):m),expr:showExpr(t.f,vars),t}}
 return null}
function distractors(g){
 const out=new Set(),ok=x=>{try{const v=ev(x,g.vars);return Number.isFinite(v)&&v!==g.ans}catch(e){return false}};
 String(g.t.w||'').split(/[;；]/).map(x=>x.trim()).filter(Boolean).forEach(x=>{if(ok(x))out.add(showExpr(x,g.vars))});
 const f=g.t.f,ops=['+','-','*','/'];
 for(let i=0;i<f.length&&out.size<6;i++)if(ops.includes(f[i])&&!(f[i]==='-'&&(i===0||'(*/+-'.includes(f[i-1]))))for(const o of ops){if(o===f[i])continue;const x=f.slice(0,i)+o+f.slice(i+1);if(ok(x))out.add(showExpr(x,g.vars))}
 const names=Object.keys(g.vars).filter(k=>new RegExp('\\b'+k+'\\b').test(f));
 if(names.length>=2&&out.size<3){const x=f.replace(new RegExp('\\b'+names[0]+'\\b','g'),'§').replace(new RegExp('\\b'+names[1]+'\\b','g'),names[0]).replace(/§/g,names[1]);if(ok(x))out.add(showExpr(x,g.vars))}
 out.delete(g.expr);return [...out].sort(()=>Math.random()-.5).slice(0,3)}
function pickScenario(){
 const all=SCN();if(!all.length)return null;
 for(let k=0;k<all.length*2;k++){if(!deck.length)deck=all.map((_,i)=>i).sort(()=>Math.random()-.5);const g=genFrom(all[deck.pop()]);if(g)return g}
 return null}
H.genScenario=t=>genFrom(t);
let bonusOpen=false;
function runBonus(isTeach,done){
 const g=pickScenario();if(!g){done(null);return}
 bonusOpen=true;const t0=Date.now();
 const m=E('div','position:fixed;inset:0;z-index:500;background:#000c;display:flex;align-items:center;justify-content:center;padding:12px;font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif');m.id='hero-bonus';
 m.innerHTML=`<div style="background:linear-gradient(#22264f,#14163a);color:#fff;border:4px solid #ffd24a;border-radius:20px;padding:16px 18px;max-width:560px;width:100%;max-height:96vh;overflow:auto;box-shadow:0 0 40px #ffd24a66">
 <div style="font:900 24px inherit;color:#ffd24a;text-align:center">✨ 情境挑戰 BONUS ✨</div>
 <div style="text-align:center;font-size:14px;color:#cfd3ff;margin-bottom:8px">答對：連擊 +1、分數 ×${C.bonus.scoreMult}${isBattle()||cfg.type==='neg'?'、對頭目 '+C.bonus.bossMult+' 倍攻擊':''}｜答錯不扣血、不中斷連擊</div>
 <div style="font-size:20px;line-height:1.7;background:#0008;border-radius:12px;padding:12px">${g.text.replace(/</g,'&lt;')}</div>
 <div id="hb-step"></div></div>`;
 document.body.appendChild(m);
 const step=m.querySelector('#hb-step');let input='';
 const keyH=e=>{e.stopImmediatePropagation();
  if(!m.isConnected)return;const kb=m.querySelector('#hb-in');if(!kb)return;
  if(/^[0-9]$/.test(e.key))press(e.key);else if(e.key==='-'||e.key==='Subtract')press('−');else if(e.key==='Backspace'){e.preventDefault();press('⌫')}else if(e.key==='Enter'){e.preventDefault();press('ok')}};
 window.addEventListener('keydown',keyH,true);
 function close(res){window.removeEventListener('keydown',keyH,true);m.remove();bonusOpen=false;done(res)}
 function press(k){const ok=m.querySelector('#hb-ok');if(!ok||ok.disabled)return;
  if(k==='ok'){if(input===''||input==='-')return;submit();return}
  if(k==='⌫')input=input.slice(0,-1);else if(k==='−')input=input.startsWith('-')?input.slice(1):'-'+input;else if(input.replace('-','').length<8)input+=k;
  m.querySelector('#hb-in').textContent=(input===''?'？':input.replace('-','−'))+(g.t.u?' '+g.t.u:'')}
 function askAnswer(note){
  step.innerHTML=`${note||''}<div id="hb-in" style="margin:12px auto 8px;min-height:52px;font:900 34px/52px inherit;text-align:center;background:#fff;color:#222;border-radius:12px;max-width:320px">？${g.t.u?' '+g.t.u:''}</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-width:360px;margin:0 auto">${['7','8','9','⌫','4','5','6','−','1','2','3','0'].map(k=>`<button data-k="${k}" style="font:900 24px inherit;padding:10px 0;border-radius:10px;border:0;background:${k==='⌫'||k==='−'?'#555a9a':'#3a3f7a'};color:#fff;cursor:pointer">${k}</button>`).join('')}
  <button id="hb-ok" style="grid-column:1/-1;font:900 22px inherit;padding:10px;border-radius:12px;border:0;background:#2e9e5b;color:#fff;cursor:pointer">⚔️ 送出答案</button></div>`;
  step.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>press(b.dataset.k));
  step.querySelector('#hb-ok').onclick=()=>press('ok')}
 function submit(){
  const okBtn=m.querySelector('#hb-ok');okBtn.disabled=true;const right=Number(input)===g.ans;
  const sec=(Date.now()-t0)/1000;
  step.insertAdjacentHTML('beforeend',`<div style="margin-top:10px;text-align:center;font-size:20px;font-weight:900;color:${right?'#7dff9b':'#ffb4a8'}">${right?'🎉 答對了！BONUS 發動！':'差一點！正確答案是 '+neg(g.ans)+(g.t.u?' '+g.t.u:'')+'<br><span style="font-size:15px;color:#ddd">算式：'+g.expr+'。這題不扣血，也不影響連擊。</span>'}</div>
  <button id="hb-go" style="display:block;margin:10px auto 0;font:900 20px inherit;padding:10px 28px;border-radius:12px;border:0;background:#4a5bd8;color:#fff;cursor:pointer">繼續 ▶</button>`);
  const go=()=>close({right,sec});m.querySelector('#hb-go').onclick=go;
  if(right)setTimeout(()=>{if(m.isConnected)go()},1800)}
 if(isTeach){
  const opts=[g.expr,...distractors(g)].sort(()=>Math.random()-.5);
  step.innerHTML=`<div style="margin:10px 0 6px;font-weight:800;color:#ffd24a">🎓 第一步：哪一個算式可以算出答案？</div><div style="display:grid;gap:8px">${opts.map(x=>`<button data-x="${x.replace(/"/g,'&quot;')}" style="font:800 22px inherit;padding:10px;border-radius:12px;border:2px solid #8a90d8;background:#2b3070;color:#fff;cursor:pointer">${x}</button>`).join('')}</div>`;
  step.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{
   const right=b.dataset.x===g.expr;step.querySelectorAll('[data-x]').forEach(x=>{x.disabled=true;if(x.dataset.x===g.expr)x.style.background='#2e9e5b'});if(!right)b.style.background='#b03a2e';
   setTimeout(()=>askAnswer(`<div style="margin-top:10px;font-weight:800;color:${right?'#7dff9b':'#ffd24a'}">${right?'✅ 算式選對了！':'這一題的算式是：'} <span style="color:#fff">${g.expr}</span></div><div style="font-weight:800;color:#ffd24a;margin-top:4px">🎓 第二步：算出答案</div>`),right?600:1400)})}
 else askAnswer();
}
function needBonus(n,lastAt){return C.bonus.on&&C.bonus.every>0&&n>0&&n%C.bonus.every===0&&lastAt!==n&&!bonusOpen&&SCN().length>0}
function hookBonus(){
 wrap('nextQuestion',(o,a)=>{
  if(!needBonus(H.qn,H.lastBonus))return o.apply(null,a);
  H.lastBonus=H.qn;
  const teach=typeof playMode!=='undefined'&&playMode==='teach';
  runBonus(teach,res=>{
   if(res&&res.right){
    combo=(typeof combo==='number'?combo:0)+1;H._inBonus=true;let d=H.hit(combo,res.sec);H.score+=H.pts(combo,res.sec)*(C.bonus.scoreMult-1);H._inBonus=false;hud();
    if(isBattle()){d=Math.round(d*C.bonus.bossMult);bossHP-=d;
     try{playHeroAnim('attack')}catch(e){}try{showFloatingDamage('boss','-'+d+' ✨',"#ffd24a")}catch(e){}try{updateUI()}catch(e){}
     if(bossHP<=0){try{ui.bossSprite.classList.add('boss-defeated')}catch(e){}setTimeout(()=>endGame(true),1100);return}}
   }
   o.apply(null,a)})})}
function hookNegBonus(){
 setupNegMap();
 wrap('nextQ',(o,a)=>{
  const S=window.eval('typeof S!=="undefined"?S:null');
  if(!S||S.over||!needBonus(S.total,S._bl))return o.apply(null,a);
  S._bl=S.total;S.lock=true;
  runBonus(S.mode==='teach',res=>{
   if(res&&res.right&&!S.over){
    S.pc++;S.mc=0;S.xp=(S.xp||0)+C.xp.correct;
    const d=Math.round(C.bonus.bossMult*Math.max(1,Math.round(S.pa*(1+.2*(S.pc-1))-S.md)));S.mhp-=d;
    const NM={teach:'teach',hard:'quick',hell:'hell'};H.score+=H.pts(S.pc,res.sec,NM[S.mode]||'quick')*C.bonus.scoreMult;
    try{window.upd()}catch(e){}try{fl('boss','−'+d+' ✨','#ffd86b');sprite('attack',800)}catch(e){}hud();
    if(S.mhp<=0){setTimeout(()=>end(true),500);return}}
   o.apply(null,a)})})}
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
 const teachF=()=>(typeof playMode!=='undefined'&&playMode==='teach')?C.teachTime:1;
 wrap('stageVal',(o,a)=>{let v=o.apply(null,a);
  if(a[0]==='limit'){const ov=(C.time[cfg.id]||{})[typeof currentStageObj!=='undefined'&&currentStageObj?currentStageObj.id:''];if(ov>0)v=Math.round(ov*teachF())}
  return TIER==='hell'?Math.max(3,Math.round(v*C.hellTime)):v});
 wrap('tpq',(o,a)=>{let v=o.apply(null,a);
  const ov=(C.time[cfg.id]||{})[typeof curLayer!=='undefined'&&curLayer?curLayer.id:''];if(ov>0)v=Math.round(ov*teachF());
  return TIER==='hell'?Math.max(3,Math.round(v*C.hellTime)):v});
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
   if(win)armChest(tierFor(acc));
   try{const li=lvInfo(),af=document.getElementById('rs-after');
    const od=document.getElementById('hero-rs');if(od)od.remove();
    if(af)af.insertAdjacentHTML('afterend',`<div id="hero-rs" style="text-align:center;margin:6px 0;font-weight:700">🏆 本層總分 ${H.score}（×${MULT[TIER||'quick']}）　🔥最高連擊 ${H.maxCombo}　✨經驗 +${H.gainXp}　Lv.${li.level}${li.level>H.lvStart?' 🎉升級！':''}</div>`)}catch(e){}
   if(failStreak(win))setTimeout(()=>gentleHint(()=>{switchTier('teach');try{showMap()}catch(e){}}),700);
   return r});
 }
 setupMap();
 if(cfg.type!=='neg')hookBonus();
 /* 從總部直接進入章節無限模式 */
 if(q.get('endless')&&cfg.type!=='neg'){setTimeout(()=>{try{H.startEndless('chapter')}catch(e){}},900)}
 /* ===== 負數勇者 ===== */
 if(cfg.type==='neg'){
  window.HERO_TIME=stg=>{const v=(C.time.neg||{})[stg&&stg.label];return v>0?v:0};
  hookNegBonus();
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
