import os, shutil

dst = r"C:\Users\itsam\Downloads\新增資料夾\神雲專案\MaTBC_WEB\run\app\public\old"

# Find the two xlsx files - larger one is 出缺勤, smaller is 紀律
xlsx_files = [f for f in os.listdir(dst) if f.endswith('.xlsx')]
print(f"Found: {xlsx_files}")

for f in xlsx_files:
    full = os.path.join(dst, f)
    size = os.path.getsize(full)
    if size > 20000:
        target = os.path.join(dst, "attendance.xlsx")
    else:
        target = os.path.join(dst, "discipline.xlsx")
    shutil.copy2(full, target)
    print(f"  {f} ({size}B) -> {os.path.basename(target)}")

# Verify
for name in ["attendance.xlsx", "discipline.xlsx"]:
    p = os.path.join(dst, name)
    if os.path.exists(p):
        print(f"  OK: {name} = {os.path.getsize(p)}B")
    else:
        print(f"  MISSING: {name}")
