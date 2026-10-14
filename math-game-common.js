/* ============================================================
   math-game-common.js — 數學科小遊戲共用模組
   給「乘法大挑戰」「找因數」「分數學習」「除法練習場」等獨立數學小遊戲共用，
   跟其他遊戲（塔防、ETP、看打、打字賽車、加法勇者）走同一套規則：

   1. 身分（登入學號）
      優先讀網址參數 ?student=學號（login.html 從首頁點進遊戲時會自動帶上，
      跟塔防/ETP/加法勇者的做法一致）；沒有網址參數才改讀 login.html 存的
      localStorage "keyagent_active_student"。

   2. 代幣（領代幣）
      GBit 代幣存在 localStorage "keyagent_save_v1:<學號>"，這是全部遊戲
      共用的同一份存檔。這裡只會增加 gbit / gbitEarnedLifetime 這兩個欄位，
      讀取時會先把整份存檔讀出來、只改這兩欄再存回去，所以不會動到寵物、
      塔防進度等其他遊戲已經存在的資料。

   3. 回傳練習結果
      每次「完成一次練習/挑戰」時呼叫 finishAttempt()，會自動：
        (a) 依答對率算出這次要發多少代幣、存進學生的存檔
        (b) 把這次的練習結果 POST 給伺服器 /submit-math-game，
            老師之後可以在 admin.html 查到（沿用跟英打測驗一樣的
            scores 資料表，category 會存成 "MATH-遊戲名稱"）
      就算是在家離線練習、連不到學校主機，代幣一樣會先存在這台裝置本機，
      只是伺服器端的紀錄要等連得到主機時才會有（跟其他遊戲目前的做法一致）。
      如果頁面也載入了 sync-client.js（跟「加法勇者」同一套），會自動順便排進
      雲端同步佇列，讓在家練習的紀錄之後也能同步回學校主機，不用另外處理。

   使用方式（在遊戲的 <script> 裡）：
     <script src="math-game-common.js"></script>
     ...
     MathGameCommon.renderIdentityBadge();  // 頁面載入時呼叫一次，右上角顯示登入狀態

     // 每次玩完一輪、確定分數之後呼叫：
     const result = await MathGameCommon.finishAttempt({
       game: '找因數',        // 遊戲名稱，會出現在老師端的紀錄裡
       mode: '練習',          // 可選：模式名稱（例如「初級」「進階」「闖關」）
       topic: '因數',         // 可選：這次練習的主題/關卡
       correct: 8,             // 答對題數
       total: 10,               // 總題數
       timeSec: 125             // 可選：花費秒數
     });
     // result.gbitAwarded → 這次拿到多少代幣
     // result.newBalance  → 目前代幣總數
   ============================================================ */
