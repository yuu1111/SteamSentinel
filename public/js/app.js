// SteamSentinel Main Application Script

// Global state
let currentView = 'dashboard';
let gamesData = [];
let dashboardData = null;
let refreshInterval = null;
let currentSort = { column: null, direction: 'asc' };
let progressInterval = null;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting application initialization');
    console.log('Current location:', window.location.href);
    console.log('User Agent:', navigator.userAgent);
    initializeApp();
});

// Application initialization
async function initializeApp() {
    try {
        console.log('Starting application initialization...');
        
        // Initialize dark mode
        initializeDarkMode();
        console.log('Dark mode initialized');
        
        // Load initial data
        console.log('Loading dashboard data...');
        await loadDashboardData();
        console.log('Dashboard data loaded');
        
        // Setup auto-refresh
        setupAutoRefresh();
        console.log('Auto-refresh setup complete');
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        console.log('Keyboard shortcuts setup complete');
        
        // Setup table sorting
        setupTableSorting();
        console.log('Table sorting setup complete');
        
        showSuccess('SteamSentinel が正常に起動しました');
        console.log('Application initialization completed successfully');
    } catch (error) {
        console.error('Application initialization failed:', error);
        const errorDetails = `
エラー種類: ${error.name || 'Unknown'}
エラーメッセージ: ${error.message || 'No message'}
スタックトレース: ${error.stack || 'No stack trace available'}
        `;
        showError('アプリケーションの初期化に失敗しました', 15000, errorDetails);
    }
}

// View Management
function showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('d-none');
    });
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected view
    const targetView = document.getElementById(viewName + 'View');
    if (targetView) {
        targetView.classList.remove('d-none');
        targetView.classList.add('fade-in');
    }
    
    // Update active nav link
    const navLink = document.querySelector(`[onclick="show${viewName.charAt(0).toUpperCase() + viewName.slice(1)}()"]`);
    if (navLink) {
        navLink.classList.add('active');
    }
    
    currentView = viewName;
    
    // Load view-specific data
    switch (viewName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'games':
            loadGamesView();
            break;
        case 'alerts':
            loadAlertsView();
            break;
        case 'monitoring':
            loadMonitoringView();
            break;
    }
}

// Dashboard functions
function showDashboard() {
    showView('dashboard');
}

