/**
 * JSON データの検証とサニタイゼーション用ユーティリティ
 */

export interface JsonValidationResult {
  isValid: boolean;
  sanitized?: any;
  error?: string;
}

export class JsonValidator {
  /**
   * JSON文字列の検証とパース
   */
  static validateAndParse(jsonString: string | null): JsonValidationResult {
    if (!jsonString) {
      return { isValid: true, sanitized: null };
    }

    try {
      const parsed = JSON.parse(jsonString);
      const sanitized = this.sanitizeJson(parsed);
      return { isValid: true, sanitized };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * JSONオブジェクトのサニタイゼーション
   */
  static sanitizeJson(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (typeof obj === 'string') {
      // XSS対策: HTMLタグと危険な文字をエスケープ
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeJson(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // キー名のサニタイズ
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        sanitized[sanitizedKey] = this.sanitizeJson(value);
      }
      return sanitized;
    }

    return String(obj);
  }

  /**
   * アラートメタデータの検証
   */
  static validateAlertMetadata(metadata: any): JsonValidationResult {
    if (!metadata) {
      return { isValid: true, sanitized: null };
    }

    const allowedKeys = [
      'legacy_message',
      'legacy_price_data', 
      'legacy_game_name',
      'legacy_previous_low',
      'legacy_release_date',
      'custom_note',
      'trigger_reason',
      'external_id'
    ];

    try {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(metadata)) {
        if (allowedKeys.includes(key)) {
          sanitized[key] = this.sanitizeJson(value);
        }
      }

      return { isValid: true, sanitized };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Invalid alert metadata: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * 統計データJSONの検証
   */
  static validateStatisticsJson(statistics: any): JsonValidationResult {
    if (!statistics) {
      return { isValid: true, sanitized: null };
    }

    const requiredStructure = {
      calculation_method: 'string',
      data_points: 'number',
      last_price_update: 'string',
      discount_ranges: 'object'
    };

    try {
      const sanitized: any = {};

      // 必須フィールドの検証
      for (const [field, expectedType] of Object.entries(requiredStructure)) {
        if (statistics[field] !== undefined) {
          if (field === 'discount_ranges') {
            // discount_ranges の特別な検証
            sanitized[field] = this.validateDiscountRanges(statistics[field]);
          } else if (typeof statistics[field] === expectedType) {
            sanitized[field] = this.sanitizeJson(statistics[field]);
          }
        }
      }

      return { isValid: true, sanitized };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Invalid statistics JSON: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * 割引範囲データの検証
   */
  private static validateDiscountRanges(ranges: any): any {
    const validRanges = ['0-25', '26-50', '51-75', '76-100'];
    const sanitized: any = {};

    if (typeof ranges === 'object' && ranges !== null) {
      for (const [range, count] of Object.entries(ranges)) {
        if (validRanges.includes(range) && typeof count === 'number' && count >= 0) {
          sanitized[range] = Math.floor(count);
        }
      }
    }

    return sanitized;
  }

  /**
   * JSONサイズ制限チェック
   */
  static checkSizeLimit(jsonString: string, maxSizeKB: number = 64): boolean {
    const sizeKB = Buffer.byteLength(jsonString, 'utf8') / 1024;
    return sizeKB <= maxSizeKB;
  }

  /**
   * JSON圧縮（不要なスペースの除去）
   */
  static compress(obj: any): string {
    return JSON.stringify(obj);
  }

  /**
   * JSON整形（デバッグ用）
   */
  static prettify(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
}