const API_BASE = '';
let allSensors = [];
let sensorPositions = {};

document.addEventListener('DOMContentLoaded', () => {
    loadSensorPositions();
    setupTabSwitching();
    setupRefreshBtn();
    fetchAndRender();
    setInterval(forceRefreshAll, 60000);
    initFloorPlan();
    setTimeout(addZoomHint, 500);
});

function jumpToTab(tab) {
    if (tab === 'humid') tab = 'temp';
    const menuItem = document.querySelector(`.menu-item[data-tab="${tab}"]`);
    if (menuItem) menuItem.click();
}

let _modalChart = null;
let _modalOriginalParent = null;
let _modalOriginalNext = null;

function openChartModal(cardEl) {
    const chartContainer = cardEl.querySelector('.chart-container');
    const titleEl = cardEl.querySelector('h3');
    if (!chartContainer || !chartContainer.id) return;
    const chart = echarts.getInstanceByDom(chartContainer);
    if (!chart) return;

    const modal = document.getElementById('chart-modal');
    const body = document.getElementById('chart-modal-body');
    const title = document.getElementById('chart-modal-title');
    title.textContent = titleEl ? titleEl.textContent.trim() : '';

    _modalOriginalParent = chartContainer.parentNode;
    _modalOriginalNext = chartContainer.nextSibling;

    chartContainer.style.height = '100%';
    chartContainer.style.width = '100%';
    chartContainer.style.minHeight = '0';
    body.appendChild(chartContainer);

    modal.classList.remove('hidden');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            chart.resize();
            _modalChart = chart;
        });
    });
}

function closeChartModal(e) {
    if (e && e.target !== e.currentTarget && !e.target.closest('.chart-modal-close')) return;
    const modal = document.getElementById('chart-modal');
    if (modal.classList.contains('hidden')) return;

    if (_modalChart && _modalOriginalParent) {
        const body = document.getElementById('chart-modal-body');
        const container = body.querySelector('.chart-container');
        if (container) {
            container.style.height = '';
            container.style.width = '';
            container.style.minHeight = '';
            if (_modalOriginalNext && _modalOriginalNext.parentNode === _modalOriginalParent) {
                _modalOriginalParent.insertBefore(container, _modalOriginalNext);
            } else {
                _modalOriginalParent.appendChild(container);
            }
        }
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                _modalChart.resize();
                _modalChart = null;
            });
        });
    }
    modal.classList.add('hidden');
}

function addZoomHint() {
    document.querySelectorAll('.chart-card .chart-container').forEach(el => {
        const card = el.closest('.chart-card');
        if (!card) return;
        if (!card.querySelector('.chart-zoom-hint')) {
            card.style.cursor = 'pointer';
            card.setAttribute('onclick', 'openChartModal(this)');
            const hint = document.createElement('div');
            hint.className = 'chart-zoom-hint';
            hint.innerHTML = '<i class="fa-solid fa-expand"></i> 點擊放大';
            card.appendChild(hint);
        }
        if (!card.querySelector('.chart-ai-btn')) {
            const btn = document.createElement('button');
            btn.className = 'chart-ai-btn';
            btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 分析';
            btn.onclick = (e) => { e.stopPropagation(); analyzeChart(el, btn); };
            card.appendChild(btn);
        }
    });
}

