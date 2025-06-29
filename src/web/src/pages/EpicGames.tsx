import React, { useState, useEffect } from 'react';
import { useAlert } from '../contexts/AlertContext';
import { formatDateJP } from '../utils/dateUtils';

interface EpicFreeGame {
  id: number;
  title: string;
  description?: string;
  epic_url?: string;
  image_url?: string;
  start_date?: string;
  end_date?: string;
  is_claimed: boolean;
  claimed_date?: string;
  discovered_at: string;
}

const EpicGames: React.FC = () => {
  const [games, setGames] = useState<EpicFreeGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'claimed' | 'unclaimed'>('all');
  const { showSuccess, showError } = useAlert();

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/epic-games');
      
      if (!response.ok) {
        throw new Error('Failed to fetch Epic Games data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setGames(data.data || []);
      } else {
        showError('Epic Gamesデータの取得に失敗しました');
        // フォールバック用のモックデータ
        const mockGames: EpicFreeGame[] = [
          {
            id: 1,
            title: 'Sample Free Game',
            description: 'Epic Gamesで期間限定無料配布中',
            epic_url: 'https://store.epicgames.com/ja/p/sample-game',
            start_date: '2024-01-01',
            end_date: '2024-01-07',
            is_claimed: false,
            discovered_at: '2024-01-01T00:00:00Z'
          }
        ];
        setGames(mockGames);
      }
    } catch (error) {
      console.error('Failed to load Epic Games:', error);
      showError('Epic Gamesデータの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const toggleClaimedStatus = async (gameId: number) => {
    try {
      const game = games.find(g => g.id === gameId);
      if (!game) return;

      const response = await fetch(`/api/epic-games/${gameId}/claim`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_claimed: !game.is_claimed
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update claim status');
      }

      const data = await response.json();
      
      if (data.success) {
        // 楽観的更新
        setGames(prev => prev.map(game => 
          game.id === gameId 
            ? { 
                ...game, 
                is_claimed: !game.is_claimed,
                claimed_date: !game.is_claimed ? new Date().toISOString() : undefined
              }
            : game
        ));
        
        showSuccess('受け取り状態を更新しました');
      }
    } catch (error) {
      console.error('Failed to toggle claimed status:', error);
      showError('受け取り状態の更新に失敗しました');
    }
  };

  const filteredGames = games.filter(game => {
    const now = new Date();
    const endDate = game.end_date ? new Date(game.end_date) : null;
    const isActive = !endDate || endDate > now;

    switch (filter) {
      case 'active':
        return isActive;
      case 'claimed':
        return game.is_claimed;
      case 'unclaimed':
        return !game.is_claimed;
      default:
        return true;
    }
  });

  const getGameStatus = (game: EpicFreeGame) => {
    if (game.is_claimed) {
      return { text: '受け取り済み', className: 'badge bg-success' };
    }
    
    const now = new Date();
    const endDate = game.end_date ? new Date(game.end_date) : null;
    
    if (!endDate) {
      return { text: '期限なし', className: 'badge bg-info' };
    }
    
    if (endDate < now) {
      return { text: '期限切れ', className: 'badge bg-secondary' };
    }
    
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 1) {
      return { text: `あと${daysLeft}日`, className: 'badge bg-danger' };
    } else if (daysLeft <= 3) {
      return { text: `あと${daysLeft}日`, className: 'badge bg-warning' };
    } else {
      return { text: `あと${daysLeft}日`, className: 'badge bg-primary' };
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>
              <i className="bi bi-gift me-2"></i>
              Epic Games 無料ゲーム
            </h2>
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={loadGames}
              disabled={loading}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              更新
            </button>
          </div>

          {/* フィルター */}
          <div className="mb-4">
            <div className="btn-group" role="group">
              <input 
                type="radio" 
                className="btn-check" 
                name="filter" 
                id="filter-all" 
                checked={filter === 'all'}
                onChange={() => setFilter('all')}
              />
              <label className="btn btn-outline-secondary" htmlFor="filter-all">
                すべて ({games.length})
              </label>

              <input 
                type="radio" 
                className="btn-check" 
                name="filter" 
                id="filter-active" 
                checked={filter === 'active'}
                onChange={() => setFilter('active')}
              />
              <label className="btn btn-outline-primary" htmlFor="filter-active">
                配布中 ({games.filter(g => {
                  const endDate = g.end_date ? new Date(g.end_date) : null;
                  return !endDate || endDate > new Date();
                }).length})
              </label>

              <input 
                type="radio" 
                className="btn-check" 
                name="filter" 
                id="filter-unclaimed" 
                checked={filter === 'unclaimed'}
                onChange={() => setFilter('unclaimed')}
              />
              <label className="btn btn-outline-warning" htmlFor="filter-unclaimed">
                未受け取り ({games.filter(g => !g.is_claimed).length})
              </label>

              <input 
                type="radio" 
                className="btn-check" 
                name="filter" 
                id="filter-claimed" 
                checked={filter === 'claimed'}
                onChange={() => setFilter('claimed')}
              />
              <label className="btn btn-outline-success" htmlFor="filter-claimed">
                受け取り済み ({games.filter(g => g.is_claimed).length})
              </label>
            </div>
          </div>

          {/* ゲーム一覧 */}
          {filteredGames.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-gift display-1 text-muted"></i>
              <div className="mt-2 text-muted">
                {filter === 'all' ? 'Epic Games無料ゲームが見つかりません' : 'フィルター条件に一致するゲームがありません'}
              </div>
            </div>
          ) : (
            <div className="row">
              {filteredGames.map((game) => {
                const status = getGameStatus(game);
                return (
                  <div key={game.id} className="col-md-6 col-lg-4 mb-4">
                    <div className="card h-100">
                      {game.image_url && (
                        <img 
                          src={game.image_url} 
                          className="card-img-top" 
                          alt={game.title}
                          style={{ height: '200px', objectFit: 'cover' }}
                        />
                      )}
                      <div className="card-body d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h5 className="card-title mb-0">{game.title}</h5>
                          <span className={status.className}>{status.text}</span>
                        </div>
                        
                        {game.description && (
                          <p className="card-text small text-muted mb-3">
                            {game.description}
                          </p>
                        )}

                        <div className="mt-auto">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`claimed-${game.id}`}
                                checked={game.is_claimed}
                                onChange={() => toggleClaimedStatus(game.id)}
                              />
                              <label className="form-check-label" htmlFor={`claimed-${game.id}`}>
                                受け取り済み
                              </label>
                            </div>
                            
                            {game.epic_url && (
                              <a
                                href={game.epic_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary btn-sm"
                              >
                                <i className="bi bi-box-arrow-up-right me-1"></i>
                                Epic Store
                              </a>
                            )}
                          </div>

                          {game.claimed_date && (
                            <div className="mt-2">
                              <small className="text-muted">
                                受け取り日: {formatDateJP(game.claimed_date, 'date')}
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EpicGames;