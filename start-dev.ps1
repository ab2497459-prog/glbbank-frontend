# Start backend and frontend in separate PowerShell windows
# Usage: Right-click -> Run with PowerShell or execute from project root

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$scriptDir\\backend'; node server.js"
Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$scriptDir'; npx http-server . -p 8080"
