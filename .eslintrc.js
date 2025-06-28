module.exports = {
  env: {
    node: true,
    es6: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // 未使用変数の警告を無効化（開発中のため）
    //'no-unused-vars': 'off',
    // console.logの使用を許可（ログ出力のため）
    //'no-console': 'off',
    // 空のブロックを許可
    //'no-empty': 'off',
    // 到達不可能なコードを許可（開発中のため）
    //'no-unreachable': 'off',
  },
};