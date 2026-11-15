@echo off
title OpenGrok
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20+ is required. Install it from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install || goto :fail
)

rem Delete the .next folder to force a rebuild after updating the code.
if not exist .next\BUILD_ID (
  echo Building OpenGrok...
  call npm run build || goto :fail
)

echo Starting OpenGrok at http://127.0.0.1:3000 (close this window to stop it)
start "" /b cmd /c "ping -n 5 127.0.0.1 >nul & start "" http://127.0.0.1:3000"
call npm start
pause
exit /b

:fail
echo.
echo Something went wrong. See the messages above.
pause
exit /b 1
