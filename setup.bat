@echo off
setlocal
cd /d "%~dp0"

echo Installing dependencies...
set ELECTRON_RUN_AS_NODE=
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm install

echo.
echo Done. If there are no error messages above, you can run start-dev.bat.
pause
