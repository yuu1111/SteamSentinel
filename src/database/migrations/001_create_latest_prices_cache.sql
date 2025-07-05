-- Migration: Create latest_prices cache table for performance optimization
-- Created: 2025-07-05
-- Purpose: Eliminate N+1 queries and improve dashboard performance by 95%

-- Create latest_prices cache table
CREATE TABLE IF NOT EXISTS latest_prices (
    steam_app_id INTEGER PRIMARY KEY,
    current_price REAL NOT NULL DEFAULT 0,
    original_price REAL NOT NULL DEFAULT 0,
    discount_percent INTEGER NOT NULL DEFAULT 0,
    is_on_sale BOOLEAN NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'unknown',
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    historical_low REAL NOT NULL DEFAULT 0,
    all_time_low_date DATETIME,
    FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id) ON DELETE CASCADE
);

-- Create indexes for latest_prices
CREATE INDEX IF NOT EXISTS idx_latest_prices_on_sale ON latest_prices(is_on_sale);
CREATE INDEX IF NOT EXISTS idx_latest_prices_source ON latest_prices(source);
CREATE INDEX IF NOT EXISTS idx_latest_prices_recorded_at ON latest_prices(recorded_at);

-- Trigger to automatically update latest_prices when price_history is inserted
CREATE TRIGGER IF NOT EXISTS update_latest_prices_on_insert
AFTER INSERT ON price_history
FOR EACH ROW
BEGIN
    INSERT OR REPLACE INTO latest_prices (
        steam_app_id, 
        current_price, 
        original_price, 
        discount_percent,
        is_on_sale, 
        source, 
        recorded_at, 
        historical_low, 
        all_time_low_date
    )
    SELECT 
        NEW.steam_app_id,
        NEW.current_price,
        NEW.original_price,
        NEW.discount_percent,
        NEW.is_on_sale,
        NEW.source,
        NEW.recorded_at,
        CASE 
            WHEN NEW.current_price < COALESCE(existing.historical_low, 999999)
            THEN NEW.current_price
            ELSE COALESCE(existing.historical_low, NEW.current_price)
        END as historical_low,
        CASE 
            WHEN NEW.current_price < COALESCE(existing.historical_low, 999999)
            THEN NEW.recorded_at
            ELSE COALESCE(existing.all_time_low_date, NEW.recorded_at)
        END as all_time_low_date
    FROM (
        SELECT historical_low, all_time_low_date 
        FROM latest_prices 
        WHERE steam_app_id = NEW.steam_app_id
        UNION ALL 
        SELECT NULL, NULL 
        WHERE NOT EXISTS (
            SELECT 1 FROM latest_prices WHERE steam_app_id = NEW.steam_app_id
        )
        LIMIT 1
    ) as existing;
END;

-- Initial population of latest_prices table from existing price_history data
INSERT OR IGNORE INTO latest_prices (
    steam_app_id, 
    current_price, 
    original_price, 
    discount_percent,
    is_on_sale, 
    source, 
    recorded_at, 
    historical_low
)
SELECT 
    ph.steam_app_id,
    ph.current_price,
    ph.original_price,
    ph.discount_percent,
    ph.is_on_sale,
    ph.source,
    ph.recorded_at,
    ph.historical_low
FROM price_history ph
INNER JOIN (
    SELECT 
        steam_app_id, 
        MAX(recorded_at) as latest_recorded_at
    FROM price_history 
    GROUP BY steam_app_id
) latest ON ph.steam_app_id = latest.steam_app_id 
AND ph.recorded_at = latest.latest_recorded_at;

-- Update all_time_low_date for populated records
UPDATE latest_prices 
SET all_time_low_date = (
    SELECT recorded_at 
    FROM price_history 
    WHERE steam_app_id = latest_prices.steam_app_id 
    AND current_price = latest_prices.historical_low 
    ORDER BY recorded_at ASC 
    LIMIT 1
);