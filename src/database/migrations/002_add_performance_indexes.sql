-- Migration: Add performance indexes
-- Created: 2025-07-05
-- Purpose: Improve query performance across the application

-- Games table indexes
CREATE INDEX IF NOT EXISTS idx_games_enabled ON games(enabled);
CREATE INDEX IF NOT EXISTS idx_games_is_purchased ON games(is_purchased);
CREATE INDEX IF NOT EXISTS idx_games_enabled_purchased ON games(enabled, is_purchased);
CREATE INDEX IF NOT EXISTS idx_games_monitoring_enabled ON games(alert_enabled, enabled);

-- Price history indexes
CREATE INDEX IF NOT EXISTS idx_price_history_source ON price_history(source);
CREATE INDEX IF NOT EXISTS idx_price_history_app_id_date ON price_history(steam_app_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_is_on_sale ON price_history(is_on_sale);

-- Alerts table indexes
CREATE INDEX IF NOT EXISTS idx_alerts_alert_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_notified_discord ON alerts(notified_discord);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(alert_type, notified_discord, created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_app_id_type ON alerts(steam_app_id, alert_type);

-- Review scores indexes
CREATE INDEX IF NOT EXISTS idx_review_scores_source ON review_scores(source);
CREATE INDEX IF NOT EXISTS idx_review_scores_app_id_source ON review_scores(steam_app_id, source);
CREATE INDEX IF NOT EXISTS idx_review_scores_updated ON review_scores(updated_at);

-- Budget related indexes
CREATE INDEX IF NOT EXISTS idx_budget_expenses_date ON budget_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(is_active, period_type);
CREATE INDEX IF NOT EXISTS idx_budget_expenses_budget_date ON budget_expenses(budget_id, expense_date);

-- Free games indexes
CREATE INDEX IF NOT EXISTS idx_epic_free_games_active ON epic_free_games(end_date, is_claimed);
CREATE INDEX IF NOT EXISTS idx_steam_free_games_active ON steam_free_games(is_expired, is_claimed);
CREATE INDEX IF NOT EXISTS idx_epic_free_games_end_date ON epic_free_games(end_date);
CREATE INDEX IF NOT EXISTS idx_steam_free_games_discovered ON steam_free_games(discovered_at);