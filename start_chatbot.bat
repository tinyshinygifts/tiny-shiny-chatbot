@echo off
cd /d "%~dp0"
title Tiny Shiny Chatbot
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Please install Node.js LTS from https://nodejs.org/
  pause
  exit /b
)
if not exist node_modules (
  echo Installing packages first time...
  call npm install
) else (
  echo Packages already installed.
)
echo.
echo Starting Tiny Shiny Chatbot...
echo Main page: http://localhost:5057
echo Admin: http://localhost:5057/admin.html
echo API Settings: http://localhost:5057/api-settings.html
echo.
start "" "http://localhost:5057/admin.html"
call npm start
pause
