// ================================
// ハコジム トレーニング ロジック
// ================================

(async () => {
  const JSON_URL = "https://raw.githubusercontent.com/hsato-ship-it/hacogym-training-data/main/training_data.json";
  const ui = window.HacoGymUI;

  async function loadData() {
    const res = await fetch(JSON_URL, { cache: "no-store" });
    return await res.json();
  }

  const params = new URLSearchParams(location.search);
  const selectedIds = params.get("ids")
    ? params.get("ids").split(",")
    : JSON.parse(localStorage.getItem("selectedExercises") || "[]");

  if (!selectedIds.length) {
    alert("選択データがありません");
    location.href = "training_select";
    return;
  }

  const data = await loadData();
  const { exercises = [], preparationAudios = [], restAudios = [], endAudios = [] } = data;
  const selectedData = selectedIds.map(id => exercises.find(x => x.id === id)).filter(Boolean);
  const container = document.getElementById("cardContainer");
  container.innerHTML = "";

  // --- 準備カード ---
  let prepAudio = null;
  if (preparationAudios.length) {
    const prep = preparationAudios[Math.floor(Math.random() * preparationAudios.length)];
    const c = document.createElement("div");
    c.className = "card prep-card";
    c.innerHTML = `<h3>準備</h3><p class="comment">${prep.comment}</p>
      <audio preload="auto"><source src="${prep.audio}" type="audio/wav"></audio>`;
    container.appendChild(c);
    prepAudio = c.querySelector("audio");
    prepAudio.play().catch(() => {});
  }

  // --- トレーニングカード + 休憩カード ---
  selectedData.forEach((ex, i) => {
    const c = document.createElement("div");
    c.className = "card train-card";
    c.innerHTML = `
      <div class="video-wrapper">
        <img src="${ex.gif}" alt="${ex.title}" class="gif-motion">
      </div>
      <h2>${ex.title}</h2>
      <p>標準：${ex.standardReps}回 × ${ex.standardSets}セット</p>
      <p>${ex.tips}</p>
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
    c.querySelector(".add-set-btn").addEventListener("click", () => rows.appendChild(ui.createRecordRow("")));
    container.appendChild(c);

    if (i < selectedData.length - 1 && restAudios.length > 0) {
      const r = restAudios[Math.floor(Math.random() * restAudios.length)];
      const restCard = document.createElement("div");
      restCard.className = "card rest-card";
      restCard.innerHTML = `<h3>休憩</h3><p class="comment">${r.comment}</p>
        <audio preload="auto"><source src="${r.audio}" type="audio/wav"></audio>`;
      container.appendChild(restCard);
    }
  });

  // --- 終了カード ---
  if (endAudios.length) {
    const e = endAudios[Math.floor(Math.random() * endAudios.length)];
    const endCard = document.createElement("div");
    endCard.className = "card end-card";
    endCard.innerHTML = `<h3>トレーニング終了</h3><p class="comment">${e.comment}</p>
      <audio preload="auto"><source src="${e.audio}" type="audio/wav"></audio>`;
    container.appendChild(endCard);
  }

  // --- オーディオイベント設定 ---
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

  // --- ホバー START! ボタン ---
  document.getElementById("startBtn
