# Script to run Takta Backend locally (Development Mode)
# This solves the "ImportError: attempted relative import" by running as a module.

$Env:PYTHONPATH = "$PWD"
Write-Host "Starting Takta Backend on Port 9003..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow

# Run uvicorn pointing to the app module
# --reload enables auto-restart on code changes
uvicorn backend.app.main:app --host 0.0.0.0 --port 9003 --reload
