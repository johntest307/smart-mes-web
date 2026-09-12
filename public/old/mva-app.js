const heroMva = document.getElementById("hero-mva-variance");
const heroRoi = document.getElementById("hero-roi-percent");
const heroOee = document.getElementById("hero-oee");
const heroFpy = document.getElementById("hero-fpy-improve");
const heroTrendValue = document.getElementById("hero-trend-value");
const heroOeeValue = document.getElementById("hero-oee-value");
const heroAlertValue = document.getElementById("hero-alert-value");
const heroSummaryValue = document.getElementById("hero-summary-value");
const lineList = document.getElementById("line-list");
const alertPanel = document.getElementById("alert-panel");
const summaryAvgOee = document.getElementById("summary-avg-oee");
const summaryFpy = document.getElementById("summary-fpy");
const summaryDowntime = document.getElementById("summary-downtime");
const summaryEnergy = document.getElementById("summary-energy");
const overviewHighlights = document.getElementById("overview-highlights");
const achievementGauges = document.getElementById("achievement-gauges");
const overviewCharts = document.getElementById("overview-charts");
const performanceCharts = document.getElementById("performance-charts");
const actionItems = document.getElementById("action-items");
const detailToggle = null;
const detailContent = null;
const performanceToggle = document.getElementById("performance-toggle");
const performanceContent = document.getElementById("performance-content");
const tabButtons = Array.from(document.querySelectorAll(".tab"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));
const timeRangeSelect = document.getElementById("time-range");
const roleViewSelect = document.getElementById("role-view");
const execNav = document.getElementById("exec-nav");
const topicSummary = document.getElementById("topic-summary");
const topicDetail = document.getElementById("topic-detail");
const liveStatus = document.getElementById("live-status");
let activeTopicId = "overview";
const kpiGroupSelect = document.getElementById("kpi-group");
let lastDashboard = null;
let lastLines = [];
let metricsPoller = null;

const LINE_NAMES = {
  "1": "組裝產線 1",
  "2": "組裝產線 2",
  "3": "組裝產線 3",
  "4": "組裝產線 4",
  "5": "包裝產線 1",
  "6": "包裝產線 2",
  "7": "測試產線 1",
  "8": "測試產線 2",
  "9": "測試產線 3",
  "10": "測試產線 4",
};

function formatCurrency(value) {
  return Intl.NumberFormat("zh-TW", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value) {
  return `${Number(value).toFixed(1)}%`;
}

function formatNumber(value, digits = 1) {
  return Number(value).toFixed(digits);
}

function formatLineName(id) {
  return LINE_NAMES[String(id)] || `產線 ${id}`;
}

function formatAlertSeverity(severity) {
  const labels = { high: "高", medium: "中", low: "低" };
  return labels[String(severity || "low").toLowerCase()] || "低";
}

function toggleAbnormalState(element, abnormal) {
  if (!element) return;
  element.classList.toggle("abnormal", abnormal);
  const container = element.closest(".hero-card, .hero-mini-card");
  if (container) {
    container.classList.toggle("abnormal", abnormal);
  }
}

function calculateOee(data) {
  const good = Number(data.good_units ?? 0);
  const scrap = Number(data.scrap_units ?? 0);
  const totalUnits = good + scrap;
  const qualityRate = totalUnits ? good / totalUnits : 0;
  const availability = Math.max(0, 1 - Number(data.downtime_minutes ?? 0) / 480);
  const perfRatio = Number(data.std_mva) && Number(data.actual_mva) ? Math.min(1, Number(data.std_mva) / Number(data.actual_mva)) : 1;
  return availability * qualityRate * perfRatio * 100;
}

function createLineCard(data) {
  const actualMva = Number(data.actual_mva ?? 0);
  const stdMva = Number(data.std_mva ?? 0);
  const variance = Number(data.mva_variance ?? 0);
  const payback = Number(data.payback_months ?? 0);
  const roi = Number(data.roi_percent ?? 0);
  const downtime = Number(data.downtime_loss ?? 0);
  const scrap = Number(data.scrap_units ?? 0);
  const good = Number(data.good_units ?? 0);
  const totalUnits = good + scrap;
  const fpy = totalUnits ? (good / totalUnits) * 100 : 0;
  const scrapRate = totalUnits ? (scrap / totalUnits) * 100 : 0;
  const energyCostPerUnit = Number(data.energy_cost_per_unit ?? 0);
  const oee = calculateOee(data);
  const lineName = data.line_name ? data.line_name : formatLineName(data.line_id);
  const historyPoints = data.history || [];
  const trendPoints = historyPoints.length >= 2
    ? historyPoints
    : [...historyPoints, { label: "現在", oee, time: data.last_updated }];

  const card = document.createElement("div");
  card.className = "line-card";
  const alertBadges = (data.alerts || []).map(alert => `<span class="alert-badge ${alert.severity}">${alert.message}</span>`).join("");
  card.innerHTML = `
    <div class="line-meta">
      <h3>${lineName}</h3>
      <small>產線編號：${data.line_id}</small>
      <div class="metric-row">
        <span class="metric-pill">MVA ${formatNumber(actualMva)}</span>
        <span class="metric-pill">ROI ${formatNumber(roi)}</span>
        <span class="metric-pill">OEE ${formatPercent(oee)}</span>
      </div>
      ${alertBadges ? `<div class="alert-row">${alertBadges}</div>` : ""}
    </div>
    <div class="stats">
      <div class="stat-item">
        <label>標準 MVA</label>
        <div class="stat-value">${formatNumber(stdMva)}</div>
      </div>
      <div class="stat-item">
        <label>差異</label>
        <div class="stat-value">${variance >= 0 ? "+" : ""}${formatNumber(variance)}</div>
      </div>
      <div class="stat-item">
        <label>良率</label>
        <div class="stat-value">${formatPercent(fpy)}</div>
      </div>
      <div class="stat-item">
        <label>不良率</label>
        <div class="stat-value">${formatPercent(scrapRate)}</div>
      </div>
      <div class="stat-item">
        <label>產能</label>
        <div class="stat-value">${formatNumber(data.throughput_uph ?? 0)} 單位/時</div>
      </div>
      <div class="stat-item">
        <label>單位能耗</label>
        <div class="stat-value">${formatCurrency(energyCostPerUnit)}</div>
      </div>
      <div class="stat-item">
        <label>停機損失</label>
        <div class="stat-value">${formatCurrency(downtime)}</div>
      </div>
      <div class="progress-row">
        <div class="progress-label"><span>回收進度</span><span>${payback ? `${formatNumber(Math.max(0, 36 - payback))} / 36` : "-"}</span></div>
        <div class="progress-bar"><span style="width: ${Math.min(100, (payback ? (36 - payback) / 36 * 100 : 0))}%"></span></div>
      </div>
      <div class="line-card-trend">
        ${createTrendChartMarkup(trendPoints.map(point => ({
          label: point.label,
          oee: Number(point.oee || 0),
          target: 80,
        })))}
      </div>
    </div>
  `;
  return card;
}

function renderSummary(lines) {
  if (!lines.length) return;
  const avgOee = lines.reduce((sum, row) => sum + Number(row.oee ?? 0), 0) / lines.length;
  const avgFpy = lines.reduce((sum, row) => {
    const good = Number(row.good_units ?? 0);
    const scrap = Number(row.scrap_units ?? 0);
    const totalUnits = good + scrap;
    return sum + (totalUnits ? (good / totalUnits) * 100 : 0);
  }, 0) / lines.length;
  const totalDowntime = lines.reduce((sum, row) => sum + Number(row.downtime_loss ?? 0), 0);
  const avgEnergy = lines.reduce((sum, row) => sum + Number(row.energy_cost_per_unit ?? 0), 0) / lines.length;

  summaryAvgOee.textContent = formatPercent(avgOee);
  summaryFpy.textContent = formatPercent(avgFpy);
  summaryDowntime.textContent = formatCurrency(totalDowntime);
  summaryEnergy.textContent = formatCurrency(avgEnergy);
}

function renderAlerts(alerts) {
  alertPanel.innerHTML = "";
  const now = Date.now();
  const recentAlerts = (alerts || [])
    .map((alert, index) => ({ ...alert, _index: index, _time: getAlertTime(alert, now) }))
    .sort((a, b) => b._time - a._time || b._index - a._index)
    .filter((alert, index, all) => {
      const key = `${alert.line_id || alert.line_name || "unknown"}|${alert.message || ""}|${alert.severity || "low"}`;
      return !all.slice(0, index).some(previous => {
        const previousKey = `${previous.line_id || previous.line_name || "unknown"}|${previous.message || ""}|${previous.severity || "low"}`;
        return previousKey === key && alert._time - previous._time <= 30 * 60 * 1000;
      });
    })
    .slice(0, 5);
  if (!recentAlerts.length) {
    const empty = document.createElement("div");
    empty.className = "line-empty";
    empty.textContent = "目前未偵測到警示。";
    alertPanel.appendChild(empty);
    return;
  }

  recentAlerts.forEach(alert => {
    const card = document.createElement("div");
    card.className = `alert-card ${alert.severity}`;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `查看${alert.line_name || `產線 ${alert.line_id}`}詳細資料`);
    card.innerHTML = `
      <div class="alert-header">
        <strong>${alert.line_name} - ${alert.message}</strong>
        <span class="alert-badge ${alert.severity}">${formatAlertSeverity(alert.severity)}風險</span>
      </div>
      <div class="alert-message">產線編號 ${alert.line_id} 目前需要立即關注。</div>
    `;
    const openAlertDetail = () => openDetailModal(alert.line_id || alert.line_name);
    card.addEventListener("click", openAlertDetail);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openAlertDetail();
      }
    });
    alertPanel.appendChild(card);
  });
}

