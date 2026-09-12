let charts = {};
let allResponses = [], quizTitle = "";

async function loadData() {
  const params = new URLSearchParams(window.location.search);
  quizTitle = params.get("title");
  if (!quizTitle) { document.querySelector("main").innerHTML = '<div class="loading">缺少測驗名稱參數</div>'; return; }
  document.getElementById("quiz-title").textContent = decodeURIComponent(quizTitle);
  try {
    const [quizRes, qRes] = await Promise.all([
      fetch("/api/quizzes/" + encodeURIComponent(quizTitle)),
      fetch("/api/questions/" + encodeURIComponent(quizTitle))
    ]);
    const data = await quizRes.json();
    const qData = await qRes.json();
    allResponses = data.responses;
    renderSummary(data);
    renderTable(data.responses);
    renderCharts(data);
    renderQuestionChart(qData);
    document.getElementById("quiz-title").textContent = data.title;
  } catch (e) {
    document.querySelector("main").innerHTML = '<div class="loading">載入失敗: ' + e.message + '</div>';
  }
}

function renderSummary(data) {
  document.getElementById("val-submitted").textContent = data.submitted + " / " + data.required;
  document.getElementById("val-completion").textContent = data.completionPercent + "%";
  document.getElementById("val-avg-score").textContent = data.avgScore + " / " + data.passingScore;
  document.getElementById("val-passed").textContent = data.passedCount;
}

function renderTable(responses) {
  const tbody = document.getElementById("response-tbody");
  const empty = document.getElementById("table-empty");
  tbody.innerHTML = "";
  if (responses.length === 0) { empty.style.display = "block"; return; }
  empty.style.display = "none";
  responses.forEach((r, i) => {
    const passed = r.scoreTotal > 0 && (r.scoreNum / r.scoreTotal >= 0.6);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i+1}</td><td>${r.name}</td><td>${r.dept}</td><td>${r.empId}</td><td>${formatTime(r.time)}</td><td>${r.scoreNum}/${r.scoreTotal}</td><td><span class="score-badge ${passed?'pass':'fail'}">${passed?'通過':'未通過'}</span></td>`;
    tbody.appendChild(tr);
  });
}

function formatTime(iso) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); } catch { return iso; }
}

function applySearch() {
  const s = document.getElementById("search-input").value.toLowerCase();
  renderTable(allResponses.filter(r => !s || r.name.toLowerCase().includes(s) || r.empId.toLowerCase().includes(s)));
}

function renderCharts(data) {
  // Dept bar
  const dl = Object.keys(data.departmentBreakdown).sort();
  const colors = ["#1a73e8","#34a853","#fbbc04","#ea4335","#9c27b0","#00bcd4","#ff9800","#795548"];
  destroyChart("dept");
  charts.dept = new Chart(document.getElementById("chart-dept").getContext("2d"), {
    type: "bar", data: { labels: dl, datasets: [{ label: "參與人數", data: dl.map(d => data.departmentBreakdown[d]), backgroundColor: colors.slice(0, dl.length), borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  // Pass/fail donut
  destroyChart("passFail");
  charts.passFail = new Chart(document.getElementById("chart-pass-fail").getContext("2d"), {
    type: "doughnut", data: { labels: ["通過","未通過"], datasets: [{ data: [data.passedCount, data.failedCount], backgroundColor: ["#34a853","#ea4335"] }] },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });

  // Score dist
  const sb = [0,0,0,0,0];
  for (const r of data.responses) { if (r.scoreTotal > 0) { const p = (r.scoreNum/r.scoreTotal)*100; sb[Math.min(Math.floor(p/20),4)]++; } }
  destroyChart("scoreDist");
  charts.scoreDist = new Chart(document.getElementById("chart-score-dist").getContext("2d"), {
    type: "bar", data: { labels: ["0-20%","20-40%","40-60%","60-80%","80-100%"], datasets: [{ label: "人數", data: sb, backgroundColor: ["#ea4335","#fbbc04","#ff9800","#34a853","#1a73e8"], borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });
}

function renderQuestionChart(qData) {
  if (!qData.questions || qData.questions.length === 0) return;
  destroyChart("questions");
  const labels = qData.questions.map((q, i) => "Q" + (i + 1));
  const topPct = qData.questions.map((q, i) => q.total > 0 ? Math.round((q.correctCount / q.total) * 100) : 0);

  charts.questions = new Chart(document.getElementById("chart-questions").getContext("2d"), {
    type: "bar",
    data: {
      labels: labels.map((l, i) => l + " " + (qData.questions[i].question || "").substring(0, 10)),
      datasets: [
        { label: "最多人選%", data: topPct, backgroundColor: topPct.map(p => p >= 60 ? "#34a853" : p >= 40 ? "#fbbc04" : "#ea4335"), borderRadius: 4 }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" }, title: { display: true, text: "各題最熱門選項比率 (非答對率)" } }, scales: { y: { beginAtZero: true, max: 100 } } }
  });
}

function destroyChart(k) { if (charts[k]) { charts[k].destroy(); charts[k] = null; } }

function initDarkMode() { if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark"); updateDarkBtn(); }
function toggleDarkMode() { document.body.classList.toggle("dark"); localStorage.setItem("darkMode", document.body.classList.contains("dark")); updateDarkBtn(); }
function updateDarkBtn() { document.getElementById("btn-dark-mode").textContent = document.body.classList.contains("dark") ? "☀️" : "🌙"; }
function updateClock() { const e = document.getElementById("clock"); if (e) e.textContent = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }

document.getElementById("btn-dark-mode").addEventListener("click", toggleDarkMode);
document.getElementById("search-input").addEventListener("input", applySearch);

initDarkMode();
updateClock();
setInterval(updateClock, 1000);
loadData();
