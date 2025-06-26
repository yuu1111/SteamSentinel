@echo off
REM SteamSentinel 起動スクリプト実行補助 (Batch)
REM このファイルはstart.ps1をPowerShell 7+で実行します

setlocal

REM PowerShell 7+ (pwsh) の存在確認
where pwsh >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] PowerShell 7+ が見つかりました
    goto :run_script
)

REM PowerShell 7+ が見つからない場合
echo.
echo [ERROR] PowerShell 7+ (pwsh) が見つかりません
echo.
echo SteamSentinelを実行するには PowerShell 7+ が必要です。
echo 以下のURLからダウンロード・インストールしてください：
echo.
echo   ^> https://aka.ms/PSWindows
echo.
echo インストール後、このファイルを再実行してください。
echo.
echo 代替方法:
echo   1. Windows PowerShell (powershell.exe) で直接実行:
echo      powershell.exe -ExecutionPolicy Bypass -File start.ps1
echo   2. PowerShell ISE で start.ps1 を開いて実行
echo.
pause
exit /b 1

:run_script
echo [INFO] SteamSentinel を起動します...
echo.

REM PowerShell実行ポリシーを一時的に変更してスクリプト実行
pwsh.exe -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*

REM 実行結果の確認
if %errorlevel% equ 0 (
    echo.
    echo [INFO] SteamSentinel が終了しました
    echo.
) else (
    echo.
    echo [ERROR] 起動中にエラーが発生しました
    echo 詳細はPowerShellの出力を確認してください
    echo.
)

pause
endlocal