async function analyzeChart(chartContainer, btn) {
    const chart = echarts.getInstanceByDom(chartContainer);
    if (!chart) return;
    const card = chartContainer.closest('.chart-card');
    const title = card?.querySelector('h3')?.textContent?.trim() || '未知圖表';
    const option = chart.getOption();
    const chartData = extractChartData(option, chartContainer.id);
    btn.disabled = true;

    let overlay = document.querySelector('.chart-ai-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'chart-ai-overlay hidden';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.add('hidden'); };
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div class="chart-ai-modal">
            <div class="chart-ai-modal-header">
                <span class="ai-title"><i class="fa-solid fa-robot"></i> AI 圖表分析 — ${title}</span>
                <button class="chart-ai-modal-close" onclick="this.closest('.chart-ai-overlay').classList.add('hidden')">&times;</button>
            </div>
            <div class="chart-ai-modal-body">
                <div class="chart-ai-modal-loading"><i class="fa-solid fa-spinner fa-spin"></i> 正在分析圖表資料...</div>
            </div>
            <div class="chart-ai-modal-source"></div>
        </div>`;
    overlay.classList.remove('hidden');

    try {
        const resp = await fetch('/api/chart_analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chart_type: chartData.type, chart_title: title, data: chartData.data })
        });
        const result = await resp.json();
        overlay.querySelector('.chart-ai-modal-body').textContent = result.analysis || '無法分析';
        overlay.querySelector('.chart-ai-modal-source').textContent = result.source || '';
    } catch (e) {
        overlay.querySelector('.chart-ai-modal-body').innerHTML = '<span style="color:#ef4444;">分析失敗，請稍後再試。</span>';
    } finally {
        btn.disabled = false;
    }
}

function extractChartData(option, domId) {
    if (domId === 'chart-temp-bar' || domId === 'chart-humid-bar') {
        const isTemp = domId === 'chart-temp-bar';
        const series = option.series?.[0];
        const xData = option.xAxis?.[0]?.data || [];
        const values = series?.data?.map((d, i) => ({
            name: xData[i] || '',
            value: typeof d === 'object' ? d.value : d
        })) || [];
        return { type: isTemp ? 'bar_temp' : 'bar_humid', data: { values } };
    }
    if (domId === 'chart-alarm-pie') {
        const data = option.series?.[0]?.data || [];
        const counts = {};
        data.forEach(d => { counts[d.name] = d.value; });
        return { type: 'pie', data: { counts } };
    }
    if (domId === 'chart-trend-line') {
        const series = option.series || [];
        const summary = series.slice(0, 20).map(s => ({
            name: s.name,
            points: s.data?.length || 0,
            last: s.data?.[s.data.length - 1]?.[1]
        }));
        return { type: 'line', data: { series: summary } };
    }
    if (domId === 'chart-scatter') {
        const data = option.series?.[0]?.data || [];
        return { type: 'scatter', data: { count: data.length } };
    }
    if (domId === 'chart-radar') {
        const indicators = option.radar?.[0]?.indicator || [];
        const radarSeries = option.series?.[0]?.data || [];
        const seriesData = radarSeries.map(s => ({ name: s.name, values: s.value }));
        return { type: 'radar', data: { zones: indicators.map(i => i.name), series: seriesData } };
    }
    if (domId === 'chart-alarm-rank') {
        const yData = option.yAxis?.[0]?.data || [];
        const sData = option.series?.[0]?.data || [];
        const codes = yData.map((code, i) => ({ code, count: sData[i] }));
        return { type: 'alarm_rank', data: { codes } };
    }
    if (domId === 'chart-boxplot') {
        const xData = option.xAxis?.[0]?.data || [];
        return { type: 'boxplot', data: { floors: xData } };
    }
    if (domId === 'chart-mom-temp' || domId === 'chart-mom-humid') {
        const isTemp = domId === 'chart-mom-temp';
        const xData = option.xAxis?.[0]?.data || [];
        const avgData = option.series?.[0]?.data || [];
        const alarmData = option.series?.[1]?.data || [];
        const months = xData.map((m, i) => ({
            month: m,
            avg: avgData[i],
            alarms: alarmData[i]
        }));
        return { type: isTemp ? 'mom_temp' : 'mom_humid', data: { months } };
    }
    if (domId === 'chart-yoy-temp' || domId === 'chart-yoy-humid') {
        const isTemp = domId === 'chart-yoy-temp';
        const legend = option.legend?.[0]?.data || [];
        const xData = option.xAxis?.[0]?.data || [];
        const series = option.series || [];
        const years = legend.map((yr, i) => ({
            year: yr,
            values: xData.map((m, j) => ({ month: m, value: series[i]?.data?.[j] }))
        }));
        return { type: isTemp ? 'yoy_temp' : 'yoy_humid', data: { years } };
    }
    if (domId === 'chart-compliance') {
        const legend = option.legend?.[0]?.data || [];
        const xData = option.xAxis?.[0]?.data || [];
        const series = option.series || [];
        const years = legend.map((yr, i) => ({
            year: yr,
            values: xData.map((m, j) => ({ month: m, rate: series[i]?.data?.[j] }))
        }));
        return { type: 'compliance', data: { years } };
    }
    if (domId === 'chart-zone-yoy') {
        const legend = option.legend?.[0]?.data || [];
        const yData = option.yAxis?.[0]?.data || [];
        const series = option.series || [];
        const zones = yData.map((zn, i) => ({
            zone: zn,
            values: legend.map((yr, j) => ({ year: yr, temp: series[j]?.data?.[i] }))
        }));
        return { type: 'zone_yoy', data: { zones } };
    }
    return { type: 'unknown', data: {} };
}

function setupTabSwitching() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const tab = item.dataset.tab;
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            item.classList.add('active');
            document.getElementById('tab-' + tab).classList.add('active');
            const titles = {
                cover:   '專案封面',
                temp:    '溫濕度即時監控',
                sensors: '感測器監測清單',
                trend:   '歷史溫濕度趨勢分析',
                spatial: '廠區空間分佈分析',
                alarm:   '告警診斷與排行',
                llm:     'AI 全域診斷中心',
                roi:     'ROI 效益分析'
            };
            document.getElementById('page-title').textContent = titles[tab] || tab;

            if (window.aiAnalysisResult && tab === 'llm') {
                populateLlmCards(window.aiAnalysisResult);
            }

            if (tab === 'alarm') {
                loadAlarmHistory();
                loadRecipients();
            }

            if (tab === 'spatial') {
                loadFloorPlan(currentFloor);
                setTimeout(() => { redrawFloorPlan(); renderZoneCards(); renderFloorPlanSensors(allSensors); }, 200);
            }

            setTimeout(resizeCharts, 50);
        });
    });
}

async function fetchAndRender() {
    const errorEl = document.getElementById('data-load-error');
    try {
        const resp = await fetch(`${API_BASE}/api/data`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        allSensors = data.sensors || [];
        if (!allSensors.length) throw new Error('API 未回傳感測器資料');
        errorEl?.classList.add('hidden');
        renderDashboard(allSensors);
        renderFloorPlanSensors(allSensors);
        renderZoneCards();
        addZoomHint();
    } catch (err) {
        console.error('數據取得失敗:', err);
        if (errorEl) {
            errorEl.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> 無法取得即時資料：請先啟動後端服務，再按「刷新」。';
            errorEl.classList.remove('hidden');
        }
        document.querySelector('.status-dot')?.classList.replace('online', 'offline');
    }
}

function renderDashboard(sensors) {
    if (!sensors.length) return;
    const temps = sensors.map(s => s.temperature).filter(v => v != null);
    const humids = sensors.map(s => s.humidity).filter(v => v != null);
    const avgT = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
    const avgH = (humids.reduce((a, b) => a + b, 0) / humids.length).toFixed(1);
    const alarms = sensors.filter(s => {
        const al = (s.alarm_level || 'none').toLowerCase();
        return al === 'warning' || al === 'critical';
    });
    const compliant = sensors.filter(s => {
        const t = s.temperature;
        const h = s.humidity;
        return t != null && h != null && t >= 18 && t <= 25 && h >= 20 && h <= 60;
    }).length;
    const compliancePct = ((compliant / sensors.length) * 100).toFixed(1);

    document.getElementById('kpi-avg-temp').textContent = avgT + ' °C';
    document.getElementById('kpi-avg-humid').textContent = avgH + ' %';
    document.getElementById('kpi-compliance').textContent = compliancePct + ' %';
    document.getElementById('kpi-active-alarms').textContent = alarms.length;
    document.getElementById('active-alarms-count').textContent = alarms.length;

    renderBarChart('chart-temp-bar', sensors, 'temperature', '溫度 (°C)', 'rgba(96,165,250,0.85)', '#3b82f6');
    renderBarChart('chart-humid-bar', sensors, 'humidity', '濕度 (%)', 'rgba(52,211,153,0.85)', '#10b981');
    renderAlarmPieChart('chart-alarm-pie', sensors);
    fetchTrendDataAndRender();
    renderTable(sensors);
}

function renderBarChart(domId, sensors, field, label, barColor, lineColor) {
    const el = document.getElementById(domId);
    if (!el) return;
    let chart = echarts.getInstanceByDom(el);
    if (!chart) chart = echarts.init(el, 'dark');
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', formatter: params => `${params[0].name}<br/>${label}: <b>${params[0].value}</b>` },
        grid: { left: 50, right: 60, top: 35, bottom: 60 },
        xAxis: { type: 'category', data: sensors.map(s => s.sensor_id), axisLabel: { rotate: 30, fontSize: 11 } },
        yAxis: { type: 'value', name: label, nameTextStyle: { fontSize: 10 }, min: field === 'temperature' ? 10 : 0, max: field === 'temperature' ? 35 : 80 },
        series: [{
            type: 'bar', data: sensors.map(s => {
                const al = (s.alarm_level || 'none').toLowerCase();
                return {
                    value: s[field],
                    itemStyle: {
                        color: al === 'critical' ? '#ef4444' : al === 'warning' ? '#f59e0b' : barColor,
                        borderRadius: [4, 4, 0, 0]
                    }
                };
            }),
            markLine: {
                data: field === 'temperature' ? [
                    { yAxis: 18, lineStyle: { color: '#60a5fa', type: 'dashed' }, label: { formatter: '下限 18°C' } },
                    { yAxis: 25, lineStyle: { color: '#f59e0b', type: 'dashed' }, label: { formatter: '上限 25°C' } }
                ] : field === 'humidity' ? [
                    { yAxis: 20, lineStyle: { color: '#60a5fa', type: 'dashed' }, label: { formatter: '下限 20%' } },
                    { yAxis: 60, lineStyle: { color: '#f59e0b', type: 'dashed' }, label: { formatter: '上限 60%' } }
                ] : []
            }
        }]
    });
}

let _currentSensorFilter = 'all';
let _currentSensorSort = { field: null, asc: true };
let _allSensorsCache = [];
let _trendFloorFilter = 'all';

function filterSensorTable(filter) {
    _currentSensorFilter = filter;
    document.querySelectorAll('.sensor-filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.sensor-filter-btn[data-filter="${filter}"]`);
    if (btn) btn.classList.add('active');
    renderTable(_allSensorsCache);
}

function sortSensorTable(field) {
    if (_currentSensorSort.field === field) {
        _currentSensorSort.asc = !_currentSensorSort.asc;
    } else {
        _currentSensorSort.field = field;
        _currentSensorSort.asc = true;
    }
    renderTable(_allSensorsCache);
}

function setTrendFloor(floor) {
    _trendFloorFilter = floor;
    document.querySelectorAll('.trend-floor-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.trend-floor-btn[data-floor="${floor}"]`);
    if (btn) btn.classList.add('active');
    fetchTrendDataAndRender();
}

function renderTable(sensors) {
    const tbody = document.getElementById('sensor-table-body');
    if (!tbody) return;
    _allSensorsCache = sensors;
    let filtered = [...sensors];
    if (_currentSensorFilter === '4F' || _currentSensorFilter === '2F') {
        filtered = filtered.filter(s => s.floor === _currentSensorFilter);
    } else if (_currentSensorFilter === 'alarm') {
        filtered = filtered.filter(s => {
            const al = (s.alarm_level || 'none').toLowerCase();
            return al === 'warning' || al === 'critical';
        });
    }
    if (_currentSensorSort.field) {
        const f = _currentSensorSort.field;
        const asc = _currentSensorSort.asc ? 1 : -1;
        filtered.sort((a, b) => {
            const va = a[f] ?? '';
            const vb = b[f] ?? '';
            if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * asc;
            return String(va).localeCompare(String(vb)) * asc;
        });
    }
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#6b7280;padding:20px;">無符合條件的感測器</td></tr>';
        return;
    }
    const now = Date.now();
    tbody.innerHTML = filtered.map(s => {
        const al = (s.alarm_level || 'none').toLowerCase();
        const ts = s.timestamp ? new Date(s.timestamp).getTime() : 0;
        const isOffline = ts > 0 && (now - ts) > 2 * 60 * 1000;
        const statusHtml = isOffline
            ? '<span class="status-badge offline">離線</span>'
            : '<span class="status-badge online">在線</span>';
        return `<tr>
            <td><strong>${s.sensor_id}</strong></td>
            <td>${s.floor || '--'}</td>
            <td>${s.location || '--'}</td>
            <td>${s.temperature != null ? s.temperature.toFixed(1) : '--'}</td>
            <td>${s.humidity != null ? s.humidity.toFixed(1) : '--'}</td>
            <td><span class="status-badge ${s.temp_status}">${s.temp_status || '--'}</span></td>
            <td><span class="status-badge ${s.humid_status}">${s.humid_status || '--'}</span></td>
            <td><span class="status-badge ${al}">${al.toUpperCase()}</span></td>
            <td style="font-size:0.72rem;color:var(--color-text-muted)">${s.alarm_code || '--'}</td>
            <td>${statusHtml}</td>
        </tr>`;
    }).join('');
}

