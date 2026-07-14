# Run from repository root
# Creates branch, stages all changes, commits and pushes to origin
param(
    [string]$branch = "backend-integration-fix",
    [string]$message = "Backend/frontend integration: mapping fixes, employee inline-edit, E2E tests"
)
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git is not installed or not on PATH. Install Git for Windows and re-run this script."
    exit 1
}
Write-Output "Creating branch $branch (or switching to it)"
git checkout -b $branch 2>$null || git checkout $branch
Write-Output "Staging changes"
git add -A
Write-Output "Committing"
git commit -m $message
Write-Output "Pushing to origin/$branch"
git push -u origin $branch
Write-Output "Done. Run tests locally: node backend/test_api.js and node backend/test_ui_e2e.js"