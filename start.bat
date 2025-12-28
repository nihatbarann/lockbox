@echo off
echo ========================================
echo    LOCKBOX - Uygulama Baslatiliyor
echo ========================================
echo.

:: Node.js'i bul
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo HATA: Node.js bulunamadi!
    echo Lutfen https://nodejs.org adresinden indirin.
    pause
    exit /b 1
)

:: Eski islemleri durdur
taskkill /F /IM node.exe >nul 2>nul
timeout /t 2 /nobreak >nul

:: Backend baslat
echo Backend baslatiliyor...
cd /d "%~dp0server"
start "Lockbox Backend" cmd /k "npm run dev"

:: 5 saniye bekle
timeout /t 5 /nobreak >nul

:: Frontend baslat
echo Frontend baslatiliyor...
cd /d "%~dp0client"
start "Lockbox Frontend" cmd /k "set BROWSER=none && npm start"

echo.
echo ========================================
echo    Servisler baslatildi!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Lutfen 30-60 saniye bekleyin...
echo Tarayici otomatik acilacak.
echo.

:: 30 saniye bekle ve tarayiciyi ac
timeout /t 30 /nobreak >nul
start http://localhost:3000

echo Durdurmak icin her iki CMD penceresini kapatin
echo veya "taskkill /F /IM node.exe" komutunu calistirin.
pause
