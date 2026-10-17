/* 勇者商店商品目錄 hero-items.js
   ★ 小屋（index.html）和每一章遊戲（hero-core.js）共用同一份，所以只要在這裡改價格／效果，全部一起生效。
   ★ 價格也可以在 hero-config.js 的 shop:{ 商品id: 價格 } 覆蓋，不用改這個檔。

   【設計筆記（給老師看的）】
   · 每日可賺的勇者幣大約 300～500 枚（每關每日上限 300、全天 500 枚滿速，超過只算 20%）。
   · 消耗品 30～250 枚：一天賺的錢就能買到，天天有東西可以花（金幣不會越存越多、也不會花不掉）。
   · 造型／飾品 200～5000 枚：便宜的第一天就能買到（讓孩子馬上體會「買了就換上」的成就感），貴的是長期目標。
   · 道具只影響「當場戰鬥」，星等是用答對率算的，所以道具不會讓星星變好拿，也不會破壞學習目標。
   · 每種消耗品有「每日限購」，積分券也有，避免有人用金幣把光榮榜衝爆。 */
(function(){
'use strict';
const HOLD=30;        // 每種消耗品最多持有幾個
const HEAL_CAP=3;     // 每場戰鬥最多喝幾瓶血瓶（避免變成喝水遊戲）

/* ---------- 消耗品 ----------
   kind: heal 回血｜revive 倒下自動復活｜shield 擋攻擊｜ticket 積分加成
   limit: 每天最多買幾個 */
const consumables=[
 {id:'hp1',icon:'🧃',name:'小血瓶',kind:'heal',pct:.3,price:30,limit:10,desc:'戰鬥中使用，立刻回復 30% 血量'},
 {id:'hp2',icon:'🍷',name:'中血瓶',kind:'heal',pct:.6,price:70,limit:8,desc:'戰鬥中使用，立刻回復 60% 血量'},
 {id:'hp3',icon:'💖',name:'大血瓶',kind:'heal',pct:1,price:140,limit:5,desc:'戰鬥中使用，血量一次補滿'},
 {id:'rv1',icon:'🧪',name:'復活藥',kind:'revive',pct:.5,price:120,limit:5,desc:'血量歸零時「自動」復活，回復 50% 血量（放在包包裡就會生效）'},
 {id:'rv2',icon:'✨',name:'聖光復活藥',kind:'revive',pct:1,price:250,limit:3,desc:'血量歸零時「自動」復活，血量全滿！'},
 {id:'sh1',icon:'🪵',name:'木盾',kind:'shield',hits:1,price:50,limit:8,desc:'擋下 1 次怪物攻擊（這場戰鬥有效）'},
 {id:'sh2',icon:'🛡️',name:'鐵盾',kind:'shield',hits:3,price:130,limit:5,desc:'擋下 3 次怪物攻擊（這場戰鬥有效）'},
 {id:'sh3',icon:'🔰',name:'神聖光盾',kind:'shield',hits:5,price:220,limit:3,desc:'擋下 5 次怪物攻擊（這場戰鬥有效）'},
 {id:'tk1',icon:'🎟️',name:'積分券',kind:'ticket',mult:1.5,price:100,limit:5,desc:'這場戰鬥的積分 ×1.5（包含減法章）'},
 {id:'tk2',icon:'🎫',name:'雙倍積分券',kind:'ticket',mult:2,price:220,limit:3,desc:'這場戰鬥的積分 ×2（包含減法章）'}
];

/* ---------- 勇者造型（用現有勇者圖換色＋光環，不需要新圖檔）----------
   hue 色相角度｜sat 飽和度｜br 亮度｜glow 光環顏色｜rainbow 會慢慢變色 */
const skins=[
 {id:'default',icon:'🧙',name:'原版勇者',price:0,desc:'最初的樣子，永遠可以換回來'},
 {id:'fire',icon:'🔥',name:'烈焰勇者',price:800,hue:-35,sat:1.5,br:1.05,glow:'#ff5a1f',desc:'身上燃著不熄的火焰'},
 {id:'ice',icon:'❄️',name:'冰霜騎士',price:800,hue:175,sat:1.2,br:1.15,glow:'#5ad7ff',desc:'冷靜、冰涼、一點都不慌'},
 {id:'forest',icon:'🌿',name:'森林遊俠',price:800,hue:85,sat:1.3,br:1,glow:'#4cd964',desc:'跟大自然一起冒險'},
 {id:'shadow',icon:'🌙',name:'暗影刺客',price:1500,hue:250,sat:.35,br:.62,glow:'#9b59ff',desc:'神秘的夜行者，酷到不行'},
 {id:'gold',icon:'👑',name:'黃金聖騎士',price:3000,lv:8,hue:-8,sat:2.4,br:1.25,glow:'#ffd24a',desc:'閃閃發亮的傳說（需要 Lv.8）'},
 {id:'rainbow',icon:'🌈',name:'彩虹傳說',price:5000,lv:12,rainbow:1,sat:1.4,br:1.1,glow:'#ffffff',desc:'顏色會一直變的終極造型（需要 Lv.12）'}
];

/* ---------- 全新角色（真的不同的角色，不只是換色）----------
   圖片放在 assets/shop/heroes/角色id/ 裡，六張同名 PNG：
   idle 站立｜run-right 往右跑｜run-left 往左跑｜attack 攻擊｜hurt 受傷｜lose 倒下
   （想用動畫也可以：把 GIF 改名成 .png 放進去，瀏覽器照樣會播）*/
const SHOP_DIR='./assets/shop/';
const chars=[
 {id:'mage',icon:'🧙‍♂️',name:'見習魔法師',price:2500,char:1,desc:'拿著水晶魔杖的小魔法師'},
 {id:'ninja',icon:'🥷',name:'疾風忍者',price:2500,char:1,desc:'紅頭巾、動作超快的忍者'},
 {id:'princess',icon:'👸',name:'公主騎士',price:3000,lv:6,char:1,desc:'戴著皇冠、拿著細劍的公主（需要 Lv.6）'},
 {id:'robot',icon:'🤖',name:'數算機器人',price:3500,lv:8,char:1,desc:'眼睛會發光的計算機器人（需要 Lv.8）'},
 {id:'dragon',icon:'🐲',name:'小龍勇者',price:3500,lv:8,char:1,desc:'長著小翅膀和尾巴的龍族勇者（需要 Lv.8）'}
];
skins.push.apply(skins,chars);
const charIds=chars.map(c=>c.id);

/* ---------- 角色配件（披風、服裝、頭飾、臉部配件、表情氣泡）----------
   圖片放在 assets/shop/gear/配件id.png（透明背景 PNG）。
   a = 預設位置：cx、cy 是配件「中心點」在角色圖上的位置（0～1，左上角是 0,0），w 是配件寬度佔角色圖寬度的比例。
   位置不對時：在下面的 ANCHORS 裡，針對某個角色或某件配件覆蓋即可（可用小屋的「🎯 配件位置調整器」調出數字）。*/
const gearSlots=[
 {id:'cape',icon:'🧣',name:'披風'},
 {id:'outfit',icon:'👘',name:'服裝'},
 {id:'head',icon:'👑',name:'頭飾'},
 {id:'face',icon:'🕶️',name:'臉部配件'},
 {id:'expr',icon:'💬',name:'表情氣泡'}
];
const gear=[
 {id:'g_cape_red',slot:'cape',icon:'🧣',name:'紅披風',price:400,a:{cx:.5,cy:.57,w:.88},desc:'經典的英雄紅披風'},
 {id:'g_cape_blue',slot:'cape',icon:'🌌',name:'星空披風',price:600,a:{cx:.5,cy:.57,w:.88},desc:'藍色披風上有閃亮的星星'},
 {id:'g_cape_gold',slot:'cape',icon:'👑',name:'皇家披風',price:1500,lv:8,a:{cx:.5,cy:.57,w:.88},desc:'紫色配白色毛領，國王等級（需要 Lv.8）'},
 {id:'g_santa',slot:'outfit',icon:'🎅',name:'聖誕套裝',price:1200,a:{cx:.5,cy:.66,w:.36},desc:'紅色聖誕外套，搭配聖誕帽更有氣氛'},
 {id:'g_grad',slot:'outfit',icon:'🎓',name:'畢業袍',price:1000,a:{cx:.5,cy:.66,w:.36},desc:'黑色畢業袍，搭配學士帽'},
 {id:'g_space',slot:'outfit',icon:'🧑‍🚀',name:'太空衣',price:1500,a:{cx:.5,cy:.66,w:.36},desc:'白色太空衣、橘色領口'},
 {id:'g_crown',slot:'head',icon:'👑',name:'黃金皇冠',price:1500,lv:6,a:{cx:.5,cy:.075,w:.44},desc:'鑲著寶石的皇冠（需要 Lv.6）'},
 {id:'g_santahat',slot:'head',icon:'🎄',name:'聖誕帽',price:500,a:{cx:.5,cy:.06,w:.56},desc:'毛茸茸的聖誕帽'},
 {id:'g_wizhat',slot:'head',icon:'🧙',name:'巫師帽',price:600,a:{cx:.5,cy:.0,w:.62},desc:'藍色的星星巫師帽'},
 {id:'g_flower',slot:'head',icon:'🌸',name:'花環',price:400,a:{cx:.5,cy:.16,w:.5},desc:'五顏六色的小花環'},
 {id:'g_cat',slot:'head',icon:'🐱',name:'貓耳髮箍',price:500,a:{cx:.5,cy:.1,w:.5},desc:'黑色貓耳朵，粉紅色耳心'},
 {id:'g_gradcap',slot:'head',icon:'🎓',name:'學士帽',price:500,a:{cx:.5,cy:.12,w:.54},desc:'流蘇會晃動的學士帽'},
 {id:'g_glasses',slot:'face',icon:'👓',name:'圓眼鏡',price:300,a:{cx:.5,cy:.34,w:.32},desc:'聰明學者的圓眼鏡'},
 {id:'g_shades',slot:'face',icon:'🕶️',name:'酷炫墨鏡',price:500,a:{cx:.5,cy:.34,w:.32},desc:'戴上就變酷'},
 {id:'g_mustache',slot:'face',icon:'🥸',name:'小鬍子',price:300,a:{cx:.5,cy:.43,w:.2},desc:'紳士的小鬍子'},
 {id:'g_mask',slot:'face',icon:'😷',name:'口罩',price:200,a:{cx:.5,cy:.43,w:.32},desc:'白色口罩'},
 {id:'e_heart',slot:'expr',icon:'💗',name:'愛心氣泡',price:300,a:{cx:.86,cy:.1,w:.27},desc:'頭上飄著愛心'},
 {id:'e_angry',slot:'expr',icon:'💢',name:'生氣氣泡',price:300,a:{cx:.86,cy:.1,w:.27},desc:'頭上冒出怒氣'},
 {id:'e_sparkle',slot:'expr',icon:'✨',name:'閃亮氣泡',price:400,a:{cx:.86,cy:.1,w:.27},desc:'閃閃發亮的好心情'},
 {id:'e_music',slot:'expr',icon:'🎵',name:'哼歌氣泡',price:300,a:{cx:.86,cy:.1,w:.27},desc:'開心地哼著歌'},
 {id:'e_sleep',slot:'expr',icon:'💤',name:'瞌睡氣泡',price:300,a:{cx:.86,cy:.1,w:.27},desc:'呼呼～想睡覺'}
];
/* 位置微調：ANCHORS = { 角色id: { 配件id或位置名稱: {cx,cy,w} } }；角色 id 是 default（原版勇者與換色造型）、mage、ninja、princess、robot、dragon */
const ANCHORS={default:{},mage:{},ninja:{},princess:{},robot:{},dragon:{}};

/* ---------- 小屋背景樣式 ---------- */
const themes=[
 {id:'default',icon:'🏠',name:'溫馨木屋',price:0,desc:'最原始的勇者小屋'},
 {id:'castle',icon:'🏰',name:'石頭城堡',price:1500,desc:'厚厚的石牆，超有安全感'},
 {id:'magic',icon:'🔮',name:'魔法學院',price:2000,desc:'牆上飄著金色星星和月亮'},
 {id:'ocean',icon:'🌊',name:'海洋小屋',price:2000,desc:'藍藍的牆、沙灘色的地板'},
 {id:'forest',icon:'🌳',name:'森林樹屋',price:2500,desc:'住在大樹裡的感覺'},
 {id:'candy',icon:'🍬',name:'糖果屋',price:2500,desc:'粉紅條紋，甜到心裡'},
 {id:'space',icon:'🚀',name:'太空基地',price:4000,lv:10,desc:'窗外是宇宙！（需要 Lv.10）'}
];

/* ---------- 房間飾品（每個位置同時只能放一個，買了自動換上，點別的就換掉）---------- */
const slots=[
 {id:'wall',icon:'🖼️',name:'牆上掛飾'},
 {id:'mantel',icon:'🕯️',name:'壁爐台'},
 {id:'curtain',icon:'🪟',name:'窗簾'},
 {id:'ceil',icon:'💡',name:'天花板'},
 {id:'rug',icon:'🟥',name:'地毯'},
 {id:'plant',icon:'🪴',name:'植物'},
 {id:'pet',icon:'🐾',name:'寵物夥伴'}
];
const decor=[
 {id:'w_frame',slot:'wall',icon:'🖼️',name:'風景畫',price:300,desc:'藍天、青山、太陽'},
 {id:'w_map',slot:'wall',icon:'🗺️',name:'藏寶圖',price:500,desc:'X 記號就是寶藏的位置'},
 {id:'w_portrait',slot:'wall',icon:'👤',name:'勇者畫像',price:800,desc:'戴著頭盔的英雄肖像'},
 {id:'w_banner',slot:'wall',icon:'🚩',name:'公會旗幟',price:1200,desc:'紅底金劍，冒險者公會的標誌'},
 {id:'m_candle',slot:'mantel',icon:'🕯️',name:'三支蠟燭',price:200,desc:'火光搖搖晃晃'},
 {id:'m_vase',slot:'mantel',icon:'💐',name:'花瓶',price:300,desc:'插著紅花和黃花'},
 {id:'m_hourglass',slot:'mantel',icon:'⏳',name:'沙漏',price:400,desc:'提醒你時間很寶貴'},
 {id:'m_trophy',slot:'mantel',icon:'🏆',name:'冠軍獎盃',price:600,desc:'第一名的味道'},
 {id:'cu_red',slot:'curtain',icon:'🟥',name:'紅色窗簾',price:400,desc:'溫暖的紅'},
 {id:'cu_blue',slot:'curtain',icon:'🟦',name:'藍色窗簾',price:400,desc:'沉穩的藍'},
 {id:'cu_pink',slot:'curtain',icon:'🌸',name:'點點窗簾',price:600,desc:'粉紅色加白色圓點'},
 {id:'c_bunting',slot:'ceil',icon:'🎏',name:'慶典彩旗',price:400,desc:'每天都像在慶祝'},
 {id:'c_lights',slot:'ceil',icon:'✨',name:'星星串燈',price:600,desc:'五顏六色一閃一閃'},
 {id:'c_lamp',slot:'ceil',icon:'🪔',name:'水晶吊燈',price:800,desc:'五支蠟燭的華麗吊燈'},
 {id:'r_blue',slot:'rug',icon:'🟦',name:'藍星地毯',price:500,desc:'深藍底、白色星星'},
 {id:'r_green',slot:'rug',icon:'🟩',name:'森林地毯',price:500,desc:'綠色的草地感'},
 {id:'r_rainbow',slot:'rug',icon:'🌈',name:'彩虹地毯',price:900,desc:'一圈一圈的彩虹'},
 {id:'r_gold',slot:'rug',icon:'🟪',name:'皇家金邊地毯',price:1500,desc:'紫色配金邊，國王等級'},
 {id:'p_cactus',slot:'plant',icon:'🌵',name:'仙人掌',price:250,desc:'不用澆水的好夥伴'},
 {id:'p_pot',slot:'plant',icon:'🪴',name:'大葉盆栽',price:350,desc:'綠油油的大葉子'},
 {id:'p_tree',slot:'plant',icon:'🌳',name:'結果小樹',price:600,desc:'樹上還有紅色小果子'},
 {id:'pet_cat',slot:'pet',icon:'🐱',name:'橘貓',price:1500,desc:'尾巴會搖來搖去'},
 {id:'pet_dog',slot:'pet',icon:'🐶',name:'小狗',price:1500,desc:'吐舌頭、尾巴搖不停'},
 {id:'pet_owl',slot:'pet',icon:'🦉',name:'阿基米貓頭鷹',price:2000,desc:'戴著圓眼鏡的數學老師'},
 {id:'pet_dragon',slot:'pet',icon:'🐲',name:'小綠龍',price:3000,lv:6,desc:'會噴小火花的寵物龍（需要 Lv.6）'}
];

const all=[].concat(consumables.map(x=>Object.assign({cat:'item'},x)),skins.map(x=>Object.assign({cat:'skin',slot:'skin'},x)),themes.map(x=>Object.assign({cat:'theme',slot:'theme'},x)),decor.map(x=>Object.assign({cat:'decor'},x)),gear.map(x=>Object.assign({cat:'gear'},x)));
const map={};all.forEach(x=>map[x.id]=x);

/* 勇者造型 → CSS filter（一般圖片用）／SVG filter（小屋 SVG 裡的勇者用，Safari 也能正常顯示） */
function skinCss(s){
 if(!s||s.id==='default'||s.char)return '';
 const a=[];if(!s.rainbow&&s.hue)a.push('hue-rotate('+s.hue+'deg)');
 if(s.sat)a.push('saturate('+s.sat+')');if(s.br)a.push('brightness('+s.br+')');
 if(s.glow)a.push('drop-shadow(0 0 7px '+s.glow+') drop-shadow(0 0 14px '+s.glow+'88)');
 return a.join(' ')}
function skinSvg(s,id){
 if(!s||s.id==='default'||s.char)return '';
 const hue=s.rainbow?'<feColorMatrix type="hueRotate" values="0"><animate attributeName="values" from="0" to="360" dur="6s" repeatCount="indefinite"/></feColorMatrix>':'<feColorMatrix type="hueRotate" values="'+(s.hue||0)+'"/>';
 const b=s.br||1;
 return '<filter id="'+id+'" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">'+hue+
  '<feColorMatrix type="saturate" values="'+(s.sat||1)+'"/>'+
  '<feComponentTransfer result="sk"><feFuncR type="linear" slope="'+b+'"/><feFuncG type="linear" slope="'+b+'"/><feFuncB type="linear" slope="'+b+'"/></feComponentTransfer>'+
  '<feGaussianBlur in="SourceAlpha" stdDeviation="9" result="bl"/><feFlood flood-color="'+(s.glow||'#fff')+'" flood-opacity=".75"/><feComposite in2="bl" operator="in" result="gl"/>'+
  '<feMerge><feMergeNode in="gl"/><feMergeNode in="sk"/></feMerge></filter>'}


/* 角色圖片路徑：新角色用 assets/shop/heroes/，原版與換色造型用原本的 */
const charOf=skinId=>charIds.includes(skinId)?skinId:'default';
const heroImg=(skinId,state)=>charIds.includes(skinId)?SHOP_DIR+'heroes/'+skinId+'/'+state+'.png':null;
/* 圖片探測：先確認圖片檔真的存在（沒放圖就自動用內建的向量圖，不會出現破圖）*/
const DIM={};
function probe(urls,cb){[].concat(urls).forEach(u=>{if(DIM[u]!==undefined){cb&&cb(u);return}
 const im=new Image();im.onload=()=>{DIM[u]=[im.naturalWidth,im.naturalHeight];cb&&cb(u)};im.onerror=()=>{DIM[u]=false;cb&&cb(u)};im.src=u})}
const dim=u=>DIM[u]||null;
/* 配件圖層（HTML）：放在「跟角色圖一樣大」的 position:relative 容器裡；layer='back' 只畫披風（放在角色後面），'front' 畫其他 */
function anchorOf(item,ch){const t=ANCHORS[ch]||{},o=t[item.id]||t[item.slot]||{};return Object.assign({},item.a,o)}
const gearList=(eq,layer)=>['cape','outfit','face','head','expr'].filter(sl=>layer==='back'?sl==='cape':layer==='front'?sl!=='cape':true).map(sl=>{const id=eq[sl],it=id&&map[id];return it&&DIM[SHOP_DIR+'gear/'+id+'.png']?it:null}).filter(Boolean);
function gearHTML(eq,ch,layer){
 return gearList(eq,layer).map(it=>{const a=anchorOf(it,ch);
  return '<img class="hg" data-slot="'+it.slot+'" src="'+SHOP_DIR+'gear/'+it.id+'.png" alt="" draggable="false" style="position:absolute;left:'+(a.cx*100)+'%;top:'+(a.cy*100)+'%;width:'+(a.w*100)+'%;height:auto;transform:translate(-50%,-50%);pointer-events:none;user-select:none;max-width:none;filter:none;animation:none;margin:0;padding:0;border:0">'}).join('')}
/* 配件圖層（SVG，小屋用）：回傳 SVG <image> 字串，box={x,y,w,h} 是角色圖在畫面上的實際範圍 */
function gearSvg(eq,ch,layer,box){
 return gearList(eq,layer).map(it=>{const a=anchorOf(it,ch),d=DIM[SHOP_DIR+'gear/'+it.id+'.png'],w=a.w*box.w,h=w*d[1]/d[0];
  return '<image href="'+SHOP_DIR+'gear/'+it.id+'.png" x="'+(box.x+a.cx*box.w-w/2).toFixed(1)+'" y="'+(box.y+a.cy*box.h-h/2).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" pointer-events="none"/>'}).join('')}

window.HERO_ITEMS={HOLD,HEAL_CAP,SHOP_DIR,consumables,skins,chars,charIds,gear,gearSlots,ANCHORS,themes,slots,decor,all,charOf,heroImg,gearHTML,gearSvg,gearList,anchorOf,probe,dim,
 find:id=>map[id]||null,
 skin:id=>skins.find(x=>x.id===id)||skins[0],
 theme:id=>themes.find(x=>x.id===id)||themes[0],
 skinCss,skinSvg};
})();
