let charts = {};

async function loadData() {
  const params = new URLSearchParams(window.location.search);
  const empId = params.get("empId");
  if (!empId) { document.querySelector("main").innerHTML = '<div class="loading">缺少工號參數</div>'; return; }

  try {
    const res = await fetch("/api/employee/" + encodeURIComponent(empId));
    if (!res.ok) throw new Error("找不到員工");
    const data = await res.json();
    document.getElementById("emp-name").textContent = data.name;
    document.title = data.name + " - 員工詳細";
    renderSummary(data);
    renderTable(data.results);
    renderCharts(data);
  } catch (e) {
    document.querySelector("main").innerHTML = '<div class="loading">載入失敗: ' + e.message + '</div>';
  }
}

function renderSummary(data) {
  document.getElementById("val-emp-info").textContent = data.empId + " / " + data.dept;
  document.getElementById("val-completed").textContent = data.results.length + "/" + data.total;
  document.getElementById("val-pass-fail").textContent = data.passedCount + " / " + data.failedCount;
  document.getElementById("val-avg-pct").textContent = data.avgPct + "%";
}

function renderTable(results) {
  const tbody = document.getElementById("detail-tbody");
  tbody.innerHTML = "";
  results.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.onclick = () => { window.location.href = "quiz.html?title=" + encodeURIComponent(r.title); };
    const gradeClass = r.pct >= 80 ? "pass" : r.pct >= 60 ? "warn" : "fail";
    tr.innerHTML = `<td>${i+1}</td><td>${r.title}</td><td>${r.scoreNum}/${r.scoreTotal}</td><td><div class="completion-bar"><div class="bar"><div class="fill ${gradeClass === 'pass' ? 'green' : gradeClass === 'warn' ? 'yellow' : 'red'}" style="width:${r.pct}%"></div></div><span class="pct">${r.pct}%</span></div></td><td><span class="score-badge ${r.passed?'pass':'fail'}">${r.passed?'通過':'未通過'}</span></td><td>${r.time ? formatTime(r.time) : '-'}</td>`;
    tbody.appendChild(tr);
  });
}

function formatTime(iso) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); } catch { return iso; }
}

function renderCharts(data) {
  const results = data.results;

  // Score bar chart
  destroyChart("scores");
  charts.scores = new Chart(document.getElementById("chart-scores").getContext("2d"), {
    type: "bar",
    data: {
      labels: results.map(r => r.title.substring(0, 8) + "..."),
      datasets: [
        { label: "得分%", data: results.map(r => r.pct), backgroundColor: results.map(r => r.passed ? "#34a853" : "#ea4335"), borderRadius: 4 }
      ]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
  });

  // Pass/fail donut
  destroyChart("passFail");
  charts.passFail = new Chart(document.getElementById("chart-pass-fail").getContext("2d"), {
    type: "doughnut",
    data: { labels: ["通過","未通過"], datasets: [{ data: [data.passedCount, data.failedCount], backgroundColor: ["#34a853","#ea4335"] }] },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });

  // Grade distribution
  const grades = [0,0,0,0,0]; // 0-20, 20-40, 40-60, 60-80, 80-100
  for (const r of results) grades[Math.min(Math.floor(r.pct / 20), 4)]++;
  destroyChart("grade");
  charts.grade = new Chart(document.getElementById("chart-grade").getContext("2d"), {
    type: "bar",
    data: { labels: ["0-20%","20-40%","40-60%","60-80%","80-100%"], datasets: [{ label: "題數", data: grades, backgroundColor: ["#ea4335","#fbbc04","#ff9800","#34a853","#1a73e8"], borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });
}

function destroyChart(k) { if (charts[k]) { charts[k].destroy(); charts[k] = null; } }

function initDarkMode() { if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark"); updateDarkBtn(); }
function toggleDarkMode() { document.body.classList.toggle("dark"); localStorage.setItem("darkMode", document.body.classList.contains("dark")); updateDarkBtn(); }
function updateDarkBtn() { document.getElementById("btn-dark-mode").textContent = document.body.classList.contains("dark") ? "☀️" : "🌙"; }
function updateClock() { const e = document.getElementById("clock"); if (e) e.textContent = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }

document.getElementById("btn-dark-mode").addEventListener("click", toggleDarkMode);
initDarkMode();
updateClock();
setInterval(updateClock, 1000);
loadData();
