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
      name: 'React 19.1.0',
      license: 'MIT License',
      purpose: 'UIライブラリ、コンポーネント管理',
      source: 'React',
      url: 'https://reactjs.org/'
    },
    {
      name: 'React DOM 19.1.6',
      license: 'MIT License',
      purpose: 'ReactのDOM操作ライブラリ',
      source: 'React',
      url: 'https://reactjs.org/'
    },
    {
      name: 'Ant Design 5.26.2',
      license: 'MIT License',
      purpose: 'UIコンポーネントライブラリ、デザインシステム',
      source: 'Ant Design',
      url: 'https://ant.design/'
    },
    {
      name: '@ant-design/icons 6.0.0',
      license: 'MIT License',
      purpose: 'Ant Designアイコンライブラリ',
      source: 'Ant Design',
      url: 'https://ant.design/components/icon/'
    },
    {
      name: 'Recharts 2.12.7',
      license: 'MIT License',
      purpose: '価格推移グラフ・チャートコンポーネント',
      source: 'Recharts',
      url: 'https://recharts.org/'
    }
  ]

  const backendLibraries = [
    {
      name: 'Express.js 4.18.2',
      license: 'MIT License',
      purpose: 'Webサーバーフレームワーク',
      source: 'Express',
      url: 'https://expressjs.com/'
    },
    {
      name: 'better-sqlite3 9.2.2',
      license: 'MIT License',
      purpose: 'SQLiteデータベース操作',
      source: 'better-sqlite3',
      url: 'https://github.com/WiseLibs/better-sqlite3'
    },
    {
      name: 'node-cron 3.0.3',
      license: 'ISC License',
      purpose: 'スケジュール実行（価格監視）',
      source: 'node-cron',
      url: 'https://github.com/node-cron/node-cron'
    },
    {
      name: 'axios 1.6.2',
      license: 'MIT License',
      purpose: 'HTTP通信ライブラリ（API呼び出し）',
      source: 'Axios',
      url: 'https://axios-http.com/'
    },
    {
      name: 'winston 3.11.0',
      license: 'MIT License',
      purpose: 'ログ管理システム',
      source: 'Winston',
      url: 'https://github.com/winstonjs/winston'
    },
    {
      name: 'winston-daily-rotate-file 4.7.1',
      license: 'MIT License',
      purpose: '日次ログローテーション',
      source: 'Winston',
      url: 'https://github.com/winstonjs/winston-daily-rotate-file'
    },
    {
      name: 'cors 2.8.5',
      license: 'MIT License',
      purpose: 'CORS設定',
      source: 'Express',
      url: 'https://github.com/expressjs/cors'
    },
    {
      name: 'helmet 7.1.0',
      license: 'MIT License',
      purpose: 'セキュリティヘッダー設定',
      source: 'Helmet',
      url: 'https://helmetjs.github.io/'
    },
    {
      name: 'express-rate-limit 7.1.5',
      license: 'MIT License',
      purpose: 'APIレート制限',
      source: 'Express',
      url: 'https://github.com/express-rate-limit/express-rate-limit'
    },
    {
      name: 'dotenv 16.3.1',
      license: 'BSD-2-Clause License',
      purpose: '環境変数管理',
      source: 'dotenv',
      url: 'https://github.com/motdotla/dotenv'
    },
    {
      name: 'node-fetch 2.7.0',
      license: 'MIT License',
      purpose: 'Node.js用Fetchライブラリ',
      source: 'node-fetch',
      url: 'https://github.com/node-fetch/node-fetch'
    },
    {
      name: 'xml2js 0.6.2',
      license: 'MIT License',
      purpose: 'XML解析（RSS処理）',
      source: 'xml2js',
      url: 'https://github.com/Leonidas-from-XIV/node-xml2js'
    }
  ]

  const externalAPIs = [
    {
      name: 'IsThereAnyDeal API',
      license: '利用規約に準拠',
      purpose: 'ゲーム価格情報・歴代最安値データ取得',
      source: 'IsThereAnyDeal',
      url: 'https://isthereanydeal.com/',
      terms: 'https://isthereanydeal.com/about/'
    },
    {
      name: 'Steam Store API',
      license: 'Steam Web API Terms of Use',
      purpose: 'ゲーム詳細情報・価格情報取得',
      source: 'Steam Store',
      url: 'https://store.steampowered.com/',
      terms: 'https://steamcommunity.com/dev/apiterms'
    },
    {
      name: 'Steam CDN',
      license: 'Steamの利用規約に準拠',
      purpose: 'ゲームヘッダー画像の表示',
      source: 'Steam CDN',
      url: 'https://cdn.akamai.steamstatic.com/'
    },
    {
      name: 'SteamDB',
      license: 'リンク先サイトの利用規約に準拠',
      purpose: '外部リンク（ゲーム詳細情報参照用）',
      source: 'SteamDB',
      url: 'https://steamdb.info/'
    },
    {
      name: 'BackLoggd',
      license: 'リンク先サイトの利用規約に準拠',
      purpose: '外部リンク（ゲーム管理・レビューサイト）',
      source: 'BackLoggd',
      url: 'https://www.backloggd.com/'
    }
  ]

  const renderLibraryCard = (item: {
    name: string;
    license: string;
    purpose: string;
    source: string;
    url: string;
    terms?: string;
  }) => (
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
          <Text strong>開発元: </Text>
          <Link href={item.url} target="_blank" rel="noopener noreferrer">
            {item.source}
          </Link>
        </div>
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
          headStyle={{ borderBottom: '1px solid #91d5ff' }}
        >
          <Row gutter={[16, 16]}>
            {frontendLibraries.map((lib, index) => (
              <Col xs={24} md={12} lg={8} key={index}>
                {renderLibraryCard(lib)}
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
          headStyle={{ borderBottom: '1px solid #b7eb8f' }}
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
          headStyle={{ borderBottom: '1px solid #ffd591' }}
        >
          <Row gutter={[16, 16]}>
            {externalAPIs.map((api, index) => (
              <Col xs={24} md={12} key={index}>
                {renderLibraryCard(api)}
              </Col>
            ))}
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
          headStyle={{ borderBottom: '1px solid #d3adf7' }}
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
          headStyle={{ borderBottom: '1px solid #ffadd2' }}
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