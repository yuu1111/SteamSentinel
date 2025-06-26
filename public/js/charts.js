// Chart functionality for SteamSentinel

let priceChart = null;

// Show price chart modal
async function showPriceChart(steamAppId, gameName) {
    try {
        showLoading();
        
        // Set modal title
        document.getElementById('priceChartTitle').textContent = `${gameName} - 価格推移グラフ`;
        
        // Fetch price history data
        const response = await api.games.getPriceHistory(steamAppId, 30);
        
        if (!response.success) {
            throw new Error(response.error || '価格履歴の取得に失敗しました');
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('priceChartModal'));
        modal.show();
        
        // Wait for modal to be shown before creating chart
        modal._element.addEventListener('shown.bs.modal', () => {
            createPriceChart(response.data.chartData, gameName);
        }, { once: true });
        
    } catch (error) {
        console.error('Failed to show price chart:', error);
        showError('価格推移グラフの表示に失敗しました: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Create price chart using Chart.js
function createPriceChart(chartData, gameName) {
    const canvas = document.getElementById('priceChart');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (priceChart) {
        priceChart.destroy();
    }
    
    // Prepare data
    const labels = chartData.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    });
    
    const prices = chartData.map(item => item.price);
    
    // Calculate min/max for better scaling
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;
    
    // Get theme colors
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const textColor = isDark ? '#ffffff' : '#333333';
    const gridColor = isDark ? '#404040' : '#e0e0e0';
    const primaryColor = '#1b2838';
    const secondaryColor = '#66c0f4';
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, isDark ? 'rgba(102, 192, 244, 0.3)' : 'rgba(27, 40, 56, 0.2)');
    gradient.addColorStop(1, isDark ? 'rgba(102, 192, 244, 0.05)' : 'rgba(27, 40, 56, 0.05)');
    
    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '価格 (円)',
                data: prices,
                borderColor: secondaryColor,
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: secondaryColor,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: primaryColor,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                title: {
                    display: true,
                    text: `${gameName} - 過去30日間の価格推移`,
                    color: textColor,
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                legend: {
                    display: true,
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: gridColor,
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            const date = new Date(chartData[index].date);
                            return date.toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        },
                        label: function(context) {
                            return `価格: ¥${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '日付',
                        color: textColor,
                        font: {
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: textColor,
                        maxTicksLimit: 10
                    },
                    grid: {
                        color: gridColor,
                        lineWidth: 1
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '価格 (円)',
                        color: textColor,
                        font: {
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: gridColor,
                        lineWidth: 1
                    },
                    min: minPrice,
                    max: maxPrice
                }
            },
            elements: {
                point: {
                    hitRadius: 10
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        }
    };
    
    // Create chart
    priceChart = new Chart(ctx, config);
    
    // Add chart statistics
    addChartStatistics(chartData, gameName);
}

// Add statistics below the chart
function addChartStatistics(chartData, gameName) {
    if (chartData.length === 0) return;
    
    const prices = chartData.map(item => item.price);
    const currentPrice = prices[prices.length - 1];
    const oldestPrice = prices[0];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    const priceChange = currentPrice - oldestPrice;
    const priceChangePercent = ((priceChange / oldestPrice) * 100).toFixed(1);
    
    const statsHTML = `
        <div class="row mt-3 text-center">
            <div class="col-6 col-md-3 mb-2">
                <div class="card border-0 bg-light">
                    <div class="card-body py-2">
                        <small class="text-muted">現在価格</small>
                        <div class="fw-bold text-primary">¥${currentPrice.toLocaleString()}</div>
                    </div>
                </div>
            </div>
            <div class="col-6 col-md-3 mb-2">
                <div class="card border-0 bg-light">
                    <div class="card-body py-2">
                        <small class="text-muted">最安値</small>
                        <div class="fw-bold text-success">¥${minPrice.toLocaleString()}</div>
                    </div>
                </div>
            </div>
            <div class="col-6 col-md-3 mb-2">
                <div class="card border-0 bg-light">
                    <div class="card-body py-2">
                        <small class="text-muted">最高値</small>
                        <div class="fw-bold text-danger">¥${maxPrice.toLocaleString()}</div>
                    </div>
                </div>
            </div>
            <div class="col-6 col-md-3 mb-2">
                <div class="card border-0 bg-light">
                    <div class="card-body py-2">
                        <small class="text-muted">平均価格</small>
                        <div class="fw-bold text-info">¥${Math.round(avgPrice).toLocaleString()}</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-12 text-center">
                <small class="text-muted">
                    30日間の価格変動: 
                    <span class="fw-bold ${priceChange >= 0 ? 'text-danger' : 'text-success'}">
                        ${priceChange >= 0 ? '+' : ''}¥${priceChange.toLocaleString()} 
                        (${priceChange >= 0 ? '+' : ''}${priceChangePercent}%)
                    </span>
                </small>
            </div>
        </div>
    `;
    
    // Insert statistics after chart canvas
    const chartContainer = document.getElementById('priceChart').parentElement;
    let existingStats = chartContainer.querySelector('.chart-stats');
    if (existingStats) {
        existingStats.remove();
    }
    
    const statsDiv = document.createElement('div');
    statsDiv.className = 'chart-stats';
    statsDiv.innerHTML = statsHTML;
    chartContainer.appendChild(statsDiv);
}

// Create dashboard mini charts (future enhancement)
function createMiniChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    
    const defaultOptions = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            },
            elements: {
                point: {
                    radius: 0
                },
                line: {
                    borderWidth: 2
                }
            },
            animation: {
                duration: 1000
            }
        }
    };
    
    const config = Object.assign({}, defaultOptions, options);
    return new Chart(ctx, config);
}

// Cleanup charts when modal is hidden
document.getElementById('priceChartModal').addEventListener('hidden.bs.modal', function() {
    if (priceChart) {
        priceChart.destroy();
        priceChart = null;
    }
    
    // Remove statistics
    const chartContainer = document.getElementById('priceChart').parentElement;
    const existingStats = chartContainer.querySelector('.chart-stats');
    if (existingStats) {
        existingStats.remove();
    }
});

// Handle window resize for charts
window.addEventListener('resize', debounce(() => {
    if (priceChart) {
        priceChart.resize();
    }
}, 250));