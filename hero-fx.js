/* 勇者動畫＋音效模組 hero-fx.js（接在 hero-core.js 後面載入）
   ① 打擊感：答對時頭目被擊中（白閃、震動、粒子、連擊大字、神速暴擊）；答錯時勇者受傷（畫面閃紅、震動）
   ② 打敗頭目：彩帶、勝利號角、星星一顆一顆跳出來；輸了：溫和的鼓勵音樂
   ③ 音效：全部用瀏覽器即時合成，不需要任何音效檔
   ④ 背景音樂：每一章一首不同風格的 8 小節循環曲（即時合成）；戰鬥時節奏變快
      想換成真正的 mp3：修改器（或 hero-config.js）裡 music:{add:'assets/audio/xxx.mp3'} 就會改播檔案
   右下角 🔊 可以開關音樂／音效，會記住設定。 */
(function(){
'use strict';
const H=window.HERO;if(!H)return;
const C=H.C||{},cfg=H.cfg||{},SND=Object.assign({bgm:true,sfx:true,vol:.5},C.sound||{});
const $=s=>document.querySelector(s);
const LSK='heroFX_v1';let pref={};try{pref=JSON.parse(localStorage.getItem(LSK))||{}}catch(e){}
const savePref=()=>{try{localStorage.setItem(LSK,JSON.stringify(pref))}catch(e){}};
let musicOn=pref.music!==undefined?pref.music:SND.bgm, sfxOn=pref.sfx!==undefined?pref.sfx:SND.sfx;

/* ============ 畫面特效 ============ */
const css=`
@keyframes hfxShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-7px,3px)}40%{transform:translate(6px,-4px)}60%{transform:translate(-5px,-2px)}80%{transform:translate(4px,3px)}}
@keyframes hfxBossHit{0%{filter:brightness(3) saturate(0)}35%{filter:brightness(1.6)}100%{filter:none}}
@keyframes hfxPop{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}25%{transform:translate(-50%,-50%) scale(1.25);opacity:1}70%{transform:translate(-50%,-60%) scale(1);opacity:1}100%{transform:translate(-50%,-90%) scale(.9);opacity:0}}
@keyframes hfxStar{0%{transform:scale(0) rotate(-120deg);opacity:0}60%{transform:scale(1.5) rotate(15deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes hfxBanner{0%{transform:translate(-50%,-50%) scale(.2) rotate(-8deg);opacity:0}20%{transform:translate(-50%,-50%) scale(1.15) rotate(2deg);opacity:1}35%{transform:translate(-50%,-50%) scale(1)}85%{opacity:1}100%{transform:translate(-50%,-50%) scale(1.05);opacity:0}}
.hfx-shake{animation:hfxShake .32s linear}
.hfx-bosshit{animation:hfxBossHit .45s ease-out}
#hfx-flash{position:fixed;inset:0;pointer-events:none;z-index:420;opacity:0;transition:opacity .25s}
.hfx-pop{position:fixed;z-index:430;pointer-events:none;font-weight:900;white-space:nowrap;text-shadow:0 3px 0 #000,0 0 12px #000;animation:hfxPop 1.1s ease-out forwards;font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif}
.hfx-banner{position:fixed;left:50%;top:42%;z-index:440;pointer-events:none;font-weight:900;font-size:clamp(34px,9vw,72px);color:#ffd24a;text-shadow:0 5px 0 #8a4b00,0 0 30px #ff9f1c;animation:hfxBanner 2.4s ease-out forwards;white-space:nowrap;font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif}
.hfx-star{display:inline-block;animation:hfxStar .5s cubic-bezier(.2,1.6,.4,1) both}
#hfx-canvas{position:fixed;inset:0;pointer-events:none;z-index:410}
#hfx-snd{all:unset;box-sizing:border-box;position:fixed;left:8px;bottom:40px;z-index:390;border:2px solid #ffd24a;background:#000a;color:#fff;border-radius:99px;font-size:18px;line-height:38px;text-align:center;width:42px;height:42px;cursor:pointer;box-shadow:none}
@media (max-height:520px){#hfx-snd{bottom:auto;top:4px;left:auto;right:8px;width:34px;height:34px;line-height:30px;font-size:15px}}
`;
function boot(){
 const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
 const fl=document.createElement('div');fl.id='hfx-flash';document.body.appendChild(fl);
 const cv=document.createElement('canvas');cv.id='hfx-canvas';document.body.appendChild(cv);
 const b=document.createElement('button');b.id='hfx-snd';b.title='音樂／音效開關';document.body.appendChild(b);
 const upd=()=>{b.textContent=musicOn?'🔊':(sfxOn?'🔉':'🔇')};upd();
 b.onclick=e=>{e.stopPropagation();// 三段：全開 → 只有音效 → 全關
  if(musicOn){musicOn=false;sfxOn=true}else if(sfxOn){sfxOn=false}else{musicOn=true;sfxOn=true}
  pref.music=musicOn;pref.sfx=sfxOn;savePref();upd();musicOn?Music.start():Music.stop()};
 if(cfg.type==='neg'&&document.getElementById('bgmbtn'))b.style.display='none';// 負數章有自己的音樂開關
}
const bossEl=()=>(typeof ui!=='undefined'&&ui&&ui.bossSprite)||$('#boss')||$('#pz-board-holder');
const heroEl=()=>$('#hero-avatar-el')||$('#hero')||$('.hero-avatar');
const shakeEl=()=>$('#battle-screen')||$('#stage')||$('#puzzle-screen')||document.body;
function shake(el){if(!el)return;el.classList.remove('hfx-shake');void el.offsetWidth;el.classList.add('hfx-shake')}
function flash(color,op){const f=$('#hfx-flash');if(!f)return;f.style.background=color;f.style.opacity=op||.35;setTimeout(()=>f.style.opacity=0,120)}
function centerOf(el){if(!el)return[innerWidth/2,innerHeight/2];const r=el.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]}
function pop(text,x,y,color,size){const d=document.createElement('div');d.className='hfx-pop';d.textContent=text;d.style.left=x+'px';d.style.top=y+'px';d.style.color=color||'#fff';d.style.fontSize=(size||34)+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),1150)}
function banner(text,color){const d=document.createElement('div');d.className='hfx-banner';d.textContent=text;if(color)d.style.color=color;document.body.appendChild(d);setTimeout(()=>d.remove(),2450)}
/* 粒子與彩帶（同一個 canvas）*/
let parts=[],raf=0;
function burst(x,y,n,colors,speed,grav,life,shape){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(speed||6)*(.4+Math.random());
 parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(shape==='conf'?6:2),g:grav||.25,life:life||40,max:life||40,c:colors[i%colors.length],s:shape==='conf'?6+Math.random()*6:3+Math.random()*4,r:Math.random()*6,vr:(Math.random()-.5)*.4,shape})}
 if(!raf)raf=requestAnimationFrame(tick)}