function getAlertTime(alert, fallback) {
  const rawTime = alert.timestamp || alert.created_at || alert.time || alert.last_refresh;
  if (!rawTime) return fallback;
  const parsed = typeof rawTime === "number" ? rawTime * 1000 : Date.parse(rawTime);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function renderMetrics(lines) {
  lineList.innerHTML = "";
  if (!lines.length) {
    const empty = document.createElement("div");
    empty.className = "line-empty";
    empty.textContent = "尚未取得資料，請啟動模擬資料或檢查資料源。";
    lineList.appendChild(empty);
    return;
  }
  lines.forEach(line => {
    lineList.appendChild(createLineCard(line));
  });
  attachChartTooltips();
}

function updateLiveStatus(connected) {
  if (!liveStatus) return;
  if (connected) {
    liveStatus.textContent = "連線中";
    liveStatus.classList.add("connected");
    liveStatus.classList.remove("disconnected");
  } else {
    liveStatus.textContent = "斷線";
    liveStatus.classList.add("disconnected");
    liveStatus.classList.remove("connected");
  }
}

function renderHero(lines) {
  if (!lines.length) {
    heroMva.textContent = "-";
    heroRoi.textContent = "-";
    heroOee.textContent = "-";
    heroFpy.textContent = "-";
    [heroMva, heroRoi, heroOee, heroFpy].forEach(element => toggleAbnormalState(element, false));
    return;
  }
  const totalVariance = lines.reduce((sum, row) => sum + Number(row.mva_variance ?? 0), 0);
  const avgRoi = lines.reduce((sum, row) => sum + Number(row.roi_percent ?? 0), 0) / lines.length;
  const avgOee = lines.reduce((sum, row) => sum + Number(row.oee ?? 0), 0) / lines.length;
  const avgFpy = lines.reduce((sum, row) => {
    const good = Number(row.good_units ?? 0);
    const scrap = Number(row.scrap_units ?? 0);
    const totalUnits = good + scrap;
    return sum + (totalUnits ? (good / totalUnits) * 100 : 0);
  }, 0) / lines.length;

  heroMva.textContent = `${totalVariance >= 0 ? "+" : ""}${formatNumber(totalVariance)}`;
  heroRoi.textContent = formatPercent(avgRoi);
  heroOee.textContent = formatPercent(avgOee);
  heroFpy.textContent = formatPercent(avgFpy);

  toggleAbnormalState(heroMva, totalVariance < 0);
  toggleAbnormalState(heroRoi, avgRoi < 0);
  toggleAbnormalState(heroOee, avgOee < 80);
  toggleAbnormalState(heroFpy, avgFpy < 97);
}

function createTrendChartMarkup(series) {
  if (!series.length) {
    return '<div class="line-empty">尚無趨勢資料</div>';
  }

  const values = series.map(item => Number(item.oee ?? 0));
  const targets = series.map(item => Number(item.target ?? item.oee ?? 0));
  const maxValue = Math.max(...values, ...targets, 100);
  const minValue = Math.min(...values, ...targets, 0);
  const width = 320;
  const height = 180;
  const padding = 24;
  const step = (width - padding * 2) / Math.max(series.length - 1, 1);

  const project = (value, index, arr) => {
    const normalized = (value - minValue) / Math.max(maxValue - minValue, 1);
    const x = padding + index * step;
    const y = height - padding - normalized * (height - padding * 2);
    return { x, y };
  };

  const valuePoints = values.map((value, index) => project(value, index, values));
  const targetPoints = targets.map((value, index) => project(value, index, targets));
  const path = valuePoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const targetPath = targetPoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  return `
    <div class="chart-card">
      <div class="chart-description"><small>📊 各產線效率趨勢對標目標線 | 注意曲線下降或波動 | 目標達成度</small></div>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="KPI 趨勢圖">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.16)" stroke-width="1" />
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.16)" stroke-width="1" />
        <path d="${targetPath}" fill="none" stroke="rgba(255, 184, 56, 0.85)" stroke-width="2" stroke-dasharray="4 4" />
        <path d="${path}" fill="none" stroke="#38d6ff" stroke-width="3" />
        ${valuePoints.map((point, index) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" fill="#38d6ff"></circle>`).join("")}
        ${valuePoints.map((point, index) => `<rect class="chart-hover-target" x="${Math.max(padding, point.x - 14).toFixed(1)}" y="${padding}" width="28" height="${height - padding * 2}" fill="transparent" data-tooltip="${series[index].label || ""}｜實際：${formatNumber(values[index], 1)}｜目標：${formatNumber(targets[index], 1)}" />`).join("")}
      </svg>
      <div class="chart-legend">
        <span>目標線</span>
        <span>實際趨勢</span>
      </div>
    </div>
  `;
}

function createTargetBarsMarkup(items) {
  if (!items.length) {
    return '<div class="line-empty">尚無目標與實際資料</div>';
  }

  const width = 320;
  const height = 180;
  const padding = 24;
  const maxValue = Math.max(...items.map(item => Math.max(Number(item.target || 0), Number(item.actual || 0))), 1);
  const barWidth = 70;
  const gap = 18;
  const startX = padding + 10;

  return `
    <div class="chart-card">
      <div class="chart-description"><small>📊 目標值（黃）vs 實際值（藍）| 觀察實績是否達標 | 偏差超5%需注意</small></div>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="目標與實際對比圖">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.16)" stroke-width="1" />
        ${items.map((item, index) => {
          const actualHeight = (Number(item.actual || 0) / maxValue) * (height - padding * 2);
          const targetHeight = (Number(item.target || 0) / maxValue) * (height - padding * 2);
          const x = startX + index * (barWidth + gap);
          const actualY = height - padding - actualHeight;
          const targetY = height - padding - targetHeight;
          const actualLabelY = Math.max(actualY - 6, padding + 12);
          const targetLabelY = Math.max(targetY - 6, padding + 12);
          return `
            <rect class="chart-hover-target" x="${x}" y="${actualY}" width="${barWidth / 2}" height="${actualHeight}" rx="8" fill="#38d6ff" fill-opacity="0" data-tooltip="實際：${formatNumber(item.actual || 0, 1)}" />
            <rect class="chart-hover-target" x="${x + barWidth / 2 + 6}" y="${targetY}" width="${barWidth / 2}" height="${targetHeight}" rx="8" fill="#ffb83a" fill-opacity="0" data-tooltip="目標：${formatNumber(item.target || 0, 1)}" />
            <rect x="${x}" y="${actualY}" width="${barWidth / 2}" height="${actualHeight}" rx="8" fill="#38d6ff"></rect>
            <rect x="${x + barWidth / 2 + 6}" y="${targetY}" width="${barWidth / 2}" height="${targetHeight}" rx="8" fill="#ffb83a"></rect>
            <text x="${x + barWidth / 2}" y="${height - 8}" fill="#8ea8c4" font-size="10" text-anchor="middle">${item.label}</text>
          `;
        }).join("")}
      </svg>
      <div class="chart-legend">
        <span>實際</span>
        <span>目標</span>
      </div>
    </div>
  `;
}

function createWaterfallMarkup(items) {
  if (!items.length) return '<div class="line-empty">尚無 MVA 價值橋接資料</div>';
  const width = 640;
  const height = 250;
  const padding = { top: 24, right: 20, bottom: 54, left: 46 };
  const values = items.map(item => Number(item.variance || 0));
  const totals = [];
  let running = 0;
  values.forEach(value => {
    const start = running;
    running += value;
    totals.push({ start, end: running });
  });
  const maxValue = Math.max(...totals.flatMap(item => [item.start, item.end]), 1);
  const minValue = Math.min(...totals.flatMap(item => [item.start, item.end]), 0);
  const scale = value => height - padding.bottom - ((value - minValue) / Math.max(maxValue - minValue, 1)) * (height - padding.top - padding.bottom);
  const baseline = scale(0);
  const slot = (width - padding.left - padding.right) / items.length;
  const barWidth = Math.min(76, slot * 0.62);
  const bars = items.map((item, index) => {
    const total = totals[index];
    const top = scale(Math.max(total.start, total.end));
    const bottom = scale(Math.min(total.start, total.end));
    const color = Number(item.variance || 0) >= 0 ? "#48d2a5" : "#ff5c6d";
    const x = padding.left + index * slot + (slot - barWidth) / 2;
    return `<rect class="chart-hover-target" x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(3, bottom - top).toFixed(1)}" rx="6" fill="${color}" data-tooltip="${item.name || "項目"}：${formatNumber(item.variance, 1)}" />`;
  }).join("");
  const labels = items.map((item, index) => {
    const x = padding.left + index * slot + slot / 2;
    return `<text x="${x.toFixed(1)}" y="${height - 18}" fill="#a9c1d8" font-size="11" text-anchor="middle">${item.name || "項目"}</text>`;
  }).join("");
  return `<div class="chart-card chart-card-wide">
    <div class="chart-title"><strong>MVA 價值橋接</strong><span>成本差異與改善收益</span></div>
    <div class="chart-description"><small>🌊 綠色柱=正向改善  紅色柱=負向因素 | 瀑布圖顯示各項目累積影響 | 聚焦負值項目優先改善</small></div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="MVA 價值橋接瀑布圖">
      <line x1="${padding.left}" y1="${baseline.toFixed(1)}" x2="${width - padding.right}" y2="${baseline.toFixed(1)}" stroke="rgba(255,255,255,0.18)" />
      ${bars}${labels}
    </svg>
  </div>`;
}