async function loadDashboardData() {
    try {
        console.log('loadDashboardData: Starting...');
        showLoading();
        
        // 監視が実行中かチェック
        await checkAndStartProgressMonitoring();
        
        console.log('loadDashboardData: Making API call...');
        const response = await api.get('/games/dashboard');
        console.log('loadDashboardData: API response received:', response);
        
        if (response.success) {
            dashboardData = response.data;
            console.log('loadDashboardData: Updating statistics cards...');
            updateStatisticsCards(response.data.statistics);
            
            console.log('loadDashboardData: Updating games table...');
            updateGamesTable(response.data.games);
            
            // ゲームをカテゴリ別に分類
            const gameCategories = {
                failed: [],
                freeToPlay: [],
                unreleased: [],
                removed: []
            };
            
            response.data.games.forEach(game => {
                if (!game.latestPrice) {
                    gameCategories.failed.push(game);
                } else {
                    switch (game.latestPrice.source) {
                        case 'steam_free':
                            gameCategories.freeToPlay.push(game);
                            break;
                        case 'steam_unreleased':
                            gameCategories.unreleased.push(game);
                            break;
                        case 'steam_removed':
                            gameCategories.removed.push(game);
                            break;
                    }
                }
            });
            
            // カテゴリ別の統計表示
            const totalSpecialGames = gameCategories.failed.length + gameCategories.freeToPlay.length + 
                                     gameCategories.unreleased.length + gameCategories.removed.length;
            
            if (totalSpecialGames > 0) {
                console.info(`特別なゲーム状況:`, {
                    'データ取得失敗': gameCategories.failed.length,
                    '基本無料ゲーム': gameCategories.freeToPlay.length,
                    '未リリースゲーム': gameCategories.unreleased.length,
                    '販売終了ゲーム': gameCategories.removed.length
                });
                
                // カテゴリ別のゲームリストを作成
                const createGameList = (games, categoryName, badgeClass = 'bg-secondary') => {
                    if (games.length === 0) return '';
                    
                    const gameList = games.map(game => 
                        `<div class="mb-2">
                            <span class="badge ${badgeClass} me-2">${categoryName}</span>
                            <strong>${game.name}</strong> (ID: ${game.steam_app_id})
                            <br>
                            <a href="https://store.steampowered.com/app/${game.steam_app_id}/" target="_blank" class="btn btn-sm btn-outline-primary mt-1">
                                <i class="bi bi-box-arrow-up-right"></i> Steamページ
                            </a>
                        </div>`
                    ).join('');
                    
                    return `<div class="mb-3">
                        <h6 class="text-${badgeClass.replace('bg-', '')}">${categoryName} (${games.length}件)</h6>
                        ${gameList}
                    </div>`;
                };
                
                // 全てのゲームリストを結合
                const allGamesList = [
                    createGameList(gameCategories.failed, '価格取得失敗', 'bg-danger'),
                    createGameList(gameCategories.freeToPlay, '基本無料ゲーム', 'bg-success'),
                    createGameList(gameCategories.unreleased, '未リリースゲーム', 'bg-info'),
                    createGameList(gameCategories.removed, '販売終了ゲーム', 'bg-warning')
                ].filter(list => list !== '').join('');
                
                // コピー用のテキストリストを作成
                const allGamesForCopy = [
                    ...gameCategories.failed.map(game => `[価格取得失敗] ${game.name} (ID: ${game.steam_app_id}) - https://store.steampowered.com/app/${game.steam_app_id}/`),
                    ...gameCategories.freeToPlay.map(game => `[基本無料] ${game.name} (ID: ${game.steam_app_id}) - https://store.steampowered.com/app/${game.steam_app_id}/`),
                    ...gameCategories.unreleased.map(game => `[未リリース] ${game.name} (ID: ${game.steam_app_id}) - https://store.steampowered.com/app/${game.steam_app_id}/`),
                    ...gameCategories.removed.map(game => `[販売終了] ${game.name} (ID: ${game.steam_app_id}) - https://store.steampowered.com/app/${game.steam_app_id}/`)
                ].join('\n');
                
                const copyButtonId = 'copy-failed-games-' + Date.now();
                
                const detailsHTML = `
                    <div class="game-categories-list">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="mb-0">ゲーム状況詳細:</h6>
                            <button id="${copyButtonId}" class="btn btn-sm btn-outline-secondary" title="リストをコピー">
                                <i class="bi bi-clipboard"></i> コピー
                            </button>
                        </div>
                        ${allGamesList}
                        <hr class="my-3">
                        <small class="text-muted">
                            <strong>カテゴリ説明:</strong><br>
                            • <span class="badge bg-danger">価格取得失敗</span> - API障害、地域制限等<br>
                            • <span class="badge bg-success">基本無料ゲーム</span> - F2Pゲーム（価格監視対象外）<br>
                            • <span class="badge bg-info">未リリースゲーム</span> - 発売前ゲーム（リリース日監視）<br>
                            • <span class="badge bg-warning">販売終了ゲーム</span> - Steam販売停止ゲーム
                        </small>
                    </div>
                `;
                
                // 警告を表示した後にコピーボタンのイベントリスナーを追加
                setTimeout(() => {
                    const copyButton = document.getElementById(copyButtonId);
                    if (copyButton) {
                        copyButton.addEventListener('click', () => {
                            copyToClipboard(allGamesForCopy).then(() => {
                                // コピー成功時のボタン表示変更
                                const originalHTML = copyButton.innerHTML;
                                copyButton.innerHTML = '<i class="bi bi-check-lg"></i> コピー済み';
                                copyButton.classList.remove('btn-outline-secondary');
                                copyButton.classList.add('btn-success');
                                
                                setTimeout(() => {
                                    copyButton.innerHTML = originalHTML;
                                    copyButton.classList.remove('btn-success');
                                    copyButton.classList.add('btn-outline-secondary');
                                }, 2000);
                            });
                        });
                    }
                }, 100);
                
                showWarning(
                    `${totalSpecialGames}ゲームが特別な状況です（基本無料・未リリース・販売終了・データ取得失敗）`, 
                    0, // 自動消去しない
                    detailsHTML
                );
            }
            console.log('loadDashboardData: Dashboard data loaded successfully');
        } else {
            console.error('loadDashboardData: API returned success=false:', response);
            showError('ダッシュボードデータの読み込みに失敗しました');
        }
    } catch (error) {
        console.error('loadDashboardData: Exception occurred:', error);
        const errorDetails = `
エラー種類: ${error.name || 'Unknown'}
エラーメッセージ: ${error.message || 'No message'}
APIエンドポイント: /api/games/dashboard
スタックトレース: ${error.stack || 'No stack trace available'}
        `;
        showError('ダッシュボードデータの読み込み中にエラーが発生しました', 12000, errorDetails);
    } finally {
        hideLoading();
    }
}

