"use strict";
class SPARouter {
    routes = [];
    currentRoute = null;
    currentParams = {};
    constructor() {
        this.setupEventListeners();
        this.setupRoutes();
    }
    setupEventListeners() {
        // ブラウザのバック/フォワードボタン対応
        window.addEventListener('popstate', () => {
            this.handleRoute(window.location.pathname + window.location.search);
        });
        // リンククリック時の処理
        document.addEventListener('click', (event) => {
            const target = event.target;
            const link = target.closest('a[data-spa-link]');
            if (link && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                this.navigate(link.getAttribute('href') || '/');
            }
        });
    }
    setupRoutes() {
        this.routes = [
            {
                path: '/',
                component: () => this.showDashboard(),
                title: 'ダッシュボード - SteamSentinel'
            },
            {
                path: '/dashboard',
                component: () => this.showDashboard(),
                title: 'ダッシュボード - SteamSentinel'
            },
            {
                path: '/games',
                component: () => this.showGames(),
                title: 'ゲーム管理 - SteamSentinel'
            },
            {
                path: '/alerts',
                component: () => this.showAlerts(),
                title: 'アラート履歴 - SteamSentinel'
            },
            {
                path: '/expenses',
                component: () => this.showExpenses(),
                title: '出費追跡 - SteamSentinel'
            },
            {
                path: '/monitoring',
                component: () => this.showMonitoring(),
                title: '監視状況 - SteamSentinel'
            },
            {
                path: '/limitations',
                component: () => this.showLimitations(),
                title: '制限事項・注意点 - SteamSentinel'
            },
            {
                path: '/licenses',
                component: () => this.showLicenses(),
                title: 'ライセンス情報 - SteamSentinel'
            }
        ];
    }
    navigate(path, replace = false) {
        if (replace) {
            window.history.replaceState({}, '', path);
        }
        else {
            window.history.pushState({}, '', path);
        }
        this.handleRoute(path);
    }
    async handleRoute(path) {
        // クエリパラメータを解析
        const [pathname, search] = path.split('?');
        this.currentParams = this.parseQueryParams(search || '');
        // ルートを検索
        const route = this.findRoute(pathname);
        if (!route) {
            // 404エラー - ダッシュボードにリダイレクト
            this.navigate('/dashboard', true);
            return;
        }
        this.currentRoute = route;
        // タイトルを更新
        document.title = route.title;
        // ナビゲーションのアクティブ状態を更新
        this.updateNavigationState(pathname);
        try {
            // コンポーネントを実行
            await route.component();
        }
        catch (error) {
            console.error('Route component error:', error);
            this.showError('ページの読み込み中にエラーが発生しました');
        }
    }
    findRoute(pathname) {
        return this.routes.find(route => {
            if (route.path === pathname) {
                return true;
            }
            // パラメータ付きルートも将来対応可能
            return false;
        });
    }
    parseQueryParams(search) {
        const params = {};
        const urlParams = new URLSearchParams(search);
        for (const [key, value] of urlParams.entries()) {
            params[key] = value;
        }
        return params;
    }
    updateNavigationState(pathname) {
        // ナビゲーションバーのアクティブ状態を更新
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));
        // 現在のページに対応するナビゲーションリンクをアクティブに
        const currentNavLink = document.querySelector(`[data-spa-route="${pathname}"]`);
        if (currentNavLink) {
            currentNavLink.classList.add('active');
        }
    }
    // ===== ビューコンポーネント =====
    async showDashboard() {
        console.log('Loading dashboard view...');
        // テンプレートを直接ロード
        await this.loadDashboardComponent();
    }
    async showGames() {
        console.log('Loading games view...');
        await this.loadGamesComponent();
    }
    async showAlerts() {
        console.log('Loading alerts view...');
        await this.loadAlertsComponent();
    }
    async showExpenses() {
        console.log('Loading expenses view...');
        await this.loadExpensesComponent();
    }
    async showMonitoring() {
        console.log('Loading monitoring view...');
        await this.loadMonitoringComponent();
    }
    async showLimitations() {
        console.log('Loading limitations view...');
        await this.loadLimitationsComponent();
    }
    async showLicenses() {
        console.log('Loading licenses view...');
        await this.loadLicensesComponent();
    }
    // ===== コンポーネントローダー =====
    async loadDashboardComponent() {
        this.loadTemplate('dashboardTemplate');
        // DOM要素がレンダリングされるまで少し待機
        await new Promise(resolve => setTimeout(resolve, 50));
        // 既存のダッシュボード初期化を呼び出し
        if (typeof window.loadDashboardData === 'function') {
            await window.loadDashboardData();
        }
        else {
            // フォールバックとしてゲームリストを読み込み
            if (typeof window.loadGames === 'function') {
                await window.loadGames();
            }
        }
    }
    async loadGamesComponent() {
        this.loadTemplate('gamesTemplate');
        // DOM要素がレンダリングされるまで少し待機
        await new Promise(resolve => setTimeout(resolve, 50));
        // 既存のゲーム管理初期化を呼び出し
        if (typeof window.loadAllGamesData === 'function') {
            await window.loadAllGamesData();
        }
    }
    async loadAlertsComponent() {
        this.loadTemplate('alertsTemplate');
        // DOM要素がレンダリングされるまで少し待機
        await new Promise(resolve => setTimeout(resolve, 50));
        // 既存のアラート履歴初期化を呼び出し
        if (typeof window.loadAlertsData === 'function') {
            await window.loadAlertsData();
        }
    }
    async loadExpensesComponent() {
        await this.loadExternalPage('/expenses.html');
    }
    async loadMonitoringComponent() {
        this.loadTemplate('monitoringTemplate');
        // DOM要素がレンダリングされるまで少し待機
        await new Promise(resolve => setTimeout(resolve, 50));
        // 既存の監視状況初期化を呼び出し
        if (typeof window.loadMonitoringData === 'function') {
            await window.loadMonitoringData();
        }
    }
    async loadLimitationsComponent() {
        await this.loadExternalPage('/limitations.html');
    }
    async loadLicensesComponent() {
        await this.loadExternalPage('/licenses.html');
    }
    loadTemplate(templateId) {
        const template = document.getElementById(templateId);
        const mainContent = document.getElementById('mainContent');
        if (template && mainContent) {
            const content = template.content.cloneNode(true);
            mainContent.innerHTML = '';
            mainContent.appendChild(content);
        }
        else {
            this.showError(`テンプレート ${templateId} が見つかりません`);
        }
    }
    async loadExternalPage(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load page: ${response.status}`);
            }
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            // メインコンテンツ部分のみを抽出
            const mainElement = doc.querySelector('main');
            const mainContent = document.getElementById('mainContent');
            if (mainElement && mainContent) {
                mainContent.innerHTML = mainElement.innerHTML;
            }
            else {
                this.showError('ページコンテンツの読み込みに失敗しました');
            }
        }
        catch (error) {
            console.error('External page loading error:', error);
            this.showError('ページの読み込みに失敗しました');
        }
    }
    showError(message) {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${message}
                </div>
            `;
        }
    }
    // ===== パブリックメソッド =====
    getCurrentRoute() {
        return this.currentRoute;
    }
    getCurrentParams() {
        return { ...this.currentParams };
    }
    init() {
        // 初期ルートを処理
        let currentPath = window.location.pathname + window.location.search;
        // ルートパスの場合はダッシュボードにリダイレクト
        if (currentPath === '/' || currentPath === '') {
            currentPath = '/dashboard';
            this.navigate('/dashboard', true);
        }
        else {
            this.handleRoute(currentPath);
        }
    }
    // ページロード時に初期化を実行
    static initializeApp() {
        const router = window.router;
        if (router) {
            router.init();
        }
    }
}
// グローバルに公開
window.SPARouter = SPARouter;
// ルーターインスタンスを作成してグローバルに保存
window.router = new SPARouter();
// DOMContentLoaded後に初期化（ナビゲーションの後に実行）
document.addEventListener('DOMContentLoaded', () => {
    // ナビゲーションの初期化を待機
    setTimeout(() => {
        SPARouter.initializeApp();
    }, 100);
});
//# sourceMappingURL=router.js.map