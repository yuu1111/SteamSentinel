@echo off
REM SteamSentinel Start Script Helper (Batch)
REM This file executes start.ps1 with PowerShell 7+

setlocal

REM Check for PowerShell 7+ (pwsh) existence
where pwsh >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] PowerShell 7+ found
    for /f "tokens=*" %%i in ('pwsh -NoProfile -Command "$PSVersionTable.PSVersion.ToString()"') do echo [INFO] Version: %%i
    goto :run_script
)

REM PowerShell 7+ not found
echo.
echo [ERROR] PowerShell 7+ (pwsh) not found
echo.
echo SteamSentinel requires PowerShell 7+.
echo Please download and install from:
echo.
echo   ^> https://aka.ms/PSWindows
echo.
echo After installation, run this file again.
echo.
echo Alternative methods:
echo   1. Run directly with Windows PowerShell (powershell.exe):
echo      powershell.exe -ExecutionPolicy Bypass -File start.ps1
echo   2. Open start.ps1 in PowerShell ISE and run
echo.
pause
exit /b 1

:run_script
echo [INFO] Starting SteamSentinel...
echo.

REM Execute script with temporary execution policy change
pwsh.exe -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*

REM Check execution result
if %errorlevel% equ 0 (
    echo.
    echo [INFO] SteamSentinel has exited
    echo.
) else (
    echo.
    echo [ERROR] Error occurred during startup
    echo Check PowerShell output for details
    echo.
)

pause
endlocal