let floorplanImg = null;
let currentFloor = '4F';
let pinModeActive = false;
let canvas2D, ctx2D, heatCanvas, heatCtx, overlayDiv;
let canvasWidth = 0, canvasHeight = 0;
let imgOffsetX = 0, imgOffsetY = 0, imgDrawW = 0, imgDrawH = 0;
const FLOOR_PLAN_IMAGES = { '4F': '4F/master.webp', '2F': '2F/master.webp' };
const FLOOR_PLAN_TITLES = { '4F': '4F 廠區平面圖 — Wiwynn AI Server', '2F': '2F SMT/BFT 廠區平面圖 — Wiwynn PCB 製造' };

const ZONES_4F = [
    { id: 'zone1', name: '物料區', nameEn: 'Material Zone', img: '4F/1.webp',
      color: '#4CAF50', sensors: ['SEN-01','SEN-02','SEN-03'],
      region: { x: 2, y: 5, w: 25, h: 45 } },
    { id: 'zone2', name: '組裝區', nameEn: 'Assembly Zone', img: '4F/2.webp',
      color: '#2196F3', sensors: ['SEN-04','SEN-05','SEN-06'],
      region: { x: 30, y: 30, w: 35, h: 40 } },
    { id: 'zone3', name: '測試區1', nameEn: 'Burn-in & Function Test', img: '4F/3.webp',
      color: '#FFC107', sensors: ['SEN-07','SEN-08','SEN-09'],
      region: { x: 68, y: 5, w: 30, h: 40 } },
    { id: 'zone4', name: '測試區2', nameEn: 'System Integration & QA', img: '4F/4.webp',
      color: '#9C27B0', sensors: ['SEN-10','SEN-11'],
      region: { x: 2, y: 55, w: 35, h: 40 } },
    { id: 'zone5', name: '包裝出區', nameEn: 'Packaging Zone', img: '4F/5.webp',
      color: '#FF9800', sensors: ['SEN-12','SEN-13'],
      region: { x: 60, y: 55, w: 35, h: 40 } }
];

const ZONES_2F = [
    { id: 'z14', name: 'SMT物料與備料區', nameEn: 'SMT Material & Prep', img: '2F/1.webp',
      color: '#4CAF50', sensors: ['SEN-14','SEN-15'],
      region: { x: 20, y: 5, w: 18, h: 20 } },
    { id: 'z16', name: 'SMT製程產線區', nameEn: 'SMT Process Line', img: '2F/2.webp',
      color: '#2196F3', sensors: ['SEN-16','SEN-17'],
      region: { x: 20, y: 30, w: 35, h: 20 } },
    { id: 'z18', name: 'SMT檢測與品質區', nameEn: 'SMT Inspection & QA', img: '2F/3.webp',
      color: '#FFC107', sensors: ['SEN-18','SEN-19'],
      region: { x: 2, y: 55, w: 22, h: 35 } },
    { id: 'z20', name: 'BFT製程產線區', nameEn: 'BFT Process Line', img: '2F/4.webp',
      color: '#E91E63', sensors: ['SEN-20','SEN-21'],
      region: { x: 20, y: 55, w: 35, h: 20 } },
    { id: 'z22', name: 'BFT檢測與後加工區', nameEn: 'BFT Inspection & Post', img: '2F/5.webp',
      color: '#9C27B0', sensors: ['SEN-22','SEN-23'],
      region: { x: 60, y: 5, w: 30, h: 20 } },
    { id: 'z24', name: '維修返修與包裝區', nameEn: 'Repair & Packaging', img: '2F/6.webp',
      color: '#00BCD4', sensors: ['SEN-24','SEN-25'],
      region: { x: 60, y: 30, w: 30, h: 20 } },
    { id: 'z26', name: '成品倉儲與出貨區', nameEn: 'Finished Goods & Shipping', img: '2F/7.webp',
      color: '#FF9800', sensors: ['SEN-26','SEN-27'],
      region: { x: 60, y: 55, w: 30, h: 35 } }
];

function getZonesForFloor(floor) {
    return floor === '2F' ? ZONES_2F : ZONES_4F;
}

function loadFloorPlan(floor) {
    const placeholder = document.getElementById('floor-placeholder');
    const palace = document.querySelector('.palace-layout');
    const title = document.getElementById('floorplan-title');

    if (floor !== '4F' && floor !== '2F') {
        if (placeholder) placeholder.classList.remove('hidden');
        if (palace) palace.classList.add('hidden');
        if (title) title.textContent = FLOOR_PLAN_TITLES[floor] || `${floor} 尚未配置`;
        return;
    }

    if (placeholder) placeholder.classList.add('hidden');
    if (palace) palace.classList.remove('hidden');

    const source = FLOOR_PLAN_IMAGES[floor];
    if (!source) return;
    floorplanImg = null;
    if (title) title.textContent = FLOOR_PLAN_TITLES[floor] || '廠區平面圖';
    const img = new Image();
    img.onload = () => {
        floorplanImg = img;
        renderZoneCards();
        requestAnimationFrame(() => {
            redrawFloorPlan();
            renderFloorPlanSensors(allSensors);
        });
    };
    img.onerror = () => console.warn(`${floor} 平面圖載入失敗`);
    img.src = source + '?t=' + Date.now();
}

function initFloorPlan() {
    canvas2D = document.getElementById('floorplan-canvas');
    ctx2D = canvas2D.getContext('2d');
    heatCanvas = document.getElementById('heatmap-canvas');
    heatCtx = heatCanvas.getContext('2d');
    overlayDiv = document.getElementById('sensor-overlay');

    loadFloorPlan(currentFloor);
    renderZoneCards();

    document.getElementById('floor-plan-upload').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const img2 = new Image();
            img2.onload = () => { floorplanImg = img2; redrawFloorPlan(); };
            img2.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    document.querySelectorAll('.floor-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.floor-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFloor = btn.dataset.floor;
            loadFloorPlan(currentFloor);
            renderZoneCards();
        });
    });

    document.getElementById('toggle-pin-mode').addEventListener('click', () => {
        if (pinModeActive) { stopPinMode(); return; }
        startPinMode();
    });

    document.getElementById('reset-pins-btn').addEventListener('click', () => {
        if (!window.__TEST_MODE__ && !confirm('確定要重設所有感測器標定位置回預設值嗎？')) return;
        sensorPositions = JSON.parse(JSON.stringify(PRESET_SENSOR_POSITIONS));
        saveSensorPositions();
        stopPinMode();
        renderFloorPlanSensors(allSensors);
    });

    document.getElementById('heatmap-toggle').addEventListener('change', () => { renderFloorPlanSensors(allSensors); });

    canvas2D.addEventListener('click', onFloorPlanClick);
    overlayDiv.addEventListener('click', onFloorPlanClick);

    new ResizeObserver(() => { if (document.getElementById('tab-spatial').classList.contains('active')) redrawFloorPlan(); })
        .observe(document.getElementById('tab-spatial'));
}

function renderZoneCards() {
    for (let i = 1; i <= 7; i++) {
        const slot = document.getElementById('zone-slot-' + i);
        if (slot) slot.innerHTML = '';
    }
    const zones = getZonesForFloor(currentFloor);
    zones.forEach((zone, idx) => {
        const slot = document.getElementById('zone-slot-' + (idx + 1));
        if (!slot) return;
        const sensorHtml = zone.sensors.map(sid => {
            const s = allSensors.find(x => x.sensor_id === sid);
            const temp = s ? s.temperature.toFixed(1) : '--';
            const humid = s ? s.humidity.toFixed(1) : '--';
            const level = s ? (s.alarm_level || 'none') : 'none';
            return `<div class="zone-sensor-item">
                <span class="zone-sensor-dot ${level}"></span>
                <span class="zone-sensor-id">${sid}</span>
                <span class="zone-sensor-val">${temp}°C / ${humid}%</span>
            </div>`;
        }).join('');
        slot.innerHTML = `
            <div class="zone-card" style="--zone-color: ${zone.color}">
                <div class="zone-card-header" style="background:${zone.color}">
                    <span class="zone-card-num">${idx + 1}</span>
                    <div>
                        <div class="zone-card-name">${zone.name}</div>
                        <div class="zone-card-name-en">${zone.nameEn}</div>
                    </div>
                </div>
                <div class="zone-card-img">
                    <img src="${zone.img}?t=${Date.now()}" alt="${zone.name}" loading="lazy">
                </div>
                <div class="zone-card-sensors">${sensorHtml}</div>
            </div>
        `;
    });
}

