// ================================
// ハコジム トレーニング UI制御
// ================================

window.HacoGymUI = (() => {
  let currentAudio = null;
  let wakeLock = null;

  // --- 進行バー更新 ---
  function updateProgress(done, total) {
    const bar = document.getElementById("progressBar");
    const text = document.getElementById("progressText");
    const percent = total > 0 ? (done / total) * 100 : 0;
    bar.style.width = percent + "%";
    text.textContent = `${done} / ${total}`;
  }

  // --- カードのアクティブ化 ---
  function setActiveCard(card) {
    document.querySelectorAll(".card").forEach(c => c.classList.remove("active", "pulsing"));
    if (card) {
      card.classList.add("active", "pulsing");
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // --- 画面スリープ防止 ---
  async function enableWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch (e) {
      console.warn("WakeLock失敗", e);
    }
  }

  // --- 実施記録行の作成 ---
  function createRecordRow(rep = "") {
    const r = document.createElement("div");
    r.className = "record-row";
    r.innerHTML =
      "<div class='record-field'>重量 <input type='number' min='0' placeholder='0'> kg</div>" +
      "<div class='record-field'>回数 <input type='number' min='0' value='" + rep + "' placeholder='0'> 回</div>";
    return r;
  }

  // --- 成果出力 ---
  function generateResults() {
    const lines = [];
    document.querySelectorAll(".train-card").forEach(card => {
      const title = card.querySelector("h2").textContent;
      card.querySelectorAll(".record-row").forEach(r => {
        const i = r.querySelectorAll("input");
        const w = parseInt(i[0].value || "0");
        const re = parseInt(i[1].value || "0");
        if (w > 0 && re > 0) lines.push(`${title} ${w}kg×${re}回`);
      });
    });
    const output = document.getElementById("resultText");
    output.textContent = lines.length ? lines.join("\n") : "（入力がありません）";
    document.getElementById("resultSection").style.display = "block";
    document.getElementById("playerControls").classList.add("hidden");
    document.getElementById("resultSection").scrollIntoView({ behavior: "smooth" });
  }

  return {
    updateProgress,
    setActiveCard,
    createRecordRow,
    generateResults,
    enableWakeLock,
    get currentAudio() { return currentAudio; },
    set currentAudio(a) { currentAudio = a; }
  };
})();
