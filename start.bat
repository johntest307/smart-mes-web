@echo off
setlocal enabledelayedexpansion
REM ===========================================================================
REM start.bat - Smart MES Platform - Start All Local Services
REM
REM Starts all 6 local services (5 backends + 1 frontend).
REM Detects and installs prerequisites automatically on first run.
REM All paths are relative to project root.
REM
REM Usage:
REM   start.bat                  Start all services
REM   start.bat --quick          Skip dependency install (faster)
REM   start.bat --backend-only   Start backends only (no frontend)
REM   start.bat --help           Show this help
REM ===========================================================================

if /I "%1"=="--help" goto :HELP
if /I "%1"=="-h" goto :HELP
if /I "%1"=="/?" goto :HELP

echo.
echo =======================================================================
echo   Smart MES Platform - Starting Local Services
echo   Project: %~dp0
echo =======================================================================
echo.

REM --- Step 1: Check prerequisites ---
echo [1/4] Checking prerequisites...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   Node.js not found. Installing via winget...
    where winget >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements 2>nul
        set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
    ) else (
        echo   [ERROR] winget not found. Install Node.js manually from https://nodejs.org
        pause
        exit /b 1
    )
)

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   Python not found. Installing via winget...
    where winget >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        winget install --id Python.Python.3.11 --silent --accept-package-agreements 2>nul
        set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
    ) else (
        echo   [ERROR] winget not found. Install Python manually from https://python.org
        pause
        exit /b 1
    )
)
echo   OK: node & python found.

REM --- Step 2: Install dependencies (first run) ---
echo [2/4] Checking dependencies...
set "APP_DIR=%~dp0run\app"
set "NEED_INSTALL=0"

if not exist "%APP_DIR%\node_modules" set "NEED_INSTALL=1"
if not exist "%APP_DIR%\public\old\repair-rate\backend\.venv" set "NEED_INSTALL=1"

if "%NEED_INSTALL%"=="1" (
    echo   Installing frontend dependencies...
    cd /d "%APP_DIR%"
    call npm install --legacy-peer-deps 2>nul
    cd /d "%~dp0"

    echo   Installing Python virtual environments for each backend...
    call :INSTALL_PYTHON_BACKEND "%~dp0run\app\public\old\bapm\backend"
    call :INSTALL_PYTHON_BACKEND "%~dp0run\app\public\old\repair-rate\backend"
    call :INSTALL_PYTHON_BACKEND "%~dp0run\app\public\temp-humidity\backend"

    echo   Installing MSForms server dependencies...
    cd /d "%~dp0run\app\public\old\msforms\server"
    call npm install --legacy-peer-deps 2>nul
    cd /d "%~dp0"

    echo   Dependencies installed.
) else (
    echo   OK: All dependencies present.
)

REM --- Step 3: Start all services ---
echo [3/4] Starting services...

REM Kill any existing processes on our ports
for %%p in (5173 8006 8005 8000 5001 3000) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| find ":%%p " ^| find "LISTENING" 2^>nul') do (
        taskkill /F /PID %%i >nul 2>&1
    )
)
timeout /t 1 /nobreak >nul

echo   [1/6] BAPM Backend (port 8006)...
start "BAPM" cmd /c "cd /d "%~dp0run\app\public\old\bapm\backend" && .venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8006"
timeout /t 2 /nobreak >nul

echo   [2/6] Repair Rate Backend (port 8005)...
start "RepairRate" cmd /c "cd /d "%~dp0run\app\public\old\repair-rate\backend" && .venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8005"
timeout /t 2 /nobreak >nul

echo   [3/6] Temp Humidity Backend (port 8000)...
start "TempHumidity" cmd /c "cd /d "%~dp0run\app\public\temp-humidity\backend" && .venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
timeout /t 2 /nobreak >nul

echo   [4/6] MVA Mock API (port 5001)...
start "MVAMock" cmd /c "cd /d "%~dp0run\app\public\old" && python mva_mock_api.py"
timeout /t 2 /nobreak >nul

echo   [5/6] MSForms Server (port 3000)...
start "MSForms" cmd /c "cd /d "%~dp0run\app\public\old\msforms\server" && node server.js"
timeout /t 2 /nobreak >nul

if /I "%1"=="--backend-only" goto :SKIP_FRONTEND

echo   [6/6] Frontend Vite Dev Server (port 5173)...
start "ViteFrontend" cmd /c "cd /d "%APP_DIR%" && npx vite --host"
timeout /t 3 /nobreak >nul

:SKIP_FRONTEND
REM --- Step 4: Health check ---
echo [4/4] Running health checks...
set "ALL_OK=1"
for %%s in (8006:BAPM 8005:RepairRate 8000:TempHumidity 5001:MVAMock 3000:MSForms) do (
    for /f "tokens=1,2 delims=:" %%a in ("%%s") do (
        curl -s -o nul -w "    %%b (port %%a): HTTP %%{http_code}\n" http://localhost:%%a/ 2>nul
        if %%ERRORLEVEL%% NEQ 0 (
            echo    %%b: NOT RESPONDING
            set "ALL_OK=0"
        )
    )
)

echo.
echo =======================================================================
if "%ALL_OK%"=="1" (
    echo   All services started successfully!
) else (
    echo   Some services may need a few more seconds to start.
)
echo.
echo   Frontend:     http://localhost:5173
echo   BAPM:         http://localhost:8006
echo   Repair Rate:  http://localhost:8005
echo   Temp/Humid:   http://localhost:8000
echo   MVA Mock:     http://localhost:5001
echo   MSForms:      http://localhost:3000
echo.
echo   To stop:      stop.bat
echo   To deploy:    deploy.bat
echo =======================================================================
echo.
pause
exit /b 0

:INSTALL_PYTHON_BACKEND
set "BE_DIR=%~1"
if not exist "%BE_DIR%\requirements.txt" goto :eof
if not exist "%BE_DIR%\.venv" (
    echo     Creating venv: %BE_DIR%
    cd /d "%BE_DIR%"
    python -m venv .venv 2>nul
    .venv\Scripts\pip.exe install -r requirements.txt -q 2>nul
    cd /d "%~dp0"
)
goto :eof

:HELP
echo.
echo Smart MES Platform - start.bat Usage
echo =======================================================================
echo.
echo Commands:
echo   start.bat                  Start all 6 services (backends + frontend)
echo   start.bat --quick          Skip dependency install
echo   start.bat --backend-only   Start backends only (no Vite frontend)
echo   start.bat --help           Show this help
echo.
echo Services:
echo   BAPM Backend       http://localhost:8006  (FastAPI)
echo   Repair Rate        http://localhost:8005  (FastAPI)
echo   Temp Humidity      http://localhost:8000  (FastAPI)
echo   MVA Mock API       http://localhost:5001  (Flask)
echo   MSForms Server     http://localhost:3000  (Express)
echo   Frontend           http://localhost:5173  (Vite)
echo.
pause
exit /b 0
