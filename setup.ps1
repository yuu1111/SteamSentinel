# SteamSentinel セットアップスクリプト (PowerShell)
# このスクリプトは初回セットアップを自動化します

param(
    [switch]$SkipDependencies,
    [switch]$SkipDatabase,
    [switch]$SkipSeeding,
    [switch]$Help
)

function Show-Help {
    Write-Host "SteamSentinel セットアップスクリプト" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  .\setup.ps1                 # 完全セットアップ"
    Write-Host "  .\setup.ps1 -SkipDependencies  # 依存関係インストールをスキップ"
    Write-Host "  .\setup.ps1 -SkipDatabase      # データベース初期化をスキップ"
    Write-Host "  .\setup.ps1 -SkipSeeding       # プリセットゲーム投入をスキップ"
    Write-Host "  .\setup.ps1 -Help              # このヘルプを表示"
    Write-Host ""
    Write-Host "前提条件:" -ForegroundColor Yellow
    Write-Host "  - Node.js 18.0.0以上がインストールされていること"
    Write-Host "  - .envファイルにITAD_API_KEYが設定されていること"
    Write-Host ""
    Write-Host "APIキー取得URL:" -ForegroundColor Green
    Write-Host "  https://isthereanydeal.com/dev/app/"
}

function Test-Prerequisites {
    Write-Host "前提条件をチェック中..." -ForegroundColor Yellow
    
    # Node.js バージョンチェック
    try {
        $nodeVersion = node --version
        $versionNumber = $nodeVersion.Replace('v', '')
        $majorVersion = [int]($versionNumber.Split('.')[0])
        
        if ($majorVersion -ge 18) {
            Write-Host "✅ Node.js $nodeVersion が見つかりました" -ForegroundColor Green
        } else {
            Write-Host "❌ Node.js 18.0.0以上が必要です。現在: $nodeVersion" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Node.jsが見つかりません。https://nodejs.org/ からインストールしてください" -ForegroundColor Red
        exit 1
    }
    
    # npm バージョンチェック
    try {
        $npmVersion = npm --version
        Write-Host "✅ npm $npmVersion が見つかりました" -ForegroundColor Green
    } catch {
        Write-Host "❌ npmが見つかりません" -ForegroundColor Red
        exit 1
    }
}

function Install-Dependencies {
    if ($SkipDependencies) {
        Write-Host "依存関係のインストールをスキップしました" -ForegroundColor Yellow
        return
    }
    
    Write-Host "📦 依存関係をインストール中..." -ForegroundColor Cyan
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 依存関係のインストールが完了しました" -ForegroundColor Green
    } else {
        Write-Host "❌ 依存関係のインストールに失敗しました" -ForegroundColor Red
        exit 1
    }
}

function Setup-Environment {
    Write-Host "🔧 環境設定をチェック中..." -ForegroundColor Cyan
    
    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-Host "✅ .env.exampleから.envファイルを作成しました" -ForegroundColor Green
            Write-Host "⚠️  .envファイルを編集してITAD_API_KEYを設定してください" -ForegroundColor Yellow
            Write-Host "   APIキー取得URL: https://isthereanydeal.com/dev/app/" -ForegroundColor Cyan
        } else {
            Write-Host "❌ .env.exampleファイルが見つかりません" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✅ .envファイルが見つかりました" -ForegroundColor Green
    }
}

function Build-Application {
    Write-Host "🏗️  アプリケーションをビルド中..." -ForegroundColor Cyan
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ ビルドが完了しました" -ForegroundColor Green
    } else {
        Write-Host "❌ ビルドに失敗しました" -ForegroundColor Red
        exit 1
    }
}

function Initialize-Database {
    if ($SkipDatabase) {
        Write-Host "データベース初期化をスキップしました" -ForegroundColor Yellow
        return
    }
    
    Write-Host "💾 データベースを初期化中..." -ForegroundColor Cyan
    npm run db:init
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ データベースの初期化が完了しました" -ForegroundColor Green
    } else {
        Write-Host "❌ データベースの初期化に失敗しました" -ForegroundColor Red
        exit 1
    }
}

function Seed-Games {
    if ($SkipSeeding) {
        Write-Host "プリセットゲーム投入をスキップしました" -ForegroundColor Yellow
        return
    }
    
    Write-Host "🎮 プリセットゲームを投入中..." -ForegroundColor Cyan
    npm run seed:games
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ プリセットゲームの投入が完了しました" -ForegroundColor Green
    } else {
        Write-Host "❌ プリセットゲームの投入に失敗しました" -ForegroundColor Red
        exit 1
    }
}

function Show-Completion {
    Write-Host ""
    Write-Host "🎉 SteamSentinel のセットアップが完了しました！" -ForegroundColor Green
    Write-Host "===========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "次のステップ:" -ForegroundColor Cyan
    Write-Host "1. .envファイルでITAD_API_KEYを設定 (未設定の場合)"
    Write-Host "2. 開発サーバーを起動: .\start.ps1 -Dev"
    Write-Host "3. ブラウザで http://localhost:3000 にアクセス"
    Write-Host ""
    Write-Host "コマンド:" -ForegroundColor Yellow
    Write-Host "  .\start.ps1 -Dev     # 開発サーバー起動"
    Write-Host "  .\start.ps1          # 本番サーバー起動"
    Write-Host "  .\build.ps1          # ビルドのみ実行"
    Write-Host ""
    Write-Host "APIキー取得URL:" -ForegroundColor Green
    Write-Host "  https://isthereanydeal.com/dev/app/"
}

# メイン実行
if ($Help) {
    Show-Help
    exit 0
}

try {
    Write-Host "🎮 SteamSentinel セットアップ開始" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    
    Test-Prerequisites
    Install-Dependencies
    Setup-Environment
    Build-Application
    Initialize-Database
    Seed-Games
    Show-Completion
    
} catch {
    Write-Host "❌ セットアップ中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}