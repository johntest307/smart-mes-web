import time, subprocess, sys, os

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_gen.py")
INTERVAL = 60

print(f"[scheduler] Starting mock data generator every {INTERVAL}s...")
while True:
    try:
        result = subprocess.run([sys.executable, SCRIPT], capture_output=True, text=True, timeout=30)
        if result.stdout:
            print(result.stdout.strip())
        if result.returncode != 0 and result.stderr:
            print(f"[scheduler] ERROR: {result.stderr.strip()}")
    except Exception as e:
        print(f"[scheduler] Exception: {e}")
    time.sleep(INTERVAL)
