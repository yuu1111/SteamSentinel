import React, { useState, useEffect } from 'react'
import { Spin, Typography } from 'antd'

const LoadingOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const showLoading = () => setIsVisible(true)
    const hideLoading = () => setIsVisible(false)

    // グローバル関数として設定
    ;(window as any).showLoading = showLoading
    ;(window as any).hideLoading = hideLoading

    return () => {
      delete (window as any).showLoading
      delete (window as any).hideLoading
    }
  }, [])

  if (!isVisible) {return null}

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <Spin size="large" />
        <Typography.Text 
          style={{ 
            display: 'block', 
            marginTop: 16, 
            color: 'white' 
          }}
        >
          処理中...
        </Typography.Text>
      </div>
    </div>
  )
}

export default LoadingOverlay