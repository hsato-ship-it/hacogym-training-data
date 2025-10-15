// ================================
// ハコジム トレーニング実施画面 JS（外部読み込み用）
// ================================

const GITHUB_JSON_URL = "https://raw.githubusercontent.com/hsato-ship-it/hacogym-training-data/main/training_data.json";
let currentAudio = null, wakeLock = null, readyToStart = false;

async function enableWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch (e) {
    console.warn("WakeLock失敗", e);
  }
}

function createRecordRow(rep = "") {
  const r = document.createElement("div");
  r.className = "record-row";
  r.innerHTML = "<div class='record-field'>重量 <input type='number' min='0' placeholder='0'> kg</div>" +
    "<div class='record-field'>回数 <input type='number' min='0' value='" + rep + "' placeholder='0'> 回</div>";
  return r;
}

function setActive(c) {
  document.querySelectorAll(".card").forEach(x => x.classList.remove("active", "pulsing"));
  if (c) {
    c.classList.add("active", "pulsing");
    c.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function updateProgress(done, total) {
  const b = document.getElementById("progressBar");
  const tx = document.getElementById("progressText");
  const p = total > 0 ? (done / total) * 100 : 0;
  b.style.width = p + "%";
  tx.textContent = done + " / " + total;
}

function generateResults() {
  const lines = [];
  document.querySelectorAll(".train-card").forEach(c => {
    const t = c.querySelector("h2").textContent;
    c.querySelectorAll(".record-row").forEach(r => {
      const i = r.querySelectorAll("input");
      const w = parseInt(i[0].value || "0");
      const re = parseInt(i[1].value || "0");
      if (w > 0 && re > 0) lines.push(t + " " + w + "kg×" + re + "回");
    });
  });
  const out = document.getElementById("resultText");
  out.textContent = lines.length ? lines.join("\n") : "（入力がありません）";
  document.getElementById("resultSection").style.display = "block";
  document.getElementById("resultSection").scrollIntoView({ behavior: "smooth" });
  document.getElementById("playerControls").classList.add("hidden");
}

async function loadTrainingData() {
  const r = await fetch(GITHUB_JSON_URL, { cache: "no-store" });
  return await r.json();
}

async function init() {
  const p = new URLSearchParams(location.search);
  const ids = p.get("ids") ? p.get("ids").split(",") : JSON.parse(localStorage.getItem("selectedExercises") || "[]");
  if (!ids.length) {
    alert("選択データがありません");
    location.href = "training_select";
    return;
  }

  const d = await loadTrainingData();
  const exercises = d.exercises || [];
  const preparationAudios = d.preparationAudios || [];
  const restAudios = d.restAudios || [];
  const endAudios = d.endAudios || [];

  const sel = ids.map(id => exercises.find(x => x.id === id)).filter(Boolean);
  const cont = document.getElementById("cardContainer");
  cont.innerHTML = "";

  let prepAudio = null;
  if (preparationAudios.length) {
    const pr = preparationAudios[Math.floor(Math.random() * preparationAudios.length)];
    const c = document.createElement("div");
    c.className = "card prep-card";
    c.innerHTML = "<h3>準備</h3><p class='comment'>" + pr.comment + "</p>" +
      "<audio preload='auto'><source src='" + pr.audio + "' type='audio/wav'></audio>";
    cont.appendChild(c);
    prepAudio = c.querySelector("audio");
    if (prepAudio) prepAudio.play().catch(() => {});
  }

  sel.forEach((ex, i) => {
    const c = document.createElement("div");
    c.className = "card train-card";
    c.innerHTML =
      "<div class='video-wrapper'><img src='" + ex.gif + "' alt='" + ex.title + "' class='gif-motion'></div>" +
      "<h2>" + ex.title + "</h2><p>標準：" + ex.standardReps + "回 × " + ex.standardSets + "セット</p>" +
      "<p>" + ex.tips + "</p>" +
      "<div class='record-inputs'><div class='record-label'>実施記録入力：</div><div class='record-rows'></div>" +
      "<button class='add-set-btn'>＋ 追加</button></div>" +
      "<audio preload='auto'><source src='" + ex.audio + "' type='audio/wav'></audio>";
    const rows = c.querySelector(".record-rows");
    for (let s = 0; s < ex.standardSets; s++) rows.appendChild(createRecordRow(ex.standardReps));
    c.querySelector(".add-set-btn").addEventListener("click", () => rows.appendChild(createRecordRow("")));
    cont.appendChild(c);

    if (i < sel.length - 1 && restAudios.length > 0) {
      const r = restAudios[Math.floor(Math.random() * restAudios.length)];
      const rc = document.createElement("div");
      rc.className = "card rest-card";
      rc.innerHTML = "<h3>休憩</h3><p class='comment'>" + r.comment + "</p>" +
        "<audio preload='auto'><source src='" + r.audio + "' type='audio/wav'></audio>";
      cont.appendChild(rc);
    }
  });

  if (endAudios.length) {
    const e = endAudios[Math.floor(Math.random() * endAudios.length)];
    const ec = document.createElement("div");
    ec.className = "card end-card";
    ec.innerHTML = "<h3>トレーニング終了</h3><p class='comment'>" + e.comment + "</p>" +
      "<audio preload='auto'><source src='" + e.audio + "' type='audio/wav'></audio>";
    cont.appendChild(ec);
  }

  const audios = cont.querySelectorAll("audio");
  const trains = cont.querySelectorAll(".train-card");
  let done = 0;
  updateProgress(0, trains.length);

  audios.forEach((a, i) => {
    const card = a.closest(".card");
    a.addEventListener("play", () => {
      audios.forEach(x => x !== a && x.pause());
      setActive(card);
      currentAudio = a;
    });
    a.addEventListener("ended", () => {
      if (card.classList.contains("prep-card")) {
        readyToStart = true;
        return;
      }
      if (card.classList.contains("train-card")) done++;
      updateProgress(done, trains.length);
      const next = audios[i + 1];
      if (next) next.play();
      else generateResults();
    });
  });

  // --- START! ボタン ---
  document.getElementById("startBtn").addEventListener("click", async () => {
    if (prepAudio) {
      prepAudio.pause();
      prepAudio.currentTime = 0;
    }
    await enableWakeLock();
    const f = document.querySelector(".train-card audio");
    if (f) f.play().catch(() => {});
    const pc = document.getElementById("playerControls");
    pc.innerHTML =
      "<button id='togglePlayBtn'>▶ 再生 / ⏸ 一時停止</button>" +
      "<button id='endSessionBtn'>🏁 終了</button>";

    document.getElementById("togglePlayBtn").addEventListener("click", () => {
      if (!currentAudio) return;
      if (currentAudio.paused) currentAudio.play();
      else currentAudio.pause();
    });

    document.getElementById("endSessionBtn").addEventListener("click", () => {
      if (confirm("本当に終了しますか？")) {
        document.querySelectorAll("audio").forEach(a => {
          a.pause();
          a.currentTime = 0;
        });
        generateResults();
      }
    });
  });
}

document.getElementById("copyResultBtn").addEventListener("click", async () => {
  const t = document.getElementById("resultText").textContent;
  await navigator.clipboard.writeText(t);
  const b = document.getElementById("copyResultBtn");
  b.textContent = "コピーしました！";
  setTimeout(() => b.textContent = "本日の成果をコピー", 1500);
});

init().catch(e => {
  alert("データ読み込み失敗");
  console.error(e);
});