function updateStatisticsCards(statistics) {
    const statsContainer = document.getElementById('statsCards');
    
    statsContainer.innerHTML = `
        <div class="col-md-3 col-sm-6 mb-3">
            <div class="card stats-card info">
                <div class="card-body text-center">
                    <i class="bi bi-collection display-4 mb-2"></i>
                    <h3 class="display-4">${statistics.gamesTracked || 0}</h3>
                    <p class="mb-0">監視中ゲーム</p>
                </div>
            </div>
        </div>
        <div class="col-md-3 col-sm-6 mb-3">
            <div class="card stats-card success">
                <div class="card-body text-center">
                    <i class="bi bi-tag display-4 mb-2"></i>
                    <h3 class="display-4">${statistics.gamesOnSale || 0}</h3>
                    <p class="mb-0">セール中</p>
                </div>
            </div>
        </div>
        <div class="col-md-3 col-sm-6 mb-3">
            <div class="card stats-card warning">
                <div class="card-body text-center">
                    <i class="bi bi-bell display-4 mb-2"></i>
                    <h3 class="display-4">${statistics.totalAlerts || 0}</h3>
                    <p class="mb-0">総アラート数</p>
                </div>
            </div>
        </div>
        <div class="col-md-3 col-sm-6 mb-3">
            <div class="card stats-card">
                <div class="card-body text-center">
                    <i class="bi bi-percent display-4 mb-2"></i>
                    <h3 class="display-4">${statistics.averageDiscount || 0}%</h3>
                    <p class="mb-0">平均割引率</p>
                </div>
            </div>
        </div>
        <div class="col-12">
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <i class="bi bi-info-circle me-2"></i>
                <strong>ご注意:</strong> 歴代最安値は過去6ヶ月間のデータのみです。より古いセール情報は含まれていません。
                <a href="/limitations.html" class="alert-link ms-2">詳細を確認</a>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        </div>
    `;
}

