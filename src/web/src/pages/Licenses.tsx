import React from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Space, 
  Alert, 
  List,
  Divider,
  Tag,
  Button
} from 'antd'
import { 
  FileTextOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  CloudOutlined,
  SafetyOutlined,
  HeartOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  LinkOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph, Link } = Typography

const Licenses: React.FC = () => {
  const frontendLibraries = [
    {
      name: 'Bootstrap 5.3.0',
      license: 'MIT License',
      purpose: 'UIフレームワーク、レスポンシブデザイン',
      source: 'Bootstrap',
      url: 'https://getbootstrap.com/',
      cdn: 'jsDelivr'
    },
    {
      name: 'Bootstrap Icons 1.10.0',
      license: 'MIT License',
      purpose: 'アイコンフォント',
      source: 'Bootstrap Icons',
      url: 'https://icons.getbootstrap.com/',
      cdn: 'jsDelivr'
    },
    {
      name: 'Chart.js 4.4.0',
      license: 'MIT License',
      purpose: '価格推移グラフの描画',
      source: 'Chart.js',
      url: 'https://www.chartjs.org/',
      cdn: 'jsDelivr'
    },
    {
      name: 'React 18',
      license: 'MIT License',
      purpose: 'UIライブラリ、コンポーネント管理',
      source: 'React',
      url: 'https://reactjs.org/',
      cdn: 'npm'
    },
    {
      name: 'Ant Design 5.26.2',
      license: 'MIT License',
      purpose: 'UIコンポーネントライブラリ、デザインシステム',
      source: 'Ant Design',
      url: 'https://ant.design/',
      cdn: 'npm'
    }
  ]

  const backendLibraries = [
    {
      name: 'Express.js',
      license: 'MIT License',
      purpose: 'Webサーバーフレームワーク',
      source: 'Express',
      url: 'https://expressjs.com/'
    },
    {
      name: 'better-sqlite3',
      license: 'MIT License',
      purpose: 'SQLiteデータベース操作',
      source: 'better-sqlite3',
      url: 'https://github.com/WiseLibs/better-sqlite3'
    },
    {
      name: 'node-cron',
      license: 'ISC License',
      purpose: 'スケジュール実行',
      source: 'node-cron',
      url: 'https://github.com/node-cron/node-cron'
    },
    {
      name: 'axios',
      license: 'MIT License',
      purpose: 'HTTP通信ライブラリ',
      source: 'Axios',
      url: 'https://axios-http.com/'
    },
    {
      name: 'winston',
      license: 'MIT License',
      purpose: 'ログ管理システム',
      source: 'Winston',
      url: 'https://github.com/winstonjs/winston'
    },
    {
      name: 'dotenv',
      license: 'BSD-2-Clause License',
      purpose: '環境変数管理',
      source: 'dotenv',
      url: 'https://github.com/motdotla/dotenv'
    }
  ]

  const externalAPIs = [
    {
      name: 'IsThereAnyDeal API',
      license: '利用規約に準拠',
      purpose: 'ゲーム価格情報・歴代最安値データ取得',
      source: 'IsThereAnyDeal',
      url: 'https://isthereanydeal.com/',
      terms: 'https://isthereanydeal.com/about/',
      cost: '無料（APIキー必要）'
    },
    {
      name: 'Steam Store API',
      license: 'Steam Web API Terms of Use',
      purpose: 'ゲーム詳細情報・価格情報取得',
      source: 'Steam Store',
      url: 'https://store.steampowered.com/',
      terms: 'https://steamcommunity.com/dev/apiterms',
      cost: '無料（制限あり）'
    },
    {
      name: 'Steam CDN',
      license: 'Steamの利用規約に準拠',
      purpose: 'ゲームヘッダー画像の表示',
      source: 'Steam CDN',
      url: 'https://cdn.akamai.steamstatic.com/',
      cost: '無料'
    },
    {
      name: 'SteamDB',
      license: 'リンク先サイトの利用規約に準拠',
      purpose: '外部リンク（ゲーム詳細情報参照用）',
      source: 'SteamDB',
      url: 'https://steamdb.info/',
      cost: '無料'
    }
  ]

  const renderLibraryCard = (item: any, showCDN: boolean = false) => (
    <Card size="small" style={{ height: '100%' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={5} style={{ margin: 0 }}>{item.name}</Title>
        <div>
          <Text strong>ライセンス: </Text>
          <Tag color="blue">{item.license}</Tag>
        </div>
        <div>
          <Text strong>用途: </Text>
          <Text>{item.purpose}</Text>
        </div>
        <div>
          <Text strong>配布元: </Text>
          <Link href={item.url} target="_blank" rel="noopener noreferrer">
            {item.source}
          </Link>
        </div>
        {showCDN && item.cdn && (
          <div>
            <Text strong>CDN: </Text>
            <Text>{item.cdn}</Text>
          </div>
        )}
        {item.cost && (
          <div>
            <Text strong>料金: </Text>
            <Tag color="green">{item.cost}</Tag>
          </div>
        )}
        {item.terms && (
          <div>
            <Button 
              type="link" 
              size="small" 
              icon={<LinkOutlined />}
              href={item.terms}
              target="_blank"
              rel="noopener noreferrer"
            >
              利用規約
            </Button>
          </div>
        )}
      </Space>
    </Card>
  )

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={1}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            ライセンス情報
          </Title>
          <Paragraph style={{ fontSize: '16px' }}>
            SteamSentinelで使用しているサードパーティライブラリ・サービスのライセンス情報です。
          </Paragraph>
        </div>

        <Divider />

        {/* Frontend Libraries */}
        <Card 
          title={
            <Space>
              <GlobalOutlined style={{ color: '#1890ff' }} />
              フロントエンドライブラリ
            </Space>
          }
          headStyle={{ backgroundColor: '#f6ffff', borderBottom: '1px solid #91d5ff' }}
        >
          <Row gutter={[16, 16]}>
            {frontendLibraries.map((lib, index) => (
              <Col xs={24} md={12} lg={8} key={index}>
                {renderLibraryCard(lib, true)}
              </Col>
            ))}
          </Row>
        </Card>

        {/* Backend Libraries */}
        <Card 
          title={
            <Space>
              <DatabaseOutlined style={{ color: '#52c41a' }} />
              バックエンドライブラリ (Node.js)
            </Space>
          }
          headStyle={{ backgroundColor: '#f6ffed', borderBottom: '1px solid #b7eb8f' }}
        >
          <Row gutter={[16, 16]}>
            {backendLibraries.map((lib, index) => (
              <Col xs={24} md={12} lg={8} key={index}>
                {renderLibraryCard(lib)}
              </Col>
            ))}
          </Row>
        </Card>

        {/* External APIs */}
        <Card 
          title={
            <Space>
              <CloudOutlined style={{ color: '#fa8c16' }} />
              外部API・サービス
            </Space>
          }
          headStyle={{ backgroundColor: '#fff7e6', borderBottom: '1px solid #ffd591' }}
        >
          <Row gutter={[16, 16]}>
            {externalAPIs.map((api, index) => (
              <Col xs={24} md={12} key={index}>
                {renderLibraryCard(api)}
              </Col>
            ))}
          </Row>
        </Card>

        {/* CDN Services */}
        <Card 
          title={
            <Space>
              <GlobalOutlined style={{ color: '#13c2c2' }} />
              CDNサービス
            </Space>
          }
          headStyle={{ backgroundColor: '#e6fffb', borderBottom: '1px solid #87e8de' }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Title level={5} style={{ margin: 0 }}>jsDelivr CDN</Title>
                  <div>
                    <Text strong>利用規約: </Text>
                    <Link href="https://www.jsdelivr.com/terms" target="_blank" rel="noopener noreferrer">
                      jsDelivr Terms of Service
                    </Link>
                  </div>
                  <div>
                    <Text strong>用途: </Text>
                    <Text>フロントエンドライブラリの配信</Text>
                  </div>
                  <div>
                    <Text strong>サービス提供元: </Text>
                    <Link href="https://www.jsdelivr.com/" target="_blank" rel="noopener noreferrer">
                      jsDelivr
                    </Link>
                  </div>
                  <div>
                    <Text strong>料金: </Text>
                    <Tag color="green">無料</Tag>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* License Notices */}
        <Card 
          title={
            <Space>
              <SafetyOutlined style={{ color: '#722ed1' }} />
              ライセンス表記
            </Space>
          }
          headStyle={{ backgroundColor: '#f9f0ff', borderBottom: '1px solid #d3adf7' }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              type="info"
              message="MIT License について"
              description={
                <div>
                  <Paragraph>多くのライブラリで使用されているMIT Licenseは、以下の条件で自由に利用できます：</Paragraph>
                  <List
                    size="small"
                    dataSource={[
                      '著作権表示と許可表示を保持すること',
                      'ソフトウェアは「現状のまま」提供され、保証はありません',
                      '商用・非商用問わず自由に使用・修正・配布可能'
                    ]}
                    renderItem={item => <List.Item>• {item}</List.Item>}
                  />
                  <Paragraph style={{ marginTop: 16 }}>詳細は各ライブラリのライセンスファイルをご確認ください。</Paragraph>
                </div>
              }
              icon={<InfoCircleOutlined />}
              showIcon
            />
            
            <Alert
              type="warning"
              message="外部API利用について"
              description="外部APIサービスについては、各サービス提供者の利用規約に従って使用しています。これらのサービスの利用制限や変更により、SteamSentinelの機能に影響が出る可能性があります。"
              icon={<WarningOutlined />}
              showIcon
            />
          </Space>
        </Card>

        {/* Attribution */}
        <Card 
          title={
            <Space>
              <HeartOutlined style={{ color: '#eb2f96' }} />
              謝辞
            </Space>
          }
          headStyle={{ backgroundColor: '#fff0f6', borderBottom: '1px solid #ffadd2' }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Paragraph style={{ fontSize: '16px' }}>
              SteamSentinelの開発にあたり、多くのオープンソースプロジェクトとサービス提供者の皆様にお世話になっております。
              これらの素晴らしいライブラリ・サービスなしには、本プロジェクトは実現できませんでした。
              開発者・提供者の皆様に心より感謝いたします。
            </Paragraph>
            
            <div>
              <Title level={4}>特別な感謝</Title>
              <List
                dataSource={[
                  { name: 'IsThereAnyDeal', description: '包括的なゲーム価格データの提供' },
                  { name: 'Steam', description: 'ゲーム情報・画像データの提供' },
                  { name: 'Bootstrap', description: '美しく使いやすいUIコンポーネント' },
                  { name: 'Ant Design', description: '現代的で包括的なUIコンポーネントライブラリ' },
                  { name: 'React', description: '効率的なUIコンポーネント開発環境' },
                  { name: 'Node.js', description: '安定したサーバーサイドJavaScript環境' }
                ]}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Text strong>{item.name}</Text>}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  )
}

export default Licenses