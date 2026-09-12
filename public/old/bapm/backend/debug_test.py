import requests

# Download template
r = requests.get('http://localhost:8006/api/template')
open('test.xlsx', 'wb').write(r.content)

# Upload
files = {'file': ('test.xlsx', open('test.xlsx','rb'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
r2 = requests.post('http://localhost:8006/api/upload', files=files)
data = r2.json()['analysis']

print("=== Fields in analysis ===")
for k in data.keys():
    v = data[k]
    if isinstance(v, list):
        print(f"  {k}: list[{len(v)}]")
    elif isinstance(v, dict):
        print(f"  {k}: dict[{len(v)} keys]")
    else:
        print(f"  {k}: {type(v).__name__}")

print("\n=== impact_effort_data sample ===")
ied = data.get('impact_effort_data', [])
if ied:
    print(f"  Count: {len(ied)}")
    print(f"  Keys: {list(ied[0].keys())}")
    print(f"  First: {ied[0]}")
else:
    print("  EMPTY or MISSING!")

print("\n=== scatter_data sample ===")
sd = data.get('scatter_data', [])
if sd:
    print(f"  Count: {len(sd)}")
    print(f"  Keys: {list(sd[0].keys())}")
else:
    print("  EMPTY!")
