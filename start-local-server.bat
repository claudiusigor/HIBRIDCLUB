@echo off
setlocal
cd /d "%~dp0"

echo Starting Hybrid Club local server...
echo.

if not exist node_modules (
  echo Installing dependencies. This can take a few minutes...
  npm.cmd install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

start "" cmd /c "timeout /t 4 /nobreak >nul && start "" http://127.0.0.1:5173/"

npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort --force --clearScreen false

echo.
echo Server stopped.
pause
