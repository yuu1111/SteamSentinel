# SteamSentinel ビルドスクリプト (PowerShell)
# このスクリプトはアプリケーションのビルド処理を実行します

param(
    [switch]$Clean,
    [switch]$TypeCheck,
    [switch]$Lint,
    [switch]$Help
)

function Show-Help {
    Write-Host "SteamSentinel ビルドスクリプト" -ForegroundColor Cyan
    Write-Host "==============================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  .\build.ps1              # 通常ビルド"
    Write-Host "  .\build.ps1 -Clean       # クリーンビルド"
    Write-Host "  .\build.ps1 -TypeCheck   # 型チェック付きビルド"
    Write-Host "  .\build.ps1 -Lint        # リンティング付きビルド"
    Write-Host "  .\build.ps1 -Clean -TypeCheck -Lint  # 全オプション"
    Write-Host "  .\build.ps1 -Help        # このヘルプを表示"
    Write-Host ""
    Write-Host "オプション:" -ForegroundColor Yellow
    Write-Host "  -Clean     : distフォルダを削除してからビルド"
    Write-Host "  -TypeCheck : 型チェックを実行"
    Write-Host "  -Lint      : ESLintでコード品質チェック"
}

function Remove-BuildDirectory {
    if ($Clean) {
        Write-Host "🧹 ビルドディレクトリをクリーンアップ中..." -ForegroundColor Yellow
        if (Test-Path "dist") {
            Remove-Item -Recurse -Force "dist"
            Write-Host "✅ distフォルダを削除しました" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  distフォルダは存在しません" -ForegroundColor Cyan
        }
    }
}

function Run-TypeCheck {
    if ($TypeCheck) {
        Write-Host "🔍 TypeScript型チェック中..." -ForegroundColor Cyan
        npm run typecheck
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 型チェックが完了しました" -ForegroundColor Green
        } else {
            Write-Host "❌ 型チェックでエラーが見つかりました" -ForegroundColor Red
            exit 1
        }
    }
}

function Run-Lint {
    if ($Lint) {
        Write-Host "📋 ESLintでコード品質チェック中..." -ForegroundColor Cyan
        npm run lint
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ リンティングが完了しました" -ForegroundColor Green
        } else {
            Write-Host "❌ リンティングでエラーが見つかりました" -ForegroundColor Red
            exit 1
        }
    }
}

function Build-Application {
    Write-Host "🏗️  TypeScriptコンパイル中..." -ForegroundColor Cyan
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ ビルドが完了しました" -ForegroundColor Green
        
        # ビルド結果の確認
        if (Test-Path "dist") {
            $distFiles = Get-ChildItem -Recurse "dist" | Where-Object { -not $_.PSIsContainer }
            Write-Host "📊 ビルド結果: $($distFiles.Count) ファイルが生成されました" -ForegroundColor Cyan
            
            # 主要ファイルの存在確認
            $importantFiles = @("dist/index.js", "dist/app.js")
            foreach ($file in $importantFiles) {
                if (Test-Path $file) {
                    $size = (Get-Item $file).Length
                    Write-Host "  ✅ $file ($(($size/1KB).ToString('F1'))KB)" -ForegroundColor Green
                } else {
                    Write-Host "  ❌ $file が見つかりません" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "❌ ビルドに失敗しました" -ForegroundColor Red
        exit 1
    }
}

function Show-BuildInfo {
    Write-Host ""
    Write-Host "📋 ビルド情報" -ForegroundColor Cyan
    Write-Host "=============" -ForegroundColor Cyan
    
    # Node.js バージョン
    $nodeVersion = node --version
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Gray
    
    # npm バージョン
    $npmVersion = npm --version
    Write-Host "npm: $npmVersion" -ForegroundColor Gray
    
    # TypeScript バージョン
    try {
        $tscVersion = npx tsc --version
        Write-Host "TypeScript: $tscVersion" -ForegroundColor Gray
    } catch {
        Write-Host "TypeScript: バージョン取得失敗" -ForegroundColor Red
    }
    
    # ビルド時刻
    $buildTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "ビルド時刻: $buildTime" -ForegroundColor Gray
}

function Show-Completion {
    Write-Host ""
    Write-Host "🎉 ビルドが完了しました！" -ForegroundColor Green
    Write-Host "========================" -ForegroundColor Green
    Write-Host ""
    Write-Host "次のステップ:" -ForegroundColor Cyan
    Write-Host "  .\start.ps1          # 本番サーバー起動"
    Write-Host "  .\start.ps1 -Dev     # 開発サーバー起動"
    Write-Host ""
    Write-Host "ファイル:" -ForegroundColor Yellow
    Write-Host "  dist/index.js        # メインアプリケーション"
    Write-Host "  public/              # 静的ファイル"
}

# メイン実行
if ($Help) {
    Show-Help
    exit 0
}

try {
    Write-Host "🏗️  SteamSentinel ビルド開始" -ForegroundColor Cyan
    Write-Host "===========================" -ForegroundColor Cyan
    
    Show-BuildInfo
    Remove-BuildDirectory
    Run-TypeCheck
    Run-Lint
    Build-Application
    Show-Completion
    
} catch {
    Write-Host "❌ ビルド中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}