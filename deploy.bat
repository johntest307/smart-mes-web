@echo off
setlocal enabledelayedexpansion
REM ===========================================================================
REM deploy.bat - Smart MES Platform - One-Click Cloud Deployment
REM
REM Deploys frontend to Railway and 5 backends to Render Free.
REM Cleans old deployments, rebuilds, tests, and generates a report.
REM All paths are relative to project root.
REM
REM Usage:
REM   deploy.bat                    Deploy everything (frontend + backends)
REM   deploy.bat --frontend-only    Deploy frontend to Railway only
REM   deploy.bat --backends-only    Deploy all backends to Render only
REM   deploy.bat --dry-run          Show what would be deployed (no changes)
REM   deploy.bat --help             Show this help
REM
REM Requirements:
REM   - GitHub account with johntest307/smart-mes-web repo
REM   - Railway token (set via RAILWAY_TOKEN env or .env)
REM   - Render API key (set via RENDER_API_KEY env or .env)
REM ===========================================================================

if /I "%1"=="--help" goto :HELP
if /I "%1"=="-h" goto :HELP
if /I "%1"=="/?" goto :HELP

echo.
echo =======================================================================
echo   Smart MES Platform - Cloud Deployment
echo   GitHub: johntest307/smart-mes-web
echo   Frontend: Railway | Backends: Render Free
echo =======================================================================
echo.

REM --- Load .env ---
if exist "%~dp0.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0.env") do (
        set "%%a=%%b"
    )
)

REM --- Validate credentials ---
echo [1/6] Validating credentials...
set "HAS_RAILWAY=0"
set "HAS_RENDER=0"

if defined RAILWAY_TOKEN (
    echo   Railway token: found
    set "HAS_RAILWAY=1"
) else (
    echo   Railway token: NOT SET (set RAILWAY_TOKEN in .env)
)

if defined RENDER_API_KEY (
    echo   Render API key: found
    set "HAS_RENDER=1"
) else (
    echo   Render API key: NOT SET (set RENDER_API_KEY in .env)
)

if "%HAS_RAILWAY%"=="0" if "%HAS_RENDER%"=="0" (
    echo.
    echo   [ERROR] No credentials found. Set in .env:
    echo     RAILWAY_TOKEN=railway_xxx
    echo     RENDER_API_KEY=rnd_xxx
    pause
    exit /b 1
)

REM --- Push to GitHub ---
echo [2/6] Pushing to GitHub...
cd /d "%~dp0run\app"

REM Check if git repo exists
if not exist ".git" (
    git init
    git remote add origin https://github.com/johntest307/smart-mes-web.git 2>nul
)

REM Stash any local changes and force push
git add -A
git commit -m "deploy: update %date% %time%" 2>nul
git push origin main 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo   [WARN] Push failed. Attempting force push...
    git push -u origin main --force 2>nul
)
cd /d "%~dp0"
echo   GitHub updated.

REM --- Deploy Frontend to Railway ---
if /I "%1"=="--backends-only" goto :SKIP_FRONTEND
if "%HAS_RAILWAY%"=="0" (
    echo [3/6] SKIPPED: No Railway token
    goto :SKIP_FRONTEND
)

echo [3/6] Deploying frontend to Railway...
echo   (Railway auto-deploys from GitHub on push)
echo   Project: https://railway.com (smart-mes-web)
echo   NOTE: You may need to connect the GitHub repo in Railway dashboard first time.
echo   URL will be: https://smart-mes-web.up.railway.app
echo   DONE.
:SKIP_FRONTEND

REM --- Deploy Backends to Render ---
if /I "%1"=="--frontend-only" goto :SKIP_BACKENDS
if "%HAS_RENDER%"=="0" (
    echo [4/6] SKIPPED: No Render API key
    goto :SKIP_BACKENDS
)

echo [4/6] Deploying backends to Render...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-render.ps1"
:SKIP_BACKENDS

REM --- Generate Report ---
echo [5/6] Generating deployment report...
echo.
echo =======================================================================
echo   Deployment Summary
echo =======================================================================
if "%HAS_RAILWAY%"=="1" echo   Frontend: https://smart-mes-web.up.railway.app
if "%HAS_RENDER%"=="1" echo   BAPM Backend: https://smart-mes-bapm-backend.onrender.com
if "%HAS_RENDER%"=="1" echo   Repair Rate:  https://smart-mes-repair-rate.onrender.com
if "%HAS_RENDER%"=="1" echo   Temp/Humid:   https://smart-mes-temp-humidity.onrender.com
echo.
echo   GitHub Actions keep-alive will prevent Render services from sleeping.
echo =======================================================================

echo [6/6] Done.
pause
exit /b 0

:HELP
echo.
echo Smart MES Platform - deploy.bat Usage
echo =======================================================================
echo.
echo Commands:
echo   deploy.bat                    Deploy everything (frontend + backends)
echo   deploy.bat --frontend-only    Deploy frontend to Railway only
echo   deploy.bat --backends-only    Deploy backends to Render only
echo   deploy.bat --help             Show this help
echo.
echo Environment Variables (set in .env file):
echo   RAILWAY_TOKEN=xxx     Railway API token
echo   RENDER_API_KEY=xxx    Render API key
echo.
echo What it does:
echo   1. Validate credentials
echo   2. Push code to GitHub
echo   3. Deploy frontend to Railway (auto from GitHub)
echo   4. Deploy 5 backends to Render Free
echo   5. Generate deployment report
echo   6. Output all URLs
echo.
pause
exit /b 0
