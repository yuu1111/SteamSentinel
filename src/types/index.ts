export interface Game {
  id?: number;
  steam_app_id: number;
  name: string;
  enabled: boolean;
  price_threshold?: number;
  price_threshold_type?: 'price' | 'discount' | 'any_sale';
  discount_threshold_percent?: number;
  alert_enabled: boolean;
  manual_historical_low?: number;
  is_purchased?: boolean;
  purchase_price?: number;
  purchase_date?: string;
  was_unreleased?: boolean;
  last_known_release_date?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface PriceHistory {
  id?: number;
  steam_app_id: number;
  current_price: number;
  original_price: number;
  discount_percent: number;
  historical_low: number;
  is_on_sale: boolean;
  source: 'itad' | 'steam' | 'steam_unreleased' | 'steam_free' | 'steam_removed';
  recorded_at: Date;
  release_date?: string; // 未リリースゲームのリリース日（ISO文字列）
}

export interface Alert {
  id?: number;
  steam_app_id: number;
  game_id?: number;
  alert_type: 'new_low' | 'sale_start' | 'threshold_met' | 'free_game' | 'game_released';
  message?: string;
  trigger_price?: number;
  previous_low?: number;
  discount_percent?: number;
  price_data?: any;
  game_name?: string;
  notified_discord: boolean;
  created_at: Date;
  release_date?: string; // リリース通知の場合のリリース日
}

export interface ITADGameInfo {
  app_id: string;
  title: string;
  urls: {
    buy: string;
  };
}

export interface ITADPriceInfo {
  price_new: number;
  price_old: number;
  price_cut: number;
  url: string;
  shop: {
    id: string;
    name: string;
  };
  drm: string[];
}

export interface ITADOverview {
  price?: {
    shop: {
      id: number;
      name: string;
    };
    price: {
      amount: number;
      amountInt: number;
      currency: string;
    };
    regular: {
      amount: number;
      amountInt: number;
      currency: string;
    };
    cut: number;
    voucher: any;
    flag: string;
    drm: any[];
    platforms: any[];
    timestamp: string;
    expiry: string;
    url: string;
  };
  lowest?: {
    shop: {
      id: number;
      name: string;
    };
    price: {
      amount: number;
      amountInt: number;
      currency: string;
    };
    regular: {
      amount: number;
      amountInt: number;
      currency: string;
    };
    cut: number;
    timestamp: string;
  };
  bundles?: any[];
}

export interface SteamPriceInfo {
  success: boolean;
  data?: {
    price_overview?: {
      currency: string;
      initial: number;
      final: number;
      discount_percent: number;
      initial_formatted: string;
      final_formatted: string;
    };
    type?: string;
    is_free?: boolean;
    release_date?: {
      coming_soon: boolean;
      date: string;
    };
    name?: string;
    steam_appid?: number;
  };
  gameType?: 'paid' | 'free' | 'unreleased' | 'dlc' | 'removed';
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

export interface MonitoringResult {
  game: Game;
  currentPrice?: PriceHistory;
  alert?: Alert;
  error?: APIError;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: boolean;
    itad_api: boolean;
    steam_api: boolean;
    scheduler: boolean;
  };
  last_monitoring_run?: Date;
  errors: string[];
}