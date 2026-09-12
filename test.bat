@echo off
setlocal enabledelayedexpansion
REM ===========================================================================
REM test.bat - Smart MES Platform - Automated Testing & Report Generation
REM
REM Runs all tests and generates an HTML report in test_output/.
REM Tests: frontend build, backend health, API endpoints, BAPM template.
REM All paths are relative to project root.
REM
REM Usage:
REM   test.bat                  Run all tests
REM   test.bat --no-pause       Don't pause at end (for scripts)
REM   test.bat --help           Show this help
REM ===========================================================================

if /I "%1"=="--help" goto :HELP
if /I "%1"=="-h" goto :HELP
if /I "%1"=="/?" goto :HELP

set "NO_PAUSE=0"
if /I "%1"=="--no-pause" set "NO_PAUSE=1"

echo.
echo =======================================================================
echo   Smart MES Platform - Automated Testing
echo =======================================================================
echo.

set "TEST_DIR=%~dp0test_output"
if not exist "%TEST_DIR%" mkdir "%TEST_DIR%"
set "TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "REPORT=%TEST_DIR%\test_report_%TIMESTAMP%.html"
set "PASSED=0"
set "FAILED=0"
set "TOTAL=0"
set "RESULTS="

REM === Test 1: Frontend Build ===
echo [Test 1] Frontend build output...
set /a TOTAL+=1
if exist "%~dp0run\app\dist\index.html" (
    echo   PASS: Frontend build exists
    set /a PASSED+=1
    set "RESULTS=!RESULTS!<tr class="pass"><td>Frontend Build</td><td><span class="badge pass">PASS</span></td><td>dist/index.html exists</td></tr>"
) else (
    echo   FAIL: Frontend not built
    set /a FAILED+=1
    set "RESULTS=!RESULTS!<tr class="fail"><td>Frontend Build</td><td><span class="badge fail">FAIL</span></td><td>dist/index.html missing</td></tr>"
)

REM === Test 2: Source files ===
echo [Test 2] Source files integrity...
set /a TOTAL+=1
set "SRC_OK=1"
if not exist "%~dp0run\app\src\App.tsx" set "SRC_OK=0"
if not exist "%~dp0run\app\src\main.tsx" set "SRC_OK=0"
if not exist "%~dp0run\app\package.json" set "SRC_OK=0"
if not exist "%~dp0run\app\vite.config.ts" set "SRC_OK=0"
if "%SRC_OK%"=="1" (
    echo   PASS: All critical source files present
    set /a PASSED+=1
    set "RESULTS=!RESULTS!<tr class="pass"><td>Source Files</td><td><span class="badge pass">PASS</span></td><td>App.tsx, main.tsx, package.json, vite.config.ts</td></tr>"
) else (
    echo   FAIL: Missing source files
    set /a FAILED+=1
    set "RESULTS=!RESULTS!<tr class="fail"><td>Source Files</td><td><span class="badge fail">FAIL</span></td><td>Missing critical files</td></tr>"
)

REM === Test 3: Backend requirements ===
echo [Test 3] Backend configuration...
set /a TOTAL+=1
set "BE_OK=1"
for %%f in (
    "run\app\public\old\bapm\backend\requirements.txt"
    "run\app\public\old\bapm\backend\main.py"
    "run\app\public\old\repair-rate\backend\requirements.txt"
    "run\app\public\old\repair-rate\backend\main.py"
    "run\app\public\temp-humidity\backend\requirements.txt"
    "run\app\public\temp-humidity\backend\main.py"
    "run\app\public\old\mva_mock_api.py"
    "run\app\public\old\msforms\server\server.js"
) do (
    if not exist "%~dp0%%~f" (
        echo   Missing: %%~f
        set "BE_OK=0"
    )
)
if "%BE_OK%"=="1" (
    echo   PASS: All backend files present
    set /a PASSED+=1
    set "RESULTS=!RESULTS!<tr class="pass"><td>Backend Config</td><td><span class="badge pass">PASS</span></td><td>All 5 backends configured</td></tr>"
) else (
    echo   FAIL: Missing backend files
    set /a FAILED+=1
    set "RESULTS=!RESULTS!<tr class="fail"><td>Backend Config</td><td><span class="badge fail">FAIL</span></td><td>Missing backend files</td></tr>"
)

REM === Test 4: BAPM Template download ===
echo [Test 4] BAPM template file...
set /a TOTAL+=1
if exist "%~dp0run\app\public\old\bapm\backend\main.py" (
    findstr /C:"pain_points_template" "%~dp0run\app\public\old\bapm\backend\main.py" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo   PASS: BAPM template endpoint defined
        set /a PASSED+=1
        set "RESULTS=!RESULTS!<tr class="pass"><td>BAPM Template</td><td><span class="badge pass">PASS</span></td><td>Template endpoint found in main.py</td></tr>"
    ) else (
        echo   WARN: Template endpoint not found
        set /a FAILED+=1
        set "RESULTS=!RESULTS!<tr class="fail"><td>BAPM Template</td><td><span class="badge fail">WARN</span></td><td>Template endpoint not found</td></tr>"
    )
)

