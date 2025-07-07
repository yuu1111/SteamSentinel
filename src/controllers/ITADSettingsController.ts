import { Request, Response } from 'express';
import { ApiResponseHelper, BaseController } from '../utils/apiResponse';
import logger from '../utils/logger';
import itadSettingsModel from '../models/ITADSettingsModel';

export class ITADSettingsController extends BaseController {

  // 全設定取得（WebUI用 - レスポンス形式をシンプルに）
  async getAllSettings(req: Request, res: Response): Promise<Response> {
    try {
      const pagination = this.getPaginationParams(req.query);
      const settings = itadSettingsModel.getAllSettings(pagination);
      const total = itadSettingsModel.getSettingsCount();
      
      return ApiResponseHelper.paginated(
        res,
        settings,
        total,
        pagination,
        `${settings.length}件のITAD設定を取得しました`
      );
    } catch (error) {
      logger.error('Failed to get ITAD settings:', error);
      return ApiResponseHelper.error(res, 'ITAD設定の取得に失敗しました', 500, error);
    }
  }

  // 複数設定の一括更新（WebUI用）
  async updateMultipleSettings(req: Request, res: Response): Promise<Response> {
    try {
      const { settings } = req.body;
      
      if (!Array.isArray(settings)) {
        return ApiResponseHelper.badRequest(res, '設定は配列である必要があります');
      }

      for (const setting of settings) {
        if (!setting.name || setting.value === undefined) {
          return ApiResponseHelper.badRequest(res, '各設定には名前と値が必要です');
        }
        
        // バリデーション
        const validationError = this.validateSetting(setting.name, setting.value);
        if (validationError) {
          return ApiResponseHelper.badRequest(res, validationError);
        }
        
        itadSettingsModel.updateSetting(setting.name, setting.value.toString());
      }
      
      return ApiResponseHelper.success(res, null, '設定が正常に更新されました');
    } catch (error) {
      logger.error('Failed to update multiple ITAD settings:', error);
      return ApiResponseHelper.error(res, '設定の更新に失敗しました', 500, error);
    }
  }

  // フィルター設定取得
  async getFilterConfig(_req: Request, res: Response): Promise<Response> {
    try {
      const config = itadSettingsModel.getFilterConfig();
      return ApiResponseHelper.success(res, config, 'ITADフィルター設定を取得しました');
    } catch (error) {
      logger.error('Failed to get ITAD filter config:', error);
      return ApiResponseHelper.error(res, 'ITADフィルター設定の取得に失敗しました', 500, error);
    }
  }

  // 特定設定取得
  async getSetting(req: Request, res: Response): Promise<Response> {
    try {
      const { name } = req.params;
      
      if (!name) {
        return ApiResponseHelper.badRequest(res, '設定名は必須です');
      }

      const setting = itadSettingsModel.getSetting(name);
      
      if (!setting) {
        return ApiResponseHelper.notFound(res, '設定');
      }

      return ApiResponseHelper.success(res, setting, 'ITAD設定を取得しました');
    } catch (error) {
      logger.error('Failed to get ITAD setting:', error);
      return ApiResponseHelper.error(res, 'ITAD設定の取得に失敗しました', 500, error);
    }
  }

  // 設定更新
  async updateSetting(req: Request, res: Response): Promise<Response> {
    try {
      const { name } = req.params;
      const { value } = req.body;
      
      if (!name || value === undefined) {
        return ApiResponseHelper.badRequest(res, '設定名と値は必須です');
      }

      // バリデーション
      const validationError = this.validateSetting(name, value);
      if (validationError) {
        return ApiResponseHelper.badRequest(res, validationError);
      }

      const success = itadSettingsModel.updateSetting(name, value.toString());
      
      if (!success) {
        return ApiResponseHelper.notFound(res, '設定');
      }

      const updatedSetting = itadSettingsModel.getSetting(name);
      return ApiResponseHelper.success(res, updatedSetting, `設定 ${name} が正常に更新されました`);
    } catch (error) {
      logger.error('Failed to update ITAD setting:', error);
      return ApiResponseHelper.error(res, 'ITAD設定の更新に失敗しました', 500, error);
    }
  }

