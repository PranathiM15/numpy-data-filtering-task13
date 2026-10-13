(() => {
  const state = { dataset: "marks", operator: ">", lastResult: null };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const els = {
    threshold: $("#threshold"), thresholdUnit: $("#threshold-unit"), customBox: $("#custom-box"), customValues: $("#custom-values"),
    preview: $("#condition-preview"), error: $("#error-message"), run: $("#run-filter"), matchCount: $("#match-count"), totalCount: $("#total-count"),
    matchPercent: $("#match-percent"), matchRing: $("#match-ring"), resultBar: $("#result-bar-fill"), min: $("#stat-min"), max: $("#stat-max"), mean: $("#stat-mean"),
    filtered: $("#filtered-values"), code: $("#code-output"), rows: $("#data-rows"), tableTitle: $("#table-title"), tableCount: $("#table-count"), arrayInfo: $("#array-info"),
    download: $("#download-csv"), toast: $("#toast"), quickChips: $("#quick-chips"),
  };
  let toastTimer;

  function formatNumber(value) {
    if (Number.isInteger(value)) return value.toLocaleString("en-IN");
    return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  function readableOperator(op) { return ({ ">": ">", "<": "<", "==": "==", ">=": ">=", "<=": "<=" })[op] || ">"; }
  function updatePreview() {
    const threshold = els.threshold.value.trim() || "…";
    els.preview.textContent = `data ${readableOperator(state.operator)} ${threshold}`;
    els.code.textContent = `mask = data ${readableOperator(state.operator)} ${threshold}\nfiltered = data[mask]`;
  }
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2400);
  }
  function setDataset(dataset) {
    state.dataset = dataset;
    $$(".dataset-card").forEach((button) => {
      const active = button.dataset.dataset === dataset;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
    els.customBox.hidden = dataset !== "custom";
    els.thresholdUnit.textContent = dataset === "marks" ? "marks" : dataset === "sales" ? "₹ value" : "number";
    if (dataset === "marks") {
      els.threshold.value = 50;
      updateQuickChips([40, 50, 75, 90], 50);
    } else if (dataset === "sales") {
      els.threshold.value = 5000;
      updateQuickChips([1500, 3000, 5000, 7500], 5000);
    } else {
      els.threshold.value = 50;
      updateQuickChips([20, 40, 50, 80], 50);
    }
    updatePreview();
    runFilter();
  }
  function updateQuickChips(values, selected) {
    els.quickChips.replaceChildren();
    values.forEach((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.threshold = String(value);
      button.textContent = value.toLocaleString("en-IN");
      button.classList.toggle("active", value === selected);
      button.addEventListener("click", () => {
        els.threshold.value = value;
        $$("#quick-chips button").forEach((chip) => chip.classList.toggle("active", chip === button));
        updatePreview();
        runFilter();
      });
      els.quickChips.append(button);
    });
  }
  function renderResult(result) {
    state.lastResult = result;
    els.error.hidden = true;
    els.matchCount.textContent = result.matchCount;
    els.totalCount.textContent = `/ ${result.total}`;
    els.matchPercent.textContent = `${result.matchPercent}%`;
    els.matchRing.style.background = `conic-gradient(var(--orange) ${result.matchPercent * 3.6}deg, #eeeef5 0deg)`;
    els.resultBar.style.width = `${result.matchPercent}%`;
    els.min.textContent = formatNumber(result.min);
    els.max.textContent = formatNumber(result.max);
    els.mean.textContent = formatNumber(result.mean);
    els.filtered.replaceChildren();
    if (result.filtered.length) {
      result.filtered.forEach((value) => {
        const chip = document.createElement("span");
        chip.className = "filtered-value";
        chip.textContent = formatNumber(value);
        els.filtered.append(chip);
      });
    } else {
      const dot = document.createElement("span");
      dot.className = "placeholder-dot";
      const text = document.createElement("span");
      text.textContent = "No values match this condition. Try another threshold.";
      els.filtered.append(dot, text);
    }
    els.tableTitle.replaceChildren(document.createTextNode(result.title + " "));
    const count = document.createElement("span");
    count.id = "table-count";
    count.textContent = `${result.total} values`;
    els.tableTitle.append(count);
    els.arrayInfo.textContent = `NumPy ndarray · ${result.total} float values · NumPy ${result.numpyVersion}`;
    const fragment = document.createDocumentFragment();
    result.rows.forEach((row, index) => {
      const tr = document.createElement("tr");
      const cells = [String(index).padStart(2, "0"), row.label, formatNumber(row.value)];
      cells.forEach((value, cellIndex) => {
        const td = document.createElement("td");
        td.textContent = value;
        if (cellIndex === 2) td.className = "value-cell";
        tr.append(td);
      });
      const maskTd = document.createElement("td");
      const mask = document.createElement("span");
      mask.className = `mask-chip ${row.matched ? "true" : "false"}`;
      mask.textContent = row.matched ? "True" : "False";
      maskTd.append(mask);
      tr.append(maskTd);
      const statusTd = document.createElement("td");
      const status = document.createElement("span");
      status.className = `status-chip ${row.matched ? "match" : ""}`;
      status.textContent = row.matched ? "Matches" : "Excluded";
      statusTd.append(status);
      tr.append(statusTd);
      fragment.append(tr);
    });
    els.rows.replaceChildren(fragment);
    els.download.disabled = false;
    updatePreview();
  }
  function showError(message) {
    els.error.textContent = message;
    els.error.hidden = false;
  }
  async function runFilter() {
    const threshold = Number(els.threshold.value);
    if (els.threshold.value.trim() === "" || !Number.isFinite(threshold)) {
      showError("Please enter a valid numeric threshold.");
      els.threshold.focus();
      return;
    }
    els.run.disabled = true;
    els.run.querySelector("span:first-child").textContent = "Filtering…";
    els.error.hidden = true;
    updatePreview();
    const payload = { dataset: state.dataset, operator: state.operator, threshold, customValues: els.customValues.value };
    try {
      const response = await fetch("/api/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The filter failed. Please try again.");
      renderResult(data);
    } catch (error) {
      showError(error.message || "Cannot reach the Python server. Check that the terminal window is still running.");
    } finally {
      els.run.disabled = false;
      els.run.querySelector("span:first-child").textContent = "Run filter";
    }
  }
  function downloadCSV() {
    if (!state.lastResult) return;
    const result = state.lastResult;
    const lines = ["Index,Label,Value,Boolean Mask,Result"];
    result.rows.forEach((row, index) => {
      const label = `"${row.label.replaceAll('"', '""')}"`;
      lines.push(`${index},${label},${row.value},${row.matched},${row.matched ? "Matches" : "Excluded"}`);
    });
    lines.push("");
    lines.push("Filtered Output");
    lines.push(result.filtered.join(","));
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `numpy-filter-${result.dataset}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("CSV export downloaded.");
  }
  async function copyCode() {
    const text = els.code.textContent;
    try {
      await navigator.clipboard.writeText(text);
      showToast("NumPy example copied to clipboard.");
    } catch {
      showToast("Select the code snippet and copy it manually.");
    }
  }

  $$(".dataset-card").forEach((button) => button.addEventListener("click", () => setDataset(button.dataset.dataset)));
  $$(".operator-btn").forEach((button) => button.addEventListener("click", () => {
    state.operator = button.dataset.op;
    $$(".operator-btn").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    updatePreview();
    runFilter();
  }));
  els.threshold.addEventListener("input", () => {
    $$("#quick-chips button").forEach((chip) => chip.classList.toggle("active", Number(chip.dataset.threshold) === Number(els.threshold.value)));
    updatePreview();
  });
  els.threshold.addEventListener("keydown", (event) => { if (event.key === "Enter") runFilter(); });
  els.customValues.addEventListener("input", () => { if (state.dataset === "custom") updatePreview(); });
  $("#clear-threshold").addEventListener("click", () => {
    els.threshold.value = state.dataset === "sales" ? 5000 : 50;
    updatePreview();
    runFilter();
  });
  els.run.addEventListener("click", runFilter);
  els.download.addEventListener("click", downloadCSV);
  $("#copy-code").addEventListener("click", copyCode);

  // Render the initial marks dataset via the Python/NumPy endpoint.
  runFilter();
})();
