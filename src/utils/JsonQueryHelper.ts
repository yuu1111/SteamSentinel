/**
 * SQLite JSON クエリヘルパー
 * JSONフィールドの効率的な検索・操作を支援
 */

export class JsonQueryHelper {
  /**
   * アラートメタデータからレガシーメッセージを抽出
   */
  static extractLegacyMessage(metadata: string | null): string | null {
    if (!metadata) return null;
    
    try {
      const parsed = JSON.parse(metadata);
      return parsed.legacy_message || null;
    } catch {
      return null;
    }
  }

  /**
   * JSONパスによる値の抽出
   */
  static extractJsonPath(jsonString: string | null, path: string): any {
    if (!jsonString) return null;
    
    try {
      const parsed = JSON.parse(jsonString);
      return this.getNestedValue(parsed, path);
    } catch {
      return null;
    }
  }

  /**
   * ネストされたオブジェクトから値を取得
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * アラートメタデータの検索用SQLクエリ生成
   */
  static buildAlertMetadataQuery(filters: {
    legacyMessage?: string;
    legacyGameName?: string;
    customNote?: string;
  }): { sql: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.legacyMessage) {
      conditions.push(`json_extract(metadata, '$.legacy_message') LIKE ?`);
      params.push(`%${filters.legacyMessage}%`);
    }

    if (filters.legacyGameName) {
      conditions.push(`json_extract(metadata, '$.legacy_game_name') LIKE ?`);
      params.push(`%${filters.legacyGameName}%`);
    }

    if (filters.customNote) {
      conditions.push(`json_extract(metadata, '$.custom_note') LIKE ?`);
      params.push(`%${filters.customNote}%`);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    const sql = `
      SELECT * FROM alerts 
      ${whereClause}
      ORDER BY created_at DESC
    `;

    return { sql, params };
  }

  /**
   * 統計データの検索用SQLクエリ生成
   */
  static buildStatisticsQuery(filters: {
    calculationMethod?: string;
    minDataPoints?: number;
    dateRange?: { start: Date; end: Date };
  }): { sql: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.calculationMethod) {
      conditions.push(`json_extract(statistics_json, '$.calculation_method') = ?`);
      params.push(filters.calculationMethod);
    }

    if (filters.minDataPoints) {
      conditions.push(`json_extract(statistics_json, '$.data_points') >= ?`);
      params.push(filters.minDataPoints);
    }

    if (filters.dateRange) {
      conditions.push(`calculated_at BETWEEN ? AND ?`);
      params.push(filters.dateRange.start.toISOString(), filters.dateRange.end.toISOString());
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    const sql = `
      SELECT 
        *,
        json_extract(statistics_json, '$.calculation_method') as calculation_method,
        json_extract(statistics_json, '$.data_points') as data_points,
        json_extract(statistics_json, '$.discount_ranges') as discount_ranges
      FROM price_statistics 
      ${whereClause}
      ORDER BY calculated_at DESC
    `;

    return { sql, params };
  }

  /**
   * 割引範囲別の統計集計クエリ
   */
  static buildDiscountRangeAnalysisQuery(): string {
    return `
      SELECT 
        json_extract(statistics_json, '$.discount_ranges."0-25"') as range_0_25,
        json_extract(statistics_json, '$.discount_ranges."26-50"') as range_26_50,
        json_extract(statistics_json, '$.discount_ranges."51-75"') as range_51_75,
        json_extract(statistics_json, '$.discount_ranges."76-100"') as range_76_100,
        calculated_at,
        total_games,
        games_on_sale
      FROM price_statistics 
      WHERE statistics_json IS NOT NULL 
        AND json_valid(statistics_json)
        AND json_extract(statistics_json, '$.discount_ranges') IS NOT NULL
      ORDER BY calculated_at DESC
      LIMIT 30
    `;
  }

  /**
   * JSONフィールドの更新用SQLクエリ生成
   */
  static buildJsonUpdateQuery(
    table: 'alerts' | 'price_statistics',
    field: 'metadata' | 'statistics_json',
    updates: Record<string, any>,
    whereCondition: string
  ): { sql: string; params: any[] } {
    const setClause = Object.keys(updates).map(key => 
      `json_set(COALESCE(${field}, '{}'), '$.${key}', ?)`
    ).join(', ');

    const sql = `
      UPDATE ${table} 
      SET ${field} = json_set(COALESCE(${field}, '{}'), ${Object.keys(updates).map(key => `'$.${key}', ?`).join(', ')})
      WHERE ${whereCondition}
    `;

    const params = Object.values(updates);

    return { sql, params };
  }

  /**
   * JSON配列操作ヘルパー
   */
  static buildJsonArrayQuery(
    operation: 'append' | 'remove' | 'contains',
    table: string,
    field: string,
    arrayPath: string,
    value: any
  ): string {
    switch (operation) {
      case 'append':
        return `
          UPDATE ${table} 
          SET ${field} = json_set(
            COALESCE(${field}, '{}'), 
            '$.${arrayPath}', 
            json_array_append(
              COALESCE(json_extract(${field}, '$.${arrayPath}'), '[]'), 
              '$', 
              ?
            )
          )
        `;
      
      case 'contains':
        return `
          SELECT * FROM ${table} 
          WHERE json_extract(${field}, '$.${arrayPath}') LIKE '%' || ? || '%'
        `;
      
      default:
        throw new Error(`Unsupported JSON array operation: ${operation}`);
    }
  }

  /**
   * JSON データのサイズ分析
   */
  static buildJsonSizeAnalysisQuery(table: string, field: string): string {
    return `
      SELECT 
        COUNT(*) as total_records,
        COUNT(${field}) as records_with_json,
        AVG(LENGTH(${field})) as avg_json_size_bytes,
        MAX(LENGTH(${field})) as max_json_size_bytes,
        MIN(LENGTH(${field})) as min_json_size_bytes,
        SUM(LENGTH(${field})) as total_json_size_bytes
      FROM ${table}
      WHERE ${field} IS NOT NULL
    `;
  }

  /**
   * 無効なJSONの検出クエリ
   */
  static buildInvalidJsonDetectionQuery(table: string, field: string): string {
    return `
      SELECT id, ${field}
      FROM ${table} 
      WHERE ${field} IS NOT NULL 
        AND NOT json_valid(${field})
      LIMIT 100
    `;
  }

  /**
   * JSON フィールドのクリーンアップクエリ
   */
  static buildJsonCleanupQuery(table: string, field: string): string {
    return `
      UPDATE ${table} 
      SET ${field} = NULL 
      WHERE ${field} IS NOT NULL 
        AND (
          ${field} = '' 
          OR ${field} = '{}' 
          OR ${field} = '[]'
          OR NOT json_valid(${field})
        )
    `;
  }
}