function redrawFloorPlan() {
    const wrapper = canvas2D.parentElement;
    canvasWidth = wrapper.clientWidth;
    canvasHeight = wrapper.clientHeight;
    canvas2D.width = canvasWidth;
    canvas2D.height = canvasHeight;
    heatCanvas.width = canvasWidth;
    heatCanvas.height = canvasHeight;
    ctx2D.clearRect(0, 0, canvasWidth, canvasHeight);
    heatCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (floorplanImg) {
        const scaleX = canvasWidth / floorplanImg.width;
        const scaleY = canvasHeight / floorplanImg.height;
        const scale = Math.min(scaleX, scaleY) * 0.96;
        imgDrawW = floorplanImg.width * scale;
        imgDrawH = floorplanImg.height * scale;
        imgOffsetX = (canvasWidth - imgDrawW) / 2;
        imgOffsetY = (canvasHeight - imgDrawH) / 2;
        ctx2D.drawImage(floorplanImg, imgOffsetX, imgOffsetY, imgDrawW, imgDrawH);
    } else {
        imgDrawW = canvasWidth;
        imgDrawH = canvasHeight;
        imgOffsetX = 0;
        imgOffsetY = 0;

        ctx2D.fillStyle = '#0d1117';
        ctx2D.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx2D.fillStyle = 'rgba(255,255,255,0.2)';
        ctx2D.font = '16px Inter';
        ctx2D.fillText('請上傳廠區平面圖 (或點擊右上角「標定模式」在下方進行標定)', canvasWidth / 2 - 240, canvasHeight / 2);
    }
    renderFloorPlanSensors(allSensors);
}

function normToCanvas(nx, ny) {
    if (!imgDrawW || !imgDrawH) return { x: -9999, y: -9999 };
    return { x: imgOffsetX + nx * imgDrawW, y: imgOffsetY + ny * imgDrawH };
}

function canvasToNorm(cx, cy) {
    if (!imgDrawW || !imgDrawH) return { nx: 0.5, ny: 0.5 };
    return { nx: (cx - imgOffsetX) / imgDrawW, ny: (cy - imgOffsetY) / imgDrawH };
}

function renderFloorPlanSensors(sensors) {
    if (!canvas2D) return;
    overlayDiv.innerHTML = '';
    heatCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (!sensors.length) return;

    const filtered = sensors.filter(s => s.floor === currentFloor);

    if (document.getElementById('heatmap-toggle')?.checked) {
        drawHeatmap(filtered);
    }

    const tooltip = document.getElementById('fp-hover-tooltip');

    filtered.forEach(s => {
        const pos = sensorPositions[s.sensor_id];
        if (!pos) return;
        const { x, y } = normToCanvas(pos.nx, pos.ny);
        const level = s.alarm_level || 'none';

        let pulseClass = '';
        if (level === 'critical') pulseClass = 'pulse-critical';
        else if (level === 'warning') pulseClass = 'pulse-warning';

        const pin = document.createElement('div');
        pin.className = `sensor-pin`;
        pin.style.left = x + 'px';
        pin.style.top = y + 'px';
        pin.style.pointerEvents = pinModeActive ? 'none' : 'all';

        const dotColor = level === 'critical' ? 'critical' : level === 'warning' ? 'warning' : 'normal';
        pin.innerHTML = `
            <div class="pin-dot ${dotColor} ${pulseClass}">${s.sensor_id.replace('SEN-', '')}</div>
            <div class="pin-label">${s.sensor_id}</div>
        `;

        pin.addEventListener('mouseenter', (e) => {
            const badgeLvl = level.toUpperCase();
            tooltip.dataset.activeSensorId = s.sensor_id;

            tooltip.innerHTML = `
                <div class="tt-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px;">
                    <span class="tt-id" style="color:#a78bfa; font-weight:700; font-family:var(--font-outfit);">${s.sensor_id}</span>
                    <span class="tt-badge ${badgeLvl}">${badgeLvl}</span>
                </div>
                <div class="tt-body" style="font-size:0.75rem; line-height:1.5;">
                    <div class="tt-row" style="margin-bottom:2px;">🌡️ 溫度: <span class="tt-val" style="color:#fff; font-weight:600;">${s.temperature != null ? s.temperature.toFixed(1) + ' °C' : '--'}</span></div>
                    <div class="tt-row" style="margin-bottom:2px;">💧 濕度: <span class="tt-val" style="color:#fff; font-weight:600;">${s.humidity != null ? s.humidity.toFixed(1) + ' %' : '--'}</span></div>
                    <div class="tt-row" style="margin-bottom:6px;">📍 位置: <span class="tt-val" style="color:#fff; font-weight:600;">${s.floor || ''} ${s.location || ''}</span></div>
                </div>
            `;
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 14) + 'px';
            tooltip.style.top  = (e.clientY) + 'px';

        });

        pin.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.clientX + 14) + 'px';
            tooltip.style.top  = (e.clientY) + 'px';
        });

        pin.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });

        pin.addEventListener('click', (e) => {
            if (pinModeActive) return;
            e.stopPropagation();
            tooltip.style.display = 'none';
            showSensorPopup(s);
        });

        overlayDiv.appendChild(pin);
    });
}


function drawHeatmap(sensors) {
    const positioned = sensors.filter(s => sensorPositions[s.sensor_id]);
    if (positioned.length === 0) return;

    const RADIUS = Math.max(30, Math.min(imgDrawW || canvasWidth, imgDrawH || canvasHeight) * 0.15);
    heatCtx.save();
    heatCtx.globalAlpha = 0.45;

    positioned.forEach(s => {
        const pos = sensorPositions[s.sensor_id];
        const { x, y } = normToCanvas(pos.nx, pos.ny);
        const t = s.temperature || 25;
        const tNorm = Math.max(0, Math.min(1, (t - 18) / 18));
        const grad = heatCtx.createRadialGradient(x, y, 0, x, y, RADIUS);
        const col = tempToHeatColor(tNorm);
        grad.addColorStop(0, col.replace('1)', '0.75)'));
        grad.addColorStop(0.5, col.replace('1)', '0.35)'));
        grad.addColorStop(1, col.replace('1)', '0)'));
        heatCtx.fillStyle = grad;
        heatCtx.beginPath();
        heatCtx.arc(x, y, RADIUS, 0, Math.PI * 2);
        heatCtx.fill();
    });
    heatCtx.restore();
}

function tempToHeatColor(t) {
    if (t < 0.2) return `rgba(59,130,246,1)`;
    if (t < 0.4) return `rgba(16,185,129,1)`;
    if (t < 0.65) return `rgba(245,158,11,1)`;
    return `rgba(239,68,68,1)`;
}

function onFloorPlanClick(e) {
    if (!pinModeActive) return;
    const rect = overlayDiv.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    if (cx < imgOffsetX || cx > imgOffsetX + imgDrawW || cy < imgOffsetY || cy > imgOffsetY + imgDrawH) return;
    const { nx, ny } = canvasToNorm(cx, cy);
    const sel = document.getElementById('pin-target-select');
    const sensorId = sel ? sel.value : null;
    if (!sensorId) return;
    sensorPositions[sensorId] = { nx, ny, floor: currentFloor };
    saveSensorPositions();
    renderFloorPlanSensors(allSensors);
    renderZoneCards();
}

function startPinMode() {
    pinModeActive = true;
    document.getElementById('toggle-pin-mode').classList.add('active');
    document.getElementById('pin-mode-hint').classList.remove('hidden');
    canvas2D.style.cursor = 'crosshair';
    const sel = document.getElementById('pin-target-select');
    if (sel) {
        const floorSensors = allSensors.filter(s => s.floor === currentFloor);
        sel.innerHTML = floorSensors.map(s => {
            const pos = sensorPositions[s.sensor_id];
            const tag = pos ? ' ✓' : '';
            return `<option value="${s.sensor_id}">${s.sensor_id} (${s.floor}${tag})</option>`;
        }).join('');
    }
}

function stopPinMode() {
    pinModeActive = false;
    document.getElementById('toggle-pin-mode').classList.remove('active');
    document.getElementById('pin-mode-hint').classList.add('hidden');
    canvas2D.style.cursor = 'default';
}

