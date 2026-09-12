# -*- coding: utf-8 -*-
"""
FastAPI Backend for AI Server Line Enterprise Solutions
Expert Level - Realistic RD Data & Decision Intelligence
"""

import os
import json
import time
import random
import sqlite3
import requests
import numpy as np
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="AI Server Line Expert API", version="3.0.0")

# Mount reports directory to serve expert_validation_report.html
REPORTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")
if not os.path.exists(REPORTS_DIR):
    os.makedirs(REPORTS_DIR)
app.mount("/reports", StaticFiles(directory=REPORTS_DIR), name="reports")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load dynamic config
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(BASE_DIR, "env_config.json")

def get_db_path():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            config = json.load(f)
            db = config.get("DB_PATH", "")
            if db and os.path.exists(db):
                return db
    candidates = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "production_line.db"),
        os.path.join(BASE_DIR, "backend", "production_line.db"),
        os.path.join(BASE_DIR, "production_line.db"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return candidates[0]

def query_db(query: str, args: tuple = (), one: bool = False):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, args)
    rv = cur.fetchall()
    conn.close()
    return (rv[0] if rv else None) if one else rv

# --- Expert Data Utilities ---
PRODUCT_LINES = [
    {
        "id": "NVL72", 
        "name": "GB200 NVL72 Rack", 
        "target_yield": 98.2, 
        "base_temp": 68.5,
        "shipping_target": 12,
        "specs": {"height": 2.6, "width": 1.4, "color": "#0f172a", "led_style": "vertical"}
    },
    {
        "id": "HGX-B200", 
        "name": "B200 HGX System", 
        "target_yield": 98.8, 
        "base_temp": 72.0,
        "shipping_target": 25,
        "specs": {"height": 2.2, "width": 1.2, "color": "#1e293b", "led_style": "horizontal"}
    },
    {
        "id": "SXM-H200", 
        "name": "H200 SXM System", 
        "target_yield": 99.1, 
        "base_temp": 65.0,
        "shipping_target": 40,
        "specs": {"height": 1.8, "width": 1.1, "color": "#334155", "led_style": "grid"}
    },
    {
        "id": "OVX-L40S", 
        "name": "L40S OVX Server", 
        "target_yield": 99.4, 
        "base_temp": 60.5,
        "shipping_target": 60,
        "specs": {"height": 1.6, "width": 1.0, "color": "#475569", "led_style": "dots"}
    },
    {
        "id": "HGX-H100", 
        "name": "HGX H100 System", 
        "target_yield": 98.5, 
        "base_temp": 70.0,
        "shipping_target": 35,
        "specs": {"height": 2.0, "width": 1.2, "color": "#1e1e1e", "led_style": "vertical"}
    }
]

def generate_rd_temp(base=68.0, sigma=2.5):
    """Generate realistic RD environment temperature using Gaussian distribution."""
    return round(np.random.normal(base, sigma), 1)

def generate_spc_yield(target=98.5, sigma=0.8):
    """Generate SPC-style yield data."""
    return round(np.random.normal(target, sigma), 2)

# --- Alert Persistence Management ---
# Global alert buffer: list of {"id", "product_id", "temp", "timestamp", "expiry"}
PERSISTENT_ALERTS = []

def update_persistent_alerts(new_critical_stations):
    global PERSISTENT_ALERTS
    current_time = time.time()
    
    # 1. Add new critical stations if not already in buffer
    for s in new_critical_stations:
        # Check if this station already has a fresh alert (not expired)
        existing = next((a for a in PERSISTENT_ALERTS if a["id"] == s["id"]), None)
        if not existing:
            PERSISTENT_ALERTS.append({
                "id": s["id"],
                "product_id": s["product_id"],
                "temp": s["metrics"]["temp"],
                "timestamp": time.strftime("%H:%M:%S"),
                "expiry": current_time + 300 # 5 minutes
            })
    
    # 2. Remove expired alerts
    PERSISTENT_ALERTS = [a for a in PERSISTENT_ALERTS if a["expiry"] > current_time]
    
    # 3. Limit to 5 most recent alerts
    PERSISTENT_ALERTS = sorted(PERSISTENT_ALERTS, key=lambda x: x["expiry"], reverse=True)[:5]

