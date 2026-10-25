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
 {id:'hp1',icon:'🍶',name:'益氣凝血散',sub:'小血瓶',kind:'heal',pct:.3,price:30,limit:10,rarity:'common',desc:'戰鬥中使用，立刻回復 30% 血量（凝氣固元）'},
 {id:'hp2',icon:'🏺',name:'回春九轉丹',sub:'中血瓶',kind:'heal',pct:.6,price:70,limit:8,rarity:'rare',desc:'戰鬥中使用，立刻回復 60% 血量（丹香四溢）'},
 {id:'hp3',icon:'✨',name:'生生造化露',sub:'大血瓶',kind:'heal',pct:1,price:140,limit:5,rarity:'epic',desc:'戰鬥中使用，血量瞬間回滿（逆轉乾坤）'},
 {id:'rv1',icon:'🔮',name:'涅槃還魂丹',sub:'復活藥',kind:'revive',pct:.5,price:120,limit:5,rarity:'rare',desc:'血量歸零時「自動」復活，回復 50% 血量（存於儲物袋即生效）'},
 {id:'rv2',icon:'☀️',name:'九轉金丹',sub:'聖光復活藥',kind:'revive',pct:1,price:250,limit:3,rarity:'legend',desc:'血量歸零時「自動」復活，血量全滿！（仙家神品）'},
 {id:'sh1',icon:'🪵',name:'青木辟邪符',sub:'木盾',kind:'shield',hits:1,price:50,limit:8,rarity:'common',desc:'擋下 1 次怪物攻擊（這場戰鬥有效）'},
 {id:'sh2',icon:'🛡️',name:'玄鐵重光盾',sub:'鐵盾',kind:'shield',hits:3,price:130,limit:5,rarity:'rare',desc:'擋下 3 次怪物攻擊（這場戰鬥有效）'},
 {id:'sh3',icon:'🔰',name:'金鐘乾坤罩',sub:'神聖光盾',kind:'shield',hits:5,price:220,limit:3,rarity:'epic',desc:'擋下 5 次怪物攻擊（這場戰鬥有效）'},
 {id:'tk1',icon:'📜',name:'悟道歷練卷',sub:'積分券',kind:'ticket',mult:1.5,price:100,limit:5,rarity:'rare',desc:'這場戰鬥的積分 ×1.5（包含減法章）'},
 {id:'tk2',icon:'📑',name:'天道加持令',sub:'雙倍積分券',kind:'ticket',mult:2,price:220,limit:3,rarity:'legend',desc:'這場戰鬥的積分 ×2（包含減法章）'}
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
 {id:'dragon',icon:'🐲',name:'小龍勇者',price:3500,lv:8,char:1,desc:'長著小翅膀和尾巴的龍族勇者（需要 Lv.8）'},
 /* 仙俠系新角色：尺寸、動作、影格時間完全比照原版勇者（111×112，動作是會動的 GIF，檔名維持 .png） */
 {id:'swordsman',icon:'🗡️',name:'劍仙少俠',price:2800,char:1,rarity:'rare',desc:'白衣青帶、背著仙劍的少年劍客，揮劍會有劍氣'},
 {id:'alchemist',icon:'⚗️',name:'丹童',price:2800,char:1,rarity:'rare',desc:'抱著小丹爐的煉丹小道士，攻擊是丟出火焰丹丸'},
 {id:'foxfairy',icon:'🦊',name:'九尾狐仙',price:3500,lv:6,char:1,rarity:'epic',desc:'白髮狐耳、身後九條蓬鬆大尾巴，搖扇放出狐火（需要 Lv.6）'},
 {id:'monk',icon:'📿',name:'少林小和尚',price:3500,lv:6,char:1,rarity:'epic',desc:'圓圓光頭、掛著念珠，一掌推出金色氣浪（需要 Lv.6）'}
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
 {id:'g_cape_red',slot:'cape',icon:'🧣',name:'赤霞仙錦披風',sub:'紅披風',price:400,a:{cx:.5,cy:.57,w:.88},desc:'金龍吞口、赤錦流光的俠客披風'},
 {id:'g_cape_blue',slot:'cape',icon:'🌌',name:'星宿玄冥披風',sub:'星空披風',price:600,a:{cx:.5,cy:.57,w:.88},desc:'深藍雲錦繡著閃爍銀河星象'},
 {id:'g_cape_gold',slot:'cape',icon:'👑',name:'紫霄金龍皇袍',sub:'皇家披風',price:1500,lv:8,a:{cx:.5,cy:.57,w:.88},desc:'紫綾金龍盤踞、雪貂絨領，帝王尊貴（需要 Lv.8）'},
 {id:'g_santa',slot:'outfit',icon:'🎅',name:'紅雲暖冬錦袍',sub:'冬節袍',price:1200,a:{cx:.5,cy:.66,w:.36},desc:'朱紅暖金冬裝，配白絨翻領'},
 {id:'g_grad',slot:'outfit',icon:'🎓',name:'墨玉文士儒袍',sub:'學士袍',price:1000,a:{cx:.5,cy:.66,w:.36},desc:'儒雅沉穩的墨黑文道儒袍'},
 {id:'g_space',slot:'outfit',icon:'🧑‍🚀',name:'九霄星曜天衣',sub:'星曜衣',price:1500,a:{cx:.5,cy:.66,w:.36},desc:'銀白星輝凝鑄的凌虛天衣'},
 {id:'g_crown',slot:'head',icon:'👑',name:'紫金雙鳳龍冠',sub:'紫金冠',price:1500,lv:6,a:{cx:.5,cy:.075,w:.44},desc:'金雕雙鳳朝陽、嵌靈玉翡翠（需要 Lv.6）'},
 {id:'g_santahat',slot:'head',icon:'🎄',name:'瑞雪絨暖道冠',sub:'冬帽',price:500,a:{cx:.5,cy:.06,w:.56},desc:'毛茸茸的溫暖紅絨軟帽'},
 {id:'g_wizhat',slot:'head',icon:'🧙',name:'太極星宿仙冠',sub:'巫師帽',price:600,a:{cx:.5,cy:.0,w:.62},desc:'繡滿乾坤二十八星宿的道玄仙冠'},
 {id:'g_flower',slot:'head',icon:'🌸',name:'仙靈百花靈環',sub:'百花環',price:400,a:{cx:.5,cy:.16,w:.5},desc:'瑤池採擷的五彩仙蓮與靈花'},
 {id:'g_cat',slot:'head',icon:'🐱',name:'靈狐仙耳髮箍',sub:'狐耳',price:500,a:{cx:.5,cy:.1,w:.5},desc:'雪絨白狐耳，隨風靈動'},
 {id:'g_gradcap',slot:'head',icon:'🎓',name:'文曲進士綸巾',sub:'進士冠',price:500,a:{cx:.5,cy:.12,w:.54},desc:'文曲星官金榜進士冠帶'},
 {id:'g_glasses',slot:'face',icon:'👓',name:'乾坤水晶明眸鏡',sub:'水晶鏡',price:300,a:{cx:.5,cy:.34,w:.32},desc:'天工琉璃磨製的學者寶鏡'},
 {id:'g_shades',slot:'face',icon:'🕶️',name:'琉璃玄晶墨鏡',sub:'玄晶鏡',price:500,a:{cx:.5,cy:.34,w:.32},desc:'黑曜玄晶打造的瀟灑墨鏡'},
 {id:'g_mustache',slot:'face',icon:'🥸',name:'逍遙俠客微髭',sub:'微髭',price:300,a:{cx:.5,cy:.43,w:.2},desc:'風流瀟灑的名士小短髭'},
 {id:'g_mask',slot:'face',icon:'😷',name:'玄影幽冥面罩',sub:'面罩',price:200,a:{cx:.5,cy:.43,w:.32},desc:'暗影織錦面紗，匿氣遮顏'},
 {id:'e_heart',slot:'expr',icon:'💗',name:'道心情深氣泡',sub:'愛心',price:300,a:{cx:.86,cy:.1,w:.27},desc:'頭頂飄逸的靈犀愛心'},
 {id:'e_angry',slot:'expr',icon:'💢',name:'怒火乾坤氣泡',sub:'怒氣',price:300,a:{cx:.86,cy:.1,w:.27},desc:'頭上冒出凌厲劍氣怒火'},
 {id:'e_sparkle',slot:'expr',icon:'✨',name:'星輝靈光氣泡',sub:'星輝',price:400,a:{cx:.86,cy:.1,w:.27},desc:'周身閃耀的道韻靈光'},
 {id:'e_music',slot:'expr',icon:'🎵',name:'天籟仙音氣泡',sub:'仙音',price:300,a:{cx:.86,cy:.1,w:.27},desc:'耳畔飄揚的古琴宮商仙曲'},
 {id:'e_sleep',slot:'expr',icon:'💤',name:'閉關入定氣泡',sub:'入定',price:300,a:{cx:.86,cy:.1,w:.27},desc:'呼呼～正在冥想入定中'}
];
/*RIGS-BEGIN 由 build_rigs.py 自動產生，請勿手改。RIGS 欄位：[寬,高,頭中心x,頭頂y,頭寬,頭高,脖子y,身體中心x,身體寬,軀幹寬,軀幹中心y,底y]（皆為占圖片的比例）；GEARMETA＝配件圖案在 256x256 畫布中的範圍*/
const RIGS={"assets/hero/hero-idle.png":[111,112,0.423,0.143,0.414,0.393,0.536,0.419,0.377,0.284,0.711,0.973],"assets/bosses/multiply/monster-1-1.png":[460,427,0.503,0.007,0.876,0.511,0.518,0.509,0.943,0.891,0.708,0.993],"assets/bosses/multiply/monster-2-1.png":[460,427,0.504,0.007,0.886,0.511,0.518,0.506,0.929,0.902,0.708,0.993],"assets/bosses/multiply/monster-2-2.png":[460,196,0.501,0.015,0.978,0.505,0.52,0.521,0.935,0.93,0.708,0.99],"assets/bosses/multiply/monster-3-1.png":[460,435,0.496,0.007,0.8,0.276,0.283,0.5,0.9,0.807,0.567,0.993],"assets/bosses/multiply/monster-3-2.png":[460,445,0.497,0.007,0.843,0.283,0.29,0.5,0.913,0.843,0.571,0.993],"assets/bosses/multiply/monster-3-3.png":[460,460,0.498,0.007,0.889,0.357,0.363,0.504,0.917,0.867,0.615,0.993],"assets/bosses/multiply/monster-4-1.png":[459,460,0.487,0.007,0.844,0.448,0.454,0.512,0.874,0.821,0.673,1.0],"assets/bosses/multiply/monster-4-2.png":[460,224,0.792,0.009,0.978,0.509,0.518,0.545,0.936,0.901,0.707,0.991],"assets/bosses/multiply/monster-4-3.png":[460,424,0.505,0.005,0.907,0.512,0.517,0.504,0.974,0.97,0.706,0.991],"assets/bosses/multiply/monster-4-4.png":[460,407,0.506,0.005,0.959,0.514,0.518,0.503,0.972,0.97,0.708,0.993],"assets/bosses/multiply/monster-5-1.png":[460,438,0.501,0.005,0.902,0.292,0.297,0.5,0.954,0.772,0.575,0.993],"assets/bosses/negative/monster-1-1 - \u8907\u88fd.png":[191,267,0.488,0.06,0.644,0.487,0.547,0.488,0.775,0.741,0.728,1.0],"assets/bosses/negative/monster-2-1 - \u8907\u88fd.png":[600,640,0.499,0.052,0.377,0.352,0.403,0.499,0.675,0.649,0.631,0.972],"assets/bosses/negative/monster-2-2 - \u8907\u88fd.png":[600,640,0.499,0.0,0.744,0.505,0.505,0.499,0.773,0.77,0.692,0.972],"assets/bosses/negative/monster-3-1 - \u8907\u88fd.png":[1408,768,0.5,0.017,0.712,0.491,0.508,0.503,0.593,0.545,0.699,0.987],"assets/bosses/negative/monster-3-2 - \u8907\u88fd.png":[300,266,0.483,0.075,0.879,0.477,0.553,0.467,0.727,0.67,0.727,0.989],"assets/bosses/negative/monster-3-3 - \u8907\u88fd.png":[300,266,0.497,0.011,0.783,0.508,0.519,0.491,0.787,0.772,0.707,0.989],"assets/bosses/negative/monster-4-1 - \u8907\u88fd.png":[300,255,0.497,0.18,0.889,0.463,0.643,0.518,0.367,0.338,0.759,0.933],"assets/bosses/negative/monster-4-2 - \u8907\u88fd.png":[300,263,0.511,0.19,0.849,0.487,0.677,0.485,0.367,0.29,0.8,0.985],"assets/bosses/negative/monster-4-3 - \u8907\u88fd.png":[300,259,0.448,0.147,0.6,0.432,0.579,0.508,0.68,0.667,0.74,0.981],"assets/bosses/negative/monster-4-4 - \u8907\u88fd.png":[300,268,0.528,0.049,0.899,0.485,0.534,0.554,0.789,0.695,0.71,0.974],"assets/bosses/fourops/monster-1-3.png":[615,584,0.486,0.0,0.834,0.507,0.507,0.515,0.684,0.613,0.695,0.978],"assets/bosses/fourops/monster-3-1.png":[581,752,0.478,0.059,0.832,0.48,0.539,0.548,0.871,0.855,0.717,0.984],"assets/bosses/fourops/monster-3-2.png":[644,609,0.557,0.034,0.38,0.304,0.338,0.55,0.848,0.684,0.596,0.984],"assets/bosses/fourops/monster-4-1.png":[410,381,0.587,0.029,0.746,0.491,0.52,0.537,0.861,0.761,0.702,0.976],"assets/bosses/division/monster-1-1.png":[191,267,0.488,0.06,0.644,0.487,0.547,0.488,0.775,0.741,0.728,1.0],"assets/bosses/division/monster-2-1.png":[1408,768,0.51,0.03,0.379,0.419,0.449,0.506,0.364,0.351,0.664,0.986],"assets/bosses/division/monster-2-2.png":[1408,768,0.525,0.017,0.366,0.507,0.523,0.522,0.456,0.43,0.711,0.992],"assets/bosses/division/monster-3-1.png":[1408,768,0.5,0.017,0.712,0.491,0.508,0.503,0.593,0.545,0.699,0.987],"assets/bosses/division/monster-3-2.png":[1408,768,0.575,0.02,0.514,0.521,0.54,0.488,0.669,0.548,0.717,0.983],"assets/bosses/division/monster-3-3.png":[300,266,0.497,0.011,0.783,0.508,0.519,0.491,0.787,0.772,0.707,0.989],"assets/bosses/division/monster-4-1.png":[1408,768,0.503,0.048,0.749,0.582,0.63,0.479,0.285,0.269,0.774,0.991],"assets/bosses/division/monster-4-2.png":[1408,768,0.532,0.031,0.665,0.491,0.522,0.496,0.638,0.601,0.703,0.975],"assets/bosses/division/monster-4-3.png":[300,259,0.448,0.147,0.6,0.432,0.579,0.508,0.68,0.667,0.74,0.981],"assets/bosses/division/monster-4-4.png":[1408,768,0.517,0.03,0.753,0.464,0.493,0.508,0.777,0.756,0.665,0.923],"assets/bosses/division/monster-5-1.png":[1408,768,0.497,0.052,0.877,0.49,0.542,0.539,0.779,0.682,0.723,0.995],"assets/bosses/addition/monster-1-1.png":[139,94,0.482,0.223,0.45,0.33,0.553,0.482,0.647,0.547,0.677,0.862],"assets/bosses/addition/monster-1-2.png":[226,168,0.471,0.179,0.677,0.417,0.595,0.487,0.881,0.872,0.75,0.982],"assets/bosses/addition/monster-2-1.png":[110,168,0.455,0.113,0.436,0.292,0.405,0.492,0.554,0.436,0.638,0.988],"assets/bosses/addition/monster-2-2.png":[154,168,0.544,0.125,0.545,0.446,0.571,0.639,0.542,0.39,0.74,0.994],"assets/bosses/addition/monster-2-3.png":[174,168,0.5,0.077,0.585,0.47,0.548,0.515,0.788,0.655,0.724,0.988],"assets/bosses/addition/monster-3-1.png":[162,95,0.491,0.168,0.68,0.484,0.653,0.491,0.406,0.265,0.779,0.968],"assets/bosses/addition/monster-3-2.png":[172,171,0.484,0.064,0.877,0.526,0.591,0.477,0.504,0.407,0.738,0.959],"assets/bosses/addition/monster-3-3.png":[159,171,0.481,0.099,0.868,0.474,0.573,0.481,0.669,0.553,0.723,0.947],"assets/bosses/addition/monster-3-4.png":[129,171,0.492,0.123,0.829,0.509,0.632,0.502,0.337,0.225,0.763,0.959],"assets/bosses/addition/monster-3-5.png":[95,171,0.498,0.035,0.621,0.485,0.52,0.537,0.674,0.621,0.701,0.971],"assets/bosses/addition/monster-4-1.png":[133,171,0.523,0.175,0.414,0.322,0.497,0.612,0.473,0.346,0.673,0.936],"assets/bosses/addition/monster-4-2.png":[115,171,0.492,0.117,0.618,0.515,0.632,0.492,0.448,0.265,0.763,0.959],"assets/bosses/addition/monster-4-3.png":[147,128,0.425,0.039,0.653,0.539,0.578,0.537,0.531,0.245,0.719,0.93],"assets/bosses/addition/monster-4-4.png":[152,176,0.497,0.114,0.816,0.438,0.551,0.51,0.783,0.776,0.715,0.96],"assets/bosses/addition/monster-4-5.png":[180,176,0.5,0.006,0.78,0.562,0.568,0.508,0.756,0.672,0.73,0.972],"assets/bosses/addition/monster-4-6.png":[216,176,0.495,0.023,0.88,0.574,0.597,0.548,0.565,0.5,0.742,0.96],"assets/bosses/addition/monster-4-7.png":[142,176,0.493,0.04,0.633,0.443,0.483,0.503,0.61,0.521,0.674,0.96],"assets/bosses/addition/monster-5-1.png":[128,176,0.492,0.057,0.633,0.426,0.483,0.558,0.362,0.352,0.676,0.966],"assets/shop/heroes/monk/idle.png":[111,112,0.495,0.143,0.405,0.339,0.482,0.495,0.36,0.324,0.675,0.964],"assets/shop/heroes/robot/idle.png":[680,720,0.499,0.017,0.415,0.501,0.518,0.499,0.432,0.421,0.709,0.994],"assets/shop/heroes/alchemist/idle.png":[111,112,0.5,0.143,0.45,0.33,0.473,0.495,0.378,0.347,0.67,0.964],"assets/shop/heroes/swordsman/idle.png":[111,112,0.446,0.143,0.396,0.438,0.58,0.45,0.553,0.405,0.734,0.964],"assets/shop/heroes/mage/idle.png":[680,720,0.52,0.0,0.463,0.503,0.503,0.499,0.388,0.372,0.699,0.994],"assets/shop/heroes/foxfairy/idle.png":[111,112,0.495,0.143,0.724,0.42,0.562,0.495,0.748,0.725,0.723,0.964],"assets/shop/heroes/princess/idle.png":[680,720,0.499,0.015,0.532,0.508,0.524,0.499,0.565,0.559,0.712,0.994],"assets/shop/heroes/dragon/idle.png":[680,720,0.499,0.047,0.626,0.46,0.507,0.51,0.535,0.494,0.702,0.994],"assets/shop/heroes/ninja/idle.png":[680,720,0.518,0.124,0.511,0.376,0.5,0.499,0.385,0.371,0.698,0.994],"assets/hero-ninja/hero-idle.png":[111,112,0.423,0.143,0.414,0.393,0.536,0.419,0.377,0.284,0.711,0.973]};
const GEARMETA={"e_angry":[19,12,236,244],"e_heart":[19,12,236,244],"e_music":[19,12,236,244],"e_sleep":[19,12,236,244],"e_sparkle":[19,12,236,244],"g_cape_blue":[12,32,244,224],"g_cape_gold":[12,26,244,229],"g_cape_red":[12,29,244,227],"g_cat":[12,32,244,223],"g_crown":[12,36,244,219],"g_flower":[12,53,244,202],"g_glasses":[12,82,244,173],"g_grad":[21,12,235,244],"g_gradcap":[12,24,244,232],"g_mask":[20,12,235,243],"g_mustache":[12,92,244,164],"g_santa":[12,26,244,229],"g_santahat":[12,52,244,204],"g_shades":[12,81,244,174],"g_space":[16,12,240,244],"g_wizhat":[12,12,243,244]};
/*RIGS-END*/
/* 位置微調：ANCHORS = { 角色id: { 配件id或位置名稱: {cx,cy,w} } }；角色 id 是 default（原版勇者與換色造型）、mage、ninja、princess、robot、dragon */
const ANCHORS={default:{},mage:{},ninja:{},princess:{},robot:{},dragon:{},swordsman:{},alchemist:{},foxfairy:{},monk:{}};

