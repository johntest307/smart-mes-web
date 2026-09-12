# -*- coding: utf-8 -*-
import os
import csv
import json
import datetime
import smtplib
import threading
import numpy as np
import pandas as pd
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Set
from sklearn.linear_model import LinearRegression

app = FastAPI(title="Smart Factory Temp/Humidity Monitor & AI Diagnosis System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CacheStaticMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.endswith(('.webp', '.png', '.jpg', '.glb', '.mp4', '.woff2', '.woff', '.ttf')):
            response.headers['Cache-Control'] = 'public, max-age=604800, stale-while-revalidate=86400'
        elif path.endswith(('.js', '.css')):
            response.headers['Cache-Control'] = 'public, max-age=3600'
        return response

app.add_middleware(CacheStaticMiddleware)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "log.csv")
STATIC_DIR = os.path.join(BASE_DIR, "static")

TEMP_MIN, TEMP_MAX = 18.0, 25.0
HUMID_MIN, HUMID_MAX = 20.0, 60.0

# --- State file paths ---
STATE_DIR = BASE_DIR
STATE_RESOLVED_PATH = os.path.join(STATE_DIR, "state_resolved.json")
STATE_SUPPRESSED_PATH = os.path.join(STATE_DIR, "state_suppressed.json")
STATE_RECIPIENTS_PATH = os.path.join(STATE_DIR, "state_recipients.json")
STATE_CONFIG_PATH = os.path.join(STATE_DIR, "state_config.json")
STATE_POSITIONS_PATH = os.path.join(STATE_DIR, "state_positions.json")
LOG_EMAIL_PATH = os.path.join(STATE_DIR, "log_email.json")
LOG_AUDIT_PATH = os.path.join(STATE_DIR, "log_audit.json")


# --- Persistence helpers ---
def _load_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def _save_json(path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    except Exception as e:
        print(f"[PERSIST] Failed to save {path}: {e}")


def _append_log(path, entry):
    try:
        logs = []
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                logs = json.load(f)
        logs.append(entry)
        if len(logs) > 2000:
            logs = logs[-2000:]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(logs, f, ensure_ascii=False, indent=2, default=str)
    except Exception as e:
        print(f"[LOG] Failed to append log {path}: {e}")


def _log_audit(action, endpoint, details=""):
    _append_log(LOG_AUDIT_PATH, {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "action": action,
        "endpoint": endpoint,
        "details": details,
    })


# --- Load persisted state on startup ---
_cfg = _load_json(STATE_CONFIG_PATH, {})
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "") or _cfg.get("groq_api_key", "")

_resolved_alarms: dict = {}
_resolved_alarms_raw = _load_json(STATE_RESOLVED_PATH, {})
for k, v in _resolved_alarms_raw.items():
    try:
        _resolved_alarms[k] = datetime.datetime.fromisoformat(v)
    except Exception:
        _resolved_alarms[k] = datetime.datetime.utcnow()
_resolve_lock = threading.Lock()

_suppressed_alarms: dict = {}
_suppressed_alarms_raw = _load_json(STATE_SUPPRESSED_PATH, {})
for sid, events in _suppressed_alarms_raw.items():
    _suppressed_alarms[sid] = {}
    for code, until_str in events.items():
        try:
            _suppressed_alarms[sid][code] = datetime.datetime.fromisoformat(until_str)
        except Exception:
            pass
_suppress_lock = threading.Lock()

_recipients: List[str] = _load_json(STATE_RECIPIENTS_PATH, ["itsamliu2025@gmail.com"])
_recipients_lock = threading.Lock()

_last_sent: dict = {}
_last_sent_lock = threading.Lock()

sensorPositions: dict = _load_json(STATE_POSITIONS_PATH, {})


def _save_resolved():
    _save_json(STATE_RESOLVED_PATH, {k: v.isoformat() for k, v in _resolved_alarms.items()})


def _save_suppressed():
    data = {}
    for sid, events in _suppressed_alarms.items():
        data[sid] = {code: until.isoformat() for code, until in events.items()}
    _save_json(STATE_SUPPRESSED_PATH, data)


def _save_recipients():
    _save_json(STATE_RECIPIENTS_PATH, list(_recipients))


def _save_config():
    _save_json(STATE_CONFIG_PATH, {"groq_api_key": GROQ_API_KEY})


def _save_positions():
    _save_json(STATE_POSITIONS_PATH, sensorPositions)


