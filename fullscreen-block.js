// ================= 自動全螢幕（電腦＋手機）=================
// 為什麼手機以前進不了全螢幕：手機瀏覽器不承認「pointerdown（手指按下去）」是使用者操作，
// 一定要 click（點擊）／touchend／pointerup（手指放開）才行；而且舊版只試一次，失敗就放棄。
// 現在：用這幾種事件去要求全螢幕；第一次沒成功，下次點擊再試（最多 5 次）。
// 成功進入後，如果玩家自己按 Esc／返回離開，這次不會再強制進入。
// 另外手機右側邊緣有一個小小的「⛶」把手，隨時可以手動進全螢幕（不會擋住遊戲畫面）；
// 【重要】遊戲被放進勇者小屋（hero-hub.html）的 iframe 裡時，全螢幕一律交給「勇者小屋」那一層去做：
//   如果讓 iframe 自己全螢幕，勇者小屋的「回勇者小屋」按鈕就會被蓋住看不到，所以內嵌時只傳訊息請上層處理。
// iPhone（或 LINE、Facebook 內建瀏覽器）沒有全螢幕功能，按鈕會告訴玩家改用「加入主畫面」或換瀏覽器。
(function () {
    var de = document.documentElement;
    function isFs() { return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement; }
    function fsFn() { return de.requestFullscreen || de.webkitRequestFullscreen || de.msRequestFullscreen; }
    function standalone() {
        return window.navigator.standalone === true ||
            (window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches));
    }
    var touch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
    var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var tries = 0, done = false, last = 0, btn = null;
    var embed = false; try { embed = window.parent !== window; } catch (e) { embed = true; }
    window.HERO_EMBED = embed;

    // 畫面高度：用「真正看得到的高度」，不要用 100vh（手機的 100vh 會把網址列底下的區域也算進去，畫面底部會被切掉）
    function setH() {
        var h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        de.style.setProperty('--app-h', h + 'px');
    }
    function syncBtn() { if (btn) btn.style.display = (!embed && touch && !isFs() && !standalone()) ? 'flex' : 'none'; }
    function lockLandscape(on) {
        try {
            if (!screen.orientation) return;
            if (on) { var p = screen.orientation.lock('landscape'); if (p && p.catch) p.catch(function () {}); }
            else if (screen.orientation.unlock) screen.orientation.unlock();
        } catch (e) {}
    }
    function goFs() {
        if (embed) { try { window.parent.postMessage({ hero: 'fs' }, '*'); } catch (e) {} return true; }
        if (isFs()) return true;
        var fn = fsFn(); if (!fn) return false;
        try {
            var r;
            try { r = fn.call(de, { navigationUI: 'hide' }); } catch (e1) { r = fn.call(de); }
            if (r && r.then) r.then(function () { done = true; lockLandscape(true); }, function () {});
            else done = true;
        } catch (e) {}
        return true;
    }
    function auto(e) {
        if (done || isFs() || tries >= (embed ? 3 : 5)) return;
        if (e.type === 'keydown' && e.key === 'Escape') return;
        var now = Date.now(); if (now - last < 400) return;   // 同一次點擊會連續觸發好幾種事件，只算一次
        last = now; tries++; goFs();
    }
    ['click', 'touchend', 'pointerup', 'keydown'].forEach(function (t) { document.addEventListener(t, auto, true); });

    function tip() {
        var o = document.createElement('div');
        o.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.82);z-index:2147483001;display:flex;align-items:center;justify-content:center;padding:16px';
        var msg = isIOS
            ? '<b style="font-size:18px">📱 想要全螢幕（沒有網址列）？</b><br>iPhone 的瀏覽器不能直接切換全螢幕，請這樣做：<br>1. 點瀏覽器的「分享」鈕 ⬆️<br>2. 選「加入主畫面」<br>3. 之後從主畫面的圖示開啟遊戲，就是全螢幕了。'
            : '<b style="font-size:18px">📱 這個瀏覽器不支援全螢幕</b><br>如果你是從 LINE、Facebook 之類的 App 裡開啟，請點右上角「⋯」選「用瀏覽器開啟」，或直接改用 Chrome 開啟，就可以全螢幕。';
        o.innerHTML = '<div style="background:#fff;color:#222;border-radius:14px;padding:18px 20px;max-width:420px;font:16px/1.7 sans-serif;text-align:left">' + msg +
            '<div style="text-align:center;margin-top:12px"><span style="display:inline-block;background:#2c3e50;color:#fff;border-radius:10px;padding:8px 28px">知道了</span></div></div>';
        o.addEventListener('click', function () { if (o.parentNode) o.parentNode.removeChild(o); });
        document.body.appendChild(o);
    }
    function makeBtn() {
        btn = document.createElement('button');
        btn.id = 'fs-fab'; btn.type = 'button'; btn.textContent = '⛶'; btn.title = '全螢幕'; btn.setAttribute('aria-label', '全螢幕');
        // 貼在右側邊緣的小把手（只露出一小截），不佔畫面
        btn.style.cssText = 'position:fixed;right:0;top:42%;width:26px;height:52px;border-radius:26px 0 0 26px;border:2px solid rgba(255,255,255,.6);border-right:0;' +
            'background:rgba(0,0,0,.5);color:#fff;font-size:17px;line-height:1;padding:0 0 0 2px;margin:0;z-index:2147483000;display:none;' +
            'align-items:center;justify-content:center;opacity:.6;box-shadow:none;transform:none;touch-action:manipulation;cursor:pointer';
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (fsFn()) { tries = 0; done = false; last = Date.now(); goFs(); } else tip();
        });
        document.body.appendChild(btn); syncBtn();
    }
    function onFsChange() {
        setH(); syncBtn();
        if (!isFs()) lockLandscape(false);
        // 進入／離開全螢幕後，通知遊戲重新計算畫面大小（遊戲是依「可視大小」縮放的）
        setTimeout(function () { setH(); try { window.dispatchEvent(new Event('resize')); } catch (e) {} }, 250);
    }
    if (!embed) {
        window.addEventListener('message', function (e) {
            if (e.origin !== location.origin && location.origin !== 'null') return;
            if (e.data && e.data.hero === 'fs' && !isFs() && !standalone()) goFs();
        });
    }
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (t) { document.addEventListener(t, onFsChange); });
    ['resize', 'orientationchange'].forEach(function (t) { window.addEventListener(t, function () { setH(); setTimeout(setH, 300); }); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', setH);
    setH();
    if (document.body) makeBtn(); else document.addEventListener('DOMContentLoaded', makeBtn);
})();