const SENSOR_POSITION_SCHEMA = 5;
const PRESET_SENSOR_POSITIONS = {
    "SEN-01": { nx: 0.08, ny: 0.20, floor: "4F" },
    "SEN-02": { nx: 0.15, ny: 0.35, floor: "4F" },
    "SEN-03": { nx: 0.22, ny: 0.15, floor: "4F" },
    "SEN-04": { nx: 0.40, ny: 0.40, floor: "4F" },
    "SEN-05": { nx: 0.50, ny: 0.50, floor: "4F" },
    "SEN-06": { nx: 0.55, ny: 0.60, floor: "4F" },
    "SEN-07": { nx: 0.75, ny: 0.15, floor: "4F" },
    "SEN-08": { nx: 0.82, ny: 0.25, floor: "4F" },
    "SEN-09": { nx: 0.88, ny: 0.35, floor: "4F" },
    "SEN-10": { nx: 0.10, ny: 0.70, floor: "4F" },
    "SEN-11": { nx: 0.20, ny: 0.80, floor: "4F" },
    "SEN-12": { nx: 0.70, ny: 0.70, floor: "4F" },
    "SEN-13": { nx: 0.80, ny: 0.80, floor: "4F" },
    "SEN-14": { nx: 0.10, ny: 0.12, floor: "2F" },
    "SEN-15": { nx: 0.18, ny: 0.22, floor: "2F" },
    "SEN-16": { nx: 0.34, ny: 0.12, floor: "2F" },
    "SEN-17": { nx: 0.42, ny: 0.22, floor: "2F" },
    "SEN-18": { nx: 0.58, ny: 0.12, floor: "2F" },
    "SEN-19": { nx: 0.66, ny: 0.22, floor: "2F" },
    "SEN-20": { nx: 0.82, ny: 0.12, floor: "2F" },
    "SEN-21": { nx: 0.90, ny: 0.22, floor: "2F" },
    "SEN-22": { nx: 0.10, ny: 0.65, floor: "2F" },
    "SEN-23": { nx: 0.18, ny: 0.75, floor: "2F" },
    "SEN-24": { nx: 0.34, ny: 0.65, floor: "2F" },
    "SEN-25": { nx: 0.42, ny: 0.75, floor: "2F" },
    "SEN-26": { nx: 0.58, ny: 0.65, floor: "2F" },
    "SEN-27": { nx: 0.66, ny: 0.75, floor: "2F" }
};

async function saveSensorPositions() {
    try {
        await fetch('/api/positions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ positions: sensorPositions })
        });
    } catch (e) { console.error('saveSensorPositions failed:', e); }
}

async function loadSensorPositions() {
    try {
        const resp = await fetch('/api/positions');
        if (resp.ok) {
            const data = await resp.json();
            if (data.positions && Object.keys(data.positions).length > 0) {
                sensorPositions = data.positions;
                return;
            }
        }
    } catch (e) {
        console.warn('loadSensorPositions from server failed, trying localStorage fallback');
    }
    try {
        const stored = localStorage.getItem('sensorPositionsV2');
        if (stored && localStorage.getItem('sensorPositionSchema') === String(SENSOR_POSITION_SCHEMA)) {
            sensorPositions = JSON.parse(stored);
            if (!sensorPositions || Object.keys(sensorPositions).length === 0) {
                sensorPositions = JSON.parse(JSON.stringify(PRESET_SENSOR_POSITIONS));
                saveSensorPositions();
            }
            return;
        }
    } catch (e) {}
    sensorPositions = JSON.parse(JSON.stringify(PRESET_SENSOR_POSITIONS));
}

function setupRefreshBtn() {
    const btn = document.getElementById('refresh-data-btn');
    if (btn) btn.addEventListener('click', forceRefreshAll);
}

async function forceRefreshAll() {
    const btn = document.getElementById('refresh-data-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 更新中...';
    }
    try {
        await fetchAndRender();
        fetchTrendDataAndRender();
        fetchMomCharts();
        fetchYoYCharts();
        const activeTab = document.querySelector('.menu-item.active')?.dataset?.tab;
        if (activeTab === 'alarm') {
            loadAlarmHistory();
            loadRecipients();
        }
        if (activeTab === 'spatial') {
            loadFloorPlan(currentFloor);
            setTimeout(() => { redrawFloorPlan(); renderZoneCards(); renderFloorPlanSensors(allSensors); }, 200);
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-rotate"></i> 全站更新';
        }
    }
}

function renderAlarmPieChart(domId, sensors) {
    const el = document.getElementById(domId);
    if (!el) return;
    let chart = echarts.getInstanceByDom(el);
    if (!chart) chart = echarts.init(el, 'dark');

    const counts = { normal: 0, warning: 0, critical: 0 };
    sensors.forEach(s => {
        const al = s.alarm_level || 'none';
        if (al === 'critical') counts.critical++;
        else if (al === 'warning') counts.warning++;
        else counts.normal++;
    });

    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', formatter: '{b}: <b>{c} 個 ({d}%)</b>' },
        legend: { orient: 'horizontal', bottom: 0, textStyle: { fontSize: 10 } },
        series: [{
            type: 'pie',
            radius: ['45%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#1f2937', borderWidth: 2 },
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
            data: [
                { value: counts.normal, name: '正常', itemStyle: { color: '#10b981' } },
                { value: counts.warning, name: '警告', itemStyle: { color: '#f59e0b' } },
                { value: counts.critical, name: '臨界異常', itemStyle: { color: '#ef4444' } }
            ]
        }]
    });
}

async function fetchTrendDataAndRender() {
    const elLine = document.getElementById('chart-trend-line');
    const elRadar = document.getElementById('chart-radar');
    const elScatter = document.getElementById('chart-scatter');
    const elRank = document.getElementById('chart-alarm-rank');
    const elBox = document.getElementById('chart-boxplot');

    try {
        const resp = await fetch('/api/stats');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const records = data.latest_records || [];

        if (elLine) {
            let chartLine = echarts.getInstanceByDom(elLine) || echarts.init(elLine, 'dark');
            if (records.length > 0) {
                const sortedRecords = [...records].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                let filteredRecords = sortedRecords;
                if (_trendFloorFilter !== 'all') {
                    filteredRecords = sortedRecords.filter(r => r.floor === _trendFloorFilter);
                }
                const sensorIds = [...new Set(filteredRecords.map(r => r.sensor_id))];
                const tempColors = ['#3b82f6','#22c55e','#eab308','#ef4444','#06b6d4','#a855f7','#f97316','#ec4899','#14b8a6','#84cc16','#6366f1','#f43f5e','#0ea5e9'];
                const series = [];
                sensorIds.forEach((sid, idx) => {
                    const sData = filteredRecords.filter(r => r.sensor_id === sid);
                    const color = tempColors[idx % tempColors.length];
                    series.push({
                        name: sid + ' 溫度',
                        type: 'line',
                        yAxisIndex: 0,
                        showSymbol: false,
                        smooth: true,
                        lineStyle: { width: 2 },
                        itemStyle: { color },
                        data: sData.map(r => [new Date(r.timestamp), r.temperature_c])
                    });
                    series.push({
                        name: sid + ' 濕度',
                        type: 'line',
                        yAxisIndex: 1,
                        showSymbol: false,
                        smooth: true,
                        lineStyle: { width: 1.5, type: 'dashed' },
                        itemStyle: { color, opacity: 0.6 },
                        data: sData.map(r => [new Date(r.timestamp), r.humidity_rh])
                    });
                });
                chartLine.setOption({
                    backgroundColor: 'transparent',
                    tooltip: { trigger: 'axis' },
                    legend: { data: series.map(s => s.name), textStyle: { fontSize: 9 }, top: 0, type: 'scroll' },
                    grid: { left: 50, right: 55, top: 40, bottom: 50 },
                    xAxis: { type: 'time', axisLabel: { fontSize: 10, rotate: 20 } },
                    yAxis: [
                        { type: 'value', name: '溫度 (°C)', nameTextStyle: { fontSize: 10 }, position: 'left' },
                        { type: 'value', name: '濕度 (%)', nameTextStyle: { fontSize: 10 }, position: 'right', splitLine: { show: false } }
                    ],
                    series: series
                }, true);
            } else {
                chartLine.setOption({
                    backgroundColor: 'transparent',
                    graphic: [{
                        type: 'text',
                        left: 'center', top: 'middle',
                        style: { text: '暫無歷史記錄資料\n請確認 log.csv 是否有數據', fill: '#6b7280', fontSize: 14, textAlign: 'center' }
                    }]
                }, true);
            }
        }

        if (elRadar) {
            let chartRadar = echarts.getInstanceByDom(elRadar) || echarts.init(elRadar, 'dark');
            if (records.length > 0) {
                renderRadarChart(chartRadar, records);
            } else {
                chartRadar.setOption({ backgroundColor: 'transparent', graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: '暫無資料', fill: '#6b7280', fontSize: 14 } }] }, true);
            }
        }

        if (elScatter) {
            let chartScatter = echarts.getInstanceByDom(elScatter) || echarts.init(elScatter, 'dark');
            if (records.length > 0) {
                renderScatterChart(chartScatter, records);
            } else {
                chartScatter.setOption({ backgroundColor: 'transparent', graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: '暫無資料', fill: '#6b7280', fontSize: 14 } }] }, true);
            }
        }

        if (elRank) {
            let chartRank = echarts.getInstanceByDom(elRank) || echarts.init(elRank, 'dark');
            if (records.length > 0) {
                renderAlarmRankChart(chartRank, records);
            } else {
                chartRank.setOption({ backgroundColor: 'transparent', graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: '暫無資料', fill: '#6b7280', fontSize: 14 } }] }, true);
            }
        }

        if (elBox) {
            let chartBox = echarts.getInstanceByDom(elBox) || echarts.init(elBox, 'dark');
            if (records.length > 0) {
                renderBoxplotChart(chartBox, records);
            } else {
                chartBox.setOption({ backgroundColor: 'transparent', graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: '暫無資料', fill: '#6b7280', fontSize: 14 } }] }, true);
            }
        }

    } catch (e) {
        console.error('歷史統計圖表加載失敗:', e);
    }
    fetchMomCharts();
    fetchYoYCharts();
}

