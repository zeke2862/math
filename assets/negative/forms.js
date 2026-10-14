// ============================================================
//  負數勇者｜外觀圖片設定（選用）
//  沒有這個檔案、或這裡是空的，遊戲會用內建的畫面效果代替，一樣能玩。
//
//  ◆ 勇者型態：答對的答案是「負數」→ 骷髏型態；「正數」→ 原本的勇者。
//    骷髏型態會隨著解鎖越來越完整（等級 0～7）：
//      0＝還沒解鎖任何部位　1＝骨頭左手　2＝＋骨頭右手　3＝＋骷髏雙腿（完整骷髏外殼）
//      4＝＋第二大關的暗黑裝備　5＝＋第三大關的小惡魔精靈　6＝＋第四大關強化　7＝完美至尊雕像
//    把圖片放進 assets/negative/ 資料夾，再照下面的格式登記就會自動換上。
//    每個狀態：idle（待機，png）、attack（攻擊）、hurt（受傷）、lose（倒下），後三個用 gif。
//    如果某個等級沒有登記，會自動用「比它低、最近的等級」的圖。
//
//  ◆ 每一關自己的背景與怪物圖（選用）：用關卡編號（0～18，6-1-1 是 0，6-5-3 是 18）。
//
//  範例（把前面的 // 拿掉就會生效）：
//  window.NEG_FORMS = {
//    skel: {
//      3: { idle:'assets/negative/skel-3-idle.png', attack:'assets/negative/skel-3-attack.gif',
//           hurt:'assets/negative/skel-3-hurt.gif', lose:'assets/negative/skel-3-lose.gif' },
//      5: { idle:'assets/negative/skel-5-idle.png' }
//    },
//    hero: {
//      5: { idle:'assets/negative/hero-5-idle.png' }
//    },
//    bg:   { 0:'assets/negative/bg-0.jpg' },
//    boss: { 0:'assets/negative/boss-0.png' }
//  };
// ============================================================
window.NEG_FORMS = window.NEG_FORMS || {};
