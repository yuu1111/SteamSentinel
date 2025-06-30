import React, { useState } from 'react'
import { Card, Tabs, Typography, Row, Col, Spin, Alert } from 'antd'
import { SettingOutlined, FilterOutlined, BellOutlined, DatabaseOutlined, ApiOutlined } from '@ant-design/icons'
import { ITADSettings } from '../components/ITADSettings'

const { Title } = Typography

const Settings: React.FC = () => {
  const [loading] = useState(false)

  const tabItems = [
    {
      key: 'itad',
      label: (
        <span>
          <FilterOutlined />
          高割引ゲーム検知
        </span>
      ),
      children: (
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <ITADSettings />
          </Col>
        </Row>
      )
    },
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined />
          通知設定
        </span>
      ),
      children: (
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card
              title="Discord通知設定"
              loading={loading}
            >
              <Alert
                message="通知設定"
                description="Discord通知の詳細設定は今後実装予定です。現在は高割引ゲーム検知設定でDiscord通知の有効/無効を切り替えできます。"
                type="info"
                showIcon
              />
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'monitoring',
      label: (
        <span>
          <DatabaseOutlined />
          監視設定
        </span>
      ),
      children: (
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card
              title="価格監視設定"
              loading={loading}
            >
              <Alert
                message="監視設定"
                description="価格監視の間隔やタイムアウト設定は今後実装予定です。現在は自動で1時間間隔で監視が実行されます。"
                type="info"
                showIcon
              />
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'api',
      label: (
        <span>
          <ApiOutlined />
          API設定
        </span>
      ),
      children: (
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card
              title="外部API設定"
              loading={loading}
            >
              <Alert
                message="API設定"
                description="Steam API、ITAD API、Discord Webhook URLなどの外部API設定は環境変数で管理されています。設定変更は.envファイルを編集してください。"
                type="info"
                showIcon
              />
            </Card>
          </Col>
        </Row>
      )
    }
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
        <Typography.Text style={{ display: 'block', marginTop: 16, color: '#666' }}>
          設定を読み込み中...
        </Typography.Text>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={2}>
            <SettingOutlined style={{ marginRight: 8 }} />
            システム設定
          </Title>
        </Col>
        
        <Col span={24}>
          <Card>
            <Tabs
              defaultActiveKey="itad"
              items={tabItems}
              size="large"
              type="card"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Settings