REM === Test 5: Health checks (if services running) ===
echo [Test 5] Service health checks...
for %%s in (8006:BAPM 8005:RepairRate 8000:TempHumidity 5001:MVAMock 3000:MSForms 5173:Frontend) do (
    for /f "tokens=1,2 delims=:" %%a in ("%%s") do (
        set /a TOTAL+=1
        curl -s -o nul -w "" http://localhost:%%a/ 2>nul
        if !ERRORLEVEL! EQU 0 (
            echo   PASS: %%b (port %%a) responding
            set /a PASSED+=1
            set "RESULTS=!RESULTS!<tr class="pass"><td>%%b Health</td><td><span class="badge pass">PASS</span></td><td>Port %%a responding</td></tr>"
        ) else (
            echo   SKIP: %%b (port %%a) not running
            set "RESULTS=!RESULTS!<tr class="skip"><td>%%b Health</td><td><span class="badge skip">SKIP</span></td><td>Service not running</td></tr>"
        )
    )
)

REM === Test 6: GitHub repo connectivity ===
echo [Test 6] GitHub repository...
set /a TOTAL+=1
curl -s -o nul -w "%{http_code}" https://api.github.com/repos/johntest307/smart-mes-web 2>nul | find "200" >nul
if %ERRORLEVEL% EQU 0 (
    echo   PASS: GitHub repo accessible
    set /a PASSED+=1
    set "RESULTS=!RESULTS!<tr class="pass"><td>GitHub Repo</td><td><span class="badge pass">PASS</span></td><td>johntest307/smart-mes-web accessible</td></tr>"
) else (
    echo   FAIL: GitHub repo not accessible
    set /a FAILED+=1
    set "RESULTS=!RESULTS!<tr class="fail"><td>GitHub Repo</td><td><span class="badge fail">FAIL</span></td><td>Cannot reach GitHub repo</td></tr>"
)

REM === Generate HTML Report ===
echo.
echo Generating report...
set "OVERALL=PASS"
if %FAILED% GTR 0 set "OVERALL=FAIL"
set "OC=#22c55e"
if "%OVERALL%"=="FAIL" set "OC=#ef4444"

(
echo ^<!DOCTYPE html^>
echo ^<html lang="en"^>
echo ^<head^>
echo ^<meta charset="UTF-8"^>
echo ^<title^>Smart MES - Test Report^</title^>
echo ^<style^>
echo *{margin:0;padding:0;box-sizing:border-box}
echo body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f0f23;color:#e0e0e0;padding:40px}
echo h1{color:#60a5fa;margin-bottom:8px;font-size:28px}
echo .sub{color:#94a3b8;margin-bottom:32px;font-size:14px}
echo .summary{display:flex;gap:20px;margin-bottom:32px;flex-wrap:wrap}
echo .card{background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px;padding:20px 24px;min-width:140px}
echo .card .label{font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px}
echo .card .value{font-size:32px;font-weight:700;margin-top:4px}
echo table{width:100%%;border-collapse:collapse;background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px;overflow:hidden}
echo th{background:#2a2a4a;padding:12px 16px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8}
echo td{padding:12px 16px;border-top:1px solid #2a2a4a;font-size:14px}
echo tr.pass td{border-left:3px solid #22c55e}tr.fail td{border-left:3px solid #ef4444}tr.skip td{border-left:3px solid #94a3b8}
echo .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
echo .badge.pass{background:rgba(34,197,94,0.15);color:#22c55e}
echo .badge.fail{background:rgba(239,68,68,0.15);color:#ef4444}
echo .badge.skip{background:rgba(148,163,184,0.15);color:#94a3b8}
echo .footer{margin-top:24px;color:#64748b;font-size:12px}
echo ^</style^>
echo ^</head^>
echo ^<body^>
echo ^<h1^>Smart MES Platform - Test Report^</h1^>
echo ^<p class="sub"^>%TIMESTAMP%^</p^>
echo ^<div class="summary"^>
echo ^<div class="card"^><div class="label"^>Overall^</div^><div class="value" style="color:%OC%"^>%OVERALL%^</div^>^</div^>
echo ^<div class="card"^><div class="label"^>Passed^</div^><div class="value" style="color:#22c55e"^>%PASSED%/%TOTAL%^</div^>^</div^>
echo ^<div class="card"^><div class="label"^>Failed^</div^><div class="value" style="color:#ef4444"^>%FAILED%^</div^>^</div^>
echo ^</div^>
echo ^<table^>
echo ^<thead^>^<tr^>^<th^>Test^</th^>^<th^>Status^</th^>^<th^>Details^</th^>^</tr^>^</thead^>
echo ^<tbody^>
echo %RESULTS%
echo ^</tbody^>^</table^>
echo ^<div class="footer"^>Generated by Smart MES Platform test.bat^</div^>
echo ^</body^>^</html^>
) > "%REPORT%"

REM Copy to latest
if not exist "%TEST_DIR%" mkdir "%TEST_DIR%"
copy /y "%REPORT%" "%TEST_DIR%\latest_report.html" >nul

echo.
echo =======================================================================
echo   Test Results: %PASSED%/%TOTAL% passed, %FAILED% failed
echo   Report: %REPORT%
echo =======================================================================
echo.

if "%NO_PAUSE%"=="0" pause
exit /b 0

:HELP
echo.
echo Smart MES Platform - test.bat Usage
echo =======================================================================
echo.
echo Commands:
echo   test.bat                  Run all tests and generate report
echo   test.bat --no-pause       Don't pause at end (for scripts)
echo   test.bat --help           Show this help
echo.
echo Tests:
echo   1. Frontend build validation
echo   2. Source file integrity
echo   3. Backend configuration check
echo   4. BAPM template endpoint
echo   5. Service health checks
echo   6. GitHub repository access
echo.
echo Reports are saved to: test_output/
echo.
pause
exit /b 0
