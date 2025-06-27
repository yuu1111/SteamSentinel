import React, { useState, useEffect } from 'react'

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

  if (!isVisible) return null

  return (
    <div className="loading-overlay">
      <div className="d-flex justify-content-center align-items-center h-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="mt-2">処理中...</div>
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay