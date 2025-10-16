// ================================
// ハコジム トレーニング ロジック（全カード統一デザイン対応）
// ================================

(async () => {
  const JSON_URL = "https://raw.githubusercontent.com/hsato-ship-it/hacogym-training-data/main/training_data.json";
  const ui = window.HacoGymUI;

  async function loadData() {
    const res = await fetch(JSON_URL, { cache: "no-store" });
    return await res.json();
  }

  // --- 選択済み種目データの取得 ---
  const params = new URLSearchParams(location.search);
  const selectedIds = params.get("ids")
    ? params.get("ids").split(",")
    : JSON.parse(localStorage.getItem("selectedExercises") || "[]");

  if (!selectedIds.length) {
    alert("選択データがありません");
    location.href = "training_select";
    return;
  }

  // --- データ読み込み ---
  const data = await loadData();
  const { exercises = [], preparationAudios = [], restAudios = [], endAudios = [] } = data;
  const selectedData = selectedIds.map(id => exercises.find(x => x.id === id)).filter(Boolean);
  const container = document.getElementById("cardContainer");
  container.innerHTML = "";

  // ============================
  // 準備カード
  // ============================
  let prepAudio = null;
  if (preparationAudios.length) {
    const prep = preparationAudios[Math.floor(Math.random() * preparationAudios.length)];
    const c = document.createElement("div");
    c.className = "card prep-card";
    c.innerHTML = `
      <div class="card-title">準備</div>
      <p class="comment">${prep.comment}</p>
      <audio preload="auto"><source src="${prep.audio}" type="audio/wav"></audio>
    `;
    container.appendChild(c);
    prepAudio = c.querySelector("audio");
    prepAudio.play().catch(() => {});
  }

  // ============================
  // トレーニングカード + 休憩カード
  // ============================
  selectedData.forEach((ex, i) => {
    const c = document.createElement("div");
    c.className = "card train-card";
    c.innerHTML = `
      <div class="card-title">${ex.title}</div>
      <div class="video-wrapper">
        <img src="${ex.gif}" alt="${ex.title}" class="gif-motion">
      </div>
      <p class="standard">標準：${ex.standardReps}回 × ${ex.standardSets}セット</p>
      <p class="tips">${ex.tips}</p>
      <div class="record-inputs">
        <div class="record-label">実施記録入力：</div>
        <div class="record-rows"></div>
        <button class="add-set-btn">＋ 追加</button>
      </div>
      <audio preload="auto"><source src="${ex.audio}" type="audio/wav"></audio>
    `;
    const rows = c.querySelector(".record-rows");
    for (let s = 0; s < ex.standardSets; s++) {
      rows.appendChild(ui.createRecordRow(ex.standardReps));
    }
    c.querySelector(".add-set-btn").addEventListener("click", () => {
      rows.appendChild(ui.createRecordRow(""));
    });
    container.appendChild(c);

    // --- 休憩カード挿入 ---
    if (i < selectedData.length - 1 && restAudios.length > 0) {
      const r = restAudios[Math.floor(Math.random() * restAudios.length)];
      const restCard = document.createElement("div");
      restCard.className = "card rest-card";
      restCard.innerHTML = `
        <div class="card-title">休憩</div>
        <p class="comment">${r.comment}</p>
        <audio preload="auto"><source src="${r.audio}" type="audio/wav"></audio>
      `;
      container.appendChild(restCard);
    }
  });

  // ============================
  // 終了カード
  // ============================
  if (endAudios.length) {
    const e = endAudios[Math.floor(Math.random() * endAudios.length)];
    const endCard = document.createElement("div");
    endCard.className = "card end-card";
    endCard.innerHTML = `
      <div class="card-title">トレーニング終了</div>
      <p class="comment">${e.comment}</p>
      <audio preload="auto"><source src="${e.audio}" type="audio/wav"></audio>
    `;
    container.appendChild(endCard);
  }

  // ============================
  // オーディオ進行制御
  // ============================
  const audios = container.querySelectorAll("audio");
  const trainCards = container.querySelectorAll(".train-card");
  let doneCount = 0;
  ui.updateProgress(0, trainCards.length);

  audios.forEach((a, i) => {
    const card = a.closest(".card");
    a.addEventListener("play", () => {
      audios.forEach(x => x !== a && x.pause());
      ui.setActiveCard(card);
      ui.currentAudio = a;
    });
    a.addEventListener("ended", () => {
      if (card.classList.contains("prep-card")) return;
      if (card.classList.contains("train-card")) doneCount++;
      ui.updateProgress(doneCount, trainCards.length);
      const next = audios[i + 1];
      if (next) next.play();
      else ui.generateResults();
    });
  });

  // ============================
  // STARTボタン制御
  // ============================
  document.getElementById("startBtn").addEventListener("click", async () => {
    if (prepAudio) {
      prepAudio.pause();
      prepAudio.currentTime = 0;
    }
    await ui.enableWakeLock();
    const f = document.querySelector(".train-card audio");
    if (f) f.play().catch(() => {});
    const pc = document.getElementById("playerControls");
    pc.innerHTML = `
      <button id="togglePlayBtn">▶ 再生 / ⏸ 一時停止</button>
      <button id="endSessionBtn">🏁 終了</button>
    `;

    document.getElementById("togglePlayBtn").addEventListener("click", () => {
      if (!ui.currentAudio) return;
      if (ui.currentAudio.paused) ui.currentAudio.play();
      else ui.currentAudio.pause();
    });

    document.getElementById("endSessionBtn").addEventListener("click", () => {
      if (confirm("本当に終了しますか？")) {
        document.querySelectorAll("audio").forEach(a => {
          a.pause();
          a.currentTime = 0;
        });
        ui.generateResults();
      }
    });
  });

  // ============================
  // 成果コピー
  // ============================
  document.getElementById("copyResultBtn").addEventListener("click", async () => {
    const t = document.getElementById("resultText").textContent;
    await navigator.clipboard.writeText(t);
    const b = document.getElementById("copyResultBtn");
    b.textContent = "コピーしました！";
    setTimeout(() => (b.textContent = "本日の成果をコピー"), 1500);
  });

// ============================
// デバッグ用：バージョン表示
// ============================
const logicVersionTag = "training_logic.js v20251018a"; // ←手動で更新
console.log("✅ Loaded:", logicVersionTag);

// 既にバージョン表示エリアがあれば再利用、なければ作成
let vBox = document.getElementById("versionBox");
if (!vBox) {
  vBox = document.createElement("div");
  vBox.id = "versionBox";
  Object.assign(vBox.style, {
    position: "fixed",
    bottom: "4px",
    right: "6px",
    fontSize: "10px",
    color: "#888",
    background: "rgba(255,255,255,0.8)",
    padding: "3px 6px",
    borderRadius: "4px",
    zIndex: "9999",
    fontFamily: "monospace",
    lineHeight: "1.4",
    whiteSpace: "pre"
  });
  document.body.appendChild(vBox);
}

// training_logic.js の行を追加
vBox.textContent += (vBox.textContent ? "\n" : "") + logicVersionTag;


})();
