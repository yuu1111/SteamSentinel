import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Space, Spin, Typography, Badge, theme } from 'antd';
import { 
  GiftOutlined, 
  LinkOutlined, 
  CheckOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;

interface EpicFreeGame {
  id: number;
  title: string;
  description?: string;
  epic_url?: string;
  start_date?: string;
  end_date?: string;
  is_claimed: boolean;
  discovered_at: string;
}

interface SteamFreeGame {
  id: number;
  app_id: number;
  title: string;
  description?: string;
  steam_url: string;
  start_date?: string;
  end_date?: string;
  is_claimed: boolean;
  discovered_at: string;
}

const FreeGamesWidget: React.FC = () => {
  const { token } = theme.useToken();
  const [epicGames, setEpicGames] = useState<EpicFreeGame[]>([]);
  const [steamGames, setSteamGames] = useState<SteamFreeGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFreeGames = async () => {
    try {
      const response = await axios.get('/api/free-games');
      
      if (response.data && response.data.success) {
        const allGames = response.data.data || [];
        
        // 配布中のゲームのみをフィルタ
        const activeGames = allGames.filter((game: any) => game.status === 'active');
        
        // Epic とSteam ゲームを分離
        const epicGamesData = activeGames
          .filter((game: any) => game.platform === 'epic')
          .slice(0, 3);
        const steamGamesData = activeGames
          .filter((game: any) => game.platform === 'steam')
          .slice(0, 3);
        
        setEpicGames(epicGamesData);
        setSteamGames(steamGamesData);
      }
    } catch (error) {
      console.error('Error fetching free games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post('/api/free-games/refresh');
      await fetchFreeGames();
    } catch (error) {
      console.error('Error refreshing free games:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFreeGames();
  }, []);

  const renderGame = (game: any) => {
    const isEpic = game.platform === 'epic';
    const url = isEpic 
      ? (game.url || game.epic_url || 'https://store.epicgames.com/') 
      : (game.url || game.steam_url || `https://store.steampowered.com/app/${game.app_id}/`);

    return (
      <tr key={`${game.platform}-${game.id}`} style={{ fontSize: '14px' }}>
        <td style={{ padding: '8px 6px', borderBottom: `1px solid ${token.colorBorder}` }}>
          <Badge dot status={game.is_claimed ? 'success' : 'processing'}>
            <GiftOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
          </Badge>
        </td>
        <td style={{ padding: '8px 6px', borderBottom: `1px solid ${token.colorBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Text strong style={{ fontSize: '14px' }} ellipsis title={game.title}>
              {game.title || 'タイトル不明'}
            </Text>
            {game.is_claimed && (
              <Tag 
                color="green" 
                style={{ fontSize: '11px', padding: '2px 6px', lineHeight: '16px' }} 
                icon={<CheckOutlined />}
              >
                受取済
              </Tag>
            )}
          </div>
        </td>
        <td style={{ padding: '8px 6px', borderBottom: `1px solid ${token.colorBorder}`, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {game.start_date 
              ? `${new Date(game.start_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}-${
                  game.end_date 
                    ? new Date(game.end_date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
                    : '?'
                }`
              : '不明'
            }
          </Text>
        </td>
        <td style={{ padding: '8px 6px', borderBottom: `1px solid ${token.colorBorder}`, textAlign: 'center' }}>
          <Tag 
            color={isEpic ? 'black' : 'blue'} 
            style={{ fontSize: '11px', padding: '2px 6px', lineHeight: '16px', margin: 0 }}
          >
            {isEpic ? 'Epic' : 'Steam'}
          </Tag>
        </td>
        <td style={{ padding: '8px 6px', borderBottom: `1px solid ${token.colorBorder}`, textAlign: 'center' }}>
          <Button 
            type="link" 
            icon={<LinkOutlined />}
            size="small"
            style={{ padding: 0, height: '20px', fontSize: '12px' }}
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          />
        </td>
      </tr>
    );
  };

  const allGames = [...epicGames, ...steamGames];
  const unclaimedCount = allGames.filter(game => !game.is_claimed).length;

  return (
    <Card
      title={
        <Space>
          <GiftOutlined style={{ color: token.colorPrimary }} />
          <span>無料ゲーム</span>
          {unclaimedCount > 0 && (
            <Badge count={unclaimedCount} style={{ backgroundColor: token.colorSuccess }} />
          )}
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          size="small"
          loading={refreshing}
          onClick={handleRefresh}
        >
          更新
        </Button>
      }
      bodyStyle={{ padding: '0' }}
    >
      <Spin spinning={loading}>
        {allGames.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
            <GiftOutlined style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }} />
            <div style={{ fontSize: '14px' }}>現在配布中の無料ゲームはありません</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              更新ボタンで最新情報を取得
            </Text>
          </div>
        ) : (
          <div style={{ maxHeight: '280px', overflowY: 'auto', overflowX: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ 
                  backgroundColor: token.colorFillQuaternary,
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: token.colorTextSecondary
                }}>
                  <th style={{ padding: '8px 6px', width: '30px' }}></th>
                  <th style={{ padding: '8px 6px', textAlign: 'left' }}>ゲーム</th>
                  <th style={{ padding: '8px 6px', width: '80px', textAlign: 'center' }}>配布期間</th>
                  <th style={{ padding: '8px 6px', width: '50px', textAlign: 'center' }}>種別</th>
                  <th style={{ padding: '8px 6px', width: '30px' }}></th>
                </tr>
              </thead>
              <tbody>
                {allGames.map((game) => renderGame(game))}
              </tbody>
            </table>
          </div>
        )}
      </Spin>
    </Card>
  );
};

export default FreeGamesWidget;