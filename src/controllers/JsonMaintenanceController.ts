import { Request, Response } from 'express';
import { ApiResponseHelper, BaseController } from '../utils/apiResponse';
import DatabaseManager from '../db/database';
import { JsonValidator } from '../utils/JsonValidator';

/**
 * JSON データのメンテナンス・診断用コントローラー
 */
export class JsonMaintenanceController extends BaseController {
  private databaseManager: typeof DatabaseManager;

  constructor() {
    super();
    this.databaseManager = DatabaseManager;
  }

  /**
   * JSON フィールドの分析
   * GET /api/v1/maintenance/json/analyze
   */
  analyzeJsonFields = async (req: Request, res: Response): Promise<void> => {
    try {
      const analysis = this.databaseManager.analyzeJsonFields();
      
      const summary = {
        alerts: {
          total_records: analysis.alerts_metadata.total_records,
          records_with_metadata: analysis.alerts_metadata.records_with_metadata,
          metadata_usage_percent: analysis.alerts_metadata.total_records > 0 
            ? (analysis.alerts_metadata.records_with_metadata / analysis.alerts_metadata.total_records * 100).toFixed(2)
            : 0,
          avg_size_bytes: Math.round(analysis.alerts_metadata.avg_metadata_size || 0),
          max_size_bytes: analysis.alerts_metadata.max_metadata_size || 0,
          total_size_kb: Math.round((analysis.alerts_metadata.total_metadata_size || 0) / 1024)
        },
        statistics: {
          total_records: analysis.price_statistics_json.total_records,
          records_with_json: analysis.price_statistics_json.records_with_json,
          json_usage_percent: analysis.price_statistics_json.total_records > 0
            ? (analysis.price_statistics_json.records_with_json / analysis.price_statistics_json.total_records * 100).toFixed(2)
            : 0,
          avg_size_bytes: Math.round(analysis.price_statistics_json.avg_json_size || 0),
          max_size_bytes: analysis.price_statistics_json.max_json_size || 0,
          total_size_kb: Math.round((analysis.price_statistics_json.total_json_size || 0) / 1024)
        },
        issues: {
          invalid_records_count: analysis.invalid_records.length,
          invalid_records: analysis.invalid_records
        }
      };

      ApiResponseHelper.success(res, summary, 'JSON fields analysis completed');
    } catch (error) {
      ApiResponseHelper.error(res, 'Failed to analyze JSON fields', 500);
    }
  };

  /**
   * 無効なJSONデータのクリーンアップ
   * POST /api/v1/maintenance/json/cleanup
   */
  cleanupInvalidJson = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = this.databaseManager.cleanupInvalidJsonData();
      
      const summary = {
        cleaned_alerts: result.cleaned_alerts,
        cleaned_statistics: result.cleaned_statistics,
        total_cleaned: result.cleaned_alerts + result.cleaned_statistics
      };

      ApiResponseHelper.success(res, summary, 'Invalid JSON data cleanup completed');
    } catch (error) {
      ApiResponseHelper.error(res, 'Failed to cleanup invalid JSON data', 500);
    }
  };

  /**
   * JSONデータの検証
   * POST /api/v1/maintenance/json/validate
   */
  validateJsonData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, data } = req.body;

      let validationResult;
      
      switch (type) {
        case 'alert_metadata':
          validationResult = JsonValidator.validateAlertMetadata(data);
          break;
        case 'statistics_json':
          validationResult = JsonValidator.validateStatisticsJson(data);
          break;
        default:
          validationResult = JsonValidator.validateAndParse(JSON.stringify(data));
      }

      ApiResponseHelper.success(res, {
        is_valid: validationResult.isValid,
        sanitized_data: validationResult.sanitized,
        error: validationResult.error
      }, 'JSON validation completed');
    } catch (error) {
      ApiResponseHelper.error(res, 'Failed to validate JSON data', 500);
    }
  };

  /**
   * JSONフィールドのサイズ制限チェック
   * POST /api/v1/maintenance/json/size-check
   */
  checkJsonSize = async (req: Request, res: Response): Promise<void> => {
    try {
      const { data, max_size_kb = 64 } = req.body;
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
      
      const isWithinLimit = JsonValidator.checkSizeLimit(jsonString, max_size_kb);
      const currentSizeKB = Buffer.byteLength(jsonString, 'utf8') / 1024;

      ApiResponseHelper.success(res, {
        current_size_kb: Math.round(currentSizeKB * 100) / 100,
        max_size_kb,
        within_limit: isWithinLimit,
        compressed_size_kb: Math.round(Buffer.byteLength(JsonValidator.compress(data), 'utf8') / 1024 * 100) / 100
      }, 'JSON size check completed');
    } catch (error) {
      ApiResponseHelper.error(res, 'Failed to check JSON size', 500);
    }
  };

  /**
   * JSONデータの最適化（圧縮）
   * POST /api/v1/maintenance/json/optimize
   */
  optimizeJsonData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { data } = req.body;
      
      const originalSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
      const validationResult = JsonValidator.validateAndParse(JSON.stringify(data));
      
      if (!validationResult.isValid) {
        ApiResponseHelper.error(res, validationResult.error || 'Invalid JSON data', 400);
        return;
      }

      const optimizedData = validationResult.sanitized;
      const compressedJson = JsonValidator.compress(optimizedData);
      const optimizedSize = Buffer.byteLength(compressedJson, 'utf8');
      
      const savings = originalSize - optimizedSize;
      const savingsPercent = originalSize > 0 ? (savings / originalSize * 100).toFixed(2) : 0;

      ApiResponseHelper.success(res, {
        original_size_bytes: originalSize,
        optimized_size_bytes: optimizedSize,
        savings_bytes: savings,
        savings_percent: savingsPercent,
        optimized_data: optimizedData,
        compressed_json: compressedJson
      }, 'JSON optimization completed');
    } catch (error) {
      ApiResponseHelper.error(res, 'Failed to optimize JSON data', 500);
    }
  };

  /**
   * レガシーアラートメタデータの検索
   * GET /api/v1/maintenance/json/search-legacy
   */
  searchLegacyMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      const { message, game_name, limit = 50 } = req.query as any;
      const db = this.databaseManager.getConnection();

      const conditions: string[] = [];
      const params: any[] = [];

      if (message) {
        conditions.push(`json_extract(metadata, '$.legacy_message') LIKE ?`);
        params.push(`%${message}%`);
      }

      if (game_name) {
        conditions.push(`json_extract(metadata, '$.legacy_game_name') LIKE ?`);
        params.push(`%${game_name}%`);
      }

      const whereClause = conditions.length > 0 
        ? `WHERE metadata IS NOT NULL AND json_valid(metadata) AND ${conditions.join(' AND ')}` 
        : 'WHERE metadata IS NOT NULL AND json_valid(metadata)';

      const sql = `
        SELECT 
          id,
          steam_app_id,
          alert_type,
          created_at,
          json_extract(metadata, '$.legacy_message') as legacy_message,
          json_extract(metadata, '$.legacy_game_name') as legacy_game_name,
          json_extract(metadata, '$.legacy_price_data') as legacy_price_data
        FROM alerts 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ?
      `;

      params.push(parseInt(limit as string));
      const results = db.prepare(sql).all(...params);

      ApiResponseHelper.success(res, {
        results,
        count: results.length,
        search_criteria: { message, game_name, limit }
      }, 'Legacy metadata search completed');
    } catch (error) {
      ApiResponseHelper.error(res, 'Failed to search legacy metadata', 500);
    }
  };
}