function updateGamesTable(games) {
    const tableBody = document.getElementById('gamesTableBody');
    gamesData = games;
    
    if (!games || games.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-inbox display-1 d-block mb-3"></i>
                    監視中のゲームがありません<br>
                    <button class="btn btn-primary mt-2" onclick="showAddGameModal()">
                        <i class="bi bi-plus-lg"></i> 最初のゲームを追加
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = games.map(game => {
        const latestPrice = game.latestPrice;
        const currentPrice = latestPrice ? latestPrice.current_price : 0;
        const originalPrice = latestPrice ? latestPrice.original_price : 0;
        const discountPercent = latestPrice ? latestPrice.discount_percent : 0;
        const historicalLow = latestPrice ? latestPrice.historical_low : 0;
        const isOnSale = latestPrice ? latestPrice.is_on_sale : false;
        const lastUpdated = latestPrice ? new Date(latestPrice.recorded_at).toLocaleString('ja-JP') : '未取得';
        
        // 特殊なゲームタイプに応じた価格表示
        let priceDisplay = '<span class="text-muted">価格未取得</span>';
        if (latestPrice) {
            if (latestPrice.source === 'steam_free') {
                priceDisplay = '<span class="badge bg-success">基本無料</span>';
            } else if (latestPrice.source === 'steam_unreleased') {
                priceDisplay = '<span class="text-info">未発売</span>';
            } else if (latestPrice.source === 'steam_removed') {
                priceDisplay = '<span class="text-danger">販売終了</span>';
            } else if (currentPrice > 0) {
                priceDisplay = isOnSale ? 
                    `<span class="price sale">¥${currentPrice.toLocaleString()}</span><br><small class="price old">¥${originalPrice.toLocaleString()}</small>` :
                    `<span class="price">¥${currentPrice.toLocaleString()}</span>`;
            }
        }
            
        // 特殊なゲームタイプに応じた元価格・最安値表示
        let originalPriceDisplay = '<span class="text-muted">未取得</span>';
        let historicalLowDisplay = '<span class="text-muted">未取得</span>';
        
        if (latestPrice) {
            if (latestPrice.source === 'steam_free' || 
                latestPrice.source === 'steam_unreleased' || 
                latestPrice.source === 'steam_removed') {
                originalPriceDisplay = '-';
                historicalLowDisplay = '-';
            } else {
                originalPriceDisplay = originalPrice > 0 ? `<span class="price-display">¥${originalPrice.toLocaleString()}</span>` : '-';
                historicalLowDisplay = historicalLow > 0 ? `<span class="price-display">¥${historicalLow.toLocaleString()}</span>` : '-';
            }
        }
        
        // 割引率バッジ（特殊なゲームタイプは非表示）
        let discountBadge = '<span class="text-muted">未取得</span>';
        if (latestPrice) {
            if (latestPrice.source === 'steam_free' || 
                latestPrice.source === 'steam_unreleased' || 
                latestPrice.source === 'steam_removed') {
                discountBadge = '-';
            } else {
                discountBadge = discountPercent > 0 ? 
                    `<span class="discount-badge">${discountPercent}%&nbsp;OFF</span>` : 
                    '<span class="text-muted">-</span>';
            }
        }
            
        // セール状態の表示（ゲームタイプに応じて調整）
        let saleStatus = '<span class="badge bg-warning"><i class="bi bi-exclamation-triangle"></i> データ取得失敗</span>';
        if (latestPrice) {
            switch (latestPrice.source) {
                case 'steam_free':
                    saleStatus = '<span class="badge bg-primary"><i class="bi bi-controller"></i> 基本無料</span>';
                    break;
                case 'steam_unreleased':
                    saleStatus = '<span class="badge bg-info"><i class="bi bi-clock"></i> 未リリース</span>';
                    break;
                case 'steam_removed':
                    saleStatus = '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> 販売終了</span>';
                    break;
                default:
                    saleStatus = isOnSale ? 
                        '<span class="badge bg-success"><i class="bi bi-check-circle"></i> セール中</span>' : 
                        '<span class="badge bg-secondary">通常価格</span>';
            }
        }
        
        return `
            <tr class="game-item">
                <td>
                    <div class="d-flex align-items-center">
                        <img src="https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_app_id}/header.jpg" 
                             alt="${game.name}" 
                             class="game-header-img me-3"
                             onerror="this.style.display='none'"
                             loading="lazy">
                        <div>
                            <a href="https://store.steampowered.com/app/${game.steam_app_id}/" target="_blank" class="steam-link">
                                <i class="bi bi-box-arrow-up-right me-1"></i>${game.name}
                            </a>
                            <br><small class="text-muted">ID: ${game.steam_app_id}</small>
                        </div>
                    </div>
                </td>
                <td>${priceDisplay}</td>
                <td>${originalPriceDisplay}</td>
                <td>${discountBadge}</td>
                <td>${historicalLowDisplay}</td>
                <td>${saleStatus}</td>
                <td><small>${lastUpdated}</small></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="showPriceChart(${game.steam_app_id}, '${game.name}')" title="価格推移">
                            <i class="bi bi-graph-up"></i>
                        </button>
                        <button class="action-btn" onclick="openSteamDB(${game.steam_app_id})" title="SteamDB" data-app-id="${game.steam_app_id}">
                            <i class="bi bi-database"></i>
                        </button>
                        <button class="action-btn" onclick="editGame(${game.id})" title="編集">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="action-btn" onclick="runSingleGameMonitoring(${game.steam_app_id})" title="手動更新">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                        <button class="action-btn danger" onclick="deleteGame(${game.id}, '${game.name}')" title="削除">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // SteamDBボタンにイベントリスナーを追加
    setTimeout(() => {
        const steamDbButtons = document.querySelectorAll('button[data-app-id]');
        steamDbButtons.forEach(button => {
            const appId = button.getAttribute('data-app-id');
            if (appId && button.title === 'SteamDB') {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('SteamDB button clicked for app:', appId);
                    openSteamDB(parseInt(appId));
                });
            }
        });
    }, 100);
}

// Game management functions
function showGames() {
    showView('games');
}

function showAlerts() {
    showView('alerts');
}

function showMonitoring() {
    showView('monitoring');
}

function loadGamesView() {
    // Implementation for games view
    console.log('Loading games view...');
}

function loadAlertsView() {
    // Implementation for alerts view
    console.log('Loading alerts view...');
}

function loadMonitoringView() {
    // Implementation for monitoring view
    console.log('Loading monitoring view...');
}

// Game management
function showAddGameModal() {
    const modal = new bootstrap.Modal(document.getElementById('addGameModal'));
    modal.show();
}

async function addGame() {
    try {
        const steamAppId = parseInt(document.getElementById('steamAppId').value);
        const gameName = document.getElementById('gameName').value.trim();
        const priceThreshold = parseFloat(document.getElementById('priceThreshold').value) || null;
        const gameEnabled = document.getElementById('gameEnabled').checked;
        const alertEnabled = document.getElementById('alertEnabled').checked;
        
        if (!steamAppId || !gameName) {
            showError('Steam App IDとゲーム名は必須です');
            return;
        }
        
        showLoading();
        
        const response = await api.post('/games', {
            steam_app_id: steamAppId,
            name: gameName,
            price_threshold: priceThreshold,
            enabled: gameEnabled,
            alert_enabled: alertEnabled
        });
        
        if (response.success) {
            showSuccess(`${gameName} を追加しました`);
            bootstrap.Modal.getInstance(document.getElementById('addGameModal')).hide();
            document.getElementById('addGameForm').reset();
            await loadDashboardData();
        } else {
            showError('ゲームの追加に失敗しました: ' + response.error);
        }
    } catch (error) {
        console.error('Failed to add game:', error);
        showError('ゲームの追加中にエラーが発生しました');
    } finally {
        hideLoading();
    }
}

async function deleteGame(gameId, gameName) {
    if (!confirm(`"${gameName}" を削除してもよろしいですか？\n\nこの操作により、価格履歴とアラート履歴も削除されます。`)) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await api.delete(`/games/${gameId}`);
        
        if (response.success) {
            showSuccess(`${gameName} を削除しました`);
            await loadDashboardData();
        } else {
            showError('ゲームの削除に失敗しました: ' + response.error);
        }
    } catch (error) {
        console.error('Failed to delete game:', error);
        showError('ゲームの削除中にエラーが発生しました');
    } finally {
        hideLoading();
    }
}

function editGame(gameId) {
    // TODO: Implement edit game functionality
    showInfo('ゲーム編集機能は実装中です');
}

// ゲームリスト更新関数
async function refreshGameList() {
    try {
        showLoading();
        await loadDashboardData();
        showSuccess('ゲームリストを更新しました');
    } catch (error) {
        console.error('Failed to refresh game list:', error);
        showError('ゲームリストの更新に失敗しました');
    } finally {
        hideLoading();
    }
}

// SteamDBページを開く
function openSteamDB(steamAppId) {
    try {
        console.log(`Opening SteamDB for app ID: ${steamAppId}`);
        const steamDbUrl = `https://steamdb.info/app/${steamAppId}/`;
        const newWindow = window.open(steamDbUrl, '_blank', 'noopener,noreferrer');
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // ポップアップがブロックされた場合、ユーザーに通知
            console.warn('Popup blocked by browser');
            showWarning(
                `ポップアップがブロックされました。SteamDBページを開くには、ブラウザの設定でポップアップを許可してください。`, 
                0 // 0に設定することで自動消去しない
            );
        } else {
            console.log(`Successfully opened SteamDB: ${steamDbUrl}`);
        }
    } catch (error) {
        console.error('Error opening SteamDB:', error);
        showError('SteamDBページを開けませんでした');
    }
}

// グローバルウィンドウオブジェクトに明示的に追加（HTMLのonclick属性から呼び出すため）
window.openSteamDB = openSteamDB;
window.showAddGameModal = showAddGameModal;
window.addGame = addGame;
window.deleteGame = deleteGame;
window.editGame = editGame;
window.runSingleGameMonitoring = runSingleGameMonitoring;
window.runManualMonitoring = runManualMonitoring;
window.refreshGameList = refreshGameList;

// ナビゲーション関数もグローバルに追加
window.showDashboard = showDashboard;
window.showGames = showGames;
window.showAlerts = showAlerts;
window.showMonitoring = showMonitoring;
window.toggleDarkMode = toggleDarkMode;

// デバッグ用: 関数が正しく定義されているかチェック
console.log('Global functions defined:', {
    openSteamDB: typeof window.openSteamDB,
    showAddGameModal: typeof window.showAddGameModal,
    addGame: typeof window.addGame,
    deleteGame: typeof window.deleteGame,
    editGame: typeof window.editGame,
    runSingleGameMonitoring: typeof window.runSingleGameMonitoring
});

// テスト用関数
window.testSteamDB = function() {
    console.log('Testing SteamDB function...');
    openSteamDB(730); // CS2のSteam App ID
};

// Progress monitoring functions
async function checkAndStartProgressMonitoring() {
    try {
        // 現在の監視状況をチェック
        const response = await api.get('/monitoring/progress');
        if (response.success && response.data.isRunning) {
            console.log('監視が実行中です。進捗表示を開始します。');
            startProgressMonitoring();
        }
    } catch (error) {
        console.error('Failed to check monitoring progress:', error);
    }
}

async function startProgressMonitoring() {
    // 既に監視中の場合は何もしない
    if (progressInterval) {
        return;
    }
    
    // 進捗表示を開始
    document.getElementById('monitoringProgress').style.display = 'block';
    
    // 進捗をポーリング
    progressInterval = setInterval(async () => {
        try {
            const response = await api.get('/monitoring/progress');
            if (response.success) {
                updateProgressDisplay(response.data);
                
                // 監視が完了したら停止
                if (!response.data.isRunning) {
                    stopProgressMonitoring();
                    await loadDashboardData(); // ダッシュボードを更新
                }
            }
        } catch (error) {
            console.error('Failed to get monitoring progress:', error);
        }
    }, 1000); // 1秒間隔でポーリング
}

function stopProgressMonitoring() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    document.getElementById('monitoringProgress').style.display = 'none';
}

