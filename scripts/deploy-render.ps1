#Requires -Version 5.1
<#
.SYNOPSIS
    Deploy 5 backends to Render Free tier via API.
.DESCRIPTION
    Creates/updates web services on Render for each backend.
    Uses relative paths from project root.
#>

$Script:ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$Script:GitHubRepo  = "https://github.com/johntest307/smart-mes-web.git"
$Script:GitHubBranch = "main"

# Load .env
$rootEnv = Join-Path $Script:ProjectRoot ".env"
if (Test-Path $rootEnv) {
    Get-Content $rootEnv | ForEach-Object {
        if ($_ -match "^\s*([^#=]+)=(.*)\s*$") {
            $k = $matches[1].Trim()
            $v = $matches[2].Trim()
            if ($k -and $v) { Set-Item -Path "env:$k" -Value $v -ErrorAction SilentlyContinue }
        }
    }
}

$RenderKey = $env:RENDER_API_KEY
if (-not $RenderKey) {
    Write-Host "[ERROR] RENDER_API_KEY not set. Add to .env file." -ForegroundColor Red
    exit 1
}

$Headers = @{
    "Authorization" = "Bearer $RenderKey"
    "Content-Type"  = "application/json"
    "Accept"        = "application/json"
}

# Get owner ID
Write-Host "`n=== Getting Render workspace info ===" -ForegroundColor Cyan
try {
    $ownersResp = Invoke-RestMethod -Uri "https://api.render.com/v1/owners" -Method GET -Headers $Headers -TimeoutSec 10
    $ownerId = $ownersResp[0].owner.id
    $ownerName = $ownersResp[0].owner.name
    Write-Host "  Workspace: $ownerName ($ownerId)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Cannot access Render API: $_" -ForegroundColor Red
    exit 1
}

# Get existing services
Write-Host "`n=== Checking existing services ===" -ForegroundColor Cyan
try {
    $servicesResp = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Method GET -Headers $Headers -TimeoutSec 10
    $existingServices = @{}
    foreach ($svc in $servicesResp) {
        $existingServices[$svc.service.name] = $svc.service.id
        Write-Host "  Found: $($svc.service.name) ($($svc.service.id))" -ForegroundColor Gray
    }
} catch {
    Write-Host "[WARN] Cannot list services: $_" -ForegroundColor Yellow
    $existingServices = @{}
}

# Service definitions
$Backends = @(
    @{
        Name     = "smart-mes-bapm-backend"
        Label    = "BAPM Pain Analysis"
        Root     = "run/app/public/old/bapm/backend"
        BuildCmd = "cd run/app/public/old/bapm/backend && pip install -r requirements.txt"
        StartCmd = "cd run/app/public/old/bapm/backend && uvicorn main:app --host 0.0.0.0 --port `$PORT"
    },
    @{
        Name     = "smart-mes-repair-rate"
        Label    = "Repair Rate Anomaly"
        Root     = "run/app/public/old/repair-rate/backend"
        BuildCmd = "cd run/app/public/old/repair-rate/backend && pip install -r requirements.txt"
        StartCmd = "cd run/app/public/old/repair-rate/backend && pip install uvicorn && uvicorn main:app --host 0.0.0.0 --port `$PORT"
    },
    @{
        Name     = "smart-mes-temp-humidity"
        Label    = "Temp Humidity Monitor"
        Root     = "run/app/public/temp-humidity/backend"
        BuildCmd = "cd run/app/public/temp-humidity/backend && pip install -r requirements.txt"
        StartCmd = "cd run/app/public/temp-humidity/backend && uvicorn main:app --host 0.0.0.0 --port `$PORT"
    },
    @{
        Name     = "smart-mes-mva-mock"
        Label    = "MVA Mock Dashboard"
        Root     = "run/app/public/old"
        BuildCmd = "cd run/app/public/old && pip install flask"
        StartCmd = "cd run/app/public/old && python mva_mock_api.py"
    },
    @{
        Name     = "smart-mes-msforms"
        Label    = "MSForms Quiz Server"
        Root     = "run/app/public/old/msforms/server"
        BuildCmd = "cd run/app/public/old/msforms/server && npm install"
        StartCmd = "cd run/app/public/old/msforms/server && node server.js"
    }
)

$created = 0
$updated = 0
$errors  = 0

foreach ($svc in $Backends) {
    Write-Host "`n=== Deploying: $($svc.Label) ($($svc.Name)) ===" -ForegroundColor Cyan

    $payload = @{
        name     = $svc.Name
        type     = "web_service"
        ownerId  = $ownerId
        repo     = $Script:GitHubRepo
        branch   = $Script:GitHubBranch
        serviceDetails = @{
            runtime = "python"
            plan    = "free"
            region  = "oregon"
            envSpecificDetails = @{
                buildCommand  = $svc.BuildCmd
                startCommand  = $svc.StartCmd
                pythonVersion = "3.11.0"
            }
        }
    }

    # Use node runtime for MSForms
    if ($svc.Name -eq "smart-mes-msforms") {
        $payload.serviceDetails.runtime = "node"
        $payload.serviceDetails.envSpecificDetails = @{
            buildCommand = $svc.BuildCmd
            startCommand = $svc.StartCmd
        }
    }

    # Use existing service or create new
    if ($existingServices.ContainsKey($svc.Name)) {
        Write-Host "  Service exists, updating..." -ForegroundColor Yellow
        $svcId = $existingServices[$svc.Name]
        try {
            # Update envSpecificDetails
            $updatePayload = @{
                serviceDetails = @{
                    envSpecificDetails = $payload.serviceDetails.envSpecificDetails
                }
            }
            $resp = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$svcId" -Method PATCH -Headers $Headers -Body ($updatePayload | ConvertTo-Json -Depth 10) -TimeoutSec 30
            Write-Host "  Updated: $($svc.Name)" -ForegroundColor Green
            $updated++
        } catch {
            Write-Host "  [ERROR] Update failed: $_" -ForegroundColor Red
            $errors++
        }
    } else {
        Write-Host "  Creating new service..." -ForegroundColor Yellow
        try {
            $resp = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Method POST -Headers $Headers -Body ($payload | ConvertTo-Json -Depth 10) -TimeoutSec 30
            Write-Host "  Created: $($svc.Name) ($($resp.service.id))" -ForegroundColor Green
            $created++
        } catch {
            $errBody = $_.ErrorDetails.Message
            if ($errBody -match "already exists") {
                Write-Host "  Service already exists (may need manual cleanup)" -ForegroundColor Yellow
            } else {
                Write-Host "  [ERROR] Create failed: $_" -ForegroundColor Red
                if ($errBody) { Write-Host "  $errBody" -ForegroundColor Red }
            }
            $errors++
        }
    }
}

# Summary
Write-Host "`n=== Render Deployment Summary ===" -ForegroundColor Cyan
Write-Host "  Created: $created" -ForegroundColor Green
Write-Host "  Updated: $updated" -ForegroundColor Yellow
Write-Host "  Errors:  $errors" -ForegroundColor Red

if ($created -gt 0 -or $updated -gt 0) {
    Write-Host "`n  Services will be available at:" -ForegroundColor White
    foreach ($svc in $Backends) {
        Write-Host "    https://$($svc.Name).onrender.com" -ForegroundColor Cyan
    }
    Write-Host "`n  NOTE: First deploy takes ~5-10 minutes (cold start)." -ForegroundColor Yellow
    Write-Host "  GitHub Actions keep-alive will prevent sleeping." -ForegroundColor Yellow
}

exit $errors
