import { Request, Response } from 'express';
import logger from '../utils/logger';
import itadSettingsModel from '../models/ITADSettingsModel';

export class ITADSettingsController {

  // 全設定取得（WebUI用 - レスポンス形式をシンプルに）
  async getAllSettings(_req: Request, res: Response): Promise<void> {
    try {
      const settings = itadSettingsModel.getAllSettings();
      res.json(settings);
    } catch (error) {
      logger.error('Failed to get ITAD settings:', error);
      res.status(500).json({ error: 'Failed to get ITAD settings' });
    }
  }

  // 複数設定の一括更新（WebUI用）
  async updateMultipleSettings(req: Request, res: Response): Promise<void> {
    try {
      const { settings } = req.body;
      
      if (!Array.isArray(settings)) {
        res.status(400).json({ error: 'Settings must be an array' });
        return;
      }

      for (const setting of settings) {
        if (!setting.name || setting.value === undefined) {
          res.status(400).json({ error: 'Each setting must have name and value' });
          return;
        }
        
        // バリデーション
        const validationError = this.validateSetting(setting.name, setting.value);
        if (validationError) {
          res.status(400).json({ error: validationError });
          return;
        }
        
        itadSettingsModel.updateSetting(setting.name, setting.value.toString());
      }
      
      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      logger.error('Failed to update multiple ITAD settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  // フィルター設定取得
  async getFilterConfig(_req: Request, res: Response): Promise<void> {
    try {
      const config = itadSettingsModel.getFilterConfig();
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('Failed to get ITAD filter config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get ITAD filter config'
      });
    }
  }

  // 特定設定取得
  async getSetting(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      
      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Setting name is required'
        });
        return;
      }

      const setting = itadSettingsModel.getSetting(name);
      
      if (!setting) {
        res.status(404).json({
          success: false,
          error: 'Setting not found'
        });
        return;
      }

      res.json({
        success: true,
        data: setting
      });
    } catch (error) {
      logger.error('Failed to get ITAD setting:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get ITAD setting'
      });
    }
  }

  // 設定更新
  async updateSetting(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { value } = req.body;
      
      if (!name || value === undefined) {
        res.status(400).json({
          success: false,
          error: 'Setting name and value are required'
        });
        return;
      }

      // バリデーション
      const validationError = this.validateSetting(name, value);
      if (validationError) {
        res.status(400).json({
          success: false,
          error: validationError
        });
        return;
      }

      const success = itadSettingsModel.updateSetting(name, value.toString());
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Setting not found'
        });
        return;
      }

      const updatedSetting = itadSettingsModel.getSetting(name);
      res.json({
        success: true,
        data: updatedSetting,
        message: `Setting ${name} updated successfully`
      });
    } catch (error) {
      logger.error('Failed to update ITAD setting:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update ITAD setting'
      });
    }
  }

  // フィルター設定一括更新
  async updateFilterConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      // バリデーション
      const validationError = this.validateFilterConfig(config);
      if (validationError) {
        res.status(400).json({
          success: false,
          error: validationError
        });
        return;
      }

      const success = itadSettingsModel.updateFilterConfig(config);
      
      if (!success) {
        res.status(500).json({
          success: false,
          error: 'Failed to update filter configuration'
        });
        return;
      }

      const updatedConfig = itadSettingsModel.getFilterConfig();
      res.json({
        success: true,
        data: updatedConfig,
        message: 'Filter configuration updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update ITAD filter config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update ITAD filter config'
      });
    }
  }

  // 設定リセット（WebUI用）
  async resetToDefaults(_req: Request, res: Response): Promise<void> {
    try {
      const success = itadSettingsModel.resetToDefaults();
      
      if (!success) {
        res.status(500).json({ error: 'Failed to reset settings' });
        return;
      }

      res.json({ message: 'Settings reset to defaults successfully' });
    } catch (error) {
      logger.error('Failed to reset ITAD settings:', error);
      res.status(500).json({ error: 'Failed to reset ITAD settings' });
    }
  }

  // カテゴリ別設定取得
  async getSettingsByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      
      if (!category) {
        res.status(400).json({
          success: false,
          error: 'Category is required'
        });
        return;
      }

      const settings = itadSettingsModel.getSettingsByCategory(category);
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Failed to get ITAD settings by category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get ITAD settings by category'
      });
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