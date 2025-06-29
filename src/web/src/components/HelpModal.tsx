import React from 'react'
import { Modal, Row, Col, Typography, Space, Divider, Card } from 'antd'
import { 
  QuestionCircleOutlined, 
  InfoCircleOutlined,
  BarChartOutlined,
  GiftOutlined,
  SettingOutlined,
  KeyOutlined,
  WalletOutlined,
  CommentOutlined,
  FileTextOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

interface HelpModalProps {
  show: boolean
  onHide: () => void
}

const HelpModal: React.FC<HelpModalProps> = ({ show, onHide }) => {
  const shortcuts = [
    {
      key: 'Ctrl/Cmd + R',
      description: 'ページリフレッシュ',
      section: '基本操作'
    },
    {
      key: 'Ctrl/Cmd + D',
      description: 'ダークモード切り替え',
      section: '基本操作'
    },
    {
      key: '?',
      description: 'このヘルプを表示',
      section: '基本操作'
    },
    {
      key: 'ESC',
      description: 'モーダルを閉じる',
      section: '基本操作'
    },
    {
      key: 'Ctrl/Cmd + 1',
      description: 'ダッシュボードに移動',
      section: 'ナビゲーション'
    },
    {
      key: 'Ctrl/Cmd + 2',
      description: 'ゲーム管理に移動',
      section: 'ナビゲーション'
    },
    {
      key: 'Ctrl/Cmd + 3',
      description: 'アラート履歴に移動',
      section: 'ナビゲーション'
    },
    {
      key: 'Ctrl/Cmd + 4',
      description: '監視状況に移動',
      section: 'ナビゲーション'
    },
    {
      key: 'Ctrl/Cmd + 5',
      description: 'Epic Gamesに移動',
      section: 'ナビゲーション'
    },
    {
      key: 'Ctrl/Cmd + 6',
      description: '設定に移動',
      section: 'ナビゲーション'
    }
  ]

  const features = [
    {
      title: 'ゲーム価格監視',
      description: 'Steamゲームの価格を定期的に監視し、セールや最安値更新を通知します。',
      icon: <BarChartOutlined style={{ color: '#1890ff' }} />
    },
    {
      title: '予算管理',
      description: '月間・年間の購入予算を設定し、支出状況を追跡・分析できます。',
      icon: <WalletOutlined style={{ color: '#52c41a' }} />
    },
    {
      title: 'Discord通知',
      description: '価格変動やセール情報をDiscordに自動通知します。',
      icon: <CommentOutlined style={{ color: '#722ed1' }} />
    },
    {
      title: 'Epic Games無料ゲーム',
      description: 'Epic Games Storeの無料ゲーム情報を取得し、受け取り状況を管理できます。',
      icon: <GiftOutlined style={{ color: '#fa8c16' }} />
    },
    {
      title: 'データ分析',
      description: 'ROI分析、価格トレンド、購入パターンの分析機能を提供します。',
      icon: <BarChartOutlined style={{ color: '#13c2c2' }} />
    },
    {
      title: 'レポート出力',
      description: 'CSV、JSON、PDF形式での包括的なレポート生成が可能です。',
      icon: <FileTextOutlined style={{ color: '#eb2f96' }} />
    }
  ]

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.section]) {
      acc[shortcut.section] = []
    }
    acc[shortcut.section].push(shortcut)
    return acc
  }, {} as Record<string, typeof shortcuts>)

  return (
    <Modal
      title={
        <Space>
          <QuestionCircleOutlined />
          SteamSentinel ヘルプ
        </Space>
      }
      open={show}
      onCancel={onHide}
      footer={null}
      width={800}
      style={{ top: 20 }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 機能説明 */}
        <div>
          <Title level={4}>
            <InfoCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            主要機能
          </Title>
          <Row gutter={[16, 16]}>
            {features.map((feature, index) => (
              <Col key={index} xs={24} md={12}>
                <Card size="small" hoverable>
                  <Space align="start">
                    {feature.icon}
                    <div>
                      <Text strong>{feature.title}</Text>
                      <Paragraph style={{ margin: 0, marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {feature.description}
                        </Text>
                      </Paragraph>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <Divider />

        {/* キーボードショートカット */}
        <div>
          <Title level={4}>
            <KeyOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            キーボードショートカット
          </Title>
          <Row gutter={[24, 16]}>
            {Object.entries(groupedShortcuts).map(([section, sectionShortcuts]) => (
              <Col key={section} xs={24} md={12}>
                <Card 
                  title={section} 
                  size="small"
                  headStyle={{ fontSize: 14 }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {sectionShortcuts.map((shortcut, index) => (
                      <Row key={index} justify="space-between" align="middle">
                        <Col>
                          <Text strong style={{ fontSize: 13 }}>
                            {shortcut.key}
                          </Text>
                        </Col>
                        <Col flex="auto" style={{ textAlign: 'right' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {shortcut.description}
                          </Text>
                        </Col>
                      </Row>
                    ))}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <Divider />

        {/* 使用方法 */}
        <div>
          <Title level={4}>
            <SettingOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
            使用方法
          </Title>
          <Card>
            <Space direction="vertical" size="middle">
              <div>
                <Text strong>1. ゲームの追加</Text>
                <Paragraph style={{ margin: 0, marginTop: 4 }}>
                  ゲーム管理ページで「ゲームを追加」ボタンをクリックし、Steam App IDまたはゲーム名を入力してください。
                </Paragraph>
              </div>
              <div>
                <Text strong>2. アラート設定</Text>
                <Paragraph style={{ margin: 0, marginTop: 4 }}>
                  各ゲームに対して価格閾値、割引率、セール開始時のアラート条件を設定できます。
                </Paragraph>
              </div>
              <div>
                <Text strong>3. Discord連携</Text>
                <Paragraph style={{ margin: 0, marginTop: 4 }}>
                  環境変数DISCORD_WEBHOOK_URLを設定することで、アラートをDiscordに自動送信できます。
                </Paragraph>
              </div>
              <div>
                <Text strong>4. 監視の開始</Text>
                <Paragraph style={{ margin: 0, marginTop: 4 }}>
                  システムは自動的に価格を監視します。手動での監視実行も可能です。
                </Paragraph>
              </div>
            </Space>
          </Card>
        </div>
      </Space>
    </Modal>
  )
}

export default HelpModal