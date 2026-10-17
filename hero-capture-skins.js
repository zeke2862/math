/* 怪物新樣貌 hero-capture-skins.js
   「樣貌」＝同一種怪物的另一種外型（例如藍色史萊姆、勇者形狀的史萊姆）。每個新樣貌是一個價錢，不分品質。
   買了之後，那隻怪物在「戰鬥畫面、休息區、勇者小屋、圖鑑」都會用新樣貌。價格可以在修改器改。

   ① 通用樣貌（不用畫圖）：下面 HERO_PET_STYLES 這幾種「換色」，每一隻已收服的怪物都能買。
   ② 專屬樣貌（要有新圖）：在 HERO_PET_SKINS 照格式加一行，圖片放在你指定的路徑（建議 assets/skins/）。
      key 是「遊戲代號|關卡id」，遊戲代號：add 加法、mul 乘法、div 除法、ops 四則。
      例：加法 1-1 小史萊姆多一個「勇者史萊姆」：
        'add|1-1':[{id:'add_1-1_hero',name:'勇者史萊姆',icon:'🦸',img:'./assets/skins/add-1-1-hero.png',price:600}],
      id 要全世界不重複；img 可以再加 filter（想在新圖上再套顏色）或 anim:'rainbow'。 */
window.HERO_PET_STYLES=[
 {id:'s_blue',icon:'💙',name:'藍色',price:200,filter:'hue-rotate(170deg) saturate(1.2)'},
 {id:'s_pink',icon:'💗',name:'粉紅色',price:200,filter:'hue-rotate(290deg) saturate(1.2)'},
 {id:'s_green',icon:'💚',name:'綠色',price:200,filter:'hue-rotate(80deg) saturate(1.2)'},
 {id:'s_dark',icon:'🖤',name:'暗影黑白',price:300,filter:'grayscale(1) contrast(1.15) brightness(.85)'},
 {id:'s_gold',icon:'💛',name:'黃金',price:400,filter:'hue-rotate(35deg) saturate(2) brightness(1.15) drop-shadow(0 0 6px #ffd24a)'},
 {id:'s_rainbow',icon:'🌈',name:'彩虹',price:600,filter:'saturate(1.4)',anim:'rainbow'}
];
/* 專屬樣貌由 hero-skin-library.js 的清單自動產生（也可在這裡手動補充）。 */
window.HERO_PET_SKINS=(function(){
 var o={};
 (window.HERO_SKIN_LIB||[]).forEach(function(r){
  var k=r[0],t=r[1];
  (o[k]=o[k]||[]).push({id:k.replace('|','_')+'_'+t,name:r[2],icon:r[3]||'🎭',price:+r[4]||0,
   img:'./assets/skins/'+k.replace('|','-')+'-'+t+'.png'});
 });
 return o;
})();
