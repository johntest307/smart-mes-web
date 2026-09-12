import csv, os, random, datetime

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "log.csv")

SENSORS = {
    "4F": {
        "物料區":      ["SEN-01", "SEN-02"],
        "組裝區":      ["SEN-03", "SEN-04", "SEN-05"],
        "測試區1":     ["SEN-06", "SEN-07"],
        "測試區2":     ["SEN-08", "SEN-09"],
        "包裝出貨區":  ["SEN-10", "SEN-11", "SEN-12", "SEN-13"],
    },
    "2F": {
        "SMT物料與備料區":    ["SEN-14", "SEN-15"],
        "SMT製程產線區":      ["SEN-16", "SEN-17"],
        "SMT檢測與品質區":    ["SEN-18", "SEN-19"],
        "BFT製程產線區":      ["SEN-20", "SEN-21"],
        "BFT檢測與後加工區":  ["SEN-22", "SEN-23"],
        "維修返修與包裝區":    ["SEN-24", "SEN-25"],
        "成品倉儲與出貨區":    ["SEN-26", "SEN-27"],
    },
}

BASE_TEMPS = {
    "物料區": 21.0, "組裝區": 22.5, "測試區1": 23.0, "測試區2": 23.5,
    "包裝出貨區": 22.0, "SMT物料與備料區": 21.5, "SMT製程產線區": 24.0,
    "SMT檢測與品質區": 22.0, "BFT製程產線區": 24.5, "BFT檢測與後加工區": 23.0,
    "維修返修與包裝區": 22.5, "成品倉儲與出貨區": 21.0,
}

BASE_HUMIDS = {
    "物料區": 40.0, "組裝區": 42.0, "測試區1": 38.0, "測試區2": 36.0,
    "包裝出貨區": 44.0, "SMT物料與備料區": 41.0, "SMT製程產線區": 35.0,
    "SMT檢測與品質區": 39.0, "BFT製程產線區": 33.0, "BFT檢測與後加工區": 37.0,
    "維修返修與包裝區": 42.0, "成品倉儲與出貨區": 45.0,
}

def classify(temp, humid):
    ts = "NORMAL"
    if temp > 25: ts = "HIGH"
    elif temp < 18: ts = "LOW"
    hs = "NORMAL"
    if humid > 60: hs = "HIGH"
    elif humid < 20: hs = "LOW"
    al = "NONE"
    ac = "SYS_OK"
    if ts != "NORMAL" or hs != "NORMAL":
        al = "WARNING"
        if ts == "HIGH" and hs == "HIGH": al = "CRITICAL"
        if ts == "LOW" and hs == "LOW": al = "CRITICAL"
        parts = []
        if ts != "NORMAL": parts.append(f"ERR_TEMP_{'HIGH' if ts=='HIGH' else 'LOW'}")
        if hs != "NORMAL": parts.append(f"ERR_HUMID_{'HIGH' if hs=='HIGH' else 'LOW'}")
        ac = "_".join(parts)
    return ts, hs, al, ac

def generate_one():
    now = datetime.datetime.now(datetime.timezone.utc)
    rows = []
    for floor, zones in SENSORS.items():
        for zone, sids in zones.items():
            base_t = BASE_TEMPS.get(zone, 22.0)
            base_h = BASE_HUMIDS.get(zone, 40.0)
            for sid in sids:
                temp = round(base_t + random.gauss(0, 0.8), 1)
                humid = round(base_h + random.gauss(0, 1.5), 1)
                ts, hs, al, ac = classify(temp, humid)
                rows.append({
                    "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "site_id": "TPE-Plant1",
                    "floor": floor,
                    "zone_name": zone,
                    "sensor_id": sid,
                    "temperature_c": temp,
                    "humidity_rh": humid,
                    "temp_status": ts,
                    "humidity_status": hs,
                    "alarm_level": al,
                    "alarm_code": ac,
                })
    return rows

def append_to_csv(rows):
    file_exists = os.path.exists(CSV_PATH) and os.path.getsize(CSV_PATH) > 0
    with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "timestamp", "site_id", "floor", "zone_name", "sensor_id",
            "temperature_c", "humidity_rh", "temp_status", "humidity_status",
            "alarm_level", "alarm_code"
        ])
        if not file_exists:
            writer.writeheader()
        writer.writerows(rows)

if __name__ == "__main__":
    rows = generate_one()
    append_to_csv(rows)
    print(f"[mock_gen] {len(rows)} records appended at {rows[0]['timestamp']}")
