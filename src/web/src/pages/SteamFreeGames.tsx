import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Spin, message, Select, Tag, Space, Modal, Statistic, Row, Col } from 'antd';
import { 
  ReloadOutlined, 
  CheckOutlined, 
  CloseOutlined, 
  LinkOutlined,
  GiftOutlined,
  CalendarOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface SteamFreeGame {
  id: number;
  app_id: number;
  title: string;
  description?: string;
  steam_url: string;
  is_claimed: boolean;
  claimed_date?: string;
  discovered_at: string;
  updated_at?: string;
}

interface Stats {
  total: number;
  claimed: number;
  unclaimed: number;
  claimRate: number;
}

const SteamFreeGames: React.FC = () => {
  const [games, setGames] = useState<SteamFreeGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  const fetchGames = async (filterType: string = filter) => {
    try {
      const params = filterType !== 'all' ? { filter: filterType } : {};
      const response = await axios.get('/api/steam-free-games', { params });
      setGames(response.data);
    } catch (error) {
      message.error('Steam無料ゲームの取得に失敗しました');
      console.error('Error fetching Steam free games:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/steam-free-games/stats');
      setStats(response.data);
    } catch (error) {
      message.error('統計情報の取得に失敗しました');
      console.error('Error fetching stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await axios.post('/api/steam-free-games/refresh');
      message.success(`チェック完了: Steam ${response.data.steamCount}件, Epic ${response.data.epicCount}件`);
      await fetchGames();
      if (statsVisible) {
        await fetchStats();
      }
    } catch (error) {
      message.error('手動チェックに失敗しました');
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClaimToggle = async (gameId: number, isClaimed: boolean) => {
    try {
      const endpoint = isClaimed ? 'unclaim' : 'claim';
      await axios.put(`/api/steam-free-games/${gameId}/${endpoint}`);
      
      const action = isClaimed ? '未受け取り' : '受け取り済み';
      message.success(`ゲームを${action}にマークしました`);
      
      await fetchGames();
      if (statsVisible) {
        await fetchStats();
      }
    } catch (error) {
      message.error('ステータスの更新に失敗しました');
      console.error('Error updating claim status:', error);
    }
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    setLoading(true);
    fetchGames(value);
  };

  const showStats = async () => {
    await fetchStats();
    setStatsVisible(true);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const getGameCard = (game: SteamFreeGame) => (
    <Card
      key={game.id}
      title={
        <Space>
          <GiftOutlined style={{ color: '#1890ff' }} />
          <Text strong>{game.title}</Text>
          {game.is_claimed ? (
            <Tag color="green" icon={<CheckOutlined />}>受け取り済み</Tag>
          ) : (
            <Tag color="blue" icon={<GiftOutlined />}>未受け取り</Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Button
            type={game.is_claimed ? 'default' : 'primary'}
            icon={game.is_claimed ? <CloseOutlined /> : <CheckOutlined />}
            onClick={() => handleClaimToggle(game.id, game.is_claimed)}
          >
            {game.is_claimed ? '未受け取りにする' : '受け取り済みにする'}
          </Button>
          <Button
            type="link"
            icon={<LinkOutlined />}
            href={game.steam_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Steamで見る
          </Button>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {game.description && (
        <Paragraph ellipsis={{ rows: 2, expandable: true }}>
          {game.description}
        </Paragraph>
      )}
      
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Text type="secondary">
          <CalendarOutlined /> 発見日: {new Date(game.discovered_at).toLocaleDateString('ja-JP')}
        </Text>
        
        {game.claimed_date && (
          <Text type="secondary">
            <CheckOutlined /> 受け取り日: {new Date(game.claimed_date).toLocaleDateString('ja-JP')}
          </Text>
        )}
        
        <Text type="secondary">
          Steam App ID: {game.app_id}
        </Text>
      </Space>
    </Card>
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>
          <GiftOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Steam無料ゲーム
        </Title>
        
        <Space>
          <Button
            icon={<BarChartOutlined />}
            onClick={showStats}
          >
            統計を見る
          </Button>
          <Select
            value={filter}
            onChange={handleFilterChange}
            style={{ width: 150 }}
          >
            <Option value="all">すべて</Option>
            <Option value="unclaimed">未受け取り</Option>
            <Option value="claimed">受け取り済み</Option>
          </Select>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={handleRefresh}
          >
            手動チェック
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {games.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <GiftOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
              <Title level={4} type="secondary">
                {filter === 'all' ? 'Steam無料ゲームが見つかりません' :
                 filter === 'claimed' ? '受け取り済みのゲームがありません' :
                 '未受け取りのゲームがありません'}
              </Title>
              <Text type="secondary">
                手動チェックボタンを押して最新の無料ゲーム情報を取得してください
              </Text>
            </div>
          </Card>
        ) : (
          <div>
            {games.map(getGameCard)}
          </div>
        )}
      </Spin>

      <Modal
        title="Steam無料ゲーム統計"
        open={statsVisible}
        onCancel={() => setStatsVisible(false)}
        footer={[
          <Button key="close" onClick={() => setStatsVisible(false)}>
            閉じる
          </Button>
        ]}
        width={600}
      >
        {stats && (
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="総ゲーム数"
                value={stats.total}
                prefix={<GiftOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="受け取り済み"
                value={stats.claimed}
                prefix={<CheckOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="未受け取り"
                value={stats.unclaimed}
                prefix={<CloseOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="受け取り率"
                value={stats.claimRate}
                precision={1}
                suffix="%"
                valueStyle={{ color: stats.claimRate >= 50 ? '#3f8600' : '#faad14' }}
              />
            </Col>
          </Row>
        )}
      </Modal>
    </div>
  );
};

export default SteamFreeGames;