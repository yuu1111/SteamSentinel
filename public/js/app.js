// SteamSentinel Main Application Script

// Global state
let currentView = 'dashboard';
let gamesData = [];
let dashboardData = null;
let refreshInterval = null;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Application initialization
async function initializeApp() {
    try {
        // Initialize dark mode
        initializeDarkMode();
        
        // Load initial data
        await loadDashboardData();
        
        // Setup auto-refresh
        setupAutoRefresh();
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts();
        
        showSuccess('SteamSentinel が正常に起動しました');
    } catch (error) {
        console.error('Application initialization failed:', error);
        showError('アプリケーションの初期化に失敗しました');
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
        showLoading();
        const response = await api.get('/games/dashboard');
        
        if (response.success) {
            dashboardData = response.data;
            updateStatisticsCards(response.data.statistics);
            updateGamesTable(response.data.games);
        } else {
            showError('ダッシュボードデータの読み込みに失敗しました');
        }
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showError('ダッシュボードデータの読み込み中にエラーが発生しました');
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
        
        const priceDisplay = currentPrice > 0 ? 
            (isOnSale ? 
                `<span class="price sale">¥${currentPrice.toLocaleString()}</span><br><small class="price old">¥${originalPrice.toLocaleString()}</small>` :
                `<span class="price">¥${currentPrice.toLocaleString()}</span>`
            ) : 
            '<span class="text-muted">価格未取得</span>';
            
        const originalPriceDisplay = originalPrice > 0 ? `¥${originalPrice.toLocaleString()}` : '-';
        const historicalLowDisplay = historicalLow > 0 ? `¥${historicalLow.toLocaleString()}` : '-';
        
        const discountBadge = discountPercent > 0 ? 
            `<span class="discount-badge">${discountPercent}% OFF</span>` : 
            '<span class="text-muted">-</span>';
            
        const saleStatus = isOnSale ? 
            '<span class="badge bg-success"><i class="bi bi-check-circle"></i> セール中</span>' : 
            '<span class="badge bg-secondary">通常価格</span>';
        
        return `
            <tr class="game-item">
                <td>
                    <a href="https://store.steampowered.com/app/${game.steam_app_id}/" target="_blank" class="steam-link">
                        <i class="bi bi-box-arrow-up-right me-1"></i>${game.name}
                    </a>
                    <br><small class="text-muted">ID: ${game.steam_app_id}</small>
                </td>
                <td>${priceDisplay}</td>
                <td>${originalPriceDisplay}</td>
                <td>${discountBadge}</td>
                <td>${historicalLowDisplay}</td>
                <td>${saleStatus}</td>
                <td><small>${lastUpdated}</small></td>
                <td>
                    <button class="action-btn" onclick="showPriceChart(${game.steam_app_id}, '${game.name}')" title="価格推移">
                        <i class="bi bi-graph-up"></i>
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
                </td>
            </tr>
        `;
    }).join('');
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

// Monitoring functions
async function runManualMonitoring() {
    try {
        showLoading();
        showInfo('手動監視を開始しています...');
        
        const response = await api.post('/monitoring/run');
        
        if (response.success) {
            showSuccess('手動監視が完了しました');
            await loadDashboardData();
        } else {
            showError('手動監視に失敗しました: ' + response.error);
        }
    } catch (error) {
        console.error('Manual monitoring failed:', error);
        showError('手動監視中にエラーが発生しました');
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
            loadDashboardData();
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

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});