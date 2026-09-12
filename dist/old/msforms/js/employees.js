let charts = {};
let allEmployees = [], allQuizzes = [];

async function loadData() {
  document.getElementById("emp-tbody").innerHTML = '<tr><td colspan="8" class="loading">載入中...</td></tr>';
  try {
    const [empRes, heatRes] = await Promise.all([fetch("/api/employees"), fetch("/api/heatmap")]);
    const data = await empRes.json();
    const heatData = await heatRes.json();
    allEmployees = data.employees;
    allQuizzes = heatData.quizTitles || [];
    renderSummary(data);
    renderTable(data.employees);
    renderCharts(data);
    renderHeatmap(heatData);
    renderRanking(data);
    document.getElementById("data-source").textContent = "資料來源: " + (data.file || "無");
  } catch (e) {
    document.getElementById("emp-tbody").innerHTML = '<tr><td colspan="8" class="loading">載入失敗: ' + e.message + '</td></tr>';
  }
}

function renderSummary(data) {
  const emps = data.employees;
  const ap = emps.filter(e => e.failedQuizzes === 0 && e.completed === data.totalQuizzes).length;
  const hf = emps.filter(e => e.failedQuizzes > 0).length;
  const ac = emps.length > 0 ? Math.round(emps.reduce((s, e) => s + e.completionPercent, 0) / emps.length) : 0;
  document.getElementById("val-total-employees").textContent = emps.length;
  document.getElementById("val-all-passed").textContent = ap;
  document.getElementById("val-has-failed").textContent = hf;
  document.getElementById("val-avg-completion").textContent = ac + "%";
}

function renderTable(employees) {
  const tbody = document.getElementById("emp-tbody");
  const empty = document.getElementById("table-empty");
  tbody.innerHTML = "";
  if (employees.length === 0) { empty.style.display = "block"; return; }
  empty.style.display = "none";
  employees.forEach((e, i) => {
    const pct = Math.min(e.completionPercent, 100);
    const fc = pct >= 80 ? "green" : pct >= 50 ? "yellow" : "red";
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.onclick = () => { window.location.href = "employee.html?empId=" + encodeURIComponent(e.empId); };
    tr.innerHTML = `<td>${i+1}</td><td>${e.name}</td><td>${e.empId}</td><td>${e.dept}</td><td>${e.completed}/${e.totalQuizzes}</td><td><div class="completion-bar"><div class="bar"><div class="fill ${fc}" style="width:${pct}%"></div></div><span class="pct">${e.completionPercent}%</span></div></td><td><span class="score-badge pass">${e.passedQuizzes}</span> / <span class="score-badge fail">${e.failedQuizzes}</span></td><td>${e.avgScore}%</td>`;
    tbody.appendChild(tr);
  });
}

