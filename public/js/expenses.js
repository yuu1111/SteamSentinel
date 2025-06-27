// 出費追跡ダッシュボード JavaScript

class ExpensesDashboard {
    constructor() {
        this.currentPeriod = 'month';
        this.expenseData = null;
        this.monthlyChart = null;
        this.categoryChart = null;
        
        this.initializeEventListeners();
        this.loadExpenseData();
    }

    initializeEventListeners() {
        // 期間選択の変更
        document.querySelectorAll('input[name="period"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentPeriod = e.target.value;
                this.loadExpenseData();
            });
        });

        // データ更新ボタン
        document.getElementById('refresh-data').addEventListener('click', () => {
            this.loadExpenseData();
        });
    }

    async loadExpenseData() {
        this.showLoading(true);
        
        try {
            const response = await fetch(`/api/games/expenses?period=${this.currentPeriod}`);
            const result = await response.json();
            
            if (result.success) {
                this.expenseData = result.data;
                this.updateSummaryCards();
                this.updateCharts();
                this.updateGameExpensesTable();
                this.updateRecentPurchases();
            } else {
                this.showError('データの取得に失敗しました');
            }
        } catch (error) {
            console.error('Error loading expense data:', error);
            this.showError('データの読み込み中にエラーが発生しました');
        } finally {
            this.showLoading(false);
        }
    }

    updateSummaryCards() {
        const summary = this.expenseData.summary;
        
        document.getElementById('total-expenses').textContent = 
            `¥${summary.totalExpenses.toLocaleString()}`;
        
        document.getElementById('total-savings').textContent = 
            `¥${summary.totalSavings.toLocaleString()}`;
        
        document.getElementById('total-games').textContent = 
            summary.totalGames.toString();
        
        document.getElementById('savings-rate').textContent = 
            `${summary.savingsRate.toFixed(1)}%`;
    }

    updateCharts() {
        this.updateMonthlyExpensesChart();
        this.updateCategoryChart();
    }

    updateMonthlyExpensesChart() {
        const ctx = document.getElementById('monthly-expenses-chart').getContext('2d');
        
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
        }

        const expenseData = this.expenseData.monthlyTrends.expenses;
        const savingsData = this.expenseData.monthlyTrends.savings;
        
        // データをマージして月ラベルを作成
        const months = new Set([
            ...expenseData.map(d => d.month),
            ...savingsData.map(d => d.month)
        ]);
        
        const sortedMonths = Array.from(months).sort();
        
        const expenseAmounts = sortedMonths.map(month => {
            const data = expenseData.find(d => d.month === month);
            return data ? data.amount : 0;
        });
        
        const savingsAmounts = sortedMonths.map(month => {
            const data = savingsData.find(d => d.month === month);
            return data ? data.amount : 0;
        });

        this.monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedMonths.map(month => {
                    const date = new Date(month + '-01');
                    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' });
                }),
                datasets: [
                    {
                        label: '支出額',
                        data: expenseAmounts,
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        borderWidth: 2,
                        fill: true
                    },
                    {
                        label: '節約額',
                        data: savingsAmounts,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderWidth: 2,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#ffffff',
                            callback: function(value) {
                                return '¥' + value.toLocaleString();
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    updateCategoryChart() {
        const ctx = document.getElementById('category-chart').getContext('2d');
        
        if (this.categoryChart) {
            this.categoryChart.destroy();
        }

        const categories = this.expenseData.categories;
        const labels = [];
        const data = [];
        const colors = [];
        
        const categoryColors = {
            bargain: '#28a745',
            moderate: '#ffc107',
            small: '#fd7e14',
            full_price: '#dc3545'
        };
        
        Object.entries(categories).forEach(([key, category]) => {
            if (category.count > 0) {
                labels.push(category.label);
                data.push(category.total);
                colors.push(categoryColors[key]);
            }
        });

        this.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ffffff',
                            padding: 10,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ¥${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateGameExpensesTable() {
        const tbody = document.getElementById('game-expenses-body');
        tbody.innerHTML = '';
        
        if (this.expenseData.gameExpenses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <i class="fas fa-info-circle me-2"></i>
                        選択した期間にゲーム購入の記録がありません
                    </td>
                </tr>
            `;
            return;
        }
        
        this.expenseData.gameExpenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <img src="https://cdn.akamai.steamstatic.com/steam/apps/${expense.game.steam_app_id}/capsule_231x87.jpg" 
                             alt="${expense.game.name}" 
                             class="me-2" 
                             style="width: 40px; height: 15px; object-fit: cover; border-radius: 4px;"
                             onerror="this.style.display='none'">
                        <span>${expense.game.name}</span>
                    </div>
                </td>
                <td class="text-danger fw-bold">¥${expense.totalSpent.toLocaleString()}</td>
                <td>
                    <span class="badge bg-info">${expense.purchaseCount}回</span>
                </td>
                <td>
                    <span class="badge bg-success">${expense.averageDiscount.toFixed(0)}%</span>
                </td>
                <td>${new Date(expense.lastPurchase).toLocaleDateString('ja-JP')}</td>
                <td>
                    <a href="https://store.steampowered.com/app/${expense.game.steam_app_id}/" 
                       target="_blank" 
                       class="btn btn-sm btn-outline-light">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateRecentPurchases() {
        const container = document.getElementById('recent-purchases');
        container.innerHTML = '';
        
        if (this.expenseData.recentPurchases.length === 0) {
            container.innerHTML = `
                <div class="list-group-item bg-dark text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    最近の購入履歴がありません
                </div>
            `;
            return;
        }
        
        this.expenseData.recentPurchases.forEach(purchase => {
            const item = document.createElement('div');
            item.className = 'list-group-item bg-dark text-light d-flex justify-content-between align-items-center';
            
            const alertTypeIcon = {
                new_low: '<i class="fas fa-chart-line text-danger"></i>',
                sale_start: '<i class="fas fa-tag text-success"></i>',
                release: '<i class="fas fa-rocket text-info"></i>'
            };
            
            const alertTypeText = {
                new_low: '新最安値',
                sale_start: 'セール開始',
                release: 'リリース'
            };
            
            item.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-3">
                        ${alertTypeIcon[purchase.alert_type] || '<i class="fas fa-shopping-cart"></i>'}
                    </div>
                    <div>
                        <h6 class="mb-1">${purchase.game_name || `Game ID: ${purchase.steam_app_id}`}</h6>
                        <small class="text-muted">
                            ${alertTypeText[purchase.alert_type] || purchase.alert_type} • 
                            ${new Date(purchase.created_at).toLocaleDateString('ja-JP')}
                        </small>
                    </div>
                </div>
                <div class="text-end">
                    <span class="fw-bold text-danger">¥${(purchase.trigger_price || 0).toLocaleString()}</span>
                    ${purchase.discount_percent > 0 ? 
                        `<br><small class="text-success">${purchase.discount_percent}% OFF</small>` : 
                        ''
                    }
                </div>
            `;
            
            container.appendChild(item);
        });
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        if (show) {
            spinner.classList.remove('d-none');
        } else {
            spinner.classList.add('d-none');
        }
    }

    showError(message) {
        // 簡単なエラー表示（実際のプロジェクトではより洗練されたものを使用）
        alert(message);
    }
}

// ページ読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
    new ExpensesDashboard();
});