function updateProgressDisplay(progress) {
    // 現在のゲーム名
    document.getElementById('progressGameName').textContent = 
        progress.currentGame || '待機中...';
    
    // 進捗カウント
    document.getElementById('progressCount').textContent = 
        `${progress.completedGames}/${progress.totalGames}`;
    
    // プログレスバー
    const percentage = progress.totalGames > 0 ? 
        Math.round((progress.completedGames / progress.totalGames) * 100) : 0;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    
    // 残り時間
    const timeRemainingEl = document.getElementById('progressTimeRemaining');
    if (progress.estimatedTimeRemaining !== null && progress.estimatedTimeRemaining > 0) {
        const minutes = Math.floor(progress.estimatedTimeRemaining / 60);
        const seconds = progress.estimatedTimeRemaining % 60;
        timeRemainingEl.textContent = minutes > 0 ? 
            `約${minutes}分${seconds}秒` : `約${seconds}秒`;
    } else {
        timeRemainingEl.textContent = '計算中...';
    }
    
    // 失敗件数
    document.getElementById('progressFailed').textContent = progress.failedGames || 0;
}

// Monitoring functions
async function runManualMonitoring() {
    try {
        // 既に監視実行中の場合は何もしない
        if (progressInterval) {
            showWarning('監視は既に実行中です');
            return;
        }
        
        showLoading();
        showInfo('手動監視を開始しています...');
        
        // 進捗監視を開始
        startProgressMonitoring();
        
        const response = await api.post('/monitoring/run');
        
        if (response.success) {
            showSuccess('手動監視を開始しました');
        } else {
            showError('手動監視に失敗しました: ' + response.error);
            stopProgressMonitoring(); // エラー時は進捗表示を停止
        }
    } catch (error) {
        console.error('Manual monitoring failed:', error);
        showError('手動監視中にエラーが発生しました');
        stopProgressMonitoring(); // エラー時は進捗表示を停止
    } finally {
        hideLoading();
    }
}

