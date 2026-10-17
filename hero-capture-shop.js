/* 怪物打扮商品目錄 hero-capture-shop.js
   ★ 價格可以在修改器（hero-editor.html →「🎁 情境題・寶箱・怪物收服」分頁）直接改，下載新的 hero-config.js 即可。
   ★ 這裡的 price 只是預設值。想新增物品：照格式多加一行就好（icon 用 emoji；換色用 filter；光環用 filter＋可選 anim:'rainbow'）。
   ★ 買一次，全部收服到的怪物都能穿；每隻怪物各自記住自己的打扮。 */
window.HERO_PET_ACC={
 slots:[
  {id:'head',icon:'🎩',name:'頭飾'},
  {id:'face',icon:'🕶️',name:'臉部'},
  {id:'neck',icon:'🧣',name:'頸部'},
  {id:'hold',icon:'🪄',name:'手持'},
  {id:'aura',icon:'✨',name:'光環'}],
 items:[
  {id:'bow',slot:'head',icon:'🎀',name:'蝴蝶結',price:100},
  {id:'cap',slot:'head',icon:'🧢',name:'棒球帽',price:120},
  {id:'hat',slot:'head',icon:'🎩',name:'魔術帽',price:150},
  {id:'grad',slot:'head',icon:'🎓',name:'學士帽',price:250},
  {id:'santa',slot:'head',icon:'🎅',name:'聖誕帽',price:150},
  {id:'crown',slot:'head',icon:'👑',name:'黃金皇冠',price:600},
  {id:'glasses',slot:'face',icon:'👓',name:'圓眼鏡',price:100},
  {id:'shades',slot:'face',icon:'🕶️',name:'酷墨鏡',price:150},
  {id:'mask',slot:'face',icon:'🎭',name:'神秘面具',price:200},
  {id:'bell',slot:'neck',icon:'🔔',name:'小鈴鐺',price:80},
  {id:'ribbon',slot:'neck',icon:'🎗️',name:'絲帶',price:100},
  {id:'scarf',slot:'neck',icon:'🧣',name:'暖暖圍巾',price:120},
  {id:'medal',slot:'neck',icon:'🏅',name:'榮譽勳章',price:200},
  {id:'flower',slot:'hold',icon:'🌸',name:'小花',price:60},
  {id:'lolli',slot:'hold',icon:'🍭',name:'棒棒糖',price:80},
  {id:'balloon',slot:'hold',icon:'🎈',name:'氣球',price:100},
  {id:'book',slot:'hold',icon:'📖',name:'數學課本',price:150},
  {id:'wand',slot:'hold',icon:'🪄',name:'魔法棒',price:200},
  {id:'sword',slot:'hold',icon:'⚔️',name:'小寶劍',price:250},
  {id:'a_gold',slot:'aura',icon:'🌞',name:'金色光環',price:300,filter:'drop-shadow(0 0 8px #ffd24a) drop-shadow(0 0 3px #fff)'},
  {id:'a_pink',slot:'aura',icon:'💗',name:'粉紅光環',price:300,filter:'drop-shadow(0 0 8px #ff7ac8) drop-shadow(0 0 3px #fff)'},
  {id:'a_blue',slot:'aura',icon:'💎',name:'冰藍光環',price:300,filter:'drop-shadow(0 0 8px #5ad7ff) drop-shadow(0 0 3px #fff)'},
  {id:'a_rainbow',slot:'aura',icon:'🌈',name:'彩虹光環',price:600,filter:'drop-shadow(0 0 9px #fff)',anim:'rainbow'}
 ]
};
