@echo off
echo Starting Windows Activity Tracker...
echo.
echo Make sure the backend server is running on http://localhost:8080
echo.
cd /d "%~dp0"
npm start
pause
