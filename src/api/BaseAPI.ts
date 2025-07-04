import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import logger from '../utils/logger';
import { config } from '../config';
import { APIError } from '../types';

export abstract class BaseAPI {
  protected readonly axiosInstance: AxiosInstance;
  protected readonly apiName: string;
  protected lastRequestTime: number = 0;
  protected readonly requestInterval: number;

  constructor(apiName: string, baseURL: string, requestInterval: number = config.apiRequestIntervalSeconds * 1000) {
    this.apiName = apiName;
    this.requestInterval = requestInterval;
    
    this.axiosInstance = axios.create({
      baseURL,
      timeout: config.apiTimeoutSeconds * 1000,
      headers: {
        'User-Agent': 'SteamSentinel/1.0.0'
      }
    });

    // リクエストインターセプター
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        await this.enforceRateLimit();
        return config;
      },
      (error) => {
        logger.error(`${this.apiName} API Request Error:`, error);
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        if (error.response) {
          logger.error(`${this.apiName} API Error Response: ${error.response.status} ${error.response.config.url}`);
          
          // 429 Too Many Requests - 指数バックオフ
          if (error.response.status === 429) {
            const retryAfter = this.getRetryAfter(error.response);
            logger.warn(`${this.apiName} API Rate Limited. Retry after ${retryAfter}ms`);
            
            await this.delay(retryAfter);
            return this.axiosInstance.request(error.config);
          }
        } else if (error.request) {
          logger.error(`${this.apiName} API No Response:`, error.message);
        } else {
          logger.error(`${this.apiName} API Error:`, error.message);
        }
        
        return Promise.reject(this.transformError(error));
      }
    );
  }

  // レート制限の実施
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestInterval) {
      const delay = this.requestInterval - timeSinceLastRequest;
      await this.delay(delay);
    }
    
    this.lastRequestTime = Date.now();
  }

  // 遅延処理
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Retry-Afterヘッダーの取得
  private getRetryAfter(response: AxiosResponse): number {
    const retryAfter = response.headers['retry-after'];
    
    if (retryAfter) {
      // 秒単位の場合
      if (!isNaN(Number(retryAfter))) {
        return Number(retryAfter) * 1000;
      }
      // 日付形式の場合
      const retryDate = new Date(retryAfter);
      if (!isNaN(retryDate.getTime())) {
        return Math.max(retryDate.getTime() - Date.now(), 1000);
      }
    }
    
    // デフォルトの指数バックオフ（1秒から開始、最大60秒）
    return Math.min(1000 * Math.pow(2, this.getRetryCount(response)), 60000);
  }

  // リトライ回数の取得
  private getRetryCount(response: AxiosResponse): number {
    return (response.config as any).__retryCount || 0;
  }

  // エラー変換
  protected transformError(error: any): APIError {
    if (error.response) {
      return {
        code: `${this.apiName}_HTTP_${error.response.status}`,
        message: error.response.data?.message || error.message,
        details: error.response.data
      };
    } else if (error.request) {
      return {
        code: `${this.apiName}_NO_RESPONSE`,
        message: 'No response received from API',
        details: error.message
      };
    } else {
      return {
        code: `${this.apiName}_ERROR`,
        message: error.message,
        details: error
      };
    }
  }

  // 保護されたリクエストメソッド
  protected async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  protected async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  // ヘルスチェック
  abstract healthCheck(): Promise<boolean>;
}