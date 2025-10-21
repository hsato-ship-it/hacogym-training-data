// ================================
// HacoGym UI Module（自重切替＋Copyボタン整形版）
// ================================
window.HacoGymUI = (() => {
  const ui = {};
  ui.currentAudio = null;

  // --- 実施記録1行の作成 ---
  ui.createRecordRow = function (defaultReps = "", isFirstRow = false) {
    const row = document.createElement("div");
    row.className = "record-row";
    row.innerHTML = `
      <div class="record-field">
        <button class="weight-label-btn">重量</button>
        <input type="number" min="0" max="999" value="0" class="w-input" />
        <span class="weight-unit">kg</span>
      </div>
      <div class="record-field">
        <label>回数</label>
        <input type="number" min="0" max="999" value="${defaultReps}" class="r-input" /> 回
      </div>
      ${
        isFirstRow
          ? `<span class="copy-placeholder">Copy</span>`
          : `<button class="copy-prev-btn">↻</button>`
      }
    `;

    // --- ⏩ 前のセットコピー ---
    if (!isFirstRow) {
      const copyBtn = row.querySelector(".copy-prev-btn");
      copyBtn.addEventListener("click", () => {
        const prev = row.previousElementSibling;
        if (prev) {
          const prevW = prev.querySelector(".w-input").value;
          const prevR = prev.querySelector(".r-input").value;
          row.querySelector(".w-input").value = prevW;
          row.querySelector(".r-input").value = prevR;
          copyBtn.classList.add("copied");
          copyBtn.textContent = "✅";
          setTimeout(() => {
            copyBtn.textContent = "↻";
            copyBtn.classList.remove("copied");
          }, 1200);
        }
      });
    }

    // --- ⚖️ 自重切替（重量ボタンタップ） ---
    const weightBtn = row.querySelector(".weight-label-btn");
    const weightInput = row.querySelector(".w-input");
    const weightUnit = row.querySelector(".weight-unit");

    weightBtn.addEventListener("click", () => {
      const isBodyweight = row.classList.toggle("bodyweight-mode");
      if (isBodyweight) {
        weightBtn.textContent = "自重";
        weightInput.style.display = "none";
        weightUnit.style.display = "none";
      } else {
        weightBtn.textContent = "重量";
        weightInput.style.display = "";
        weightUnit.style.display = "";
      }
    });

    return row;
  };

  // --- カード切替 ---
  ui.setActiveCard = (card) => {
    document.querySelectorAll(".card").forEach((c) => c.classList.remove("active", "pulsing"));
    if (card) {
      card.classList.add("active", "pulsing");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // --- 進行バー更新 ---
  ui.updateProgress = (done, total) => {
    const pct = Math.round((done / total) * 100);
    document.getElementById("progressBar").style.width = `${pct}%`;
    document.getElementById("progressText").textContent = `${done}/${total}`;
    console.log("📊 Progress:", `${done}/${total} (${pct}%)`);
  };

  // --- 結果生成 ---
  ui.generateResults = () => {
    const rows = document.querySelectorAll(".record-row");
    let result = "";
    rows.forEach((r) => {
      const isBody = r.classList.contains("bodyweight-mode");
      const weight = isBody
        ? "自重"
        : `${r.querySelector(".w-input")?.value || 0}kg`;
      const reps = r.querySelector(".r-input")?.value || 0;
      result += `${weight} × ${reps}回\n`;
    });
    document.getElementById("resultText").textContent =
      result || "記録が入力されていません。";
    document.getElementById("resultSection").style.display = "block";
    console.log("📄 Results generated:", result);
  };

  // --- バージョン表示 ---
  ui.showVersion = (ver) => {
    const v = document.createElement("div");
    v.style.position = "fixed";
    v.style.bottom = "4px";
    v.style.right = "8px";
    v.style.fontSize = "12px";
    v.style.color = "#999";
    v.textContent = ver;
    document.body.appendChild(v);
  };

  // --- Wake Lock保持 ---
  ui.enableWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) await navigator.wakeLock.request("screen");
      console.log("🟢 Wake Lock enabled");
    } catch (e) {
      console.log("⚠️ Wake Lock unavailable", e);
    }
  };

  return ui;
})();
