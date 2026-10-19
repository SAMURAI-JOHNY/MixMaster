# MixMaster smoke check: SPA + catalog API (2-3 steps).
# Usage: after `docker compose up --build -d`, run:
#   .\scripts\smoke-check.ps1
# Optional: .\scripts\smoke-check.ps1 -BaseUrl http://localhost:8080

param(
    [string]$BaseUrl = "http://localhost:8080"
)

$ErrorActionPreference = "Stop"

Write-Host "1/3 Checking SPA at $BaseUrl ..."
$spa = Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing -TimeoutSec 30
if ($spa.StatusCode -ne 200) {
    throw "SPA check failed: HTTP $($spa.StatusCode)"
}
Write-Host "   OK HTTP $($spa.StatusCode)"

$apiUrl = "$BaseUrl/api/v1/cocktails/"
Write-Host "2/3 Checking catalog API at $apiUrl ..."
$api = Invoke-WebRequest -Uri $apiUrl -UseBasicParsing -TimeoutSec 30
if ($api.StatusCode -ne 200) {
    throw "API check failed: HTTP $($api.StatusCode)"
}
Write-Host "   OK HTTP $($api.StatusCode)"

Write-Host "3/3 Checking JSON body ..."
$null = $api.Content | ConvertFrom-Json
Write-Host "   OK JSON parsed"

Write-Host ""
Write-Host "Smoke check passed. Open $BaseUrl in a browser for UI verification."
