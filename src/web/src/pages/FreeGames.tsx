import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Button, Typography, Spin, Space, Tag, Select, 
  Checkbox, Tabs, Badge, Statistic, Modal 
} from 'antd';
import { 
  GiftOutlined, SyncOutlined, ReloadOutlined, CheckCircleOutlined, 
  ClockCircleOutlined, CloudOutlined, BarChartOutlined,
  CalendarOutlined, LinkOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useAlert } from '../contexts/AlertContext';
import { api } from '../utils/api';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface UnifiedFreeGame {
  id: string;
  title: string;
  description?: string;
  url: string;
  platform: 'epic' | 'steam';
  status: 'active' | 'expired' | 'upcoming';
  is_claimed: boolean;
  claimed_date?: string;
  start_date?: string;
  end_date?: string;
  discovered_at: string;
  app_id?: number;
}

interface FreeGamesStats {
  total: {
    all: number;
    epic: number;
    steam: number;
  };
  claimed: {
    all: number;
    epic: number;
    steam: number;
  };
  unclaimed: {
    all: number;
    epic: number;
    steam: number;
  };
  active: {
    epic: number;
    steam: number;
  };
  claimRate: {
    all: number;
    epic: number;
    steam: number;
  };
}

// Custom hook for responsive breakpoints
const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 576 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenSize({
        width,
        isMobile: width < 576,
        isTablet: width < 768,
        isDesktop: width >= 768
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

const FreeGames: React.FC = () => {
  const [games, setGames] = useState<UnifiedFreeGame[]>([]);
  const [allGames, setAllGames] = useState<UnifiedFreeGame[]>([]); // 全ゲームデータを保持
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [platform, setPlatform] = useState<'all' | 'epic' | 'steam'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'upcoming'>('all');
  const [claimedFilter, setClaimedFilter] = useState<'all' | 'claimed' | 'unclaimed'>('all');
  const [stats, setStats] = useState<FreeGamesStats | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [selectedGame, setSelectedGame] = useState<UnifiedFreeGame | null>(null);
  const [gameDetailVisible, setGameDetailVisible] = useState(false);
  const [searchingEpicUrl, setSearchingEpicUrl] = useState<string | null>(null);
  const { showSuccess, showError } = useAlert();
  const responsive = useResponsive();

  const loadGames = async () => {
    try {
      setLoading(true);
      
      // 常に全データを取得
      const allResponse = await api.get('/free-games');
      if (allResponse.success && allResponse.data) {
        setAllGames(allResponse.data);
      }
      
      // フィルタリングされたデータを取得
      const queryParams = new URLSearchParams();
      if (platform !== 'all') queryParams.append('platform', platform);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (claimedFilter === 'claimed') queryParams.append('claimed', 'true');
      if (claimedFilter === 'unclaimed') queryParams.append('claimed', 'false');

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/free-games?${queryString}` : '/free-games';
      const response = await api.get(endpoint);
      
      if (response.success && response.data) {
        setGames(response.data);
      } else {
        showError('無料ゲームデータの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error loading free games:', error);
      showError('無料ゲームデータの読み込み中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/free-games/stats');
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const refreshGames = async () => {
    try {
      setRefreshing(true);
      const response = await api.post('/free-games/refresh');
      
      if (response.success) {
        showSuccess(response.message || '新しい無料ゲームを確認しました');
        await loadGames();
        await loadStats();
      } else {
        showError('無料ゲームの更新に失敗しました');
      }
    } catch (error) {
      console.error('Failed to refresh free games:', error);
      showError('無料ゲームの更新中にエラーが発生しました');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleClaimedStatus = async (gameId: string, currentStatus: boolean) => {
    try {
      const response = await api.put(`/free-games/${gameId}/claim`, {
        is_claimed: !currentStatus
      });

      if (response.success) {
        // 両方の配列を更新
        const updateGame = (game: UnifiedFreeGame) => 
          game.id === gameId 
            ? { ...game, is_claimed: !currentStatus, claimed_date: !currentStatus ? new Date().toISOString() : undefined }
            : game;
            
        setGames(prevGames => prevGames.map(updateGame));
        setAllGames(prevGames => prevGames.map(updateGame));
        showSuccess(response.message || '受け取り状況を更新しました');
        if (statsVisible) await loadStats();
      } else {
        showError(response.error || '受け取り状況の更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating claimed status:', error);
      showError('受け取り状況の更新中にエラーが発生しました');
    }
  };

  const getPlatformIcon = (platform: 'epic' | 'steam') => {
    if (platform === 'steam') {
      return <CloudOutlined style={{ color: '#1b2838' }} />;
    }
    return <GiftOutlined style={{ color: '#000' }} />;
  };

  const getStatusTag = (game: UnifiedFreeGame) => {
    switch (game.status) {
      case 'active':
        return <Tag color="green" icon={<GiftOutlined />}>配布中</Tag>;
      case 'expired':
        return <Tag color="default" icon={<ClockCircleOutlined />}>配布終了</Tag>;
      case 'upcoming':
        return <Tag color="blue">配布予定</Tag>;
      default:
        return null;
    }
  };

  const showGameDetail = (game: UnifiedFreeGame) => {
    setSelectedGame(game);
    setGameDetailVisible(true);
  };

  const extractEpicUrlFromDescription = (description?: string): string | null => {
    if (!description) return null;
    
    // 通常のURLパターンをチェック
    let epicUrlMatch = description.match(/https?:\/\/store\.epicgames\.com\/[^\s"<>]+/i);
    
    if (!epicUrlMatch) {
      // URLエンコードされたパターンをチェック
      const encodedUrlMatch = description.match(/https?%3A%2F%2Fstore\.epicgames\.com%2F[^"\s<>&]+/i);
      if (encodedUrlMatch) {
        try {
          return decodeURIComponent(encodedUrlMatch[0]);
        } catch (error) {
          console.error('Failed to decode Epic Store URL:', error);
          return null;
        }
      }
    }
    
    return epicUrlMatch ? epicUrlMatch[0] : null;
  };

  const handleStoreButtonClick = async (game: UnifiedFreeGame) => {
    if (game.platform === 'steam') {
      // Steamの場合は直接開く
      window.open(game.url, '_blank');
      return;
    }

    // Epic Gamesの場合
    setSearchingEpicUrl(game.id);
    
    // 説明文からEpic Store URLを抽出
    const epicUrlFromDescription = extractEpicUrlFromDescription(game.description);
    if (epicUrlFromDescription) {
      console.log('Found Epic Store URL in description:', epicUrlFromDescription);
      window.open(epicUrlFromDescription, '_blank');
    } else {
      console.log('No Epic Store URL found in description for:', game.title);
      showError(`${game.title}のEpic Store URLが見つかりませんでした`);
    }
    
    setSearchingEpicUrl(null);
  };

  const getGameCard = (game: UnifiedFreeGame) => {
    const isEpic = game.platform === 'epic';
    
    return (
      <Col key={game.id} xs={24} sm={12} md={8} lg={6} xl={6} xxl={4}>
        <Card
          hoverable
          style={{ 
            height: '100%',
            minHeight: '320px',
            margin: '0 0 16px 0'
          }}
          cover={
            <div style={{ 
              height: 120,
              minHeight: 120,
              background: isEpic ? '#2a2a2a' : '#1b2838', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              position: 'relative'
            }}>
              {getPlatformIcon(game.platform)}
              {isEpic ? (
                <Text style={{ 
                  fontSize: responsive.isMobile ? 20 : 32, 
                  color: '#fff', 
                  marginLeft: 8 
                }}>Epic</Text>
              ) : (
                <Text style={{ 
                  fontSize: responsive.isMobile ? 20 : 32, 
                  color: '#fff', 
                  marginLeft: 8 
                }}>Steam</Text>
              )}
              <div style={{ position: 'absolute', top: 8, right: 8 }}>
                {getStatusTag(game)}
              </div>
            </div>
          }
          actions={[
            <div key="actions" style={{ width: '100%' }}>
              <Space 
                direction={responsive.isTablet ? 'vertical' : 'horizontal'} 
                size="small" 
                style={{ width: '100%', justifyContent: 'center' }}
                wrap
              >
                <Checkbox
                  checked={game.is_claimed}
                  onChange={() => toggleClaimedStatus(game.id, game.is_claimed)}
                  disabled={game.status === 'expired'}
                  style={{ fontSize: responsive.isMobile ? 12 : 14 }}
                >
                  受け取り済み
                </Checkbox>
                <Button
                  type="link"
                  size={responsive.isMobile ? 'small' : 'middle'}
                  icon={<LinkOutlined />}
                  loading={searchingEpicUrl === game.id}
                  onClick={() => handleStoreButtonClick(game)}
                >
                  ストア
                </Button>
                {game.description && (
                  <Button
                    type="link"
                    size={responsive.isMobile ? 'small' : 'middle'}
                    icon={<InfoCircleOutlined />}
                    onClick={() => showGameDetail(game)}
                  >
                    詳細
                  </Button>
                )}
              </Space>
            </div>
          ]}
        >
          <Card.Meta
            title={
              <div style={{ 
                fontSize: responsive.isMobile ? 14 : 16,
                lineHeight: '1.4',
                marginBottom: 8
              }}>
                {game.title}
              </div>
            }
            description={
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {game.description && (
                  <Paragraph 
                    ellipsis={{ 
                      rows: responsive.isMobile ? 1 : 2 
                    }}
                    style={{ 
                      fontSize: responsive.isMobile ? 12 : 14,
                      margin: 0,
                      lineHeight: '1.3'
                    }}
                  >
                    {game.description}
                  </Paragraph>
                )}
                {/* 受け取り済みタグ固定領域 */}
                <div style={{ 
                  minHeight: responsive.isMobile ? 20 : 24, 
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginBottom: 4
                }}>
                  {game.is_claimed ? (
                    <Tag 
                      color="success" 
                      icon={<CheckCircleOutlined />}
                      style={{ fontSize: responsive.isMobile ? 10 : 12 }}
                    >
                      受け取り済み
                    </Tag>
                  ) : (
                    <div style={{ height: responsive.isMobile ? 20 : 24 }} />
                  )}
                </div>
                
                {/* ゲーム情報 */}
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {game.platform === 'epic' && game.start_date && game.end_date && (
                    <Text 
                      type="secondary" 
                      style={{ 
                        fontSize: responsive.isMobile ? 10 : 12,
                        lineHeight: '1.2'
                      }}
                    >
                      <CalendarOutlined /> {new Date(game.start_date).toLocaleDateString()} - {new Date(game.end_date).toLocaleDateString()}
                    </Text>
                  )}
                  {game.platform === 'steam' && game.app_id && (
                    <Text 
                      type="secondary" 
                      style={{ 
                        fontSize: responsive.isMobile ? 10 : 12,
                        lineHeight: '1.2'
                      }}
                    >
                      App ID: {game.app_id}
                    </Text>
                  )}
                </Space>
              </Space>
            }
          />
        </Card>
      </Col>
    );
  };

  useEffect(() => {
    loadGames();
    loadStats();
  }, [platform, statusFilter, claimedFilter]);

  // 全ゲームデータからカウントを計算（フィルターに関係なく正確な件数）
  const epicCount = allGames.filter(g => g.platform === 'epic').length;
  const steamCount = allGames.filter(g => g.platform === 'steam').length;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', minHeight: '300px' }}>
        <Spin size="large" />
        <Typography.Text style={{ display: 'block', marginTop: 16, color: '#666' }}>
          無料ゲームデータを読み込み中...
        </Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ padding: responsive.isMobile ? '0 12px' : '0 24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <div style={{ 
            display: 'flex', 
            flexDirection: responsive.isTablet ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: responsive.isTablet ? 'stretch' : 'center',
            gap: responsive.isTablet ? 16 : 0,
            marginBottom: 24
          }}>
            <Title level={responsive.isMobile ? 3 : 2}>
              <GiftOutlined style={{ marginRight: 8 }} />
              無料ゲーム
            </Title>
            <Space 
              wrap 
              size={responsive.isMobile ? 'small' : 'middle'}
              style={{ 
                justifyContent: responsive.isTablet ? 'center' : 'flex-end',
                width: responsive.isTablet ? '100%' : 'auto'
              }}
            >
              <Button
                icon={<BarChartOutlined />}
                size={responsive.isMobile ? 'small' : 'middle'}
                onClick={() => {
                  loadStats();
                  setStatsVisible(true);
                }}
              >
                {responsive.isMobile ? '統計' : '統計を見る'}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                size={responsive.isMobile ? 'small' : 'middle'}
                onClick={loadGames}
                loading={loading}
              >
                {responsive.isMobile ? '再読込' : '再読み込み'}
              </Button>
              <Button
                type="primary"
                icon={<SyncOutlined />}
                size={responsive.isMobile ? 'small' : 'middle'}
                loading={refreshing}
                onClick={refreshGames}
              >
                {responsive.isMobile ? '更新' : '最新データ取得'}
              </Button>
            </Space>
          </div>
        </Col>
      </Row>

      <Tabs 
        activeKey={platform} 
        onChange={(key) => setPlatform(key as any)}
        style={{ marginBottom: 16 }}
        size={responsive.isMobile ? 'small' : 'default'}
        tabBarExtraContent={
          responsive.isTablet ? null : (
            <Space wrap>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 120 }}
                size={responsive.isMobile ? 'small' : 'middle'}
                options={[
                  { value: 'all', label: 'すべて' },
                  { value: 'active', label: '配布中' },
                  { value: 'expired', label: '配布終了' },
                  { value: 'upcoming', label: '配布予定' }
                ]}
              />
              <Select
                value={claimedFilter}
                onChange={setClaimedFilter}
                style={{ width: 120 }}
                size={responsive.isMobile ? 'small' : 'middle'}
                options={[
                  { value: 'all', label: 'すべて' },
                  { value: 'claimed', label: '受け取り済み' },
                  { value: 'unclaimed', label: '未受け取り' }
                ]}
              />
            </Space>
          )
        }
      >
        <TabPane 
          tab={<span>すべて <Badge count={games.length} /></span>} 
          key="all"
        />
        <TabPane 
          tab={<span><GiftOutlined /> Epic Games <Badge count={epicCount} /></span>} 
          key="epic"
        />
        <TabPane 
          tab={<span><CloudOutlined /> Steam <Badge count={steamCount} /></span>} 
          key="steam"
        />
      </Tabs>
      
      {/* Mobile filter section */}
      {responsive.isTablet && (
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Space wrap size="small">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: responsive.isMobile ? 100 : 120 }}
              size="small"
              options={[
                { value: 'all', label: 'すべて' },
                { value: 'active', label: '配布中' },
                { value: 'expired', label: '配布終了' },
                { value: 'upcoming', label: '配布予定' }
              ]}
            />
            <Select
              value={claimedFilter}
              onChange={setClaimedFilter}
              style={{ width: responsive.isMobile ? 100 : 120 }}
              size="small"
              options={[
                { value: 'all', label: 'すべて' },
                { value: 'claimed', label: '受け取り済み' },
                { value: 'unclaimed', label: '未受け取り' }
              ]}
            />
          </Space>
        </div>
      )}
      
      <Row gutter={responsive.isMobile ? [8, 8] : [16, 16]}>
        {games.length === 0 ? (
          <Col span={24}>
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <GiftOutlined style={{ fontSize: 48, color: '#ccc', marginBottom: 16 }} />
                <Title level={4} type="secondary">
                  該当する無料ゲームが見つかりません
                </Title>
                <Text type="secondary">
                  フィルターを変更するか、最新データ取得ボタンを押してください
                </Text>
              </div>
            </Card>
          </Col>
        ) : (
          games.map(getGameCard)
        )}
      </Row>

      <Modal
        title="無料ゲーム統計"
        open={statsVisible}
        onCancel={() => setStatsVisible(false)}
        footer={[
          <Button key="close" onClick={() => setStatsVisible(false)}>
            閉じる
          </Button>
        ]}
        width={800}
      >
        {stats && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="総ゲーム数"
                    value={stats.total.all}
                    prefix={<GiftOutlined />}
                  />
                  <Space style={{ marginTop: 8 }}>
                    <Tag>Epic: {stats.total.epic}</Tag>
                    <Tag>Steam: {stats.total.steam}</Tag>
                  </Space>
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="受け取り済み"
                    value={stats.claimed.all}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                  <Space style={{ marginTop: 8 }}>
                    <Tag color="green">Epic: {stats.claimed.epic}</Tag>
                    <Tag color="green">Steam: {stats.claimed.steam}</Tag>
                  </Space>
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="受け取り率"
                    value={stats.claimRate.all}
                    suffix="%"
                    precision={1}
                    valueStyle={{ color: stats.claimRate.all >= 50 ? '#3f8600' : '#faad14' }}
                  />
                  <Space style={{ marginTop: 8 }}>
                    <Tag>Epic: {stats.claimRate.epic}%</Tag>
                    <Tag>Steam: {stats.claimRate.steam}%</Tag>
                  </Space>
                </Card>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="配布中"
                    value={stats.active.epic + stats.active.steam}
                    prefix={<GiftOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Space style={{ marginTop: 8 }}>
                    <Tag color="blue">Epic: {stats.active.epic}</Tag>
                    <Tag color="blue">Steam: {stats.active.steam}</Tag>
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="未受け取り"
                    value={stats.unclaimed.all}
                    valueStyle={{ color: '#faad14' }}
                  />
                  <Space style={{ marginTop: 8 }}>
                    <Tag color="orange">Epic: {stats.unclaimed.epic}</Tag>
                    <Tag color="orange">Steam: {stats.unclaimed.steam}</Tag>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* ゲーム詳細モーダル */}
      <Modal
        title={
          <Space>
            {selectedGame && getPlatformIcon(selectedGame.platform)}
            <span>{selectedGame?.title}</span>
            {selectedGame && getStatusTag(selectedGame)}
          </Space>
        }
        open={gameDetailVisible}
        onCancel={() => setGameDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setGameDetailVisible(false)}>
            閉じる
          </Button>,
          selectedGame && (
            <Button
              key="store"
              type="primary"
              icon={<LinkOutlined />}
              loading={searchingEpicUrl === selectedGame.id}
              onClick={() => handleStoreButtonClick(selectedGame)}
            >
              ストアで見る
            </Button>
          )
        ].filter(Boolean)}
        width={700}
      >
        {selectedGame && (
          <div>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* ゲーム情報 */}
              <div>
                <Title level={4}>ゲーム情報</Title>
                <Space wrap>
                  <Tag color={selectedGame.platform === 'epic' ? 'default' : 'blue'}>
                    {selectedGame.platform === 'epic' ? 'Epic Games' : 'Steam'}
                  </Tag>
                  {selectedGame.is_claimed && (
                    <Tag color="success" icon={<CheckCircleOutlined />}>受け取り済み</Tag>
                  )}
                  {selectedGame.platform === 'steam' && selectedGame.app_id && (
                    <Tag>App ID: {selectedGame.app_id}</Tag>
                  )}
                </Space>
              </div>

              {/* 配布期間 */}
              {(selectedGame.start_date || selectedGame.end_date) && (
                <div>
                  <Title level={4}>配布期間</Title>
                  <Space direction="vertical">
                    {selectedGame.start_date && (
                      <Text>
                        <CalendarOutlined /> 開始日: {new Date(selectedGame.start_date).toLocaleDateString('ja-JP')}
                      </Text>
                    )}
                    {selectedGame.end_date && (
                      <Text>
                        <CalendarOutlined /> 終了日: {new Date(selectedGame.end_date).toLocaleDateString('ja-JP')}
                      </Text>
                    )}
                    {selectedGame.discovered_at && (
                      <Text type="secondary">
                        発見日: {new Date(selectedGame.discovered_at).toLocaleDateString('ja-JP')}
                      </Text>
                    )}
                  </Space>
                </div>
              )}

              {/* 説明文 */}
              {selectedGame.description && (
                <div>
                  <Title level={4}>説明</Title>
                  <div 
                    className="game-description-content"
                    style={{ 
                      maxHeight: '300px', 
                      overflowY: 'auto',
                      padding: '12px',
                      border: '1px solid var(--ant-color-border)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--ant-color-bg-container)',
                      color: 'var(--ant-color-text)'
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: selectedGame.description.replace(/\n/g, '<br>') 
                    }}
                  />
                </div>
              )}

              {/* 受け取り状況変更 */}
              <div>
                <Title level={4}>受け取り状況</Title>
                <Checkbox
                  checked={selectedGame.is_claimed}
                  onChange={() => {
                    toggleClaimedStatus(selectedGame.id, selectedGame.is_claimed);
                    setSelectedGame(prev => prev ? { ...prev, is_claimed: !prev.is_claimed } : null);
                  }}
                  disabled={selectedGame.status === 'expired'}
                >
                  このゲームを受け取り済みにする
                </Checkbox>
                {selectedGame.claimed_date && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                      受け取り日: {new Date(selectedGame.claimed_date).toLocaleDateString('ja-JP')}
                    </Text>
                  </div>
                )}
              </div>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FreeGames;