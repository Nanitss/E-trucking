@echo off
echo ========================================
echo Starting Trucking Web App Servers
echo ========================================
echo.

REM Kill any existing node processes
echo Stopping existing Node processes...
taskkill /f /im node.exe >nul 2>&1

echo.
echo Starting Backend Server...
cd client\server
start "Backend Server" cmd /k "node server.js"

timeout /t 3 >nul

echo.
echo Starting Frontend Client...
cd ..\
start "Frontend Client" cmd /k "npm start"

echo.
echo ========================================
echo Servers are starting!
echo Backend: http://localhost:5007
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