async function runSingleGameMonitoring(steamAppId) {
    try {
        showLoading();
        
        const response = await api.post(`/monitoring/run/${steamAppId}`);
        
        if (response.success) {
            showSuccess('ゲームの価格を更新しました');
            await loadDashboardData();
        } else {
            showError('価格更新に失敗しました: ' + response.error);
        }
    } catch (error) {
        console.error('Single game monitoring failed:', error);
        showError('価格更新中にエラーが発生しました');
    } finally {
        hideLoading();
    }
}

function refreshGameList() {
    loadDashboardData();
}

// Auto-refresh setup
function setupAutoRefresh() {
    // Refresh data every 5 minutes
    refreshInterval = setInterval(() => {
        if (currentView === 'dashboard') {
            // 監視実行中でなければ自動リフレッシュ
            if (!progressInterval) {
                loadDashboardData();
            }
        }
    }, 5 * 60 * 1000);
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'r':
                    event.preventDefault();
                    if (currentView === 'dashboard') {
                        loadDashboardData();
                    }
                    break;
                case 'a':
                    event.preventDefault();
                    showAddGameModal();
                    break;
                case 'd':
                    event.preventDefault();
                    toggleDarkMode();
                    break;
            }
        } else if (event.key === 'Escape') {
            // Close any open modals
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(modal => {
                bootstrap.Modal.getInstance(modal)?.hide();
            });
        }
    });
}

