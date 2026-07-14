@echo off
REM Starts backend and frontend in separate command windows (Windows)
REM Usage: double-click or run from project root

REM Start backend
start cmd /k "cd /d %~dp0backend && node server.js"

REM Start frontend
start cmd /k "cd /d %~dp0 && npx http-server . -p 8080"

exit /b 0
