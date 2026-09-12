import requests
r = requests.get('http://localhost:8000/api/data')
d = r.json()
print(f"Sensors: {len(d['sensors'])}")
print(f"Fields: {list(d['sensors'][0].keys())}")
latest_ts = d['sensors'][0]['timestamp']
print(f"Latest timestamp: {latest_ts}")

r2 = requests.get('http://localhost:8000/api/stats')
d2 = r2.json()
print(f"Stats: {d2.get('latest_records_count', '?')} records, {d2.get('active_alarms_count', '?')} alarms")

r3 = requests.get('http://localhost:8000/api/positions')
d3 = r3.json()
print(f"Positions: {len(d3)} sensors with positions")