// Table sorting functionality
function setupTableSorting() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortColumn = header.getAttribute('data-sort');
            sortTable(sortColumn);
        });
    });
}

function sortTable(column) {
    if (!gamesData || gamesData.length === 0) return;
    
    // 同じカラムをクリックした場合は方向を反転、異なる場合は昇順から開始
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    // データを並び替え
    const sortedData = [...gamesData].sort((a, b) => {
        let valueA, valueB;
        
        switch (column) {
            case 'name':
                valueA = a.name.toLowerCase();
                valueB = b.name.toLowerCase();
                break;
            case 'currentPrice':
                // 特殊なゲームタイプは最後にソート（価格0として扱う）
                const getCurrentPriceValue = (game) => {
                    if (!game.latestPrice) return 0;
                    if (['steam_free', 'steam_unreleased', 'steam_removed'].includes(game.latestPrice.source)) {
                        return 0; // 特殊タイプは0として扱う
                    }
                    return game.latestPrice.current_price || 0;
                };
                valueA = getCurrentPriceValue(a);
                valueB = getCurrentPriceValue(b);
                break;
            case 'originalPrice':
                const getOriginalPriceValue = (game) => {
                    if (!game.latestPrice) return 0;
                    if (['steam_free', 'steam_unreleased', 'steam_removed'].includes(game.latestPrice.source)) {
                        return 0;
                    }
                    return game.latestPrice.original_price || 0;
                };
                valueA = getOriginalPriceValue(a);
                valueB = getOriginalPriceValue(b);
                break;
            case 'discountPercent':
                const getDiscountValue = (game) => {
                    if (!game.latestPrice) return 0;
                    if (['steam_free', 'steam_unreleased', 'steam_removed'].includes(game.latestPrice.source)) {
                        return 0;
                    }
                    return game.latestPrice.discount_percent || 0;
                };
                valueA = getDiscountValue(a);
                valueB = getDiscountValue(b);
                break;
            case 'historicalLow':
                const getHistoricalLowValue = (game) => {
                    if (!game.latestPrice) return 0;
                    if (['steam_free', 'steam_unreleased', 'steam_removed'].includes(game.latestPrice.source)) {
                        return 0;
                    }
                    return game.latestPrice.historical_low || 0;
                };
                valueA = getHistoricalLowValue(a);
                valueB = getHistoricalLowValue(b);
                break;
            case 'isOnSale':
                // セール状態のソート順序を定義
                // 1: セール中, 2: 通常価格, 3: 基本無料, 4: 未リリース, 5: 販売終了, 6: データなし
                const getSaleStatusValue = (game) => {
                    if (!game.latestPrice) return 6; // データなし
                    
                    switch (game.latestPrice.source) {
                        case 'steam_free': return 3; // 基本無料
                        case 'steam_unreleased': return 4; // 未リリース
                        case 'steam_removed': return 5; // 販売終了
                        default:
                            return game.latestPrice.is_on_sale ? 1 : 2; // セール中 or 通常価格
                    }
                };
                
                valueA = getSaleStatusValue(a);
                valueB = getSaleStatusValue(b);
                break;
            case 'lastUpdated':
                valueA = a.latestPrice?.recorded_at ? new Date(a.latestPrice.recorded_at).getTime() : 0;
                valueB = b.latestPrice?.recorded_at ? new Date(b.latestPrice.recorded_at).getTime() : 0;
                break;
            default:
                return 0;
        }
        
        // 数値の場合は数値比較、文字列の場合は文字列比較
        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return currentSort.direction === 'asc' ? valueA - valueB : valueB - valueA;
        } else {
            if (valueA < valueB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        }
    });
    
    // ソートアイコンを更新
    updateSortIcons(column, currentSort.direction);
    
    // テーブルを再描画
    updateGamesTable(sortedData);
}

function updateSortIcons(activeColumn, direction) {
    // 全てのソートアイコンをリセット
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.className = 'bi bi-arrow-down-up sort-icon';
    });
    
    // アクティブなカラムのアイコンを更新
    const activeHeader = document.querySelector(`[data-sort="${activeColumn}"]`);
    if (activeHeader) {
        const icon = activeHeader.querySelector('.sort-icon');
        if (icon) {
            icon.className = direction === 'asc' ? 
                'bi bi-arrow-up sort-icon text-primary' : 
                'bi bi-arrow-down sort-icon text-primary';
        }
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    if (progressInterval) {
        clearInterval(progressInterval);
    }
});