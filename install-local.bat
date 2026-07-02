@echo off
setlocal

set "APP_NAME=AIStudio"
set "TARGET_DIR=%LOCALAPPDATA%\%APP_NAME%"
set "SCRIPT_DIR=%~dp0"
set "SOURCE_DIR="

if exist "%SCRIPT_DIR%AIStudio.exe" (
  set "SOURCE_DIR=%SCRIPT_DIR%."
) else if exist "%SCRIPT_DIR%win-unpacked\AIStudio.exe" (
  set "SOURCE_DIR=%SCRIPT_DIR%win-unpacked"
) else if exist "%SCRIPT_DIR%release\win-unpacked\AIStudio.exe" (
  set "SOURCE_DIR=%SCRIPT_DIR%release\win-unpacked"
)

if "%SOURCE_DIR%"=="" (
  echo Cannot find AIStudio.exe.
  echo.
  echo Put this script in one of these locations:
  echo 1. Next to AIStudio.exe inside win-unpacked
  echo 2. Next to the win-unpacked folder
  echo 3. Project root that contains release\win-unpacked
  echo.
  pause
  exit /b 1
)

echo Source:
echo %SOURCE_DIR%
echo.
echo Target:
echo %TARGET_DIR%
echo.
echo Copying files to local computer...

if not exist "%TARGET_DIR%" (
  mkdir "%TARGET_DIR%"
)

robocopy "%SOURCE_DIR%" "%TARGET_DIR%" /MIR /R:2 /W:1 /NFL /NDL /NP
set "COPY_CODE=%ERRORLEVEL%"

if %COPY_CODE% GEQ 8 (
  echo.
  echo Copy failed. Robocopy exit code: %COPY_CODE%
  pause
  exit /b %COPY_CODE%
)

if not exist "%TARGET_DIR%\AIStudio.exe" (
  echo.
  echo AIStudio.exe was not copied successfully.
  pause
  exit /b 1
)

echo.
echo Starting local AIStudio...
endlocal
start "" /D "%LOCALAPPDATA%\AIStudio" "%LOCALAPPDATA%\AIStudio\AIStudio.exe"
exit
