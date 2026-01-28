# Deploy Script for Takta API
# Target: \\10.252.0.134\Analitica\API_Takta

$SourcePath = "c:\Users\daniel.castaneda\OneDrive - Grupo BIOS S.A.S\Transformación Digital\2026\Ecosistema TD\Takta\backend"
$DestPath = "\\10.252.0.134\Analitica\API_Takta"
$RemoteServer = "10.252.0.134"
$ServiceName = "takta-api" # PM2 Service Name

Write-Host "Starting Deployment to $DestPath..." -ForegroundColor Green

# 1. Copy Files
Write-Host "Copying files..."
Copy-Item -Path "$SourcePath\*" -Destination $DestPath -Recurse -Force

# 2. Restart PM2 Service via SSH (assuming SSH is available as user has used it before)
# Check if we can execute remote command
Write-Host "Restarting PM2 Service on $RemoteServer..."

# Using ssh to restart service. 
# Note: User credentials/key need to be set up. Assuming 'iot.td' user based on context.
try {
    ssh iot.td@$RemoteServer "pm2 restart $ServiceName || pm2 start $DestPath/app/main.py --name $ServiceName --interpreter python3 --cwd $DestPath"
    Write-Host "Service Restarted Successfully." -ForegroundColor Green
}
catch {
    Write-Host "Error restarting service via SSH. Please verify manually." -ForegroundColor Red
    Write-Host $_
}

Write-Host "Deployment Complete."
