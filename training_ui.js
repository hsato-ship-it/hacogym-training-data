// ================================
// HacoGym UI Module（自重切替＋Copyボタン整形版 + レイアウト固定）
// ================================
window.HacoGymUI = (() => {
  const ui = {};
  ui.currentAudio = null;

  // -1- 実施記録1行の作成 ---
  ui.createRecordRow = function (defaultReps = "", isFirstRow = false) {
    const row = document.createElement("div");
    row.className = "record-row";
    row.innerHTML = `
      <div class="record-field weight-block">
        <button class="weight-label-btn">重量</button>
        <input type="number" min="0" max="999" value="" class="w-input" />
        <span class="weight-unit">kg</span>
      </div>
      <div class="record-field reps-block">
        <label>回数</label>
        <input type="number" min="0" max="999" value="${defaultReps}" class="r-input" /> 回
      </div>
      ${
        isFirstRow
          ? `<span class="copy-placeholder">Copy</span>`
          : `<button class="copy-prev-btn">↻</button>`
      }
    `;

    // -1a- ⏩ 前のセットコピー ---
    if (!isFirstRow) {
      const copyBtn = row.querySelector(".copy-prev-btn");
      copyBtn.addEventListener("click", () => {
        const prev = row.previousElementSibling;
        if (prev) {
          const prevW = prev.querySelector(".w-input");
          const prevR = prev.querySelector(".r-input");
          const isPrevBody = prev.classList.contains("bodyweight-mode");

          const thisW = row.querySelector(".w-input");
          const thisR = row.querySelector(".r-input");

          if (isPrevBody) {
            // 🔹 前の行が自重 → 自動的に自重モードに
            row.classList.add("bodyweight-mode");
            row.querySelector(".weight-label-btn").textContent = "自重";
            thisW.style.visibility = "hidden";   // display:none → visibility:hidden
            row.querySelector(".weight-unit").style.visibility = "hidden";
          } else {
            // 🔹 通常（重量あり）
            row.classList.remove("bodyweight-mode");
            row.querySelector(".weight-label-btn").textContent = "重量";
            thisW.style.visibility = "visible";
            row.querySelector(".weight-unit").style.visibility = "visible";
            thisW.value = prevW?.value || "";
          }

          thisR.value = prevR?.value || "";

          copyBtn.classList.add("copied");
          copyBtn.textContent = "✅";
          setTimeout(() => {
            copyBtn.textContent = "↻";
            copyBtn.classList.remove("copied");
          }, 1200);
        }
      });
    }

    // -1b- ⚖️ 自重切替（重量ボタンタップ） ---
    const weightBtn = row.querySelector(".weight-label-btn");
    const weightInput = row.querySelector(".w-input");
    const weightUnit = row.querySelector(".weight-unit");

    weightBtn.addEventListener("click", () => {
      const isBodyweight = row.classList.toggle("bodyweight-mode");
      if (isBodyweight) {
        weightBtn.textContent = "自重";
        weightInput.style.visibility = "hidden";   // 幅は保持する
        weightUnit.style.visibility = "hidden";
      } else {
        weightBtn.textContent = "重量";
        weightInput.style.visibility = "visible";
        weightUnit.style.visibility = "visible";
      }
    });

    return row;
  };

  // -2- カード切替 ---
  ui.setActiveCard = (card) => {
    document.querySelectorAll(".card").forEach((c) => c.classList.remove("active", "pulsing"));
    if (card) {
      card.classList.add("active", "pulsing");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // -3- 進行バー更新 ---
  ui.updateProgress = (done, total) => {
    const pct = Math.round((done / total) * 100);
    document.getElementById("progressBar").style.width = `${pct}%`;
    document.getElementById("progressText").textContent = `${done}/${total}`;
    console.log("📊 Progress:", `${done}/${total} (${pct}%)`);
  };

  // -4- 結果生成 ---
  ui.generateResults = () => {
    const rows = document.querySelectorAll(".record-row");
    let result = "";
    rows.forEach((r) => {
      const isBody = r.classList.contains("bodyweight-mode");
      const weight = isBody
        ? "自重"
        : `${r.querySelector(".w-input")?.value || ""}kg`;
      const reps = r.querySelector(".r-input")?.value || "";
      result += `${weight} × ${reps}回\n`;
    });
    document.getElementById("resultText").textContent =
      result || "記録が入力されていません。";
    document.getElementById("resultSection").style.display = "block";
    console.log("📄 Results generated:", result);
  };

  // -5- バージョン表示 ---
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

  // -6- Wake Lock保持 ---
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