function renderHeatmap(data) {
  const container = document.getElementById("heatmap-container");
  if (!data.employees || data.employees.length === 0) { container.innerHTML = '<div class="loading">暫無資料</div>'; return; }
  let html = '<div class="heatmap-scroll"><table class="heatmap-table"><thead><tr><th class="hm-name">姓名</th>';
  const titles = data.quizTitles || [];
  for (const t of titles) html += '<th class="hm-header">' + t.substring(0, 4) + '</th>';
  html += '</tr></thead><tbody>';
  for (const emp of data.employees) {
    html += '<tr><td class="hm-name">' + emp.name + '</td>';
    for (const t of titles) {
      const s = emp.scores[t];
      let cls = "hm-empty";
      if (s) cls = s.passed ? "hm-pass" : "hm-fail";
      const pct = s ? s.pct + "%" : "";
      html += '<td class="hm-cell ' + cls + '" title="' + emp.name + ' - ' + t + ': ' + pct + '">' + pct + '</td>';
    }
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function renderRanking(data) {
  const container = document.getElementById("dept-ranking");
  const deptStats = {};
  for (const e of data.employees) {
    if (!deptStats[e.dept]) deptStats[e.dept] = { total: 0, count: 0, passed: 0, failed: 0 };
    deptStats[e.dept].total += e.completed;
    deptStats[e.dept].count++;
    deptStats[e.dept].passed += e.passedQuizzes;
    deptStats[e.dept].failed += e.failedQuizzes;
  }
  const ranked = Object.entries(deptStats).map(([d, s]) => ({
    dept: d, avgCompletion: Math.round((s.total / (s.count * (allQuizzes.length || 1))) * 100),
    avgPassed: s.count > 0 ? Math.round(s.passed / s.count) : 0,
    count: s.count
  })).sort((a, b) => b.avgCompletion - a.avgCompletion);
  let html = "";
  ranked.forEach((r, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
    const barW = Math.max(r.avgCompletion, 0);
    const barClass = barW >= 80 ? "green" : barW >= 50 ? "yellow" : "red";
    html += `<div class="rank-item"><span class="rank-medal">${medal}</span><span class="rank-dept">${r.dept}</span><div class="rank-bar"><div class="rank-fill ${barClass}" style="width:${barW}%"></div></div><span class="rank-pct">${r.avgCompletion}%</span><span class="rank-count">(${r.count}人)</span></div>`;
  });
  container.innerHTML = html || '<div class="loading">暫無資料</div>';
}

function renderCharts(data) {
  const emps = data.employees;

  // Completion bar chart
  destroyChart("empCompletion");
  charts.empCompletion = new Chart(document.getElementById("chart-emp-completion").getContext("2d"), {
    type: "bar",
    data: { labels: emps.map(e => e.name), datasets: [
      { label: "完成%", data: emps.map(e => e.completionPercent), backgroundColor: "#1a73e8", borderRadius: 4 },
      { label: "平均分%", data: emps.map(e => e.avgScore), backgroundColor: "#34a853", borderRadius: 4 }
    ]},
    options: { responsive: true, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true, max: 100 } } }
  });

  // Radar
  const deptStats = {};
  for (const e of emps) { if (!deptStats[e.dept]) deptStats[e.dept] = { scores: [], completions: [] }; deptStats[e.dept].scores.push(e.avgScore); deptStats[e.dept].completions.push(e.completionPercent); }
  const dl = Object.keys(deptStats).sort();
  const radarData = dl.map(d => { const ss = deptStats[d].scores; return ss.length > 0 ? Math.round(ss.reduce((a,b)=>a+b,0)/ss.length) : 0; });
  const radarComp = dl.map(d => { const cs = deptStats[d].completions; return cs.length > 0 ? Math.round(cs.reduce((a,b)=>a+b,0)/cs.length) : 0; });
  destroyChart("radar");
  charts.radar = new Chart(document.getElementById("chart-radar").getContext("2d"), {
    type: "radar",
    data: { labels: dl, datasets: [
      { label: "平均分%", data: radarData, backgroundColor: "rgba(26,115,232,0.2)", borderColor: "#1a73e8", pointBackgroundColor: "#1a73e8" },
      { label: "完成率%", data: radarComp, backgroundColor: "rgba(52,168,83,0.2)", borderColor: "#34a853", pointBackgroundColor: "#34a853" }
    ]},
    options: { responsive: true, scales: { r: { beginAtZero: true, max: 100 } }, plugins: { legend: { position: "bottom" } } }
  });

  // Department pie
  const deptCount = {};
  for (const e of emps) deptCount[e.dept] = (deptCount[e.dept] || 0) + 1;
  const dkl = Object.keys(deptCount).sort();
  const colors = ["#1a73e8","#34a853","#fbbc04","#ea4335","#9c27b0","#00bcd4","#ff9800","#795548"];
  destroyChart("empDept");
  charts.empDept = new Chart(document.getElementById("chart-emp-dept").getContext("2d"), {
    type: "doughnut",
    data: { labels: dkl, datasets: [{ data: dkl.map(d => deptCount[d]), backgroundColor: colors.slice(0, dkl.length) }] },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });

  // Populate dept filter
  const sel = document.getElementById("dept-filter");
  const ex = new Set([...sel.options].map(o => o.value));
  for (const d of dkl) { if (!ex.has(d)) { const o = document.createElement("option"); o.value = d; o.textContent = d; sel.appendChild(o); } }
}

function destroyChart(k) { if (charts[k]) { charts[k].destroy(); charts[k] = null; } }

function applyFilters() {
  const s = document.getElementById("search-input").value.toLowerCase();
  const d = document.getElementById("dept-filter").value;
  const st = document.getElementById("status-filter").value;
  let f = allEmployees.filter(e => {
    if (s && !e.name.toLowerCase().includes(s) && !e.empId.toLowerCase().includes(s)) return false;
    if (d && e.dept !== d) return false;
    if (st === "complete" && e.failedQuizzes > 0) return false;
    if (st === "failed" && e.failedQuizzes === 0) return false;
    if (st === "incomplete" && e.completed === e.totalQuizzes) return false;
    return true;
  });
  renderTable(f);
}

function initDarkMode() { if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark"); updateDarkBtn(); }
function toggleDarkMode() { document.body.classList.toggle("dark"); localStorage.setItem("darkMode", document.body.classList.contains("dark")); updateDarkBtn(); }
function updateDarkBtn() { document.getElementById("btn-dark-mode").textContent = document.body.classList.contains("dark") ? "☀️" : "🌙"; }
function updateClock() { const e = document.getElementById("clock"); if (e) e.textContent = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }

document.getElementById("btn-refresh").addEventListener("click", loadData);
document.getElementById("btn-dark-mode").addEventListener("click", toggleDarkMode);
document.getElementById("search-input").addEventListener("input", applyFilters);
document.getElementById("dept-filter").addEventListener("change", applyFilters);
document.getElementById("status-filter").addEventListener("change", applyFilters);

initDarkMode();
updateClock();
setInterval(updateClock, 1000);
loadData();
