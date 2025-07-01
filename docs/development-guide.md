# 開発ガイド

## 開発環境セットアップ

### 前提条件
- Node.js 18以上
- Git
- テキストエディタ (VS Code推奨)

### 初回セットアップ
```bash
git clone <repository-url>
cd SteamSentinel
npm install
cp config.example.json config.json  # 必要に応じて編集
```

### 環境変数設定
`.env`ファイルを作成:
```bash
ITAD_API_KEY=your_api_key_here
DISCORD_WEBHOOK_URL=your_discord_webhook_url
```

## 開発ワークフロー

### 開発サーバー起動
```bash
# 開発モード (ホットリロード)
npm run dev

# 本番ビルド
npm run build
npm start
```

### コード品質チェック
```bash
# TypeScript型チェック
npm run typecheck

# ESLint
npm run lint
npm run lint:fix

# 全体テスト
npm test
```

## プロジェクト構造

```
src/
├── api/                 # 外部APIクライアント
├── controllers/         # リクエストハンドラー
├── models/             # データモデル
├── routes/             # APIルート定義
├── services/           # ビジネスロジック
├── web/               # フロントエンド
│   ├── src/components/  # Reactコンポーネント
│   ├── src/pages/      # ページコンポーネント
│   └── src/styles/     # CSS
└── utils/              # ユーティリティ
```

## コーディング規約

### TypeScript
- strict モード必須
- 型定義は `src/types/index.ts` に集約
- `any` 型の使用禁止

### React
- 関数コンポーネント使用
- Ant Design UI ライブラリ統一
- CSS-in-JS は避け、外部CSS使用

### API
- RESTful設計
- レスポンス形式統一:
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

### データベース
- SQLite + better-sqlite3
- 外部キー制約有効
- マイグレーションは `src/db/database.ts` で管理

## 機能開発ガイドライン

### 新機能追加
1. 要件定義・設計
2. TypeScript型定義追加
3. バックエンドAPI実装
4. フロントエンドUI実装
5. テスト・動作確認

### データベース変更
1. `src/db/database.ts` でスキーマ更新
2. 既存データとの互換性確認
3. 必要に応じてマイグレーション実装

### UI開発
- Ant Design コンポーネント優先使用
- レスポンシブ対応必須
- アクセシビリティ考慮

## デバッグ・ログ

### ログレベル
```bash
LOG_LEVEL=DEBUG npm start  # 詳細ログ
LOG_LEVEL=INFO npm start   # 標準ログ
LOG_LEVEL=ERROR npm start  # エラーのみ
```

### ログ確認
```bash
# リアルタイムログ
tail -f logs/steam-sentinel-$(date +%Y-%m-%d).log

# エラーログ
tail -f logs/error-$(date +%Y-%m-%d).log
```

## テスト

### 手動テスト
1. 基本機能動作確認
2. API レスポンス確認
3. UI 操作テスト

### 自動テスト (推奨追加項目)
- Jest + Supertest でAPI テスト
- React Testing Library でUI テスト

## デプロイ

### 本番ビルド
```bash
npm run build
```

### 本番環境変数
```bash
NODE_ENV=production
LOG_LEVEL=INFO
WEB_PORT=3000
```

### パフォーマンス最適化
- バンドルサイズ監視
- API レスポンス時間測定
- データベースクエリ最適化

## トラブルシューティング

### よくある問題
- **ポート競合**: `WEB_PORT` 環境変数で変更
- **API制限**: ITAD API キー確認
- **WSL環境**: データベースパス調整

### デバッグツール
- ブラウザ開発者ツール
- Node.js inspect mode
- SQLite Browser

## 貢献ガイドライン

### Pull Request
1. feature ブランチ作成
2. 変更実装・テスト
3. PR 作成・レビュー依頼

### コミットメッセージ
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
```

## パフォーマンス指標

### 目標値
- 初期ロード: <3秒
- API レスポンス: <500ms
- バンドルサイズ: <2MB
- メモリ使用量: <500MB

詳細な技術仕様は開発者向け仕様書 (`claude-includes/`) を参照してください。