interface Route {
    path: string;
    component: () => Promise<void> | void;
    title: string;
    requiresAuth?: boolean;
}

interface RouteParams {
    [key: string]: string;
}

class SPARouter {
    private routes: Route[] = [];
    private currentRoute: Route | null = null;
    private currentParams: RouteParams = {};

    constructor() {
        this.setupEventListeners();
        this.setupRoutes();
    }

    private setupEventListeners(): void {
        // ブラウザのバック/フォワードボタン対応
        window.addEventListener('popstate', () => {
            this.handleRoute(window.location.pathname + window.location.search);
        });

        // リンククリック時の処理
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            const link = target.closest('a[data-spa-link]') as HTMLAnchorElement;
            
            if (link && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                this.navigate(link.getAttribute('href') || '/');
            }
        });
    }

    private setupRoutes(): void {
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
                path: '/settings',
                component: () => this.showSettings(),
                title: '設定・テスト - SteamSentinel'
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

    public navigate(path: string, replace: boolean = false): void {
        if (replace) {
            window.history.replaceState({}, '', path);
        } else {
            window.history.pushState({}, '', path);
        }
        this.handleRoute(path);
    }

    private async handleRoute(path: string): Promise<void> {
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
        } catch (error) {
            console.error('Route component error:', error);
            this.showError('ページの読み込み中にエラーが発生しました');
        }
    }

    private findRoute(pathname: string): Route | undefined {
        return this.routes.find(route => {
            if (route.path === pathname) {
                return true;
            }
            
            // パラメータ付きルートも将来対応可能
            return false;
        });
    }

    private parseQueryParams(search: string): RouteParams {
        const params: RouteParams = {};
        const urlParams = new URLSearchParams(search);
        
        for (const [key, value] of urlParams.entries()) {
            params[key] = value;
        }
        
        return params;
    }

    private updateNavigationState(pathname: string): void {
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
    
    private async showDashboard(): Promise<void> {
        console.log('Loading dashboard view...');
        // テンプレートを直接ロード
        await this.loadDashboardComponent();
    }

    private async showGames(): Promise<void> {
        console.log('Loading games view...');
        await this.loadGamesComponent();
    }

    private async showAlerts(): Promise<void> {
        console.log('Loading alerts view...');
        await this.loadAlertsComponent();
    }

    private async showExpenses(): Promise<void> {
        console.log('Loading expenses view...');
        await this.loadExpensesComponent();
    }

    private async showMonitoring(): Promise<void> {
        console.log('Loading monitoring view...');
        await this.loadMonitoringComponent();
    }

    private async showLimitations(): Promise<void> {
        console.log('Loading limitations view...');
        await this.loadLimitationsComponent();
    }

    private async showLicenses(): Promise<void> {
        console.log('Loading licenses view...');
        await this.loadLicensesComponent();
    }

    // ===== コンポーネントローダー =====

    private async loadDashboardComponent(): Promise<void> {
        this.loadTemplate('dashboardTemplate');
        
        // DOM要素がレンダリングされるまで少し待機
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 既存のダッシュボード初期化を呼び出し
        if (typeof (window as any).loadDashboardData === 'function') {
            await (window as any).loadDashboardData();
        } else {
            // フォールバックとしてゲームリストを読み込み
            if (typeof (window as any).loadGames === 'function') {
                await (window as any).loadGames();
            }
        }
    }

    private async loadGamesComponent(): Promise<void> {
        this.loadTemplate('gamesTemplate');
        
        // DOM要素がレンダリングされるまで少し待機
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 既存のゲーム管理初期化を呼び出し
        if (typeof (window as any).loadAllGamesData === 'function') {
            await (window as any).loadAllGamesData();
        }
    }

    private async loadAlertsComponent(): Promise<void> {
        this.loadTemplate('alertsTemplate');
        
        // DOM要素がレンダリングされるまで少し待機
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 既存のアラート履歴初期化を呼び出し
        if (typeof (window as any).loadAlertsData === 'function') {
            await (window as any).loadAlertsData();
        }
    }

    private async loadExpensesComponent(): Promise<void> {
        await this.loadExternalPage('/expenses.html');
    }

    private async loadMonitoringComponent(): Promise<void> {
        this.loadTemplate('monitoringTemplate');
        
        // DOM要素がレンダリングされるまで少し待機
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 既存の監視状況初期化を呼び出し
        if (typeof (window as any).loadMonitoringData === 'function') {
            await (window as any).loadMonitoringData();
        }
    }

    private async loadLimitationsComponent(): Promise<void> {
        await this.loadExternalPage('/limitations.html');
    }

    private async loadLicensesComponent(): Promise<void> {
        await this.loadExternalPage('/licenses.html');
    }

    private async showSettings(): Promise<void> {
        this.loadTemplate('settingsTemplate');
        
        // DOM要素がレンダリングされるまで少し待機
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 設定画面の初期化を呼び出し
        if (typeof (window as any).initSettingsPage === 'function') {
            await (window as any).initSettingsPage();
        }
    }

    private loadTemplate(templateId: string): void {
        const template = document.getElementById(templateId) as HTMLTemplateElement;
        const mainContent = document.getElementById('mainContent');
        
        if (template && mainContent) {
            const content = template.content.cloneNode(true);
            mainContent.innerHTML = '';
            mainContent.appendChild(content);
        } else {
            this.showError(`テンプレート ${templateId} が見つかりません`);
        }
    }

    private async loadExternalPage(url: string): Promise<void> {
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
            } else {
                this.showError('ページコンテンツの読み込みに失敗しました');
            }
        } catch (error) {
            console.error('External page loading error:', error);
            this.showError('ページの読み込みに失敗しました');
        }
    }

    private showError(message: string): void {
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

    public getCurrentRoute(): Route | null {
        return this.currentRoute;
    }

    public getCurrentParams(): RouteParams {
        return { ...this.currentParams };
    }

    public init(): void {
        // 初期ルートを処理
        let currentPath = window.location.pathname + window.location.search;
        
        // ルートパスの場合はダッシュボードにリダイレクト
        if (currentPath === '/' || currentPath === '') {
            currentPath = '/dashboard';
            this.navigate('/dashboard', true);
        } else {
            this.handleRoute(currentPath);
        }
    }
    
    // ページロード時に初期化を実行
    public static initializeApp(): void {
        const router = (window as any).router;
        if (router) {
            router.init();
        }
    }
}

// グローバルに公開
(window as any).SPARouter = SPARouter;

// ルーターインスタンスを作成してグローバルに保存
(window as any).router = new SPARouter();

// DOMContentLoaded後に初期化（ナビゲーションの後に実行）
document.addEventListener('DOMContentLoaded', () => {
    // ナビゲーションの初期化を待機
    setTimeout(() => {
        SPARouter.initializeApp();
    }, 100);
});