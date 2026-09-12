let charts = {};
let allQuizzes = [], allDepts = new Set();
let autoRefreshTimer = null;

async function loadData() {
  document.getElementById("quiz-tbody").innerHTML = '<tr><td colspan="8" class="loading">載入中...</td></tr>';
  try {
    const res = await fetch("/api/quizzes");
    const data = await res.json();
    allQuizzes = data.quizzes;
    allDepts = new Set();
    for (const q of data.quizzes) for (const d of Object.keys(q.departmentBreakdown)) allDepts.add(d);
    renderSummary(data);
    renderTable(data.quizzes);
    renderCharts(data.quizzes);
    renderAlerts(data.quizzes);
    document.getElementById("data-source").textContent = "資料來源: " + (data.file || "無");
    populateDeptFilter();
  } catch (e) {
    document.getElementById("quiz-tbody").innerHTML = '<tr><td colspan="8" class="loading">載入失敗: ' + e.message + '</td></tr>';
  }
}

function animateValue(el, end, suffix) {
  const duration = 600, startTime = performance.now();
  function update(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(end * eased) + (suffix || "");
    if (p < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function renderSummary(data) {
  const q = data.quizzes;
  let ts = 0, tr = 0, tscore = 0, sc = 0, pc = 0, fc = 0;
  for (const x of q) { ts += x.submitted; tr += x.required; tscore += x.avgScore * x.submitted; sc += x.submitted; pc += x.passedCount; fc += x.failedCount; }
  document.getElementById("val-total-quizzes").textContent = q.length;
  document.getElementById("val-total-submitted").textContent = ts + " / " + tr;
  animateValue(document.getElementById("val-completion-rate"), tr > 0 ? Math.round((ts / tr) * 100) : 0, "%");
  document.getElementById("val-avg-score").textContent = (sc > 0 ? Math.round((tscore / sc) * 10) / 10 : 0) + " / 50";
}

function renderAlerts(quizzes) {
  const banner = document.getElementById("alert-banner");
  const warnings = quizzes.filter(q => q.completionPercent < 30);
  if (warnings.length === 0) { banner.style.display = "none"; return; }
  banner.style.display = "block";
  banner.innerHTML = "⚠️ <strong>低完成率警示：</strong>" + warnings.map(w => w.title + " (" + w.completionPercent + "%)").join("、");
}

function populateDeptFilter() {
  const sel = document.getElementById("dept-filter");
  const ex = new Set([...sel.options].map(o => o.value));
  for (const d of [...allDepts].sort()) { if (!ex.has(d)) { const o = document.createElement("option"); o.value = d; o.textContent = d; sel.appendChild(o); } }
}

function applyFilters() {
  const s = document.getElementById("search-input").value.toLowerCase();
  const d = document.getElementById("dept-filter").value;
  const st = document.getElementById("status-filter").value;
  let f = allQuizzes.filter(q => {
    if (s && !q.title.toLowerCase().includes(s)) return false;
    if (d && !q.departmentBreakdown[d]) return false;
    if (st === "complete" && q.completionPercent < 80) return false;
    if (st === "partial" && (q.completionPercent < 20 || q.completionPercent >= 80)) return false;
    if (st === "notstarted" && q.completionPercent >= 20) return false;
    return true;
  });
  renderTable(f);
}

function renderTable(quizzes) {
  const tbody = document.getElementById("quiz-tbody");
  const empty = document.getElementById("table-empty");
  tbody.innerHTML = "";
  if (quizzes.length === 0) { empty.style.display = "block"; return; }
  empty.style.display = "none";
  quizzes.forEach((q, i) => {
    const pct = Math.min(q.completionPercent, 100);
    const fc = pct >= 80 ? "green" : pct >= 50 ? "yellow" : "red";
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.onclick = () => { window.location.href = "quiz.html?title=" + encodeURIComponent(q.title); };
    tr.innerHTML = `<td>${i+1}</td><td>${q.title}</td><td>${q.submitted}</td><td>${q.required}</td><td><div class="completion-bar"><div class="bar"><div class="fill ${fc}" style="width:${pct}%"></div></div><span class="pct">${q.completionPercent}%</span></div></td><td>${q.avgScore}</td><td><span class="score-badge pass">${q.passedCount}</span> / <span class="score-badge fail">${q.failedCount}</span></td><td>${q.departmentCount}</td>`;
    tbody.appendChild(tr);
  });
}

function renderCharts(quizzes) {
  // Gauge
  let ts = 0, tr = 0;
  for (const q of quizzes) { ts += q.submitted; tr += q.required; }
  const rate = tr > 0 ? Math.round((ts / tr) * 100) : 0;
  destroyChart("gauge");
  const gctx = document.getElementById("chart-gauge").getContext("2d");
  const gc = rate >= 80 ? "#34a853" : rate >= 50 ? "#fbbc04" : "#ea4335";
  charts.gauge = new Chart(gctx, {
    type: "doughnut",
    data: { datasets: [{ data: [rate, 100 - rate], backgroundColor: [gc, "#e8e8e8"] }] },
    options: { responsive: true, cutout: "75%", plugins: { legend: { display: false }, tooltip: { enabled: false } } },
    plugins: [{ id: "gaugeText", afterDraw(chart) { const { ctx, width, height } = chart; ctx.save(); ctx.font = "bold 32px sans-serif"; ctx.fillStyle = gc; ctx.textAlign = "center"; ctx.fillText(rate + "%", width / 2, height / 2 + 12); ctx.restore(); } }]
  });

  // Completion bar
  destroyChart("completion");
  charts.completion = new Chart(document.getElementById("chart-completion").getContext("2d"), {
    type: "bar",
    data: { labels: quizzes.map(q => q.title.substring(0, 8) + "..."), datasets: [
      { label: "已交", data: quizzes.map(q => q.submitted), backgroundColor: "#1a73e8", borderRadius: 4 },
      { label: "必交", data: quizzes.map(q => q.required), backgroundColor: "#e0e0e0", borderRadius: 4 }
    ]},
    options: { responsive: true, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 2 } } } }
  });

  // Department donut
  const dt = {};
  for (const q of quizzes) for (const [d, c] of Object.entries(q.departmentBreakdown)) dt[d] = (dt[d] || 0) + c;
  const dl = Object.keys(dt).sort(), dv = dl.map(d => dt[d]);
  const colors = ["#1a73e8","#34a853","#fbbc04","#ea4335","#9c27b0","#00bcd4","#ff9800","#795548"];
  destroyChart("departments");
  charts.departments = new Chart(document.getElementById("chart-departments").getContext("2d"), {
    type: "doughnut", data: { labels: dl, datasets: [{ data: dv, backgroundColor: colors.slice(0, dl.length) }] },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });

  // Stacked bar - department x quiz
  const allD = [...new Set(Object.values(dt).length > 0 ? Object.keys(dt) : [])].sort();
  const stackedDatasets = allD.map((d, i) => ({
    label: d,
    data: quizzes.map(q => q.departmentBreakdown[d] || 0),
    backgroundColor: colors[i % colors.length]
  }));
  destroyChart("stacked");
  charts.stacked = new Chart(document.getElementById("chart-stacked").getContext("2d"), {
    type: "bar",
    data: { labels: quizzes.map(q => q.title.substring(0, 8)), datasets: stackedDatasets },
    options: { responsive: true, plugins: { legend: { position: "bottom" } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }
  });

  // Score distribution
  const sb = [0,0,0,0,0];
  for (const q of quizzes) { const sd = q.scoreDistribution || [0,0,0,0,0]; for (let i = 0; i < 5; i++) sb[i] += sd[i]; }
  destroyChart("scoreDist");
  charts.scoreDist = new Chart(document.getElementById("chart-score-dist").getContext("2d"), {
    type: "bar", data: { labels: ["0-20%","20-40%","40-60%","60-80%","80-100%"], datasets: [{ label: "人數", data: sb, backgroundColor: ["#ea4335","#fbbc04","#ff9800","#34a853","#1a73e8"], borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  // Time distribution
  const mergedTime = {};
  for (const q of quizzes) { const td = q.timeDistribution || {}; for (const [k,v] of Object.entries(td)) mergedTime[k] = (mergedTime[k] || 0) + v; }
  const timeLabels = Object.keys(mergedTime).sort();
  destroyChart("time");
  charts.time = new Chart(document.getElementById("chart-time").getContext("2d"), {
    type: "bar", data: { labels: timeLabels, datasets: [{ label: "提交數", data: timeLabels.map(l => mergedTime[l]), backgroundColor: "#9c27b0", borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  // Radar - dept avg score
  const deptScores = {};
  for (const q of quizzes) for (const r of (q.responses || [])) { if (!deptScores[r.dept]) deptScores[r.dept] = { total: 0, count: 0 }; if (r.scoreTotal > 0) { deptScores[r.dept].total += (r.scoreNum/r.scoreTotal)*100; deptScores[r.dept].count++; } }
  const rl = Object.keys(deptScores).sort();
  destroyChart("radar");
  charts.radar = new Chart(document.getElementById("chart-radar").getContext("2d"), {
    type: "radar",
    data: { labels: rl, datasets: [{ label: "平均分%", data: rl.map(d => deptScores[d].count > 0 ? Math.round(deptScores[d].total / deptScores[d].count) : 0), backgroundColor: "rgba(26,115,232,0.2)", borderColor: "#1a73e8", pointBackgroundColor: "#1a73e8" }] },
    options: { responsive: true, scales: { r: { beginAtZero: true, max: 100 } }, plugins: { legend: { position: "bottom" } } }
  });
}

function destroyChart(key) { if (charts[key]) { charts[key].destroy(); charts[key] = null; } }

// Dark mode
function initDarkMode() { if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark"); updateDarkBtn(); }
function toggleDarkMode() { document.body.classList.toggle("dark"); localStorage.setItem("darkMode", document.body.classList.contains("dark")); updateDarkBtn(); }
function updateDarkBtn() { document.getElementById("btn-dark-mode").textContent = document.body.classList.contains("dark") ? "☀️" : "🌙"; }
function updateClock() { const e = document.getElementById("clock"); if (e) e.textContent = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }

// Auto-refresh
document.getElementById("auto-refresh").addEventListener("change", function() {
  if (this.checked) { autoRefreshTimer = setInterval(loadData, 30000); } else { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
});

// Export PDF
document.getElementById("btn-export").addEventListener("click", () => window.print());

document.getElementById("btn-refresh").addEventListener("click", loadData);
document.getElementById("btn-dark-mode").addEventListener("click", toggleDarkMode);
document.getElementById("search-input").addEventListener("input", applyFilters);
document.getElementById("dept-filter").addEventListener("change", applyFilters);
document.getElementById("status-filter").addEventListener("change", applyFilters);

initDarkMode();
updateClock();
setInterval(updateClock, 1000);
loadData();