function createContributionMarkup(attribution) {
  const items = Object.entries(attribution || {})
    .filter(([key, value]) => key !== "total" && value && typeof value === "object")
    .map(([key, value]) => ({ key, label: value.label || key, amount: Number(value.amount || 0), detail: value.detail || "" }))
    .sort((a, b) => b.amount - a.amount);
  if (!items.length) return '<div class="line-empty">尚無 ROI 收益分解資料</div>';
  const maxAmount = Math.max(...items.map(item => item.amount), 1);
  return `<div class="chart-card chart-card-wide">
    <div class="chart-title"><strong>ROI 收益貢獻</strong><span>各改善來源估算值</span></div>
    <div class="chart-description"><small>💡 各項改善措施對 ROI 的貢獻度排序 | 重點關注最大收益來源 | 協助優先資源分配</small></div>
    <div class="contribution-list">
      ${items.map(item => `<div class="contribution-row" title="${item.detail}">
        <div class="contribution-label"><span>${item.label}</span><strong>${formatCurrency(item.amount)}</strong></div>
        <div class="contribution-track"><span style="width:${Math.min(100, item.amount / maxAmount * 100)}%"></span></div>
      </div>`).join("")}
    </div>
  </div>`;
}

function createLineRankingMarkup(lines, metricKey = "roi") {
  const metricLabels = {
    variance: { label: "MVA 差異排名", suffix: "", value: line => Number(line.variance ?? line.mva_variance ?? 0) },
    roi: { label: "產線 ROI 排名", suffix: "%", value: line => Number(line.roi ?? line.roi_percent ?? 0) },
    oee: { label: "產線 OEE 排名", suffix: "%", value: line => Number(line.oee || 0) },
    downtime: { label: "停機損失排名", suffix: "", value: line => Number(line.downtime ?? line.downtime_loss ?? 0) },
    energy: { label: "單位能耗排名", suffix: "", value: line => Number(line.energy ?? line.energy_cost_per_unit ?? 0) },
  };
  const metric = metricLabels[metricKey] || metricLabels.roi;
  const items = (lines || []).map(line => ({
    label: line.line_name || "產線",
    value: metric.value(line),
    detail: `OEE ${formatPercent(line.oee || 0)}｜ROI ${formatNumber(line.roi ?? line.roi_percent ?? 0)}%｜MVA ${formatNumber(line.variance ?? line.mva_variance ?? 0)}`,
  })).sort((a, b) => b.value - a.value);
  if (!items.length) return '<div class="line-empty">尚無產線比較資料</div>';
  const maxValue = Math.max(...items.map(item => Math.abs(item.value)), 1);
  return `<div class="chart-card chart-card-wide">
    <div class="chart-title"><strong>${metric.label}</strong><span>由高至低排序</span></div>
    <div class="chart-description"><small>📈 產線績效排名 | 前三名為優先改善標竿 | 末位產線需深掘原因</small></div>
    <div class="ranking-list">
      ${items.map((item, index) => `<div class="ranking-row" title="${item.detail}">
        <span class="ranking-index">${index + 1}</span><span class="ranking-name">${item.label}</span>
        <span class="ranking-track"><i style="width:${Math.min(100, Math.abs(item.value) / maxValue * 100)}%"></i></span>
        <strong>${formatNumber(item.value)}${metric.suffix}</strong>
      </div>`).join("")}
    </div>
  </div>`;
}

function createScatterMarkup(lines) {
  if (!lines.length) return '<div class="line-empty">尚無 OEE 與 MVA 比較資料</div>';
  const width = 420;
  const height = 250;
  const padding = 38;
  const xValues = lines.map(item => Number(item.oee || 0));
  const yValues = lines.map(item => Number(item.variance || 0));
  const minX = Math.min(...xValues, 0);
  const maxX = Math.max(...xValues, 100);
  const minY = Math.min(...yValues, 0);
  const maxY = Math.max(...yValues, 1);
  const point = (x, y) => ({
    x: padding + ((x - minX) / Math.max(maxX - minX, 1)) * (width - padding * 2),
    y: height - padding - ((y - minY) / Math.max(maxY - minY, 1)) * (height - padding * 2),
  });
  return `<div class="chart-card chart-card-wide">
    <div class="chart-title"><strong>OEE × MVA 差異</strong><span>效率與價值關聯</span></div>
    <div class="chart-description"><small>🎯 X軸=OEE效率  Y軸=成本差異 | 右上象限=健康産線 | 左下=高風險需處理</small></div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="OEE 與 MVA 差異散佈圖">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.18)" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.18)" />
      <text x="${width / 2}" y="${height - 8}" fill="#8ea8c4" font-size="11" text-anchor="middle">OEE</text>
      <text x="12" y="${height / 2}" fill="#8ea8c4" font-size="11" text-anchor="middle" transform="rotate(-90 12 ${height / 2})">MVA 差異</text>
      ${lines.map(item => {
        const position = point(Number(item.oee || 0), Number(item.variance || 0));
        return `<circle class="chart-hover-target" cx="${position.x.toFixed(1)}" cy="${position.y.toFixed(1)}" r="10" fill="#38d6ff" fill-opacity="0.82" data-tooltip="${item.line_name || "產線"}｜OEE：${formatPercent(item.oee || 0)}｜MVA 差異：${formatNumber(item.variance || 0)}" />`;
      }).join("")}
    </svg>
  </div>`;
}

function createEnergyScatterMarkup(lines) {
  if (!lines.length) return '<div class="line-empty">尚無能耗與 MVA 比較資料</div>';
  const width = 420;
  const height = 250;
  const padding = 38;
  const xValues = lines.map(item => Number(item.energy_cost_per_unit || 0));
  const yValues = lines.map(item => Number(item.mva_variance || item.variance || 0));
  const minX = Math.min(...xValues, 0);
  const maxX = Math.max(...xValues, 1);
  const minY = Math.min(...yValues, 0);
  const maxY = Math.max(...yValues, 1);
  const point = (x, y) => ({
    x: padding + ((x - minX) / Math.max(maxX - minX, 1)) * (width - padding * 2),
    y: height - padding - ((y - minY) / Math.max(maxY - minY, 1)) * (height - padding * 2),
  });
  return `<div class="chart-card chart-card-wide">
    <div class="chart-title"><strong>單位能耗 × MVA 差異</strong><span>識別高能耗低價值產線</span></div>
    <div class="chart-description"><small>⚡ X軸=能耗成本  Y軸=成本差異 | 右下象限=改善空間最大 | 需進行能源診斷</small></div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="單位能耗與 MVA 差異散佈圖">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.18)" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.18)" />
      <text x="${width / 2}" y="${height - 8}" fill="#8ea8c4" font-size="11" text-anchor="middle">單位能耗</text>
      <text x="12" y="${height / 2}" fill="#8ea8c4" font-size="11" text-anchor="middle" transform="rotate(-90 12 ${height / 2})">MVA 差異</text>
      ${lines.map(item => {
        const position = point(Number(item.energy_cost_per_unit || 0), Number(item.mva_variance || item.variance || 0));
        return `<circle class="chart-hover-target" cx="${position.x.toFixed(1)}" cy="${position.y.toFixed(1)}" r="10" fill="#ffb83a" fill-opacity="0.86" data-tooltip="${item.line_name || "產線"}｜單位能耗：${formatCurrency(item.energy_cost_per_unit || 0)}｜MVA 差異：${formatNumber(item.mva_variance || item.variance || 0)}" />`;
      }).join("")}
    </svg>
  </div>`;
}

