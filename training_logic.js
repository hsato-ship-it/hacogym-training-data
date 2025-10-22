// ================================
// ハコジム トレーニング ロジック（イベント駆動版）
// ================================
(async () => {
  const DEBUG = true;
  const log = (...args) => DEBUG && console.log("🎯[Logic]", ...args);

  const JSON_URL =
    "https://raw.githubusercontent.com/hsato-ship-it/hacogym-training-data/main/training_data.json";
  const ui = window.HacoGymUI;
  if (!ui) {
    console.error("❌ HacoGymUI not loaded yet");
    alert("UIモジュールの読み込みに失敗しました。ページを再読み込みしてください。");
    return;
  }

  // -1- Vimeo APIを確実に読み込む ---
  async function ensureVimeoAPI() {
    if (window.Vimeo && window.Vimeo.Player) {
      log("🎯 Vimeo API already present");
      return;
    }
    log("🎯 Loading Vimeo API...");
    await new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://player.vimeo.com/api/player.js";
      s.onload = () => { log("🎯 Vimeo API loaded"); resolve(); };
      s.onerror = () => { console.error("❌ Vimeo API load failed"); resolve(); };
      document.head.appendChild(s);
    });
  }

  // -2- データロード ---
  async function loadData() {
    const res = await fetch(JSON_URL, { cache: "no-store" });
    log("📥 Fetching training_data.json...");
    const json = await res.json();
    log("✅ Data loaded:", json);
    return json;
  }

  // -3- 選択データの取得 ---
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
  await ensureVimeoAPI();

  const { exercises = [], preparationAudios = [], restAudios = [], endAudios = [] } = data;
  const selectedData = selectedIds.map(id => exercises.find(x => x.id === id)).filter(Boolean);
  const container = document.getElementById("cardContainer");
  container.innerHTML = "";
  log("🧩 Selected exercises:", selectedData);

  // -4- Vimeoプレイヤー管理 ---
  const vimeoPlayers = new Map();

  function initVimeoPlayer(iframe) {
    if (!iframe || !window.Vimeo) return null;
    try {
      log("🔧 init vimeo:", "#" + iframe.id);
      const player = new Vimeo.Player(iframe);
      vimeoPlayers.set(iframe, player);
      player.setLoop(true);
      player.setMuted(true);
      player.setAutopause(false);

      player.ready().then(() => {
        log("✅ vimeo ready:", "#" + iframe.id);
        player.play().catch(() => log("⚠️ autoplay blocked on ready"));
      });

      return player;
    } catch (e) {
      log("⚠️ Vimeo Player初期化失敗:", e);
      return null;
    }
  }

  function playVimeoInCard(card) {
    const iframe = card.querySelector("iframe");
    if (!iframe) return;
    let player = vimeoPlayers.get(iframe);
    if (!player) player = initVimeoPlayer(iframe);
    if (player) player.play().catch(() => log("⚠️ Vimeo再生ブロック:", iframe.src));
  }

  // -5- カード生成 ---
  // 準備カード：音声は存在すれば置くが、STARTの挙動には影響させない（ループ禁止）
  let prepAudio = null;
  if (preparationAudios.length) {
    const prep = preparationAudios[Math.floor(Math.random() * preparationAudios.length)];
    const c = document.createElement("div");
    c.className = "card prep-card";
    c.innerHTML = `
      <div class="exercise-header blue-header">
        <div class="exercise-title">準備</div>
      </div>
      <p class="comment">${prep.comment}</p>
      <audio preload="auto"><source src="${prep.audio}" type="audio/wav"></audio>
    `;
    container.appendChild(c);
    prepAudio = c.querySelector("audio");
    if (prepAudio) prepAudio.loop = false; // ✅ ループ禁止
    log("🎧 Prep audio:", prep.audio);

    // 可能ならロード後に自動再生を試みる（失敗しても無視）
    window.addEventListener("load", () => {
      prepAudio?.play().catch(() => log("⚠️ 準備音声 自動再生ブロック（STARTには影響しません）"));
    });
  }

  // トレーニングカード＋休憩カード＋終了カード 生成
  selectedData.forEach((ex, i) => {
    const c = document.createElement("div");
    c.className = "card train-card";
    const iframeId = `vimeo-player-${i}`;

    c.innerHTML = `
      <div class="exercise-header red-header">
        <div class="exercise-title">${ex.title}</div>
      </div>
      <div class="video-wrapper">
        <iframe
          id="${iframeId}"
          src="${ex.video}&loop=1&muted=1&controls=0&title=0&byline=0&portrait=0"
          frameborder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerpolicy="strict-origin-when-cross-origin"
          title="${ex.title}">
        </iframe>
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
      rows.appendChild(ui.createRecordRow(ex.standardReps, s === 0));
    }
    c.querySelector(".add-set-btn").addEventListener("click", () => {
      rows.appendChild(ui.createRecordRow("", false));
    });

    container.appendChild(c);
    initVimeoPlayer(c.querySelector("iframe"));

    if (i < selectedData.length - 1 && restAudios.length > 0) {
      const r = restAudios[Math.floor(Math.random() * restAudios.length)];
      const restCard = document.createElement("div");
      restCard.className = "card rest-card";
      restCard.innerHTML = `
        <div class="exercise-header blue-header">
          <div class="exercise-title">休憩</div>
        </div>
        <p class="comment">${r.comment}</p>
        <audio preload="auto"><source src="${r.audio}" type="audio/wav"></audio>
      `;
      container.appendChild(restCard);
    }
  });

  if (endAudios.length) {
    const e = endAudios[Math.floor(Math.random() * endAudios.length)];
    const endCard = document.createElement("div");
    endCard.className = "card end-card";
    endCard.innerHTML = `
      <div class="exercise-header blue-header">
        <div class="exercise-title">トレーニング終了</div>
      </div>
      <p class="comment">${e.comment}</p>
      <audio preload="auto"><source src="${e.audio}" type="audio/wav"></audio>
    `;
    container.appendChild(endCard);
  }

  // -6- 進行制御（イベント駆動化） ---
  // 進行に使う音声は「トレーニング／休憩／終了」だけ。準備音声は含めない！
  const trainFlowAudios = Array.from(container.querySelectorAll(".train-card audio, .rest-card audio, .end-card audio"));
  const trainCards = container.querySelectorAll(".train-card");
  let currentIndex = -1;
  ui.updateProgress(0, trainCards.length);

  function goNext() {
    currentIndex++;
    const a = trainFlowAudios[currentIndex];
    if (!a) {
      window.dispatchEvent(new Event("flow:end"));
      return;
    }
    const card = a.closest(".card");
    ui.setActiveCard(card);
    playVimeoInCard(card);
    a.play().catch(()=>log("⚠️ audio再生失敗"));
  }

  window.addEventListener("flow:start", () => {
    log("🚀 flow:start");
    // 準備音声が鳴っていても中断して本編へ
    if (prepAudio) { try { prepAudio.pause(); prepAudio.currentTime = 0; } catch(_){} }
    currentIndex = -1; // 必ず最初のトレーニングから
    goNext();
  });

  window.addEventListener("flow:next", () => {
    log("➡ flow:next");
    goNext();
  });

  window.addEventListener("flow:end", () => {
    log("🏁 flow:end");
    ui.generateResults();
  });

  // 音声終了で自動的に次へ（準備カードは含まれていない）
  trainFlowAudios.forEach((a, i) => {
    a.addEventListener("ended", () => {
      // トレーニングカードの終了数で進捗を更新
      const card = a.closest(".card");
      if (card?.classList.contains("train-card")) {
        // i は train/rest/end 混在インデックスなので、done数は別計上
        const done = Array.from(trainFlowAudios)
          .slice(0, i + 1)
          .filter(x => x.closest(".card")?.classList.contains("train-card")).length;
        ui.updateProgress(done, trainCards.length);
      }
      window.dispatchEvent(new Event("flow:next"));
    });

    a.addEventListener("play", () => {
      trainFlowAudios.forEach(x => x !== a && x.pause());
      ui.currentAudio = a;
    });
  });

  // -7- コントロールバーと操作 ---
  document.getElementById("startBtn").addEventListener("click", async () => {
    await ui.enableWakeLock();
    window.dispatchEvent(new Event("flow:start"));

    const pc = document.getElementById("playerControls");
    pc.innerHTML = `
      <button id="togglePlayBtn">▶/⏸</button>
      <button id="endSessionBtn">🏁 終了</button>
    `;

    document.getElementById("togglePlayBtn").addEventListener("click", () => {
      if (!ui.currentAudio) return;
      if (ui.currentAudio.paused) ui.currentAudio.play();
      else ui.currentAudio.pause();
    });
    document.getElementById("endSessionBtn").addEventListener("click", () => {
      if (confirm("本当に終了しますか？")) {
        trainFlowAudios.forEach(a => { a.pause(); a.currentTime = 0; });
        window.dispatchEvent(new Event("flow:end"));
      }
    });
  });

  // -8- 成果コピー/シェア ---
  document.getElementById("copyResultBtn").addEventListener("click", async () => {
    const t = document.getElementById("resultText").textContent;
    await navigator.clipboard.writeText(t);
    const b = document.getElementById("copyResultBtn");
    b.textContent = "コピーしました！";
    setTimeout(() => (b.textContent = "本日の成果をコピー"), 1500);
  });

  const originalGenerateResults = ui.generateResults;
  ui.generateResults = function () {
    // 種目名ごとに行をまとめ、0kgは「自重」扱い。全0/未入力なら「記録なし」
    const cards = document.querySelectorAll(".train-card");
    let result = "";

    cards.forEach((card) => {
      const title = card.querySelector(".exercise-title")?.textContent || "種目";
      const rows = card.querySelectorAll(".record-row");
      let hasValid = false;
      let text = `${title}\n`;

      rows.forEach((r) => {
        const isBody = r.classList.contains("bodyweight-mode");
        let weight = r.querySelector(".w-input")?.value || "";
        let reps = r.querySelector(".r-input")?.value || "";

        if (isBody || !weight || weight === "0") weight = "自重";
        else weight = `${weight}kg`;

        if (reps && reps !== "0") hasValid = true;

        text += `  ${weight} × ${reps || 0}回\n`;
      });

      if (!hasValid) text += "  記録なし\n";
      result += text + "\n";
    });

    document.getElementById("resultText").textContent = result.trim();
    document.getElementById("resultSection").style.display = "block";

    const pc = document.getElementById("playerControls");
    pc.innerHTML = `
      <button id="shareBtn">✖ Xでシェア</button>
      <button id="backToMenuBtn">🏠 メニューに戻る</button>
    `;
    document.getElementById("shareBtn").addEventListener("click", () => {
      const text = encodeURIComponent("今日のトレーニング完了！💪 #ハコジム");
      const url = encodeURIComponent(window.location.href);
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    });
    document.getElementById("backToMenuBtn").addEventListener("click", () => {
      location.href = "training_select";
    });
  };

  ui.showVersion("training_logic.js v2025-10-22-event-driven-start-skips-prep");
})();
