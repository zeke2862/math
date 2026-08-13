/* ============================================================
   math-game-fx.js — 數學遊戲共用「視覺特效」模組
   跟 math-game-audio.js 是同一類的共用工具：不用自己刻動畫，
   呼叫這裡的函式就能在遊戲畫面上加特效。全部用純 CSS/DOM
   做動畫，不需要額外的圖片或函式庫。

   提供的效果：
     - MathGameFX.burst(x, y, opts)      在畫面某個座標噴出彩色粒子（答對用）
     - MathGameFX.shake(el)              讓元素左右震動一下（答錯用）
     - MathGameFX.flash(el, color)       讓元素快速閃一下顏色（答對/答錯都可用）
     - MathGameFX.confetti(container)    整個容器灑滿五彩紙花（過關/完成用）
     - MathGameFX.floatStars(container)  在容器裡放一層緩慢飄動的星星背景裝飾
     - MathGameFX.popText(x, y, text, container, color) 冒出一段會往上飄走淡出的文字（例如 "+100"）

   x, y 是相對於畫面（viewport）的座標，通常從一個元素的
   getBoundingClientRect() 算出來就可以直接用。

   使用方式：
     <script src="math-game-fx.js"></script>
     ...
     const rect = document.getElementById('runner').getBoundingClientRect();
     MathGameFX.burst(rect.left + rect.width/2, rect.top + rect.height/2);
     MathGameFX.shake(document.getElementById('game-container'));
   ============================================================ */