function createLossParetoMarkup(items) {
  const rows = (items || []).map(item => ({
    label: item.line_name || "產線",
    value: Number(item.estimated_cost_loss || 0),
    band: item.band || "",
  })).sort((a, b) => b.value - a.value);
  if (!rows.length) return '<div class="line-empty">尚無成本損失資料</div>';
  const maxLoss = Math.max(...rows.map(row => row.value), 1);
  const totalLoss = rows.reduce((sum, row) => sum + row.value, 0);
  return `<div class="chart-card chart-card-wide">
    <div class="chart-title"><strong>OEE 成本損失 Pareto</strong><span>合計 ${formatCurrency(totalLoss)}</span></div>
    <div class="chart-description"><small>🔴 停機導致的成本損失排名 | 前三名產線損失最高 | 集中資源改善最大損失來源</small></div>
    <div class="loss-list">
      ${rows.map(row => `<div class="loss-row">
        <div class="loss-label"><span>${row.label}</span><strong>${formatCurrency(row.value)}</strong></div>
        <div class="loss-track"><span style="width:${Math.min(100, row.value / maxLoss * 100)}%"></span></div>
        <small>${row.band}</small>
      </div>`).join("")}
    </div>
  </div>`;
}

function createCostParetoMarkup(oeeLoss, scrap, variance, lines) {
  const categories = [
    { label: "停機損失", value: (oeeLoss || []).reduce((sum, item) => sum + Number(item.estimated_cost_loss || 0), 0) },
    { label: "不良成本", value: Number(scrap?.scrap_cost || 0) },
    { label: "返修成本", value: Number(scrap?.rework_cost || 0) },
    { label: "能耗成本", value: (lines || []).reduce((sum, line) => sum + Number(line.energy_cost_per_unit || 0), 0) },
    { label: "MVA 偏差", value: Math.abs((variance || []).reduce((sum, item) => sum + Number(item.variance || 0), 0)) },
  ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  if (!categories.length) return '<div class="line-empty">尚無完整成本 Pareto 資料</div>';
  const width = 620;
  const height = 270;
  const padding = { top: 28, right: 46, bottom: 58, left: 48 };
  const total = categories.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...categories.map(item => item.value), 1);
  const slot = (width - padding.left - padding.right) / categories.length;
  const barWidth = Math.min(64, slot * 0.58);
  let accumulated = 0;
  const bars = categories.map((item, index) => {
    const x = padding.left + index * slot + (slot - barWidth) / 2;
    const barHeight = item.value / maxValue * (height - padding.top - padding.bottom);
    const y = height - padding.bottom - barHeight;
    accumulated += item.value;
    const cumulative = accumulated / total;
    const lineX = x + barWidth / 2;
    const lineY = height - padding.bottom - cumulative * (height - padding.top - padding.bottom);
    return { item, x, y, barHeight, lineX, lineY, cumulative };
  });
  const cumulativePath = bars.map((bar, index) => `${index ? "L" : "M"}${bar.lineX.toFixed(1)},${bar.lineY.toFixed(1)}`).join(" ");
  return `<div class="chart-card chart-card-wide">
    <div class="chart-title"><strong>完整成本損失 Pareto</strong><span>累積損失 ${formatCurrency(total)}</span></div>
    <div class="chart-description"><small>📊 紅柱=各項損失金額  綠線=80/20法則 | 左邊20%的因素造成80%損失 | 聚焦前兩項改善投資報酬率最高</small></div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="完整成本損失 Pareto 圖">
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.18)" />
      ${bars.map(bar => `<rect class="chart-hover-target" x="${bar.x.toFixed(1)}" y="${bar.y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(3, bar.barHeight).toFixed(1)}" rx="6" fill="#ff6d78" data-tooltip="${bar.item.label}：${formatCurrency(bar.item.value)}" /><text x="${(bar.x + barWidth / 2).toFixed(1)}" y="${height - 18}" fill="#a9c1d8" font-size="10" text-anchor="middle">${bar.item.label}</text>`).join("")}
      <path d="${cumulativePath}" fill="none" stroke="#48d2a5" stroke-width="3" />
      ${bars.map(bar => `<circle cx="${bar.lineX.toFixed(1)}" cy="${bar.lineY.toFixed(1)}" r="4" fill="#48d2a5" /><circle class="chart-hover-target" cx="${bar.lineX.toFixed(1)}" cy="${bar.lineY.toFixed(1)}" r="11" fill="transparent" data-tooltip="${bar.item.label}｜累積：${formatPercent(bar.cumulative * 100)}" />`).join("")}
    </svg>
    <div class="chart-legend"><span style="color:#ff6d78">損失金額</span><span style="color:#48d2a5">累積百分比</span></div>
  </div>`;
}

function createRiskHeatmapMarkup(rows) {
  if (!rows.length) return '<div class="line-empty">目前無風險熱力資料</div>';
  const dimensions = [
    { label: "OEE", valueKey: "oee_value", levelKey: "oee_level", suffix: "%" },
    { label: "停機", valueKey: "downtime_value", levelKey: "downtime_level", suffix: "" },
    { label: "品質", valueKey: "quality_value", levelKey: "quality_level", suffix: "%" },
  ];
  return `<div class="chart-card chart-card-wide">
    <div class="chart-title"><strong>產線風險熱力圖</strong><span>各指標獨立判定風險</span></div>
    <div class="chart-description"><small>🔴 紅色=高風險  黃色=中等  綠色=正常 | 多指標轉紅=緊急干預 | 按風險等級分類處理</small></div>
    <div class="heatmap-grid">
      <div class="heatmap-cell heatmap-head">產線</div>${dimensions.map(dimension => `<div class="heatmap-cell heatmap-head">${dimension.label}</div>`).join("")}
      ${rows.map(row => {
        return `<div class="heatmap-cell heatmap-name">${row.line_name || "產線"}</div>${dimensions.map(dimension => {
          const level = row[dimension.levelKey] || "low";
          const value = Number(row[dimension.valueKey] || 0);
          return `<div class="heatmap-cell heatmap-${level}" title="${row.detail || ""}">${formatNumber(value, 1)}${dimension.suffix}</div>`;
        }).join("")}`;
      }).join("")}
    </div>
  </div>`;
}

