// ================================
// ハコジム トレーニング ロジック（Vimeo順次再生＋APIロード保証＋準備自動再生）
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

  // --- Vimeo APIを確実に読み込む ---
  async function ensureVimeoAPI() {
    if (window.Vimeo && window.Vimeo.Player) {
      console.log("🎯[Logic] 🎬 Vimeo API already present");
      return;
    }
    console.log("🎯[Logic] 📡 Loading Vimeo API...");
    await new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://player.vimeo.com/api/player.js";
      s.onload = () => {
        console.log("🎯[Logic] 🎬 Vimeo API loaded");
        resolve();
      };
      s.onerror = () => {
        console.error("❌ Vimeo API load failed");
        resolve();
      };
      document.head.appendChild(s);
    });
  }

  async function loadData() {
    const res = await fetch(JSON_URL, { cache: "no-store" });
    log("📥 Fetching training_data.json...");
    const json = await res.json();
    log("✅ Data loaded:", json);
    return json;
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
  await ensureVimeoAPI(); // ← Vimeo APIロード保証（ここが重要）

  const { exercises = [], preparationAudios = [], restAudios = [], endAudios = [] } = data;
  const selectedData = selectedIds.map(id => exercises.find(x => x.id === id)).filter(Boolean);
  const container = document.getElementById("cardContainer");
  container.innerHTML = "";
  log("🧩 Selected exercises:", selectedData);

  // --- Vimeoプレイヤー管理 ---
  const vimeoPlayers = new Map();

  function initVimeoPlayer(iframe) {
    if (!iframe || !window.Vimeo) return null;
    try {
      log("🔧 init vimeo:", "#" + iframe.id);
      const player = new Vimeo.Player(iframe);
      vimeoPlayers.set(iframe, player);
      player.setLoop(true);
      player.setMuted(true);

      iframe.addEventListener("load", () => {
        log("🎞️ iframe loaded:", "#" + iframe.id);
        player.pause();
      });

      player.ready().then(() => {
  log("✅ vimeo ready:", "#" + iframe.id);
  // 最初から再生してループ、静音で開始
  player.setMuted(true);
  player.setLoop(true);
  player.setAutopause(false);
  player.play().catch(() => log("⚠️ autoplay blocked on ready"));
});

      
      player.on("play", () => log("▶ vimeo playing:", "#" + iframe.id));
      player.on("error", (e) => log("❌ vimeo error:", e));

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
    const play = () => {
      if (!player) player = initVimeoPlayer(iframe);
      if (player) {
        log("▶ vimeo play request:", "#" + iframe.id);
        player.play().catch(() => log("⚠️ Vimeo再生ブロック:", iframe.src));
      }
    };
    // iframeロード待ち
    if (!iframe.contentWindow || iframe.readyState !== "complete") {
      iframe.addEventListener("load", play, { once: true });
    } else {
      play();
    }
  }

  // --- 準備カード ---
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
    log("🎧 Prep audio:", prep.audio);

    window.addEventListener("load", () => {
      if (!prepAudio) return;
      prepAudio.play().catch(() => log("⚠️ 準備音声の自動再生失敗（ユーザー操作待ち）"));
      prepAudio.addEventListener("ended", () => {
        const startBtn = document.getElementById("startBtn");
        if (startBtn) startBtn.disabled = false;
        log("✅ 準備完了。STARTボタン有効化");
      });
    });
  }

  // --- トレーニングカード ---
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
      const newRow = ui.createRecordRow("", false);
      rows.appendChild(newRow);
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
      log("💤 Added rest card.");
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
    log("🏁 Added end card.");
  }

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
      log("▶ 再生開始:", card.className);
      playVimeoInCard(card);
    });
    a.addEventListener("ended", () => {
      if (card.classList.contains("train-card")) doneCount++;
      ui.updateProgress(doneCount, trainCards.length);
      const next = audios[i + 1];
      if (next) {
        const nextCard = next.closest(".card");
        playVimeoInCard(nextCard);
        next.play();
      } else {
        ui.generateResults();
      }
      log("⏹ 再生終了:", card.className);
    });
  });

  document.getElementById("startBtn").addEventListener("click", async () => {
    log("🚀 STARTボタン押下");
    await ui.enableWakeLock();
    if (prepAudio) {
      prepAudio.pause();
      prepAudio.currentTime = 0;
    }
    const first = document.querySelector(".train-card audio");
    if (first) {
      const firstCard = first.closest(".card");
      playVimeoInCard(firstCard);
      first.play().catch(() => log("⚠️ audio再生失敗"));
    }

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
        document.querySelectorAll("audio").forEach(a => { a.pause(); a.currentTime = 0; });
        ui.generateResults();
      }
    });
  });

  document.getElementById("copyResultBtn").addEventListener("click", async () => {
    const t = document.getElementById("resultText").textContent;
    await navigator.clipboard.writeText(t);
    const b = document.getElementById("copyResultBtn");
    b.textContent = "コピーしました！";
    setTimeout(() => (b.textContent = "本日の成果をコピー"), 1500);
  });

  const originalGenerateResults = ui.generateResults;
  ui.generateResults = function () {
    originalGenerateResults.call(ui);
    const pc = document.getElementById("playerControls");
    pc.innerHTML = `
      <button id="shareBtn">✖ Xでシェア</button>
      <button id="backToMenuBtn">🏠 メニューセレクトに戻る</button>
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

  ui.showVersion("training_logic.js v2025-10-21-vimeo-stable");
})();
