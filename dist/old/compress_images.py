from PIL import Image
import os

src_dir = r"C:\Users\itsam\Downloads\新增資料夾\神雲專案\MaTBC_WEB\OLD\OK_產線_人機料法環"
dst_dir = r"C:\Users\itsam\Downloads\新增資料夾\神雲專案\MaTBC_WEB\run\app\public\old"

for fname in ["1.png", "2.png", "3.png"]:
    src = os.path.join(src_dir, fname)
    if os.path.exists(src):
        img = Image.open(src)
        max_w = 800
        if img.width > max_w:
            ratio = max_w / img.width
            img = img.resize((max_w, int(img.height * ratio)), Image.LANCZOS)
        out = os.path.join(dst_dir, os.path.splitext(fname)[0] + ".jpg")
        img.convert('RGB').save(out, 'JPEG', quality=75, optimize=True)
        size_kb = os.path.getsize(out) // 1024
        print(f"{fname} -> {os.path.basename(out)}: {img.width}x{img.height}, {size_kb}KB")

# Verify
for f in ["1.jpg", "2.jpg", "3.jpg", "4.jpg"]:
    p = os.path.join(dst_dir, f)
    if os.path.exists(p):
        print(f"  {f}: {os.path.getsize(p) // 1024}KB")
    else:
        print(f"  {f}: MISSING")
