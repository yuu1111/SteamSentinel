import { Request, Response, NextFunction } from 'express';
import { ApiResponseHelper } from '../utils/apiResponse';
import logger from '../utils/logger';

// サポートされているAPIバージョン
export const SUPPORTED_VERSIONS = ['v1', 'v2'];
export const DEFAULT_VERSION = 'v1';
export const LATEST_VERSION = 'v1';

// バージョン取得インターフェース
export interface VersionedRequest extends Request {
  apiVersion?: string;
}

/**
 * APIバージョンを解析してリクエストに追加
 * Accept-Versionヘッダー、URLパス、クエリパラメータの順で確認
 */
export const extractVersion = (req: VersionedRequest, res: Response, next: NextFunction): Response | void => {
  try {
    let version: string | undefined;

    // 1. Accept-Versionヘッダーから取得（推奨）
    const acceptVersion = req.headers['accept-version'] as string;
    if (acceptVersion) {
      version = acceptVersion.toLowerCase();
    }

    // 2. URLパスから取得（/api/v1/...）
    if (!version) {
      const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
      if (pathMatch) {
        version = pathMatch[1];
      }
    }

    // 3. クエリパラメータから取得（?version=v1）
    if (!version && req.query.version) {
      version = (req.query.version as string).toLowerCase();
    }

    // デフォルトバージョンを使用
    if (!version) {
      version = DEFAULT_VERSION;
    }

    // バージョンの検証
    if (!SUPPORTED_VERSIONS.includes(version)) {
      return ApiResponseHelper.error(
        res,
        `サポートされていないAPIバージョンです: ${version}`,
        400,
        {
          supportedVersions: SUPPORTED_VERSIONS,
          requestedVersion: version
        }
      );
    }

    // リクエストにバージョンを追加
    req.apiVersion = version;
    
    // レスポンスヘッダーにバージョン情報を追加
    res.setHeader('X-API-Version', version);
    res.setHeader('X-API-Latest-Version', LATEST_VERSION);
    res.setHeader('X-API-Supported-Versions', SUPPORTED_VERSIONS.join(', '));

    next();
  } catch (error) {
    logger.error('Error extracting API version:', error);
    next();
  }
};

/**
 * 特定のバージョンが必要なエンドポイント用のミドルウェア
 */
export const requireVersion = (minVersion: string) => {
  return (req: VersionedRequest, res: Response, next: NextFunction): Response | void => {
    const currentVersion = req.apiVersion || DEFAULT_VERSION;
    const currentVersionNum = parseInt(currentVersion.replace('v', ''));
    const minVersionNum = parseInt(minVersion.replace('v', ''));

    if (currentVersionNum < minVersionNum) {
      return ApiResponseHelper.error(
        res,
        `このエンドポイントにはAPIバージョン ${minVersion} 以上が必要です`,
        400,
        {
          currentVersion,
          requiredVersion: minVersion,
          upgradeInstructions: 'Accept-Version ヘッダーに適切なバージョンを設定してください'
        }
      );
    }

    next();
  };
};

/**
 * 非推奨エンドポイント用のミドルウェア
 */
export const deprecatedEndpoint = (deprecatedIn: string, removedIn?: string, alternative?: string) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    const warning = `このエンドポイントはバージョン ${deprecatedIn} で非推奨となりました`;
    const details: any = { deprecatedIn };

    if (removedIn) {
      details.removedIn = removedIn;
      details.message = `バージョン ${removedIn} で削除予定です`;
    }

    if (alternative) {
      details.alternative = alternative;
    }

    // 非推奨警告ヘッダーを追加
    res.setHeader('X-API-Deprecation-Warning', warning);
    res.setHeader('X-API-Deprecation-Details', JSON.stringify(details));

    // ログに記録
    logger.warn('Deprecated endpoint accessed:', {
      path: _req.path,
      method: _req.method,
      ...details
    });

    next();
  };
};

/**
 * バージョン別ルーティング
 */
export const versionRouter = (versions: { [key: string]: (req: Request, res: Response) => void }) => {
  return (req: VersionedRequest, res: Response): Response | void => {
    const version = req.apiVersion || DEFAULT_VERSION;
    const handler = versions[version] || versions.default;

    if (!handler) {
      return ApiResponseHelper.error(
        res,
        `バージョン ${version} はこのエンドポイントでサポートされていません`,
        400
      );
    }

    handler(req, res);
  };
};

/**
 * バージョン情報エンドポイント用のハンドラー
 */
export const getVersionInfo = (_req: Request, res: Response): Response => {
  return ApiResponseHelper.success(res, {
    current: LATEST_VERSION,
    supported: SUPPORTED_VERSIONS,
    deprecated: [],
    endpoints: {
      v1: {
        status: 'active',
        releaseDate: '2024-01-01',
        description: '初期リリースバージョン'
      }
    }
  }, 'APIバージョン情報');
};