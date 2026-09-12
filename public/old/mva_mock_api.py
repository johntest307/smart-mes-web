"""Mock MVA Dashboard API – complete schema matching the original backend."""
import json, time, random, math
from datetime import datetime, timedelta
from flask import Flask, Response, jsonify, request

app = Flask(__name__)

LINES = [
    {"line_id": "SMT-A1", "line_name": "SMT A1 產線", "actual_mva": 128500, "std_mva": 120000, "mva_variance": 8500, "roi_percent": 18.5, "payback_months": 22, "downtime_loss": 45000, "scrap_units": 120, "good_units": 9880, "energy_cost_per_unit": 3.2, "throughput_uph": 420, "oee": 86.2, "last_updated": time.time()},
    {"line_id": "SMT-A2", "line_name": "SMT A2 產線", "actual_mva": 115000, "std_mva": 120000, "mva_variance": -5000, "roi_percent": 12.1, "payback_months": 28, "downtime_loss": 72000, "scrap_units": 210, "good_units": 9790, "energy_cost_per_unit": 3.8, "throughput_uph": 380, "oee": 79.4, "last_updated": time.time()},
    {"line_id": "ASM-B1", "line_name": "組裝 B1 產線", "actual_mva": 98000, "std_mva": 95000, "mva_variance": 3000, "roi_percent": 15.3, "payback_months": 25, "downtime_loss": 38000, "scrap_units": 85, "good_units": 9915, "energy_cost_per_unit": 2.9, "throughput_uph": 350, "oee": 83.7, "last_updated": time.time()},
    {"line_id": "TST-C1", "line_name": "測試 C1 產線", "actual_mva": 87000, "std_mva": 90000, "mva_variance": -3000, "roi_percent": 10.8, "payback_months": 30, "downtime_loss": 55000, "scrap_units": 150, "good_units": 9850, "energy_cost_per_unit": 4.1, "throughput_uph": 280, "oee": 76.5, "last_updated": time.time()},
    {"line_id": "PKG-D1", "line_name": "包裝 D1 產線", "actual_mva": 65000, "std_mva": 60000, "mva_variance": 5000, "roi_percent": 22.0, "payback_months": 18, "downtime_loss": 22000, "scrap_units": 45, "good_units": 9955, "energy_cost_per_unit": 1.8, "throughput_uph": 500, "oee": 88.9, "last_updated": time.time()},
]


def _jitter(line):
    l = dict(line)
    l["actual_mva"] += random.randint(-2000, 2000)
    l["mva_variance"] = l["actual_mva"] - l["std_mva"]
    l["oee"] = max(60, min(95, l["oee"] + random.uniform(-1.5, 1.5)))
    l["good_units"] += random.randint(-20, 20)
    l["scrap_units"] = max(0, l["scrap_units"] + random.randint(-5, 5))
    l["throughput_uph"] = max(100, l["throughput_uph"] + random.randint(-10, 10))
    l["downtime_loss"] = max(0, l["downtime_loss"] + random.randint(-2000, 2000))
    l["last_updated"] = time.time()
    return l


