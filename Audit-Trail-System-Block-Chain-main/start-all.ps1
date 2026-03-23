# start-all.ps1
# Run from repo root (contains backend/, frontend/, blockchain/ folders)

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Helper to start a new terminal window
function Start-Window([string]$title, [string]$workdir, [string]$command) {
    $psCommand = "`$host.UI.RawUI.WindowTitle = '$title'; Set-Location -Path `"$workdir`"; $command"
    Start-Process -FilePath "pwsh" -ArgumentList "-NoExit", "-Command", $psCommand -WindowStyle Normal -WorkingDirectory $workdir
}

# 1) Hardhat node
Start-Window -title "Hardhat Node" -workdir (Join-Path $root "blockchain") -command "npx hardhat node"

# 2) Backend (FastAPI)
Start-Window -title "Backend (FastAPI)" -workdir (Join-Path $root "backend") -command "pip install -r requirements.txt; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

# 3) Frontend (React/Vite)
Start-Window -title "Frontend (Vite)" -workdir (Join-Path $root "frontend\audit-trail-system") -command "npm install; npm run dev"