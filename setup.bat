@echo off
REM SteamSentinel Setup Script Helper (Batch)
REM This file executes setup.ps1 with PowerShell 7+

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
echo      powershell.exe -ExecutionPolicy Bypass -File setup.ps1
echo   2. Open setup.ps1 in PowerShell ISE and run
echo.
pause
exit /b 1

:run_script
echo [INFO] Starting SteamSentinel setup...
echo.

REM Execute script with temporary execution policy change
pwsh.exe -ExecutionPolicy Bypass -File "%~dp0setup.ps1" %*

REM Check execution result
if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Setup completed successfully!
    echo.
    echo Next steps:
    echo   1. Set ITAD_API_KEY in .env file
    echo   2. Run start.bat to start the server
    echo.
) else (
    echo.
    echo [ERROR] Error occurred during setup
    echo Check PowerShell output for details
    echo.
)

pause
endlocal