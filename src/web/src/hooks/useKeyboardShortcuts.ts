import { useEffect } from 'react'
import { ViewType } from '../types'

interface UseKeyboardShortcutsProps {
  onViewChange: (view: ViewType) => void
  onToggleDarkMode: () => void
  onRefresh: () => void
  onShowAddModal: () => void
}

export const useKeyboardShortcuts = ({
  onViewChange,
  onToggleDarkMode,
  onRefresh,
  onShowAddModal
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // モーダルが開いている場合はESCキーのみ処理
      const openModals = document.querySelectorAll('.modal.show')
      if (openModals.length > 0) {
        if (event.key === 'Escape') {
          // Bootstrapのモーダルクローズイベントを発火
          openModals.forEach(modal => {
            const closeButton = modal.querySelector('.btn-close') as HTMLButtonElement
            if (closeButton) {
              closeButton.click()
            }
          })
        }
        return
      }

      // フォーカスされた入力要素がある場合はスキップ
      const activeElement = document.activeElement
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.tagName === 'SELECT' ||
        (activeElement as any).contentEditable === 'true'
      )) {
        return
      }

      // Ctrl/Cmd + キーの組み合わせ
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'r':
            event.preventDefault()
            onRefresh()
            break
          case 'a':
            event.preventDefault()
            onShowAddModal()
            break
          case 'd':
            event.preventDefault()
            onToggleDarkMode()
            break
          case '1':
            event.preventDefault()
            onViewChange('dashboard')
            break
          case '2':
            event.preventDefault()
            onViewChange('games')
            break
          case '3':
            event.preventDefault()
            onViewChange('alerts')
            break
          case '4':
            event.preventDefault()
            onViewChange('monitoring')
            break
          case '5':
            event.preventDefault()
            onViewChange('settings')
            break
        }
      }

      // 単体キー
      switch (event.key) {
        case 'Escape':
          // その他のESCキー処理があればここに追加
          break
        case '?':
          // ヘルプモーダルを表示（将来的に実装）
          event.preventDefault()
          showKeyboardShortcutsHelp()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onViewChange, onToggleDarkMode, onRefresh, onShowAddModal])
}

const showKeyboardShortcutsHelp = () => {
  // TODO: 将来的にはモーダルでキーボードショートカットを表示
  // 現在は機能を無効化
  // Keyboard shortcuts help requested - feature will be implemented with modal UI
}