/* ---------- 小屋背景樣式 ---------- */
const themes=[
 {id:'xianxia',icon:'🏯',name:'仙境洞府',price:0,fullArt:true,desc:'雲霧繚繞、精雕博古多寶閣與月亮窗的修仙聖境（問道／問劍修仙風格）'},
 {id:'default',icon:'🏠',name:'奇幻工坊',price:0,fullArt:true,desc:'石砌壁爐、實木藥櫃與晨光山景的精緻手繪木屋'},
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
 {id:'w_frame',slot:'wall',icon:'🖼️',name:'仙山雲海圖',price:300,desc:'峰巒疊翠、飛瀑流泉的仙家墨寶'},
 {id:'w_map',slot:'wall',icon:'🗺️',name:'九州山河圖',price:500,desc:'朱砂紅印、暗藏乾坤的天下秘圖'},
 {id:'w_portrait',slot:'wall',icon:'👤',name:'白衣劍仙像',price:800,desc:'手持靈劍、氣宇軒昂的先祖聖像'},
 {id:'w_banner',slot:'wall',icon:'🚩',name:'宗門乾坤戰旗',price:1200,desc:'赤金織錦金龍翻騰的宗門旌旗'},
 {id:'m_candle',slot:'mantel',icon:'🕯️',name:'鶴首長明燭',price:200,desc:'青銅仙鶴托燭，火光搖曳生香'},
 {id:'m_vase',slot:'mantel',icon:'💐',name:'青花折枝梅瓶',price:300,desc:'細瓷白釉、幽蘭寒梅點綴雅室'},
 {id:'m_hourglass',slot:'mantel',icon:'⏳',name:'乾坤星砂儀',price:400,desc:'渾天流轉，星辰金砂計錄光陰'},
 {id:'m_trophy',slot:'mantel',icon:'🏆',name:'魁星點斗金尊',price:600,desc:'青銅三足金鼎，問鼎天下之證'},
 {id:'cu_red',slot:'curtain',icon:'🟥',name:'赤霞織錦簾',price:400,desc:'端莊華貴的赤霞雲錦門簾'},
 {id:'cu_blue',slot:'curtain',icon:'🟦',name:'碧波幽嵐簾',price:400,desc:'清淨深邃的碧波垂簾'},
 {id:'cu_pink',slot:'curtain',icon:'🌸',name:'桃花微雨簾',price:600,desc:'若隱若現的桃花輕紗'},
 {id:'c_bunting',slot:'ceil',icon:'🎏',name:'迎仙祈福彩旗',price:400,desc:'喜慶祥和的仙門節慶幡旗'},
 {id:'c_lights',slot:'ceil',icon:'✨',name:'靈光星宿燈串',price:600,desc:'星光點點、仙氣瀰漫的靈晶燈'},
 {id:'c_lamp',slot:'ceil',icon:'🪔',name:'八寶琉璃宮燈',price:800,desc:'六面雕花、紅纓垂落的古風宮燈'},
 {id:'r_blue',slot:'rug',icon:'🟦',name:'乾坤星宿毯',price:500,desc:'深藍底色繡刻周天星斗'},
 {id:'r_green',slot:'rug',icon:'🟩',name:'青藤碧玉毯',price:500,desc:'如茵翠玉般的清涼草席毯'},
 {id:'r_rainbow',slot:'rug',icon:'🌈',name:'五色祥雲毯',price:900,desc:'霞光萬道、五彩流轉的吉祥錦毯'},
 {id:'r_gold',slot:'rug',icon:'🟪',name:'紫宸金龍毯',price:1500,desc:'至尊紫底金龍，仙宗掌門尊貴規格'},
 {id:'p_cactus',slot:'plant',icon:'🌵',name:'萬年玄靈肉肉',price:250,desc:'紫砂盆栽種的通靈金仙掌'},
 {id:'p_pot',slot:'plant',icon:'🪴',name:'靈泉碧玉翠竹',price:350,desc:'青瓷盆栽、挺拔清脆的靈竹'},
 {id:'p_tree',slot:'plant',icon:'🌳',name:'朱果仙靈盆景',price:600,desc:'靈根老樁，枝頭掛滿朱紅仙果'},
 {id:'pet_cat',slot:'pet',icon:'🐱',name:'橘靈貓',price:1500,desc:'尾巴輕搖的通靈橘貓'},
 {id:'pet_dog',slot:'pet',icon:'🐶',name:'哮天幼犬',price:1500,desc:'忠誠勇猛的靈獸犬'},
 {id:'pet_owl',slot:'pet',icon:'🦉',name:'阿基米夜鴞',price:2000,desc:'戴著金絲圓鏡的博學靈鳥'},
 {id:'pet_dragon',slot:'pet',icon:'🐲',name:'青麟小靈龍',price:3000,lv:6,desc:'周身泛著微光的小神龍（需要 Lv.6）'}
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
/* ---------- 配件自動對位：依「角色圖量到的頭、臉、身體位置」＋「配件圖案實際範圍」算出 cx,cy,w ----------
   RIGS／GEARMETA 由 build_rigs.py 產生；新增角色或配件圖後重跑一次即可。ANCHORS 仍可針對單一角色／配件微調。 */
const DEFRIG=[100,100,.5,.08,.5,.42,.5,.5,.5,.4,.7,.97];
const rigOf=src=>{if(!src)return null;let k=String(src).replace(/\?.*$/,'');const i=k.indexOf('assets/');k=i>=0?k.slice(i):k.replace(/^\.\//,'');return RIGS[k]||null};
const rigPath=ch=>(!ch||ch==='default')?'assets/hero/hero-idle.png':'assets/shop/heroes/'+ch+'/idle.png';
/* vw＝配件圖案寬度是參考寬度（頭寬／軀幹寬／身體寬）的幾倍；dy＝壓進頭多少（占頭高）；y＝臉上的位置（占頭高） */
const GFIT={
 cape:{rel:'body',vw:1.5,at:'top',dy:-.02},
 outfit:{rel:'torso',vw:1.05,at:'center'},
 head:{rel:'head',vw:1.0,at:'bottom',dy:.3},
 face:{rel:'head',vw:.8,at:'center',y:.58},
 expr:{rel:'head',vw:.52,at:'center'},
 g_crown:{vw:.92,dy:.26},g_santahat:{vw:1.12,dy:.34},g_wizhat:{vw:.98,dy:.36},g_flower:{vw:1.04,dy:.38},g_cat:{vw:1.02,dy:.3},g_gradcap:{vw:1.0,dy:.32},
 g_glasses:{vw:.82,y:.56},g_shades:{vw:.82,y:.56},g_mustache:{vw:.36,y:.82},g_mask:{vw:.64,y:.84}
};
function anchorOf(item,ch){
 const t=ANCHORS[ch]||{},o=t[item.id]||t[item.slot]||{},m=GEARMETA[item.id];
 if(!m)return Object.assign({},item.a,o);
 const R=rigOf(rigPath(ch))||DEFRIG,iw=R[0],ih=R[1],hcx=R[2],top=R[3],hh=R[5],ny=R[6],bcx=R[7],bw=R[8],tw=R[9],tcy=R[10],ar=ih/iw,hw=Math.min(R[4],hh*ar*1.12);   // 頭寬不超過頭高的 1.12 倍（避免把長髮、翅膀、尾巴算成頭）
 const f=Object.assign({},GFIT[item.slot],GFIT[item.id]);
 const twE=Math.min(tw,hw*.95),bwE=Math.min(bw,hw*1.4);   // 長髮、尾巴、翅膀不算進身體寬
 const ref=f.rel==='torso'?twE:f.rel==='body'?Math.max(bwE,hw):hw,chF=(m[3]-m[1])/256;
 let wC=ref*f.vw/((m[2]-m[0])/256);                          // 配件畫布寬（占角色圖寬）
 if(item.slot==='cape')wC=Math.min(wC,Math.max(.1,(R[11]+.01-ny)*ar)/chF);   // 披風不長過腳底
 if(item.slot==='head')wC=Math.min(wC,hh*ar*1.2/chF);                        // 高帽子不比頭高太多
 let X=hcx,Y;
 if(item.slot==='cape'){X=bcx;Y=ny+f.dy}
 else if(item.slot==='outfit'){X=bcx;Y=tcy}
 else if(item.slot==='head')Y=top+f.dy*hh;
 else if(item.slot==='face')Y=top+f.y*hh;
 else{X=hcx+.62*hw;Y=top+.04*hh}
 const cxC=X-(((m[0]+m[2])/512)-.5)*wC;
 const yw=Y*ar,ccy=f.at==='bottom'?yw-((m[3]/256)-.5)*wC:f.at==='top'?yw-((m[1]/256)-.5)*wC:yw-(((m[1]+m[3])/512)-.5)*wC;
 return Object.assign({cx:cxC,cy:ccy/ar,w:wC},o)}
const gearList=(eq,layer)=>['cape','outfit','face','head','expr'].filter(sl=>layer==='back'?sl==='cape':layer==='front'?sl!=='cape':true).map(sl=>{const id=eq[sl],it=id&&map[id];return it&&DIM[SHOP_DIR+'gear/'+id+'.png']?it:null}).filter(Boolean);
function gearHTML(eq,ch,layer){
 return gearList(eq,layer).map(it=>{const a=anchorOf(it,ch);
  return '<img class="hg" data-slot="'+it.slot+'" src="'+SHOP_DIR+'gear/'+it.id+'.png" alt="" draggable="false" style="position:absolute;left:'+(a.cx*100)+'%;top:'+(a.cy*100)+'%;width:'+(a.w*100)+'%;height:auto;transform:translate(-50%,-50%);pointer-events:none;user-select:none;max-width:none;filter:none;animation:none;margin:0;padding:0;border:0">'}).join('')}
/* 配件圖層（SVG，小屋用）：回傳 SVG <image> 字串，box={x,y,w,h} 是角色圖在畫面上的實際範圍 */
function gearSvg(eq,ch,layer,box){
 return gearList(eq,layer).map(it=>{const a=anchorOf(it,ch),d=DIM[SHOP_DIR+'gear/'+it.id+'.png'],w=a.w*box.w,h=w*d[1]/d[0];
  return '<image href="'+SHOP_DIR+'gear/'+it.id+'.png" x="'+(box.x+a.cx*box.w-w/2).toFixed(1)+'" y="'+(box.y+a.cy*box.h-h/2).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" pointer-events="none"/>'}).join('')}

window.HERO_ITEMS={HOLD,HEAL_CAP,SHOP_DIR,consumables,skins,chars,charIds,gear,gearSlots,ANCHORS,themes,slots,decor,all,charOf,heroImg,gearHTML,gearSvg,gearList,anchorOf,probe,dim,rigOf,rigPath,
 find:id=>map[id]||null,
 skin:id=>skins.find(x=>x.id===id)||skins[0],
 theme:id=>themes.find(x=>x.id===id)||themes[0],
 skinCss,skinSvg};
})();