def build_dashboard_context(lines):
    if not lines:
        return {
            "variance_waterfall": [],
            "benefit_attribution": {},
            "oee_cost_loss": [],
            "scrap_rework": {},
            "labor_efficiency": {},
            "executive_view": {
                "navigation": [
                    {"id": "overview", "label": "Overview", "summary": "Executive summary of MVA and ROI"},
                    {"id": "capacity", "label": "Capacity", "summary": "Throughput and OEE focus"},
                    {"id": "quality", "label": "Quality", "summary": "Scrap, rework and FPY"},
                    {"id": "cost", "label": "Cost", "summary": "Variance and benefit recovery"},
                ],
                "chart_data": {
                    "target_vs_actual": [
                        {"label": "OEE", "target": 80.0, "actual": 0.0, "unit": "%"},
                        {"label": "FPY", "target": 97.0, "actual": 0.0, "unit": "%"},
                        {"label": "ROI", "target": 18.0, "actual": 0.0, "unit": "%"},
                    ]
                },
            },
        }

    total_variance = sum(float(l.get("mva_variance", 0) or 0) for l in lines)
    total_scrap = sum(float(l.get("scrap_units", 0) or 0) for l in lines)
    total_good = sum(float(l.get("good_units", 0) or 0) for l in lines)
    total_downtime = sum(float(l.get("downtime_loss", 0) or 0) for l in lines)
    total_energy = sum(float(l.get("energy_cost_per_unit", 0) or 0) for l in lines)
    avg_oee = sum(float(l.get("oee", 0) or 0) for l in lines) / max(1, len(lines))

    variance_waterfall = [
        {"name": "基準 MVA 差異", "variance": round(total_variance, 1), "type": "baseline", "detail": "實際 MVA 相較標準 MVA 的成本差異"},
        {"name": "品質改善收益", "variance": round(max(0, total_scrap * 0.12), 1), "type": "quality", "detail": "降低不良與返修所帶來的成本節約"},
        {"name": "停機恢復收益", "variance": round(max(0, total_downtime / 160.0), 1), "type": "downtime", "detail": "從停機損失中回收的價值創造"},
        {"name": "能耗最佳化收益", "variance": round(max(0, total_energy * 18.0), 1), "type": "energy", "detail": "單位能耗減少形成的成本改善"},
    ]

    benefit_attribution = {
        "labor_efficiency": {"label": "人工效率改善", "amount": round(max(0.0, (avg_oee - 70.0) * 180.0), 1), "unit": "USD/mo", "detail": "OEE 提升帶來的工時節省與產能釋放"},
        "quality_gain": {"label": "品質改善", "amount": round(max(0.0, total_scrap * 24.0), 1), "unit": "USD/mo", "detail": "降低不良與返修的直接財務收益"},
        "downtime_recovery": {"label": "停機回復", "amount": round(max(0.0, total_downtime * 0.45), 1), "unit": "USD/mo", "detail": "停機時間恢復帶來的產能與效率回收"},
        "energy_saving": {"label": "能耗節約", "amount": round(max(0.0, total_energy * 65.0), 1), "unit": "USD/mo", "detail": "單位能耗改善帶來的成本節約"},
        "total": 0.0,
    }
    benefit_attribution["total"] = round(sum(v["amount"] for v in benefit_attribution.values() if isinstance(v, dict)), 1)

    oee_cost_loss = []
    for l in lines:
        lo = float(l.get("oee", 0) or 0)
        oee_cost_loss.append({
            "line_id": l.get("line_id"),
            "line_name": l.get("line_name"),
            "oee": round(lo, 1),
            "estimated_cost_loss": round(max(0.0, (85.0 - lo) * 1100.0), 1),
            "band": "高風險" if lo < 70 else "中風險" if lo < 80 else "穩定",
        })

    total_units = total_good + total_scrap
    scrap_rework = {
        "scrap_cost": round(total_scrap * 24.0, 1),
        "rework_cost": round(total_good * 0.08, 1),
        "total_loss": round((total_scrap * 24.0) + (total_good * 0.08), 1),
        "scrap_rate": round((total_scrap / total_units * 100.0) if total_units else 0.0, 1),
        "rework_rate": round((total_scrap / max(total_good, 1) * 100.0) if total_good else 0.0, 1),
    }

    labor_efficiency = {
        "efficiency_index": round(1.0 + ((avg_oee / 100.0) * 0.42), 2),
        "hours_saved": round(max(0.0, (avg_oee - 75.0) * 0.35), 1),
        "productivity_gain_pct": round(max(0.0, ((avg_oee - 75.0) / 75.0) * 100.0), 1),
    }

    base_scrap_rate = (total_scrap / max(total_good + total_scrap, 1)) * 100.0
    base_rework_rate = (total_scrap / max(total_good, 1)) * 100.0
    base_time = datetime.utcnow().replace(second=0, microsecond=0)

    trend_series = []
    for i in range(100):
        p = i / 99.0
        ts = base_time - timedelta(minutes=99 - i)
        trend_series.append({
            "time": ts.isoformat() + "Z",
            "label": "T-4" if i == 0 else ts.strftime("%H:%M"),
            "oee": round(max(0.0, avg_oee + (p * 8.0) - 4.0), 1),
            "roi": round(max(0.0, (total_variance / 10.0) + (p * 3.0) - 1.0), 1),
            "fpy": round(max(0.0, (total_good / max(total_units, 1)) * 100.0 + (p * 2.5) - 1.2), 1),
            "scrap_rate": round(max(0.0, base_scrap_rate + 0.8 - (p * 0.7)), 1),
            "rework_rate": round(max(0.0, base_rework_rate + 0.6 - (p * 0.5)), 1),
            "downtime_loss": round(max(0.0, total_downtime * (1.2 - p * 0.2)), 1),
        })

    comparison_lines = []
    for l in lines:
        lg = float(l.get("good_units", 0) or 0)
        ls = float(l.get("scrap_units", 0) or 0)
        tl = lg + ls
        comparison_lines.append({
            "line_name": l.get("line_name", f"Line {l.get('line_id')}"),
            "oee": round(float(l.get("oee", 0) or 0), 1),
            "roi": round(float(l.get("roi_percent", 0) or 0), 1),
            "fpy": round((lg / max(tl, 1)) * 100.0, 1),
        })

    heatmap_rows = []
    for l in lines:
        lo = float(l.get("oee", 0) or 0)
        ld = float(l.get("downtime_loss", 0) or 0)
        lg = float(l.get("good_units", 0) or 0)
        ls = float(l.get("scrap_units", 0) or 0)
        sr = ls / max(lg + ls, 1) * 100.0
        heatmap_rows.append({
            "line_name": l.get("line_name", f"Line {l.get('line_id')}"),
            "oee_value": round(lo, 1), "oee_level": "high" if lo < 70 else "medium" if lo < 80 else "low",
            "downtime_value": round(ld, 1), "downtime_level": "high" if ld > 180 else "medium" if ld > 100 else "low",
            "quality_value": round(sr, 1), "quality_level": "high" if sr > 4 else "medium" if sr > 2.5 else "low",
            "detail": "各欄位依自身指標門檻判定風險",
        })

    detail_rows = []
    for l in lines:
        lo = float(l.get("oee", 0) or 0)
        ld = float(l.get("downtime_loss", 0) or 0)
        lv = float(l.get("mva_variance", 0) or 0)
        detail_rows.append({
            "line_name": l.get("line_name", f"Line {l.get('line_id')}"),
            "oee": round(lo, 1), "variance": round(lv, 1), "downtime": round(ld, 1),
            "alert": "High" if lo < 70 or ld > 180 else "Medium" if lo < 80 else "Low",
            "history": [
                {"label": "T-4", "oee": round(max(0.0, lo - 3.0), 1)},
                {"label": "T-3", "oee": round(max(0.0, lo - 1.0), 1)},
                {"label": "T-2", "oee": round(max(0.0, lo + 0.5), 1)},
                {"label": "T-1", "oee": round(max(0.0, lo + 1.5), 1)},
                {"label": "T0", "oee": round(lo, 1)},
            ],
            "data_lineage": {"source": "MES/IoT", "last_refresh": datetime.utcnow().isoformat() + "Z"},
        })

    target_vs_actual = [
        {"label": "OEE", "target": 80.0, "actual": round(avg_oee, 1), "unit": "%"},
        {"label": "FPY", "target": 97.0, "actual": round(max(0.0, (total_good / max(total_units, 1)) * 100.0), 1), "unit": "%"},
        {"label": "ROI", "target": 18.0, "actual": round(max(0.0, total_variance / 10.0), 1), "unit": "%"},
        {"label": "MVA", "target": round(sum(float(l.get("std_mva", 0) or 0) for l in lines), 1), "actual": round(sum(float(l.get("actual_mva", 0) or 0) for l in lines), 1), "unit": "MVA"},
    ]

    executive_view = {
        "trend": {"title": "KPI 趋势", "series": trend_series, "source": "fallback", "window": "30d", "interval": "1m"},
        "comparison": {"title": "跨產線比較", "lines": comparison_lines},
        "heatmap": {"title": "紅黃綠預警熱圖", "rows": heatmap_rows},
        "detail_rows": detail_rows,
        "views": [
            {"id": "ops", "label": "Operations View"},
            {"id": "finance", "label": "Finance View"},
            {"id": "exec", "label": "Executive View"},
        ],
        "time_ranges": [
            {"id": "day", "label": "24H"},
            {"id": "week", "label": "7D"},
            {"id": "month", "label": "30D"},
        ],
        "summary": {
            "ops": "設備與產能維持穩定，需專注於停機回收與品質改善。",
            "finance": "ROI 與成本回收呈現正向改善，短期重點是品質與能耗節流。",
            "exec": "整體戰略目標向上，建議將資源優先配置到高風險產線。",
        },
        "navigation": [
            {"id": "overview", "label": "Overview", "summary": "Executive summary of MVA and ROI"},
            {"id": "capacity", "label": "Capacity", "summary": "Throughput and OEE focus"},
            {"id": "quality", "label": "Quality", "summary": "Scrap, rework and FPY"},
            {"id": "cost", "label": "Cost", "summary": "Variance and benefit recovery"},
        ],
        "chart_data": {"target_vs_actual": target_vs_actual},
    }

    return {
        "variance_waterfall": variance_waterfall,
        "benefit_attribution": benefit_attribution,
        "oee_cost_loss": oee_cost_loss,
        "scrap_rework": scrap_rework,
        "labor_efficiency": labor_efficiency,
        "executive_view": executive_view,
    }


