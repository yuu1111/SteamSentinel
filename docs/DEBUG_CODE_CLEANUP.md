# デバッグコード削除リスト

本番環境リリース前に削除が必要なデバッグコードの一覧

## 🔍 検索用キーワード
```bash
# 全てのデバッグコードを検索
grep -r "TODO: REMOVE BEFORE PRODUCTION" src/

# または
grep -r "デバッグ用" src/
```

## 📂 削除対象ファイル・機能

### APIエンドポイント（src/routes/api.ts）
- `DELETE /api/games/:appId/reviews` - レビューキャッシュクリア
- `POST /api/games/:appId/reviews/refresh` - レビュー強制更新

### コントローラーメソッド（src/controllers/GameController.ts）
- `clearGameReviews()` - レビューキャッシュクリアメソッド
- `refreshGameReviews()` - レビュー強制更新メソッド

### デバッグツール
- `src/debug/review-test.ts` - レビューシステム診断ツール（ファイル全体）

### ログレベル（.env）
```env
# 本番環境では INFO レベルに変更
LOG_LEVEL=INFO  # 現在: DEBUG
```

## 🚀 クリーンアップ手順

1. **デバッグコード検索**
   ```bash
   grep -rn "TODO: REMOVE BEFORE PRODUCTION" src/
   ```

2. **該当箇所削除**
   - APIルート削除
   - コントローラーメソッド削除
   - debug/ フォルダ削除

3. **ログレベル調整**
   ```env
   LOG_LEVEL=INFO
   ```

4. **動作確認**
   - 本番機能が正常動作することを確認
   - デバッグエンドポイントが404になることを確認

## 📝 注意事項

- レビュー機能の基本動作（GET /api/games/:appId/reviews）は削除しない
- 本番環境でのデバッグが必要な場合は、ログレベルを一時的にDEBUGに変更して対応
- キャッシュクリア機能が必要な場合は、管理画面等の適切な場所に移動を検討