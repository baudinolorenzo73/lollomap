@echo off
title LolloMap Pro - crea APK
rem Lollomap per Android - doppio clic per compilare. by Lollo (R)2026
rem Avvia compila.ps1 che si trova nella stessa cartella di questo file.
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0compila.ps1" %*
