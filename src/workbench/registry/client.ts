/**
 * Component Registry Client
 *
 * 组件注册表客户端
 * 负责获取组件市场信息（纯静态文件，无需后端 API）
 */

import type {
  ComponentInfo,
  ComponentManifest
} from './types';

/**
 * 注册表数据结构
 */
interface RegistryData {
  version: string;
  components: ComponentInfo[];
  lastUpdated: string;
}

/**
 * API 客户端配置
 */
export interface ClientConfig {
  /** 组件资源基础路径 */
  apiBase?: string;

  /** 注册表文件路径 */
  registryUrl?: string;

  /** 请求超时时间 (毫秒) */
  timeout?: number;

  /** 请求头 */
  headers?: Record<string, string>;
}

/**
 * 组件注册表客户端
 */
export class ComponentRegistryClient {
  private apiBase: string;
  private registryUrl: string;
  private timeout: number;
  private headers: Record<string, string>;
  private cachedRegistry: RegistryData | null = null;
  private cacheTime: number = 0;
  private cacheTTL: number = 60000; // 1 分钟缓存

  constructor(config: ClientConfig = {}) {
    this.apiBase = config.apiBase || '/market/components';
    this.registryUrl = config.registryUrl || '/market/registry.json';
    this.timeout = config.timeout || 30000;
    this.headers = config.headers || {};
  }

  /**
   * 获取注册表数据
   */
  private async getRegistry(): Promise<RegistryData> {
    // 检查缓存
    if (this.cachedRegistry && Date.now() - this.cacheTime < this.cacheTTL) {
      return this.cachedRegistry;
    }

    const response = await this.fetchWithTimeout(this.registryUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch registry: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as RegistryData;
    this.cachedRegistry = data;
    this.cacheTime = Date.now();

    return data;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cachedRegistry = null;
    this.cacheTime = 0;
  }

  /**
   * 列出所有组件
   */
  async list(): Promise<ComponentInfo[]> {
    const registry = await this.getRegistry();
    return registry.components;
  }

  /**
   * 获取指定组件信息
   * @param name - 组件名称
   * @returns 组件信息，如果组件不存在则返回 null
   */
  async get(name: string): Promise<ComponentInfo | null> {
    const registry = await this.getRegistry();
    return registry.components.find(c => c.name === name) || null;
  }

  /**
   * 获取组件 manifest
   * @param name - 组件名称
   * @returns 组件清单
   */
  async getManifest(name: string): Promise<ComponentManifest> {
    const url = `${this.apiBase}/${encodeURIComponent(name)}/manifest.json`;
    const response = await this.fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch component manifest: ${response.status} ${response.statusText}`);
    }

    const manifest = (await response.json()) as ComponentManifest;
    return manifest;
  }

  /**
   * 获取组件入口文件内容
   * @param name - 组件名称
   * @returns 组件入口文件内容
   */
  async getEntry(name: string): Promise<string> {
    const url = `${this.apiBase}/${encodeURIComponent(name)}/index.js`;
    const response = await this.fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch component entry: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * 获取组件 manifest URL
   * @param name - 组件名称
   * @returns manifest 文件 URL
   */
  getManifestUrl(name: string): string {
    return `${this.apiBase}/${encodeURIComponent(name)}/manifest.json`;
  }

  /**
   * 获取组件 entry URL
   * @param name - 组件名称
   * @returns entry 文件 URL
   */
  getEntryUrl(name: string): string {
    return `${this.apiBase}/${encodeURIComponent(name)}/index.js`;
  }

  /**
   * 获取组件资源 URL
   * @param name - 组件名称
   * @param filename - 文件名
   * @returns 资源文件 URL
   */
  getResourceUrl(name: string, filename: string): string {
    return `${this.apiBase}/${encodeURIComponent(name)}/${encodeURIComponent(filename)}`;
  }

  /**
   * 检查组件是否存在
   * @param name - 组件名称
   * @returns 组件是否存在
   */
  async exists(name: string): Promise<boolean> {
    const component = await this.get(name);
    return component !== null;
  }

  /**
   * 带超时的 fetch 请求
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.headers,
          ...options.headers
        }
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout: ${url}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * 创建默认的组件注册表客户端
 */
export function createComponentRegistryClient(
  config?: ClientConfig
): ComponentRegistryClient {
  return new ComponentRegistryClient(config);
}

/**
 * 单例实例
 */
let defaultClient: ComponentRegistryClient | null = null;

/**
 * 获取默认的组件注册表客户端
 */
export function getComponentRegistryClient(): ComponentRegistryClient {
  if (!defaultClient) {
    defaultClient = new ComponentRegistryClient();
  }
  return defaultClient;
}
