import { useState, useMemo } from 'react'
import { Game } from '../types'

type SortDirection = 'asc' | 'desc'
type SortColumn = 'name' | 'currentPrice' | 'originalPrice' | 'discountPercent' | 'historicalLow' | 'isOnSale' | 'lastUpdated'

interface SortConfig {
  column: SortColumn | null
  direction: SortDirection
}

export const useTableSort = (games: Game[]) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: 'asc'
  })

  const sortedGames = useMemo(() => {
    if (!sortConfig.column) return games

    const sorted = [...games].sort((a, b) => {
      let valueA: any, valueB: any

      switch (sortConfig.column) {
        case 'name':
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
          break
          
        case 'currentPrice':
          const getCurrentPriceValue = (game: Game) => {
            if (!game.latestPrice) return 0
            if (['steam_free', 'steam_unreleased', 'steam_removed'].includes(game.latestPrice.source)) {
              return 0
            }
            return game.latestPrice.current_price || 0
          }
          valueA = getCurrentPriceValue(a)
          valueB = getCurrentPriceValue(b)
          break
          
        case 'originalPrice':
          const getOriginalPriceValue = (game: Game) => {
            if (!game.latestPrice) return 0
            if (['steam_free', 'steam_unreleased', 'steam_removed'].includes(game.latestPrice.source)) {
              return 0
            }
            return game.latestPrice.original_price || 0
          }
          valueA = getOriginalPriceValue(a)
          valueB = getOriginalPriceValue(b)
          break
          
        case 'discountPercent':
          const getDiscountValue = (game: Game) => {
            if (!game.latestPrice) return 0
            if (['steam_free', 'steam_unreleased', 'steam_removed'].includes(game.latestPrice.source)) {
              return 0
            }
            return game.latestPrice.discount_percent || 0
          }
          valueA = getDiscountValue(a)
          valueB = getDiscountValue(b)
          break
          
        case 'historicalLow':
          const getHistoricalLowValue = (game: Game) => {
            if (!game.latestPrice) return 0
            if (['steam_free', 'steam_unreleased', 'steam_removed'].includes(game.latestPrice.source)) {
              return 0
            }
            return game.latestPrice.historical_low || 0
          }
          valueA = getHistoricalLowValue(a)
          valueB = getHistoricalLowValue(b)
          break
          
        case 'isOnSale':
          // セール状態のソート順序を定義
          // 1: セール中, 2: 通常価格, 3: 基本無料, 4: 未リリース, 5: 販売終了, 6: データなし
          const getSaleStatusValue = (game: Game) => {
            if (!game.latestPrice) return 6
            
            switch (game.latestPrice.source) {
              case 'steam_free': return 3
              case 'steam_unreleased': return 4
              case 'steam_removed': return 5
              default:
                return game.latestPrice.is_on_sale ? 1 : 2
            }
          }
          valueA = getSaleStatusValue(a)
          valueB = getSaleStatusValue(b)
          break
          
        case 'lastUpdated':
          valueA = a.latestPrice?.recorded_at ? new Date(a.latestPrice.recorded_at).getTime() : 0
          valueB = b.latestPrice?.recorded_at ? new Date(b.latestPrice.recorded_at).getTime() : 0
          break
          
        default:
          return 0
      }

      // 数値の場合は数値比較、文字列の場合は文字列比較
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA
      } else {
        if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      }
    })

    return sorted
  }, [games, sortConfig])

  const handleSort = (column: SortColumn) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const getSortIcon = (column: SortColumn) => {
    if (sortConfig.column !== column) {
      return 'bi bi-arrow-down-up sort-icon'
    }
    return sortConfig.direction === 'asc' ? 
      'bi bi-arrow-up sort-icon text-primary' : 
      'bi bi-arrow-down sort-icon text-primary'
  }

  return {
    sortedGames,
    sortConfig,
    handleSort,
    getSortIcon
  }
}