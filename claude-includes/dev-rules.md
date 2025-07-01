# 開発指示

## コーディング原則
- **TypeScript strict**: 型安全性100%維持
- **Ant Design統一**: Bootstrap使用禁止
- **既存パターン**: ファイル構造・命名規則踏襲
- **セキュリティ**: APIキー・秘密情報の露出禁止

## 開発フロー
1. **実装**: 既存アーキテクチャに従う
2. **テスト**: `npm run build` でエラー0確認
3. **lint**: 自動修正実行 (`npm run lint:fix`)
4. **コミット**: conventional commits形式

## 技術制約
- **データベース**: better-sqlite3, v1 schema維持
- **API**: Express.js, 既存エンドポイント拡張
- **Frontend**: React 19.1.0, Vite 7.0.0
- **UI**: Ant Design 5.26.2のみ使用

## 禁止事項
- Bootstrap CSS追加
- epic-free-games依存関係復活
- データベーススキーマ破壊的変更
- 未承認の新依存関係追加