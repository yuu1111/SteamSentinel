export interface Game {
  id: number
  steam_app_id: number
  name: string
  enabled: boolean
  alert_enabled: boolean
  price_threshold?: number
  price_threshold_type: 'price' | 'discount' | 'any_sale'
  discount_threshold_percent?: number
  manual_historical_low?: number
  is_purchased?: boolean
  purchase_price?: number
  purchase_date?: string
  created_at: string
  updated_at: string
  latestPrice?: PriceData
}

export interface PriceData {
  id: number
  steam_app_id: number
  current_price: number
  original_price: number
  discount_percent: number
  is_on_sale: boolean
  historical_low: number
  source: 'itad' | 'steam' | 'steam_free' | 'steam_unreleased' | 'steam_removed'
  release_date?: string
  recorded_at: string
}

export interface DashboardData {
  games: Game[]
  statistics: Statistics
}

export interface Statistics {
  gamesTracked: number
  gamesOnSale: number
  totalAlerts: number
  averageDiscount: number
}

export interface AlertData {
  id: number
  steam_app_id?: number
  game_id?: number
  alert_type: string
  message?: string
  price_data?: any
  created_at: string
  game?: Game
  game_name?: string
  trigger_price?: number
  previous_low?: number | null
  discount_percent?: number
  notified_discord?: boolean
}

export interface MonitoringProgress {
  isRunning: boolean
  currentGame?: string
  completedGames: number
  totalGames: number
  failedGames: number
  estimatedTimeRemaining?: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export type ViewType = 'dashboard' | 'games' | 'alerts' | 'monitoring' | 'settings' | 'limitations' | 'licenses'