<#
.SYNOPSIS
    Smart MES Platform — 一條指令自動化：本機開發 或 正式部署
    所有可變設定在 .env (root)，不需要改腳本內容
.PARAMETER Deploy
    切換到部署模式
.PARAMETER SkipTests
    部署時跳過測試
#>
param(
    [switch]$Deploy,
    [switch]$SkipTests
)

$Script:Root     = $PSScriptRoot
$Script:AppDir   = Join-Path $Script:Root "run\app"
$Script:Backend  = Join-Path $Script:Root "python_rag"
$Script:Scripts  = Join-Path $Script:Root "scripts"
$Script:PythonExe = Join-Path $Script:Backend ".venv\Scripts\python.exe"
$Script:PipExe    = Join-Path $Script:Backend ".venv\Scripts\pip.exe"

# ─── 載入 .env ──────────────────────────────────────────────
function Load-DotEnv {
    $envFile = Join-Path $Script:Root ".env"
    if (-not (Test-Path $envFile)) {
        Write-Host "[WARN] .env not found at $envFile — using defaults" -ForegroundColor Yellow
        return
    }
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#=]+)=(.*)\s*$") {
            $k = $matches[1].Trim()
            $v = $matches[2].Trim()
            if ($k -and $v -and $k -notlike "VITE_*") { Set-Item -Path "env:$k" -Value $v -ErrorAction SilentlyContinue }
        }
    }
    Write-Host "[INFO] .env loaded ($envFile)" -ForegroundColor Gray
}

Load-DotEnv

# ─── 從 .env 讀取設定（有預設值）──────────────────────────
$Script:FrontendPort = $env:FRONTEND_PORT
if (-not $Script:FrontendPort) { $Script:FrontendPort = "5173" }

$Script:RagPort = $env:RAG_PORT
if (-not $Script:RagPort) { $Script:RagPort = "9766" }

$Script:RagHost = $env:RAG_HOST
if (-not $Script:RagHost) { $Script:RagHost = "0.0.0.0" }

if ($env:SESSION_TIMEOUT) { $Script:SessionTimeout = $env:SESSION_TIMEOUT }
else { $Script:SessionTimeout = "86400" }

# ─── 匯出環境變數供子腳本使用 ──────────────────────────
$env:RAG_PORT = $Script:RagPort
$env:FRONTEND_PORT = $Script:FrontendPort
$env:SESSION_TIMEOUT = $Script:SessionTimeout

function Ensure-BackendDeps {
    Write-Host "[INFO] Checking Python dependencies..." -ForegroundColor Yellow
    $required = @("fastapi", "uvicorn", "groq", "cohere", "langchain_community", "fastembed", "google_auth_oauthlib", "python_multipart", "httpx", "langchain_chroma")
    $missing = @()
    foreach ($pkg in $required) {
        $mod = $pkg -replace '_', '-'
        $mod = $mod.Split('-')[0]
        $check = & $Script:PythonExe -c "__import__('$mod')" 2>&1
        if ($LASTEXITCODE -ne 0) { $missing += $pkg }
    }
    if ($missing.Count -gt 0) {
        Write-Host "  Installing missing: $($missing -join ', ')" -ForegroundColor Yellow
        & $Script:PipExe install $missing 2>&1 | Out-Null
        Write-Host "  Done." -ForegroundColor Green
    } else {
        Write-Host "  All OK." -ForegroundColor Green
    }
}

function Start-LocalServices {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Smart MES Platform — 本機開發環境啟動中     ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    $stopScript = Join-Path $Script:Scripts "stop-services.ps1"
    if (Test-Path $stopScript) { & $stopScript -Quiet }
    Start-Sleep -Seconds 1

    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
    $env:PYTHONIOENCODING = 'utf-8'

    if (Test-Path $Script:PythonExe) {
        Ensure-BackendDeps

        $chromaDb = Join-Path $Script:Backend "chroma_db"
        $ingestPy = Join-Path $Script:Backend "ingest.py"
        if ((Test-Path $ingestPy) -and (( -not (Test-Path $chromaDb)) -or ((Get-ChildItem $chromaDb -Recurse -File).Count -eq 0))) {
            Write-Host "  [INFO] Vector store empty. Running ingestion..." -ForegroundColor Yellow
            & $Script:PythonExe $ingestPy 2>&1 | Out-Null
            Write-Host "  [INFO] Ingestion complete." -ForegroundColor Green
        }
    } else {
        Write-Host "[ERROR] Python venv not found" -ForegroundColor Red
        return
    }

    # Start Backend
    Write-Host "[1/2] Starting backend (FastAPI :$($Script:RagPort))..." -ForegroundColor Yellow
    $beArgs = @('/K', "cd /d `"$Script:Backend`" && `"$Script:PythonExe`" -m uvicorn web_api:app --host $($Script:RagHost) --port $($Script:RagPort)")
    Start-Process -FilePath "cmd" -ArgumentList $beArgs -WindowStyle Normal

    Write-Host "  Waiting for backend (health check, timeout=120s)..." -ForegroundColor Yellow
    $ready = $false
    for ($i = 1; $i -le 120; $i++) {
        Start-Sleep -Seconds 1
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$($Script:RagPort)/health" -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
        if ($i % 15 -eq 0) { Write-Host "  waiting... ($i s)" }
    }

    if (-not $ready) {
        Write-Host "  [ERROR] Backend failed to start." -ForegroundColor Red
        return
    }
    Write-Host "  ✅ Backend ready: http://localhost:$($Script:RagPort)" -ForegroundColor Green

    # Start Frontend
    Write-Host "[2/2] Starting frontend (Vite :$($Script:FrontendPort))..." -ForegroundColor Yellow
    $feArgs = @('/K', "cd /d `"$Script:AppDir`" && npm run dev")
    Start-Process -FilePath "cmd" -ArgumentList $feArgs -WindowStyle Normal
    Start-Sleep -Seconds 3

    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║   ✅ 本機開發環境已啟動                       ║" -ForegroundColor Green
    Write-Host "║   Frontend  http://localhost:$($Script:FrontendPort)             ║" -ForegroundColor White
    Write-Host "║   Backend   http://localhost:$($Script:RagPort)             ║" -ForegroundColor White
    Write-Host "║   關閉視窗 = 停止對應服務                     ║" -ForegroundColor White
    Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Green
}

function Start-Deploy {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║   Smart MES Platform — 正式部署流程           ║" -ForegroundColor Magenta
    Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""

    $deployScript = Join-Path $Script:Scripts "deploy.ps1"
    if (-not (Test-Path $deployScript)) {
        Write-Host "[ERROR] deploy.ps1 not found" -ForegroundColor Red
        return
    }

    $args = @()
    if ($SkipTests) { $args += "-SkipTests" }

    & $deployScript @args
}

if ($Deploy) {
    Start-Deploy
} else {
    Start-LocalServices
}
