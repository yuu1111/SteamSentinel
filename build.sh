#!/bin/bash
# SteamSentinel ビルドスクリプト (Bash)
# このスクリプトはアプリケーションのビルド処理を実行します

set -e  # エラー時に終了

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# オプション解析
CLEAN=false
TYPE_CHECK=false
LINT=false
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN=true
            shift
            ;;
        --typecheck)
            TYPE_CHECK=true
            shift
            ;;
        --lint)
            LINT=true
            shift
            ;;
        -h|--help)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo -e "${RED}❌ 不明なオプション: $1${NC}"
            exit 1
            ;;
    esac
done

show_help() {
    echo -e "${CYAN}SteamSentinel ビルドスクリプト${NC}"
    echo -e "${CYAN}==============================${NC}"
    echo ""
    echo "使用方法:"
    echo "  ./build.sh                   # 通常ビルド"
    echo "  ./build.sh --clean           # クリーンビルド"
    echo "  ./build.sh --typecheck       # 型チェック付きビルド"
    echo "  ./build.sh --lint            # リンティング付きビルド"
    echo "  ./build.sh --clean --typecheck --lint  # 全オプション"
    echo "  ./build.sh --help            # このヘルプを表示"
    echo ""
    echo -e "${YELLOW}オプション:${NC}"
    echo "  --clean     : distフォルダを削除してからビルド"
    echo "  --typecheck : 型チェックを実行"
    echo "  --lint      : ESLintでコード品質チェック"
}

remove_build_directory() {
    if [ "$CLEAN" = true ]; then
        echo -e "${YELLOW}🧹 ビルドディレクトリをクリーンアップ中...${NC}"
        if [ -d "dist" ]; then
            rm -rf dist
            echo -e "${GREEN}✅ distフォルダを削除しました${NC}"
        else
            echo -e "${CYAN}ℹ️  distフォルダは存在しません${NC}"
        fi
    fi
}

run_typecheck() {
    if [ "$TYPE_CHECK" = true ]; then
        echo -e "${CYAN}🔍 TypeScript型チェック中...${NC}"
        npm run typecheck
        
        echo -e "${GREEN}✅ 型チェックが完了しました${NC}"
    fi
}

run_lint() {
    if [ "$LINT" = true ]; then
        echo -e "${CYAN}📋 ESLintでコード品質チェック中...${NC}"
        npm run lint
        
        echo -e "${GREEN}✅ リンティングが完了しました${NC}"
    fi
}

build_application() {
    echo -e "${CYAN}🏗️  TypeScriptコンパイル中...${NC}"
    npm run build
    
    echo -e "${GREEN}✅ ビルドが完了しました${NC}"
    
    # ビルド結果の確認
    if [ -d "dist" ]; then
        DIST_FILES=$(find dist -type f | wc -l)
        echo -e "${CYAN}📊 ビルド結果: $DIST_FILES ファイルが生成されました${NC}"
        
        # 主要ファイルの存在確認
        IMPORTANT_FILES=("dist/index.js" "dist/app.js")
        for file in "${IMPORTANT_FILES[@]}"; do
            if [ -f "$file" ]; then
                SIZE=$(du -h "$file" | cut -f1)
                echo -e "${GREEN}  ✅ $file ($SIZE)${NC}"
            else
                echo -e "${RED}  ❌ $file が見つかりません${NC}"
            fi
        done
    fi
}

show_build_info() {
    echo ""
    echo -e "${CYAN}📋 ビルド情報${NC}"
    echo -e "${CYAN}=============${NC}"
    
    # Node.js バージョン
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        echo -e "Node.js: $NODE_VERSION"
    fi
    
    # npm バージョン
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        echo -e "npm: $NPM_VERSION"
    fi
    
    # TypeScript バージョン
    if command -v npx >/dev/null 2>&1; then
        TSC_VERSION=$(npx tsc --version 2>/dev/null || echo "バージョン取得失敗")
        echo -e "TypeScript: $TSC_VERSION"
    fi
    
    # ビルド時刻
    BUILD_TIME=$(date "+%Y-%m-%d %H:%M:%S")
    echo -e "ビルド時刻: $BUILD_TIME"
}

show_completion() {
    echo ""
    echo -e "${GREEN}🎉 ビルドが完了しました！${NC}"
    echo -e "${GREEN}========================${NC}"
    echo ""
    echo -e "${CYAN}次のステップ:${NC}"
    echo "  ./start.sh           # 本番サーバー起動"
    echo "  ./start.sh --dev     # 開発サーバー起動"
    echo ""
    echo -e "${YELLOW}ファイル:${NC}"
    echo "  dist/index.js        # メインアプリケーション"
    echo "  public/              # 静的ファイル"
}

# メイン実行
if [ "$SHOW_HELP" = true ]; then
    show_help
    exit 0
fi

echo -e "${CYAN}🏗️  SteamSentinel ビルド開始${NC}"
echo -e "${CYAN}===========================${NC}"

show_build_info
remove_build_directory
run_typecheck
run_lint
build_application
show_completion