(function (global) {
  function el(tag, style) {
    const e = document.createElement(tag);
    if (style) Object.assign(e.style, style);
    return e;
  }

  // 確保有一層蓋在最上面、不擋點擊的特效專用畫布容器
  let fxLayer = null;
  function getFxLayer() {
    if (fxLayer && document.body.contains(fxLayer)) return fxLayer;
    fxLayer = el('div', {
      position: 'fixed', left: 0, top: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 99999, overflow: 'hidden'
    });
    document.body.appendChild(fxLayer);
    return fxLayer;
  }

  // ---------------- 答對粒子噴發 ----------------
  function burst(x, y, opts) {
    opts = opts || {};
    const count = opts.count || 16;
    const colors = opts.colors || ['#ffd700', '#00f3ff', '#ff66cc', '#7bff5c', '#ff9d00'];
    const layer = getFxLayer();
    for (let i = 0; i < count; i++) {
      const p = el('div', {
        position: 'absolute', left: x + 'px', top: y + 'px',
        width: '8px', height: '8px', borderRadius: '50%',
        background: colors[i % colors.length],
        boxShadow: '0 0 6px ' + colors[i % colors.length],
        transition: 'transform 0.7s cubic-bezier(.2,.8,.3,1), opacity 0.7s ease-out'
      });
      layer.appendChild(p);
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const dist = 40 + Math.random() * 70;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      requestAnimationFrame(() => {
        p.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`;
        p.style.opacity = '0';
      });
      setTimeout(() => p.remove(), 750);
    }
  }

  // ---------------- 震動效果（答錯）----------------
  function shake(target) {
    if (!target) return;
    target.style.animation = 'none';
    // 觸發 reflow 讓同名動畫可以重複播放
    void target.offsetWidth;
    target.style.animation = 'mgfx-shake 0.4s';
  }

  // ---------------- 閃色效果 ----------------
  function flash(target, color) {
    if (!target) return;
    const prevOutline = target.style.boxShadow;
    target.style.transition = 'box-shadow 0.15s';
    target.style.boxShadow = `0 0 30px 8px ${color || '#fff'}`;
    setTimeout(() => { target.style.boxShadow = prevOutline; }, 250);
  }

  // ---------------- 飄浮文字（例如 +100） ----------------
  function popText(x, y, text, container, color) {
    const layer = container ? null : getFxLayer();
    const parent = container || layer;
    const t = el('div', {
      position: container ? 'absolute' : 'fixed',
      left: x + 'px', top: y + 'px',
      color: color || '#ffd700',
      fontWeight: 'bold', fontSize: '1.3rem',
      textShadow: '0 0 6px rgba(0,0,0,0.6)',
      pointerEvents: 'none', zIndex: 99999,
      transition: 'transform 1s ease-out, opacity 1s ease-out'
    });
    t.innerText = text;
    parent.appendChild(t);
    requestAnimationFrame(() => {
      t.style.transform = 'translateY(-60px)';
      t.style.opacity = '0';
    });
    setTimeout(() => t.remove(), 1050);
  }

  // ---------------- 五彩紙花（過關/完成） ----------------
  function confetti(container, opts) {
    opts = opts || {};
    const count = opts.count || 60;
    const colors = opts.colors || ['#ffd700', '#00f3ff', '#ff66cc', '#7bff5c', '#ff4d4d', '#a06bff'];
    const useFixed = !container;
    const parent = container || getFxLayer();
    const width = container ? container.clientWidth : window.innerWidth;

    for (let i = 0; i < count; i++) {
      const size = 6 + Math.random() * 6;
      const startX = Math.random() * width;
      const c = el('div', {
        position: useFixed ? 'fixed' : 'absolute',
        left: startX + 'px', top: '-20px',
        width: size + 'px', height: size * 0.6 + 'px',
        background: colors[i % colors.length],
        opacity: '0.95',
        transform: `rotate(${Math.random() * 360}deg)`,
        transition: `transform ${1.2 + Math.random()}s ease-in, top ${1.2 + Math.random()}s cubic-bezier(.3,.6,.7,1), opacity 0.4s ease-in ${0.8 + Math.random() * 0.6}s`
      });
      parent.appendChild(c);
      const fallTo = (container ? container.clientHeight : window.innerHeight) + 40;
      const drift = (Math.random() - 0.5) * 160;
      requestAnimationFrame(() => {
        c.style.top = fallTo + 'px';
        c.style.transform = `translateX(${drift}px) rotate(${Math.random() * 720}deg)`;
        c.style.opacity = '0';
      });
      setTimeout(() => c.remove(), 2400);
    }
  }

  // ---------------- 緩慢飄動的星星背景裝飾 ----------------
  function floatStars(container, count) {
    if (!container) return;
    const layer = el('div', {
      position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0, overflow: 'hidden'
    });
    container.insertBefore(layer, container.firstChild);
    const n = count || 30;
    for (let i = 0; i < n; i++) {
      const size = 1 + Math.random() * 2.5;
      const s = el('div', {
        position: 'absolute',
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        width: size + 'px', height: size + 'px',
        borderRadius: '50%',
        background: '#fff',
        opacity: String(0.2 + Math.random() * 0.6),
        animation: `mgfx-twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
        animationDelay: (Math.random() * 3) + 's'
      });
      layer.appendChild(s);
    }
  }

  // 注入共用的 keyframes（只注入一次）
  function injectStyles() {
    if (document.getElementById('mgfx-styles')) return;
    const style = el('style');
    style.id = 'mgfx-styles';
    style.textContent = `
      @keyframes mgfx-shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-10px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-6px); }
        80% { transform: translateX(4px); }
      }
      @keyframes mgfx-twinkle {
        0%, 100% { opacity: 0.2; transform: scale(1); }
        50% { opacity: 0.9; transform: scale(1.4); }
      }
      @keyframes mgfx-pop-in {
        0% { transform: scale(0.5); opacity: 0; }
        60% { transform: scale(1.08); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .mgfx-pop-in { animation: mgfx-pop-in 0.35s cubic-bezier(.2,.8,.3,1); }
      @keyframes mgfx-bounce-btn {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      .mgfx-bounce:hover { animation: mgfx-bounce-btn 0.5s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
  }
  injectStyles();

  global.MathGameFX = { burst, shake, flash, popText, confetti, floatStars };
})(window);
