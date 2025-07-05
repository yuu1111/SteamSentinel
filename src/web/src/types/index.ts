export type ViewType = 'dashboard' | 'games' | 'alerts' | 'monitoring' | 'test' | 'free-games' | 'settings' | 'limitations' | 'licenses' | 'api-docs';

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
  was_unreleased?: boolean
  last_known_release_date?: string
  created_at: string
  updated_at: string
  latestPrice?: PriceData
  gameDetails?: GameDetails
}

export interface GameDetails {
  // Steam API data
  short_description?: string
  detailed_description?: string
  developers?: string[]
  publishers?: string[]
  categories?: Array<{ id: number; description: string }>
  genres?: Array<{ id: number; description: string }>
  platforms?: {
    windows?: boolean
    mac?: boolean
    linux?: boolean
  }
  release_date?: {
    coming_soon: boolean
    date: string
  }
  required_age?: number
  achievements?: {
    total: number
    highlighted?: Array<{
      name: string
      path: string
    }>
  }
  // IGDB API data
  igdb_summary?: string
  igdb_storyline?: string
  igdb_themes?: Array<{ id: number; name: string }>
  igdb_game_modes?: Array<{ id: number; name: string }>
  igdb_player_perspectives?: Array<{ id: number; name: string }>
  igdb_age_ratings?: Array<{
    category: number
    rating: number
    content_descriptions?: Array<{ description: string }>
  }>
  igdb_screenshots?: Array<{
    id: number
    url: string
    width: number
    height: number
  }>
  igdb_videos?: Array<{
    id: number
    name: string
    video_id: string
  }>
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
  // 出費統計
  totalExpenses?: number
  totalSavings?: number
  gamesOwned?: number
  averagePurchasePrice?: number
}

export interface ExpenseData {
  period: string
  summary: {
    totalExpenses: number
    totalSavings: number
    totalGames: number
    averagePrice: number
    savingsRate: number
  }
  recentPurchases: Array<{
    game_name: string
    steam_app_id: number
    trigger_price: number
    discount_percent: number
    created_at: string
  }>
  monthlyTrends: {
    expenses: Array<{ month: string; amount: number }>
    savings: Array<{ month: string; amount: number }>
  }
  categories: {
    bargain: { count: number; total: number; label: string }
    moderate: { count: number; total: number; label: string }
    small: { count: number; total: number; label: string }
    full_price: { count: number; total: number; label: string }
  }
}

export interface TabDashboardData extends DashboardData {
  expenseData?: ExpenseData
}

export interface AlertData {
  id: number
  steam_app_id?: number
  game_id?: number
  alert_type: 'new_low' | 'sale_start' | 'threshold_met' | 'free_game' | 'game_released'
  message?: string
  price_data?: any
  created_at: string
  release_date?: string
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


// Budget Management Types
export interface BudgetData {
  id: string
  name: string
  type: 'monthly' | 'yearly' | 'custom'
  amount: number
  period: string // YYYY-MM for monthly, YYYY for yearly, custom range for custom
  spent: number
  remaining: number
  categories?: BudgetCategory[]
  alerts: BudgetAlert[]
  created_at: string
  updated_at: string
}

export interface BudgetCategory {
  id: string
  name: string
  budgetId: string
  allocated: number
  spent: number
  color: string
}

export interface BudgetAlert {
  id: string
  budgetId: string
  type: 'threshold' | 'exceeded' | 'milestone'
  threshold: number // percentage or amount
  message: string
  isActive: boolean
  triggeredAt?: string
}

export interface SpendingAlert {
  id: string
  type: 'unusual_spending' | 'budget_warning' | 'budget_exceeded' | 'savings_milestone'
  title: string
  message: string
  severity: 'info' | 'warning' | 'danger' | 'success'
  data?: any
  isRead: boolean
  created_at: string
}

export interface HighDiscountGame {
  name: string
  steam_app_id: number
  current_price: number
  original_price: number
  discount_percent: number
  review_score?: number
  review_count?: number
}

export interface HighDiscountData {
  games: HighDiscountGame[]
  lastCheck: string | null
  statistics: {
    lastCheckTime: string | null
    checkInterval: number
    isRunning: boolean
  }
}

export interface BudgetSummary {
  totalBudgets: number
  activeBudgets: number
  totalAllocated: number
  totalSpent: number
  totalRemaining: number
  overBudgetCount: number
  averageUtilization: number
}

// Dashboard Customization Types
export interface DashboardWidget {
  id: string
  type: 'statistics' | 'charts' | 'roi' | 'budget' | 'alerts' | 'purchases' | 'trends' | 'high_discount'
  title: string
  size: 'small' | 'medium' | 'large' | 'full'
  position: { x: number; y: number; w: number; h: number }
  isVisible: boolean
  config?: Record<string, any>
}

export interface DashboardLayout {
  id: string
  name: string
  description?: string
  widgets: DashboardWidget[]
  theme: 'light' | 'dark' | 'auto'
  colorScheme: string
  isDefault: boolean
  created_at: string
  updated_at: string
}

export interface DashboardTheme {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    success: string
    warning: string
    danger: string
    info: string
    background: string
    surface: string
    text: string
  }
  gradients?: Record<string, string>
}

export interface ReportConfig {
  id: string
  name: string
  type: 'monthly' | 'yearly' | 'custom' | 'summary'
  format: 'pdf' | 'csv' | 'json'
  sections: ReportSection[]
  schedule?: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    recipients: string[]
  }
  created_at: string
  updated_at: string
}

export interface ReportSection {
  id: string
  type: 'summary' | 'charts' | 'table' | 'roi' | 'budget' | 'trends'
  title: string
  isEnabled: boolean
  config?: Record<string, any>
  order: number
}

export interface DataBackup {
  id: string
  name: string
  type: 'full' | 'settings' | 'expense_data' | 'budgets'
  data: Record<string, any>
  size: number
  created_at: string
  checksum: string
}

export interface UserPreferences {
  id: string
  userId: string
  dashboard: {
    defaultView: 'overview' | 'monitoring' | 'expenses'
    autoRefresh: boolean
    refreshInterval: number
    compactMode: boolean
  }
  notifications: {
    budget_alerts: boolean
    spending_alerts: boolean
    milestone_alerts: boolean
    email_notifications: boolean
    sound_enabled: boolean
  }
  display: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    currency: string
    dateFormat: string
    numberFormat: string
  }
  privacy: {
    analytics_enabled: boolean
    crash_reporting: boolean
    usage_statistics: boolean
  }
  created_at: string
  updated_at: string
}

// Review integration types
export interface ReviewScore {
  source: 'steam' | 'metacritic' | 'igdb';
  score: number;
  maxScore: number;
  reviewCount?: number;
  description?: string;
  url?: string;
}

export interface GameReviews {
  steamAppId: number;
  gameName: string;
  reviews: ReviewScore[];
  aggregateScore: number;
  lastUpdated: Date;
}