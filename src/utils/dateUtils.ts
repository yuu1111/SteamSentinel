/**
 * Backend date utilities for consistent UTC handling
 * データベースとの一貫したUTC日時処理のためのユーティリティ
 */

/**
 * 現在のUTC日時をISO文字列で取得
 * @returns UTC日時のISO文字列
 */
export const getCurrentUTCString = (): string => {
  return new Date().toISOString();
};

/**
 * DateオブジェクトをUTC ISO文字列に変換
 * @param date Dateオブジェクト
 * @returns UTC日時のISO文字列
 */
export const toUTCString = (date: Date): string => {
  return date.toISOString();
};

/**
 * ISO文字列をDateオブジェクトに変換
 * @param dateString ISO日時文字列
 * @returns Dateオブジェクト
 */
export const parseUTCDate = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * 日付文字列の妥当性を検証
 * @param dateString 検証する日付文字列
 * @returns 有効な日付かどうか
 */
export const isValidDate = (dateString: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * YYYY-MM-DD形式の日付文字列をUTC 00:00:00のDateオブジェクトに変換
 * @param dateString YYYY-MM-DD形式の日付文字列
 * @returns UTC 00:00:00のDateオブジェクト
 */
export const parseUTCDateOnly = (dateString: string): Date => {
  return new Date(`${dateString}T00:00:00.000Z`);
};

/**
 * 日付範囲の開始日（UTC 00:00:00）を取得
 * @param dateString YYYY-MM-DD形式の日付文字列
 * @returns UTC開始日のISO文字列
 */
export const getUTCStartOfDay = (dateString: string): string => {
  return `${dateString}T00:00:00.000Z`;
};

/**
 * 日付範囲の終了日（UTC 23:59:59.999）を取得
 * @param dateString YYYY-MM-DD形式の日付文字列
 * @returns UTC終了日のISO文字列
 */
export const getUTCEndOfDay = (dateString: string): string => {
  return `${dateString}T23:59:59.999Z`;
};

/**
 * 現在のUTC日付をYYYY-MM-DD形式で取得
 * @returns YYYY-MM-DD形式のUTC日付文字列
 */
export const getCurrentUTCDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * 指定した日数前のUTC日時を取得
 * @param days 日数
 * @returns 指定日数前のUTC日時のISO文字列
 */
export const getUTCDateDaysAgo = (days: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
};

/**
 * 月の開始日と終了日をUTCで取得
 * @param year 年
 * @param month 月（1-12）
 * @returns 月の開始日と終了日のUTC ISO文字列
 */
export const getUTCMonthRange = (year: number, month: number): { start: string; end: string } => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
};

/**
 * 年の開始日と終了日をUTCで取得
 * @param year 年
 * @returns 年の開始日と終了日のUTC ISO文字列
 */
export const getUTCYearRange = (year: number): { start: string; end: string } => {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
};