def groq_analysis_call(prompt: str, json_mode: bool = False) -> str:
    if not GROQ_API_KEY:
        return ""
    if len(prompt) > 4000:
        prompt = prompt[:4000] + "\n[資料已截短]"
    try:
        import time
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "qwen/qwen3.8-27b",
            "messages": [
                {"role": "system", "content": (
                    "你是廠區 HVAC 監控分析專家。嚴格規則：\n"
                    "1) 僅根據提示中提供的數據回答，不得使用外部知識或推測。\n"
                    "2) 必須嚴格按照提示中的「輸出範本」格式回覆，每段固定以【】標題開頭，每段恰好 2 句，每句 25-40 字。\n"
                    "3) 不得增減段落、不得增減句子、不得替換段落標題、不得添加範本以外的內容。\n"
                    "4) 僅用繁體中文回答，不得使用 emoji。\n"
                    "5) 數值必須與輸入數據完全一致，不得四捨五入或改寫。"
                )},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0,
            "max_tokens": 500
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        for attempt in range(2):
            resp = requests.post(url, json=payload, headers=headers, timeout=60)
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"].strip()
                return content if content else ""
            elif resp.status_code == 429:
                wait = 10
                try:
                    err = resp.json().get("error", {}).get("message", "")
                    import re
                    m = re.search(r"try again in (\d+\.?\d*)s", err)
                    if m:
                        wait = min(float(m.group(1)) + 1, 15)
                except Exception:
                    pass
                print(f"Groq 429 Rate Limit, waiting {wait}s before retry...")
                time.sleep(wait)
            else:
                print(f"[LLM] Groq API Error: {resp.status_code} - {resp.text[:200]}")
                return ""
        return ""
    except Exception as e:
        print(f"Groq API Exception: {str(e)}")
        return ""


SENSOR_HVAC_MAP = {
    "SEN-01": {"ahu": "AHU-02", "name": "2樓測試區空調-02"},
    "SEN-02": {"ahu": "AHU-02", "name": "2樓測試區空調-02"},
    "SEN-03": {"ahu": "AHU-03", "name": "2樓測試區空調-03"},
    "SEN-04": {"ahu": "AHU-04", "name": "3樓測試區空調-04"},
    "SEN-05": {"ahu": "AHU-05", "name": "3樓測試區空調-05"},
    "SEN-06": {"ahu": "AHU-06", "name": "3樓測試區空調-06"},
    "SEN-07": {"ahu": "AHU-07", "name": "4樓測試區空調-07"},
    "SEN-08": {"ahu": "AHU-08", "name": "4樓測試區空調-08"},
    "SEN-09": {"ahu": "AHU-09", "name": "4樓測試區空調-09"},
    "SEN-10": {"ahu": "AHU-10", "name": "3樓組裝區空調-10"},
    "SEN-11": {"ahu": "AHU-11", "name": "3樓組裝區空調-11"},
    "SEN-12": {"ahu": "AHU-12", "name": "2樓物料室空調-12"},
    "SEN-13": {"ahu": "AHU-13", "name": "2樓物料室空調-13"},
}

class SensorData(BaseModel):
    timestamp: str
    site_id: str
    floor: str
    zone_name: str
    sensor_id: str
    temperature_c: float
    humidity_rh: float

class ConfigData(BaseModel):
    gemini_api_key: str

class PositionsData(BaseModel):
    positions: dict

def evaluate_status(temp: float, humid: float):
    if temp < TEMP_MIN:
        temp_status = "LOW"
    elif temp > TEMP_MAX:
        temp_status = "HIGH"
    else:
        temp_status = "NORMAL"

    if humid < HUMID_MIN:
        humid_status = "LOW"
    elif humid > HUMID_MAX:
        humid_status = "HIGH"
    else:
        humid_status = "NORMAL"

    if temp_status == "NORMAL" and humid_status == "NORMAL":
        alarm_level = "NONE"
        alarm_code = "SYS_OK"
    elif temp_status != "NORMAL" and humid_status != "NORMAL":
        alarm_level = "CRITICAL"
        if temp_status == "HIGH" and humid_status == "HIGH":
            alarm_code = "ERR_BOTH_HIGH"
        elif temp_status == "LOW" and humid_status == "LOW":
            alarm_code = "ERR_BOTH_LOW"
        else:
            alarm_code = "ERR_BOTH_CRIT"
    else:
        alarm_level = "WARNING"
        if temp_status == "HIGH":
            alarm_code = "ERR_TEMP_HIGH"
        elif temp_status == "LOW":
            alarm_code = "ERR_TEMP_LOW"
        elif humid_status == "HIGH":
            alarm_code = "ERR_HUMID_HIGH"
        else:
            alarm_code = "ERR_HUMID_LOW"

    return temp_status, humid_status, alarm_level, alarm_code

def read_csv_data() -> pd.DataFrame:
    if not os.path.exists(CSV_PATH):
        df_default = pd.DataFrame(columns=[
            "timestamp", "site_id", "floor", "zone_name", "sensor_id",
            "temperature_c", "humidity_rh", "temp_status", "humidity_status",
            "alarm_level", "alarm_code"
        ])
        df_default.to_csv(CSV_PATH, index=False, encoding="utf-8")
        return df_default
    try:
        return pd.read_csv(CSV_PATH, encoding="utf-8")
    except Exception:
        return pd.read_csv(CSV_PATH, encoding="big5", errors="ignore")

def heuristic_diagnose(sensor_id: str, temp: float, humid: float, temp_stat: str, humid_stat: str, zone: str, floor: str) -> str:
    if temp_stat == 'NORMAL' and humid_stat == 'NORMAL':
        return '正常'
    hvac = SENSOR_HVAC_MAP.get(sensor_id, {'ahu': 'AHU-UNK', 'name': '未知空調'})
    recs = []
    if temp_stat == 'HIGH':
        recs.append(f"調降 {hvac['ahu']} 溫度並增加風速")
    elif temp_stat == 'LOW':
        recs.append(f"調升 {hvac['ahu']} 溫度並調小風閥")
    if humid_stat == 'HIGH':
        recs.append("啟動備用除濕機")
    elif humid_stat == 'LOW':
        recs.append("開啟加濕設備")
    action_str = "；".join(recs)
    return f"異常：{temp_stat}溫/{humid_stat}濕。建議措施：{action_str}。"

@app.post("/api/config")
def update_config(item: ConfigData):
    global GROQ_API_KEY
    GROQ_API_KEY = item.gemini_api_key
    os.environ["GROQ_API_KEY"] = GROQ_API_KEY
    _save_config()
    _log_audit("update_config", "/api/config", "key_updated")
    return {"status": "success", "msg": "Groq API 金鑰更新成功！"}

@app.get("/api/data")
def get_sensor_data():
    df = read_csv_data()
    if df.empty:
        return {"sensors": []}

    needed = ["timestamp", "sensor_id", "floor", "zone_name",
              "temperature_c", "humidity_rh", "temp_status", "humidity_status",
              "alarm_level", "alarm_code"]
    for col in needed:
        if col not in df.columns:
            df[col] = None

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.sort_values("timestamp", ascending=False)
    latest = df.groupby("sensor_id").first().reset_index()

    sensors = []
    for _, row in latest.iterrows():
        al = str(row.get("alarm_level") or "NONE").lower()
        if al in ("", "nan", "none"):
            al = "none"
        sensors.append({
            "sensor_id":   str(row.get("sensor_id", "")),
            "floor":       str(row.get("floor", "")),
            "location":    str(row.get("zone_name", "")),
            "temperature": float(row["temperature_c"]) if pd.notna(row.get("temperature_c")) else None,
            "humidity":    float(row["humidity_rh"])   if pd.notna(row.get("humidity_rh"))   else None,
            "temp_status": str(row.get("temp_status", "NORMAL")).lower(),
            "humid_status":str(row.get("humidity_status", "NORMAL")).lower(),
            "alarm_level": al,
            "alarm_code":  str(row.get("alarm_code", "")),
            "timestamp":   str(row.get("timestamp", "")),
        })

    return {"sensors": sensors}

@app.post("/api/data")
def add_sensor_data(item: SensorData):
    t_status, h_status, a_level, a_code = evaluate_status(item.temperature_c, item.humidity_rh)

    new_row = {
        "timestamp": item.timestamp,
        "site_id": item.site_id,
        "floor": item.floor,
        "zone_name": item.zone_name,
        "sensor_id": item.sensor_id,
        "temperature_c": item.temperature_c,
        "humidity_rh": item.humidity_rh,
        "temp_status": t_status,
        "humidity_status": h_status,
        "alarm_level": a_level,
        "alarm_code": a_code
    }

    file_exists = os.path.exists(CSV_PATH)
    with open(CSV_PATH, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(new_row.keys()))
        if not file_exists or os.path.getsize(CSV_PATH) == 0:
            writer.writeheader()
        writer.writerow(new_row)

    if a_level in ("WARNING", "CRITICAL"):
        check_and_send_alarm(
            item.sensor_id, a_code, a_level,
            item.temperature_c, item.humidity_rh, item.zone_name
        )

    return new_row

@app.get("/api/stats")
def get_stats():
    df = read_csv_data()
    if df.empty:
        return {"total_alarms": 0, "hotspots": [], "summary": {}}

    alarm_df = df[df["alarm_level"] != "NONE"]
    total_alarms = len(alarm_df)

    hotspot_counts = alarm_df.groupby(["sensor_id", "floor", "zone_name"]).size().reset_index(name="count")
    hotspot_counts = hotspot_counts.sort_values(by="count", ascending=False).to_dict(orient="records")

    zone_stats = df.groupby("zone_name").agg(
        avg_temp=("temperature_c", "mean"),
        avg_humid=("humidity_rh", "mean"),
        warnings=("alarm_level", lambda x: sum(x == "WARNING")),
        criticals=("alarm_level", lambda x: sum(x == "CRITICAL"))
    ).reset_index().to_dict(orient="records")

    return {
        "total_alarms": total_alarms,
        "hotspots": hotspot_counts,
        "zone_stats": zone_stats,
        "latest_records": df.sort_values(by="timestamp", ascending=False).head(100).to_dict(orient="records")
    }

@app.get("/api/history")
def get_history():
    df = read_csv_data()
    if df.empty:
        return {"months": [], "sensors": []}
    df['dt'] = pd.to_datetime(df['timestamp'])
    df['month'] = df['dt'].dt.to_period('M').astype(str)
    monthly = df.groupby(['month', 'sensor_id']).agg(
        avg_temp=('temperature_c', 'mean'),
        avg_humid=('humidity_rh', 'mean'),
        max_temp=('temperature_c', 'max'),
        min_temp=('temperature_c', 'min'),
        max_humid=('humidity_rh', 'max'),
        min_humid=('humidity_rh', 'min'),
        record_count=('temperature_c', 'count')
    ).reset_index()
    for col in ['avg_temp','avg_humid','max_temp','min_temp','max_humid','min_humid']:
        monthly[col] = monthly[col].round(1)
    overall = df.groupby('month').agg(
        avg_temp=('temperature_c', 'mean'),
        avg_humid=('humidity_rh', 'mean'),
        total_alarms=('alarm_level', lambda x: sum(x != 'NONE')),
        record_count=('temperature_c', 'count')
    ).reset_index()
    overall['avg_temp'] = overall['avg_temp'].round(1)
    overall['avg_humid'] = overall['avg_humid'].round(1)
    overall_sorted = overall.sort_values('month')
    mom_changes = []
    rows = overall_sorted.to_dict(orient='records')
    for i in range(1, len(rows)):
        prev = rows[i-1]
        curr = rows[i]
        temp_diff = round(curr['avg_temp'] - prev['avg_temp'], 1)
        humid_diff = round(curr['avg_humid'] - prev['avg_humid'], 1)
        mom_changes.append({
            'month': curr['month'],
            'temp_change': temp_diff,
            'humid_change': humid_diff,
            'temp_trend': 'up' if temp_diff > 0 else 'down' if temp_diff < 0 else 'flat',
            'humid_trend': 'up' if humid_diff > 0 else 'down' if humid_diff < 0 else 'flat'
        })
    return {
        "months": overall.to_dict(orient="records"),
        "by_sensor": monthly.to_dict(orient="records"),
        "mom_changes": mom_changes
    }

@app.post("/api/history/save")
def save_history_record():
    df = read_csv_data()
    if df.empty:
        raise HTTPException(status_code=400, detail="無法讀取現有資料")
    now = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    new_rows = []
    for _, row in df.drop_duplicates(subset='sensor_id', keep='last').iterrows():
        new_rows.append({
            'timestamp': now,
            'site_id': row.get('site_id', 'TPE-Plant1'),
            'floor': row.get('floor', '4F'),
            'zone_name': row.get('zone_name', ''),
            'sensor_id': row['sensor_id'],
            'temperature_c': row['temperature_c'],
            'humidity_rh': row['humidity_rh'],
            'temp_status': row.get('temp_status', 'NORMAL'),
            'humidity_status': row.get('humidity_status', 'NORMAL'),
            'alarm_level': row.get('alarm_level', 'NONE'),
            'alarm_code': row.get('alarm_code', 'SYS_OK')
        })
    new_df = pd.DataFrame(new_rows)
    combined = pd.concat([df, new_df], ignore_index=True)
    combined.to_csv(CSV_PATH, index=False, encoding='utf-8')
    return {"status": "ok", "saved": len(new_rows), "timestamp": now}

@app.get("/api/yoy")
def get_yoy():
    df = read_csv_data()
    if df.empty:
        return {"yoy": [], "zone_yoy": [], "compliance": [], "alarm_trend": []}
    df['dt'] = pd.to_datetime(df['timestamp'])
    df['year'] = df['dt'].dt.year
    df['month'] = df['dt'].dt.month
    yearly = df.groupby(['year', 'month']).agg(
        avg_temp=('temperature_c', 'mean'),
        avg_humid=('humidity_rh', 'mean'),
        alarm_count=('alarm_level', lambda x: sum(x != 'NONE'))
    ).reset_index()
    yearly['avg_temp'] = yearly['avg_temp'].round(1)
    yearly['avg_humid'] = yearly['avg_humid'].round(1)
    zone_yoy = df.groupby(['year', 'zone_name']).agg(
        avg_temp=('temperature_c', 'mean'),
        avg_humid=('humidity_rh', 'mean')
    ).reset_index()
    zone_yoy['avg_temp'] = zone_yoy['avg_temp'].round(1)
    zone_yoy['avg_humid'] = zone_yoy['avg_humid'].round(1)
    df['in_temp_range'] = df['temperature_c'].between(18, 25)
    df['in_humid_range'] = df['humidity_rh'].between(20, 60)
    df['compliant'] = df['in_temp_range'] & df['in_humid_range']
    compliance = df.groupby(['year', 'month']).agg(
        total=('compliant', 'count'),
        ok=('compliant', 'sum')
    ).reset_index()
    compliance['rate'] = (compliance['ok'] / compliance['total'] * 100).round(1)
    alarm_trend = df.groupby(['year', 'month', 'alarm_level']).size().reset_index(name='count')
    return {
        "yoy": yearly.to_dict(orient='records'),
        "zone_yoy": zone_yoy.to_dict(orient='records'),
        "compliance": compliance[['year', 'month', 'rate']].to_dict(orient='records'),
        "alarm_trend": alarm_trend.to_dict(orient='records')
    }

@app.get("/api/predict")
def predict_trends(sensor_id: Optional[str] = None):
    df = read_csv_data()
    if df.empty:
        raise HTTPException(status_code=400, detail="無歷史資料可進行時序預測")

    predictions = {}
    df['dt'] = pd.to_datetime(df['timestamp'])

    for sensor_id_loop in df['sensor_id'].unique():
        sensor_df = df[df['sensor_id'] == sensor_id_loop].sort_values(by='dt')

        if len(sensor_df) < 2:
            latest = sensor_df.iloc[-1]
            latest_temp = float(latest['temperature_c'])
            latest_humid = float(latest['humidity_rh'])
            sensor_pred = []
            for hour in range(1, 5):
                pred_temp = latest_temp + (hour * 0.15)
                pred_humid = latest_humid - (hour * 0.3)
                t_status, h_status, a_level, a_code = evaluate_status(pred_temp, pred_humid)
                sensor_pred.append({
                    "hour": hour,
                    "temperature_c": round(pred_temp, 2),
                    "humidity_rh": round(pred_humid, 2),
                    "temp_status": t_status,
                    "humidity_status": h_status,
                    "alarm_level": a_level,
                    "alarm_code": a_code
                })
            predictions[sensor_id_loop] = sensor_pred
            continue

        first_time = sensor_df['dt'].min()
        sensor_df = sensor_df.copy()
        sensor_df['time_offset'] = (sensor_df['dt'] - first_time).dt.total_seconds()

        X = sensor_df[['time_offset']].values
        y_temp = sensor_df['temperature_c'].values
        y_humid = sensor_df['humidity_rh'].values

        model_temp = LinearRegression().fit(X, y_temp)
        model_humid = LinearRegression().fit(X, y_humid)

        latest_offset = sensor_df['time_offset'].max()
        sensor_pred = []
        for hour in range(1, 5):
            future_offset = latest_offset + (hour * 3600)
            pred_temp = float(model_temp.predict([[future_offset]])[0])
            pred_humid = float(model_humid.predict([[future_offset]])[0])
            pred_temp = max(10.0, min(40.0, pred_temp))
            pred_humid = max(5.0, min(95.0, pred_humid))
            t_status, h_status, a_level, a_code = evaluate_status(pred_temp, pred_humid)
            sensor_pred.append({
                "hour": hour,
                "temperature_c": round(pred_temp, 2),
                "humidity_rh": round(pred_humid, 2),
                "temp_status": t_status,
                "humidity_status": h_status,
                "alarm_level": a_level,
                "alarm_code": a_code
            })
        predictions[sensor_id_loop] = sensor_pred

    if sensor_id:
        if sensor_id not in predictions:
            raise HTTPException(status_code=404, detail="找不到指定感測器的預測資料")
        frontend_preds = []
        for p in predictions[sensor_id]:
            frontend_preds.append({
                "hour": p["hour"],
                "temperature": p["temperature_c"],
                "humidity": p["humidity_rh"],
                "temp_alarm": p["alarm_level"].lower()
            })
        return {"predictions": frontend_preds}

    return predictions

@app.get("/api/llm_analysis")
def get_llm_analysis():
    df = read_csv_data()

    sensor_summary_lines = []
    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        latest = df.sort_values("timestamp", ascending=False).groupby("sensor_id").first().reset_index()
        for _, row in latest.iterrows():
            sid = row.get("sensor_id", "?")
            floor = row.get("floor", "?")
            zone = row.get("zone_name", "?")
            temp = row.get("temperature_c", None)
            humid = row.get("humidity_rh", None)
            al = str(row.get("alarm_level", "NONE")).upper()
            ac = str(row.get("alarm_code", "SYS_OK"))
            t_stat = str(row.get("temp_status", "NORMAL")).upper()
            h_stat = str(row.get("humidity_status", "NORMAL")).upper()
            temp_str = f"{temp:.1f}°C" if pd.notna(temp) else "N/A"
            humid_str = f"{humid:.1f}%" if pd.notna(humid) else "N/A"
            sensor_summary_lines.append(
                f"{sid} ({floor} {zone}): T={temp_str}[{t_stat}] H={humid_str}[{h_stat}] 告警={al}({ac})"
            )

    sensor_block = "\n".join(sensor_summary_lines) if sensor_summary_lines else "無感測器資料"
    anomalies = [l for l in sensor_summary_lines if "WARNING" in l or "CRITICAL" in l]
    anomaly_block = "\n".join(anomalies) if anomalies else "目前無異常紀錄"

    trend_summary = ""
    if not df.empty and len(df) >= 2:
        recent = df.sort_values("timestamp", ascending=False).head(100)
        t_mean = recent["temperature_c"].mean() if "temperature_c" in recent.columns else None
        h_mean = recent["humidity_rh"].mean() if "humidity_rh" in recent.columns else None
        t_max = recent["temperature_c"].max() if "temperature_c" in recent.columns else None
        h_max = recent["humidity_rh"].max() if "humidity_rh" in recent.columns else None
        alarm_count = len(recent[recent["alarm_level"] != "NONE"]) if "alarm_level" in recent.columns else 0
        trend_summary = (
            f"最近 100 筆統計: 平均溫={t_mean:.1f}°C 最高={t_max:.1f}°C "
            f"平均濕={h_mean:.1f}% 最高={h_max:.1f}% 告警筆數={alarm_count}"
        )
    else:
        trend_summary = "歷史資料不足，無法計算趨勢"

    prompt = (
        "你是一位工業廠區的 HVAC 暖通空調與廠務控制工程師專家。正常範圍為溫度 18-25°C，濕度 20-60%。\n"
        "請針對下方提供的數據，撰寫一份完整的全廠環境監控整合分析報告。\n"
        f"[全廠感測器即時溫濕度數據]\n{sensor_block}\n\n"
        f"[溫濕度趨勢資訊]\n{trend_summary}\n\n"
        "報告格式要求：\n"
        "1. 以 Markdown 撰寫，使用 ## 作為各段標題\n"
        "2. 每個 ## 標題前後各空一行（即用 \\n\\n 分隔段落）\n"
        "3. 每個段落內，不同要點之間要用換行符號 \\n 分隔，例如：\n"
        "   ## 溫度分析\n"
        "   4F 物料區三點感測均在 20~22°C，屬正常。\n"
        "   組裝區唯一低溫點 SEN-04 為 16.4°C，低於下限 18°C。\n"
        "   測試區多點低於 18°C，顯示熱源分布不均。\n"
        "4. 包含以下段落：摘要、溫度分析、濕度分析、異常感測器、趨勢預測、空間分佈、告警根因與 SOP 建議\n"
        "5. 每段 80-150 字，專業嚴謹，具體可執行\n"
        "6. 回傳 JSON: {\"report\": \"完整的 Markdown 報告內容\", \"source\": \"Groq AI (Llama 3)\"}\n"
        "7. 不得有任何 Markdown 標記（如 ```json 等）在 JSON 外"
    )

    try:
        llm_response = groq_analysis_call(prompt, json_mode=False)
        print(f"[LLM] Groq response length: {len(llm_response) if llm_response else 0}")
        if llm_response:
            import json as _json
            llm_data = None
            try:
                llm_data = _json.loads(llm_response)
            except Exception:
                import re
                json_match = re.search(r'\{[\s\S]*\}', llm_response)
                if json_match:
                    try:
                        llm_data = _json.loads(json_match.group())
                    except Exception:
                        pass
            if llm_data and llm_data.get("report"):
                return {
                    "report": llm_data["report"],
                    "source": llm_data.get("source", "Groq AI (Llama 3)")
                }
    except Exception as e:
        print(f"[LLM] Groq API call failed: {e}")

    sensor_summary_lines = []
    if not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        latest = df.sort_values("timestamp", ascending=False).groupby("sensor_id").first().reset_index()
        for _, row in latest.iterrows():
            sid = row.get("sensor_id", "?")
            floor = row.get("floor", "?")
            zone = row.get("zone_name", "?")
            temp = row.get("temperature_c", None)
            humid = row.get("humidity_rh", None)
            al = str(row.get("alarm_level", "NONE")).upper()
            ac = str(row.get("alarm_code", "SYS_OK"))
            t_stat = str(row.get("temp_status", "NORMAL")).upper()
            h_stat = str(row.get("humidity_status", "NORMAL")).upper()
            temp_str = f"{temp:.1f}°C" if pd.notna(temp) else "N/A"
            humid_str = f"{humid:.1f}%" if pd.notna(humid) else "N/A"
            sensor_summary_lines.append(
                f"{sid} ({floor} {zone}): T={temp_str}[{t_stat}] H={humid_str}[{h_stat}] 告警={al}({ac})"
            )
    sensor_block = "\n".join(sensor_summary_lines) if sensor_summary_lines else "無感測器資料"
    anomalies = [l for l in sensor_summary_lines if "WARNING" in l or "CRITICAL" in l]
    alarm_count = len(anomalies)

    t_mean = h_mean = t_max = h_max = 0
    alarm_detail = ""
    if not df.empty and len(df) >= 2:
        recent = df.sort_values("timestamp", ascending=False).head(100)
        t_mean = recent["temperature_c"].mean() if "temperature_c" in recent.columns else None
        h_mean = recent["humidity_rh"].mean() if "humidity_rh" in recent.columns else None
        t_max = recent["temperature_c"].max() if "temperature_c" in recent.columns else None
        h_max = recent["humidity_rh"].max() if "humidity_rh" in recent.columns else None
        alarm_count = len(recent[recent["alarm_level"] != "NONE"]) if "alarm_level" in recent.columns else 0
        alarm_detail = f"近100筆：平均溫 {t_mean:.1f}°C 最高 {t_max:.1f}°C 平均濕 {h_mean:.1f}% 最高 {h_max:.1f}% 告警 {alarm_count} 筆"
    else:
        alarm_detail = "歷史資料不足"

    report = f"## 摘要\n"
    report += f"全廠 {len(df)} 筆感測器數據分析，當前偵測到 {alarm_count} 個異常感測器。\n\n"
    report += f"## 溫度分析\n"
    if t_max and t_max > 25:
        report += f"偵測到 {alarm_count} 個溫度超標點，最高達 {t_max:.1f}°C，建議檢查 AHU 風機與通風道。\n\n"
    else:
        report += f"全廠溫度目前均在正常範圍 (18-25°C) 內，無需急調。\n\n"
    report += f"## 濕度分析\n"
    if h_max and h_max > 60:
        report += f"濕度偏高 (最高 {h_max:.1f}%)，可能導致結露風險，建議啟動除濕機。\n\n"
    else:
        report += f"濕度目前維持在正常範圍 (20-60%) 內。\n\n"
    report += f"## 異常感測器\n"
    if anomalies:
        report += ";\n".join(anomalies[:5]) + f"。共 {len(anomalies)} 個感測器偵測到異常。\n\n"
    else:
        report += "目前無感測器偵測到異常。\n\n"
    report += f"## 趨勢預測\n"
    report += f"{alarm_detail}\n\n"
    report += f"## 空間分佈\n"
    report += f"感測器分佈涵蓋 4F 與 2F 兩個樓層，包含物料區、組裝區、測試區與包裝出口等 zones。建議定期檢查感測器校準與清潔。\n\n"
    report += f"## 告警根因與 SOP 建議\n"
    report += f"根因：感測器數據異常可能源於環境因素（溫濕波動）或設備校準偏差。建議：1) 進行感測器校準檢查；2) 檢查通風道是否積塵阻礙; 3) 調整 AHU 風機轉速以平衡溫度分佈。\n\n"
    report += f"## 資料來源\n"
    report += f"本報告基於 {len(df)} 筆即時感測器讀數與 {len(df)} 筆歷史記錄分析而成。"

    return {"report": report, "source": "Rule Engine (Data Analysis)"}


# =============================================
# Email Alert System
# =============================================
EMAIL_CONFIG = {
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587,
    "sender": "itsamliu2025@gmail.com",
    "app_password": "uulfdwvlldolvlhw",
}
ALARM_COOLDOWN_MINUTES = 60


def _send_email(subject: str, body: str, recipients: List[str]):
    try:
        msg = MIMEMultipart()
        msg["From"] = EMAIL_CONFIG["sender"]
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html", "utf-8"))
        with smtplib.SMTP(EMAIL_CONFIG["smtp_server"], EMAIL_CONFIG["smtp_port"]) as server:
            server.starttls()
            server.login(EMAIL_CONFIG["sender"], EMAIL_CONFIG["app_password"])
            server.sendmail(EMAIL_CONFIG["sender"], recipients, msg.as_string())
        print(f"[EMAIL] Sent: {subject}")
        _append_log(LOG_EMAIL_PATH, {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "subject": subject,
            "recipients": recipients,
            "status": "sent",
        })
    except Exception as e:
        print(f"[EMAIL] Failed: {e}")
        _append_log(LOG_EMAIL_PATH, {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "subject": subject,
            "recipients": recipients,
            "status": "failed",
            "error": str(e),
        })


def check_and_send_alarm(sensor_id: str, event_code: str, level: str, temp: float, humid: float, location: str):
    now = datetime.datetime.utcnow()
    with _resolve_lock:
        if f"{sensor_id}|{event_code}" in _resolved_alarms:
            return
    with _suppress_lock:
        if sensor_id in _suppressed_alarms and event_code in _suppressed_alarms[sensor_id]:
            if now < _suppressed_alarms[sensor_id][event_code]:
                return
    with _last_sent_lock:
        key = (sensor_id, event_code)
        if key in _last_sent:
            elapsed = (now - _last_sent[key]).total_seconds() / 60
            if elapsed < ALARM_COOLDOWN_MINUTES:
                return
        _last_sent[key] = now
    with _recipients_lock:
        recipients = list(_recipients)
    if not recipients:
        return
    level_cn = {"WARNING": "警告", "CRITICAL": "嚴重"}.get(level, level)
    subject = f"⚠️ [{level_cn}] {sensor_id} - {event_code}"
    body = f"""<html><body>
    <h2 style="color:#ef4444">⚠️ 環境告警通知</h2>
    <table style="border-collapse:collapse; font-size:14px;">
    <tr><td style="padding:4px 12px;"><b>感測器</b></td><td>{sensor_id}</td></tr>
    <tr><td style="padding:4px 12px;"><b>位置</b></td><td>{location}</td></tr>
    <tr><td style="padding:4px 12px;"><b>等級</b></td><td style="color:{'#ef4444' if level=='CRITICAL' else '#f59e0b'}">{level_cn}</td></tr>
    <tr><td style="padding:4px 12px;"><b>事件</b></td><td>{event_code}</td></tr>
    <tr><td style="padding:4px 12px;"><b>溫度</b></td><td>{temp:.1f}°C</td></tr>
    <tr><td style="padding:4px 12px;"><b>濕度</b></td><td>{humid:.1f}%</td></tr>
    <tr><td style="padding:4px 12px;"><b>時間</b></td><td>{now.strftime('%Y-%m-%d %H:%M:%S')} UTC</td></tr>
    </table>
    <p style="color:#6b7280; font-size:12px; margin-top:12px;">60分鐘內相同告警不會重覆發送。</p>
    </body></html>"""
    threading.Thread(target=_send_email, args=(subject, body, recipients), daemon=True).start()


class RecipientsUpdate(BaseModel):
    action: str
    email: str

class SuppressUpdate(BaseModel):
    sensor_id: str
    event_code: str
    suppress: bool

class ResolveUpdate(BaseModel):
    sensor_id: str
    event_code: str
    resolve: bool


@app.get("/api/alerts/recipients")
def get_recipients():
    with _recipients_lock:
        return {"recipients": list(_recipients)}

@app.post("/api/alerts/recipients")
def update_recipients(req: RecipientsUpdate):
    with _recipients_lock:
        if req.action == "add" and req.email not in _recipients:
            _recipients.append(req.email)
            _save_recipients()
            _log_audit("add_recipient", "/api/alerts/recipients", req.email)
        elif req.action == "remove" and req.email in _recipients:
            _recipients.remove(req.email)
            _save_recipients()
            _log_audit("remove_recipient", "/api/alerts/recipients", req.email)
        return {"recipients": list(_recipients)}

@app.post("/api/alerts/suppress")
def toggle_suppress(req: SuppressUpdate):
    now = datetime.datetime.utcnow()
    with _suppress_lock:
        if req.suppress:
            if req.sensor_id not in _suppressed_alarms:
                _suppressed_alarms[req.sensor_id] = {}
            _suppressed_alarms[req.sensor_id][req.event_code] = now + datetime.timedelta(hours=24)
        else:
            if req.sensor_id in _suppressed_alarms:
                _suppressed_alarms[req.sensor_id].pop(req.event_code, None)
        _save_suppressed()
    _log_audit("toggle_suppress", "/api/alerts/suppress",
               f"{req.sensor_id}|{req.event_code}|suppress={req.suppress}")
    return {"status": "ok", "suppressed": dict(_suppressed_alarms)}

@app.get("/api/alerts/suppress")
def get_suppressed():
    with _suppress_lock:
        now = datetime.datetime.utcnow()
        active = {}
        for sid, events in _suppressed_alarms.items():
            for code, until in events.items():
                if now < until:
                    active.setdefault(sid, []).append({"event_code": code, "until": until.isoformat()})
        return {"suppressed": active}

@app.post("/api/alerts/resolve")
def toggle_resolve(req: ResolveUpdate):
    with _resolve_lock:
        if req.resolve:
            _resolved_alarms[f"{req.sensor_id}|{req.event_code}"] = datetime.datetime.utcnow()
        else:
            _resolved_alarms.pop(f"{req.sensor_id}|{req.event_code}", None)
        _save_resolved()
    _log_audit("toggle_resolve", "/api/alerts/resolve",
               f"{req.sensor_id}|{req.event_code}|resolve={req.resolve}")
    return {"status": "ok", "resolved": {k: v.isoformat() for k, v in _resolved_alarms.items()}}

@app.get("/api/alerts/resolve")
def get_resolved():
    with _resolve_lock:
        return {"resolved": {k: v.isoformat() for k, v in _resolved_alarms.items()}}

@app.post("/api/alerts/resolve-all")
def resolve_all_alarms():
    now = datetime.datetime.utcnow()
    df = read_csv_data()
    with _resolve_lock:
        if not df.empty:
            alarm_mask = df['alarm_level'] != 'NONE'
            alarm_sensors = df.loc[alarm_mask, ['sensor_id', 'alarm_code']].drop_duplicates()
            for _, row in alarm_sensors.iterrows():
                key = f"{row['sensor_id']}|{row['alarm_code']}"
                if key not in _resolved_alarms:
                    _resolved_alarms[key] = now
        _save_resolved()
    _log_audit("resolve_all", "/api/alerts/resolve-all", f"resolved_count={len(_resolved_alarms)}")
    return {"status": "ok", "resolved_count": len(_resolved_alarms)}

@app.get("/api/alarms")
def get_alarms():
    df = read_csv_data()
    if df.empty:
        return {"alarms": []}
    alarms_df = df[df['alarm_level'] != 'NONE'].copy()
    alarms_df['timestamp'] = pd.to_datetime(alarms_df['timestamp'], errors='coerce')

    latest = df.sort_values('timestamp', ascending=False).drop_duplicates('sensor_id', keep='first')
    active_sensors = set(latest[latest['alarm_level'] != 'NONE']['sensor_id'].values)

    alarms_df = alarms_df[alarms_df['sensor_id'].isin(active_sensors)]

    grouped = alarms_df.groupby(['sensor_id', 'alarm_code']).agg(
        latest_timestamp=('timestamp', 'max'),
        floor=('floor', 'first'),
        zone_name=('zone_name', 'first'),
        alarm_level=('alarm_level', 'first'),
        temperature_c=('temperature_c', 'last'),
        humidity_rh=('humidity_rh', 'last'),
        count=('alarm_code', 'size')
    ).reset_index()
    grouped = grouped.sort_values('latest_timestamp', ascending=False)
    result = grouped.head(100).to_dict(orient="records")
    with _resolve_lock:
        filtered = []
        for a in result:
            key = f"{a['sensor_id']}|{a['alarm_code']}"
            a['resolved'] = key in _resolved_alarms
            a['latest_timestamp'] = str(a['latest_timestamp'])
            if not a['resolved']:
                filtered.append(a)
        result = filtered
    return {"alarms": result}


# =============================================
# Chart AI Analysis API
# =============================================
class ChartAnalysisRequest(BaseModel):
    chart_type: str
    chart_title: str
    data: dict


@app.post("/api/chart_analysis")
def chart_analysis(req: ChartAnalysisRequest):
    """圖表 AI 分析：每張圖表獨立 prompt，優先使用 Groq LLM，失敗則 fallback 規則引擎。"""
    prompt = _build_chart_prompt(req.chart_type, req.chart_title, req.data)

    if GROQ_API_KEY:
        try:
            llm_resp = groq_analysis_call(prompt, json_mode=False)
            if llm_resp:
                _log_audit("chart_analysis", "/api/chart_analysis", f"{req.chart_title} [LLM]")
                return {"analysis": llm_resp, "source": "Groq AI (Llama 3)"}
        except Exception as e:
            print(f"[ChartAnalysis] Groq failed: {e}")

    analysis = _rule_chart_analysis(req.chart_type, req.chart_title, req.data)
    _log_audit("chart_analysis", "/api/chart_analysis", f"{req.chart_title} [Rule]")
    return {"analysis": analysis, "source": "規則引擎"}


def _build_chart_prompt(chart_type: str, title: str, data: dict) -> str:
    """根據圖表類型產生專屬分析 prompt，含圖表獨立的固定輸出範本。"""
    base = (
        "你是工業廠區 HVAC 暖通空調與環境監控專家。正常範圍：溫度 18-25°C，濕度 20-60%。\n"
        "請嚴格按照下方「輸出範本」格式回覆，不得改變結構。\n\n"
    )

    if chart_type == "bar_temp":
        unit = data.get("unit", "°C")
        labels = data.get("labels", [])
        values = data.get("values", [])
        series = data.get("series", [])
        if series:
            lines = []
            for s in series:
                sname = s.get("name", "?")
                for i, v in enumerate(s.get("values", [])):
                    lbl = labels[i] if i < len(labels) else f"#{i+1}"
                    lines.append(f"  {sname}-{lbl}: {v}{unit}")
        else:
            lines = [f"  {labels[i] if i < len(labels) else '#'+str(i+1)}: {v}{unit}" for i, v in enumerate(values)]
        data_block = "\n".join(lines)
        output_template = (
            "【數據摘要】\n"
            "第1句：描述全廠溫度範圍（最低~最高），說明是否全部在18-25°C內。\n"
            "第2句：指出最高溫與最低溫的感測器編號與數值。\n\n"
            "【異常分析】\n"
            "第1句：列出超出18-25°C的感測器編號與具體數值，若無超標則說明。\n"
            "第2句：說明異常感測器的位置特徵（如B區偏高）與可能影響。\n\n"
            "【根因推測】\n"
            "第1句：推測溫度偏高/偏低的最可能原因（AHU/通風/熱源/濕度）。\n"
            "第2句：排除不太可能的原因（如設備故障）。\n\n"
            "【建議措施】\n"
            "第1句：針對異常感測器的立即處理動作（如調整AHU風量）。\n"
            "第2句：中長期改善建議（如定期保養、增加監控點）。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 各感測器即時溫度：\n{data_block}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "bar_humid":
        unit = data.get("unit", "%")
        labels = data.get("labels", [])
        values = data.get("values", [])
        series = data.get("series", [])
        if series:
            lines = []
            for s in series:
                sname = s.get("name", "?")
                for i, v in enumerate(s.get("values", [])):
                    lbl = labels[i] if i < len(labels) else f"#{i+1}"
                    lines.append(f"  {sname}-{lbl}: {v}{unit}")
        else:
            lines = [f"  {labels[i] if i < len(labels) else '#'+str(i+1)}: {v}{unit}" for i, v in enumerate(values)]
        data_block = "\n".join(lines)
        output_template = (
            "【數據摘要】\n"
            "第1句：描述全廠濕度範圍（最低~最高），說明是否全部在20-60%內。\n"
            "第2句：指出最高濕度與最低濕度的感測器編號與數值。\n\n"
            "【異常分析】\n"
            "第1句：列出超出20-60%的感測器編號與具體數值，若無超標則說明。\n"
            "第2句：說明偏高（凝露風險）或偏低（靜電風險）的影響。\n\n"
            "【根因推測】\n"
            "第1句：推測濕度異常的最可能原因（外部濕氣/通風/除濕設備）。\n"
            "第2句：排除不太可能的原因。\n\n"
            "【建議措施】\n"
            "第1句：針對異常感測器的立即處理動作（如啟動除濕機）。\n"
            "第2句：中長期改善建議（如改善密封性、調整空調參數）。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 各感測器即時濕度：\n{data_block}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "pie":
        counts = data.get("counts", {})
        total = sum(counts.values()) or 1
        output_template = (
            "【數據摘要】\n"
            "第1句：說明總感測器數量與正常/警告/嚴重的數量及百分比。\n"
            "第2句：指出告警比例（警告+嚴重）是否超過20%的警戒線。\n\n"
            "【異常分析】\n"
            "第1句：說明嚴重告警的緊迫性與可能造成的影響。\n"
            "第2句：說明警告狀態的潛在風險與演變為嚴重的可能性。\n\n"
            "【根因推測】\n"
            "第1句：推測高比例告警的最可能原因（區域性空調負荷/濾網/感測器）。\n"
            "第2句：排除個別感測器故障以外的系統性問題。\n\n"
            "【建議措施】\n"
            "第1句：立即需要執行的動作（如排查嚴重節點）。\n"
            "第2句：中長期建議（如建立歷史基準對比機制）。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 正常={counts.get('normal',0)} 警告={counts.get('warning',0)} 嚴重={counts.get('critical',0)}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "line":
        series = data.get("series", [])
        labels = data.get("labels", [])
        lines = []
        for s in series:
            sname = s.get("name", "?")
            vals = s.get("values", [])
            pts = s.get("points", [])
            if vals:
                last_val = vals[-1] if vals else "N/A"
                avg_val = sum(vals) / len(vals) if vals else 0
                lines.append(f"  {sname}: {len(vals)}筆, 最新={last_val}, 平均={avg_val:.1f}")
            elif pts:
                last_val = pts[-1].get("y", "N/A") if pts else "N/A"
                lines.append(f"  {sname}: {len(pts)}筆, 最新={last_val}")
            else:
                lines.append(f"  {sname}: 無數據")
        data_block = "\n".join(lines)
        trend_labels = ", ".join(labels[:6]) if labels else "N/A"
        output_template = (
            "【數據摘要】\n"
            "第1句：描述整體趨勢方向（上升/穩定/下降）與數據筆數。\n"
            "第2句：指出最新值與平均值，說明是否在正常範圍內。\n\n"
            "【異常分析】\n"
            "第1句：找出最大波動幅度（最高-最低），說明是否有突變點。\n"
            "第2句：說明波動是否超出正常操作範圍（18-25°C或20-60%）。\n\n"
            "【根因推測】\n"
            "第1句：推測趨勢變化的原因（設備運行/外部環境/季節因素）。\n"
            "第2句：說明是否為自然波動或需要干預的異常。\n\n"
            "【建議措施】\n"
            "第1句：針對趨勢的立即監控建議。\n"
            "第2句：中長期預測與預防措施。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 時序折線（時間點：{trend_labels}）：\n{data_block}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "scatter":
        count = data.get("count", 0)
        points = data.get("points", [])
        if not count and points:
            count = len(points)
        x_vals = [p.get("x", 0) for p in points] if points else []
        y_vals = [p.get("y", 0) for p in points] if points else []
        temp_range = f"{min(x_vals):.1f}-{max(x_vals):.1f}°C" if x_vals else "N/A"
        humid_range = f"{min(y_vals):.0f}-{max(y_vals):.0f}%" if y_vals else "N/A"
        output_template = (
            "【數據摘要】\n"
            "第1句：描述數據點數量與溫度、濕度各自的範圍。\n"
            "第2句：說明整體分佈是否集中在正常範圍（溫度18-25°C、濕度20-60%）內。\n\n"
            "【異常分析】\n"
            "第1句：指出偏離正常範圍的數據點位置（如高溫高濕、低溫低濕）。\n"
            "第2句：說明異常點可能代表的環境問題。\n\n"
            "【根因推測】\n"
            "第1句：推測溫濕度相關性（正相關/負相關/無關）及其原因。\n"
            "第2句：說明是否反映空調系統控制品質。\n\n"
            "【建議措施】\n"
            "第1句：針對異常區域的環境控制改善建議。\n"
            "第2句：中長期監控策略調整建議。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 散佈圖含 {count} 個數據點（溫度 vs 濕度），"
            f"溫度範圍={temp_range}，濕度範圍={humid_range}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "radar":
        zones = data.get("zones", [])
        labels = data.get("labels", [])
        values = data.get("values", [])
        series = data.get("series", [])
        if series and zones:
            lines = []
            for s in series:
                sname = s.get("name", "?")
                vals = s.get("values", [])
                parts = [f"{zones[i]}={vals[i]}" for i in range(min(len(zones), len(vals)))]
                avg = sum(vals) / len(vals) if vals else 0
                lines.append(f"  {sname}: {', '.join(parts)}, 平均={avg:.1f}")
        elif series:
            lines = []
            for s in series:
                vals = s.get("values", [])
                avg = sum(vals) / len(vals) if vals else 0
                lines.append(f"  {s.get('name','?')}: {[round(v,1) for v in vals]}, 平均={avg:.1f}")
        elif labels and values:
            avg = sum(values) / len(values) if values else 0
            lines = [f"  {labels[i]}: {values[i]}" for i in range(len(labels))]
            lines.append(f"  平均={avg:.1f}")
        else:
            lines = ["  無數據"]
        data_block = "\n".join(lines)
        zone_list = ", ".join(zones) if zones else "各維度"
        output_template = (
            "【數據摘要】\n"
            "第1句：描述各維度指標的整體表現（哪些高、哪些低）。\n"
            "第2句：指出表現最差與最佳的維度及其數值。\n\n"
            "【異常分析】\n"
            "第1句：找出低於70分的維度，說明其風險。\n"
            "第2句：說明高分維度是否足以彌補低分維度的不足。\n\n"
            "【根因推測】\n"
            "第1句：推測低分維度的最可能原因。\n"
            "第2句：說明維度之間的相互影響關係。\n\n"
            "【建議措施】\n"
            "第1句：針對最低分維度的立即改善方案。\n"
            "第2句：整體資源配置優化建議。\n"
        )
        return base + (
            f"[圖表] {title}\n[維度] {zone_list}\n[數據]\n{data_block}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "alarm_rank":
        labels = data.get("labels", [])
        values = data.get("values", [])
        codes = data.get("codes", [])
        if codes:
            lines = [f"  {c.get('code','?')}: {c.get('count',0)}次" for c in codes]
        elif labels and values:
            lines = [f"  {labels[i]}: {values[i]}次" for i in range(len(labels))]
        else:
            lines = ["  無數據"]
        data_block = "\n".join(lines)
        output_template = (
            "【數據摘要】\n"
            "第1句：描述告警總次數與最高頻告警的代碼及次數。\n"
            "第2句：說明前3名告警佔總告警的比例。\n\n"
            "【異常分析】\n"
            "第1句：分析最高頻告警的嚴重性（是否影響生產/設備安全）。\n"
            "第2句：說明告警之間是否存在因果關係（如溫度高導致濕度異常）。\n\n"
            "【根因推測】\n"
            "第1句：推測最高頻告警的根本原因（設備老化/環境變化/設定不當）。\n"
            "第2句：說明是否為系統性問題或個別設備問題。\n\n"
            "【建議措施】\n"
            "第1句：針對最高頻告警的SOP處理步驟。\n"
            "第2句：中長期預防告警的改善方案。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 告警代碼排行：\n{data_block}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "boxplot":
        labels = data.get("labels", [])
        medians = data.get("medians", [])
        q1 = data.get("q1", [])
        q3 = data.get("q3", [])
        lines = []
        for i in range(len(labels)):
            m = medians[i] if i < len(medians) else "N/A"
            low = q1[i] if i < len(q1) else "N/A"
            high = q3[i] if i < len(q3) else "N/A"
            lines.append(f"  {labels[i]}: 中位數={m}°C, Q1={low}°C, Q3={high}°C")
        data_block = "\n".join(lines)
        output_template = (
            "【數據摘要】\n"
            "第1句：描述各樓層溫度中位數的範圍與排序。\n"
            "第2句：說明哪個樓層溫度最高、哪個最低，差距多少。\n\n"
            "【異常分析】\n"
            "第1句：找出中位數偏高（>24°C）或偏低（<20°C）的樓層。\n"
            "第2句：說明四分位距（IQR）過大的樓層代表溫度不穩定。\n\n"
            "【根因推測】\n"
            "第1句：推測樓層間溫差的原因（樓層位置/設備差異/通風條件）。\n"
            "第2句：說明離群值可能代表的問題。\n\n"
            "【建議措施】\n"
            "第1句：針對溫度異常樓層的調整建議。\n"
            "第2句：整體樓層間溫度平衡的改善方案。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 各樓層溫度分佈：\n{data_block}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "mom_temp":
        labels = data.get("labels", [])
        values = data.get("values", [])
        months = data.get("months", [])
        if months:
            lines = [f"  {m.get('month','?')}: 平均={m.get('avg','N/A')}°C, 告警={m.get('alarms',0)}筆" for m in months]
        elif labels and values:
            lines = [f"  {labels[i]}: 平均={values[i]}°C" for i in range(len(labels))]
        else:
            lines = ["  無數據"]
        data_block = "\n".join(lines)
        output_template = (
            "【數據摘要】\n"
            "第1句：描述各月溫度平均值的範圍與變化方向。\n"
            "第2句：指出溫度最高與最低的月份及其數值。\n\n"
            "【異常分析】\n"
            "第1句：找出溫度明顯偏高或偏低的月份。\n"
            "第2句：說明月與月之間的變化幅度是否異常（如突然跳升>2°C）。\n\n"
            "【根因推測】\n"
            "第1句：推測季節性溫度變化的主要原因（室外溫度/產能變化）。\n"
            "第2句：說明是否有非季節性的異常波動。\n\n"
            "【建議措施】\n"
            "第1句：針對高溫月份的空調調整建議。\n"
            "第2句：中長期的季節性調整計畫。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 月度溫度：\n{data_block}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "mom_humid":
        labels = data.get("labels", [])
        values = data.get("values", [])
        months = data.get("months", [])
        if months:
            lines = [f"  {m.get('month','?')}: 平均={m.get('avg','N/A')}%, 告警={m.get('alarms',0)}筆" for m in months]
        elif labels and values:
            lines = [f"  {labels[i]}: 平均={values[i]}%" for i in range(len(labels))]
        else:
            lines = ["  無數據"]
        data_block = "\n".join(lines)
        output_template = (
            "【數據摘要】\n"
            "第1句：描述各月濕度平均值的範圍與變化方向。\n"
            "第2句：指出濕度最高與最低的月份及其數值。\n\n"
            "【異常分析】\n"
            "第1句：找出濕度超過60%（凝露風險）或低於20%（靜電風險）的月份。\n"
            "第2句：說明梅雨季或乾季對濕度的具體影響。\n\n"
            "【根因推測】\n"
            "第1句：推測濕度季節性變化的原因（降雨/通風/除濕設備）。\n"
            "第2句：說明是否有非季節性的異常波動。\n\n"
            "【建議措施】\n"
            "第1句：針對高濕月份的除濕策略建議。\n"
            "第2句：中長期的濕度控制優化方案。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 月度濕度：\n{data_block}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "yoy_temp":
        labels = data.get("labels", [])
        values = data.get("values", [])
        years = data.get("years", [])
        if years:
            lines = []
            for yr in years:
                vals = [v.get("value") for v in yr.get("values", []) if v.get("value") is not None]
                avg = sum(vals) / len(vals) if vals else 0
                lines.append(f"  {yr.get('year','?')}年: 平均={avg:.1f}°C ({len(vals)}筆)")
        elif labels and values:
            lines = [f"  {labels[i]}: {values[i]}°C" for i in range(len(labels))]
        else:
            lines = ["  無數據"]
        data_block = "\n".join(lines)
        output_template = (
            "【數據摘要】\n"
            "第1句：描述各年度平均溫度的變化方向（變暖/變冷/穩定）。\n"
            "第2句：指出年度間的最大溫差及其數值。\n\n"
            "【異常分析】\n"
            "第1句：說明溫度變化幅度是否超出正常範圍（±1°C為正常波動）。\n"
            "第2句：指出是否呈現持續上升或下降的長期趨勢。\n\n"
            "【根因推測】\n"
            "第1句：推測年度溫度變化的原因（設備老化/產能變化/建築改善）。\n"
            "第2句：說明是否為自然變化或需要人為干預。\n\n"
            "【建議措施】\n"
            "第1句：針對溫度趨勢的設備調整建議。\n"
            "第2句：中長期的設備更新或節能計畫。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 年度溫度比較：\n{data_block}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "yoy_humid":
        labels = data.get("labels", [])
        values = data.get("values", [])
        years = data.get("years", [])
        if years:
            lines = []
            for yr in years:
                vals = [v.get("value") for v in yr.get("values", []) if v.get("value") is not None]
                avg = sum(vals) / len(vals) if vals else 0
                lines.append(f"  {yr.get('year','?')}年: 平均={avg:.1f}% ({len(vals)}筆)")
        elif labels and values:
            lines = [f"  {labels[i]}: {values[i]}%" for i in range(len(labels))]
        else:
            lines = ["  無數據"]
        data_block = "\n".join(lines)
        output_template = (
            "【數據摘要】\n"
            "第1句：描述各年度平均濕度的變化方向。\n"
            "第2句：指出年度間的最大濕差及其數值。\n\n"
            "【異常分析】\n"
            "第1句：說明濕度變化幅度是否超出正常範圍（±5%為正常波動）。\n"
            "第2句：指出是否呈現持續上升或下降的長期趨勢。\n\n"
            "【根因推測】\n"
            "第1句：推測年度濕度變化的原因（環境控制改善/建築密封性）。\n"
            "第2句：說明改善措施是否有效。\n\n"
            "【建議措施】\n"
            "第1句：針對濕度趨勢的設備調整建議。\n"
            "第2句：中長期的環境控制優化方案。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 年度濕度比較：\n{data_block}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "compliance":
        labels = data.get("labels", [])
        values = data.get("values", [])
        years = data.get("years", [])
        if years:
            lines = []
            for yr in years:
                vals = [v.get("rate") for v in yr.get("values", []) if v.get("rate") is not None]
                avg = sum(vals) / len(vals) if vals else 0
                lines.append(f"  {yr.get('year','?')}年: 平均合規率={avg:.1f}% ({len(vals)}筆)")
        elif labels and values:
            lines = [f"  {labels[i]}: {values[i]}%" for i in range(len(labels))]
        else:
            lines = ["  無數據"]
        data_block = "\n".join(lines)
        output_template = (
            "【數據摘要】\n"
            "第1句：描述各時期合規率的範圍與整體趨勢（上升/下降/穩定）。\n"
            "第2句：指出合規率最低的時期及其數值，是否低於90%目標。\n\n"
            "【異常分析】\n"
            "第1句：說明合規率低於90%的時期與可能原因。\n"
            "第2句：分析合規率下降的趨勢是否加速。\n\n"
            "【根因推測】\n"
            "第1句：推測合規率下降的主要原因（設備退化/標準提高/維護不足）。\n"
            "第2句：說明是否為系統性問題或短期波動。\n\n"
            "【建議措施】\n"
            "第1句：針對低合規率時期的立即改善行動。\n"
            "第2句：中長期的合規率提升計畫。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 合規率趨勢：\n{data_block}\n\n"
            f"輸出範本：\n{output_template}"
        )

    elif chart_type == "zone_yoy":
        zones = data.get("zones", [])
        labels = data.get("labels", [])
        series = data.get("series", [])
        lines = []
        if zones:
            for z in zones:
                zname = z.get("zone", "?")
                parts = []
                for v in z.get("values", []):
                    yr = v.get("year", "?")
                    temp = v.get("temp", "N/A")
                    parts.append(f"{yr}={temp}°C")
                lines.append(f"  {zname}: {' / '.join(parts)}")
        elif series and labels:
            for i, z in enumerate(labels):
                parts = []
                for s in series:
                    sname = s.get("name", "?")
                    vals = s.get("values", [])
                    v = vals[i] if i < len(vals) else "N/A"
                    parts.append(f"{sname}={v}°C")
                lines.append(f"  {z}: {' / '.join(parts)}")
        else:
            lines = ["  無數據"]
        data_block = "\n".join(lines)
        output_template = (
            "【數據摘要】\n"
            "第1句：描述各區域的年度溫度變化方向（變暖/變冷/穩定）。\n"
            "第2句：指出變化幅度最大的區域及其溫差。\n\n"
            "【異常分析】\n"
            "第1句：找出溫度持續上升的區域，說明其風險。\n"
            "第2句：找出改善明顯的區域，說明其正面意義。\n\n"
            "【根因推測】\n"
            "第1句：推測區域間差異的原因（設備新舊/空間位置/使用強度）。\n"
            "第2句：說明是否反映設備老化或空間規劃問題。\n\n"
            "【建議措施】\n"
            "第1句：針對惡化區域的立即改善方案。\n"
            "第2句：整體區域資源配置優化建議。\n"
        )
        return base + (
            f"[圖表] {title}\n[數據] 區域年度溫度比較：\n{data_block}\n\n"
            f"輸出範本：\n{output_template}"
        )

    output_template = (
        "【數據摘要】\n"
        "第1句：描述整體數值範圍與正常/異常比例。\n"
        "第2句：指出最關鍵的數值（最高/最低/超標）。\n\n"
        "【異常分析】\n"
        "第1句：列出超出正常範圍的具體感測器與數值。\n"
        "第2句：說明異常的嚴重程度與影響。\n\n"
        "【根因推測】\n"
        "第1句：推測最可能的 1-2 個原因。\n"
        "第2句：排除不太可能的原因。\n\n"
        "【建議措施】\n"
        "第1句：立即需要執行的 action。\n"
        "第2句：中長期改善建議。\n"
    )
    return base + f"[圖表] {title}\n[數據] {json.dumps(data, ensure_ascii=False)[:500]}\n\n輸出範本：\n{output_template}"


def _rule_chart_analysis(chart_type: str, title: str, data: dict) -> str:
    """規則引擎 fallback：與 prompt 格式一致的固定回覆。"""
    if chart_type == "bar_temp":
        values = data.get("values", [])
        if not values: return "無感測器資料。"
        over = [v for v in values if v["value"] > TEMP_MAX]
        under = [v for v in values if v["value"] < TEMP_MIN]
        ok = len(values) - len(over) - len(under)
        avg_val = sum(v["value"] for v in values) / len(values)
        max_v = max(values, key=lambda x: x["value"])
        min_v = min(values, key=lambda x: x["value"])
        over_names = ", ".join(v["name"] for v in over[:3]) if over else "無"
        under_names = ", ".join(v["name"] for v in under[:3]) if under else "無"
        parts = [f"共{len(values)}個感測器，正常{ok}個，超標{len(over)+len(under)}個。"]
        if over or under:
            parts.append(f"高溫超標{len(over)}個（{over_names}），低溫超標{len(under)}個（{under_names}）。")
        parts.append(f"全廠平均 {avg_val:.1f}°C，最高 {max_v['name']} {max_v['value']}°C，最低 {min_v['name']} {min_v['value']}°C。")
        parts.append(f"【判斷】正常率 {ok*100//len(values)}%。" + ("全廠溫度正常。" if not over and not under else "存在超標感測器，需檢查。"))
        return "".join(parts)
    elif chart_type == "bar_humid":
        values = data.get("values", [])
        if not values: return "無感測器資料。"
        over = [v for v in values if v["value"] > HUMID_MAX]
        under = [v for v in values if v["value"] < HUMID_MIN]
        ok = len(values) - len(over) - len(under)
        avg_val = sum(v["value"] for v in values) / len(values)
        max_v = max(values, key=lambda x: x["value"])
        min_v = min(values, key=lambda x: x["value"])
        over_names = ", ".join(v["name"] for v in over[:3]) if over else "無"
        under_names = ", ".join(v["name"] for v in under[:3]) if under else "無"
        parts = [f"共{len(values)}個感測器，正常{ok}個，超標{len(over)+len(under)}個。"]
        if over or under:
            parts.append(f"高濕超標{len(over)}個（{over_names}），低濕超標{len(under)}個（{under_names}）。")
        parts.append(f"全廠平均 {avg_val:.1f}%，最高 {max_v['name']} {max_v['value']}%，最低 {min_v['name']} {min_v['value']}%。")
        parts.append(f"【判斷】正常率 {ok*100//len(values)}%。" + ("全廠濕度正常。" if not over and not under else "存在超標感測器，需檢查。"))
        return "".join(parts)
    elif chart_type == "pie":
        counts = data.get("counts", {})
        total = sum(counts.values()) or 1
        n = counts.get("normal", 0)
        w = counts.get("warning", 0)
        c = counts.get("critical", 0)
        return f"共{total}個感測器，正常{n}個（{n*100//total}%），警告{w}個（{w*100//total}%），嚴重{c}個（{c*100//total}%）。【判斷】{'全廠正常。無任何告警。' if c == 0 and w == 0 else '存在異常。建議立即檢查嚴重與警告感測器。'}"
    elif chart_type == "line":
        series = data.get("series", [])
        if not series: return "無時序資料。"
        parts = [f"共{len(series)}組感測器時序資料。"]
        for s in series:
            parts.append(f"{s.get('name','?')}：{s.get('points',0)}筆資料，最新值={s.get('last','無')}。")
        parts.append("【判斷】各感測器溫濕度變化穩定。")
        return "".join(parts)
    elif chart_type == "scatter":
        count = data.get("count", 0)
        return f"散佈圖共含 {count} 個數據點。【判斷】各數據點代表感測器的溫度與濕度對應關係。"
    elif chart_type == "radar":
        series = data.get("series", [])
        zones = data.get("zones", [])
        parts = [f"共{len(zones)}個區域。"]
        for s in series:
            vals = s.get("values", [])
            if vals:
                avg = sum(vals) / len(vals)
                parts.append(f"{s.get('name','?')} 平均={avg:.1f}（{len(vals)}項指標）。")
        return "".join(parts)
    elif chart_type == "alarm_rank":
        codes = data.get("codes", [])
        if not codes: return "目前無活動告警。"
        total_a = sum(c.get("count", 0) for c in codes)
        top = codes[0] if codes else {}
        return f"共{len(codes)}種告警，總計{total_a}次。最高頻告警為 {top.get('code','?')}（{top.get('count',0)}次）。【判斷】建議優先處理最高頻告警。"
    elif chart_type == "boxplot":
        floors = data.get("floors", [])
        return f"各樓層溫度箱型圖包含 {len(floors)} 個樓層（{'、'.join(floors)}）。【判斷】箱型圖顯示各樓層溫度分佈情況。"
    elif chart_type == "mom_temp":
        months = data.get("months", [])
        if not months: return "無月度資料。"
        vals = [m.get("avg") for m in months if m.get("avg") is not None]
        if not vals: return "無有效數據。"
        mx, mn = max(vals), min(vals)
        mx_m = next(m["month"] for m in months if m.get("avg") == mx)
        mn_m = next(m["month"] for m in months if m.get("avg") == mn)
        avg_all = sum(vals) / len(vals)
        return f"共{len(months)}個月資料，月均溫範圍 {mn:.1f}~{mx:.1f}°C。最高為{mx_m}（{mx:.1f}°C），最低為{mn_m}（{mn:.1f}°C）。整體平均 {avg_all:.1f}°C，波動{'穩定' if mx-mn<3 else '較大'}。【判斷】{'月度溫度穩定。' if mx-mn<3 else '月度溫度波動需關注。'}"
    elif chart_type == "mom_humid":
        months = data.get("months", [])
        if not months: return "無月度資料。"
        vals = [m.get("avg") for m in months if m.get("avg") is not None]
        if not vals: return "無有效數據。"
        mx, mn = max(vals), min(vals)
        mx_m = next(m["month"] for m in months if m.get("avg") == mx)
        mn_m = next(m["month"] for m in months if m.get("avg") == mn)
        avg_all = sum(vals) / len(vals)
        return f"共{len(months)}個月資料，月均濕範圍 {mn:.1f}~{mx:.1f}%。最高為{mx_m}（{mx:.1f}%），最低為{mn_m}（{mn:.1f}%）。整體平均 {avg_all:.1f}%，波動{'穩定' if mx-mn<5 else '較大'}。【判斷】{'月度濕度穩定。' if mx-mn<5 else '月度濕度波動需關注。'}"
    elif chart_type == "yoy_temp":
        years = data.get("years", [])
        if not years: return "無年度比較資料。"
        parts = []
        for yr in years:
            vals = [v.get("value") for v in yr.get("values", []) if v.get("value") is not None]
            if vals:
                parts.append(f"{yr.get('year','?')}年平均 {sum(vals)/len(vals):.1f}°C（{len(vals)}筆）")
        return "；".join(parts) + "。【判斷】各年溫度均在正常範圍內。" if parts else "無有效數據。"
    elif chart_type == "yoy_humid":
        years = data.get("years", [])
        if not years: return "無年度比較資料。"
        parts = []
        for yr in years:
            vals = [v.get("value") for v in yr.get("values", []) if v.get("value") is not None]
            if vals:
                parts.append(f"{yr.get('year','?')}年平均 {sum(vals)/len(vals):.1f}%（{len(vals)}筆）")
        return "；".join(parts) + "。【判斷】各年濕度均在正常範圍內。" if parts else "無有效數據。"
    elif chart_type == "compliance":
        years = data.get("years", [])
        if not years: return "無合規率資料。"
        parts = []
        for yr in years:
            vals = [v.get("rate") for v in yr.get("values", []) if v.get("rate") is not None]
            if vals:
                parts.append(f"{yr.get('year','?')}年平均合規率 {sum(vals)/len(vals):.1f}%（{len(vals)}筆）")
        return "；".join(parts) + "。【判斷】合規率穩定。" if parts else "無有效數據。"
    elif chart_type == "zone_yoy":
        zones = data.get("zones", [])
        if not zones: return "無區域比較資料。"
        parts = []
        for z in zones[:10]:
            vals = []
            for v in z.get("values", []):
                temp = v.get("temp")
                if temp is not None:
                    vals.append(f"{v.get('year','?')}={temp}°C")
            parts.append(f"{z.get('zone','?')}：" + "，".join(vals) if vals else f"{z.get('zone','?')}：無資料")
        return f"共{len(zones)}個區域。" + "；".join(parts) + "。"
    return "請觀察圖表數據是否有異常。"


# =============================================
# Sensor Positions API (persists to file)
# =============================================
@app.get("/api/positions")
def get_positions():
    return {"positions": sensorPositions, "schema": 5}

@app.post("/api/positions")
def update_positions(req: PositionsData):
    global sensorPositions
    sensorPositions = req.positions
    _save_positions()
    _log_audit("update_positions", "/api/positions", f"count={len(sensorPositions)}")
    return {"status": "ok", "positions": sensorPositions}


# =============================================
# Email Log & Audit Log APIs
# =============================================
@app.get("/api/logs/email")
def get_email_logs():
    logs = _load_json(LOG_EMAIL_PATH, [])
    return {"logs": logs[-200:]}

@app.get("/api/logs/audit")
def get_audit_logs():
    logs = _load_json(LOG_AUDIT_PATH, [])
    return {"logs": logs[-200:]}


if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
else:
    @app.get("/")
    def read_root():
        return {"status": "running", "msg": "Static directory not found yet. Please deploy the frontend static files."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
