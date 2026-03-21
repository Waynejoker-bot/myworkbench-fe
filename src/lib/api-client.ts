// API 配置
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// 401 未授权事件
export const AUTH_UNAUTHORIZED_EVENT = "api:unauthorized";

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

  getToken(): string | null {
    return this.token;
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
      credentials: "include", // 发送 cookie
    });

    // 401 未授权，清除 token 并触发事件
    if (response.status === 401) {
      this.clearToken();
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
      throw new Error("未授权，请重新登录");
    }

    if (!response.ok) {
      let errorMessage = `请求失败: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.error || errorMessage;
      } catch {
        // Ignore parse error
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async login(password: string): Promise<{ access_token: string; expires_in: number }> {
    const response = await this.request<{ access_token: string; expires_in: number }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });

    this.saveToken(response.access_token, response.expires_in);
    return response;
  }

  logout() {
    this.clearToken();
  }

  // 通用请求方法
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // 文件系统相关方法
  async listFiles(prefix: string = "", path: string = ""): Promise<{
    success: boolean;
    prefix: string;
    path: string;
    full_path: string;
    items: Array<{
      name: string;
      type: "file" | "directory";
      size: number | null;
      modified_time: string;
      full_path?: string;
    }>;
  }> {
    const params = new URLSearchParams();
    if (prefix) params.append("prefix", prefix);
    if (path) params.append("path", path);
    return this.request(`/api/fs/list?${params.toString()}`);
  }

  async readFile(prefix: string, path: string): Promise<{
    success: boolean;
    prefix: string;
    path: string;
    full_path: string;
    content: string;
    size: number;
    encoding: string;
  }> {
    const params = new URLSearchParams();
    if (prefix) params.append("prefix", prefix);
    params.append("path", path);
    return this.request(`/api/fs/read?${params.toString()}`);
  }

  // FormData 上传（用于文件上传，不设置 Content-Type）
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {};

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (response.status === 401) {
      this.clearToken();
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
      throw new Error("未授权，请重新登录");
    }

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status}`);
    }

    return response.json();
  }
}

// 单例实例
export const apiClient = new ApiClient();
