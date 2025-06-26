#!/bin/bash
# SteamSentinel セットアップスクリプト (Bash)
# このスクリプトは初回セットアップを自動化します

set -e  # エラー時に終了

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# オプション解析
SKIP_DEPENDENCIES=false
SKIP_DATABASE=false
SKIP_SEEDING=false
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-dependencies)
            SKIP_DEPENDENCIES=true
            shift
            ;;
        --skip-database)
            SKIP_DATABASE=true
            shift
            ;;
        --skip-seeding)
            SKIP_SEEDING=true
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
    echo -e "${CYAN}SteamSentinel セットアップスクリプト${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo "使用方法:"
    echo "  ./setup.sh                    # 完全セットアップ"
    echo "  ./setup.sh --skip-dependencies  # 依存関係インストールをスキップ"
    echo "  ./setup.sh --skip-database      # データベース初期化をスキップ"
    echo "  ./setup.sh --skip-seeding       # プリセットゲーム投入をスキップ"
    echo "  ./setup.sh --help               # このヘルプを表示"
    echo ""
    echo -e "${YELLOW}前提条件:${NC}"
    echo "  - Node.js 18.0.0以上がインストールされていること"
    echo "  - .envファイルにITAD_API_KEYが設定されていること"
    echo ""
    echo -e "${GREEN}APIキー取得URL:${NC}"
    echo "  https://isthereanydeal.com/dev/app/"
}

test_prerequisites() {
    echo -e "${YELLOW}前提条件をチェック中...${NC}"
    
    # Node.js バージョンチェック
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version | sed 's/v//')
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
        
        if [ "$MAJOR_VERSION" -ge 18 ]; then
            echo -e "${GREEN}✅ Node.js v$NODE_VERSION が見つかりました${NC}"
        else
            echo -e "${RED}❌ Node.js 18.0.0以上が必要です。現在: v$NODE_VERSION${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Node.jsが見つかりません。https://nodejs.org/ からインストールしてください${NC}"
        exit 1
    fi
    
    # npm バージョンチェック
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        echo -e "${GREEN}✅ npm $NPM_VERSION が見つかりました${NC}"
    else
        echo -e "${RED}❌ npmが見つかりません${NC}"
        exit 1
    fi
}

install_dependencies() {
    if [ "$SKIP_DEPENDENCIES" = true ]; then
        echo -e "${YELLOW}依存関係のインストールをスキップしました${NC}"
        return
    fi
    
    echo -e "${CYAN}📦 依存関係をインストール中...${NC}"
    npm install
    
    echo -e "${GREEN}✅ 依存関係のインストールが完了しました${NC}"
}

setup_environment() {
    echo -e "${CYAN}🔧 環境設定をチェック中...${NC}"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp ".env.example" ".env"
            echo -e "${GREEN}✅ .env.exampleから.envファイルを作成しました${NC}"
            echo -e "${YELLOW}⚠️  .envファイルを編集してITAD_API_KEYを設定してください${NC}"
            echo -e "${CYAN}   APIキー取得URL: https://isthereanydeal.com/dev/app/${NC}"
        else
            echo -e "${RED}❌ .env.exampleファイルが見つかりません${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ .envファイルが見つかりました${NC}"
    fi
}

build_application() {
    echo -e "${CYAN}🏗️  アプリケーションをビルド中...${NC}"
    npm run build
    
    echo -e "${GREEN}✅ ビルドが完了しました${NC}"
}

initialize_database() {
    if [ "$SKIP_DATABASE" = true ]; then
        echo -e "${YELLOW}データベース初期化をスキップしました${NC}"
        return
    fi
    
    echo -e "${CYAN}💾 データベースを初期化中...${NC}"
    npm run db:init
    
    echo -e "${GREEN}✅ データベースの初期化が完了しました${NC}"
}

seed_games() {
    if [ "$SKIP_SEEDING" = true ]; then
        echo -e "${YELLOW}プリセットゲーム投入をスキップしました${NC}"
        return
    fi
    
    echo -e "${CYAN}🎮 プリセットゲームを投入中...${NC}"
    npm run seed:games
    
    echo -e "${GREEN}✅ プリセットゲームの投入が完了しました${NC}"
}

show_completion() {
    echo ""
    echo -e "${GREEN}🎉 SteamSentinel のセットアップが完了しました！${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo ""
    echo -e "${CYAN}次のステップ:${NC}"
    echo "1. .envファイルでITAD_API_KEYを設定 (未設定の場合)"
    echo "2. 開発サーバーを起動: ./start.sh --dev"
    echo "3. ブラウザで http://localhost:3000 にアクセス"
    echo ""
    echo -e "${YELLOW}コマンド:${NC}"
    echo "  ./start.sh --dev    # 開発サーバー起動"
    echo "  ./start.sh          # 本番サーバー起動"
    echo "  ./build.sh          # ビルドのみ実行"
    echo ""
    echo -e "${GREEN}APIキー取得URL:${NC}"
    echo "  https://isthereanydeal.com/dev/app/"
}

# メイン実行
if [ "$SHOW_HELP" = true ]; then
    show_help
    exit 0
fi

echo -e "${CYAN}🎮 SteamSentinel セットアップ開始${NC}"
echo -e "${CYAN}================================${NC}"

test_prerequisites
install_dependencies
setup_environment
build_application
initialize_database
seed_games
show_completion