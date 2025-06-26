#!/bin/bash
# SteamSentinel 起動スクリプト (Bash)
# このスクリプトはアプリケーションの起動処理を実行します

set -e  # エラー時に終了

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# オプション解析
DEV=false
BUILD=false
STOP=false
STATUS=false
PORT=""
HOST=""
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            DEV=true
            shift
            ;;
        --build)
            BUILD=true
            shift
            ;;
        --stop)
            STOP=true
            shift
            ;;
        --status)
            STATUS=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --host)
            HOST="$2"
            shift 2
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
    echo -e "${CYAN}SteamSentinel 起動スクリプト${NC}"
    echo -e "${CYAN}============================${NC}"
    echo ""
    echo "使用方法:"
    echo "  ./start.sh                   # 本番サーバー起動"
    echo "  ./start.sh --dev             # 開発サーバー起動（ホットリロード）"
    echo "  ./start.sh --build           # ビルド後に本番サーバー起動"
    echo "  ./start.sh --stop            # 実行中のプロセスを停止"
    echo "  ./start.sh --status          # サーバー状況確認"
    echo "  ./start.sh --port 3001       # 指定ポートで起動"
    echo "  ./start.sh --help            # このヘルプを表示"
    echo ""
    echo -e "${YELLOW}オプション:${NC}"
    echo "  --dev       : 開発モード（nodemon使用、ホットリロード）"
    echo "  --build     : 起動前にビルドを実行"
    echo "  --stop      : 実行中のNode.jsプロセスを停止"
    echo "  --status    : サーバーの実行状況を確認"
    echo "  --port      : 起動ポートを指定（デフォルト: 3000）"
    echo "  --host      : バインドホストを指定（デフォルト: 127.0.0.1）"
    echo ""
    echo -e "${GREEN}前提条件:${NC}"
    echo "  - .envファイルにITAD_API_KEYが設定されていること"
    echo "  - データベースが初期化されていること（npm run db:init）"
}

test_prerequisites() {
    echo -e "${YELLOW}前提条件をチェック中...${NC}"
    
    # .envファイルの存在確認
    if [ ! -f ".env" ]; then
        echo -e "${RED}❌ .envファイルが見つかりません${NC}"
        echo -e "${YELLOW}   ./setup.sh を実行するか、.env.exampleから.envを作成してください${NC}"
        exit 1
    fi
    
    # package.jsonの存在確認
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.jsonが見つかりません${NC}"
        exit 1
    fi
    
    # node_modulesの存在確認
    if [ ! -d "node_modules" ]; then
        echo -e "${RED}❌ node_modulesが見つかりません${NC}"
        echo -e "${YELLOW}   npm install を実行してください${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 前提条件チェック完了${NC}"
}

set_environment() {
    # ポート設定
    if [ -n "$PORT" ]; then
        export WEB_PORT="$PORT"
        echo -e "${CYAN}📡 ポートを $PORT に設定しました${NC}"
    fi
    
    # ホスト設定
    if [ -n "$HOST" ]; then
        export WEB_HOST="$HOST"
        echo -e "${CYAN}🌐 ホストを $HOST に設定しました${NC}"
    fi
    
    # 環境変数の表示
    CURRENT_PORT=${WEB_PORT:-3000}
    CURRENT_HOST=${WEB_HOST:-127.0.0.1}
    echo -e "${GREEN}🔗 サーバー: http://${CURRENT_HOST}:${CURRENT_PORT}${NC}"
}

build_application() {
    if [ "$BUILD" = true ]; then
        echo -e "${CYAN}🏗️  アプリケーションをビルド中...${NC}"
        ./build.sh
    fi
}