async function fetchMomCharts() {
    try {
        const resp = await fetch('/api/history');
        if (!resp.ok) return;
        const data = await resp.json();
        const months = data.months || [];
        const momChanges = data.mom_changes || [];
        const monthLabels = months.map(m => m.month);
        const gridBase = { left: 45, right: 15, top: 35, bottom: 30 };

        const elTemp = document.getElementById('chart-mom-temp');
        if (elTemp && months.length > 0) {
            let chart = echarts.getInstanceByDom(elTemp) || echarts.init(elTemp, 'dark');
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis' },
                legend: { data: ['平均溫度', '告警數'], textStyle: { fontSize: 9 }, top: 0 },
                grid: { ...gridBase, right: 40 },
                xAxis: { type: 'category', data: monthLabels, axisLabel: { fontSize: 9, rotate: 30 } },
                yAxis: [
                    { type: 'value', name: '°C', nameTextStyle: { fontSize: 9 } },
                    { type: 'value', name: '告警', nameTextStyle: { fontSize: 9 }, splitLine: { show: false } }
                ],
                series: [
                    { name: '平均溫度', type: 'bar', barWidth: '40%', itemStyle: { color: '#ef4444' }, data: months.map(m => m.avg_temp) },
                    { name: '告警數', type: 'line', yAxisIndex: 1, itemStyle: { color: '#f59e0b' }, data: months.map(m => m.total_alarms) }
                ]
            }, true);
        }

        const elHumid = document.getElementById('chart-mom-humid');
        if (elHumid && months.length > 0) {
            let chart = echarts.getInstanceByDom(elHumid) || echarts.init(elHumid, 'dark');
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis' },
                legend: { data: ['平均濕度', '告警數'], textStyle: { fontSize: 9 }, top: 0 },
                grid: { ...gridBase, right: 40 },
                xAxis: { type: 'category', data: monthLabels, axisLabel: { fontSize: 9, rotate: 30 } },
                yAxis: [
                    { type: 'value', name: '%', nameTextStyle: { fontSize: 9 } },
                    { type: 'value', name: '告警', nameTextStyle: { fontSize: 9 }, splitLine: { show: false } }
                ],
                series: [
                    { name: '平均濕度', type: 'bar', barWidth: '40%', itemStyle: { color: '#3b82f6' }, data: months.map(m => m.avg_humid) },
                    { name: '告警數', type: 'line', yAxisIndex: 1, itemStyle: { color: '#f59e0b' }, data: months.map(m => m.total_alarms) }
                ]
            }, true);
        }
    } catch (e) {
        console.error('MoM 圖表載入失敗:', e);
    }
}

async function fetchYoYCharts() {
    try {
        const resp = await fetch('/api/yoy');
        if (!resp.ok) return;
        const data = await resp.json();
        const yoy = data.yoy || [];
        const zoneYoy = data.zone_yoy || [];
        const compliance = data.compliance || [];
        const months = [1,2,3,4,5,6,7,8,9,10,11,12];
        const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
        const years = [...new Set(yoy.map(d => d.year))].sort();
        const yearColors = ['#3b82f6','#ef4444','#22c55e','#f59e0b'];

        const elTemp = document.getElementById('chart-yoy-temp');
        if (elTemp && yoy.length) {
            let chart = echarts.getInstanceByDom(elTemp) || echarts.init(elTemp, 'dark');
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis' },
                legend: { data: years.map(String), textStyle: { fontSize: 10 }, top: 0 },
                grid: { left: 50, right: 20, top: 40, bottom: 40 },
                xAxis: { type: 'category', data: monthNames, axisLabel: { fontSize: 10 } },
                yAxis: { type: 'value', name: '°C', nameTextStyle: { fontSize: 10 } },
                series: years.map((yr, i) => ({
                    name: String(yr), type: 'line', smooth: true,
                    itemStyle: { color: yearColors[i % yearColors.length] },
                    data: months.map(m => {
                        const d = yoy.find(x => x.year === yr && x.month === m);
                        return d ? d.avg_temp : null;
                    })
                }))
            }, true);
        }

        const elHumid = document.getElementById('chart-yoy-humid');
        if (elHumid && yoy.length) {
            let chart = echarts.getInstanceByDom(elHumid) || echarts.init(elHumid, 'dark');
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis' },
                legend: { data: years.map(String), textStyle: { fontSize: 10 }, top: 0 },
                grid: { left: 50, right: 20, top: 40, bottom: 40 },
                xAxis: { type: 'category', data: monthNames, axisLabel: { fontSize: 10 } },
                yAxis: { type: 'value', name: '%', nameTextStyle: { fontSize: 10 } },
                series: years.map((yr, i) => ({
                    name: String(yr), type: 'line', smooth: true,
                    itemStyle: { color: yearColors[i % yearColors.length] },
                    data: months.map(m => {
                        const d = yoy.find(x => x.year === yr && x.month === m);
                        return d ? d.avg_humid : null;
                    })
                }))
            }, true);
        }

        const elComp = document.getElementById('chart-compliance');
        if (elComp && compliance.length) {
            let chart = echarts.getInstanceByDom(elComp) || echarts.init(elComp, 'dark');
            const compYears = [...new Set(compliance.map(d => d.year))].sort();
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', formatter: p => p[0].axisValue + '<br/>' + p.map(s => `${s.marker} ${s.seriesName}: <b>${s.value}%</b>`).join('<br/>') },
                legend: { data: compYears.map(String), textStyle: { fontSize: 10 }, top: 0 },
                grid: { left: 50, right: 20, top: 40, bottom: 40 },
                xAxis: { type: 'category', data: monthNames, axisLabel: { fontSize: 10 } },
                yAxis: { type: 'value', name: '%', max: 100, nameTextStyle: { fontSize: 10 } },
                series: compYears.map((yr, i) => ({
                    name: String(yr), type: 'bar', barWidth: '30%',
                    itemStyle: { color: yearColors[i % yearColors.length] },
                    data: months.map(m => {
                        const d = compliance.find(x => x.year === yr && x.month === m);
                        return d ? d.rate : null;
                    })
                }))
            }, true);
        }

        const elZone = document.getElementById('chart-zone-yoy');
        if (elZone && zoneYoy.length) {
            let chart = echarts.getInstanceByDom(elZone) || echarts.init(elZone, 'dark');
            const zoneNames = [...new Set(zoneYoy.map(d => d.zone_name))];
            const zoneColors = ['#4CAF50','#2196F3','#FFC107','#9C27B0','#FF9800','#E91E63','#00BCD4'];
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis' },
                legend: { data: zoneNames, textStyle: { fontSize: 10 }, top: 0 },
                grid: { left: 80, right: 20, top: 40, bottom: 40 },
                yAxis: { type: 'category', data: zoneNames, axisLabel: { fontSize: 9, width: 80, overflow: 'truncate' } },
                xAxis: { type: 'value', name: '°C', nameTextStyle: { fontSize: 10 } },
                series: years.map((yr, i) => ({
                    name: String(yr), type: 'bar',
                    itemStyle: { color: yearColors[i % yearColors.length] },
                    data: zoneNames.map(zn => {
                        const d = zoneYoy.find(x => x.year === yr && x.zone_name === zn);
                        return d ? d.avg_temp : 0;
                    })
                }))
            }, true);
        }
    } catch(e) { console.error('YoY charts failed:', e); }
}