function createAchievementGaugesMarkup(items) {
  if (!items.length) return '<div class="line-empty">尚無 KPI 達成率資料</div>';
  const colors = { MVA: "#38d6ff", ROI: "#48d2a5", OEE: "#ffb83a", FPY: "#b98cff" };
  return `<div class="chart-card chart-card-wide achievement-card">
    <div class="chart-title"><strong>四項 KPI 目標達成率</strong><span>實際值／目標值</span></div>
    <div class="chart-description"><small>🎯 每個KPI的達成度 | 綠色=已達標 | 紅色=尚需改善 | 優先處理最落後指標</small></div>
    <div class="achievement-grid">
      ${items.map(item => {
        const target = Number(item.target || 0);
        const actual = Number(item.actual || 0);
        const achievement = target > 0 ? Math.min(100, actual / target * 100) : 0;
        const color = colors[item.label] || "#38d6ff";
        const status = achievement >= 100 ? "已達標" : `差 ${formatNumber(100 - achievement, 1)}%`;
        const display = item.unit === "%" ? formatPercent(actual) : `${formatNumber(actual)} ${item.unit || ""}`;
        const targetDisplay = item.unit === "%" ? formatPercent(target) : `${formatNumber(target)} ${item.unit || ""}`;
        return `<div class="gauge-item">
          <svg viewBox="0 0 120 78" role="img" aria-label="${item.label} 達成率 ${formatNumber(achievement, 1)}%">
            <path d="M 16 64 A 44 44 0 0 1 104 64" pathLength="100" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="10" stroke-linecap="round" />
            <path d="M 16 64 A 44 44 0 0 1 104 64" pathLength="100" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${achievement} 100" />
            <text x="60" y="58" text-anchor="middle" fill="#f3f8ff" font-size="16" font-weight="700">${formatNumber(achievement, 0)}%</text>
          </svg>
          <strong>${item.label}</strong>
          <span>${display}／目標 ${targetDisplay}</span>
          <small class="gauge-status ${achievement >= 100 ? "met" : "behind"}">${status}</small>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

function createQualityMarkup(scrap, labor) {
  const scrapCost = Number(scrap?.scrap_cost || 0);
  const reworkCost = Number(scrap?.rework_cost || 0);
  const totalCost = Math.max(scrapCost + reworkCost, 1);
  const efficiency = Number(labor?.efficiency_index || 0);
  return `<div class="chart-card chart-card-wide">
    <div class="chart-title"><strong>品質損耗與人工效率</strong><span>不良／返修成本與效率指標</span></div>
    <div class="chart-description"><small>💰 追蹤不良與返修成本 | 人工效率>1.0表現佳 | 高損耗應進行品質根因分析</small></div>
    <div class="quality-grid">
      <div class="quality-block"><span>不良成本</span><strong>${formatCurrency(scrapCost)}</strong><div class="quality-track"><i style="width:${scrapCost / totalCost * 100}%"></i></div></div>
      <div class="quality-block"><span>返修成本</span><strong>${formatCurrency(reworkCost)}</strong><div class="quality-track rework"><i style="width:${reworkCost / totalCost * 100}%"></i></div></div>
      <div class="quality-block"><span>人工效率指數</span><strong>${formatNumber(efficiency, 2)}</strong><div class="quality-track labor"><i style="width:${Math.min(100, efficiency / 1.5 * 100)}%"></i></div></div>
    </div>
  </div>`;
}

function renderRoiBenefits(attribution) {
  const values = {
    total: Number(attribution?.total || 0),
    quality: Number(attribution?.quality_gain?.amount || 0),
    downtime: Number(attribution?.downtime_recovery?.amount || 0),
    energy: Number(attribution?.energy_saving?.amount || 0),
    labor: Number(attribution?.labor_efficiency?.amount || 0),
  };
  const elements = {
    total: document.getElementById("roi-total-benefit"),
    quality: document.getElementById("roi-quality-benefit"),
    downtime: document.getElementById("roi-downtime-benefit"),
    energy: document.getElementById("roi-energy-benefit"),
    labor: document.getElementById("roi-labor-benefit"),
  };
  Object.entries(elements).forEach(([key, element]) => {
    if (element) element.textContent = formatCurrency(values[key]);
  });

  const summaryElement = document.getElementById("roi-analysis-summary");
  const situationElement = document.getElementById("roi-star-situation");
  const taskElement = document.getElementById("roi-star-task");
  const actionElement = document.getElementById("roi-star-action");
  const resultElement = document.getElementById("roi-star-result");
  const notes = {
    quality: document.getElementById("roi-quality-note"),
    downtime: document.getElementById("roi-downtime-note"),
    energy: document.getElementById("roi-energy-note"),
    labor: document.getElementById("roi-labor-note"),
  };

  const lines = lastLines || [];
  const lineCount = lines.length;
  const abnormalLines = lines.filter(line => {
    const oee = Number(line.oee ?? 0);
    const fpy = (() => {
      const good = Number(line.good_units ?? 0);
      const scrap = Number(line.scrap_units ?? 0);
      const totalUnits = good + scrap;
      return totalUnits ? (good / totalUnits) * 100 : 0;
    })();
    const roi = Number(line.roi_percent ?? 0);
    const variance = Number(line.mva_variance ?? 0);
    return oee < 80 || fpy < 97 || roi < 0 || variance < 0;
  });
  const worstLine = [...lines].sort((a, b) => (Number(b.mva_variance ?? 0) - Number(a.mva_variance ?? 0)) || (Number(b.roi_percent ?? 0) - Number(a.roi_percent ?? 0)))[0];
  const topContributorKey = Object.entries(values).filter(([key, value]) => key !== "total" && value > 0).sort((a, b) => b[1] - a[1])[0]?.[0] || "quality";
  const contributorLabels = {
    quality: "品質改善",
    downtime: "停機回復",
    energy: "能耗節約",
    labor: "人工效率",
  };
  const topContributorLabel = contributorLabels[topContributorKey] || "品質改善";
  const avgOee = lineCount ? lines.reduce((sum, line) => sum + Number(line.oee ?? 0), 0) / lineCount : 0;
  const avgFpy = lineCount ? lines.reduce((sum, line) => {
    const good = Number(line.good_units ?? 0);
    const scrap = Number(line.scrap_units ?? 0);
    const totalUnits = good + scrap;
    return sum + (totalUnits ? (good / totalUnits) * 100 : 0);
  }, 0) / lineCount : 0;
  const alertCount = lines.reduce((sum, line) => sum + ((line.alerts || []).length), 0);

  if (situationElement) {
    situationElement.textContent = `${lineCount ? `目前 ${lineCount} 條產線中，${abnormalLines.length} 條已出現 OEE、FPY、ROI 或 MVA 異常。` : "目前尚無可用產線資料。"}${worstLine ? `最明顯的影響來源是 ${worstLine.line_name || formatLineName(worstLine.line_id)}。` : ""}`;
  }
  if (taskElement) {
    taskElement.textContent = `任務是把改善資源集中在實際已造成損失的點，而不是只依賴概念式說明。現階段的優先順序，已依據產線績效與效益貢獻來建立。`;
  }
  if (actionElement) {
    actionElement.textContent = `依照目前的平均 OEE ${formatPercent(avgOee)}、平均 FPY ${formatPercent(avgFpy)} 以及 ${alertCount} 個警示事件，將改善重點放在 ${topContributorLabel} 這一類貢獻最多的來源。`;
  }
  if (resultElement) {
    resultElement.textContent = `目前估算總 ROI 效益為 ${formatCurrency(values.total)}，其中 ${topContributorLabel} 是目前最明顯的實際貢獻來源，管理者可直接依此做追蹤與下一步決策。`;
  }
  if (summaryElement) {
    summaryElement.textContent = `依據 ${lineCount || 0} 條產線的即時資料，平均 OEE ${formatPercent(avgOee)}、平均 FPY ${formatPercent(avgFpy)}，目前估算總效益為 ${formatCurrency(values.total)}。`;
  }
  if (notes.quality) notes.quality.textContent = `來自不良與返修成本改善，現估 ${formatCurrency(values.quality)}`;
  if (notes.downtime) notes.downtime.textContent = `來自停機回復與產能回收，現估 ${formatCurrency(values.downtime)}`;
  if (notes.energy) notes.energy.textContent = `來自能耗節約與單位成本下降，現估 ${formatCurrency(values.energy)}`;
  if (notes.labor) notes.labor.textContent = `來自人工效率提升與工時釋放，現估 ${formatCurrency(values.labor)}`;
}

function createQualityTrendMarkup(series) {
  if (!series.length) return '<div class="line-empty">尚無品質趨勢資料</div>';
  const width = 520;
  const height = 220;
  const padding = 30;
  const metrics = [
    { key: "fpy", label: "FPY", color: "#48d2a5" },
    { key: "scrap_rate", label: "不良率", color: "#ff5c6d" },
    { key: "rework_rate", label: "返修率", color: "#ffb83a" },
  ];
  const step = (width - padding * 2) / Math.max(series.length - 1, 1);
  const point = (value, index) => ({
    x: padding + index * step,
    y: height - padding - (Math.max(0, Math.min(100, Number(value || 0))) / 100) * (height - padding * 2),
  });
  const lines = metrics.map(metric => {
    const points = series.map((item, index) => point(item[metric.key], index));
    const path = points.map((item, index) => `${index ? "L" : "M"}${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(" ");
    const targets = points.map((item, index) => `<circle class="chart-hover-target" cx="${item.x.toFixed(1)}" cy="${item.y.toFixed(1)}" r="11" fill="transparent" data-tooltip="${series[index].label || ""}｜${metric.label}：${formatPercent(series[index][metric.key] || 0)}" />`).join("");
    return `<path d="${path}" fill="none" stroke="${metric.color}" stroke-width="3" />${targets}`;
  }).join("");
  return `<div class="chart-card chart-card-wide">
    <div class="chart-title"><strong>FPY／不良／返修趨勢</strong><span>品質改善是否持續發生</span></div>
    <div class="chart-description"><small>📊 FPY（綠）越高越好 | 不良率(紅)&返修率(黃)越低越好 | 持續上升/下降需調查</small></div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="FPY 不良率與返修率趨勢圖">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.18)" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.18)" />
      ${lines}
    </svg>
    <div class="chart-legend">${metrics.map(metric => `<span style="color:${metric.color}">${metric.label}</span>`).join("")}</div>
  </div>`;
}

function createDowntimeTrendMarkup(series) {
  if (!series.length) return '<div class="line-empty">尚無停機趨勢資料</div>';
  const width = 520;
  const height = 190;
  const padding = 30;
  const values = series.map(item => Number(item.downtime_loss || 0));
  const maxValue = Math.max(...values, 1);
  const step = (width - padding * 2) / Math.max(values.length - 1, 1);
  const points = values.map((value, index) => ({
    x: padding + index * step,
    y: height - padding - (value / maxValue) * (height - padding * 2),
  }));
  const path = points.map((item, index) => `${index ? "L" : "M"}${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(" ");
  return `<div class="chart-card chart-card-wide">
    <div class="chart-title"><strong>停機損失趨勢</strong><span>觀察停機問題是否持續惡化</span></div>
    <div class="chart-description"><small>⏱️ 監控停機成本變化 | 上升曲線表示設備故障增加 | 需加強維保預防</small></div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="停機損失趨勢圖">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.18)" />
      <path d="${path}" fill="none" stroke="#ffb83a" stroke-width="3" />
      ${points.map((point, index) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" fill="#ffb83a" /><circle class="chart-hover-target" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="12" fill="transparent" data-tooltip="${series[index].label || ""}｜停機損失：${formatCurrency(values[index])}" />`).join("")}
    </svg>
  </div>`;
}

function renderNavigation(navigation) {
  if (!execNav) return;
  execNav.innerHTML = "";
  navigation.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `nav-item${item.id === activeTopicId ? " active" : ""}`;
    button.innerHTML = `<strong>${item.label}</strong><span>${item.summary || ""}</span>`;
    button.addEventListener("click", () => {
      activeTopicId = item.id;
      renderNavigation(navigation);
      if (topicSummary) topicSummary.textContent = item.label;
      if (topicDetail) topicDetail.textContent = item.summary || "";
    });
    execNav.appendChild(button);
  });
}

function renderWarRoomPanels(dashboard) {
  lastDashboard = dashboard;
  const variance = dashboard?.variance_waterfall || [];
  const benefits = dashboard?.benefit_attribution || {};
  const oeeLoss = dashboard?.oee_cost_loss || [];
  const scrap = dashboard?.scrap_rework || {};
  const executive = dashboard?.executive_view || {};
  const detailRows = executive?.detail_rows || [];
  const navigation = executive?.navigation || [];
  renderRoiBenefits(benefits);
  renderNavigation(navigation);
  if (topicSummary && navigation.length) {
    const selected = navigation.find(item => item.id === activeTopicId) || navigation[0];
    topicSummary.textContent = selected.label;
    topicDetail.textContent = selected.summary || "";
  }

  if (overviewHighlights) {
    overviewHighlights.innerHTML = "";
    const totalVariance = variance.reduce((sum, item) => sum + Number(item.variance || 0), 0);
    const avgOee = detailRows.length ? detailRows.reduce((sum, row) => sum + Number(row.oee || 0), 0) / detailRows.length : 0;
    const avgRoi = executive?.chart_data?.target_vs_actual ? executive.chart_data.target_vs_actual.reduce((sum, row) => sum + Number(row.actual || 0), 0) / Math.max(executive.chart_data.target_vs_actual.length, 1) : 0;
    const alertCount = detailRows.filter(row => (row.alert || "Low") !== "Low").length;
    const highestLossRow = [...detailRows].sort((a, b) => Number(b.variance || 0) - Number(a.variance || 0))[0] || {};
    const highlightCards = [
      { label: "總 MVA 差異", value: `${totalVariance >= 0 ? "+" : ""}${formatNumber(totalVariance, 1)}` },
      { label: "平均 OEE", value: formatPercent(avgOee) },
      { label: "ROI 進度", value: `${formatNumber(avgRoi, 1)}%` },
      { label: "警示產線", value: `${alertCount}` },
      { label: "最高風險產線", value: highestLossRow.line_name || "尚無資料" },
    ];
    highlightCards.forEach(card => {
      const item = document.createElement("div");
      item.className = "warroom-item";
      item.classList.add("summary-highlight");
      item.innerHTML = `
        <div class="warroom-item-head"><strong>${card.label}</strong></div>
        <div class="warroom-row"><strong>${card.value}</strong></div>
      `;
      overviewHighlights.appendChild(item);
    });
  }

  if (overviewCharts) {
    overviewCharts.innerHTML = createWaterfallMarkup(variance);
  }

  if (performanceCharts) {
    performanceCharts.innerHTML = "";
    const fallbackLines = lastLines || [];
    const trendSeries = executive?.trend?.series?.length ? executive.trend.series : fallbackLines.map((line, index) => ({
      label: line.line_name || formatLineName(line.line_id || index + 1),
      oee: Number(line.oee || 0),
      roi: Number(line.roi_percent || 0),
    }));
    const targetVsActual = executive?.chart_data?.target_vs_actual?.length ? executive.chart_data.target_vs_actual : [
      { label: "OEE", target: 80, actual: fallbackLines.reduce((sum, line) => sum + Number(line.oee || 0), 0) / Math.max(fallbackLines.length, 1) },
      { label: "FPY", target: 97, actual: fallbackLines.reduce((sum, line) => sum + (Number(line.good_units || 0) / Math.max(Number(line.good_units || 0) + Number(line.scrap_units || 0), 1)) * 100, 0) / Math.max(fallbackLines.length, 1) },
      { label: "ROI", target: 18, actual: fallbackLines.reduce((sum, line) => sum + Number(line.roi_percent || 0), 0) / Math.max(fallbackLines.length, 1) },
      { label: "MVA", target: fallbackLines.reduce((sum, line) => sum + Number(line.std_mva || 0), 0), actual: fallbackLines.reduce((sum, line) => sum + Number(line.actual_mva || 0), 0), unit: "MVA" },
    ];
    if (achievementGauges) {
      achievementGauges.innerHTML = createAchievementGaugesMarkup(targetVsActual);
    }
    const heatmapRows = executive?.heatmap?.rows || [];
    const comparisonLines = executive?.comparison?.lines || [];
    const rankingLines = fallbackLines.length ? fallbackLines : comparisonLines;
    const rankingMetric = kpiGroupSelect?.value === "mva" ? "variance" : kpiGroupSelect?.value === "oee" ? "oee" : kpiGroupSelect?.value === "energy" ? "energy" : kpiGroupSelect?.value === "downtime" ? "downtime" : "roi";
    const chartContainer = document.createElement("div");
    chartContainer.className = "warroom-item";
    chartContainer.innerHTML = `
      <div class="warroom-item-head"><strong>效能快照</strong><span class="warroom-badge">KPI</span></div>
      <div class="chart-stack">
        ${createTrendChartMarkup(trendSeries.map(item => ({ ...item, target: 78 + Math.max(0, item.oee - 70) })))}
        ${createTargetBarsMarkup(targetVsActual)}
        ${createContributionMarkup(benefits)}
        ${createDowntimeTrendMarkup(trendSeries)}
      </div>
    `;
    performanceCharts.appendChild(chartContainer);

    const comparisonCard = document.createElement("div");
    comparisonCard.className = "warroom-item";
    comparisonCard.innerHTML = `${createLineRankingMarkup(rankingLines, rankingMetric)}${createScatterMarkup(detailRows)}${createEnergyScatterMarkup(fallbackLines)}`;
    performanceCharts.appendChild(comparisonCard);

    const qualityCard = document.createElement("div");
    qualityCard.className = "warroom-item";
    qualityCard.innerHTML = `${createQualityTrendMarkup(trendSeries)}${createQualityMarkup(scrap, dashboard?.labor_efficiency || {})}${createRiskHeatmapMarkup(heatmapRows)}`;
    performanceCharts.appendChild(qualityCard);

  }

  if (actionItems) {
    actionItems.innerHTML = createCostParetoMarkup(oeeLoss, scrap, variance, lastLines);
  }

  const alertCount = detailRows.filter(row => (row.alert || "Low") !== "Low").length;
  const trendValue = (executive?.trend?.series || []).slice(-1)[0]?.roi || 0;
  const avgDetailOee = detailRows.reduce((sum, row) => sum + (row.oee || 0), 0) / Math.max(detailRows.length, 1);
  heroTrendValue.textContent = `${formatPercent(trendValue)}`;
  heroOeeValue.textContent = `${formatPercent(avgDetailOee || 0)}`;
  heroAlertValue.textContent = `${alertCount} 則警示`;
  heroSummaryValue.textContent = executive?.summary?.[roleViewSelect?.value || "exec"] || "管理回顧";

  toggleAbnormalState(heroTrendValue, trendValue < 0);
  toggleAbnormalState(heroOeeValue, avgDetailOee < 80);
  toggleAbnormalState(heroAlertValue, alertCount > 0);

  attachChartTooltips();
}

function attachChartTooltips() {
  document.querySelectorAll('.chart-card').forEach(card => {
    let tooltip = card.querySelector('.chart-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'chart-tooltip';
      card.appendChild(tooltip);
    }
    card.querySelectorAll('.chart-hover-target').forEach(target => {
      target.addEventListener('mouseenter', event => {
        tooltip.textContent = target.dataset.tooltip || '';
        tooltip.style.display = 'block';
      });
      target.addEventListener('mousemove', event => {
        const rect = card.getBoundingClientRect();
        const offsetX = event.clientX - rect.left + 12;
        const offsetY = event.clientY - rect.top - 8;
        tooltip.style.left = `${Math.min(offsetX, rect.width - tooltip.offsetWidth - 10)}px`;
        tooltip.style.top = `${Math.max(offsetY, 8)}px`;
      });
      target.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    });
  });
}

function setActiveTab(tabKey) {
  tabButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tabKey);
  });
  tabPanels.forEach(panel => {
    panel.classList.toggle("active", panel.dataset.panel === tabKey || (tabKey === "overview" && panel.dataset.panel === "overview"));
  });
}

function attachTabHandlers() {
  tabButtons.forEach(button => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });
  roleViewSelect?.addEventListener("change", () => {
    const view = roleViewSelect.value;
    document.querySelectorAll(".warroom-item").forEach(item => item.classList.toggle("view-highlight", view === "exec"));
  });
  timeRangeSelect?.addEventListener("change", () => {
    const range = timeRangeSelect.value;
    document.querySelectorAll(".warroom-badge").forEach(badge => {
      badge.textContent = badge.textContent.includes("trend") || badge.textContent.includes("compare") || badge.textContent.includes("detail") ? `${badge.textContent.split(" ")[0]} ${range}` : badge.textContent;
    });
  });
  kpiGroupSelect?.addEventListener("change", () => {
    renderWarRoomPanels(lastDashboard || {});
  });
  const saveBtn = document.getElementById('save-view-button');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveCurrentView);
  }
}

function attachDetailToggle() {
  performanceToggle?.addEventListener("click", () => {
    const expanded = performanceToggle.getAttribute("aria-expanded") === "true";
    performanceToggle.setAttribute("aria-expanded", String(!expanded));
    if (performanceContent) performanceContent.hidden = expanded;
    const icon = performanceToggle.querySelector(".detail-toggle-icon");
    if (icon) icon.textContent = expanded ? "＋" : "－";
  });
}

async function loadMetrics() {
  try {
    const response = await fetch("/api/metrics");
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const data = await response.json();
    lastLines = data.lines || [];
    renderMetrics(lastLines);
    renderSummary(lastLines);
    renderHero(lastLines);
    renderAlerts(data.alerts || []);
    renderWarRoomPanels(data.dashboard || {});
  } catch (error) {
    lineList.innerHTML = `<div class="line-empty">資料讀取失敗：${error.message}</div>`;
    alertPanel.innerHTML = "";
    renderWarRoomPanels({});
  }
}

function startMetricsPolling() {
  if (metricsPoller) {
    clearInterval(metricsPoller);
  }
  metricsPoller = setInterval(loadMetrics, 10000);
}

function stopMetricsPolling() {
  if (metricsPoller) {
    clearInterval(metricsPoller);
    metricsPoller = null;
  }
}

attachTabHandlers();
attachDetailToggle();
loadSavedViews();
loadMetrics();
setupMetricsStream();

function setupMetricsStream() {
  if (!window.EventSource) {
    updateLiveStatus(false);
    startMetricsPolling();
    return;
  }
  const source = new EventSource('/api/metrics/stream');
  source.addEventListener('open', () => {
    updateLiveStatus(true);
    stopMetricsPolling();
  });
  source.addEventListener('message', event => {
    try {
      const data = JSON.parse(event.data);
      lastLines = data.lines || [];
      renderMetrics(lastLines);
      renderSummary(lastLines);
      renderHero(lastLines);
      renderAlerts(data.alerts || []);
      renderWarRoomPanels(data.dashboard || {});
    } catch (err) {
      console.warn('即時更新解析錯誤', err);
    }
  });
  source.addEventListener('error', () => {
    updateLiveStatus(false);
    startMetricsPolling();
  });
}

async function loadSavedViews() {
  const select = document.getElementById('saved-view-select');
  if (!select) return;
  try {
    const resp = await fetch('/api/saved_views');
    if (!resp.ok) throw new Error(resp.statusText);
    const views = await resp.json();
    select.innerHTML = '<option value="">載入儲存檢視</option>' + views.map(view => `<option value="${encodeURIComponent(view.name)}">${view.name}</option>`).join('');
    select.addEventListener('change', () => {
      const selected = views.find(view => encodeURIComponent(view.name) === select.value);
      if (!selected) return;
      if (selected.config && selected.config.kpiGroup) {
        kpiGroupSelect.value = selected.config.kpiGroup;
      }
      if (selected.config && selected.config.roleView) {
        roleViewSelect.value = selected.config.roleView;
      }
      if (selected.config && selected.config.timeRange) {
        timeRangeSelect.value = selected.config.timeRange;
      }
      renderWarRoomPanels(lastDashboard || {});
    });
  } catch (err) {
    console.warn('載入儲存檢視失敗', err);
  }
}

async function saveCurrentView() {
  const name = prompt('請輸入儲存檢視名稱');
  if (!name) return;
  const payload = {
    name,
    config: {
      kpiGroup: kpiGroupSelect.value,
      roleView: roleViewSelect.value,
      timeRange: timeRangeSelect.value,
      activeTopic: activeTopicId,
    }
  };
  try {
    const resp = await fetch('/api/saved_views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(resp.statusText);
    await loadSavedViews();
    alert('已儲存檢視');
  } catch (err) {
    alert('儲存檢視失敗');
  }
}

async function fetchLiveMetricsOnce() {
  try {
    const response = await fetch('/api/metrics');
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    lastLines = data.lines || [];
    renderMetrics(lastLines);
    renderSummary(lastLines);
    renderHero(lastLines);
    renderAlerts(data.alerts || []);
    renderWarRoomPanels(data.dashboard || {});
  } catch (err) {
    console.warn('Initial metrics load failed', err);
  }
}

async function exportSnapshot() {
  const payload = {
    dashboard: lastDashboard || {},
    lines: lastLines || [],
  };
  try {
    const resp = await fetch('/api/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(resp.statusText);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mva_snapshot.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('匯出快照失敗');
  }
}

// Drill-down modal functions
function openDetailModal(lineIdOrName) {
  const modal = document.getElementById("detail-modal");
  const title = document.getElementById("modal-line-title");
  const chart = document.getElementById("modal-chart");
  const metricsWrap = document.getElementById("modal-metrics");
  if (!modal) return;
  const target = lastLines.find(l => String(l.line_id) === String(lineIdOrName) || l.line_name === lineIdOrName);
  if (!target) return alert("找不到該產線資料");
  title.textContent = target.line_name || `產線 ${target.line_id}`;
  // render line-level multi-period trend (history) and a small target vs actual
  const history = target.history || [];
  const series = history.length >= 2
    ? history.map(h => ({ label: h.label, oee: h.oee }))
    : [...history.map(h => ({ label: h.label, oee: h.oee })), { label: "現在", oee: Number(target.oee || 0) }];
  const actualMva = Number(target.actual_mva || 0);
  const standardMva = Number(target.std_mva || 0);
  const variance = Number(target.mva_variance || 0);
  const goodUnits = Number(target.good_units || 0);
  const scrapUnits = Number(target.scrap_units || 0);
  const totalUnits = Math.max(1, goodUnits + scrapUnits);
  const fpy = goodUnits / totalUnits * 100;
  const scrapRate = scrapUnits / totalUnits * 100;
  const payback = Number(target.payback_months || 0);
  const alertBadges = (target.alerts || []).map(alert => `<span class="alert-badge ${alert.severity}">${alert.message}</span>`).join("");
  chart.innerHTML = createTrendChartMarkup(series.map(s => ({ ...s, target: 80 })) ) + createTargetBarsMarkup([
    { label: "OEE", target: 80.0, actual: Number(target.oee || 0) },
    { label: "FPY", target: 97.0, actual: Math.round((Number(target.good_units || 0) / Math.max(1, (Number(target.good_units || 0) + Number(target.scrap_units || 0)))) * 100) },
  ]);
  attachChartTooltips();
  metricsWrap.innerHTML = `
    <div class="modal-line-card">
      <div class="modal-line-card-head">
        <div><h4>${target.line_name || `產線 ${target.line_id}`}</h4><small>產線編號：${target.line_id}</small></div>
        <span class="modal-live-dot">即時</span>
      </div>
      <div class="modal-line-pills">
        <span class="metric-pill">MVA ${formatNumber(actualMva)}</span>
        <span class="metric-pill">ROI ${formatNumber(Number(target.roi_percent || 0))}</span>
        <span class="metric-pill">OEE ${formatPercent(Number(target.oee || 0))}</span>
      </div>
      ${alertBadges ? `<div class="alert-row">${alertBadges}</div>` : ""}
      <div class="modal-line-stats">
        <div><label>標準 MVA</label><strong>${formatNumber(standardMva)}</strong></div>
        <div><label>差異</label><strong>${variance >= 0 ? "+" : ""}${formatNumber(variance)}</strong></div>
        <div><label>良率</label><strong>${formatPercent(fpy)}</strong></div>
        <div><label>不良率</label><strong>${formatPercent(scrapRate)}</strong></div>
        <div><label>產能</label><strong>${formatNumber(Number(target.throughput_uph || 0))} 單位/時</strong></div>
        <div><label>單位能耗</label><strong>${formatCurrency(Number(target.energy_cost_per_unit || 0))}</strong></div>
        <div><label>停機損失</label><strong>${formatCurrency(Number(target.downtime_loss || 0))}</strong></div>
        <div><label>回收進度</label><strong>${payback ? `${formatNumber(Math.max(0, 36 - payback))} / 36` : "-"}</strong></div>
      </div>
    </div>
    <div class="warroom-item">
      <div class="warroom-item-head"><strong>資料沿革</strong><span class="warroom-badge">來源</span></div>
      <div class="warroom-row"><span>來源</span><strong>${(target.data_lineage && target.data_lineage.source) || '未知'}</strong></div>
      <div class="warroom-row"><span>最後更新</span><strong>${(target.data_lineage && target.data_lineage.last_refresh) || '-'}</strong></div>
    </div>
  `;
  modal.setAttribute("aria-hidden", "false");
  // populate action form
  const titleInput = document.getElementById("modal-action-title");
  const noteInput = document.getElementById("modal-action-note");
  titleInput.value = `調查 ${title.textContent}`;
  noteInput.value = "";
  modal.dataset.lineId = target.line_id || target.line_name;
  modal.dataset.commentPage = "1";
  modal.dataset.commentSearch = "";
  const searchInput = document.getElementById('modal-comment-search');
  if (searchInput) searchInput.value = '';
  const loadMoreBtn = document.getElementById('modal-comment-load-more');
  if (loadMoreBtn) loadMoreBtn.style.display = 'none';
  // load comments for this line
  loadComments(modal.dataset.lineId);
}

function closeDetailModal() {
  const modal = document.getElementById("detail-modal");
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
}

document.addEventListener("click", (e) => {
  if (!e.target) return;
  if (e.target.id === "modal-close") closeDetailModal();
  if (e.target.id === "modal-export") {
    exportSnapshot();
  }
  if (e.target.id === "modal-action") {
    const modal = document.getElementById("detail-modal");
    const lineId = modal.dataset.lineId;
    const title = document.getElementById("modal-action-title").value;
    const note = document.getElementById("modal-action-note").value;
    fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_id: lineId, title: title, note: note })
    }).then(resp => {
      if (!resp.ok) throw new Error('建立行動項目失敗');
      return resp.json();
    }).then(body => {
      alert('已建立行動項目：' + body.id);
      closeDetailModal();
    }).catch(err => {
      alert('建立行動項目失敗');
    });
  }
  if (e.target && e.target.id === 'modal-comment-submit') {
    const modal = document.getElementById('detail-modal');
    const lineId = modal.dataset.lineId;
    const input = document.getElementById('modal-comment-input');
    const text = input.value.trim();
    if (!text) return alert('請輸入註解內容');
    const parentId = modal.dataset.replyParentId || null;
    fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_id: lineId, text: text, author: 'web_user', parent_id: parentId })
    }).then(r => r.json()).then(body => {
      input.value = '';
      // clear reply state
      delete modal.dataset.replyParentId;
      const cancelBtn = document.getElementById('modal-comment-cancel');
      if (cancelBtn) cancelBtn.style.display = 'none';
      const search = document.getElementById('modal-comment-search')?.value.trim() || '';
      modal.dataset.commentSearch = search;
      modal.dataset.commentPage = '1';
      loadComments(lineId, search, 1);
    }).catch(err => {
      alert('發表註解失敗');
    });
  }
  if (e.target && e.target.id === 'modal-comment-cancel') {
    const modal = document.getElementById('detail-modal');
    delete modal.dataset.replyParentId;
    document.getElementById('modal-comment-cancel').style.display = 'none';
    document.getElementById('modal-comment-input').value = '';
  }
  if (e.target && e.target.id === 'modal-comment-load-more') {
    const modal = document.getElementById('detail-modal');
    const lineId = modal.dataset.lineId;
    const currentPage = Number(e.target.dataset.currentPage || '1');
    const nextPage = currentPage + 1;
    modal.dataset.commentPage = String(nextPage);
    const search = document.getElementById('modal-comment-search')?.value.trim() || '';
    modal.dataset.commentSearch = search;
    loadComments(lineId, search, nextPage, true);
  }
});

document.getElementById('modal-comment-search')?.addEventListener('keyup', (evt) => {
  if (evt.key === 'Enter') {
    const modal = document.getElementById('detail-modal');
    const lineId = modal.dataset.lineId;
    const search = document.getElementById('modal-comment-search').value.trim();
    modal.dataset.commentSearch = search;
    modal.dataset.commentPage = '1';
    loadComments(lineId, search, 1);
  }
});

async function loadComments(lineId, search = '', page = 1, append = false) {
  const container = document.getElementById('modal-comments');
  const loadMoreBtn = document.getElementById('modal-comment-load-more');
  if (!container) return;
  if (!append) {
    container.innerHTML = '<div class="comment-empty">載入註解中...</div>';
  }
  try {
    const resp = await fetch(`/api/comments?line_id=${encodeURIComponent(lineId)}&search=${encodeURIComponent(search)}&page=${page}&per_page=3`);
    if (!resp.ok) throw new Error(resp.statusText);
    const data = await resp.json();
    const comments = data.comments || [];
    if (!comments.length) {
      if (!append) container.innerHTML = '<div class="comment-empty">未找到註解</div>';
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      return;
    }
    const html = comments.map(c => renderComment(c)).join('');
    container.innerHTML = append ? container.innerHTML + html : html;
    if (loadMoreBtn) {
      if (page < (data.total_pages || 1)) {
        loadMoreBtn.style.display = '';
        loadMoreBtn.dataset.currentPage = String(page);
        loadMoreBtn.dataset.totalPages = String(data.total_pages || 1);
      } else {
        loadMoreBtn.style.display = 'none';
      }
    }
    Array.from(container.querySelectorAll('.comment-reply')).forEach(btn => {
      btn.addEventListener('click', ev => {
        const modal = document.getElementById('detail-modal');
        modal.dataset.replyParentId = ev.currentTarget.dataset.id;
        const cancelBtn = document.getElementById('modal-comment-cancel');
        if (cancelBtn) cancelBtn.style.display = '';
        document.getElementById('modal-comment-input')?.focus();
      });
    });
  } catch (error) {
    if (!append) container.innerHTML = '<div class="comment-empty">載入註解失敗</div>';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
  }
}

function renderComment(c, depth = 0) {
  const replyBtn = `<button class="comment-reply" data-id="${c.id}">回覆</button>`;
  const childrenHtml = (c.replies || []).map(child => renderComment(child, depth + 1)).join('');
  return `
    <div class="comment-row" style="margin-left:${depth*12}px">
      <div class="comment-meta"><strong>${c.author || '匿名'}</strong> · <small>${new Date((c.created_at||0)*1000).toLocaleString('zh-TW')}</small></div>
      <div class="comment-body">${escapeHtml(c.text || '')}</div>
      <div style="margin-top:6px">${replyBtn}</div>
      ${childrenHtml}
    </div>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>\"']/g, function(m) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]; });
}
