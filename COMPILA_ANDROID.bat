@echo off
title LolloMap Pro - crea APK
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0compila.ps1"
pause
