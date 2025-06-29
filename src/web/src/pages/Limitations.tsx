import React from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Space, 
  Alert, 
  List
} from 'antd'
import { 
  WarningOutlined,
  LineChartOutlined,
  CloudOutlined,
  DatabaseOutlined,
  TeamOutlined,
  ControlOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  BlockOutlined,
  AimOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  QuestionCircleOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  SmileOutlined,
  CalendarOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

const Limitations: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <WarningOutlined 
            style={{ fontSize: '32px', color: '#faad14', marginRight: '16px' }} 
          />
          <div>
            <Title level={1} style={{ margin: 0 }}>制限事項・注意点</Title>
            <Text type="secondary">SteamSentinelの使用に関する重要な情報</Text>
          </div>
        </div>

        {/* 歴代最安値に関する制限 */}
        <Card 
          title={
            <Space>
              <LineChartOutlined style={{ color: '#fa8c16' }} />
              歴代最安値データの制限
            </Space>
          }
          headStyle={{ backgroundColor: '#fff7e6', borderBottom: '1px solid #ffd591' }}
        >
          <Alert
            type="warning"
            message="重要: SteamSentinelで表示される「歴代最安値」は、完全な履歴ではありません。"
            icon={<ExclamationCircleOutlined />}
            style={{ marginBottom: '24px' }}
            showIcon
          />
          
          <Title level={4}>データ保持期間の制限</Title>
          <List
            size="large"
            style={{ marginBottom: '24px' }}
            dataSource={[
              { icon: <CalendarOutlined style={{ color: '#1890ff' }} />, text: '約6ヶ月間のデータのみ利用可能' },
              { icon: <CalendarOutlined style={{ color: '#52c41a' }} />, text: '現在確認できる最古データ: 2024年12月頃' },
              { icon: <CalendarOutlined style={{ color: '#13c2c2' }} />, text: 'データは定期的に更新され、古いデータは削除される' }
            ]}
            renderItem={item => (
              <List.Item>
                <Space>
                  {item.icon}
                  <Text strong>{item.text}</Text>
                </Space>
              </List.Item>
            )}
          />

          <Title level={4}>データソースについて</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card size="small" style={{ height: '100%' }}>
                <Space direction="vertical">
                  <Title level={5}>
                    <DatabaseOutlined style={{ marginRight: 8 }} />
                    IsThereAnyDeal (ITAD)
                  </Title>
                  <List
                    size="small"
                    dataSource={[
                      'メインの価格データソース',
                      '2024年末にAPI v2に移行',
                      '古いデータが新形式に移行されていない',
                      '約6ヶ月間のデータのみ提供'
                    ]}
                    renderItem={item => <List.Item style={{ padding: '4px 0' }}>• {item}</List.Item>}
                  />
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card size="small" style={{ height: '100%' }}>
                <Space direction="vertical">
                  <Title level={5}>
                    <TeamOutlined style={{ marginRight: 8 }} />
                    Steam Store API
                  </Title>
                  <List
                    size="small"
                    dataSource={[
                      '現在価格の取得に使用',
                      'リアルタイムの価格情報',
                      '歴史データは提供されない',
                      'ゲームタイプ判別に使用'
                    ]}
                    renderItem={item => <List.Item style={{ padding: '4px 0' }}>• {item}</List.Item>}
                  />
                </Space>
              </Card>
            </Col>
          </Row>

          <Alert
            type="info"
            message="実用的な解釈"
            description="「歴代最安値」は「過去6ヶ月間の最安値」として理解してください。より古いセール（例：2024年以前）の価格は反映されていない可能性があります。"
            icon={<ExclamationCircleOutlined />}
            style={{ marginTop: '24px' }}
            showIcon
          />
        </Card>

        {/* API制限 */}
        <Card 
          title={
            <Space>
              <CloudOutlined style={{ color: '#1890ff' }} />
              API制限
            </Space>
          }
          headStyle={{ backgroundColor: '#f6ffff', borderBottom: '1px solid #91d5ff' }}
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Title level={4}>監視間隔の制限</Title>
              <List
                dataSource={[
                  '最短10分間隔（API制限のため）',
                  'デフォルト: 1時間間隔',
                  '大量のゲーム監視時は間隔を長めに設定推奨'
                ]}
                renderItem={item => <List.Item>• <Text strong>{item}</Text></List.Item>}
              />
            </Col>
            <Col xs={24} md={12}>
              <Title level={4}>同時接続制限</Title>
              <List
                dataSource={[
                  'API負荷軽減のため1接続ずつ処理',
                  '100ゲーム監視で約5分程度',
                  '処理中は他の操作を控えることを推奨'
                ]}
                renderItem={item => <List.Item>• <Text strong>{item}</Text></List.Item>}
              />
            </Col>
          </Row>
        </Card>

        {/* ゲームタイプ制限 */}
        <Card 
          title={
            <Space>
              <ControlOutlined style={{ color: '#722ed1' }} />
              対応ゲームの制限
            </Space>
          }
          headStyle={{ backgroundColor: '#f9f0ff', borderBottom: '1px solid #d3adf7' }}
        >
          <Title level={4}>監視が困難なゲーム</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card size="small" style={{ textAlign: 'center', height: '150px' }}>
                <Space direction="vertical">
                  <CloseCircleOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
                  <Title level={5}>販売終了ゲーム</Title>
                  <Text type="secondary">購入不可能</Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small" style={{ textAlign: 'center', height: '150px' }}>
                <Space direction="vertical">
                  <EnvironmentOutlined style={{ fontSize: '32px', color: '#faad14' }} />
                  <Title level={5}>地域制限ゲーム</Title>
                  <Text type="secondary">日本で販売されていない</Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small" style={{ textAlign: 'center', height: '150px' }}>
                <Space direction="vertical">
                  <BlockOutlined style={{ fontSize: '32px', color: '#13c2c2' }} />
                  <Title level={5}>特殊ゲームタイプ</Title>
                  <Text type="secondary">DLCやソフトウェアなど</Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* 精度に関する注意 */}
        <Card 
          title={
            <Space>
              <AimOutlined style={{ color: '#1890ff' }} />
              精度に関する注意
            </Space>
          }
          headStyle={{ backgroundColor: '#f6ffff', borderBottom: '1px solid #91d5ff' }}
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Title level={4}>価格データの精度</Title>
              <List
                dataSource={[
                  '為替レートの変動により誤差が生じる場合',
                  '地域別価格の違い',
                  'バンドル価格と単品価格の混在',
                  'セール終了直後の価格反映遅延'
                ]}
                renderItem={item => <List.Item>• {item}</List.Item>}
              />
            </Col>
            <Col xs={24} md={12}>
              <Title level={4}>通知の遅延</Title>
              <List
                dataSource={[
                  '最短10分〜最大監視間隔の遅延',
                  'API障害時の通知停止',
                  '手動更新による即座の確認を推奨'
                ]}
                renderItem={item => <List.Item>• {item}</List.Item>}
              />
            </Col>
          </Row>
        </Card>

        {/* データ取得エラー */}
        <Card 
          title={
            <Space>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
              データ取得エラーについて
            </Space>
          }
          headStyle={{ backgroundColor: '#fff2f0', borderBottom: '1px solid #ffccc7' }}
        >
          <Alert
            type="error"
            message="重要: 一部のゲームでは正確な価格データが取得できない場合があります。"
            icon={<WarningOutlined />}
            style={{ marginBottom: '24px' }}
            showIcon
          />
          
          <Title level={4}>エラーが発生しやすいゲーム</Title>
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} md={12}>
              <Card size="small">
                <Title level={5}>
                  <BlockOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  特殊なゲームタイプ
                </Title>
                <List
                  size="small"
                  dataSource={[
                    'DLC・アドオン類',
                    'ソフトウェア・ツール類',
                    '古いゲーム（データベース未登録）',
                    '地域限定販売ゲーム'
                  ]}
                  renderItem={item => <List.Item style={{ padding: '2px 0' }}>• {item}</List.Item>}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card size="small">
                <Title level={5}>
                  <CloudOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  API側の問題
                </Title>
                <List
                  size="small"
                  dataSource={[
                    'Steam App IDの誤認識',
                    '価格データベースの不整合',
                    'APIサーバーの一時的障害',
                    'レート制限による取得失敗'
                  ]}
                  renderItem={item => <List.Item style={{ padding: '2px 0' }}>• {item}</List.Item>}
                />
              </Card>
            </Col>
          </Row>

          <Title level={4}>間違ったデータの例</Title>
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} md={8}>
              <Card size="small" style={{ textAlign: 'center', height: '150px' }}>
                <Space direction="vertical">
                  <DollarOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
                  <Title level={5}>価格の誤表示</Title>
                  <Text type="secondary">¥0や異常に高い価格</Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small" style={{ textAlign: 'center', height: '150px' }}>
                <Space direction="vertical">
                  <LineChartOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
                  <Title level={5}>最安値の誤認</Title>
                  <Text type="secondary">実際より高い・低い価格</Text>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small" style={{ textAlign: 'center', height: '150px' }}>
                <Space direction="vertical">
                  <QuestionCircleOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
                  <Title level={5}>ゲーム名の不一致</Title>
                  <Text type="secondary">別ゲームのデータを取得</Text>
                </Space>
              </Card>
            </Col>
          </Row>

          <Alert
            type="warning"
            message="対処法"
            description={
              <List
                size="small"
                dataSource={[
                  '購入前には必ずSteamストアで価格を確認してください',
                  '異常な価格が表示された場合は手動更新を試してください',
                  'データ取得失敗が続く場合は、そのゲームの監視を一時停止することを推奨',
                  '複数の価格比較サイト（SteamDB、IsThereAnyDeal等）で確認することを強く推奨'
                ]}
                renderItem={item => <List.Item style={{ padding: '2px 0' }}>• <Text strong>{item}</Text></List.Item>}
              />
            }
            icon={<SafetyOutlined />}
            showIcon
          />
        </Card>

        {/* 推奨事項 */}
        <Card 
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              推奨使用方法
            </Space>
          }
          headStyle={{ backgroundColor: '#f6ffed', borderBottom: '1px solid #b7eb8f' }}
        >
          <Alert
            type="success"
            message="効果的な使用方法"
            icon={<SmileOutlined />}
            style={{ marginBottom: '24px' }}
            showIcon
          />
          
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Title level={4}>監視設定</Title>
              <List
                dataSource={[
                  { text: '監視ゲーム数を50-100タイトル以下に抑える', important: true },
                  { text: '監視間隔は1-2時間に設定', important: true },
                  { text: '不要なゲームは定期的に削除', important: false },
                  { text: '価格閾値を適切に設定', important: false }
                ]}
                renderItem={item => (
                  <List.Item>
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <Text strong={item.important}>{item.text}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Col>
            <Col xs={24} md={12}>
              <Title level={4}>価格判断</Title>
              <List
                dataSource={[
                  { text: '購入前に必ずSteamで確認', important: true },
                  { text: '歴代最安値は参考程度に活用', important: false },
                  { text: '複数のセール比較サイトを併用', important: false },
                  { text: 'セール期間の終了日時を確認', important: false },
                  { text: '異常な価格は疑って再確認', important: true },
                  { text: 'データ取得失敗ゲームは監視を一時停止', important: false }
                ]}
                renderItem={item => (
                  <List.Item>
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <Text strong={item.important}>{item.text}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Col>
          </Row>
        </Card>

        {/* 最終更新日 */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Text type="secondary">
            <CalendarOutlined style={{ marginRight: 4 }} />
            最終更新: 2025年6月27日
          </Text>
        </div>
      </Space>
    </div>
  )
}

export default Limitations