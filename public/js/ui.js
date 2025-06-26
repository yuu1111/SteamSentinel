// UI Helper Functions for SteamSentinel

// Loading state management
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('d-none');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('d-none');
    }
}

// Alert/Toast message system
function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    const alertId = 'alert-' + Date.now();
    const iconMap = {
        success: 'check-circle-fill',
        error: 'exclamation-triangle-fill',
        warning: 'exclamation-triangle-fill',
        info: 'info-circle-fill'
    };
    
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show" role="alert">
            <i class="bi bi-${iconMap[type]} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    // Auto-dismiss after duration
    if (duration > 0) {
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                const bsAlert = bootstrap.Alert.getOrCreateInstance(alertElement);
                bsAlert.close();
            }
        }, duration);
    }
}

function showSuccess(message, duration = 5000) {
    showAlert(message, 'success', duration);
}

function showError(message, duration = 8000) {
    showAlert(message, 'error', duration);
}

function showWarning(message, duration = 6000) {
    showAlert(message, 'warning', duration);
}

function showInfo(message, duration = 5000) {
    showAlert(message, 'info', duration);
}

// Dark mode management
function initializeDarkMode() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let theme = savedTheme;
    if (!theme) {
        theme = systemPrefersDark ? 'dark' : 'light';
    }
    
    setTheme(theme);
    updateDarkModeIcon(theme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            setTheme(newTheme);
            updateDarkModeIcon(newTheme);
        }
    });
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    setTheme(newTheme);
    updateDarkModeIcon(newTheme);
    localStorage.setItem('theme', newTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    
    // Update chart.js theme if charts exist
    if (window.Chart && window.Chart.defaults) {
        const textColor = theme === 'dark' ? '#ffffff' : '#333333';
        const gridColor = theme === 'dark' ? '#404040' : '#e0e0e0';
        
        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = gridColor;
        Chart.defaults.backgroundColor = gridColor;
        
        // Update existing charts
        Chart.instances.forEach(chart => {
            chart.options.scales = chart.options.scales || {};
            if (chart.options.scales.x) {
                chart.options.scales.x.ticks = chart.options.scales.x.ticks || {};
                chart.options.scales.x.ticks.color = textColor;
                chart.options.scales.x.grid = chart.options.scales.x.grid || {};
                chart.options.scales.x.grid.color = gridColor;
            }
            if (chart.options.scales.y) {
                chart.options.scales.y.ticks = chart.options.scales.y.ticks || {};
                chart.options.scales.y.ticks.color = textColor;
                chart.options.scales.y.grid = chart.options.scales.y.grid || {};
                chart.options.scales.y.grid.color = gridColor;
            }
            chart.update();
        });
    }
}

function updateDarkModeIcon(theme) {
    const darkModeIcon = document.getElementById('darkModeIcon');
    if (darkModeIcon) {
        darkModeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    }
}

// Format helper functions
function formatPrice(price, currency = 'JPY') {
    if (price === null || price === undefined || price === 0) {
        return '-';
    }
    
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatRelativeTime(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    const intervals = [
        { label: '年', seconds: 31536000 },
        { label: 'ヶ月', seconds: 2592000 },
        { label: '日', seconds: 86400 },
        { label: '時間', seconds: 3600 },
        { label: '分', seconds: 60 }
    ];
    
    for (const interval of intervals) {
        const count = Math.floor(diffInSeconds / interval.seconds);
        if (count > 0) {
            return `${count}${interval.label}前`;
        }
    }
    
    return 'たった今';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
        return `${hours}時間${minutes}分`;
    } else if (minutes > 0) {
        return `${minutes}分${remainingSeconds}秒`;
    } else {
        return `${remainingSeconds}秒`;
    }
}

// Form validation helpers
function validateSteamAppId(appId) {
    const id = parseInt(appId);
    return !isNaN(id) && id > 0 && id <= 2147483647;
}

function validateGameName(name) {
    return name && name.trim().length >= 2 && name.trim().length <= 255;
}

function validatePrice(price) {
    if (!price) return true; // Optional field
    const num = parseFloat(price);
    return !isNaN(num) && num >= 0;
}

// Utility functions
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).then(() => {
            showSuccess('クリップボードにコピーしました');
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            showError('クリップボードへのコピーに失敗しました');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showSuccess('クリップボードにコピーしました');
        } catch (err) {
            console.error('Fallback: Failed to copy to clipboard:', err);
            showError('クリップボードへのコピーに失敗しました');
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

// Modal helpers
function showConfirmDialog(title, message, onConfirm, onCancel) {
    // Simple confirm dialog - can be enhanced with custom modal
    if (confirm(`${title}\n\n${message}`)) {
        if (onConfirm) onConfirm();
    } else {
        if (onCancel) onCancel();
    }
}

// Animation helpers
function animateCounter(element, target, duration = 1000) {
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16); // 60fps
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Error boundary
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showError('予期しないエラーが発生しました。ページを再読み込みしてください。');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showError('通信エラーが発生しました。しばらく待ってから再試行してください。');
});