stop_server() {
    echo -e "${YELLOW}🛑 SteamSentinelプロセスを停止中...${NC}"
    
    # Node.jsプロセスを検索して停止
    PIDS=$(pgrep -f "node.*SteamSentinel\|node.*steam-sentinel" 2>/dev/null || true)
    
    if [ -z "$PIDS" ]; then
        # ポート3000を使用しているプロセスを検索
        PORT_PID=$(lsof -t -i:3000 2>/dev/null || true)
        if [ -n "$PORT_PID" ]; then
            echo -e "${YELLOW}🛑 ポート3000を使用中のプロセス PID:$PORT_PID を停止します${NC}"
            kill -TERM "$PORT_PID" 2>/dev/null || kill -KILL "$PORT_PID" 2>/dev/null
            echo -e "${GREEN}✅ プロセス PID:$PORT_PID を停止しました${NC}"
        else
            echo -e "${CYAN}ℹ️  実行中のSteamSentinelプロセスが見つかりません${NC}"
        fi
    else
        for PID in $PIDS; do
            echo -e "${YELLOW}🛑 SteamSentinelプロセス PID:$PID を停止します${NC}"
            kill -TERM "$PID" 2>/dev/null || kill -KILL "$PID" 2>/dev/null
            echo -e "${GREEN}✅ プロセス PID:$PID を停止しました${NC}"
        done
    fi
}

get_server_status() {
    echo -e "${CYAN}📊 SteamSentinel サーバー状況${NC}"
    echo -e "${CYAN}=============================${NC}"
    
    # ポート3000の使用状況確認
    if command -v lsof >/dev/null 2>&1; then
        PORT_INFO=$(lsof -i:3000 2>/dev/null || true)
        if [ -n "$PORT_INFO" ]; then
            echo -e "${GREEN}✅ ポート3000が使用中です${NC}"
            echo "$PORT_INFO"
        else
            echo -e "${RED}❌ ポート3000は使用されていません${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  lsofコマンドが見つかりません${NC}"
    fi
    
    # プロセス確認
    NODE_PROCESSES=$(pgrep -f "node" 2>/dev/null || true)
    if [ -n "$NODE_PROCESSES" ]; then
        echo -e "${CYAN}🔍 実行中のNode.jsプロセス:${NC}"
        for PID in $NODE_PROCESSES; do
            PROCESS_INFO=$(ps -p "$PID" -o pid,comm 2>/dev/null || true)
            if [ -n "$PROCESS_INFO" ]; then
                echo "  $PROCESS_INFO"
            fi
        done
    else
        echo -e "${RED}❌ Node.jsプロセスが見つかりません${NC}"
    fi
    
    # サーバーテスト
    CURRENT_PORT=${WEB_PORT:-3000}
    CURRENT_HOST=${WEB_HOST:-127.0.0.1}
    
    if command -v curl >/dev/null 2>&1; then
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${CURRENT_HOST}:${CURRENT_PORT}" 2>/dev/null || echo "000")
        if [ "$HTTP_STATUS" = "200" ]; then
            echo -e "${GREEN}✅ サーバーが応答しています (Status: $HTTP_STATUS)${NC}"
        else
            echo -e "${RED}❌ サーバーが応答していません${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  curlコマンドが見つかりません${NC}"
    fi
}

start_dev_server() {
    echo -e "${CYAN}🚀 開発サーバーを起動中...${NC}"
    echo -e "${YELLOW}Ctrl+C で停止できます${NC}"
    
    npm run dev
}

start_production_server() {
    # ビルドファイルの確認
    if [ ! -f "dist/index.js" ]; then
        echo -e "${RED}❌ ビルドファイルが見つかりません${NC}"
        echo -e "${YELLOW}   ./build.sh または ./start.sh --build を実行してください${NC}"
        exit 1
    fi
    
    echo -e "${CYAN}🚀 本番サーバーを起動中...${NC}"
    echo -e "${YELLOW}Ctrl+C で停止できます${NC}"
    
    npm start
}

# メイン実行
if [ "$SHOW_HELP" = true ]; then
    show_help
    exit 0
fi

if [ "$STOP" = true ]; then
    stop_server
    exit 0
fi

if [ "$STATUS" = true ]; then
    get_server_status
    exit 0
fi

echo -e "${CYAN}🎮 SteamSentinel 起動準備${NC}"
echo -e "${CYAN}=========================${NC}"

test_prerequisites
set_environment
build_application

if [ "$DEV" = true ]; then
    start_dev_server
else
    start_production_server
fi