@echo off
title MIRA - servidor local
echo ============================================
echo   MIRA - encendiendo...
echo   Deja esta ventana abierta mientras juegas.
echo ============================================
cd /d "%~dp0"
start "" http://localhost:8787/
node server.js
pause