  // フィルター設定一括更新
  async updateFilterConfig(req: Request, res: Response): Promise<Response> {
    try {
      const config = req.body;
      
      // バリデーション
      const validationError = this.validateFilterConfig(config);
      if (validationError) {
        return ApiResponseHelper.badRequest(res, validationError);
      }

      const success = itadSettingsModel.updateFilterConfig(config);
      
      if (!success) {
        return ApiResponseHelper.error(res, 'フィルター設定の更新に失敗しました', 500);
      }

      const updatedConfig = itadSettingsModel.getFilterConfig();
      return ApiResponseHelper.success(res, updatedConfig, 'フィルター設定が正常に更新されました');
    } catch (error) {
      logger.error('Failed to update ITAD filter config:', error);
      return ApiResponseHelper.error(res, 'ITADフィルター設定の更新に失敗しました', 500, error);
    }
  }

  // 設定リセット（WebUI用）
  async resetToDefaults(_req: Request, res: Response): Promise<Response> {
    try {
      const success = itadSettingsModel.resetToDefaults();
      
      if (!success) {
        return ApiResponseHelper.error(res, '設定のリセットに失敗しました', 500);
      }

      return ApiResponseHelper.success(res, null, '設定がデフォルトに正常にリセットされました');
    } catch (error) {
      logger.error('Failed to reset ITAD settings:', error);
      return ApiResponseHelper.error(res, 'ITAD設定のリセットに失敗しました', 500, error);
    }
  }

  // カテゴリ別設定取得
  async getSettingsByCategory(req: Request, res: Response): Promise<Response> {
    try {
      const { category } = req.params;
      
      if (!category) {
        return ApiResponseHelper.badRequest(res, 'カテゴリは必須です');
      }

      const pagination = this.getPaginationParams(req.query);
      const settings = itadSettingsModel.getSettingsByCategory(category, pagination);
      const total = itadSettingsModel.getSettingsByCategoryCount(category);
      
      return ApiResponseHelper.paginated(
        res,
        settings,
        total,
        pagination,
        `${settings.length}件のカテゴリ別ITAD設定を取得しました`
      );
    } catch (error) {
      logger.error('Failed to get ITAD settings by category:', error);
      return ApiResponseHelper.error(res, 'カテゴリ別ITAD設定の取得に失敗しました', 500, error);
    }
  }

  // 設定バリデーション
  private validateSetting(name: string, value: any): string | null {
    switch (name) {
      case 'min_discount':
        const minDiscount = parseFloat(value);
        if (isNaN(minDiscount) || minDiscount < 0 || minDiscount > 100) {
          return 'Min discount must be a number between 0 and 100';
        }
        break;
      
      case 'max_price':
        const maxPrice = parseFloat(value);
        if (isNaN(maxPrice) || maxPrice < 0) {
          return 'Max price must be a positive number';
        }
        break;
      
      case 'limit':
        const limit = parseInt(value);
        if (isNaN(limit) || limit < 1 || limit > 500) {
          return 'Limit must be a number between 1 and 500';
        }
        break;
      
      case 'region':
        if (typeof value !== 'string' || value.length !== 2) {
          return 'Region must be a 2-character country code (e.g., JP, US)';
        }
        break;
      
      case 'enabled':
      case 'notification_enabled':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return 'Boolean setting must be true or false';
        }
        break;
    }
    
    return null;
  }

  // フィルター設定バリデーション
  private validateFilterConfig(config: any): string | null {
    if (config.min_discount !== undefined) {
      const error = this.validateSetting('min_discount', config.min_discount);
      if (error) return error;
    }
    
    if (config.max_price !== undefined) {
      const error = this.validateSetting('max_price', config.max_price);
      if (error) return error;
    }
    
    if (config.limit !== undefined) {
      const error = this.validateSetting('limit', config.limit);
      if (error) return error;
    }
    
    if (config.region !== undefined) {
      const error = this.validateSetting('region', config.region);
      if (error) return error;
    }
    
    if (config.enabled !== undefined) {
      const error = this.validateSetting('enabled', config.enabled);
      if (error) return error;
    }
    
    if (config.notification_enabled !== undefined) {
      const error = this.validateSetting('notification_enabled', config.notification_enabled);
      if (error) return error;
    }
    
    return null;
  }
}

export default new ITADSettingsController();