# --- Case 01: Expert Burn-in Monitor ---
@app.get("/api/burnin/stations")
def get_burnin_stations():
    stations = []
    current_critical = []
    
    # Get shortage info to determine abnormality reason
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM inventory WHERE risk_level IN ('CRITICAL', 'HIGH')")
    shortage_parts = [r[0] for r in cur.fetchall()]
    conn.close()

    for i in range(1, 6): # Use first 5 product types for digital twin
        product = PRODUCT_LINES[(i-1) % 5]
        temp = generate_rd_temp(base=product["base_temp"])
        
        # Calculate shipping progress
        # Mocking progress: some on track, some delayed
        current_progress = round(product["shipping_target"] * (0.8 + random.uniform(-0.1, 0.3)), 1)
        
        shipping_status = "ON_TRACK"
        abnormality_reason = None
        delay_detail = None
        
        if current_progress < product["shipping_target"] * 0.85:
            shipping_status = "DELAYED"
            abnormality_reason = "產能瓶頸"
            delay_detail = {
                "category": "产能瓶颈",
                "description": "SMT 貼片機台 #3 故障維修中，影響 GB200 主板日產量約 15%",
                "blocked_by": "SMT 產線",
                "personnel": {
                    "owner": "王建明 (設備工程師)",
                    "support": "李佳穎 (產線組長)",
                    "escalated_to": "陳志偉 (廠務主管)"
                },
                "root_cause": "貼片機 #3 招模組磨損超標，需更換吸嘴組件",
                "is_resolving": True,
                "resolution_step": "緊急調度備用吸嘴組件，預計 2 小時內恢復",
                "resolution_eta": "2hr",
                "resource_status": {
                    "spare_parts": "已到位 (備用吸嘴 ×2)",
                    "manpower": "充足 (2名工程師現場支援)",
                    "budget": "已核可 (維修費 ≤ NT$50K免審)",
                    "external_support": "原廠工程師已聯繫，若2hr未修復將到場"
                },
                "impact": {
                    "delay_days": 2,
                    "affected_orders": "GB200-NVL72 × 3台",
                    "oee_impact": "-4.2%"
                }
            }
        
        # If there are critical shortages, mark as ABNORMAL
        if shortage_parts and i == 1: # Force GB200 to be abnormal if shortage exists
            shipping_status = "ABNORMAL"
            abnormality_reason = f"缺料: {shortage_parts[0]}"
            delay_detail = {
                "category": "關鍵料件缺料",
                "description": f"關鍵料件「{shortage_parts[0]}」庫存已低於安全水位，影響組裝站點無法排程",
                "blocked_by": "組裝站 (Assembly Station)",
                "personnel": {
                    "owner": "林佩蓉 (採購專員)",
                    "support": "張育寧 (物控主管)",
                    "escalated_to": "黃俊傑 (供應鏈協理)"
                },
                "root_cause": f"供應商 {shortage_parts[0]} 交期延遲 +7天，安全庫存已耗盡",
                "is_resolving": True,
                "resolution_step": "已啟動替代料源評估，同步聯繫原供應商緊急追貨",
                "resolution_eta": "24-48hr",
                "resource_status": {
                    "spare_parts": "不足 (安全庫存 < 3天用量)",
                    "manpower": "充足",
                    "budget": "已預留緊急採購額度",
                    "external_support": "替代供應商評估中 (候選: 2家)"
                },
                "impact": {
                    "delay_days": 5,
                    "affected_orders": "GB200-NVL72 × 8台",
                    "oee_impact": "-8.5%"
                }
            }
        elif temp > product["base_temp"] + 8:
            shipping_status = "ABNORMAL"
            abnormality_reason = "溫控異常"
            delay_detail = {
                "category": "溫控系統異常",
                "description": f"機櫃溫度 {temp}°C 超出管制上限 ({product['base_temp']+8}°C)，觸發降頻保護",
                "blocked_by": "燒機站 (Burn-in Station)",
                "personnel": {
                    "owner": "劉家豪 (廠務工程師)",
                    "support": "吳承翰 (IT 基礎設施)",
                    "escalated_to": "陳志偉 (廠務主管)"
                },
                "root_cause": "DLC 液冷泵浦壓力異常下降，冷卻液流量不足",
                "is_resolving": True,
                "resolution_step": "已切換備用冷卻迴路，同步檢查主泵浦壓力閥",
                "resolution_eta": "1hr",
                "resource_status": {
                    "spare_parts": "已到位 (備用泵浦 ×1)",
                    "manpower": "充足 (廠務+IT 2人進場)",
                    "budget": "N/A (廠務預算內)",
                    "external_support": "CoolIT 原廠已通知待命"
                },
                "impact": {
                    "delay_days": 1,
                    "affected_orders": "GB200-NVL72 × 2台",
                    "oee_impact": "-3.0%"
                }
            }

        station_data = {
            "id": f"LINE-{product['id']}",
            "product_id": product["id"],
            "name": product["name"],
            "metrics": {
                "temp": temp,
                "shipping_target": product["shipping_target"],
                "shipping_actual": current_progress,
            },
            "status": shipping_status,
            "reason": abnormality_reason,
            "delay_detail": delay_detail,
            "specs": product["specs"]
        }
        stations.append(station_data)
        if shipping_status == "ABNORMAL":
            current_critical.append({
                "id": station_data["id"],
                "product_id": station_data["product_id"],
                "metrics": {"temp": temp},
                "status": "CRITICAL"
            })
    
    # Update global alert buffer
    update_persistent_alerts(current_critical)
    
    return {
        "stations": stations, 
        "persistent_alerts": PERSISTENT_ALERTS,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

# --- Case 03: Expert OEE & SPC ---
@app.get("/api/oee/spc-data")
def get_oee_spc():
    # Real-time synchronization: use current hour as base for history
    current_hour = int(time.strftime("%H"))
    history = []
    for i in range(24):
        # Generate 24 hours up to the current hour
        hour_val = (current_hour - (23 - i)) % 24
        history.append({
            "hour": f"{hour_val:02d}:00",
            "yield": generate_spc_yield(target=98.8),
            "ucl": 99.8,
            "lcl": 96.5,
            "target": 98.8
        })
    
    # Management indicators - Dynamic OEE based on line status
    # If any critical stations exist, reduce OEE slightly
    oee_impact = 0.5 * len(PERSISTENT_ALERTS)
    current_oee = round(92.6 - oee_impact + random.uniform(-0.2, 0.2), 1)
    
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM inventory WHERE risk_level IN ('CRITICAL', 'HIGH')")
    shortage_count = cur.fetchone()[0]
    conn.close()

    ng_count = random.randint(5, 25)
    shipping_statuses = ["提早 (Ahead)", "符合 (On Track)", "符合 (On Track)", "延誤 (Delayed)"]
    shipping_status = shipping_statuses[random.randint(0, 3)]
    repair_rate = 65 + (time.time() % 35) 
    
    return {
        "current_oee": current_oee,
        "availability": round(95.1 - (oee_impact * 0.4), 1),
        "performance": round(90.8 - (oee_impact * 0.4), 1),
        "quality": 98.8,
        "spc_history": history,
        "management": {
            "shortage_status": "缺料中" if shortage_count > 0 else "庫存充足",
            "shortage_count": shortage_count,
            "ng_count": ng_count,
            "shipping_status": shipping_status,
            "repair_rate": round(repair_rate, 1)
        }
    }

# --- Case 05: Supply Chain Resilience ---
@app.get("/api/supply/resilience")
def get_supply_resilience():
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM inventory")
    rows = cur.fetchall()
    conn.close()
    
    inventory = [dict(row) for row in rows]
    
    # Mock Supplier Data - Blackwell / GB200 Focused
    suppliers = [
        {"name": "TSMC", "component": "CoWoS / Logic Chip", "risk": "MEDIUM", "location": "Taiwan (Hsinchu)", "impact": "產能分配受限"},
        {"name": "SK Hynix", "component": "HBM3e 24GB", "risk": "HIGH", "location": "Korea (Icheon)", "impact": "良率波動導致交期不穩"},
        {"name": "CoolIT", "component": "DLC Manifold", "risk": "CRITICAL", "location": "Canada (Calgary)", "impact": "全球唯一供應商，交期延遲"},
        {"name": "Delta", "component": "Power Shelf (330kW)", "risk": "LOW", "location": "Taiwan (Taoyuan)", "impact": "供應鏈穩定，依排程出貨"},
        {"name": "Wiwynn Fab", "component": "Rack Integration", "risk": "LOW", "location": "Taiwan/Mexico", "impact": "組裝產能滿載"},
        {"name": "NVIDIA", "component": "Blackwell GPU", "risk": "CRITICAL", "location": "USA (Global)", "impact": "晶圓分配額度極度緊張"}
    ]
    
    return {
        "inventory": inventory,
        "suppliers": suppliers,
        "global_risk_index": 62,
        "eta_alerts": [
            {"part": "NV-B200-HGX-BD", "eta": "2026-08-02", "delay_days": 3},
            {"part": "DLC-PUMP-V3", "eta": "2026-08-05", "delay_days": 7}
        ]
    }

# --- Advanced: Expert Decision Agent ---
@app.get("/api/advanced/decision-insight")
def get_decision_insight():
    # Gather real evidence for analysis
    stations = get_burnin_stations()["stations"]
    critical_stations = [s for s in stations if s["status"] == "CRITICAL"]
    
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM inventory WHERE risk_level IN ('CRITICAL', 'HIGH')")
    risk_inventory = [dict(row) for row in cur.fetchall()]
    conn.close()

    # Evidence String
    evidence_parts = []
    if critical_stations:
        for s in critical_stations:
            evidence_parts.append(f"站點 {s['id']} ({s['name']}) 溫度 {s['metrics']['temp']}°C 已超出閾值。")
    
    if risk_inventory:
        for item in risk_inventory:
            evidence_parts.append(f"物料 {item['name']} 庫存僅剩 {item['stock']} 件，可支撐天數 {item['days_of_supply']} 天。")

    evidence_context = " | ".join(evidence_parts) if evidence_parts else "產線運行穩定，無即時重大異常。"

    # Attempt Ollama, fallback to Expert Logic
    ollama_url = "http://127.0.0.1:11434/api/generate"
    try:
        prompt = f"""作為智慧製造專家，請依據以下實時證據進行分析並提供專業決策建議：
證據數據：{evidence_context}
請提供繁體中文報告，包含：
1. 根因分析 (依據數據指標)
2. 業務衝擊評估 (OEE 與交付影響)
3. 三項具體處置建議 (包含負責單位與時效)"""
        
        resp = requests.post(ollama_url, json={"model": "llama3", "prompt": prompt, "stream": False}, timeout=1.5)
        if resp.status_code == 200:
            return {
                "engine": "Agentic AI (Llama3)",
                "evidence": evidence_context,
                "analysis": resp.json().get("response"),
                "severity": "HIGH" if critical_stations or risk_inventory else "LOW",
                "impact_score": 85 if critical_stations else 40
            }
    except: pass
    
    # Expert Rule Fallback
    fallback_analysis = "【專家分析報告】\n"
    if evidence_parts:
        fallback_analysis += f"【依據證據】系統偵測到以下關鍵異常指標：{evidence_context}\n\n"
        fallback_analysis += "【根因分析】系統偵測到 Blackwell GPU 模組與 DLC 液冷組件供應鏈極度緊張，伴隨 RACK-003 溫度異常，初步研判為冷卻液流速異常下降所致。\n"
        fallback_analysis += "【業務衝擊】預計影響 GB200 機櫃交付進度約 3-5 天，OEE 可能下滑 4.2%。\n"
        fallback_analysis += "【處置建議】\n1. 廠務課：立即檢查機房冷卻循環壓力 (ETA: 2hr)。\n2. 採購課：針對 CoolIT (Manifold) 與 SK Hynix (HBM3e) 啟動緊急物料追蹤與替代料撥捕 (ETA: 24hr)。\n3. 生管課：動態調整產線負荷，優先滿足已備齊料件之 H200 訂單以最大化產出。"
    else:
        fallback_analysis += "目前產線各項指標（溫度、功耗、良率、庫存）均在管制線內。建議維持現有排程並進行預防性保養維護。"

    return {
        "engine": "Expert Decision Engine (Deterministic)",
        "evidence": evidence_context,
        "analysis": fallback_analysis,
        "severity": "HIGH" if critical_stations or risk_inventory else "LOW",
        "impact_score": 85 if critical_stations else 40,
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
