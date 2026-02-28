# ─────────────────────────────────────────────
# Takta Backend — Local Development Runner
# ─────────────────────────────────────────────
# Usage: .\run_local.ps1
#
# This script:
#   1. Sets PYTHONPATH so module imports work
#   2. Reads DB_MODE from .env (default: sqlite)
#   3. Starts uvicorn with hot-reload on port 9003

$ErrorActionPreference = "Stop"
$Env:PYTHONPATH = "$PWD"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "       TAKTA Backend (Dev)           " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Read DB_MODE from .env if it exists
$envFile = Join-Path $PWD ".env"
$dbMode = "sqlite"
if (Test-Path $envFile) {
    $match = Select-String -Path $envFile -Pattern "^DB_MODE\s*=\s*(\w+)" | Select-Object -First 1
    if ($match) {
        $dbMode = $match.Matches.Groups[1].Value.ToLower()
    }
}

Write-Host "Config DB_MODE = $dbMode" -ForegroundColor Yellow
Write-Host "Config Port    = 9003" -ForegroundColor Yellow
Write-Host ""

# Start uvicorn with reload
Write-Host "Starting uvicorn..." -ForegroundColor Green
uvicorn backend.app.main:app --host 0.0.0.0 --port 9003 --reload
