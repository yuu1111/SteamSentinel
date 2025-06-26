# SteamSentinel 起動スクリプト (PowerShell)
# このスクリプトはアプリケーションの起動処理を実行します

param(
    [switch]$Dev,
    [switch]$Build,
    [switch]$Stop,
    [switch]$Status,
    [string]$Port = "",
    [string]$Host = "",
    [switch]$Help
)

function Show-Help {
    Write-Host "SteamSentinel 起動スクリプト" -ForegroundColor Cyan
    Write-Host "============================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  .\start.ps1              # 本番サーバー起動"
    Write-Host "  .\start.ps1 -Dev         # 開発サーバー起動（ホットリロード）"
    Write-Host "  .\start.ps1 -Build       # ビルド後に本番サーバー起動"
    Write-Host "  .\start.ps1 -Stop        # 実行中のプロセスを停止"
    Write-Host "  .\start.ps1 -Status      # サーバー状況確認"
    Write-Host "  .\start.ps1 -Port 3001   # 指定ポートで起動"
    Write-Host "  .\start.ps1 -Help        # このヘルプを表示"
    Write-Host ""
    Write-Host "オプション:" -ForegroundColor Yellow
    Write-Host "  -Dev       : 開発モード（nodemon使用、ホットリロード）"
    Write-Host "  -Build     : 起動前にビルドを実行"
    Write-Host "  -Stop      : 実行中のNode.jsプロセスを停止"
    Write-Host "  -Status    : サーバーの実行状況を確認"
    Write-Host "  -Port      : 起動ポートを指定（デフォルト: 3000）"
    Write-Host "  -Host      : バインドホストを指定（デフォルト: 127.0.0.1）"
    Write-Host ""
    Write-Host "前提条件:" -ForegroundColor Green
    Write-Host "  - .envファイルにITAD_API_KEYが設定されていること"
    Write-Host "  - データベースが初期化されていること（npm run db:init）"
}

function Test-Prerequisites {
    Write-Host "前提条件をチェック中..." -ForegroundColor Yellow
    
    # .envファイルの存在確認
    if (-not (Test-Path ".env")) {
        Write-Host "❌ .envファイルが見つかりません" -ForegroundColor Red
        Write-Host "   .\setup.ps1 を実行するか、.env.exampleから.envを作成してください" -ForegroundColor Yellow
        exit 1
    }
    
    # package.jsonの存在確認
    if (-not (Test-Path "package.json")) {
        Write-Host "❌ package.jsonが見つかりません" -ForegroundColor Red
        exit 1
    }
    
    # node_modulesの存在確認
    if (-not (Test-Path "node_modules")) {
        Write-Host "❌ node_modulesが見つかりません" -ForegroundColor Red
        Write-Host "   npm install を実行してください" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ 前提条件チェック完了" -ForegroundColor Green
}

function Set-Environment {
    # ポート設定
    if ($Port -ne "") {
        $env:WEB_PORT = $Port
        Write-Host "📡 ポートを $Port に設定しました" -ForegroundColor Cyan
    }
    
    # ホスト設定
    if ($Host -ne "") {
        $env:WEB_HOST = $Host
        Write-Host "🌐 ホストを $Host に設定しました" -ForegroundColor Cyan
    }
    
    # 環境変数の表示
    $currentPort = if ($env:WEB_PORT) { $env:WEB_PORT } else { "3000" }
    $currentHost = if ($env:WEB_HOST) { $env:WEB_HOST } else { "127.0.0.1" }
    Write-Host "🔗 サーバー: http://${currentHost}:${currentPort}" -ForegroundColor Green
}

function Build-Application {
    if ($Build) {
        Write-Host "🏗️  アプリケーションをビルド中..." -ForegroundColor Cyan
        .\build.ps1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ ビルドに失敗しました" -ForegroundColor Red
            exit 1
        }
    }
}