(function (global) {
  const ACTIVE_STUDENT_KEY = 'keyagent_active_student';

  // 💡 取得目前登入的學生身分。網址參數 ?student= 優先（老師分享單一遊戲連結、
  // 或從 login.html 首頁點進來都會帶這個參數）；如果剛好跟本機登入的是同一個學號，
  // 就直接沿用本機那份比較完整的資料（含姓名/班級/座號）。
  // 找不到網址參數、也讀不到 localStorage 時，最後才試著問 sync-client.js
  // 提供的 keyagentGetActiveStudentNumber()（如果這個頁面有載入 sync-client.js 的話）。
  function getActiveStudent() {
    const params = new URLSearchParams(window.location.search);
    const urlStudent = params.get('student');

    let stored = null;
    try {
      const raw = localStorage.getItem(ACTIVE_STUDENT_KEY);
      stored = raw ? JSON.parse(raw) : null;
    } catch (err) {
      stored = null;
    }

    if (urlStudent) {
      if (stored && String(stored.studentNumber) === String(urlStudent)) return stored;
      return { studentNumber: urlStudent, name: null, verified: false, className: null, seatNumber: null };
    }
    if (stored) return stored;

    if (typeof global.keyagentGetActiveStudentNumber === 'function') {
      const num = global.keyagentGetActiveStudentNumber();
      if (num) return { studentNumber: num, name: null, verified: false, className: null, seatNumber: null };
    }
    return null;
  }

  function saveKeyFor(studentNumber) {
    return studentNumber ? `keyagent_save_v1:${studentNumber}` : 'keyagent_save_v1';
  }

  function loadSave(studentNumber) {
    try {
      const raw = localStorage.getItem(saveKeyFor(studentNumber));
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }

  // 增加代幣：只讀寫 gbit / gbitEarnedLifetime 兩個欄位，其他既有資料完整保留。
  // 沒有登入身分（連學號都沒有）就不發代幣，回傳 0。
  function awardGbit(amount) {
    const student = getActiveStudent();
    if (!student || !student.studentNumber || !amount) {
      return (student && student.studentNumber) ? loadSave(student.studentNumber).gbit || 0 : 0;
    }
    const save = loadSave(student.studentNumber);
    save.gbit = (save.gbit || 0) + amount;
    save.gbitEarnedLifetime = (save.gbitEarnedLifetime || 0) + amount;
    localStorage.setItem(saveKeyFor(student.studentNumber), JSON.stringify(save));
    return save.gbit;
  }

  // 回傳練習結果給伺服器。連不到伺服器（例如在家離線）就靜靜失敗，不影響繼續玩遊戲。
  // 💡 如果這個頁面也載入了 sync-client.js（跟「加法勇者」一樣），會順便把這次紀錄
  // 排進雲端同步佇列並觸發一次同步，這樣在家練習的成果之後也能同步回學校主機；
  // 沒載入 sync-client.js 的話這兩步會自動跳過，不影響回傳伺服器這件事本身。
  async function reportResult({ game, mode, topic, correct, total, timeSec, gbitAwarded }) {
    const student = getActiveStudent();
    try {
      await fetch('/submit-math-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNumber: student ? student.studentNumber : null,
          game: game || '',
          mode: mode || '',
          topic: topic || '',
          correct: correct || 0,
          total: total || 0,
          timeSec: timeSec || 0,
          gbitAwarded: gbitAwarded || 0
        })
      });
    } catch (err) {
      console.warn('[數學遊戲] 成績回傳失敗（可能是離線練習，不影響繼續玩）：', err.message);
    }

    if (typeof global.keyagentQueuePendingAttempt === 'function') {
      global.keyagentQueuePendingAttempt(game || 'mathGame', {
        mode: mode || '', topic: topic || '', correct: correct || 0, total: total || 0,
        timeSec: timeSec || 0, tokensEarned: gbitAwarded || 0, attemptedAt: Date.now()
      });
    }
    if (typeof global.keyagentCloudSyncNow === 'function') {
      global.keyagentCloudSyncNow();
    }
  }

  // 💡 代幣發放公式（暫定）：滿分發 20 枚，依答對率等比例發放，例如 10 題對 7 題 → 14 枚。
  // 這是先抓一個合理預設值，如果 Eric 覺得代幣發太多/太少，之後再一起調整。
  function defaultGbitFormula(correct, total) {
    if (!total) return 0;
    return Math.max(0, Math.round((correct / total) * 20));
  }

  // 完成一次練習時呼叫這個：自動算代幣、存代幣、回傳伺服器，一次做完。
  async function finishAttempt({ game, mode, topic, correct, total, timeSec }) {
    const gbitAwarded = defaultGbitFormula(correct, total);
    const newBalance = awardGbit(gbitAwarded);
    await reportResult({ game, mode, topic, correct, total, timeSec, gbitAwarded });
    return { gbitAwarded, newBalance };
  }

  // 右上角小徽章：顯示目前是哪個學號在玩；沒登入的話提醒回登入首頁，
  // 避免學生沒登入就直接玩、練習成績沒被記錄卻不知道。
  // 💡 loginPath 預設是 "../login.html"（比照「加法勇者」放在 math/ 子資料夾底下的慣例，
  // 如果實際擺放位置不同，呼叫時可以傳第二個參數自行指定，例如
  // MathGameCommon.renderIdentityBadge('./login.html')
  function renderIdentityBadge(loginPath) {
    const student = getActiveStudent();
    const href = loginPath || '../login.html';
    const badge = document.createElement('div');
    badge.id = 'mg-identity-badge';
    badge.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;background:rgba(0,0,0,0.75);color:#fff;padding:6px 14px;border-radius:20px;font-size:13px;font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
    if (student && student.studentNumber) {
      badge.innerHTML = `👤 ${student.name || ('學號 ' + student.studentNumber)} ${student.verified ? '✅' : '（未核對身分）'}`;
    } else {
      badge.innerHTML = `⚠️ 尚未登入，練習成績不會被記錄　<a href="${href}" style="color:#8ecdf7;">回登入首頁</a>`;
    }
    document.body.appendChild(badge);
  }

  global.MathGameCommon = {
    getActiveStudent,
    awardGbit,
    reportResult,
    finishAttempt,
    defaultGbitFormula,
    renderIdentityBadge
  };
})(window);
