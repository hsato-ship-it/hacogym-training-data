// ================================
// ハコジム トレーニング UI 共通関数（デバッグ対応版）
// ================================

window.HacoGymUI = (() => {

  const DEBUG = true; // ← デバッグログON/OFF切替

  function log(...args) {
    if (DEBUG) console.log("🧩[HacoGymUI]", ...args);
  }

  // --- 実施記録1行の作成 ---
  function createRecordRow(defaultReps = "") {
    const row = document.createElement("div");
    row.className = "record-row";
    row.innerHTML = `
      <div class="record-field">
        <label>重量</label>
        <input type="number" min="0" value="0" /> kg
      </div>
      <div class="record-field">
        <label>回数</label>
        <input type="number" min="0" value="${defaultReps}" /> 回
      </div>
    `;
    log("✅ Record row created:", defaultReps);
    return row;
  }

  // --- アクティブカード設定 ---
  function setActiveCard(card) {
    document.querySelectorAll(".card").forEach(c => c.classList.remove("active", "pulsing"));
    if (card) {
      card.classList.add("active", "pulsing");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      log("🎯 Active card:", card.querySelector(".exercise-title")?.textContent);
    }
  }

  // --- 進行バー更新 ---
  function updateProgress(done, total) {
    const pct = total ? (done / total) * 100 : 0;
    document.getElementById("progressBar").style.width = `${pct}%`;
    document.getElementById("progressText").textContent = `${done} / ${total}`;
    log(`📊 Progress: ${done}/${total} (${pct.toFixed(1)}%)`);
  }

  // --- 結果出力 ---
  function generateResults() {
    const lines = [];
    document.querySelectorAll(".train-card").forEach(card => {
      const titleEl = card.querySelector(".exercise-title") || card.querySelector("h2");
      const title = titleEl ? titleEl.textContent.trim() : "(不明な種目)";
      card.querySelectorAll(".record-row").forEach(r => {
        const inputs = r.querySelectorAll("input");
        const w = parseInt(inputs[0].value || "0");
        const re = parseInt(inputs[1].value || "0");
        if (w > 0 && re > 0) lines.push(`${title} ${w}kg×${re}回`);
      });
    });

    const resultText = lines.length ? lines.join("\n") : "記録が入力されていません。";
    document.getElementById("resultText").textContent = resultText;
    const section = document.getElementById("resultSection");
    section.style.display = "block";
    window.scrollTo({ top: section.offsetTop - 20, behavior: "smooth" });

    log("📄 Results generated:", resultText);
  }

  // --- Wake Lock対応 ---
  async function enableWakeLock() {
    try {
      const lock = await navigator.wakeLock.request("screen");
      log("🟢 Wake Lock enabled");
      lock.addEventListener("release", () => log("🟡 Wake Lock released"));
    } catch (e) {
      log("⚠️ Wake Lock unsupported:", e);
    }
  }

  // --- バージョン表示 ---
  function showVersion(tag) {
    const div = document.createElement("div");
    div.textContent = `🧩 ${tag}`;
    Object.assign(div.style, {
      position: "fixed",
      bottom: "6px",
      right: "8px",
      fontSize: "11px",
      opacity: "0.5",
      zIndex: "3000",
    });
    document.body.appendChild(div);
    log("💡 Loaded:", tag);
  }

  return {
    createRecordRow,
    setActiveCard,
    updateProgress,
    generateResults,
    enableWakeLock,
    showVersion,
  };
})();

window.addEventListener("DOMContentLoaded", () => {
  HacoGymUI.showVersion("training_ui.js v2025-10-18-debug");
});