function renderRadarChart(chart, records) {
    const zoneMap = {};
    records.forEach(r => {
        const zone = r.zone_name || r.floor || 'Unknown';
        if (!zoneMap[zone]) zoneMap[zone] = { temps: [], humids: [] };
        if (r.temperature_c != null) zoneMap[zone].temps.push(r.temperature_c);
        if (r.humidity_rh != null) zoneMap[zone].humids.push(r.humidity_rh);
    });
    const zones = Object.keys(zoneMap).slice(0, 6);
    const avgTemps = zones.map(z => (zoneMap[z].temps.reduce((a,b)=>a+b,0)/zoneMap[z].temps.length).toFixed(1));
    const avgHumids = zones.map(z => (zoneMap[z].humids.reduce((a,b)=>a+b,0)/zoneMap[z].humids.length).toFixed(1));

    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: {},
        legend: { data: ['平均溫度(°C)', '平均濕度(%)'], textStyle: { fontSize: 10 }, top: 0 },
        radar: {
            indicator: zones.map(z => ({ name: z, max: 80 })),
            splitNumber: 4,
            axisName: { fontSize: 10 }
        },
        series: [{
            type: 'radar',
            data: [
                { value: avgTemps, name: '平均溫度(°C)', areaStyle: { opacity: 0.2 }, itemStyle: { color: '#60a5fa' } },
                { value: avgHumids, name: '平均濕度(%)', areaStyle: { opacity: 0.2 }, itemStyle: { color: '#34d399' } }
            ]
        }]
    }, true);
}

function renderScatterChart(chart, records) {
    const validRecords = records.filter(r => r.temperature_c != null && r.humidity_rh != null);
    const data = validRecords.map(r => [r.temperature_c, r.humidity_rh]);
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', formatter: p => `溫度: ${p.data[0]}°C<br/>濕度: ${p.data[1]}%` },
        grid: { left: 50, right: 20, top: 35, bottom: 50 },
        xAxis: { type: 'value', name: '溫度 (°C)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', name: '濕度 (%)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10 } },
        series: [{
            type: 'scatter',
            symbolSize: 14,
            data: data,
            itemStyle: { color: '#a78bfa', opacity: 0.7 }
        }]
    }, true);
}

function renderAlarmRankChart(chart, records) {
    const codeMap = {};
    records.forEach(r => {
        if (r.alarm_code && r.alarm_code !== 'SYS_OK' && r.alarm_code !== '') {
            codeMap[r.alarm_code] = (codeMap[r.alarm_code] || 0) + 1;
        }
    });
    const sorted = Object.entries(codeMap).sort((a,b) => b[1]-a[1]).slice(0, 10);
    const names = sorted.map(x => x[0]);
    const counts = sorted.map(x => x[1]);

    if (names.length === 0) {
        chart.setOption({ backgroundColor: 'transparent', graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: '目前無活動告警', fill: '#10b981', fontSize: 16 } }] }, true);
        return;
    }

    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        grid: { left: 120, right: 20, top: 20, bottom: 20 },
        xAxis: { type: 'value', axisLabel: { fontSize: 10 } },
        yAxis: { type: 'category', data: names.reverse(), axisLabel: { fontSize: 10 } },
        series: [{
            type: 'bar',
            data: counts.reverse(),
            itemStyle: { color: '#ef4444', borderRadius: [0, 4, 4, 0] },
            label: { show: true, position: 'right', fontSize: 10, color: '#f3f4f6' }
        }]
    }, true);
}

function renderBoxplotChart(chart, records) {
    const floorMap = {};
    records.forEach(r => {
        const floor = r.floor || 'Unknown';
        if (!floorMap[floor]) floorMap[floor] = [];
        if (r.temperature_c != null) floorMap[floor].push(r.temperature_c);
    });
    const floors = Object.keys(floorMap).sort();

    function boxplotStats(arr) {
        if (!arr.length) return null;
        const sorted = [...arr].sort((a,b) => a-b);
        const n = sorted.length;
        const q1 = sorted[Math.floor(n*0.25)];
        const median = sorted[Math.floor(n*0.5)];
        const q3 = sorted[Math.floor(n*0.75)];
        const min = sorted[0];
        const max = sorted[n-1];
        return [min, q1, median, q3, max];
    }

    const boxData = floors.map(f => boxplotStats(floorMap[f])).filter(Boolean);

    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item' },
        grid: { left: 50, right: 20, top: 35, bottom: 50 },
        xAxis: { type: 'category', data: floors, axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value', name: '溫度 (°C)', nameTextStyle: { fontSize: 10 } },
        series: [{
            type: 'boxplot',
            data: boxData,
            itemStyle: { color: '#3b82f6', borderColor: '#60a5fa' }
        }]
    }, true);
}

function showSensorPopup(s) {
    const popup = document.getElementById('sensor-popup');
    if (!popup) return;

    document.getElementById('popup-sensor-id').textContent = s.sensor_id;
    const badge = document.getElementById('popup-alarm-badge');
    const level = s.alarm_level || 'none';
    badge.textContent = level.toUpperCase();
    badge.className = `popup-alarm-badge ${level.toUpperCase()}`;

    document.getElementById('popup-temp').textContent = s.temperature != null ? s.temperature.toFixed(1) : '--';
    document.getElementById('popup-humid').textContent = s.humidity != null ? s.humidity.toFixed(1) : '--';
    document.getElementById('popup-location').textContent = `${s.floor || ''} ${s.location || ''}`;
    document.getElementById('popup-alarm-code').textContent = s.alarm_code || 'SYS_OK';

    const diagText = document.getElementById('popup-diag-text');
    const diagSource = document.getElementById('popup-diag-source');

    diagText.textContent = 'AI 綜合診斷已整合至「AI 全域分析」頁籤。';
    diagSource.textContent = '';

    popup.classList.remove('hidden');
}

function closeSensorPopup() {
    const popup = document.getElementById('sensor-popup');
    if (popup) popup.classList.add('hidden');
}

async function loadRecipients() {
    try {
        const resp = await fetch('/api/alerts/recipients');
        const data = await resp.json();
        const list = document.getElementById('recipients-list');
        if (!list) return;
        list.innerHTML = (data.recipients || []).map(email =>
            `<span class="recipient-tag">${email}<button onclick="removeRecipient('${email}')">&times;</button></span>`
        ).join('');
    } catch(e) { console.error('loadRecipients failed:', e); }
}

async function addRecipient() {
    const input = document.getElementById('new-recipient');
    const email = input?.value?.trim();
    if (!email) return;
    try {
        await fetch('/api/alerts/recipients', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ action: 'add', email })
        });
        input.value = '';
        loadRecipients();
    } catch(e) { alert('新增失敗'); }
}

async function removeRecipient(email) {
    try {
        await fetch('/api/alerts/recipients', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ action: 'remove', email })
        });
        loadRecipients();
    } catch(e) { alert('刪除失敗'); }
}

let _suppressedMap = {};

async function loadSuppressed() {
    try {
        const resp = await fetch('/api/alerts/suppress');
        const data = await resp.json();
        _suppressedMap = {};
        for (const [sid, events] of Object.entries(data.suppressed || {})) {
            for (const ev of events) {
                _suppressedMap[`${sid}|${ev.event_code}`] = true;
            }
        }
    } catch(e) {}
}

async function toggleAlarmSuppress(sensorId, eventCode, suppress) {
    try {
        await fetch('/api/alerts/suppress', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ sensor_id: sensorId, event_code: eventCode, suppress })
        });
        loadSuppressed();
        loadAlarmHistory();
    } catch(e) { alert('操作失敗'); }
}

async function toggleAlarmResolve(sensorId, eventCode, resolve) {
    try {
        await fetch('/api/alerts/resolve', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ sensor_id: sensorId, event_code: eventCode, resolve })
        });
        loadAlarmHistory();
    } catch(e) { alert('操作失敗'); }
}

async function resolveAllAlarms() {
    if (!confirm('確定要解除全部告警記錄？')) return;
    try {
        await fetch('/api/alerts/resolve-all', { method: 'POST' });
        loadAlarmHistory();
    } catch(e) { alert('操作失敗'); }
}

