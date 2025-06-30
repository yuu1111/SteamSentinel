import React from 'react'
import { Space, Button, Typography, theme, Flex } from 'antd'
import { 
  HomeOutlined, 
  AppstoreOutlined, 
  BellOutlined, 
  LineChartOutlined, 
  GiftOutlined, 
  ExperimentOutlined,
  SettingOutlined,
  SafetyOutlined,
  QuestionCircleOutlined,
  SunOutlined,
  MoonOutlined
} from '@ant-design/icons'
import { ViewType } from '../types'

interface NavigationProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
}

const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
  isDarkMode,
  onToggleDarkMode
}) => {
  const { token } = theme.useToken()
  
  const navItems = [
    { key: 'dashboard', label: 'ダッシュボード', icon: <HomeOutlined /> },
    { key: 'games', label: 'ゲーム管理', icon: <AppstoreOutlined /> },
    { key: 'alerts', label: 'アラート履歴', icon: <BellOutlined /> },
    { key: 'monitoring', label: '監視状況', icon: <LineChartOutlined /> },
    { key: 'epic', label: 'Epic Games', icon: <GiftOutlined /> },
    { key: 'settings', label: '設定', icon: <SettingOutlined /> },
    { key: 'test', label: 'テスト', icon: <ExperimentOutlined /> },
  ]


  return (
    <div style={{ 
      background: token.colorPrimary,
      padding: '0 16px', // パディングを削減
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      minHeight: 72 // 高さを増加
    }}>
      <Flex justify="space-between" align="center" gap={16} style={{ height: 72 }}>
        {/* Brand */}
        <Flex 
          align="center" 
          gap={8}
          style={{ cursor: 'pointer' }}
          onClick={() => onViewChange('dashboard')}
        >
          <SafetyOutlined style={{ color: 'white', fontSize: 20 }} />
          <Typography.Text 
            strong 
            style={{ 
              color: 'white', 
              fontSize: 18, // 20→18に戻す
              margin: 0,
              display: window.innerWidth >= 768 ? 'block' : 'none', // タブレット以上で表示
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            SteamSentinel
          </Typography.Text>
        </Flex>

        {/* Navigation Menu */}
        <div style={{ flex: 1, marginLeft: 24, marginRight: 24, display: 'flex', alignItems: 'center' }}>
          {navItems.map(item => (
            <Button
              key={item.key}
              type={currentView === item.key ? "primary" : "text"}
              icon={item.icon}
              onClick={() => onViewChange(item.key as ViewType)}
              style={{
                color: currentView === item.key ? undefined : 'white',
                marginRight: 16,
                height: 48,
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {/* Action Buttons */}
        <Space>
          <Button
            type="text"
            icon={<QuestionCircleOutlined />}
            style={{ color: 'white' }}
            onClick={() => {
              const event = new CustomEvent('showHelpModal')
              window.dispatchEvent(event)
            }}
            title="ヘルプ"
          />
          <Button
            type="text"
            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
            style={{ color: 'white' }}
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          />
        </Space>
      </Flex>
    </div>
  )
}

export default Navigation