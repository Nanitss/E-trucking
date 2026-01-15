@echo off
echo ========================================
echo Fixing Stuck Driver and Helper Statuses
echo ========================================
echo.
echo This will restore drivers and helpers from
echo completed/cancelled deliveries to active status.
echo.
echo Make sure your servers are running first!
echo.
pause

echo.
echo Fixing drivers...
curl -X POST http://localhost:5007/api/drivers/fix-stuck-statuses ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

echo.
echo.
echo Fixing helpers...
curl -X POST http://localhost:5007/api/helpers/fix-stuck-statuses ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

echo.
echo.
echo ========================================
echo Fix completed!
echo ========================================
pause