function tick(){const cv=$('#hfx-canvas');if(!cv){raf=0;return}
 if(cv.width!==innerWidth||cv.height!==innerHeight){cv.width=innerWidth;cv.height=innerHeight}
 const g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);
 parts=parts.filter(p=>p.life>0);parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.vx*=.985;p.life--;p.r+=p.vr;g.globalAlpha=Math.min(1,p.life/p.max*1.5);g.fillStyle=p.c;
  if(p.shape==='conf'){g.save();g.translate(p.x,p.y);g.rotate(p.r);g.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);g.restore()}else{g.beginPath();g.arc(p.x,p.y,p.s,0,7);g.fill()}});
 g.globalAlpha=1;raf=parts.length?requestAnimationFrame(tick):0;if(!raf)g.clearRect(0,0,cv.width,cv.height)}
function confetti(){const C=['#ffd24a','#ff5c8a','#4ade80','#60a5fa','#c084fc','#fb923c'];for(let k=0;k<5;k++)setTimeout(()=>{burst(innerWidth*(.15+Math.random()*.7),innerHeight*.25,40,C,11,.22,110,'conf')},k*260)}
function popStars(){const el=$('#result-stars')||$('#rs-after .star-result');if(!el)return;
 const html=el.innerHTML;const tmp=document.createElement('div');tmp.innerHTML=html;let i=0;
 const walk=n=>{[...n.childNodes].forEach(c=>{if(c.nodeType===3){const f=document.createDocumentFragment();[...c.textContent].forEach(ch=>{if(ch==='★'){const sp=document.createElement('span');sp.className='hfx-star';sp.style.animationDelay=(0.25+i*.28)+'s';sp.textContent=ch;f.appendChild(sp);const d=i;setTimeout(()=>Snd.star(d),(250+d*280));i++}else f.appendChild(document.createTextNode(ch))});c.replaceWith(f)}else walk(c)})};
 walk(tmp);el.innerHTML=tmp.innerHTML}

/* ============ 音效（Web Audio 即時合成）============ */
let AC=null,master=null,sfxBus=null,musBus=null;
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=SND.vol;master.connect(AC.destination);
 sfxBus=AC.createGain();sfxBus.gain.value=.9;sfxBus.connect(master);musBus=AC.createGain();musBus.gain.value=.32;musBus.connect(master)}catch(e){}}
 if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,t0,d,type,vol,bus,slide){const a=ac();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t0);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t0+d);
 g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol||.2,t0+.01);g.gain.exponentialRampToValueAtTime(0.0001,t0+d);o.connect(g);g.connect(bus||sfxBus);o.start(t0);o.stop(t0+d+.02)}
