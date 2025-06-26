import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

interface Config {
  // API Keys
  itadApiKey: string | undefined;
  igdbClientId: string | undefined;
  igdbClientSecret: string | undefined;
  steamApiKey: string | undefined;
  youtubeApiKey: string | undefined;
  twitchClientId: string | undefined;
  twitchClientSecret: string | undefined;
  
  // Webhooks
  discordWebhookUrl: string | undefined;
  
  // Server
  webPort: number;
  webHost: string;
  
  // Monitoring
  monitoringIntervalHours: number;
  notificationCooldownHours: number;
  dataRetentionDays: number;
  
  // API Settings
  apiRequestIntervalSeconds: number;
  apiTimeoutSeconds: number;
  apiConcurrentLimit: number;
  
  // Logging
  logLevel: string;
  logMaxFileSizeMB: number;
  logMaxFiles: number;
  
  // Paths
  databasePath: string;
  logsPath: string;
  publicPath: string;
  
  // Feature flags
  features: {
    discordEnabled: boolean;
    highDiscountDetection: boolean;
    epicGamesNotification: boolean;
  };
  
  // UI settings
  ui: {
    theme: 'light' | 'dark';
    responsive: boolean;
    darkModeAvailable: boolean;
  };
}

// 制限値の定義
const LIMITS = {
  MONITORING_INTERVAL: { min: 10 / 60, max: 1440 / 60, default: 60 / 60 }, // 時間単位
  NOTIFICATION_COOLDOWN: { min: 60 / 60, max: 168 / 60, default: 6 }, // 時間単位
  API_CONCURRENT_LIMIT: { min: 1, max: 5, default: 2 },
  API_TIMEOUT: { min: 5, max: 60, default: 15 },
  DATA_RETENTION: { min: 7, max: 365 * 3, default: 365 }
};

// 値の検証と制限
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// 設定ファイルの読み込み
function loadConfigFile(): any {
  const configPath = path.join(process.cwd(), 'config.json');
  const exampleConfigPath = path.join(process.cwd(), 'config.example.json');
  
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else if (fs.existsSync(exampleConfigPath)) {
      console.warn('config.json not found, using config.example.json');
      return JSON.parse(fs.readFileSync(exampleConfigPath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading config file:', error);
  }
  
  return {};
}

const configFile = loadConfigFile();

export const config: Config = {
  // API Keys
  itadApiKey: process.env.ITAD_API_KEY,
  igdbClientId: process.env.IGDB_CLIENT_ID,
  igdbClientSecret: process.env.IGDB_CLIENT_SECRET,
  steamApiKey: process.env.STEAM_API_KEY,
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  twitchClientId: process.env.TWITCH_CLIENT_ID,
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET,
  
  // Webhooks
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
  
  // Server
  webPort: parseInt(process.env.WEB_PORT || '3000', 10),
  webHost: process.env.WEB_HOST || '127.0.0.1',
  
  // Monitoring (値の検証)
  monitoringIntervalHours: clamp(
    parseFloat(process.env.MONITORING_INTERVAL_HOURS || '1'),
    LIMITS.MONITORING_INTERVAL.min,
    LIMITS.MONITORING_INTERVAL.max
  ),
  notificationCooldownHours: clamp(
    parseFloat(process.env.NOTIFICATION_COOLDOWN_HOURS || '6'),
    LIMITS.NOTIFICATION_COOLDOWN.min,
    LIMITS.NOTIFICATION_COOLDOWN.max
  ),
  dataRetentionDays: clamp(
    parseInt(process.env.DATA_RETENTION_DAYS || '365', 10),
    LIMITS.DATA_RETENTION.min,
    LIMITS.DATA_RETENTION.max
  ),
  
  // API Settings (値の検証)
  apiRequestIntervalSeconds: parseFloat(process.env.API_REQUEST_INTERVAL_SECONDS || '2'),
  apiTimeoutSeconds: clamp(
    parseInt(process.env.API_TIMEOUT_SECONDS || '15', 10),
    LIMITS.API_TIMEOUT.min,
    LIMITS.API_TIMEOUT.max
  ),
  apiConcurrentLimit: clamp(
    parseInt(process.env.API_CONCURRENT_LIMIT || '2', 10),
    LIMITS.API_CONCURRENT_LIMIT.min,
    LIMITS.API_CONCURRENT_LIMIT.max
  ),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'INFO',
  logMaxFileSizeMB: parseInt(process.env.LOG_MAX_FILE_SIZE_MB || '10', 10),
  logMaxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10),
  
  // Paths
  databasePath: path.join(process.cwd(), 'data', 'steam_sentinel.db'),
  logsPath: path.join(process.cwd(), 'logs'),
  publicPath: path.join(process.cwd(), 'public'),
  
  // Feature flags (APIキーの有無で自動設定)
  features: {
    discordEnabled: !!process.env.DISCORD_WEBHOOK_URL && (configFile.features?.discord_enabled !== false),
    highDiscountDetection: configFile.features?.high_discount_detection !== false,
    epicGamesNotification: configFile.features?.epic_games_notification !== false,
  },
  
  // UI settings
  ui: {
    theme: configFile.ui?.theme || 'light',
    responsive: configFile.ui?.responsive !== false,
    darkModeAvailable: configFile.ui?.dark_mode_available !== false,
  }
};

// 必須APIキーのチェック
export function validateRequiredConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.itadApiKey) {
    errors.push(
      'ITAD_API_KEY is required. Get your API key from: https://isthereanydeal.com/apps/my/'
    );
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// 機能の利用可否チェック
export function getFeatureStatus() {
  return {
    core: {
      enabled: !!config.itadApiKey,
      message: config.itadApiKey ? 'Core monitoring active' : 'ITAD API key required'
    },
    discord: {
      enabled: config.features.discordEnabled && !!config.discordWebhookUrl,
      message: config.discordWebhookUrl ? 'Discord notifications enabled' : 'Discord webhook URL not set'
    },
    reviews: {
      enabled: !!config.igdbClientId && !!config.igdbClientSecret,
      message: config.igdbClientId ? 'Review integration enabled' : 'IGDB API credentials not set (optional)'
    },
    steam: {
      enabled: !!config.steamApiKey,
      message: config.steamApiKey ? 'Steam API integration enabled' : 'Steam API key not set (optional)'
    },
    youtube: {
      enabled: !!config.youtubeApiKey,
      message: config.youtubeApiKey ? 'YouTube notifications enabled' : 'YouTube API key not set (optional)'
    },
    twitch: {
      enabled: !!config.twitchClientId && !!config.twitchClientSecret,
      message: config.twitchClientId ? 'Twitch notifications enabled' : 'Twitch API credentials not set (optional)'
    }
  };
}