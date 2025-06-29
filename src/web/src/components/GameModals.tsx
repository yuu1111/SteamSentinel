import React, { useState, useEffect } from 'react'
import { Game } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'

interface AddGameModalProps {
  show: boolean
  onHide: () => void
  onGameAdded: () => void
}

export const AddGameModal: React.FC<AddGameModalProps> = ({ show, onHide, onGameAdded }) => {
  const [formData, setFormData] = useState({
    steamAppId: '',
    gameName: '',
    thresholdType: 'price' as 'price' | 'discount' | 'any_sale',
    priceThreshold: '',
    discountThreshold: '',
    gameEnabled: true,
    alertEnabled: true
  })
  const [loading, setLoading] = useState(false)
  const { showError, showSuccess } = useAlert()

  const resetForm = () => {
    setFormData({
      steamAppId: '',
      gameName: '',
      thresholdType: 'price',
      priceThreshold: '',
      discountThreshold: '',
      gameEnabled: true,
      alertEnabled: true
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const steamAppId = parseInt(formData.steamAppId)
    const gameName = formData.gameName.trim()
    
    if (isNaN(steamAppId) || steamAppId <= 0) {
      showError('有効なSteam App IDを入力してください')
      return
    }
    
    // ゲーム名は空でもOK（バックエンドでSteam APIから取得）
    // if (!gameName) {
    //   showError('ゲーム名は必須です')
    //   return
    // }

    if (formData.thresholdType === 'price' && formData.priceThreshold && parseFloat(formData.priceThreshold) <= 0) {
      showError('価格閾値は0より大きい値を入力してください')
      return
    }

    if (formData.thresholdType === 'discount' && formData.discountThreshold) {
      const discount = parseInt(formData.discountThreshold)
      if (discount < 1 || discount > 99) {
        showError('割引率は1-99の範囲で入力してください')
        return
      }
    }

    try {
      setLoading(true)
      
      const response = await api.post('/games', {
        steam_app_id: steamAppId,
        name: gameName,
        price_threshold: formData.thresholdType === 'price' ? parseFloat(formData.priceThreshold) || null : null,
        price_threshold_type: formData.thresholdType,
        discount_threshold_percent: formData.thresholdType === 'discount' ? parseInt(formData.discountThreshold) || null : null,
        enabled: formData.gameEnabled,
        alert_enabled: formData.alertEnabled
      })

      if (response.success) {
        const message = response.message || `${gameName} を追加しました`
        showSuccess(message)
        resetForm()
        onHide()
        onGameAdded()
      } else {
        showError('ゲームの追加に失敗しました: ' + response.error)
      }
    } catch {
      showError('ゲームの追加中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (show) {
      resetForm()
    }
  }, [show])

  if (!show) {return null}

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">ゲーム追加</h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="steamAppId" className="form-label">Steam App ID *</label>
                <input
                  type="number"
                  className="form-control"
                  id="steamAppId"
                  value={formData.steamAppId}
                  onChange={(e) => setFormData(prev => ({ ...prev, steamAppId: e.target.value }))}
                  required
                />
                <div className="form-text">
                  SteamのストアページURLから取得できます<br />
                  例: https://store.steampowered.com/app/730/ → 730
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="gameName" className="form-label">ゲーム名</label>
                <input
                  type="text"
                  className="form-control"
                  id="gameName"
                  value={formData.gameName}
                  onChange={(e) => setFormData(prev => ({ ...prev, gameName: e.target.value }))}
                  placeholder="空欄の場合、Steamから自動取得されます"
                />
                <div className="form-text">
                  空欄にすると、Steam APIからゲーム名を自動取得します
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">アラート条件</label>
                <div className="mb-2">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="thresholdType"
                      id="thresholdTypePrice"
                      value="price"
                      checked={formData.thresholdType === 'price'}
                      onChange={(e) => setFormData(prev => ({ ...prev, thresholdType: e.target.value as any }))}
                    />
                    <label className="form-check-label" htmlFor="thresholdTypePrice">
                      価格閾値 - 指定した金額以下になったら通知
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="thresholdType"
                      id="thresholdTypeDiscount"
                      value="discount"
                      checked={formData.thresholdType === 'discount'}
                      onChange={(e) => setFormData(prev => ({ ...prev, thresholdType: e.target.value as any }))}
                    />
                    <label className="form-check-label" htmlFor="thresholdTypeDiscount">
                      割引率閾値 - 指定した割引率以上になったら通知
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="thresholdType"
                      id="thresholdTypeAnySale"
                      value="any_sale"
                      checked={formData.thresholdType === 'any_sale'}
                      onChange={(e) => setFormData(prev => ({ ...prev, thresholdType: e.target.value as any }))}
                    />
                    <label className="form-check-label" htmlFor="thresholdTypeAnySale">
                      セール開始 - 1円でも安くなったら通知
                    </label>
                  </div>
                </div>

                {formData.thresholdType === 'price' && (
                  <div className="mb-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="例: 2000"
                      min="0"
                      step="0.01"
                      value={formData.priceThreshold}
                      onChange={(e) => setFormData(prev => ({ ...prev, priceThreshold: e.target.value }))}
                    />
                    <div className="form-text">この金額以下になったときにアラートを送信</div>
                  </div>
                )}

                {formData.thresholdType === 'discount' && (
                  <div className="mb-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="例: 50"
                      min="1"
                      max="99"
                      step="1"
                      value={formData.discountThreshold}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountThreshold: e.target.value }))}
                    />
                    <div className="form-text">この割引率以上になったときにアラートを送信（%）</div>
                  </div>
                )}
              </div>

              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="gameEnabled"
                  checked={formData.gameEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, gameEnabled: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="gameEnabled">
                  監視を有効にする
                </label>
              </div>

              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="alertEnabled"
                  checked={formData.alertEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, alertEnabled: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="alertEnabled">
                  アラートを有効にする
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onHide}>キャンセル</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '追加中...' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

interface EditGameModalProps {
  show: boolean
  game: Game | null
  onHide: () => void
  onGameUpdated: () => void
}

export const EditGameModal: React.FC<EditGameModalProps> = ({ show, game, onHide, onGameUpdated }) => {
  const [formData, setFormData] = useState({
    gameName: '',
    thresholdType: 'price' as 'price' | 'discount' | 'any_sale',
    priceThreshold: '',
    discountThreshold: '',
    gameEnabled: true,
    alertEnabled: true,
    manualHistoricalLow: '',
    isPurchased: false,
    purchasePrice: '',
    purchaseDate: ''
  })
  const [loading, setLoading] = useState(false)
  const { showError, showSuccess } = useAlert()

  useEffect(() => {
    if (show && game) {
      setFormData({
        gameName: game.name || '',
        thresholdType: game.price_threshold_type || 'price',
        priceThreshold: game.price_threshold?.toString() || '',
        discountThreshold: game.discount_threshold_percent?.toString() || '',
        gameEnabled: Boolean(game.enabled),
        alertEnabled: Boolean(game.alert_enabled),
        manualHistoricalLow: game.manual_historical_low?.toString() || '',
        isPurchased: Boolean(game.is_purchased),
        purchasePrice: game.purchase_price?.toString() || '',
        purchaseDate: game.purchase_date ? new Date(game.purchase_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      })
    }
  }, [show, game])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!game) {return}

    const gameName = formData.gameName.trim()
    
    if (!gameName) {
      showError('ゲーム名は必須です')
      return
    }

    if (formData.thresholdType === 'price' && formData.priceThreshold && parseFloat(formData.priceThreshold) <= 0) {
      showError('価格閾値は0より大きい値を入力してください')
      return
    }

    if (formData.thresholdType === 'discount' && formData.discountThreshold) {
      const discount = parseInt(formData.discountThreshold)
      if (discount < 1 || discount > 99) {
        showError('割引率は1-99の範囲で入力してください')
        return
      }
    }

    try {
      setLoading(true)
      
      const response = await api.put(`/games/${game.id}`, {
        name: gameName,
        price_threshold: formData.thresholdType === 'price' ? parseFloat(formData.priceThreshold) || null : null,
        price_threshold_type: formData.thresholdType,
        discount_threshold_percent: formData.thresholdType === 'discount' ? parseInt(formData.discountThreshold) || null : null,
        enabled: formData.gameEnabled,
        alert_enabled: formData.alertEnabled,
        manual_historical_low: parseFloat(formData.manualHistoricalLow) || null,
        is_purchased: formData.isPurchased,
        purchase_price: formData.isPurchased ? parseFloat(formData.purchasePrice) || null : null,
        purchase_date: formData.isPurchased ? formData.purchaseDate || null : null
      })

      if (response.success) {
        showSuccess(`${gameName} の設定を更新しました`)
        onHide()
        onGameUpdated()
      } else {
        showError('ゲーム設定の更新に失敗しました: ' + response.error)
      }
    } catch {
      showError('ゲーム設定の保存中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (!show || !game) {return null}

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">ゲーム設定を編集</h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="editSteamAppId" className="form-label">Steam App ID</label>
                <input
                  type="number"
                  className="form-control"
                  id="editSteamAppId"
                  value={game.steam_app_id}
                  readOnly
                />
                <div className="form-text">Steam App IDは変更できません</div>
              </div>

              <div className="mb-3">
                <label htmlFor="editGameName" className="form-label">ゲーム名 *</label>
                <input
                  type="text"
                  className="form-control"
                  id="editGameName"
                  value={formData.gameName}
                  onChange={(e) => setFormData(prev => ({ ...prev, gameName: e.target.value }))}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">アラート条件</label>
                <div className="mb-2">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="editThresholdType"
                      id="editThresholdTypePrice"
                      value="price"
                      checked={formData.thresholdType === 'price'}
                      onChange={(e) => setFormData(prev => ({ ...prev, thresholdType: e.target.value as any }))}
                    />
                    <label className="form-check-label" htmlFor="editThresholdTypePrice">
                      価格閾値 - 指定した金額以下になったら通知
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="editThresholdType"
                      id="editThresholdTypeDiscount"
                      value="discount"
                      checked={formData.thresholdType === 'discount'}
                      onChange={(e) => setFormData(prev => ({ ...prev, thresholdType: e.target.value as any }))}
                    />
                    <label className="form-check-label" htmlFor="editThresholdTypeDiscount">
                      割引率閾値 - 指定した割引率以上になったら通知
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="editThresholdType"
                      id="editThresholdTypeAnySale"
                      value="any_sale"
                      checked={formData.thresholdType === 'any_sale'}
                      onChange={(e) => setFormData(prev => ({ ...prev, thresholdType: e.target.value as any }))}
                    />
                    <label className="form-check-label" htmlFor="editThresholdTypeAnySale">
                      セール開始 - 1円でも安くなったら通知
                    </label>
                  </div>
                </div>

                {formData.thresholdType === 'price' && (
                  <div className="mb-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="例: 2000"
                      min="0"
                      step="0.01"
                      value={formData.priceThreshold}
                      onChange={(e) => setFormData(prev => ({ ...prev, priceThreshold: e.target.value }))}
                    />
                    <div className="form-text">この金額以下になったときにアラートを送信</div>
                  </div>
                )}

                {formData.thresholdType === 'discount' && (
                  <div className="mb-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="例: 50"
                      min="1"
                      max="99"
                      step="1"
                      value={formData.discountThreshold}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountThreshold: e.target.value }))}
                    />
                    <div className="form-text">この割引率以上になったときにアラートを送信（%）</div>
                  </div>
                )}
              </div>

              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="editGameEnabled"
                  checked={formData.gameEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, gameEnabled: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="editGameEnabled">
                  監視を有効にする
                </label>
              </div>

              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="editAlertEnabled"
                  checked={formData.alertEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, alertEnabled: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="editAlertEnabled">
                  アラートを有効にする
                </label>
              </div>

              <hr />
              <h6><i className="bi bi-sliders me-2"></i>手動設定</h6>
              <div className="mb-3">
                <label htmlFor="editManualHistoricalLow" className="form-label">手動最安値</label>
                <input
                  type="number"
                  className="form-control"
                  id="editManualHistoricalLow"
                  placeholder="例: 1000"
                  min="0"
                  step="0.01"
                  value={formData.manualHistoricalLow}
                  onChange={(e) => setFormData(prev => ({ ...prev, manualHistoricalLow: e.target.value }))}
                />
                <div className="form-text">APIの最安値より優先される手動設定の最安値</div>
              </div>

              <hr />
              <h6><i className="bi bi-cart-check me-2"></i>購入情報</h6>
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="editIsPurchased"
                  checked={formData.isPurchased}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPurchased: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="editIsPurchased">
                  購入済みとしてマーク
                </label>
              </div>

              {formData.isPurchased && (
                <>
                  <div className="mb-3">
                    <label htmlFor="editPurchasePrice" className="form-label">購入価格</label>
                    <input
                      type="number"
                      className="form-control"
                      id="editPurchasePrice"
                      placeholder="例: 2000"
                      min="0"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
                    />
                    <div className="form-text">実際に購入した価格（円）</div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="editPurchaseDate" className="form-label">購入日</label>
                    <input
                      type="date"
                      className="form-control"
                      id="editPurchaseDate"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                    />
                    <div className="form-text">ゲームを購入した日付</div>
                  </div>
                </>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onHide}>キャンセル</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}