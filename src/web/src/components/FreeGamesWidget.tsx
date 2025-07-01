import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Button, Space, Spin, Typography, Badge, Tooltip } from 'antd';
import { 
  GiftOutlined, 
  LinkOutlined, 
  CheckOutlined,
  ReloadOutlined,
  CalendarOutlined
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
  is_claimed: boolean;
  discovered_at: string;
}

const FreeGamesWidget: React.FC = () => {
  const [epicGames, setEpicGames] = useState<EpicFreeGame[]>([]);
  const [steamGames, setSteamGames] = useState<SteamFreeGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFreeGames = async () => {
    try {
      const [epicResponse, steamResponse] = await Promise.all([
        axios.get('/api/epic-games/current'),
        axios.get('/api/steam-free-games/current')
      ]);
      
      setEpicGames(epicResponse.data.slice(0, 3)); // 最新3件
      setSteamGames(steamResponse.data.slice(0, 3)); // 最新3件
    } catch (error) {
      console.error('Error fetching free games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post('/api/steam-free-games/refresh');
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

  const renderEpicGame = (game: EpicFreeGame) => (
    <List.Item key={`epic-${game.id}`}>
      <List.Item.Meta
        avatar={
          <Badge 
            dot 
            status={game.is_claimed ? 'success' : 'processing'}
          >
            <GiftOutlined style={{ fontSize: 20, color: '#000' }} />
          </Badge>
        }
        title={
          <Space>
            <Text strong>{game.title}</Text>
            <Tag color="black">Epic</Tag>
            {game.is_claimed && <Tag color="green" icon={<CheckOutlined />}>受取済</Tag>}
          </Space>
        }
        description={
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {game.end_date && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <CalendarOutlined /> 〜{new Date(game.end_date).toLocaleDateString('ja-JP')}
              </Text>
            )}
            {game.epic_url && (
              <Button 
                size="small" 
                type="link" 
                icon={<LinkOutlined />}
                href={game.epic_url}
                target="_blank"
                style={{ padding: 0, height: 'auto' }}
              >
                Epic Storeで見る
              </Button>
            )}
          </Space>
        }
      />
    </List.Item>
  );

  const renderSteamGame = (game: SteamFreeGame) => (
    <List.Item key={`steam-${game.id}`}>
      <List.Item.Meta
        avatar={
          <Badge 
            dot 
            status={game.is_claimed ? 'success' : 'processing'}
          >
            <GiftOutlined style={{ fontSize: 20, color: '#1B2838' }} />
          </Badge>
        }
        title={
          <Space>
            <Text strong>{game.title}</Text>
            <Tag color="blue">Steam</Tag>
            {game.is_claimed && <Tag color="green" icon={<CheckOutlined />}>受取済</Tag>}
          </Space>
        }
        description={
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <CalendarOutlined /> {new Date(game.discovered_at).toLocaleDateString('ja-JP')}
            </Text>
            <Button 
              size="small" 
              type="link" 
              icon={<LinkOutlined />}
              href={game.steam_url}
              target="_blank"
              style={{ padding: 0, height: 'auto' }}
            >
              Steamで見る
            </Button>
          </Space>
        }
      />
    </List.Item>
  );

  const allGames = [...epicGames, ...steamGames];
  const unclaimedCount = allGames.filter(game => !game.is_claimed).length;

  return (
    <Card
      title={
        <Space>
          <GiftOutlined style={{ color: '#52c41a' }} />
          <span>無料ゲーム</span>
          {unclaimedCount > 0 && (
            <Badge count={unclaimedCount} style={{ backgroundColor: '#52c41a' }} />
          )}
        </Space>
      }
      extra={
        <Tooltip title="手動チェック">
          <Button
            icon={<ReloadOutlined />}
            size="small"
            loading={refreshing}
            onClick={handleRefresh}
          />
        </Tooltip>
      }
      size="small"
    >
      <Spin spinning={loading}>
        {allGames.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
            <GiftOutlined style={{ fontSize: 32, marginBottom: 8 }} />
            <div>現在利用可能な無料ゲームはありません</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              手動チェックで最新情報を取得
            </Text>
          </div>
        ) : (
          <List
            dataSource={allGames}
            renderItem={(game) => 
              'epic_url' in game ? renderEpicGame(game as EpicFreeGame) : renderSteamGame(game as SteamFreeGame)
            }
            size="small"
          />
        )}
      </Spin>
    </Card>
  );
};

export default FreeGamesWidget;