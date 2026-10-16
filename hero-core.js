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
 chest:{same:.9,d1:.09,d2:.007,d3:.003},scenarios:{},
 crit:{on:true,sec:5,score:1.5},sound:{bgm:true,sfx:true,vol:.5},music:{}};
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
const EV={};
const H=window.HERO={on(n,f){(EV[n]=EV[n]||[]).push(f)},emit(n,d){(EV[n]||[]).forEach(f=>{try{f(d||{})}catch(e){console.warn(e)}})},C,
 stageWrong:[],cap:CAP,mult:MULT,cfg,score:0,gainXp:0,pend:0,lvStart:1,mc:0,maxCombo:0,stageKey:null,t0:0,lastRaw:0,endless:null,lvInfo,stats,rawStars,
 setTier(t){TIER=t;hud();syncSwitch()},
 begin(idx,stageKey){
  H.qn=0;H.lastBonus=0;H.stageWrong=[];H.timeouts=0;setTimeout(()=>H.emit('start',{stageKey}),0);
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
 hit(combo,sec){if(!H._inBonus)H.qn++;H.mc=0;H.maxCombo=Math.max(H.maxCombo,combo);H.addXp(C.xp.correct);
  let p=H.pts(combo,sec);const crit=C.crit.on&&!H._inBonus&&sec>0&&sec<=critSec();if(crit)p=Math.round(p*C.crit.score);H.score+=p;hud();
  const dmg=Math.max(1,Math.round(H.pa*(1+C.battle.comboStep*(combo-1))*C.battle.dmgFactor-H.md));
  H.emit('hit',{combo,sec,crit,bonus:!!H._inBonus,dmg});return dmg},
 heal(){return Math.max(1,Math.round((H.pa*.95-H.md)*C.battle.healFactor))},
 hurt(){H.qn++;H.mc++;H.addXp(C.xp.wrong);H.recWrong();hud();H.emit('hurt',{mc:H.mc});return Math.max(1,Math.round(H.ma*(1+C.battle.missStep*(H.mc-1))-H.pdef))},
 bonusText(c){return c>=2?'(連擊 ×'+(1+C.battle.comboStep*(c-1)).toFixed(1)+')':''},
 /* 錯題收集：題目文字＋正確答案；到總部「錯題練習」答對 3 次才會消失 */
 recWrong(){try{
  const el=(typeof ui!=='undefined'&&ui&&ui.question)||document.getElementById('pz-question')||document.getElementById('question');
  const t=(el&&el.innerText||'').replace(/\s+/g,' ').trim();
  let a=typeof currentAnswer!=='undefined'?currentAnswer:(typeof curAns!=='undefined'?curAns:null);
  if(!t||!/\d/.test(t)||a==null||a===''||typeof a==='object')return;
  const r=(cfg.id==='div'&&typeof currentRem!=='undefined')?currentRem:null;
  const to=typeof timeLeft!=='undefined'&&timeLeft<=0;if(to)H.timeouts++;H.stageWrong.push({q:t,a,r,to});
  upd(o=>{o.wrong=o.wrong||[];const k=cfg.id+'|'+t,it=o.wrong.find(x=>x.k===k);
   if(it)it.n=0;else{o.wrong.push({k,c:cfg.id,q:t,a,r,n:0});if(o.wrong.length>200)o.wrong.shift()}})}catch(e){}},
 saveScore(){
  if(!H.stageKey||H.score<=0)return;const o=ld();o.best=o.best||{};const b=o.best[cfg.id]=o.best[cfg.id]||{};
  const k=H.stageKey+'|'+(TIER||'quick');if(!(b[k]>=H.score))b[k]=H.score;
  o.lastPlay=o.lastPlay||{};o.lastPlay[cfg.id+'|'+(TIER||'quick')]=today();sv(o)},
 chapterScore(id){const b=(ld().best||{})[id]||{};return Object.values(b).reduce((a,c)=>a+c,0)}
};
Object.defineProperty(H,'tier',{get:()=>TIER});
function critSec(){try{if(typeof stageVal==='function'&&typeof currentStageObj!=='undefined'&&currentStageObj){const f=stageVal('fast');if(f>0)return Math.max(1.5,f*.4)}}catch(e){}return C.crit.sec}
/* ===== 彈出視窗（溫柔提示、無限模式結算共用）===== */
function modal(html,btns){
 const old=document.getElementById('hero-modal');if(old)old.remove();
 const m=E('div','position:fixed;inset:0;z-index:300;background:#000b;display:flex;align-items:center;justify-content:center;padding:14px;font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif');m.id='hero-modal';
 const b=E('div','background:#1b1e3b;color:#fff;border:3px solid #ffd24a;border-radius:18px;padding:18px;max-width:480px;width:100%;text-align:center;font-size:18px;line-height:1.7',html+'<div id="hm-b" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px"></div>');
 m.appendChild(b);document.body.appendChild(m);
 btns.forEach(([t,f,c])=>{const x=E('button','font-weight:800;font-size:18px;font-family:inherit;padding:10px 16px;border-radius:12px;border:0;color:#fff;cursor:pointer;background:'+(c||'#4a5bd8'),t);x.onclick=()=>{m.remove();f&&f()};b.querySelector('#hm-b').appendChild(x)});
}
H.modal=modal;
/* ===== 下方狀態列 ===== */
let box;
function hud(){
 if(!document.body)return;
 if(!box){box=E('div','position:fixed;left:50%;bottom:4px;transform:translateX(-50%);z-index:60;pointer-events:none;background:#000b;color:#fff;border:1px solid #ffd24a;border-radius:99px;padding:3px 14px;font:600 14px/1.5 "Noto Sans TC","Microsoft JhengHei",sans-serif;white-space:nowrap;max-width:98vw;overflow:hidden');box.id='hero-hud';document.body.appendChild(box)}
 const short=window.innerHeight<520;box.style.bottom=short?'auto':'4px';box.style.top=short?'2px':'auto';box.style.fontSize=short?'11px':'14px';box.style.opacity=short?'.85':'1';
 let li=lvInfo(),s=stats();if(cfg.type==='neg'&&!H.merged){try{li=window.eval('levelInfo()');s=window.eval('baseStats()')}catch(e){}}
 const c=(typeof combo!=='undefined'?combo:H.neg||0),nm=ld().name;
 if(short){box.innerHTML=`Lv.${li.level} ｜ 🔥${c} ｜ 🏆${H.score}`;return}
 box.innerHTML=`${nm?'🧙'+nm.replace(/</g,'&lt;')+' ':''}${H.endless?'♾️無限 擊殺'+H.endless.kills+' ':''}${TIER?TIERNAME[TIER]+' ':''}Lv.${li.level} <span style="color:#7dff9b">XP ${li.cur}/${li.need}</span> ｜ ❤️${s.hp} ⚔️${s.atk} 🛡️${s.def} ｜ 🔥連擊 ${c} ｜ 🏆本關 ${H.score}${TIER?'（×'+MULT[TIER]+'）':''}`}
/* ===== 地圖左上角：難度切換＋無限模式面板 ===== */
let sw,ep;
const mapVisible=()=>{const m=document.getElementById('map-screen');return !!m&&!m.classList.contains('hidden')&&getComputedStyle(m).display!=='none'};
function buildPanels(){
 if(sw||cfg.type==='neg')return;
 const st=E('style',null,'#hero-tier,#hero-endless{position:fixed;left:6px;z-index:70;display:none;gap:6px;flex-wrap:wrap;font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;max-width:96vw}#hero-tier{top:6px}#hero-endless{top:60px}#hero-tier button,#hero-endless button{font-weight:900;font-size:clamp(16px,4.4vw,24px);line-height:1.2;font-family:inherit;white-space:nowrap;padding:7px clamp(8px,2.6vw,14px);border-radius:12px;border:3px solid #fff;color:#fff;cursor:pointer;box-shadow:0 4px 0 #0007;opacity:.72}#hero-tier button.on{opacity:1;transform:translateY(-2px);outline:4px solid #ffd24a}#hero-tier .t{background:#2e9e5b}#hero-tier .c{background:#d9472f}#hero-tier .h{background:#7a1fd1}#hero-endless button{font-size:clamp(15px,4vw,20px);background:#0e7490}#hero-endless button.lock{background:#4b5563;opacity:.6}#hero-endless button.open{opacity:1;box-shadow:0 0 14px #67e8f9}');
 document.head.appendChild(st);
 sw=E('div',null,'<button class="t" data-t="teach">🎓 教學</button><button class="c" data-t="quick">⚔️ 挑戰</button><button class="h" data-t="hell">🔥 地獄</button>');sw.id='hero-tier';
 sw.onclick=e=>{const t=e.target.closest('button');if(t)switchTier(t.dataset.t)};
 ep=E('div');ep.id='hero-endless';ep.onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.classList.contains('lock')){toast(b.dataset.msg);return}H.startEndless(b.dataset.s)};
 document.body.appendChild(sw);document.body.appendChild(ep);
 setInterval(()=>{const v=mapVisible();sw.style.display=v?'flex':'none';ep.style.display=v&&!H.endless?'flex':'none';if(v){refreshEndless();ep.style.top=(sw.getBoundingClientRect().bottom+6)+'px'}},400);
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
 H.emit(win?'win':'lose',{endless:true});
 modal(`<div style="font-size:24px;font-weight:900">${win?'🏆 打敗了 '+name+'！':'💪 這隻比較強，休息一下再來！'}</div>本隻得分 ${win?H.score:0}${xpTxt}<br>累計擊殺 <b>${e.kills}</b>　累計得分 <b>${e.score}</b><br>Lv.${li.level}　XP ${li.cur}/${li.need}`,
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


/* ===================== 教學模式：小老師（基本觀念＋實際示範）===================== */
const CONCEPT={
 add:{t:'加法：把東西合在一起',b:`<p>加法就是<b>把兩堆合起來，看一共有多少</b>。例如 3 顆糖再拿 4 顆，一共 3＋4＝7 顆。</p>
  <p><b>直式加法三步驟</b></p><ol><li>數字要<b>對齊個位</b>（最右邊對最右邊）。</li><li>從<b>個位</b>開始加，再加十位、百位。</li><li>加起來<b>滿 10，就向左邊進 1</b>，自己這一位只寫個位數。</li></ol>
  <div class="ex">例：47＋38<br>個位 7＋8＝15 → 寫 <b>5</b>，進 1<br>十位 4＋3＋進位 1＝<b>8</b><br>答案：<b>85</b></div>`},
 sub:{t:'減法：拿走或比較',b:`<p>減法是<b>拿走一些，看還剩多少</b>，也可以用來<b>比較兩個數差多少</b>。</p>
  <p><b>直式減法三步驟</b></p><ol><li>數字<b>對齊個位</b>，大的數寫上面。</li><li>從<b>個位</b>開始減。</li><li><b>不夠減，就向左邊借 1，借來的 1 當成 10</b>；被借的那一位要少 1。</li></ol>
  <div class="ex">例：52−27<br>個位 2 不夠減 7 → 向十位借 1，變 12−7＝<b>5</b><br>十位 5 被借走剩 4，4−2＝<b>2</b><br>答案：<b>25</b>（驗算：25＋27＝52 ✔）</div>`},
 mul:{t:'乘法：好幾個一樣多',b:`<p>乘法是<b>「好幾個一樣多」的快速加法</b>：4×3 就是 4＋4＋4＝12。</p>
  <p><b>直式乘法</b></p><ol><li>用下面數字的<b>每一位</b>，去乘上面整個數。</li><li>用十位去乘的那一列，要<b>往左空一格</b>（等於後面多一個 0）。</li><li>最後把每一列<b>加起來</b>。乘的時候滿 10 一樣要進位。</li></ol>
  <div class="ex">例：23×14<br>23×4＝<b>92</b><br>23×1（十位）＝23 → 往左空一格，寫成 <b>230</b><br>92＋230＝<b>322</b></div>`},
 div:{t:'除法：平分或分組',b:`<p>除法是<b>平分</b>（12 顆糖分給 3 人，每人 4 顆）或<b>分組</b>（12 人每 3 人一組，有 4 組）。除法和乘法是一對好朋友：3×4＝12，所以 12÷3＝4。</p>
  <p><b>直式除法四步驟（一直重複）</b>：<b>除 → 乘 → 減 → 拉下來</b></p>
  <div class="ex">例：96÷4<br>① 除：9÷4 商 <b>2</b>　② 乘：2×4＝8　③ 減：9−8＝1<br>④ 拉下來：把 6 拉下來變 16 → 16÷4 商 <b>4</b>，4×4＝16，16−16＝0<br>答案：<b>24</b>（最後剩下的叫<b>餘數</b>，一定比除數小）</div>`},
 ops:{t:'四則運算：誰先算？',b:`<p>一個算式裡有好幾種符號時，要照<b>運算順序</b>：</p>
  <ol><li><b>先算括號</b>裡面的（括號裡又有括號，先算最裡面）。</li><li>再算<b>乘、除</b>。</li><li>最後算<b>加、減</b>。</li><li>同一級的（只有加減、或只有乘除）：<b>從左到右</b>。</li></ol>
  <div class="ex">例：6＋4×(5−3)<br>① 先算括號：5−3＝2 → 6＋4×2<br>② 再算乘：4×2＝8 → 6＋8<br>③ 最後加：<b>14</b></div><p>教學模式會請你<b>先點「應該最先算的符號」</b>，再算出那一步的答案，算式就會一步一步變短。</p>`},
 neg:{t:'負數：比 0 還小的數',b:`<p>負數是<b>比 0 還小的數</b>，生活中像零下溫度（−5°C）、地下樓層（B2＝−2）、欠錢。</p>
  <ul><li><b>加法</b>：同號相加，符號不變、數字相加；異號相加，大的減小的，符號跟著數字大的。</li><li><b>減法</b>：減去一個數，等於<b>加上它的相反數</b>。所以減去負數 → 負負得正！</li><li><b>乘、除</b>：<b>同號得正、異號得負</b>。</li></ul>
  <div class="ex">例：(−7)＋3＝<b>−4</b>（異號，7−3＝4，跟著 7 是負號）<br>5−(−2)＝5＋2＝<b>7</b><br>(−3)×(−4)＝<b>12</b>（同號得正）</div><p>負數章的教學模式會一步一步提示你：先去括號、再選符號、最後算。</p>`}};
const tutorSeen=()=>((ld().tutor||{})[cfg.id]);
function canDemo(){
 if(cfg.type==='neg')return false;
 if(typeof playMode==='undefined'||playMode!=='teach')return false;
 try{if(typeof form!=='undefined'&&form&&form.order&&form.order.length)return 'form'}catch(e){}
 try{if(typeof tk!=='undefined'&&tk&&tk.tokens&&typeof tkEligible==='function')return 'tk'}catch(e){}
 return false}
function showConcept(){
 const c=CONCEPT[cfg.id];if(!c)return;
 upd(o=>{o.tutor=o.tutor||{};o.tutor[cfg.id]=1});
 const dm=canDemo();
 modal(`<style>#hero-modal .tut{text-align:left;font-size:17px;line-height:1.75}#hero-modal .tut ol,#hero-modal .tut ul{margin:4px 0 6px 1.3em;padding:0}#hero-modal .tut .ex{background:#0007;border-left:4px solid #ffd24a;border-radius:8px;padding:8px 12px;margin:8px 0;font-size:17px}#hero-modal>div{max-height:92vh;overflow:auto;max-width:620px!important}</style>
  <div style="font-size:24px;font-weight:900;color:#ffd24a">🦉 小老師：${c.t}</div><div class="tut">${c.b}</div>`,
  dm?[['▶ 看小老師示範這一題',runDemo,'#2e9e5b'],['我會了，自己來',null,'#6b7280']]:[['我知道了，開始！',null,'#2e9e5b']])}
H.showConcept=showConcept;
let demoOn=false;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function runDemo(){
 const kind=canDemo();if(!kind||demoOn)return;demoOn=true;
 const block=E('div','position:fixed;inset:0;z-index:350;background:transparent');
 const bub=E('div','position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:360;max-width:min(92vw,640px);background:#fffbe6;color:#5d4037;border:3px solid #f5b041;border-radius:16px;padding:10px 14px;font:700 17px/1.6 "Noto Sans TC","Microsoft JhengHei",sans-serif;box-shadow:0 6px 20px #0006');
 bub.innerHTML='<div style="color:#e67e22;font-weight:900">🦉 小老師示範中…（看我怎麼一步一步寫）</div><div id="hdemo-t"></div><button id="hdemo-x" style="margin-top:6px;font-weight:800;font-size:14px;border:0;border-radius:8px;padding:4px 10px;background:#6b7280;color:#fff;cursor:pointer">跳過示範</button>';
 document.body.appendChild(block);document.body.appendChild(bub);
 const kb=e=>{e.stopImmediatePropagation();e.preventDefault()};window.addEventListener('keydown',kb,true);
 let stop=false;bub.querySelector('#hdemo-x').onclick=()=>{stop=true};
 const say=t=>{const el=bub.querySelector('#hdemo-t');if(el)el.textContent=t};
 const freeze=()=>{try{timeLeft=9999;if(typeof ui!=='undefined'&&ui.timeLeft)ui.timeLeft.innerText='⏸';const pt=document.getElementById('pz-time');if(pt)pt.innerText='⏸'}catch(e){}};
 const fi=setInterval(freeze,200);freeze();
 const show=c=>{if(typeof cellText==='function')cellText(c);else c.el.textContent=c.val};
 const hintTxt=()=>((document.getElementById('teach-hint')||{}).innerText||'').trim();
 try{
  if(kind==='form'){
   for(const c of form.order){if(stop)break;
    setActive(c);say(hintTxt()||('寫在'+(c.label||'這一格')));await wait(1900);if(stop)break;
    c.val=String(c.expect);show(c);c.el.classList.add('ok');say((hintTxt()?hintTxt()+'　→ ':'')+'寫 '+c.expect);H.emit('demoStep',{});await wait(900)}
   if(!stop){say('完成了！看懂了嗎？現在換你自己把這一題寫一次！');await wait(1800)}
   form.order.forEach(c=>{c.val='';show(c);c.el.classList.remove('ok','bad')});
   if(form.carry)form.carry.forEach(c=>{c.val='';show(c)});
   setActive(form.order[0]);
  }else{
   while(!stop&&tk.tokens.length>1){
    const el=tkEligible(tk.tokens);const k=el.ok[0];if(k==null)break;
    tkClick(k);say('第 '+tk.step+' 步：要先算「'+tk.sel.a+' '+String(tk.sel.op).replace('-','−')+' '+tk.sel.b+'」，'+(el.groups.length?'因為括號要先算':/[×÷*\/]/.test(tk.sel.op)?'因為乘除要比加減先算':'加減同一級，從左邊開始'));await wait(2400);if(stop)break;
    tk.input=String(tk.sel.val);tkRender();say(tk.sel.a+' '+String(tk.sel.op).replace('-','−')+' '+tk.sel.b+' ＝ '+tk.sel.val);await wait(1500);if(stop)break;
    tk.hist.push(tkStr(tk.tokens));tkApply(tk.tokens,tk.sel.k,tk.sel.val);tk.sel=null;tk.input='';tk.phase='pick';tk.step++;tkRender();await wait(900)}
   if(!stop){say('算完了！答案就是 '+(tk.tokens[0]&&tk.tokens[0].v)+'。現在換你自己算一次！');await wait(1900)}
   tk={tokens:tkParse(currentExpr),hist:[],phase:'pick',sel:null,input:'',miss:[],step:1,flash:null};tkRender();
   try{tkSay('換你試試看！請先點選「應該最先計算的運算符號」！')}catch(e){}
  }
 }catch(e){console.warn(e)}
 clearInterval(fi);window.removeEventListener('keydown',kb,true);block.remove();bub.remove();demoOn=false;
 try{timeLeft=isBattle()?stageVal('limit'):tpq();if(typeof ui!=='undefined'&&ui.timeLeft)ui.timeLeft.innerText=timeLeft;if(typeof setTimerUI==='function')setTimerUI()}catch(e){}
}
H.runDemo=runDemo;
let tutBtn;
function hookTutor(){
 const st=E('style',null,'#hero-tutor{all:unset;box-sizing:border-box;position:fixed;left:8px;bottom:90px;z-index:380;display:none;background:#f5b041;color:#4a2b00;font-weight:900;font-size:16px;padding:8px 12px;border-radius:99px;border:3px solid #fff;box-shadow:0 4px 0 #0005;cursor:pointer;font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif}@media (max-height:520px){#hero-tutor{bottom:auto;top:44px;left:auto;right:8px;font-size:13px;padding:5px 9px}}');
 document.head.appendChild(st);
 tutBtn=E('button',null,'📖 小老師');tutBtn.id='hero-tutor';tutBtn.onclick=e=>{e.stopPropagation();showConcept()};document.body.appendChild(tutBtn);
 setInterval(()=>{let on=false;
  try{if(cfg.type==='neg'){const S=window.eval('S');on=!!S&&!S.over&&S.mode==='teach'&&!document.getElementById('battle').hidden}
   else{const bs=document.getElementById(isBattle()?'battle-screen':'puzzle-screen');on=typeof playMode!=='undefined'&&playMode==='teach'&&!!bs&&!bs.classList.contains('hidden')}}catch(e){}
  tutBtn.style.display=on&&!demoOn&&!document.getElementById('hero-modal')&&!document.getElementById('hero-bonus')?'block':'none'},400);
 // 第一次進教學模式：自動打開小老師
 const first=()=>{if(!tutorSeen())setTimeout(()=>{if(!document.getElementById('hero-bonus'))showConcept()},500)};
 if(cfg.type==='neg')wrap('nextQ',(o,a)=>{const r=o.apply(null,a);try{const S=window.eval('S');if(S&&S.mode==='teach')first()}catch(e){}return r});
 else wrap('teachNextQuestion',(o,a)=>{const r=o.apply(null,a);first();return r});
}

/* ===================== 輸了：溫柔打氣＋具體練習建議 ===================== */
const digits=n=>String(Math.abs(n)).split('').reverse().map(Number);
function skillOf(w){
 const q=w.q.replace(/−/g,'-').replace(/×/g,'*').replace(/÷/g,'/'),n=(q.match(/\d+/g)||[]).map(Number);
 if(cfg.id==='add'&&n.length>=2){const A=digits(n[0]),B=digits(n[1]);for(let i=0;i<Math.max(A.length,B.length);i++)if((A[i]||0)+(B[i]||0)>=10)return['carry','加法進位（個位加起來滿 10，要往十位進 1）'];return['addbasic','基本加法（數數、湊十）']}
 if(cfg.id==='sub'&&n.length>=2){const A=digits(n[0]),B=digits(n[1]);for(let i=0;i<A.length;i++)if((A[i]||0)<(B[i]||0))return['borrow','減法借位（不夠減時，向前一位借 1 當 10）'];return['subbasic','基本減法（想加法：幾加幾等於多少）']}
 if(cfg.id==='mul'&&n.length>=2){const s=n.find(x=>x<10),b=n.find(x=>x!==s);if(n[0]<10&&n[1]<10)return['tt'+Math.max(n[0],n[1]),'九九乘法表 '+Math.max(n[0],n[1])+' 的那一排'];return['mulmulti','多位數乘法（每一位都要乘到、進位別忘記、位置要對齊）']}
 if(cfg.id==='div'){if(w.r)return['rem','有餘數的除法（餘數一定比除數小）'];return['divtt','除法要用乘法表反推（幾乘以多少等於被除數）']}
 if(cfg.id==='ops'){if(/[()]/.test(q))return['paren','先算括號裡面'];if(/[+-]/.test(q)&&/[*/]/.test(q))return['order','先乘除、後加減'];return['ltr','同一級的運算，由左往右算']}
 return['basic','基本運算']}
function adviceHTML(){
 const W=H.stageWrong||[],cnt={},label={};
 W.forEach(w=>{const[k,l]=skillOf(w);cnt[k]=(cnt[k]||0)+1;label[k]=l});
 const top=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]).slice(0,2);
 const ex=W.slice(-2).map(w=>`<li>${String(w.q).replace(/</g,'&lt;').replace(/\s*=\s*\?$/,'')} ＝ <b>${w.a}</b>${w.r?' … 餘 '+w.r:''}${w.to?'（時間到）':''}</li>`).join('');
 let tips=top.map(k=>`<li>多練習：<b>${label[k]}</b>（這一關錯了 ${cnt[k]} 題）</li>`).join('');
 if(H.timeouts>=2)tips+=`<li>有 ${H.timeouts} 題是時間到：先到<b>教學模式</b>把步驟練熟，速度自然會變快</li>`;
 if(!tips)tips='<li>先到教學模式用提示一步一步算，熟了再回來挑戰</li>';
 return `<div id="hero-advice" style="text-align:left;background:#FFF8E1;border:2px solid #F5B041;border-radius:12px;padding:10px 14px;margin-top:10px;color:#5D4037;line-height:1.7">
 <div style="font-size:18px;font-weight:900;color:#E67E22">💪 再加把勁！你已經很接近了</div>
 <div>${cfg.type==='puzzle'?'這一層的機關比較難':'頭目這次比較強'}，但你答對的每一題都讓勇者變得更厲害（經驗值已經存起來了）。</div>
 <div style="margin-top:6px;font-weight:800">🧭 給你的練習建議：</div><ul style="margin:2px 0 4px 1.2em;padding:0">${tips}</ul>
 ${ex?`<div style="font-weight:800">📝 剛剛答錯的題目（已放進總部的錯題練習）：</div><ul style="margin:2px 0 6px 1.2em;padding:0">${ex}</ul>`:''}
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">${TIER!=='teach'?'<button id="hero-goteach" style="font-weight:800;font-size:16px;padding:8px 14px;border-radius:10px;border:0;background:#2e9e5b;color:#fff;cursor:pointer">🎓 用教學模式練這一關</button>':''}</div></div>`}
function wireAdvice(restart){const b=document.getElementById('hero-goteach');if(b)b.onclick=()=>{switchTierForce('teach');restart()}}
function switchTierForce(t){TIER=t;try{setMode(t==='teach'?'teach':'quick')}catch(e){}hud();syncSwitch()}
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
  box.innerHTML='<button id="hero-chest" style="font-weight:900;font-size:22px;font-family:inherit;padding:10px 22px;border-radius:14px;border:3px solid #ffd24a;background:linear-gradient(#a0522d,#5c2e0e);color:#ffe9a0;cursor:pointer;animation:hchest 1s infinite">🎁 打開寶箱</button><style>@keyframes hchest{50%{transform:scale(1.08) rotate(-2deg)}}</style>';
  ban.replaceWith(box);
  box.querySelector('#hero-chest').onclick=()=>{
   const rar=rollRarity(tier.stars);let txt;H.emit('chest',{rar});
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
function genFrom(t,L){
 L=L||2;
 for(let i=0;i<80;i++){
  const vars={};
  for(const part of String(t.v||'').split(/[;；]/)){const m=part.trim().match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);if(!m)continue;
   const lvs=m[2].split('|'),ex=lvs[Math.min(L,lvs.length)-1].trim(),r=ex.match(/^(-?\d+)\s*~\s*(-?\d+)$/);m[2]=ex;
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
/* 這一關該出幾級難度：依關卡在本章的位置，教學降一級、地獄升一級；負數章依模式 */
function bonusLevel(){
 if(cfg.type==='neg'){try{const S=window.eval('S');return {teach:1,hard:2,hell:3}[S.mode]||2}catch(e){return 2}}
 let idx=0,len=1;
 try{if(isBattle()){idx=allStagesList.findIndex(x=>x.id===currentStageObj.id);len=allStagesList.length}else{idx=layers.findIndex(x=>x.id===curLayer.id);len=layers.length}}catch(e){}
 let L=1+Math.floor(3*Math.max(0,idx)/Math.max(1,len));if(TIER==='teach')L--;if(TIER==='hell')L++;return Math.max(1,Math.min(3,L))}
/* 這一關考哪些運算符號 */
function stageOps(){
 const o=new Set();
 if(cfg.type==='neg'){try{const op=window.eval('CH[S.stg.ch].op');if(op==='?')['+','-','*','/','p'].forEach(x=>o.add(x));else o.add(op)}catch(e){}return o}
 try{if(cfg.id==='ops'&&currentStageObj&&currentStageObj.kind){const K={addsub3:'+-',muldiv3:'*/',four4:'+-*/',mixed3:'+-*/',mixed4:'+-*/',paren3:'+-*/p',paren4:'+-*/p',final5:'+-*/p'}[currentStageObj.kind];if(K){[...K].forEach(x=>o.add(x));return o}}}catch(e){}
 let q='';try{q=(typeof currentExpr==='string'&&currentExpr)||((typeof ui!=='undefined'&&ui.question&&ui.question.innerText)||'')||((document.getElementById('pz-question')||{}).innerText||'')}catch(e){}
 if(/\+/.test(q))o.add('+');if(/[−-]/.test(q))o.add('-');if(/[×*]/.test(q))o.add('*');if(/[÷/]/.test(q))o.add('/');if(/\(/.test(q))o.add('p');
 if(!o.size)({add:['+'],sub:['-'],mul:['*'],div:['/'],ops:['+','-','*','/','p']}[cfg.id]||[]).forEach(x=>o.add(x));
 return o}
function tplOps(f){
 let x=String(f).replace(/\(\s*-\s*[A-Za-z_]\w*\s*\)/g,'n').replace(/^\s*-/,'').replace(/([(*/+-])\s*-/g,'$1');
 const o=new Set();if(/\+/.test(x))o.add('+');if(/-/.test(x))o.add('-');if(/\*/.test(x))o.add('*');if(/\//.test(x))o.add('/');if(/\(/.test(x))o.add('p');return o}
H.tplOps=tplOps;H.stageOps=stageOps;H.bonusLevel=bonusLevel;
function lvOK(t,L){const m=String(t.lv||'').match(/^(\d)\s*-\s*(\d)$/);if(m)return L>=+m[1]&&L<=+m[2];if(/^\d$/.test(String(t.lv||'')))return +t.lv===L;return true}
let deckKey='';
function pickScenario(){
 const all=SCN();if(!all.length)return null;
 const L=bonusLevel(),so=stageOps();
 let pool=all.map((t,i)=>i).filter(i=>{const to=tplOps(all[i].f);return lvOK(all[i],L)&&[...to].every(x=>so.has(x))});
 if(!pool.length)pool=all.map((t,i)=>i).filter(i=>lvOK(all[i],L));
 if(!pool.length)pool=all.map((t,i)=>i);
 const key=pool.join(',');if(key!==deckKey){deckKey=key;deck=[]}
 for(let k=0;k<pool.length*2;k++){if(!deck.length)deck=pool.slice().sort(()=>Math.random()-.5);const g=genFrom(all[deck.pop()],L);if(g){g.level=L;return g}}
 return null}
H.genScenario=(t,L)=>genFrom(t,L);
let bonusOpen=false;
function runBonus(isTeach,done){
 const g=pickScenario();if(!g){done(null);return}
 bonusOpen=true;const t0=Date.now();
 const m=E('div','position:fixed;inset:0;z-index:500;background:#000c;display:flex;align-items:center;justify-content:center;padding:12px;font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif');m.id='hero-bonus';
 m.innerHTML=`<style>@media (max-height:520px){#hero-bonus>div{padding:8px 12px!important}#hero-bonus [data-k]{padding:4px 0!important;font-size:18px!important}#hero-bonus #hb-in{min-height:36px!important;line-height:36px!important;font-size:24px!important;margin:6px auto!important}#hero-bonus #hb-step>div:nth-of-type(2){grid-template-columns:repeat(7,1fr)!important;max-width:520px!important}#hero-bonus #hb-ok{grid-column:auto/span 7!important;padding:6px!important}}</style><div style="background:linear-gradient(#22264f,#14163a);color:#fff;border:4px solid #ffd24a;border-radius:20px;padding:16px 18px;max-width:560px;width:100%;max-height:96vh;overflow:auto;box-shadow:0 0 40px #ffd24a66">
 <div style="font-weight:900;font-size:24px;font-family:inherit;color:#ffd24a;text-align:center">✨ 情境挑戰 BONUS ✨</div>
 <div style="font-size:20px;line-height:1.7;background:#0008;border-radius:12px;padding:12px">${g.text.replace(/</g,'&lt;')}</div>
 <div id="hb-step"></div></div>`;
 document.body.appendChild(m);H.emit('bonus',{});
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
  step.innerHTML=`${note||''}<div id="hb-in" style="margin:12px auto 8px;min-height:52px;font-weight:900;font-size:34px;line-height:52px;font-family:inherit;text-align:center;background:#fff;color:#222;border-radius:12px;max-width:320px">？${g.t.u?' '+g.t.u:''}</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-width:360px;margin:0 auto">${['7','8','9','⌫','4','5','6','−','1','2','3','0'].map(k=>`<button data-k="${k}" style="font-weight:900;font-size:24px;font-family:inherit;padding:10px 0;border-radius:10px;border:0;background:${k==='⌫'||k==='−'?'#555a9a':'#3a3f7a'};color:#fff;cursor:pointer">${k}</button>`).join('')}
  <button id="hb-ok" style="grid-column:1/-1;font-weight:900;font-size:22px;font-family:inherit;padding:10px;border-radius:12px;border:0;background:#2e9e5b;color:#fff;cursor:pointer">⚔️ 送出答案</button></div>`;
  step.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>press(b.dataset.k));
  step.querySelector('#hb-ok').onclick=()=>press('ok')}
 function submit(){
  const okBtn=m.querySelector('#hb-ok');okBtn.disabled=true;const right=Number(input)===g.ans;
  const sec=(Date.now()-t0)/1000;
  step.insertAdjacentHTML('beforeend',`<div style="margin-top:10px;text-align:center;font-size:20px;font-weight:900;color:${right?'#7dff9b':'#ffb4a8'}">${right?'🎉 答對了！BONUS 發動！':'差一點！正確答案是 '+neg(g.ans)+(g.t.u?' '+g.t.u:'')+'<br><span style="font-size:15px;color:#ddd">算式：'+g.expr+'</span>'}</div>
  <button id="hb-go" style="display:block;margin:10px auto 0;font-weight:900;font-size:20px;font-family:inherit;padding:10px 28px;border-radius:12px;border:0;background:#4a5bd8;color:#fff;cursor:pointer">繼續 ▶</button>`);
  H.emit(right?'bonusRight':'bonusWrong',{});
  const go=()=>close({right,sec});m.querySelector('#hb-go').onclick=go;
  if(right)setTimeout(()=>{if(m.isConnected)go()},1800)}
 if(isTeach){
  const opts=[g.expr,...distractors(g)].sort(()=>Math.random()-.5);
  step.innerHTML=`<div style="margin:10px 0 6px;font-weight:800;color:#ffd24a">🎓 第一步：哪一個算式可以算出答案？</div><div style="display:grid;gap:8px">${opts.map(x=>`<button data-x="${x.replace(/"/g,'&quot;')}" style="font-weight:800;font-size:22px;font-family:inherit;padding:10px;border-radius:12px;border:2px solid #8a90d8;background:#2b3070;color:#fff;cursor:pointer">${x}</button>`).join('')}</div>`;
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
window.addEventListener('resize',()=>hud());
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
   try{const tt=document.getElementById('result-title');
    if(win){if(tt)tt.innerText='🎉 打倒頭目了！';H.emit('win',{stars:Math.min(H.lastRaw,CAP[TIER||'quick']),raw:H.lastRaw})}
    else{if(tt){tt.innerText='💪 再加把勁！';tt.style.color='#E67E22'}const el=document.getElementById('result-stats');
     if(el){el.insertAdjacentHTML('afterbegin',adviceHTML());const sid=currentStageObj&&currentStageObj.id;wireAdvice(()=>{screens.result.classList.add('hidden');startBattle(sid,true)})}
     H.emit('lose',{})}}catch(e){console.warn(e)}
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
   if(win){armChest(tierFor(acc));const sb=document.getElementById('rs-synth');if(sb)sb.addEventListener('click',()=>setTimeout(()=>H.emit('win',{stars:(tierFor(acc)||{}).stars||1}),1450))}
   else{try{const af=document.getElementById('rs-after');if(af){af.insertAdjacentHTML('beforeend',adviceHTML());const lid=curLayer.id;wireAdvice(()=>{document.getElementById('result-overlay').classList.add('hidden');startLayer(lid)})}}catch(e){}H.emit('lose',{})}
   try{const li=lvInfo(),af=document.getElementById('rs-after');
    const od=document.getElementById('hero-rs');if(od)od.remove();
    if(af)af.insertAdjacentHTML('afterend',`<div id="hero-rs" style="text-align:center;margin:6px 0;font-weight:700">🏆 本層總分 ${H.score}（×${MULT[TIER||'quick']}）　🔥最高連擊 ${H.maxCombo}　✨經驗 +${H.gainXp}　Lv.${li.level}${li.level>H.lvStart?' 🎉升級！':''}</div>`)}catch(e){}
   if(failStreak(win))setTimeout(()=>gentleHint(()=>{switchTier('teach');try{showMap()}catch(e){}}),700);
   return r});
 }
 setupMap();
 if(cfg.type!=='neg')hookBonus();
 hookTutor();
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
  wrap('resolve',(o,a)=>{const S=window.eval('S');const pc0=S?S.pc:0;const r=o.apply(null,a);try{if(a[0])H.emit('hit',{combo:S.pc,crit:false});else H.emit('hurt',{})}catch(e){}return r});
  wrap('end',(o,a)=>{const S=window.eval('S'),win=!!a[0],r=o.apply(null,a);try{H.emit(win?'win':'lose',{neg:true})}catch(e){}
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
