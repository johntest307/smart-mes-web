@echo off
setlocal enabledelayedexpansion
REM ===========================================================================
REM stop.bat - Smart MES Platform - Stop All Services & Cleanup
REM
REM Stops all running services and optionally removes generated artifacts.
REM All paths are relative to project root.
REM
REM Usage:
REM   stop.bat               Stop all services
REM   stop.bat --clean-all   Full factory reset (remove all generated files)
REM   stop.bat --help        Show this help
REM ===========================================================================

if /I "%1"=="--help" goto :HELP
if /I "%1"=="-h" goto :HELP
if /I "%1"=="/?" goto :HELP

echo.
echo =======================================================================
echo   Smart MES Platform - Stopping Services
echo =======================================================================
echo.

REM --- Step 1: Kill processes on known ports ---
echo [1/3] Stopping services...
set "STOPPED=0"
for %%p in (5173 8006 8005 8000 5001 3000 9766) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| find ":%%p " ^| find "LISTENING" 2^>nul') do (
        taskkill /F /PID %%i >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo   Killed process on port %%p (PID %%i)
            set /a STOPPED+=1
        )
    )
)

REM --- Step 2: Also kill named processes ---
for %%n in (node python uvicorn flask) do (
    taskkill /IM "%%n.exe" /F >nul 2>&1
)

if %STOPPED% EQU 0 (
    echo   No running services found.
) else (
    echo   Stopped %STOPPED% process(es).
)

REM --- Step 3: Full cleanup if --clean-all ---
if /I "%~1"=="--clean-all" goto :CLEAN_ALL

echo [2/3] Done.
echo [3/3] Services stopped.
echo.
echo =======================================================================
echo   All services stopped. To restart: start.bat
echo   To remove all generated files:   stop.bat --clean-all
echo =======================================================================
echo.
pause
exit /b 0

:CLEAN_ALL
echo.
echo =======================================================================
echo   Smart MES Platform - Factory Reset
echo =======================================================================
echo.
echo [2/3] Removing generated artifacts...
set "DELETED=0"

REM --- Frontend ---
if exist "%~dp0run\app\dist" (
    echo   Removing: run/app/dist/
    rmdir /s /q "%~dp0run\app\dist" >nul 2>&1
    set /a DELETED+=1
)
if exist "%~dp0run\app\node_modules" (
    echo   Removing: run/app/node_modules/
    rmdir /s /q "%~dp0run\app\node_modules" >nul 2>&1
    set /a DELETED+=1
)

REM --- Backend virtual environments ---
for %%d in (
    "run\app\public\old\bapm\backend\.venv"
    "run\app\public\old\repair-rate\backend\.venv"
    "run\app\public\temp-humidity\backend\.venv"
    "run\app\public\old\msforms\server\node_modules"
    "run\app\public\old\msforms\server\data\uploads"
) do (
    if exist "%~dp0%%~d" (
        echo   Removing: %%~d
        rmdir /s /q "%~dp0%%~d" >nul 2>&1
        set /a DELETED+=1
    )
)

REM --- BAPM uploads and history ---
if exist "%~dp0run\app\public\old\bapm\backend\uploads" (
    echo   Removing: bapm/backend/uploads/
    rmdir /s /q "%~dp0run\app\public\old\bapm\backend\uploads" >nul 2>&1
    set /a DELETED+=1
)
if exist "%~dp0run\app\public\old\bapm\backend\history" (
    echo   Removing: bapm/backend/history/
    rmdir /s /q "%~dp0run\app\public\old\bapm\backend\history" >nul 2>&1
    set /a DELETED+=1
)

REM --- __pycache__ ---
for /d /r "%~dp0run\app\public" %%d in (__pycache__) do (
    if exist "%%d" (
        rmdir /s /q "%%d" >nul 2>&1
        set /a DELETED+=1
    )
)

REM --- Reports ---
if exist "%~dp0scripts\reports" (
    echo   Removing: scripts/reports/
    rmdir /s /q "%~dp0scripts\reports" >nul 2>&1
    set /a DELETED+=1
)

REM --- Old RAG artifacts ---
for %%d in ("python_rag\.venv" "python_rag\chroma_db" "python_rag\logs" "python_rag\reports") do (
    if exist "%~dp0%%~d" (
        echo   Removing: %%~d
        rmdir /s /q "%~dp0%%~d" >nul 2>&1
        set /a DELETED+=1
    )
)

echo.
echo [3/3] Cleanup complete. %DELETED% item(s) removed.
echo.
echo =======================================================================
echo   Factory reset complete. Run start.bat to rebuild everything.
echo =======================================================================
echo.
pause
exit /b 0

:HELP
echo.
echo Smart MES Platform - stop.bat Usage
echo =======================================================================
echo.
echo Commands:
echo   stop.bat               Stop all services (backends + frontend)
echo   stop.bat --clean-all   Full factory reset (removes ALL generated files:
echo                            dist, node_modules, .venv, uploads, history,
echo                            __pycache__, reports, chroma_db, logs)
echo   stop.bat --help        Show this help
echo.
echo What it kills:
echo   Ports: 5173, 8006, 8005, 8000, 5001, 3000, 9766
echo   Processes: node, python, uvicorn, flask
echo.
pause
exit /b 0
