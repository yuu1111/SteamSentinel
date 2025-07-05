# React Router ナビゲーションガイド

## 概要

SteamSentinelは、React Router v7を使用したURLベースのナビゲーションシステムを実装しています。これにより、より直感的で使いやすいWebアプリケーション体験を提供します。

## 主な利点

### 1. 直接アクセス可能なURL
各ページに固有のURLが割り当てられているため、ブックマークや共有が可能です。

```
http://localhost:5173/              # ダッシュボード
http://localhost:5173/games         # ゲーム一覧
http://localhost:5173/games/240     # Half-Life 2の詳細ページ
http://localhost:5173/free-games    # 無料ゲーム一覧
```

### 2. ブラウザの戻る/進むボタン対応
標準的なブラウザナビゲーションが使用でき、期待通りの動作をします。

### 3. ページリロード対応
ページをリロードしても、現在のページが保持されます。

## ルート構造

```typescript
const routes = [
  { path: "/", element: <Dashboard /> },                    // ダッシュボード
  { path: "/games", element: <Games /> },                   // ゲーム一覧
  { path: "/games/:appId", element: <GameDetail /> },       // ゲーム詳細
  { path: "/free-games", element: <FreeGames /> },          // 無料ゲーム
  { path: "/budgets", element: <BudgetAnalytics /> },       // 予算管理
  { path: "/settings", element: <Settings /> },             // 設定
  { path: "/limitations", element: <Limitations /> },       // 制限事項
  { path: "/licenses", element: <Licenses /> },             // ライセンス
  { path: "/test", element: <Test /> },                     // テスト
  { path: "*", element: <Navigate to="/" replace /> },      // 404→ホーム
];
```

## プログラマティックナビゲーション

### useNavigate フックの使用

```typescript
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  const handleGameClick = (steamAppId: number) => {
    navigate(`/games/${steamAppId}`);
  };
  
  // 戻る
  const goBack = () => {
    navigate(-1);
  };
  
  // ホームへ
  const goHome = () => {
    navigate('/');
  };
}
```

### Link コンポーネントの使用

```typescript
import { Link } from 'react-router-dom';

<Link to="/games">ゲーム一覧を見る</Link>
<Link to={`/games/${game.steam_app_id}`}>{game.name}</Link>
```

## パラメータの取得

### URLパラメータ

```typescript
import { useParams } from 'react-router-dom';

function GameDetail() {
  const { appId } = useParams<{ appId: string }>();
  const steamAppId = parseInt(appId || '0', 10);
  
  // steamAppIdを使用してゲーム情報を取得
}
```

### クエリパラメータ

```typescript
import { useSearchParams } from 'react-router-dom';

function GameList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const platform = searchParams.get('platform') || 'all';
  const sort = searchParams.get('sort') || 'name';
  
  // フィルタリング
  const setPlatformFilter = (platform: string) => {
    setSearchParams({ platform, sort });
  };
}
```

## ナビゲーションガード

### 確認ダイアログ付きナビゲーション

```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

const handleNavigation = () => {
  if (hasUnsavedChanges) {
    if (window.confirm('保存されていない変更があります。移動しますか？')) {
      navigate('/dashboard');
    }
  } else {
    navigate('/dashboard');
  }
};
```

## ベストプラクティス

### 1. 相対パスの回避
```typescript
// ❌ 避けるべき
navigate('../games');

// ✅ 推奨
navigate('/games');
```

### 2. 型安全なルート定義
```typescript
const ROUTES = {
  HOME: '/',
  GAMES: '/games',
  GAME_DETAIL: (appId: number) => `/games/${appId}`,
  FREE_GAMES: '/free-games',
} as const;

// 使用例
navigate(ROUTES.GAME_DETAIL(240));
```

### 3. エラーハンドリング
```typescript
const handleGameClick = async (appId: number) => {
  try {
    // ゲームが存在するか確認
    const response = await api.get(`/games/by-steam-id/${appId}`);
    if (response.success) {
      navigate(`/games/${appId}`);
    } else {
      showError('ゲームが見つかりません');
    }
  } catch {
    showError('エラーが発生しました');
  }
};
```

## トラブルシューティング

### ページが見つからない場合
- URLが正しいか確認してください
- 開発サーバーが起動しているか確認してください
- ブラウザのキャッシュをクリアしてみてください

### ナビゲーションが動作しない場合
- `BrowserRouter`でアプリケーションがラップされているか確認
- `useNavigate`フックがReactコンポーネント内で使用されているか確認
- コンソールエラーがないか確認

### パフォーマンスの問題
- 不要なリレンダリングを避けるため、`useMemo`や`useCallback`を活用
- 大きなコンポーネントは遅延読み込み（lazy loading）を検討

## 関連ドキュメント

- [React Router 公式ドキュメント](https://reactrouter.com/)
- [API リファレンス](./api-reference.md)
- [レビューシステム](./review-system.md)