function noise(t0,d,vol,hp,bus){const a=ac();if(!a)return;const len=Math.floor(a.sampleRate*d),buf=a.createBuffer(1,len,a.sampleRate),ch=buf.getChannelData(0);for(let i=0;i<len;i++)ch[i]=(Math.random()*2-1)*(1-i/len);
 const s=a.createBufferSource();s.buffer=buf;const f=a.createBiquadFilter();f.type='highpass';f.frequency.value=hp||800;const g=a.createGain();g.gain.value=vol||.2;s.connect(f);f.connect(g);g.connect(bus||sfxBus);s.start(t0)}
const N=n=>440*Math.pow(2,(n-69)/12);
const Snd={
 ok(c){if(!sfxOn||!ac())return;const t=AC.currentTime,b=72+Math.min(12,(c||1)-1);tone(N(b),t,.09,'square',.12);tone(N(b+7),t+.07,.14,'square',.12)},
 hit(){if(!sfxOn||!ac())return;const t=AC.currentTime+.18;noise(t,.12,.35,500);tone(160,t,.18,'triangle',.35,null,55)},
 crit(){if(!sfxOn||!ac())return;const t=AC.currentTime+.15;noise(t,.2,.45,300);tone(880,t,.25,'sawtooth',.12,null,1760);tone(110,t,.3,'square',.25,null,40)},
 hurt(){if(!sfxOn||!ac())return;const t=AC.currentTime+.05;tone(330,t,.22,'sawtooth',.16,null,140);noise(t,.1,.2,1500)},
 wrong(){if(!sfxOn||!ac())return;const t=AC.currentTime;tone(N(57),t,.14,'square',.1);tone(N(53),t+.13,.2,'square',.1)},
 bonus(){if(!sfxOn||!ac())return;const t=AC.currentTime;[76,79,84,88].forEach((n,i)=>tone(N(n),t+i*.07,.25,'triangle',.14))},
 win(){if(!sfxOn||!ac())return;const t=AC.currentTime;[[67,.0],[72,.13],[76,.26],[79,.39],[84,.6]].forEach(([n,d])=>{tone(N(n),t+d,d===.6?.7:.16,'square',.13);tone(N(n-12),t+d,d===.6?.7:.16,'triangle',.12)});noise(t+.6,.5,.12,4000)},
 lose(){if(!sfxOn||!ac())return;const t=AC.currentTime;[[67,0],[64,.25],[60,.5],[62,.85],[67,1.15]].forEach(([n,d],i)=>tone(N(n),t+d,i===4?.6:.3,'triangle',.13))},
 star(i){if(!sfxOn||!ac())return;tone(N(79+i*2),AC.currentTime,.18,'triangle',.14)},
 chest(r){if(!sfxOn||!ac())return;const t=AC.currentTime;noise(t,.15,.2,2000);const top=r>=4?[72,76,79,84,88,91]:r?[72,76,79]:[60,55];top.forEach((n,i)=>tone(N(n),t+.15+i*.08,.22,'triangle',.14))}
};
H.sound=Snd;

/* ============ 背景音樂（每章一首，即時合成；也可換成 mp3）============ */
const THEMES={ // 調式、速度、音色：讓每一章聽起來不一樣
 add:{root:60,scale:[0,2,4,7,9],prog:[0,5,3,4],bpm:112,lead:'square',name:'明亮的冒險'},
 sub:{root:64,scale:[0,1,4,5,7,8,10],prog:[0,1,0,6],bpm:96,lead:'triangle',name:'金字塔的神秘'},
 mul:{root:62,scale:[0,2,3,5,7,9,10],prog:[0,3,6,4],bpm:132,lead:'square',name:'熱血的軍團'},
 div:{root:57,scale:[0,2,3,5,7,8,10],prog:[0,5,2,4],bpm:104,lead:'triangle',name:'鋼鐵的防線'},
 ops:{root:60,scale:[0,2,3,5,7,8,11],prog:[0,5,3,4],bpm:120,lead:'sawtooth',name:'平衡之島'},
 neg:{root:57,scale:[0,1,3,5,7,8,10],prog:[0,5,6,4],bpm:100,lead:'triangle',name:'深淵'}};
