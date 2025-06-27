"use strict";
class NavigationBar {
    config;
    currentPage;
    constructor() {
        this.currentPage = this.detectCurrentPage();
        this.config = this.getNavigationConfig();
    }
    detectCurrentPage() {
        const path = window.location.pathname;
        if (path === '/expenses')
            return 'expenses';
        if (path === '/limitations')
            return 'limitations';
        if (path === '/licenses')
            return 'licenses';
        if (path === '/games')
            return 'games';
        if (path === '/alerts')
            return 'alerts';
        if (path === '/monitoring')
            return 'monitoring';
        if (path === '/settings')
            return 'settings';
        if (path === '/' || path === '/dashboard')
            return 'dashboard';
        return 'dashboard';
    }
    getNavigationConfig() {
        return {
            brand: {
                name: 'SteamSentinel',
                icon: 'bi-controller'
            },
            leftItems: [
                {
                    id: 'dashboard',
                    label: 'ダッシュボード',
                    icon: 'bi-house-door',
                    href: '/dashboard',
                    active: this.currentPage === 'dashboard'
                },
                {
                    id: 'games',
                    label: 'ゲーム管理',
                    icon: 'bi-collection',
                    href: '/games',
                    active: this.currentPage === 'games'
                },
                {
                    id: 'alerts',
                    label: 'アラート履歴',
                    icon: 'bi-bell',
                    href: '/alerts',
                    active: this.currentPage === 'alerts'
                },
                {
                    id: 'expenses',
                    label: '出費追跡',
                    icon: 'bi-pie-chart',
                    href: '/expenses',
                    active: this.currentPage === 'expenses'
                },
                {
                    id: 'health',
                    label: '監視状況',
                    icon: 'bi-activity',
                    href: '/monitoring',
                    active: this.currentPage === 'monitoring'
                }
            ],
            rightItems: [
                {
                    id: 'update',
                    label: '手動更新',
                    icon: 'bi-arrow-clockwise',
                    onclick: "runManualMonitoring()"
                },
                {
                    id: 'settings',
                    label: '設定・テスト',
                    icon: 'bi-gear',
                    href: '/settings',
                    active: this.currentPage === 'settings'
                },
                {
                    id: 'limitations',
                    label: '制限事項',
                    icon: 'bi-exclamation-triangle',
                    href: '/limitations'
                },
                {
                    id: 'licenses',
                    label: 'ライセンス',
                    icon: 'bi-file-text',
                    href: '/licenses'
                },
                {
                    id: 'darkmode',
                    label: 'ダークモード',
                    icon: 'bi-moon-fill',
                    onclick: "toggleDarkMode()"
                }
            ]
        };
    }
    createNavItem(item, isLeftNav = true) {
        const isActive = item.active;
        const activeClass = isActive ? 'active' : '';
        if (item.href) {
            // SPAルーティング対応リンク
            if (isLeftNav) {
                return `
                    <li class="nav-item">
                        <a class="nav-link ${activeClass}" href="${item.href}" data-spa-link data-spa-route="${item.href}">
                            <i class="${item.icon} me-1"></i>${item.label}
                        </a>
                    </li>
                `;
            }
            else {
                return `
                    <li class="nav-item">
                        <a class="btn btn-outline-light btn-sm me-2" href="${item.href}" data-spa-link>
                            <i class="${item.icon} me-1"></i>${item.label}
                        </a>
                    </li>
                `;
            }
        }
        else if (item.onclick) {
            // JavaScript関数呼び出しの場合
            if (isLeftNav) {
                return `
                    <li class="nav-item">
                        <a class="nav-link ${activeClass}" href="#" onclick="${item.onclick}">
                            <i class="${item.icon} me-1"></i>${item.label}
                        </a>
                    </li>
                `;
            }
            else {
                // 右側のボタン
                const isDarkMode = item.id === 'darkmode';
                const iconOnly = isDarkMode; // ダークモードボタンはアイコンのみ
                return `
                    <li class="nav-item">
                        <button class="btn btn-outline-light btn-sm${!iconOnly ? ' me-2' : ''}" 
                                onclick="${item.onclick}" 
                                ${isDarkMode ? 'id="darkModeToggle"' : ''}>
                            <i class="${isDarkMode ? 'bi bi-moon-fill' : item.icon}${!iconOnly ? ' me-1' : ''}" ${isDarkMode ? 'id="darkModeIcon"' : ''}></i>${iconOnly ? '' : item.label}
                        </button>
                    </li>
                `;
            }
        }
        return '';
    }
    render() {
        const leftNavItems = this.config.leftItems
            .map(item => this.createNavItem(item, true))
            .join('');
        const rightNavItems = this.config.rightItems
            .map(item => this.createNavItem(item, false))
            .join('');
        return `
            <nav class="navbar navbar-expand-lg navbar-dark bg-primary sticky-top">
                <div class="container-fluid">
                    <a class="navbar-brand" href="/dashboard" data-spa-link>
                        <i class="${this.config.brand.icon} me-2"></i>
                        ${this.config.brand.name}
                    </a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" 
                            data-bs-target="#navbarNav" aria-controls="navbarNav" 
                            aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav me-auto">
                            ${leftNavItems}
                        </ul>
                        <ul class="navbar-nav">
                            ${rightNavItems}
                        </ul>
                    </div>
                </div>
            </nav>
        `;
    }
    mount(elementId = 'navigation-container') {
        const container = document.getElementById(elementId);
        if (container) {
            container.innerHTML = this.render();
            this.attachEventListeners();
            this.updateDarkModeIcon();
        }
        else {
            console.error(`Navigation container with id '${elementId}' not found`);
        }
    }
    attachEventListeners() {
        // ページ固有の関数が存在するかチェックしてイベントリスナーを設定
        if (this.currentPage === 'dashboard') {
            // メインページのナビゲーションクリックイベント
            const navLinks = document.querySelectorAll('.nav-link[onclick]');
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    // アクティブ状態を更新
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                });
            });
        }
    }
    updateDarkModeIcon() {
        const isDarkMode = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const darkModeBtn = document.getElementById('darkModeToggle');
        if (darkModeBtn) {
            const icon = darkModeBtn.querySelector('i');
            if (icon) {
                icon.className = isDarkMode ? 'bi-sun-fill' : 'bi-moon-fill';
            }
        }
    }
    updateActiveState(activeId) {
        // 左側ナビゲーションのアクティブ状態を更新
        this.config.leftItems.forEach(item => {
            item.active = item.id === activeId;
        });
        this.mount();
    }
}
// グローバルに公開
window.NavigationBar = NavigationBar;
// ページ読み込み時に自動初期化
document.addEventListener('DOMContentLoaded', () => {
    const nav = new NavigationBar();
    nav.mount();
});
//# sourceMappingURL=navigation.js.map