@echo off
title Hali Saha Pro - GitHub Yukleme Araci
color 0A
echo ========================================================
echo   HALI SAHA PRO - GITHUB YUKLEME ARACI
echo ========================================================
echo.
echo Depo: https://github.com/Carleman0534/halisaha-pro.git
echo.
echo Kodlar GitHub'a gonderiliyor...
echo.

cd /d "C:\Users\ASUS\.gemini\antigravity\scratch\halisaha-app"
git add .
git commit -m "update: halisaha pro sync" >nul 2>&1
git branch -M main
git push -u origin main --force

echo.
if %ERRORLEVEL% EQU 0 (
    color 0A
    echo ========================================================
    echo   TEBRIKLER! Tum dosyalar GitHub'a basariyla yuklendi!
    echo ========================================================
    echo.
    echo Simdi vercel.com veya netlify uzerinden siteniz guncellendi.
) else (
    color 0C
    echo ========================================================
    echo   Bir hata olustu.
    echo ========================================================
)
echo.
pause
