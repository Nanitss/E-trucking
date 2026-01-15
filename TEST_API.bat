@echo off
echo ========================================
echo Testing Report API Endpoints
echo ========================================
echo.

echo Testing: /api/reports/trucks/count
curl http://localhost:5007/api/reports/trucks/count
echo.
echo.

echo Testing: /api/reports/drivers/count
curl http://localhost:5007/api/reports/drivers/count
echo.
echo.

echo Testing: /api/reports/deliveries/count
curl http://localhost:5007/api/reports/deliveries/count
echo.
echo.

echo ========================================
echo If you see JSON responses above, the API is working!
echo If you see "Cannot GET" or 404, the server needs to be restarted.
echo ========================================
pause
