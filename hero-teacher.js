/* 教師測試版工具 hero-teacher.js（只會被「…-teacher.html」載入；學生版沒有）
   功能對照負數教師版：獨立存檔、解鎖/通關、等級、無敵、戰鬥中自動答題/直接過關、直接進入關卡、無限模式 */
(function(){
'use strict';
const cfg=window.HERO_CFG||{}, battle=cfg.type==='battle';
const stages=()=>battle?allStagesList:layers;
const prog=()=>battle?playerProgress:progress;
const sname=s=>s.id+' '+(s.name||s.title||s.boss||s.place||'');
const need=l=>50+l*l*50;
const $q=s=>document.querySelector(s);
let god=false;
function boot(){
 const st=document.createElement('style');
 st.textContent=`#tbanner{position:fixed;top:0;right:0;z-index:400;background:#ff9f1c;color:#000;font:700 12px/1.6 sans-serif;padding:2px 10px;border-radius:0 0 0 8px}
 #tbtn{position:fixed;right:8px;bottom:40px;z-index:400;background:#ff9f1c;color:#000;font:700 15px sans-serif;border:0;border-radius:20px;padding:9px 15px;cursor:pointer}
 #tpan{position:fixed;right:8px;bottom:86px;z-index:400;width:340px;max-width:94vw;max-height:78vh;overflow:auto;background:#101030f5;border:2px solid #ff9f1c;border-radius:12px;padding:10px;color:#fff;font:14px/1.8 sans-serif}
 #tpan h4{margin:10px 0 3px;color:#ffd86b;font-size:15px}#tpan small{color:#bbb}
 #tpan button,#tpan select,#tpan input{font:13px sans-serif;padding:5px 9px;margin:2px;border-radius:6px;border:0}
 #tpan button{background:#3a2a8a;color:#fff;cursor:pointer}#tpan button.on{background:#ff9f1c;color:#000}
 #tpan select,#tpan input{background:#fff;color:#000}#tpan input{width:60px}#tmsg{color:#7dff9b;min-height:22px;font-weight:700}`;
 document.head.appendChild(st);
 const b=document.createElement('div');b.id='tbanner';b.textContent='🛠 教師測試版（獨立存檔，不會影響學生資料）';document.body.appendChild(b);
 const btn=document.createElement('button');btn.id='tbtn';btn.textContent='🛠 教師工具';document.body.appendChild(btn);
 const pan=document.createElement('div');pan.id='tpan';pan.hidden=true;document.body.appendChild(pan);
 btn.onclick=()=>{pan.hidden=!pan.hidden;if(!pan.hidden)T.draw()};
}
function msg(t){const e=$q('#tmsg');if(e)e.textContent=t}
function refresh(){try{saveProgress()}catch(e){}try{refreshMap()}catch(e){}
 try{const f=battle?findFrontierStageId():findFrontierId();if(typeof placeHeroInstant==='function')placeHeroInstant(f)}catch(e){}}
const live=()=>{const b=document.getElementById(battle?'battle-screen':'puzzle-screen')||document.getElementById('battle-screen');return !!b&&!b.classList.contains('hidden')&&getComputedStyle(b).display!=='none'};
const T=window.T={
 unlock(){stages().forEach(s=>{const x=prog()[s.id]=prog()[s.id]||{unlocked:false,stars:0};x.unlocked=true});refresh();msg('🔓 已解鎖全部關卡（星等沒有改）')},
 all(){stages().forEach(s=>{prog()[s.id]={unlocked:true,stars:5}});refresh();msg('🏆 全部通關（5★）：無限模式也已開啟')},
 to(){const id=$q('#t-to').value,l=stages(),i=l.findIndex(s=>String(s.id)===id);
  l.forEach((s,j)=>{prog()[s.id]={unlocked:j<=i+1,stars:j<=i?5:0}});refresh();msg('✅ 已通關到 '+sname(l[i]))},
 reset(){if(!confirm('清除教師版的全部進度與等級？（學生資料不受影響）'))return;
  const L=window.__LS;const ks=[];for(let i=0;i<localStorage.length;i++){const k=L.key.call(localStorage,i);if(k&&k.indexOf(L.P)===0)ks.push(k)}
  ks.forEach(k=>L.rm.call(localStorage,k));location.reload()},
 lv(){const n=Math.max(1,Math.min(60,+$q('#t-lv').value||1));let e=0;for(let l=1;l<n;l++)e+=need(l);
  let o={};try{o=JSON.parse(localStorage.getItem('heroRPG_v1:guest'))||{}}catch(x){}o.exp=e;localStorage.setItem('heroRPG_v1:guest',JSON.stringify(o));
  try{HERO.setTier(HERO.tier)}catch(x){}msg('等級設為 Lv.'+n)},
 god(){god=!god;T.draw();msg(god?'🛡 無敵：答錯不扣血':'🛡 無敵已關閉')},
 ans(){const a=battle?currentAnswer:curAns;msg('👁 這題答案：'+a+((cfg.id==='div'&&typeof currentRem!=='undefined')?'　餘 '+currentRem:''))},
 right(){if(!live())return msg('請先進入戰鬥／關卡');
  if(battle&&typeof playMode!=='undefined'&&playMode==='teach')return msg('教學模式請手動作答；要自動答題請先切到挑戰或地獄');
  if(battle){answerStr=String(currentAnswer);if(typeof remStr!=='undefined'&&typeof currentRem!=='undefined')remStr=String(currentRem);processAnswer(true,false)}
  else{answerStr=String(curAns);processAnswer(false)}},
 wrong(){if(!live())return msg('請先進入戰鬥／關卡');
  if(battle&&typeof playMode!=='undefined'&&playMode==='teach')return msg('教學模式請手動作答；要自動答題請先切到挑戰或地獄');
  answerStr='99999';if(battle)processAnswer(true,false);else processAnswer(false)},
 win(){if(!live())return msg('請先進入戰鬥／關卡');
  if(battle){bossHP=0;stageStats.correct=Math.max(10,stageStats.correct);stageStats.total=stageStats.correct;endGame(true)}
  else{correctCount=QUESTIONS_PER_LAYER;finishLayer()}},
 lose(){if(!live())return msg('請先進入戰鬥／關卡');
  if(battle){hasRevive=false;playerHP=0;endGame(false)}else{correctCount=0;finishLayer()}},
 go(){const id=$q('#t-go').value,m=$q('#t-md').value;T.unlock();HERO.setTier(m);
  try{setMode(m==='teach'?'teach':'quick')}catch(e){}
  const s=stages().find(x=>String(x.id)===id);if(battle)startBattle(s.id,true);else startLayer(s.id)},
 endless(){T.all();setTimeout(()=>{try{HERO.startEndless('chapter')}catch(e){msg('請先回到大地圖再按')}},300)},
 draw(){const on=x=>x?'on':'',opts=stages().map(s=>`<option value="${s.id}">${sname(s)}</option>`).join('');
  $q('#tpan').innerHTML=`<b>教師工具｜${({add:'加法',sub:'減法',mul:'乘法',div:'除法',ops:'四則'})[cfg.id]||''}</b><div id="tmsg"></div>
  <small>獨立存檔，關掉頁面也不會影響學生。要自動答題請用挑戰／地獄模式。</small>
  <h4>① 進度與解鎖</h4><button onclick="T.unlock()">🔓 解鎖全部關卡</button><button onclick="T.all()">🏆 全部通關（5★）</button><br>
  通關到 <select id="t-to">${opts}</select><button onclick="T.to()">設定</button><br><button onclick="T.reset()">🧹 清除教師版全部進度</button>
  <h4>② 勇者</h4>等級 <input id="t-lv" type="number" min="1" max="60" value="${HERO.lvInfo().level}"><button onclick="T.lv()">設定</button>
  <button class="${on(god)}" onclick="T.god()">🛡 無敵：${god?'開':'關'}</button>
  <h4>③ 戰鬥中</h4><button onclick="T.ans()">👁 顯示答案</button><button onclick="T.right()">✅ 自動答對</button><button onclick="T.wrong()">❌ 自動答錯（看解說）</button><br>
  <button onclick="T.win()">⚡ 直接過關</button><button onclick="T.lose()">💀 直接失敗</button>
  <h4>④ 直接進入關卡</h4><select id="t-go">${opts}</select><select id="t-md"><option value="teach">教學</option><option value="quick">挑戰</option><option value="hell">地獄</option></select><button onclick="T.go()">開打</button>
  <h4>⑤ 無限模式</h4><button onclick="T.endless()">♾️ 全部通關並開始全章無限</button>`}
};
/* 無敵：把「勇者受到的傷害」歸零 */
function patchGod(){if(window.HERO&&!HERO.__g){HERO.__g=1;const o=HERO.hurt;HERO.hurt=function(){const d=o.apply(this,arguments);return god?0:d}}}
window.addEventListener('load',()=>{boot();patchGod()});
})();
