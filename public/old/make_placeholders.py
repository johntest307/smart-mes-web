from PIL import Image, ImageDraw, ImageFont
import os

dst = r"C:\Users\itsam\Downloads\新增資料夾\神雲專案\MaTBC_WEB\run\app\public\old"

configs = [
    ("1.png", "#35bdf2", "P01"),
    ("2.png", "#22c55e", "P02"),
    ("3.png", "#f59e0b", "P03"),
    ("4.png", "#a78bfa", "P04"),
]

for fname, color, label in configs:
    img = Image.new('RGB', (200, 200), color)
    draw = ImageDraw.Draw(img)
    # Draw label
    bbox = draw.textbbox((0, 0), label)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(((200 - tw) // 2, (200 - th) // 2), label, fill="white")
    out = os.path.join(dst, fname)
    img.save(out, 'PNG')
    print(f"{fname} => {os.path.getsize(out)} bytes")

# Verify
for f in ["1.png", "2.png", "3.png", "4.png"]:
    p = os.path.join(dst, f)
    print(f"  {f}: {os.path.getsize(p)} bytes")
