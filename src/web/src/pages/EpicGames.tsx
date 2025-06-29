import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Typography, Spin, Space, Card, Tag } from 'antd';
import { GiftOutlined, SyncOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAlert } from '../contexts/AlertContext';
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
  // const [filter, setFilter] = useState<'all' | 'active' | 'claimed' | 'unclaimed'>('all');
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
      }
    } catch (error) {
      console.error('Error loading Epic Games:', error);
      showError('Epic Gamesデータの読み込み中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

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
                    const response = await fetch('/api/epic-games/refresh', { method: 'POST' });
                    const data = await response.json();
                    
                    if (data.success) {
                      showSuccess(data.message || '新しい無料ゲームを取得しました');
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
        {games.length === 0 ? (
          <Col span={24}>
            <Card>
              <Typography.Text type="secondary">
                現在、Epic Games Storeで配布中の無料ゲームはありません。
              </Typography.Text>
            </Card>
          </Col>
        ) : (
          games.map((game) => (
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
                  <Button
                    type="link"
                    href={game.epic_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Epic Storeで見る
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
                      {game.start_date && game.end_date && (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          配布期間: {new Date(game.start_date).toLocaleDateString()} - {new Date(game.end_date).toLocaleDateString()}
                        </Typography.Text>
                      )}
                      {game.is_claimed && (
                        <Tag color="success">受け取り済み</Tag>
                      )}
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))
        )}
      </Row>
    </div>
  )
}

export default EpicGames