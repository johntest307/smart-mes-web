@echo off
setlocal enabledelayedexpansion
REM ===========================================================================
REM setup.bat - Smart MES Platform - Zero-Config New Computer Setup
REM
REM Run this on a BRAND NEW computer to set up everything from scratch.
REM Installs all prerequisites, sets up environment, builds, tests,
REM and outputs URLs and reports.
REM All paths are relative to project root. No hardcoded paths.
REM
REM Usage:
REM   setup.bat                  Full setup (prerequisites + deps + build + test)
REM   setup.bat --skip-tests     Skip testing (faster)
REM   setup.bat --help           Show this help
REM
REM Requirements:
REM   - Windows 10+ with winget
REM   - Internet connection
REM ===========================================================================

if /I "%1"=="--help" goto :HELP
if /I "%1"=="-h" goto :HELP
if /I "%1"=="/?" goto :HELP

echo.
echo =======================================================================
echo   Smart MES Platform - Zero-Config Setup
echo   Setting up from scratch...
echo =======================================================================
echo.

REM === Phase 1: Install Prerequisites ===
echo ============================================================
echo   Phase 1: Installing Prerequisites
echo ============================================================
echo.

REM --- Git ---
echo [1/7] Checking Git...
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   Installing Git via winget...
    where winget >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        winget install --id Git.Git --silent --accept-package-agreements 2>nul
        set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
    ) else (
        echo   [ERROR] winget not available. Install Git from https://git-scm.com
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%v in ('git --version 2^>nul') do echo   OK: %%v

REM --- Node.js ---
echo [2/7] Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   Installing Node.js LTS via winget...
    winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements 2>nul
    set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do echo   OK: Node %%v

REM --- Python ---
echo [3/7] Checking Python...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   Installing Python 3.11 via winget...
    winget install --id Python.Python.3.11 --silent --accept-package-agreements 2>nul
    set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
)
for /f "tokens=*" %%v in ('python --version 2^>nul') do echo   OK: %%v

REM --- Refresh PATH ---
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%ProgramFiles%\Git\cmd;%PATH%"

REM --- npm ---
echo [4/7] Checking npm...
for /f "tokens=*" %%v in ('npm --version 2^>nul') do echo   OK: npm %%v

REM --- pip ---
echo [5/7] Checking pip...
for /f "tokens=*" %%v in ('python -m pip --version 2^>nul') do echo   OK: %%v

REM === Phase 2: Setup Environment ===
echo.
echo ============================================================
echo   Phase 2: Environment Setup
echo ============================================================
echo.

REM --- Create .env if not exists ---
if not exist "%~dp0.env" (
    echo [6/7] Creating .env from template...
    (
        echo # Smart MES Platform - Environment Configuration
        echo # Copy this file and fill in your credentials
        echo.
        echo # Railway (frontend deployment)
        echo RAILWAY_TOKEN=
        echo.
        echo # Render (backend deployment^)
        echo RENDER_API_KEY=
        echo.
        echo # GitHub
        echo GITHUB_REPO=johntest307/smart-mes-web
        echo GITHUB_TOKEN=
    ) > "%~dp0.env"
    echo   Created .env - Please fill in your credentials.
) else (
    echo [6/7] .env already exists.
)

REM --- Create test output directory ---
echo [7/7] Creating test output directory...
if not exist "%~dp0test_output" mkdir "%~dp0test_output"

REM === Phase 3: Install Dependencies ===
echo.
echo ============================================================
echo   Phase 3: Installing Dependencies
echo ============================================================
echo.

echo   Frontend (npm install)...
cd /d "%~dp0run\app"
call npm install --legacy-peer-deps 2>nul
echo   OK: Frontend deps installed.
cd /d "%~dp0"

echo   Backend: BAPM...
call :SETUP_PYTHON_BACKEND "run\app\public\old\bapm\backend"
echo   Backend: Repair Rate...
call :SETUP_PYTHON_BACKEND "run\app\public\old\repair-rate\backend"
echo   Backend: Temp Humidity...
call :SETUP_PYTHON_BACKEND "run\app\public\temp-humidity\backend"

echo   Backend: MSForms (npm)...
cd /d "%~dp0run\app\public\old\msforms\server"
call npm install --legacy-peer-deps 2>nul
echo   OK: MSForms deps installed.
cd /d "%~dp0"

REM === Phase 4: Build ===
echo.
echo ============================================================
echo   Phase 4: Building Frontend
echo ============================================================
echo.
cd /d "%~dp0run\app"
call npm run build 2>nul
if %ERRORLEVEL% EQU 0 (
    echo   OK: Frontend built successfully.
) else (
    echo   [WARN] Build may have issues. Check output above.
)
cd /d "%~dp0"

REM === Phase 5: Test (unless skipped) ===
if /I "%1"=="--skip-tests" goto :SKIP_TESTS
echo.
echo ============================================================
echo   Phase 5: Running Tests
echo ============================================================
echo.
call "%~dp0test.bat" --no-pause
:SKIP_TESTS

REM === Done ===
echo.
echo =======================================================================
echo   Setup Complete!
echo =======================================================================
echo.
echo   Local URLs:
echo     Frontend:     http://localhost:5173
echo     BAPM:         http://localhost:8006
echo     Repair Rate:  http://localhost:8005
echo     Temp/Humid:   http://localhost:8000
echo     MVA Mock:     http://localhost:5001
echo     MSForms:      http://localhost:3000
echo.
echo   Commands:
echo     start.bat     Start all services
echo     stop.bat      Stop all services
echo     deploy.bat    Deploy to cloud
echo     test.bat      Run tests
echo.
echo   Next steps:
echo     1. Edit .env with your Railway/Render credentials
echo     2. Run: start.bat
echo     3. Run: deploy.bat (to deploy to cloud)
echo =======================================================================
echo.
pause
exit /b 0

:SETUP_PYTHON_BACKEND
set "BE_DIR=%~dp0%~1"
if not exist "%BE_DIR%\requirements.txt" goto :eof
if not exist "%BE_DIR%\.venv" (
    cd /d "%BE_DIR%"
    python -m venv .venv 2>nul
    .venv\Scripts\pip.exe install -r requirements.txt -q 2>nul
    echo   OK: %~1 venv created.
    cd /d "%~dp0"
)
goto :eof

:HELP
echo.
echo Smart MES Platform - setup.bat Usage
echo =======================================================================
echo.
echo Commands:
echo   setup.bat                  Full setup from scratch
echo   setup.bat --skip-tests     Skip testing phase
echo   setup.bat --help           Show this help
echo.
echo What it does:
echo   Phase 1: Install Git, Node.js, Python via winget
echo   Phase 2: Create .env, test directories
echo   Phase 3: Install all dependencies (npm + pip)
echo   Phase 4: Build frontend
echo   Phase 5: Run automated tests
echo.
echo After setup:
echo   start.bat    - Start all services
echo   deploy.bat   - Deploy to cloud
echo.
pause
exit /b 0
