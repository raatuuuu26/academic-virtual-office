@echo off
title Kantor Virtual Asisten Kuliah
echo Mengirim notifikasi ke Windows...
powershell -ExecutionPolicy Bypass -File "%~dp0notifikasi_startup.ps1"
echo Membuka browser...
start http://localhost:3000
exit
