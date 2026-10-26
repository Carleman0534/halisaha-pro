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

cd /d "C:\Users\user\Desktop\halisaha-pro-main"

set "GIT_CMD=C:\Users\user\AppData\Local\Programs\MinGit\cmd\git.exe"

"%GIT_CMD%" branch -M main
"%GIT_CMD%" add .
"%GIT_CMD%" commit -m "update: halisaha pro sync" >nul 2>&1
"%GIT_CMD%" push -u origin main --force

echo.
if %ERRORLEVEL% EQU 0 (
    color 0A
    echo ========================================================
    echo   TEBRIKLER! Tum dosyalar GitHub'a basariyla yuklendi!
    echo ========================================================
    echo.
    echo Siteniz guncellendi.
) else (
    color 0C
    echo ========================================================
    echo   Bir hata olustu.
    echo ========================================================
    echo.
    echo Eger GitHub kullanici adi ve sifre/token sorarsa,
    echo lutfen bilgilerinizi giriniz.
)
echo.
pause