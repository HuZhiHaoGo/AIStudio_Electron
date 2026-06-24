@echo off
setlocal
cd /d "%~dp0"

echo Starting AI assistant demo...
set ELECTRON_RUN_AS_NODE=
npm run dev

echo.
echo The app has stopped. Check the messages above if it did not open.
pause
