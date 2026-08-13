/* ============================================================
   math-game-audio.js — 數學遊戲共用「音效／背景音樂」引擎
   跟「加法勇者」用同一套做法：
     - 背景音樂：每個「大關卡」對應一首曲子。切換畫面時如果還在
       同一個大關卡，音樂不會重新播放（不會卡一下、不會從頭開始），
       只有真的換到不同大關卡才會切換曲目，聽起來才會有連續感。
     - 音效：按鈕點擊、答對、答錯、過關、失敗…等短音效。如果還沒
       有真正的音效檔案，會自動用瀏覽器內建的音訊功能合成一個簡單
       的「嗶」聲頂著用（答對/答錯/點擊音調不同，可以分辨），
       之後有真正的音效檔案時，直接在每個遊戲的 SFX_MAP 裡填上
       檔名就會改用真正的檔案，不用改這支程式。

   ------------------------------------------------------------
   Eric 要怎麼換音樂／音效檔案？（不用動到遊戲邏輯的程式碼）
   ------------------------------------------------------------
   1. 準備音樂/音效檔案（建議用 .mp3，檔案小、相容性好），放進跟
      遊戲 html 檔案同一層的 "audio" 資料夾裡，例如：
        math/audio/bgm-easy.mp3
        math/audio/sfx-correct.mp3

   2. 打開對應的遊戲 html 檔案，開頭附近會看到這樣的設定區塊：

        const MUSIC_MAP = {
          easy:   "./audio/bgm-easy.mp3",
          medium: "./audio/bgm-easy.mp3",   // 目前先跟初級共用同一首
          hard:   "./audio/bgm-easy.mp3",
        };

        const SFX_MAP = {
          // correct: "./audio/sfx-correct.mp3",
          // wrong:   "./audio/sfx-wrong.mp3",
        };

      MUSIC_MAP／SFX_MAP 左邊的名字（easy/medium/hard、
      correct/wrong…）不要更改，那是程式拿來判斷「現在該放哪一首」
      用的固定代號；只要把右邊的路徑換成你自己的檔名即可。

   3. SFX_MAP 沒有列出來、或是被 // 註解掉的項目，會自動使用合成的
      嗶聲頂著，不會出錯，之後想換成真的音效檔，把那一行的 //
      拿掉、填上檔名路徑就好。

   4. 存檔、重新整理網頁就會套用新的音樂/音效，不需要改其他地方的
      程式碼。
   ============================================================ */
(function (global) {
  // ---------------- 背景音樂 ----------------
  const bgmAudio = new Audio();
  bgmAudio.loop = true;
  bgmAudio.volume = 0.45;
  let currentBgmKey = null;
  let currentMusicMap = {};

  // 設定這個遊戲的「大關卡 → 音樂」對照表，每個遊戲載入時呼叫一次。
  function setMusicMap(map) {
    currentMusicMap = map || {};
  }

  // 播放某個「大關卡」的背景音樂。傳進來的 key 如果跟目前正在播的
  // 一樣，就完全不動作（維持連續感，不會重新播放）；key 真的變了
  // 才會切換曲目。
  function playBgm(key) {
    const src = currentMusicMap[key];
    if (!src) return;
    if (currentBgmKey !== key) {
      bgmAudio.src = src;
      currentBgmKey = key;
    }
    // 瀏覽器的自動播放限制：一定要在使用者操作（點擊）之後呼叫才
    // 會真的出聲，從按鈕/關卡選擇的點擊事件裡呼叫就沒問題；萬一被
    // 瀏覽器擋下來，安靜失敗就好，不影響遊戲繼續玩。
    bgmAudio.play().catch(() => {});
  }

  function stopBgm() {
    bgmAudio.pause();
    currentBgmKey = null;
  }

  function setBgmVolume(v) {
    bgmAudio.volume = v;
  }

  // ---------------- 音效 ----------------
  let sfxMap = {};
  let sfxAudioCtx = null;

  function setSfxMap(map) {
    sfxMap = map || {};
  }

  // 內建合成音效（沒有設定真正音效檔時使用）：不同名稱給不同音調，
  // 簡單分辨「答對／答錯／點擊／過關／失敗」。
  const SYNTH_DEFAULTS = {
    correct: { type: 'square', freq: 1046, duration: 0.15 },
    wrong: { type: 'sawtooth', freq: 180, duration: 0.25 },
    click: { type: 'square', freq: 880, duration: 0.12 },
    win: { type: 'square', freq: 1318, duration: 0.3 },
    lose: { type: 'sawtooth', freq: 130, duration: 0.4 }
  };

  function playSynth(name) {
    const cfg = SYNTH_DEFAULTS[name] || SYNTH_DEFAULTS.click;
    try {
      sfxAudioCtx = sfxAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = sfxAudioCtx.createOscillator();
      const gain = sfxAudioCtx.createGain();
      osc.type = cfg.type;
      osc.frequency.value = cfg.freq;
      gain.gain.setValueAtTime(0.15, sfxAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, sfxAudioCtx.currentTime + cfg.duration);
      osc.connect(gain).connect(sfxAudioCtx.destination);
      osc.start();
      osc.stop(sfxAudioCtx.currentTime + cfg.duration);
    } catch (e) { /* 舊瀏覽器沒有 Web Audio API 就安靜跳過 */ }
  }

  // 播放音效：SFX_MAP 裡有設定真正檔案就播檔案，沒有的話用合成音效頂著。
  function playSfx(name) {
    const src = sfxMap[name];
    if (src) {
      try {
        const a = new Audio(src);
        a.volume = 0.6;
        a.play().catch(() => {});
      } catch (e) { /* ignore */ }
    } else {
      playSynth(name);
    }
  }

  // 幫整頁的按鈕統一綁點擊音效，遊戲不用自己每個按鈕加事件。
  function bindClickSfx(selector) {
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest(selector || 'button')) playSfx('click');
    }, true);
  }

  global.MathGameAudio = {
    setMusicMap, playBgm, stopBgm, setBgmVolume,
    setSfxMap, playSfx, bindClickSfx
  };
})(window);
