import {
  ListResponse,
  ReadResponse,
  LoginRequest,
  LoginResponse,
  ErrorResponse,
} from "../types";

// API 配置
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

class ApiClient {
  private token: string | null = null;
  private tokenExpireTime: number | null = null;

  constructor() {
    // 从 localStorage 读取 token
    this.loadToken();
  }

  private loadToken() {
    const storedToken = localStorage.getItem("access_token");
    const storedExpire = localStorage.getItem("token_expire");
    if (storedToken && storedExpire) {
      const expireTime = parseInt(storedExpire, 10);
      // 检查是否过期（提前 5 分钟判定过期）
      if (Date.now() < expireTime - 5 * 60 * 1000) {
        this.token = storedToken;
        this.tokenExpireTime = expireTime;
      } else {
        // Token 已过期，清除
        this.clearToken();
      }
    }
  }

  private saveToken(token: string, expiresIn: number) {
    this.token = token;
    this.tokenExpireTime = Date.now() + expiresIn * 1000;
    localStorage.setItem("access_token", token);
    localStorage.setItem("token_expire", this.tokenExpireTime.toString());
  }

  private clearToken() {
    this.token = null;
    this.tokenExpireTime = null;
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_expire");
  }

  get isAuthenticated(): boolean {
    return this.token !== null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 401 未授权，清除 token
    if (response.status === 401) {
      this.clearToken();
      throw new Error("未授权，请重新登录");
    }

    if (!response.ok) {
      let errorMessage = `请求失败: ${response.status}`;
      try {
        const errorData: ErrorResponse = await response.json();
        errorMessage = errorData.detail || errorData.error || errorMessage;
      } catch {
        // Ignore parse error
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async login(password: string): Promise<LoginResponse> {
    const payload: LoginRequest = { password };
    const response = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    this.saveToken(response.access_token, response.expires_in);
    return response;
  }

  logout() {
    this.clearToken();
  }

  async listFiles(
    prefix: string = "",
    path: string = ""
  ): Promise<ListResponse> {
    const params = new URLSearchParams();
    if (prefix) params.append("prefix", prefix);
    if (path) params.append("path", path);

    return this.request<ListResponse>(`/fs/list?${params.toString()}`);
  }

  async readFile(prefix: string, path: string): Promise<ReadResponse> {
    const params = new URLSearchParams();
    if (prefix) params.append("prefix", prefix);
    params.append("path", path);

    return this.request<ReadResponse>(`/fs/read?${params.toString()}`);
  }
}

// 单例实例
export const apiClient = new ApiClient();
