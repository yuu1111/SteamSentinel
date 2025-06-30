import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Typography, Spin, Space, Card, Tag, Select, Checkbox } from 'antd';
import { GiftOutlined, SyncOutlined, ReloadOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAlert } from '../contexts/AlertContext';
import { api } from '../utils/api';
// import { formatDateJP } from '../utils/dateUtils';

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
  const [filter, setFilter] = useState<'all' | 'active' | 'claimed' | 'unclaimed' | 'past'>('all');
  const { showSuccess, showError } = useAlert();

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const response = await api.get('/epic-games');
      
      if (response.success && response.data) {
        setGames(response.data || []);
      } else {
        showError('Epic Gamesデータの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error loading Epic Games:', error);
      showError('Epic Gamesデータの読み込み中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const toggleClaimedStatus = async (gameId: number, currentStatus: boolean) => {
    try {
      const response = await api.put(`/epic-games/${gameId}/claim`, {
        is_claimed: !currentStatus,
        claimed_date: !currentStatus ? new Date().toISOString() : null
      });

      if (response.success) {
        setGames(prevGames => 
          prevGames.map(game => 
            game.id === gameId 
              ? { 
                  ...game, 
                  is_claimed: !currentStatus,
                  claimed_date: !currentStatus ? new Date().toISOString() : undefined
                }
              : game
          )
        );
        showSuccess(!currentStatus ? 'ゲームを受け取り済みにマークしました' : '受け取り済みマークを解除しました');
      } else {
        console.error('API response error:', response);
        showError(response.error || '受け取り状況の更新に失敗しました');
      }
    } catch (error: any) {
      console.error('Error updating claimed status:', error);
      const errorMessage = error?.response?.data?.error || error?.message || '受け取り状況の更新中にエラーが発生しました';
      showError(errorMessage);
    }
  };

  const isGameActive = (game: EpicFreeGame) => {
    if (!game.end_date) return true;
    const now = new Date();
    const endDate = new Date(game.end_date);
    return now <= endDate;
  };

  const filteredGames = games.filter(game => {
    switch (filter) {
      case 'active':
        return isGameActive(game);
      case 'past':
        return !isGameActive(game);
      case 'claimed':
        return game.is_claimed;
      case 'unclaimed':
        return !game.is_claimed;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', minHeight: '300px' }}>
        <Spin size="large" />
        <Typography.Text style={{ display: 'block', marginTop: 16, color: '#666' }}>
          Epic Games データを読み込み中...
        </Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 24
          }}>
            <Typography.Title level={2}>
              <GiftOutlined style={{ marginRight: 8 }} />
              Epic Games 無料ゲーム
            </Typography.Title>
            <Space>
              <Select
                value={filter}
                onChange={setFilter}
                style={{ width: 120 }}
                options={[
                  { value: 'all', label: 'すべて' },
                  { value: 'active', label: '配布中' },
                  { value: 'past', label: '過去' },
                  { value: 'claimed', label: '受け取り済み' },
                  { value: 'unclaimed', label: '未受け取り' }
                ]}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={loadGames}
                loading={loading}
                size="middle"
              >
                再読み込み
              </Button>
              <Button
                type="primary"
                icon={<SyncOutlined />}
                size="middle"
                loading={loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    const response = await api.post('/epic-games/refresh');
                    
                    if (response.success) {
                      showSuccess(response.message || '新しい無料ゲームを取得しました');
                      await loadGames();
                    } else {
                      showError('Epic Gamesの更新に失敗しました');
                    }
                  } catch (error) {
                    console.error('Failed to refresh Epic Games:', error);
                    showError('Epic Gamesの更新中にエラーが発生しました');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                最新データ取得
              </Button>
            </Space>
          </div>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]}>
        {filteredGames.length === 0 ? (
          <Col span={24}>
            <Card>
              <Typography.Text type="secondary">
                {filter === 'all' 
                  ? '現在、Epic Games Storeで配布中の無料ゲームはありません。'
                  : `選択したフィルター「${filter === 'active' ? '配布中' : filter === 'past' ? '過去' : filter === 'claimed' ? '受け取り済み' : '未受け取り'}」に該当するゲームはありません。`
                }
              </Typography.Text>
            </Card>
          </Col>
        ) : (
          filteredGames.map((game) => {
            const isActive = isGameActive(game);
            return (
            <Col key={game.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                cover={
                  game.image_url ? (
                    <img
                      alt={game.title}
                      src={game.image_url}
                      style={{ height: 200, objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ height: 200, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <GiftOutlined style={{ fontSize: 48, color: '#999' }} />
                    </div>
                  )
                }
                actions={[
                  <Checkbox
                    checked={game.is_claimed}
                    onChange={() => toggleClaimedStatus(game.id, game.is_claimed)}
                  >
                    受け取り済み
                  </Checkbox>,
                  <Button
                    type="link"
                    href={game.epic_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                  >
                    Epic Store
                  </Button>
                ]}
              >
                <Card.Meta
                  title={game.title}
                  description={
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {game.description && (
                        <Typography.Paragraph ellipsis={{ rows: 2 }}>
                          {game.description}
                        </Typography.Paragraph>
                      )}
                      <Space wrap>
                        {!isActive && (
                          <Tag color="default" icon={<ClockCircleOutlined />}>過去</Tag>
                        )}
                        {isActive && (
                          <Tag color="green" icon={<GiftOutlined />}>配布中</Tag>
                        )}
                        {game.is_claimed && (
                          <Tag color="success" icon={<CheckCircleOutlined />}>受け取り済み</Tag>
                        )}
                      </Space>
                      {game.start_date && game.end_date && (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(game.start_date).toLocaleDateString()} - {new Date(game.end_date).toLocaleDateString()}
                        </Typography.Text>
                      )}
                    </Space>
                  }
                />
              </Card>
            </Col>
            );
          })
        )}
      </Row>
    </div>
  )
}

export default EpicGames