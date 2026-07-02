@echo off
setlocal
cd /d "%~dp0"

echo Building green portable folder...
set ELECTRON_RUN_AS_NODE=
set ELECTRON_CACHE=%~dp0.cache\electron
set ELECTRON_BUILDER_CACHE=%~dp0.cache\electron-builder
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

npm run pack:dir

echo.
echo If build succeeds, open release\win-unpacked and run AIStudio.exe.
pause