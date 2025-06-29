// 日時関連のユーティリティ関数

/**
 * UTC日時をJST日時文字列に変換
 * @param utcDate UTC日時（ISO文字列またはDateオブジェクト）
 * @param includeTime 時刻も含めるか（デフォルト: false）
 * @returns JST日時文字列
 */
export const utcToJst = (utcDate: string | Date, includeTime: boolean = false): string => {
  if (!utcDate) return '';
  
  const date = new Date(utcDate);
  if (isNaN(date.getTime())) return '';
  
  // JSTは UTC+9
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  
  if (includeTime) {
    return jstDate.toISOString().replace('T', ' ').substring(0, 19) + ' JST';
  } else {
    return jstDate.toISOString().split('T')[0];
  }
};

/**
 * JST日時をUTC日時に変換
 * @param jstDate JST日時文字列
 * @returns UTCのDateオブジェクト
 */
export const jstToUtc = (jstDate: string): Date => {
  if (!jstDate) return new Date();
  
  const date = new Date(jstDate);
  if (isNaN(date.getTime())) return new Date();
  
  // JSTからUTCに変換（-9時間）
  return new Date(date.getTime() - (9 * 60 * 60 * 1000));
};

/**
 * 日時を日本語形式で表示
 * @param utcDate UTC日時
 * @param format 表示形式 ('date' | 'datetime' | 'time')
 * @returns 日本語形式の日時文字列
 */
export const formatDateJP = (utcDate: string | Date, format: 'date' | 'datetime' | 'time' = 'datetime'): string => {
  if (!utcDate) return '';
  
  const date = new Date(utcDate);
  if (isNaN(date.getTime())) return '';
  
  // JSTに変換
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  
  const year = jstDate.getFullYear();
  const month = String(jstDate.getMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getDate()).padStart(2, '0');
  const hours = String(jstDate.getHours()).padStart(2, '0');
  const minutes = String(jstDate.getMinutes()).padStart(2, '0');
  const seconds = String(jstDate.getSeconds()).padStart(2, '0');
  
  switch (format) {
    case 'date':
      return `${year}/${month}/${day}`;
    case 'time':
      return `${hours}:${minutes}:${seconds}`;
    case 'datetime':
    default:
      return `${year}/${month}/${day} ${hours}:${minutes}`;
  }
};

/**
 * 相対時間を表示（○時間前、○日前など）
 * @param utcDate UTC日時
 * @returns 相対時間文字列
 */
export const formatRelativeTime = (utcDate: string | Date): string => {
  if (!utcDate) return '';
  
  const date = new Date(utcDate);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return '1分前';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  } else if (diffHours < 24) {
    return `${diffHours}時間前`;
  } else if (diffDays < 30) {
    return `${diffDays}日前`;
  } else {
    return formatDateJP(utcDate, 'date');
  }
};

/**
 * 現在のJST日付を取得
 * @returns YYYY-MM-DD形式のJST日付文字列
 */
export const getCurrentJstDate = (): string => {
  const now = new Date();
  const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return jstNow.toISOString().split('T')[0];
};

/**
 * 現在のJST日時を取得
 * @returns YYYY-MM-DD HH:mm:ss形式のJST日時文字列
 */
export const getCurrentJstDateTime = (): string => {
  const now = new Date();
  const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return jstNow.toISOString().replace('T', ' ').substring(0, 19);
};