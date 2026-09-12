"""
Unified Backend Server - Smart MES Platform
Combines all 5 backends into one FastAPI app on a single port.
"""
import os
import sys
import json
import importlib.util
import subprocess
import threading
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Smart MES Unified Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE, "backend")

def load_module_from_path(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod

@app.get("/health")
def health():
    return {
        "status": "running",
        "service": "smart-mes-unified-backend",
        "modules": ["bapm", "repair-rate", "temp-humidity", "mva-mock", "msforms"],
        "timestamp": time.time()
    }

# BAPM
try:
    bapm_mod = load_module_from_path("bapm_main", os.path.join(BACKEND_DIR, "bapm", "main.py"))
    from fastapi.routing import APIRoute
    for route in bapm_mod.app.routes:
        if isinstance(route, APIRoute):
            new_path = "/bapm" + route.path if route.path != "/" else "/bapm"
            app.add_api_route(new_path, route.endpoint, methods=route.methods, tags=["bapm"])
    print("[OK] BAPM loaded")
except Exception as e:
    print(f"[WARN] BAPM: {e}")

# Repair Rate
try:
    repair_mod = load_module_from_path("repair_main", os.path.join(BACKEND_DIR, "repair-rate", "main.py"))
    for route in repair_mod.app.routes:
        if isinstance(route, APIRoute):
            new_path = "/repair" + route.path if route.path != "/" else "/repair"
            app.add_api_route(new_path, route.endpoint, methods=route.methods, tags=["repair"])
    print("[OK] Repair Rate loaded")
except Exception as e:
    print(f"[WARN] Repair Rate: {e}")

# Temp Humidity
try:
    temphum_mod = load_module_from_path("temphum_main", os.path.join(BACKEND_DIR, "temp-humidity", "main.py"))
    for route in temphum_mod.app.routes:
        if isinstance(route, APIRoute):
            new_path = "/temphum" + route.path if route.path != "/" else "/temphum"
            app.add_api_route(new_path, route.endpoint, methods=route.methods, tags=["temphum"])
    print("[OK] Temp Humidity loaded")
except Exception as e:
    print(f"[WARN] Temp Humidity: {e}")

# MVA Mock (Flask -> FastAPI bridge)
try:
    mva_mod = load_module_from_path("mva_mock", os.path.join(BACKEND_DIR, "mva_mock_api.py"))
    from starlette.requests import Request

    for rule in mva_mod.app.url_map.iter_rules():
        if rule.endpoint == 'static':
            continue
        func = mva_mod.app.view_functions[rule.endpoint]
        methods = [m.upper() for m in rule.methods - {'HEAD', 'OPTIONS'}]
        new_path = "/mva" + rule.rule if rule.rule != '/' else "/mva"

        async def flask_bridge(request: Request, _func=func):
            if request.method == 'GET':
                with mva_mod.app.test_request_context(str(request.url)):
                    result = _func()
                    if hasattr(result, 'get_json'):
                        return JSONResponse(content=result.get_json())
                    return JSONResponse(content={"data": str(result)})
            return JSONResponse(content={"error": "POST bridge not implemented"})

        app.add_api_route(new_path, flask_bridge, methods=methods, tags=["mva"])
    print("[OK] MVA Mock loaded")
except Exception as e:
    print(f"[WARN] MVA Mock: {e}")

# MSForms (subprocess proxy)
msforms_port = int(os.environ.get("MSFORMS_PORT", "3000"))
msforms_dir = os.path.join(BACKEND_DIR, "msforms", "server")

def start_msforms():
    try:
        subprocess.Popen(
            ["node", "server.js"],
            cwd=msforms_dir,
            env={**os.environ, "PORT": str(msforms_port)},
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print(f"[OK] MSForms started on port {msforms_port}")
    except Exception as e:
        print(f"[WARN] MSForms: {e}")

threading.Thread(target=start_msforms, daemon=True).start()

@app.api_route("/msforms/{path:path}", methods=["GET", "POST", "PUT", "DELETE"], tags=["msforms"])
async def msforms_proxy(path: str):
    import urllib.request
    try:
        url = f"http://127.0.0.1:{msforms_port}/{path}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            from starlette.responses import Response
            return Response(content=data, status_code=resp.status, headers=dict(resp.headers))
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=502)

# Serve frontend (dist/ in same directory as unified_backend.py)
DIST_DIR = os.path.join(BASE, "dist")
if os.path.isdir(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
    for subdir in ["old", "temp-humidity", "arch", "videos"]:
        subpath = os.path.join(DIST_DIR, subdir)
        if os.path.isdir(subpath):
            app.mount(f"/{subdir}", StaticFiles(directory=subpath), name=f"static-{subdir}")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
    print("[OK] Frontend served")
else:
    print(f"[WARN] dist/ not found at {DIST_DIR}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
