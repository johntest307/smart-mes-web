#Requires -Version 5.1
<#
.SYNOPSIS
    Smart MES Platform - Environment Configuration
.DESCRIPTION
    Detects and sets all paths, ports, and service definitions.
    Used by all other scripts. All paths are relative to project root.
#>

$Script:ProjectRoot = Split-Path -Parent $PSScriptRoot
$Script:Timestamp   = Get-Date -Format "yyyyMMdd_HHmmss"

# ─── Service Definitions ───
$Script:Services = @(
    @{
        Name        = "bapm-backend"
        Label       = "BAPM Pain Analysis"
        Type        = "python"
        Root        = "run/app/public/old/bapm/backend"
        Entry       = "main:app"
        Port        = 8006
        Requirements= "requirements.txt"
        RenderName  = "smart-mes-bapm-backend"
    },
    @{
        Name        = "repair-rate-backend"
        Label       = "Repair Rate Anomaly"
        Type        = "python"
        Root        = "run/app/public/old/repair-rate/backend"
        Entry       = "main:app"
        Port        = 8005
        Requirements= "requirements.txt"
        RenderName  = "smart-mes-repair-rate"
    },
    @{
        Name        = "temp-humidity-backend"
        Label       = "Temp Humidity Monitor"
        Type        = "python"
        Root        = "run/app/public/temp-humidity/backend"
        Entry       = "main:app"
        Port        = 8000
        Requirements= "requirements.txt"
        RenderName  = "smart-mes-temp-humidity"
    },
    @{
        Name        = "mva-mock-api"
        Label       = "MVA Mock Dashboard"
        Type        = "python"
        Root        = "run/app/public/old"
        Entry       = "mva_mock_api:app"
        Port        = 5001
        Requirements = $null
        RenderName  = "smart-mes-mva-mock"
    },
    @{
        Name        = "msforms-server"
        Label       = "MSForms Quiz Server"
        Type        = "node"
        Root        = "run/app/public/old/msforms/server"
        Entry       = "server.js"
        Port        = 3000
        Requirements= "package.json"
        RenderName  = "smart-mes-msforms"
    }
)

$Script:Frontend = @{
    Label = "Vite React Frontend"
    Root  = "run/app"
    Port  = 5173
}

# ─── Cloud Config ───
$Script:GitHubRepo = "https://github.com/johntest307/smart-mes-web.git"
$Script:GitHubBranch = "main"

# ─── Helper Functions ───
function Get-ServicePort([string]$Name) {
    $svc = $Script:Services | Where-Object { $_.Name -eq $Name }
    return if ($svc) { $svc.Port } else { 0 }
}

function Get-ServiceRoot([string]$Name) {
    $svc = $Script:Services | Where-Object { $_.Name -eq $Name }
    return if ($svc) { Join-Path $Script:ProjectRoot $svc.Root } else { "" }
}

function Test-PortOpen([int]$Port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $Port)
        $tcp.Close()
        return $true
    } catch { return $false }
}

function Stop-PortProcess([int]$Port) {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO", [string]$LogFile = "")
    $time = Get-Date -Format "HH:mm:ss"
    $line = "[$time][$Level] $Message"
    $color = switch ($Level) {
        "OK"    { "Green" }
        "WARN"  { "Yellow" }
        "ERROR" { "Red" }
        default { "Gray" }
    }
    Write-Host $line -ForegroundColor $color
    if ($LogFile -and (Test-Path (Split-Path $LogFile -Parent))) {
        Add-Content -Path $LogFile -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
    }
}

Export-ModuleMember -Variable Services, Frontend, GitHubRepo, GitHubBranch, ProjectRoot, Timestamp
Export-ModuleMember -Function Get-ServicePort, Get-ServiceRoot, Test-PortOpen, Stop-PortProcess, Write-Log