function Stop-Server {
    Write-Host "🛑 SteamSentinelプロセスを停止中..." -ForegroundColor Yellow
    
    # Node.jsプロセスを検索
    $nodeProcesses = Get-Process | Where-Object { 
        $_.ProcessName -eq "node" -and 
        $_.MainWindowTitle -like "*SteamSentinel*" 
    }
    
    if ($nodeProcesses.Count -eq 0) {
        # ポート3000を使用しているプロセスを検索
        try {
            $portProcesses = netstat -ano | Select-String ":3000" | ForEach-Object {
                $fields = $_.ToString().Trim() -split '\s+'
                if ($fields.Length -ge 5) {
                    $pid = $fields[4]
                    Get-Process -Id $pid -ErrorAction SilentlyContinue
                }
            } | Where-Object { $_ -ne $null }
            
            if ($portProcesses.Count -gt 0) {
                foreach ($process in $portProcesses) {
                    Write-Host "🛑 ポート3000を使用中のプロセス PID:$($process.Id) を停止します" -ForegroundColor Yellow
                    Stop-Process -Id $process.Id -Force
                    Write-Host "✅ プロセス PID:$($process.Id) を停止しました" -ForegroundColor Green
                }
            } else {
                Write-Host "ℹ️  実行中のSteamSentinelプロセスが見つかりません" -ForegroundColor Cyan
            }
        } catch {
            Write-Host "ℹ️  実行中のプロセスが見つかりません" -ForegroundColor Cyan
        }
    } else {
        foreach ($process in $nodeProcesses) {
            Write-Host "🛑 SteamSentinelプロセス PID:$($process.Id) を停止します" -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force
            Write-Host "✅ プロセス PID:$($process.Id) を停止しました" -ForegroundColor Green
        }
    }
}

function Get-ServerStatus {
    Write-Host "📊 SteamSentinel サーバー状況" -ForegroundColor Cyan
    Write-Host "=============================" -ForegroundColor Cyan
    
    # ポート3000の使用状況確認
    try {
        $portInfo = netstat -ano | Select-String ":3000"
        if ($portInfo) {
            Write-Host "✅ ポート3000が使用中です" -ForegroundColor Green
            Write-Host $portInfo -ForegroundColor Gray
        } else {
            Write-Host "❌ ポート3000は使用されていません" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ ポート情報の取得に失敗しました" -ForegroundColor Red
    }
    
    # プロセス確認
    $nodeProcesses = Get-Process | Where-Object { $_.ProcessName -eq "node" }
    if ($nodeProcesses.Count -gt 0) {
        Write-Host "🔍 実行中のNode.jsプロセス:" -ForegroundColor Cyan
        foreach ($process in $nodeProcesses) {
            Write-Host "  PID:$($process.Id) - $($process.ProcessName)" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Node.jsプロセスが見つかりません" -ForegroundColor Red
    }
    
    # サーバーテスト
    try {
        $currentPort = if ($env:WEB_PORT) { $env:WEB_PORT } else { "3000" }
        $currentHost = if ($env:WEB_HOST) { $env:WEB_HOST } else { "127.0.0.1" }
        $response = Invoke-WebRequest -Uri "http://${currentHost}:${currentPort}" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ サーバーが応答しています (Status: $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "❌ サーバーが応答していません" -ForegroundColor Red
    }
}

function Start-DevServer {
    Write-Host "🚀 開発サーバーを起動中..." -ForegroundColor Cyan
    Write-Host "Ctrl+C で停止できます" -ForegroundColor Yellow
    
    npm run dev
}

function Start-ProductionServer {
    # ビルドファイルの確認
    if (-not (Test-Path "dist/index.js")) {
        Write-Host "❌ ビルドファイルが見つかりません" -ForegroundColor Red
        Write-Host "   .\build.ps1 または .\start.ps1 -Build を実行してください" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "🚀 本番サーバーを起動中..." -ForegroundColor Cyan
    Write-Host "Ctrl+C で停止できます" -ForegroundColor Yellow
    
    npm start
}

function Show-PostStart {
    $currentPort = if ($env:WEB_PORT) { $env:WEB_PORT } else { "3000" }
    $currentHost = if ($env:WEB_HOST) { $env:WEB_HOST } else { "127.0.0.1" }
    
    Write-Host ""
    Write-Host "🎉 SteamSentinel が起動しました！" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "アクセス URL:" -ForegroundColor Cyan
    Write-Host "  http://${currentHost}:${currentPort}" -ForegroundColor Green
    Write-Host ""
    Write-Host "操作:" -ForegroundColor Yellow
    Write-Host "  Ctrl+C    : サーバー停止"
    Write-Host "  F5        : ブラウザ更新"
    Write-Host ""
    Write-Host "ログファイル:" -ForegroundColor Cyan
    Write-Host "  logs/steam-sentinel-$(Get-Date -Format 'yyyy-MM-dd').log"
}

# メイン実行
if ($Help) {
    Show-Help
    exit 0
}

if ($Stop) {
    Stop-Server
    exit 0
}

if ($Status) {
    Get-ServerStatus
    exit 0
}

try {
    Write-Host "🎮 SteamSentinel 起動準備" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    
    Test-Prerequisites
    Set-Environment
    Build-Application
    
    if ($Dev) {
        Start-DevServer
    } else {
        Start-ProductionServer
    }
    
} catch {
    Write-Host "❌ 起動中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}