async function loadAlarmHistory() {
    try {
        await loadSuppressed();
        const resp = await fetch('/api/alarms');
        const data = await resp.json();
        const tbody = document.getElementById('alarm-history-body');
        if (!tbody) return;
        const alarms = data.alarms || [];
        if (!alarms.length) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#6b7280;padding:20px;">暫無告警記錄</td></tr>';
            return;
        }
        tbody.innerHTML = alarms.map(a => {
            const key = `${a.sensor_id}|${a.alarm_code}`;
            const isSuppressed = _suppressedMap[key];
            const isResolved = a.resolved;
            const levelClass = a.alarm_level === 'CRITICAL' ? 'critical' : 'warning';
            const levelText = a.alarm_level === 'CRITICAL' ? '嚴重' : '警告';
            const ts = a.latest_timestamp?.replace('T',' ').slice(0,19) || '--';
            return `<tr class="${isResolved ? 'resolved-row' : ''}">
                <td>${ts}</td>
                <td><b>${a.sensor_id}</b></td>
                <td>${a.floor}</td>
                <td>${a.zone_name}</td>
                <td><span class="alarm-badge ${levelClass}">${levelText}</span></td>
                <td><code>${a.alarm_code}</code></td>
                <td><span class="alarm-count">${a.count}</span></td>
                <td>${a.temperature_c}°C</td>
                <td>${a.humidity_rh}%</td>
                <td>
                    <div class="alarm-actions">
                        <button class="btn-suppress ${isSuppressed ? 'suppressed' : ''}"
                            onclick="toggleAlarmSuppress('${a.sensor_id}','${a.alarm_code}',${!isSuppressed})"
                            title="${isSuppressed ? '恢復發送 Email' : '暫停發送 Email (24h)'}">
                            <i class="fa-solid ${isSuppressed ? 'fa-bell-slash' : 'fa-bell'}"></i>
                            ${isSuppressed ? '已暫停' : '暫停'}
                        </button>
                        <button class="btn-resolve ${isResolved ? 'resolved' : ''}"
                            onclick="toggleAlarmResolve('${a.sensor_id}','${a.alarm_code}',${!isResolved})"
                            title="${isResolved ? '取消解除' : '解除此告警（停止 Email 且標記為已處理）'}">
                            <i class="fa-solid ${isResolved ? 'fa-rotate-left' : 'fa-circle-check'}"></i>
                            ${isResolved ? '已解除' : '解除'}
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch(e) { console.error('loadAlarmHistory failed:', e); }
}

window.aiAnalysisResult = null;

function populateLlmCards(data) {
    const el = document.getElementById('llm-report-content');
    if (!el) return;
    const report = data.report || data.temp || '';
    if (report) {
        let html = report;
        html = html.replace(/\n\n+/g, '\n\n');
        html = html.replace(/^## (.+)$/gm, '\n\n<h2>$1</h2>\n\n');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/`(.+?)`/g, '<code>$1</code>');
        html = html.replace(/([。；])\s*(?=[^\s<\n])/g, '$1<br>');
        html = html.replace(/\n/g, '<br>');
        html = html.replace(/<br>\s*<h2>/g, '<h2>');
        html = html.replace(/<\/h2>\s*<br>/g, '</h2>');
        html = html.replace(/(<br>\s*){3,}/g, '<br><br>');
        el.innerHTML = html;
    } else {
        el.innerHTML = '<p style="color:#6b7280;">無法生成分析報告</p>';
    }
    const src = document.getElementById('groq-source-llm');
    if (src) src.textContent = data.source || 'Groq AI';
}

async function callGroqAnalysis(tab) {
    const btn = document.getElementById('btn-analyze-llm');
    const loadingBar = document.getElementById('llm-loading-bar');
    const reportEl = document.getElementById('llm-report-content');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI 分析中...';
    }
    if (loadingBar) loadingBar.classList.remove('hidden');
    if (reportEl) reportEl.innerHTML = '<span class="groq-loading"><i class="fa-solid fa-spinner fa-spin"></i> 正在分析全廠數據，請稍候...</span>';

    try {
        const resp = await fetch('/api/llm_analysis');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        window.aiAnalysisResult = data;
        populateLlmCards(data);
    } catch (e) {
        if (reportEl) reportEl.innerHTML = '<p style="color:#ef4444;">呼叫 LLM API 時發生異常，請稍後再試。</p>';
        const src = document.getElementById('groq-source-llm');
        if (src) src.textContent = 'system-error';
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> 執行全廠 AI 診斷';
        }
        if (loadingBar) loadingBar.classList.add('hidden');
    }
}

function resizeCharts() {
    document.querySelectorAll('.chart-container').forEach(el => {
        const chart = echarts.getInstanceByDom(el);
        if (chart) chart.resize();
    });
}

window.addEventListener('resize', resizeCharts);

async function exportTrendCSV() {
    try {
        const resp = await fetch('/api/data');
        const data = await resp.json();
        const sensors = data.sensors || [];
        if (!sensors.length) { alert('無資料可匯出'); return; }
        const headers = ['sensor_id','floor','location','temperature','humidity','temp_status','humid_status','alarm_level','alarm_code','timestamp'];
        const rows = sensors.map(s => headers.map(h => {
            let v = s[h];
            if (v == null) v = '';
            if (typeof v === 'string' && v.includes(',')) v = '"' + v + '"';
            return v;
        }).join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sensor_data_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch(e) { alert('匯出失敗: ' + e.message); }
}

/* ============================================
   ROI 效益分析 Tab — 流程圖循環動畫 & 數字計數器
   ============================================ */
let _roiAnimated = false;
let _roiFlowTimers = [];

function animateROI() {
    if (_roiAnimated) return;
    _roiAnimated = true;

    // 1) Flow chain — 一直循環 A→B→C→...→A
    document.querySelectorAll('.flow-chain').forEach(chain => {
        const items = chain.querySelectorAll('.flow-node, .flow-arrow');
        const nodes = chain.querySelectorAll('.flow-node');
        const cycleMs = items.length * 320; // 每步 320ms

        // 初始狀態：全部暗
        items.forEach(el => {
            el.style.transition = 'opacity 0.3s ease, filter 0.3s ease, transform 0.3s ease';
            el.style.opacity = '0.2';
            el.style.filter = 'brightness(0.4)';
        });

        function runCycle() {
            // 先全暗
            items.forEach(el => {
                el.style.opacity = '0.2';
                el.style.filter = 'brightness(0.4)';
                el.style.transform = el.classList.contains('flow-node') ? 'scale(0.92)' : '';
            });

            // 逐步亮起
            items.forEach((el, i) => {
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.filter = 'brightness(1)';
                    if (el.classList.contains('flow-node')) {
                        el.style.transform = 'scale(1.08)';
                    }
                }, i * 320);
            });

            // 最後一個亮完後，逐步暗回去
            setTimeout(() => {
                for (let i = items.length - 1; i >= 0; i--) {
                    setTimeout(() => {
                        items[i].style.opacity = '0.2';
                        items[i].style.filter = 'brightness(0.4)';
                        if (items[i].classList.contains('flow-node')) {
                            items[i].style.transform = 'scale(0.92)';
                        }
                    }, (items.length - 1 - i) * 200);
                }
            }, items.length * 320 + 600);
        }

        runCycle();
        const tid = setInterval(runCycle, cycleMs + 1400);
        _roiFlowTimers.push(tid);
    });

    // 2) KPI number count-up（只跑一次）
    document.querySelectorAll('.roi-kpi-num[data-target]').forEach(el => {
        const target = parseInt(el.dataset.target);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const duration = 1500;
        const start = performance.now();
        function step(now) {
            const pct = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - pct, 3);
            const val = Math.round(target * ease);
            if (target >= 1000000) {
                el.textContent = prefix + (val / 10000).toFixed(0) + '萬' + suffix;
            } else {
                el.textContent = prefix + val.toLocaleString() + suffix;
            }
            if (pct < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    });

    // 3) Ring chart animation
    document.querySelectorAll('.ring-fill').forEach(circle => {
        const pct = parseInt(circle.dataset.pct) || 0;
        const circumference = 2 * Math.PI * 52;
        const offset = circumference - (pct / 100) * circumference;
        setTimeout(() => { circle.style.strokeDashoffset = offset; }, 400);
    });

    // 4) Impact cards stagger
    document.querySelectorAll('.roi-card').forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, 600 + i * 150);
    });

    // 5) Table rows stagger
    document.querySelectorAll('.roi-table tbody tr').forEach((row, i) => {
        row.style.opacity = '0';
        row.style.transition = 'opacity 0.4s ease';
        setTimeout(() => { row.style.opacity = '1'; }, 800 + i * 100);
    });
}

// Hook into tab switching
document.addEventListener('click', e => {
    const item = e.target.closest('.menu-item');
    if (item && item.dataset.tab === 'roi') {
        setTimeout(animateROI, 150);
    }
});
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.menu-item[data-tab="roi"]')?.classList.contains('active')) {
        setTimeout(animateROI, 500);
    }
});