const Music={timer:0,audio:null,battle:false,bar:0,step:0,next:0,
 seedRand(seed){let s=seed;return()=>{s=(s*9301+49297)%233280;return s/233280}},
 build(th){ // 用固定種子產生 8 小節旋律，所以每次聽到的是同一首歌
  const R=this.seedRand([...String(cfg.id||'x')].reduce((a,c)=>a+c.charCodeAt(0),7));const mel=[];let deg=4;
  for(let b=0;b<8;b++){const bar=[];for(let s=0;s<8;s++){if(R()<.28&&s){bar.push(null);continue}deg=Math.max(0,Math.min(th.scale.length*2-1,deg+Math.round((R()-.5)*3)));bar.push(deg)}mel.push(bar)}
  return mel},
 start(){
  if(!musicOn||cfg.type==='neg')return;
  const file=(C.music||{})[cfg.id];
  if(file){if(!this.audio){this.audio=new Audio(file);this.audio.loop=true;this.audio.volume=.35}this.audio.play().catch(()=>{});return}
  if(this.timer||!ac())return;const th=THEMES[cfg.id]||THEMES.add;this.th=th;this.mel=this.mel||this.build(th);this.next=AC.currentTime+.1;
  this.timer=setInterval(()=>this.sched(),60)},
 stop(){clearInterval(this.timer);this.timer=0;if(this.audio)this.audio.pause()},
 sched(){const th=this.th,a=AC;if(!a)return;const spb=60/(th.bpm*(this.battle?1.18:1))/2;// 八分音符
  while(this.next<a.currentTime+.25){const t=this.next,b=this.bar%8,s=this.step,chord=th.prog[Math.floor(b/2)%4];
   const sc=th.scale,note=d=>th.root+sc[d%sc.length]+12*Math.floor(d/sc.length);
   if(s%2===0)tone(N(note(chord)-24),t,spb*1.6,'triangle',.22,musBus);// 低音
   const arp=[0,2,4,2][s%4];tone(N(note(chord+arp)-12),t,spb*.8,'square',.045,musBus);// 分解和弦
   const m=this.mel[b][s];if(m!=null)tone(N(note(m)),t,spb*.95,th.lead,.07,musBus);// 旋律
   if(this.battle){if(s%2===1)noise(t,.03,.05,7000,musBus);if(s%4===0)tone(90,t,.08,'sine',.18,musBus,40)}// 戰鬥鼓點
   this.next+=spb;this.step=(s+1)%8;if(this.step===0)this.bar++}}
};
H.music=Music;
// 瀏覽器規定：要使用者先點一下才能出聲
const unlock=()=>{ac();Music.start();window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true)};
window.addEventListener('pointerdown',unlock,true);window.addEventListener('keydown',unlock,true);
// 戰鬥中節奏變快
setInterval(()=>{const bs=$('#battle-screen')||$('#puzzle-screen')||$('#battle');Music.battle=!!bs&&!bs.classList.contains('hidden')&&!bs.hidden&&getComputedStyle(bs).display!=='none'},500);

/* ============ 接上遊戲事件 ============ */
H.on('hit',d=>{
 Snd.ok(d.combo);
 setTimeout(()=>{const b=bossEl(),[x,y]=centerOf(b);
  if(b&&cfg.type!=='puzzle'){b.classList.remove('hfx-bosshit');void b.offsetWidth;b.classList.add('hfx-bosshit')}
  const big=d.crit||d.bonus;big?Snd.crit():Snd.hit();shake(shakeEl());
  burst(x,y,big?36:18,big?['#fff','#ffd24a','#ff9f1c']:['#fff','#ffe08a','#8be9ff'],big?9:6,.15,big?45:30);
  if(d.crit)pop('⚡ 神速一擊！',x,y-70,'#ffd24a',38);
  else if(d.combo>=3&&d.combo%1===0)pop(d.combo+' 連擊！',x,y-70,d.combo>=10?'#ff5c8a':d.combo>=5?'#ffb347':'#fff',26+Math.min(d.combo,12)*1.5);
 },d.bonus?0:230)});
H.on('hurt',()=>{Snd.hurt();setTimeout(()=>{flash('#ff2a2a',.32);shake(shakeEl());const[x,y]=centerOf(heroEl());burst(x,y,12,['#ff5c5c','#ff9a9a'],5,.2,25)},250)});
H.on('bonus',()=>Snd.bonus());
H.on('demoStep',()=>{if(sfxOn&&ac())tone(N(84),AC.currentTime,.08,'triangle',.1)});
H.on('bonusRight',()=>{banner('✨ BONUS！','#ffd24a');confetti()});
H.on('bonusWrong',()=>Snd.wrong());
H.on('win',d=>{Snd.win();setTimeout(()=>{banner(d.endless?'🏆 擊破！':'🎉 打倒頭目！');confetti();popStars()},d.neg?600:250)});
H.on('lose',()=>{Snd.lose()});
H.on('chest',d=>{Snd.chest(d.rar);const[x,y]=centerOf($('#rs-after'));if(d.rar)burst(x,y,d.rar>=4?60:30,d.rar>=4?['#ffd24a','#c084fc','#fff']:['#ffd24a','#fff'],8,.18,60,'conf')});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
