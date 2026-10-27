@echo off
title HALI SAHA PRO - GITHUB YUKLEME ARACI
color 0A

echo ========================================================
echo   HALI SAHA PRO - GITHUB YUKLEME ARACI
echo ========================================================
echo.
echo Depo: https://github.com/Carleman0534/halisaha-pro.git
echo.
echo Kodlar GitHub'a gonderiliyor...
echo.

set "PATH=%LOCALAPPDATA%\Programs\MinGit\cmd;%LOCALAPPDATA%\Programs\GCM;%PATH%"

cd /d "%~dp0"

git branch -M main
git add .
git commit -m "feat: responsive mobile app and desktop web layout" >nul 2>&1
git pull --rebase origin main
git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    color 0A
    echo ========================================================
    echo   TEBRIKLER! Tum dosyalar GitHub'a basariyla yuklendi!
    echo ========================================================
    echo.
    echo Vercel veya Netlify uzerindeki siteniz otomatik guncellendi.
) else (
    color 0C
    echo ========================================================
    echo   Bir hata olustu.
    echo ========================================================
    echo.
    echo Eger GitHub tarayici onay ekrani actiysa, lutfen tarayicida
    echo "Authorize" butonuna tiklayarak izni onaylayiniz.
)
echo.
pause