def _build_metrics():
    lines = [_jitter(l) for l in LINES]
    alerts = []
    for l in lines:
        if l["oee"] < 80:
            alerts.append({"line_id": l["line_id"], "line_name": l["line_name"], "severity": "low" if l["oee"] >= 75 else "medium" if l["oee"] >= 70 else "high", "message": f"OEE 低於 80% 目標 ({l['oee']:.1f}%)", "timestamp": time.time()})
        if l["mva_variance"] < 0:
            alerts.append({"line_id": l["line_id"], "line_name": l["line_name"], "severity": "high", "message": f"MVA 差異為負 ({l['mva_variance']:+,})", "timestamp": time.time()})
        if l["scrap_units"] / max(l["good_units"] + l["scrap_units"], 1) > 0.025:
            alerts.append({"line_id": l["line_id"], "line_name": l["line_name"], "severity": "medium", "message": f"不良率偏高 ({l['scrap_units'] / max(l['good_units'] + l['scrap_units'], 1) * 100:.1f}%)", "timestamp": time.time()})
    dashboard = build_dashboard_context(lines)
    return {"lines": lines, "alerts": alerts, "dashboard": dashboard}


@app.route("/api/metrics")
def metrics():
    return jsonify(_build_metrics())


@app.route("/api/metrics/stream")
def metrics_stream():
    def generate():
        while True:
            data = json.dumps(_build_metrics(), ensure_ascii=False)
            yield f"data: {data}\n\n"
            time.sleep(5)
    return Response(generate(), mimetype="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


_comments = []


@app.route("/api/saved_views", methods=["GET"])
def get_saved_views():
    return jsonify([])


@app.route("/api/saved_views", methods=["POST"])
def save_view():
    return jsonify({"ok": True})


@app.route("/api/actions", methods=["POST"])
def create_action():
    return jsonify({"ok": True})


@app.route("/api/comments", methods=["GET"])
def list_comments():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 3))
    total = len(_comments)
    total_pages = max(1, math.ceil(total / per_page))
    start = (page - 1) * per_page
    end = start + per_page
    return jsonify({"comments": _comments[start:end], "page": page, "total_pages": total_pages})


@app.route("/api/comments", methods=["POST"])
def create_comment():
    data = request.get_json(force=True) if request.is_json else {}
    comment = {"id": len(_comments) + 1, "text": data.get("text", ""), "author": data.get("author", "user"), "timestamp": time.time()}
    _comments.append(comment)
    return jsonify({"status": "created", "id": comment["id"]})


@app.route("/api/snapshot", methods=["POST"])
def snapshot():
    return jsonify({"ok": True, "message": "Snapshot saved"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False, threaded=True)
