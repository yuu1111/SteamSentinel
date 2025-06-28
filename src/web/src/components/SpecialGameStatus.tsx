import React, { useState } from 'react'
import { Game } from '../types'

interface SpecialGameStatusProps {
  games: Game[]
}

interface GameCategories {
  failed: Game[]
  freeToPlay: Game[]
  unreleased: Game[]
  removed: Game[]
}

export const SpecialGameStatus: React.FC<SpecialGameStatusProps> = ({ games }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // ゲームをカテゴリ別に分類
  const gameCategories: GameCategories = {
    failed: [],
    freeToPlay: [],
    unreleased: [],
    removed: []
  }

  games.forEach(game => {
    if (!game.latestPrice) {
      gameCategories.failed.push(game)
    } else {
      switch (game.latestPrice.source) {
        case 'steam_free':
          gameCategories.freeToPlay.push(game)
          break
        case 'steam_unreleased':
          gameCategories.unreleased.push(game)
          break
        case 'steam_removed':
          gameCategories.removed.push(game)
          break
      }
    }
  })

  const totalSpecialGames = gameCategories.failed.length + gameCategories.freeToPlay.length + 
                           gameCategories.unreleased.length + gameCategories.removed.length

  if (totalSpecialGames === 0) return null

  const CategoryCard: React.FC<{ title: string; games: Game[]; bgColor: string; icon: string }> = ({
    title,
    games,
    bgColor,
    icon
  }) => {
    if (games.length === 0) return null

    return (
      <div className="col-md-6 mb-3">
        <div className={`card border-${bgColor}`}>
          <div className={`card-header bg-${bgColor} text-white`}>
            <h6 className="mb-0">
              <i className={`bi bi-${icon} me-2`}></i>
              {title} ({games.length}件)
            </h6>
          </div>
          <div className="card-body">
            <div className="failed-games-list">
              {games.map(game => (
                <div key={game.id} className="mb-2">
                  <strong>{game.name}</strong>
                  <small className="text-muted d-block">App ID: {game.steam_app_id}</small>
                  {game.latestPrice?.release_date && (
                    <small className="text-info d-block">
                      リリース予定: {game.latestPrice.release_date}
                    </small>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="row mb-3">
      <div className="col-12">
        <div className="alert alert-warning" role="alert">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>{totalSpecialGames}ゲームが特別な状況です：</strong>
              価格取得失敗 {gameCategories.failed.length}件、
              基本無料 {gameCategories.freeToPlay.length}件、
              未リリース {gameCategories.unreleased.length}件、
              販売終了 {gameCategories.removed.length}件
            </div>
            <button 
              className="btn btn-sm btn-outline-secondary"
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
            >
              <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i> 詳細
            </button>
          </div>
          
          {isExpanded && (
            <div className="mt-3">
              <div className="row">
                <CategoryCard
                  title="価格取得失敗"
                  games={gameCategories.failed}
                  bgColor="danger"
                  icon="exclamation-octagon"
                />
                
                <CategoryCard
                  title="基本無料ゲーム"
                  games={gameCategories.freeToPlay}
                  bgColor="success"
                  icon="gift"
                />
                
                <CategoryCard
                  title="未リリースゲーム"
                  games={gameCategories.unreleased}
                  bgColor="info"
                  icon="clock"
                />
                
                <CategoryCard
                  title="販売終了ゲーム"
                  games={gameCategories.removed}
                  bgColor="secondary"
                  icon="x-circle"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}