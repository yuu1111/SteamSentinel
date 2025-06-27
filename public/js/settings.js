// 設定・テスト画面用JavaScript

// 設定画面初期化
async function initSettingsPage() {
    await loadDiscordStatus();
    await loadSystemInfo();
    await loadGameListForTest();
    initPriceAlertTestForm();
}

// 稼働時間をフォーマット
function formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) {
        return `${days}日 ${hours}時間 ${minutes}分`;
    } else if (hours > 0) {
        return `${hours}時間 ${minutes}分`;
    } else {
        return `${minutes}分`;
    }
}

// Discord設定状況を読み込み
async function loadDiscordStatus() {
    try {
        const response = await fetch('/api/discord/status');
        const data = await response.json();
        
        const statusElement = document.getElementById('discordStatus');
        if (!statusElement) return;
        
        if (data.success && data.enabled) {
            statusElement.innerHTML = `
                <div class="alert alert-success d-flex align-items-center">
                    <i class="bi bi-check-circle-fill me-2"></i>
                    <div>
                        <strong>Discord連携有効</strong><br>
                        <small>${data.message}</small>
                    </div>
                </div>
            `;
        } else {
            statusElement.innerHTML = `
                <div class="alert alert-warning d-flex align-items-center">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>
                        <strong>Discord連携無効</strong><br>
                        <small>${data.message || 'Discord Webhook URLが設定されていません'}</small>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Discord status loading error:', error);
        const statusElement = document.getElementById('discordStatus');
        if (statusElement) {
            statusElement.innerHTML = `
                <div class="alert alert-danger d-flex align-items-center">
                    <i class="bi bi-x-circle-fill me-2"></i>
                    <div>Discord設定状況の確認に失敗しました</div>
                </div>
            `;
        }
    }
}

// システム情報を読み込み
async function loadSystemInfo() {
    try {
        const response = await fetch('/api/monitoring/system');
        const data = await response.json();
        
        const systemInfoElement = document.getElementById('systemInfo');
        const apiKeyStatusElement = document.getElementById('apiKeyStatus');
        
        if (!systemInfoElement || !apiKeyStatusElement) return;
        
        if (data.success && data.data) {
            const systemData = data.data;
            
            // システム情報表示
            systemInfoElement.innerHTML = `
                <div class="small">
                    <div class="row g-2">
                        <div class="col-12">
                            <strong>Node.jsバージョン:</strong> ${systemData.node?.version || 'N/A'}
                        </div>
                        <div class="col-12">
                            <strong>プラットフォーム:</strong> ${systemData.node?.platform || 'N/A'}
                        </div>
                        <div class="col-12">
                            <strong>アーキテクチャ:</strong> ${systemData.node?.arch || 'N/A'}
                        </div>
                        <div class="col-12">
                            <strong>稼働時間:</strong> ${systemData.node?.uptime ? formatUptime(systemData.node.uptime) : 'N/A'}
                        </div>
                        <div class="col-12">
                            <strong>メモリ使用量:</strong> ${systemData.node?.memory?.rss || 'N/A'} MB
                        </div>
                        <div class="col-12">
                            <strong>ログレベル:</strong> ${systemData.config?.logLevel || 'N/A'}
                        </div>
                    </div>
                </div>
            `;
            
            // APIキー設定状況表示
            const apiKeys = systemData.apiKeys || {};
            if (apiKeyStatusElement) {
                apiKeyStatusElement.innerHTML = `
                    <div class="small">
                        <div class="row g-2">
                            <div class="col-12">
                                <div class="d-flex justify-content-between align-items-center">
                                    <span>ITAD API:</span>
                                    <span class="badge ${apiKeys.itad ? 'bg-success' : 'bg-danger'}">
                                        ${apiKeys.itad ? '設定済み' : '未設定'}
                                    </span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex justify-content-between align-items-center">
                                    <span>Discord Webhook:</span>
                                    <span class="badge ${apiKeys.discord ? 'bg-success' : 'bg-warning'}">
                                        ${apiKeys.discord ? '設定済み' : '未設定'}
                                    </span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex justify-content-between align-items-center">
                                    <span>Steam API:</span>
                                    <span class="badge ${apiKeys.steam ? 'bg-success' : 'bg-secondary'}">
                                        ${apiKeys.steam ? '設定済み' : 'オプション'}
                                    </span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex justify-content-between align-items-center">
                                    <span>IGDB API:</span>
                                    <span class="badge ${apiKeys.igdb ? 'bg-success' : 'bg-secondary'}">
                                        ${apiKeys.igdb ? '設定済み' : 'オプション'}
                                    </span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex justify-content-between align-items-center">
                                    <span>YouTube API:</span>
                                    <span class="badge ${apiKeys.youtube ? 'bg-success' : 'bg-warning'}">
                                        ${apiKeys.youtube ? '設定済み' : '未設定'}
                                    </span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="d-flex justify-content-between align-items-center">
                                    <span>Twitch API:</span>
                                    <span class="badge ${apiKeys.twitch ? 'bg-success' : 'bg-warning'}">
                                        ${apiKeys.twitch ? '設定済み' : '未設定'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        } else {
            systemInfoElement.innerHTML = '<div class="text-danger">システム情報の取得に失敗しました</div>';
            apiKeyStatusElement.innerHTML = '<div class="text-danger">API設定情報の取得に失敗しました</div>';
        }
    } catch (error) {
        console.error('System info loading error:', error);
        const systemInfoElement = document.getElementById('systemInfo');
        const apiKeyStatusElement = document.getElementById('apiKeyStatus');
        
        if (systemInfoElement) {
            systemInfoElement.innerHTML = '<div class="text-danger">システム情報の取得に失敗しました</div>';
        }
        if (apiKeyStatusElement) {
            apiKeyStatusElement.innerHTML = '<div class="text-danger">API設定情報の取得に失敗しました</div>';
        }
    }
}


// ゲームリスト読み込み（テスト用）
async function loadGameListForTest() {
    try {
        const response = await fetch('/api/games?enabled=all');
        const data = await response.json();
        
        const selectElement = document.getElementById('testGameSelect');
        if (!selectElement) return;
        
        if (data.success && data.data.length > 0) {
            selectElement.innerHTML = '<option value="">ゲームを選択...</option>';
            
            data.data.forEach(game => {
                const option = document.createElement('option');
                option.value = game.id;
                option.textContent = `${game.name} (${game.steam_app_id})`;
                selectElement.appendChild(option);
            });
        } else {
            selectElement.innerHTML = '<option value="">ゲームが見つかりません</option>';
        }
    } catch (error) {
        console.error('Game list loading error:', error);
        const selectElement = document.getElementById('testGameSelect');
        if (selectElement) {
            selectElement.innerHTML = '<option value="">読み込みエラー</option>';
        }
    }
}

// Discord テスト実行
async function testDiscord(testType) {
    try {
        showAlert('info', `Discord ${testType} テストを実行中...`);
        
        const response = await fetch(`/api/discord/test/${testType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('success', data.message);
        } else {
            showAlert('danger', `テスト失敗: ${data.error}`);
        }
    } catch (error) {
        console.error('Discord test error:', error);
        showAlert('danger', 'Discordテスト実行中にエラーが発生しました');
    }
}

// 価格アラートテストフォーム初期化
function initPriceAlertTestForm() {
    const form = document.getElementById('priceAlertTestForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const gameId = formData.get('gameId') || document.getElementById('testGameSelect')?.value;
        const alertType = formData.get('alertType') || document.getElementById('testAlertType')?.value;
        const testPrice = formData.get('testPrice') || document.getElementById('testCurrentPrice')?.value;
        const sendDiscord = document.getElementById('testSendDiscord')?.checked || false;
        
        if (!gameId || !alertType || !testPrice) {
            showAlert('warning', '全ての必須項目を入力してください');
            return;
        }
        
        await runPriceAlertTest(parseInt(gameId), alertType, parseFloat(testPrice), sendDiscord);
    });
}

// 価格アラートテスト実行
async function runPriceAlertTest(gameId, alertType, testPrice, sendDiscord) {
    try {
        const resultElement = document.getElementById('priceAlertTestResult');
        if (resultElement) {
            resultElement.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span>アラートテストを実行中...</span>
                </div>
            `;
        }
        
        const response = await fetch('/api/test/price-alert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameId,
                alertType,
                testPrice,
                sendDiscord
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 成功時の結果表示
            if (resultElement) {
                resultElement.innerHTML = `
                    <div class="alert alert-success mb-0">
                        <h6><i class="bi bi-check-circle-fill me-2"></i>テスト成功</h6>
                        <div class="small">
                            <strong>ゲーム:</strong> ${data.data.game.name}<br>
                            <strong>アラートタイプ:</strong> ${getAlertTypeLabel(alertType)}<br>
                            <strong>テスト価格:</strong> ¥${testPrice.toLocaleString()}<br>
                            <strong>Discord通知:</strong> ${sendDiscord ? (data.data.discordSent ? '送信成功' : '送信失敗') : '送信しない'}<br>
                            <strong>アラートID:</strong> ${data.data.alertId}<br>
                            <strong>実行日時:</strong> ${new Date(data.data.alertHistory.created_at).toLocaleString('ja-JP')}
                        </div>
                    </div>
                `;
            }
            
            showAlert('success', data.message);
        } else {
            if (resultElement) {
                resultElement.innerHTML = `
                    <div class="alert alert-danger mb-0">
                        <h6><i class="bi bi-x-circle-fill me-2"></i>テスト失敗</h6>
                        <div class="small">${data.error}</div>
                    </div>
                `;
            }
            
            showAlert('danger', `テスト失敗: ${data.error}`);
        }
    } catch (error) {
        console.error('Price alert test error:', error);
        
        const resultElement = document.getElementById('priceAlertTestResult');
        if (resultElement) {
            resultElement.innerHTML = `
                <div class="alert alert-danger mb-0">
                    <h6><i class="bi bi-x-circle-fill me-2"></i>エラー</h6>
                    <div class="small">テスト実行中にエラーが発生しました</div>
                </div>
            `;
        }
        
        showAlert('danger', 'アラートテスト実行中にエラーが発生しました');
    }
}

// アラートタイプのラベル取得
function getAlertTypeLabel(alertType) {
    switch (alertType) {
        case 'new_low': return '新最安値更新';
        case 'sale_start': return 'セール開始';
        case 'threshold_met': return '価格閾値達成';
        default: return alertType;
    }
}

// アラート表示（UIヘルパー）
function showAlert(type, message) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'danger' ? 'x-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}-fill me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertContainer.appendChild(alertElement);
    
    // 5秒後に自動削除
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.remove();
        }
    }, 5000);
}

// グローバルに公開
window.initSettingsPage = initSettingsPage;
window.testDiscord = testDiscord;