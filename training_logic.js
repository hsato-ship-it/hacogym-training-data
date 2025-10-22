// ================================
// HacoGym Training Logic Module
// ================================

window.HacoGymLogic = (() => {
  const logic = {};

  // -1- Vimeo APIを確実に読み込む ---
  function loadVimeoAPI(callback) {
    if (window.Vimeo) {
      callback();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://player.vimeo.com/api/player.js";
    script.onload = callback;
    document.head.appendChild(script);
  }

  // -2- Vimeoプレイヤー管理 ---
  const players = new Map();
  function initVimeoPlayers() {
    document.querySelectorAll("iframe").forEach((iframe) => {
      const id = iframe.getAttribute("id");
      if (!id) return;
      const player = new Vimeo.Player(iframe);
      players.set(id, player);
    });
  }

  // -3- オーディオ管理 ---
  const audios = [];
  function initAudios() {
    document.querySelectorAll("audio").forEach((a) => {
      audios.push(a);
    });
  }

  // -4- カード制御 ---
  let currentCardIndex = -1;
  const cards = () => Array.from(document.querySelectorAll(".card"));

  function showCard(index) {
    if (index < 0 || index >= cards().length) return;
    currentCardIndex = index;
    const card = cards()[index];
    window.HacoGymUI.setActiveCard(card);

    // Vimeo停止
    players.forEach((p) => p.pause().catch(() => {}));
    // Audio停止
    audios.forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });

    const vimeo = card.querySelector("iframe");
    if (vimeo) {
      const pid = vimeo.getAttribute("id");
      const player = players.get(pid);
      if (player) player.play().catch(() => {});
    }

    const audio = card.querySelector("audio");
    if (audio) audio.play().catch(() => {});

    window.HacoGymUI.updateProgress(index + 1, cards().length);
  }

  // -5- 次カード遷移 ---
  function nextCard() {
    if (currentCardIndex + 1 < cards().length) {
      showCard(currentCardIndex + 1);
    }
  }

  // -6- STARTボタン制御 ---
  function setupStartButton() {
    const startBtn = document.getElementById("startBtn");
    startBtn.addEventListener("click", () => {
      showCard(0);
    });
  }

  // -7- 自動遷移（音声／動画終了時）
  function setupAutoAdvance() {
    audios.forEach((a) => {
      a.addEventListener("ended", () => {
        const card = a.closest(".card");
        if (card && card.classList.contains("end-card")) {
          // ✅ 終了カード → 成果カードへ
          window.HacoGymUI.generateResults();
        } else {
          nextCard();
        }
      });
    });
  }

  // -8- 成果カード生成（修正版）
  const ui = window.HacoGymUI;
  const originalGenerateResults = ui.generateResults;
  ui.generateResults = function () {
    const exCards = document.querySelectorAll(".train-card");
    let result = "";

    exCards.forEach((card) => {
      const title = card.querySelector(".exercise-title")?.textContent || "種目";
      const rows = card.querySelectorAll(".record-row");
      let hasValid = false;
      let text = `${title}\n`;

      rows.forEach((r) => {
        const isBody = r.classList.contains("bodyweight-mode");
        let weight = r.querySelector(".w-input")?.value || "";
        let reps = r.querySelector(".r-input")?.value || "";

        if (isBody) {
          if (reps && reps !== "0") {
            text += `  自重 × ${reps}回\n`;
            hasValid = true;
          }
        } else if (weight && weight !== "0" && reps && reps !== "0") {
          text += `  ${weight}kg × ${reps}回\n`;
          hasValid = true;
        }
      });

      if (!hasValid) {
        text += "（記録なし）\n";
      }
      result += text + "\n";
    });

    document.getElementById("resultText").textContent = result.trim();
    document.getElementById("resultSection").style.display = "block";
    document.getElementById("resultSection").scrollIntoView({ behavior: "smooth" });

    // ✅ 成果カード表示後のホバーボタンは「メニューに戻る」のみ
    const pc = document.getElementById("playerControls");
    pc.innerHTML = `<button id="backToMenuBtn">🏠 メニューに戻る</button>`;
    document.getElementById("backToMenuBtn").addEventListener("click", () => {
      location.href = "training_select";
    });
  };

  // -9- 終了カード検出
  function setupEndCardDetection() {
    audios.forEach((a) => {
      const card = a.closest(".card");
      if (card && card.classList.contains("end-card")) {
        a.addEventListener("play", () => {
          const pc = document.getElementById("playerControls");
          pc.innerHTML = `<button id="showResultBtn">📄 成果カードを表示</button>`;
          document.getElementById("showResultBtn").addEventListener("click", () => {
            ui.generateResults();
          });
        });
        a.addEventListener("ended", () => {
          ui.generateResults();
        });
      }
    });
  }

  // -10- 初期化 ---
  logic.init = function () {
    loadVimeoAPI(() => {
      initVimeoPlayers();
      initAudios();
      setupStartButton();
      setupAutoAdvance();
      setupEndCardDetection();
      window.HacoGymUI.updateProgress(0, cards().length);
      window.HacoGymUI.enableWakeLock();
    });
  };

  return logic;
})();

document.addEventListener("DOMContentLoaded", () => {
  window.HacoGymLogic.init();
});
