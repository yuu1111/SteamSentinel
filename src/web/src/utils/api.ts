import { ApiResponse } from '../types'

class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = '/api'
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      }

      const response = await fetch(url, config)
      
      if (!response.ok) {
        // エラーレスポンスの詳細を取得
        try {
          const errorData = await response.json()
          // サーバーからのエラーメッセージがある場合はそれを使用
          if (errorData.error) {
            throw new Error(errorData.error)
          }
        } catch {
          // JSONパースエラーの場合は通常のHTTPエラー
        }
        
        // HTTPステータスコードに基づくエラーメッセージ
        if (response.status === 409) {
          throw new Error('このゲームは既に登録されています')
        } else if (response.status === 400) {
          throw new Error('無効なSteam App IDまたはSteam APIに接続できません')
        } else if (response.status === 404) {
          throw new Error('指定されたリソースが見つかりません')
        } else {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      }

      const data = await response.json()
      return data
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient()
export default api