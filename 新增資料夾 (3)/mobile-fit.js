/* ============================================================
   mobile-fit.js — 讓遊戲畫面在手機上自動縮小成「滿版」顯示，
   不會因為螢幕太小、太窄、太短而被裁切掉。

   問題背景：這些遊戲原本是照電腦螢幕的尺寸設計的（例如卡片寬
   600px、遊戲畫布 1280x720…）。手機螢幕又小又窄，如果畫面本身
   又設定了「滿版鎖死＋超出隱藏」（height:100vh + overflow:hidden），
   內容一旦比手機螢幕高，下面就會直接被切掉看不到，而不是自動縮小。

   解決做法：把整個遊戲內容包進一個 <div id="mg-fit-stage">，
   量出它「原本設計」該有多大（不受目前螢幕大小影響的真實尺寸），
   再跟手機目前的螢幕寬高比較，抓寬跟高兩個縮放倍率中比較小的
   那一個（確保寬、高都塞得進螢幕），用 CSS transform: scale()
   把整個畫面等比例縮小、置中顯示。縮小後如果某一邊比螢幕還小，
   會留一點空白（黑邊／背景色），但絕對不會裁切掉任何內容。

   使用方式（每個遊戲檔案裡）：
     1. 把原本畫面的「主要內容」包進
        <div id="mg-fit-stage"> ... </div>
        （背景裝飾、固定在角落的小標籤等不影響版面判讀的元素
        可以留在外面不用包）
     2. 在 </body> 前加一行：<script src="mobile-fit.js"></script>
     3. 不用呼叫任何函式，頁面載入完成、視窗大小改變、手機
        轉方向時都會自動重新計算縮放。

   注意：如果「主要內容」本身的 CSS 裡有用到 vh / vw（例如
   height:100vh、width:100vw）這類「跟著目前螢幕大小變動」的
   單位，會讓這支程式量不到「原本設計的真實尺寸」（量到的永遠
   等於目前螢幕大小，等於沒縮放）。用這支程式的遊戲，包進
   #mg-fit-stage 的主要內容要盡量改成固定尺寸（px）或是內容自然
   撐開的大小，讓 vh/vw 只留在 <body> 本身的置中設定上就好。
   ============================================================ */
(function () {
  function fit() {
    var stage = document.getElementById('mg-fit-stage');
    if (!stage) return;

    // 先把縮放還原成原始大小，才能正確量出「原本設計」的寬高
    stage.style.transform = 'none';
    var naturalWidth = stage.offsetWidth;
    var naturalHeight = stage.offsetHeight;
    if (!naturalWidth || !naturalHeight) return;

    var scaleX = window.innerWidth / naturalWidth;
    var scaleY = window.innerHeight / naturalHeight;
    var scale = Math.min(scaleX, scaleY);

    stage.style.transform = 'scale(' + scale + ')';
  }

  function init() {
    var stage = document.getElementById('mg-fit-stage');
    if (!stage) return;

    // 讓外層變成滿版容器，遊戲本體置中顯示，多出來的空間留白，不會捲動也不會裁切
    document.documentElement.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.display = 'flex';
    document.body.style.alignItems = 'center';
    document.body.style.justifyContent = 'center';

    stage.style.transformOrigin = 'center center';
    stage.style.flexShrink = '0';

    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', function () {
      setTimeout(fit, 250); // 手機轉方向時尺寸資訊會晚一點才更新，延遲一下再量才準
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
