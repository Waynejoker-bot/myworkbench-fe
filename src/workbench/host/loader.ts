/**
 * ComponentLoader - 组件加载器
 * 负责加载远程组件资源、验证权限、缓存管理
 */

import type { ComponentManifest, ComponentLoadStrategy } from '../types/component';
import type { HostSecurityConfig } from '../types/host';
import { isValidUrl } from '../utils/validator';
import { logger } from '../utils/logger';

const log = logger.child('ComponentLoader');

/**
 * 组件缓存条目
 */
interface CacheEntry {
  manifest: ComponentManifest;
  timestamp: number;
  etag?: string;
  resources: Map<string, string>; // URL -> content
}

/**
 * ComponentLoader 类
 */
export class ComponentLoader {
  private cache = new Map<string, CacheEntry>();
  private cacheTimeout = 5 * 60 * 1000; // 5 分钟缓存

  constructor(private security: HostSecurityConfig = {}) {}

  /**
   * 加载组件清单
   */
  async loadManifest(manifestUrl: string): Promise<ComponentManifest> {
    if (!isValidUrl(manifestUrl)) {
      throw new Error(`Invalid manifest URL: ${manifestUrl}`);
    }

    // 检查缓存
    const cached = this.cache.get(manifestUrl);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      log.debug('Returning cached manifest', { url: manifestUrl });
      return cached.manifest;
    }

    // 获取清单
    log.info('Loading manifest', { url: manifestUrl });
    const response = await this.fetchWithSecurity(manifestUrl);

    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    log.info('Manifest raw response', { url: manifestUrl, status: response.status, contentType: response.headers.get('content-type'), textLength: text.length });
    // 打印前 200 个字符用于调试
    log.info('Manifest raw text preview', { preview: text.substring(0, Math.min(200, text.length)) });
    log.debug('Manifest raw text', { text });

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      log.error('Failed to parse manifest JSON', { text, error: e });
      throw new Error(`Failed to parse manifest JSON: ${e}`);
    }

    // 转换 Kubernetes 风格的 manifest 为内部格式
    let manifest: ComponentManifest;
    let componentName = '';
    if (parsed.kind === 'Component' && parsed.metadata) {
      // 后端返回的 Kubernetes 风格格式
      const meta = parsed.metadata;
      const spec = parsed.spec || {};
      componentName = meta.name || '';

      // 确保 entry 是有效的路径格式
      // 资源文件从 /market/components/{componentName}/ 路径加载
      let entry = spec.entry || 'index.ts';
      // 将纯文件名转换为 /market/components/{componentName}/filename 格式
      if (!entry.startsWith('/') && !entry.startsWith('./') && !entry.startsWith('../') && !entry.startsWith('http')) {
        entry = `/market/components/${componentName}/${entry}`;
      } else if (entry.startsWith('./')) {
        entry = `/market/components/${componentName}/${entry.substring(2)}`;
      }

      // 同样处理 styles
      let styles: string[] | undefined;
      if (spec.styles && Array.isArray(spec.styles)) {
        styles = spec.styles.map((style: string) => {
          if (!style.startsWith('/') && !style.startsWith('./') && !style.startsWith('../') && !style.startsWith('http')) {
            return `/market/components/${componentName}/${style}`;
          } else if (style.startsWith('./')) {
            return `/market/components/${componentName}/${style.substring(2)}`;
          }
          return style;
        });
      }

      manifest = {
        name: componentName,
        version: meta.version || '1.0.0',
        description: meta.description || '',
        author: meta.author || '',
        icon: meta.icon,
        entry: entry,
        styles: styles,
        assets: spec.assets,
        capabilities: spec.capabilities || { required: [], optional: [], provided: [] },
        dependencies: spec.dependencies,
        security: spec.permissions ? { permissions: spec.permissions, csp: spec.csp } : meta.security,
        configSchema: spec.configSchema
      };
      log.info('Converted Kubernetes-style manifest to internal format', { entry, styles });
    } else {
      // 标准格式 - 需要处理相对路径
      manifest = parsed as ComponentManifest;

      // 从 manifestUrl 中提取组件名
      // 例如: /market/components/todolist/manifest.json -> todolist
      const urlParts = manifestUrl.split('/');
      const componentName = urlParts[urlParts.length - 2] || manifest.name || '';

      // 处理 entry 相对路径
      if (manifest.entry) {
        let entry = manifest.entry;
        if (!entry.startsWith('/') && !entry.startsWith('http')) {
          if (entry.startsWith('./')) {
            entry = `/market/components/${componentName}/${entry.substring(2)}`;
          } else {
            entry = `/market/components/${componentName}/${entry}`;
          }
        }
        manifest.entry = entry;
      }

      // 处理 styles 相对路径
      if (manifest.styles && Array.isArray(manifest.styles)) {
        manifest.styles = manifest.styles.map((style: string) => {
          if (!style.startsWith('/') && !style.startsWith('http')) {
            if (style.startsWith('./')) {
              return `/market/components/${componentName}/${style.substring(2)}`;
            }
            return `/market/components/${componentName}/${style}`;
          }
          return style;
        });
      }

      log.info('Processed standard format manifest with relative paths', {
        entry: manifest.entry,
        styles: manifest.styles
      });
    }

    log.info('Manifest parsed', {
      name: manifest?.name,
      version: manifest?.version,
      hasVersion: 'version' in manifest,
      allKeys: Object.keys(manifest || {})
    });

    // 验证清单
    this.validateManifest(manifest);

    // 验证来源（仅对完整 URL 进行来源验证）
    if (manifestUrl.startsWith('http://') || manifestUrl.startsWith('https://')) {
      this.validateOrigin(new URL(manifestUrl).origin);
    }

    // 验证权限
    this.validatePermissions(manifest);

    // 缓存清单
    this.cache.set(manifestUrl, {
      manifest,
      timestamp: Date.now(),
      etag: response.headers.get('etag') || undefined,
      resources: new Map()
    });

    log.info('Manifest loaded successfully', {
      name: manifest.name,
      version: manifest.version
    });

    return manifest;
  }

  /**
   * 加载组件资源
   */
  async loadResources(
    manifestUrl: string,
    manifest: ComponentManifest
  ): Promise<ComponentLoadStrategy> {
    const cache = this.cache.get(manifestUrl);
    if (!cache) {
      throw new Error('Manifest not cached');
    }

    // 解析相对路径为完整 URL
    const resolveUrl = (relativePath: string): string => {
      // 如果已经是完整 URL，直接返回
      if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath;
      }

      // 对于相对路径，需要基于 manifest URL 的目录来解析
      if (manifestUrl.startsWith('http://') || manifestUrl.startsWith('https://')) {
        // manifestUrl 是完整 URL，可以使用 URL API
        return new URL(relativePath, manifestUrl).href;
      } else {
        // manifestUrl 是相对路径，手动拼接
        // 获取 manifest URL 所在的目录路径
        const manifestDir = manifestUrl.substring(0, manifestUrl.lastIndexOf('/'));
        // 处理相对路径
        let path = relativePath;
        if (path.startsWith('./')) {
          path = path.substring(2);
        } else if (path.startsWith('../')) {
          // 简单处理 ../，实际可能需要更复杂的逻辑
          const lastSlash = manifestDir.lastIndexOf('/');
          path = manifestDir.substring(0, lastSlash) + '/' + path.substring(3);
        } else if (!path.startsWith('/')) {
          // 纯文件名，直接拼接到目录路径
          path = manifestDir + '/' + path;
        }
        return path;
      }
    };

    // 加载 JavaScript
    const jsUrl = resolveUrl(manifest.entry);
    const jsContent = await this.loadResource(jsUrl, cache);
    const jsBlobUrl = this.createBlobUrl(jsContent, 'application/javascript');

    // 加载 CSS
    const cssUrls: string[] = [];
    if (manifest.styles) {
      for (const styleUrl of manifest.styles) {
        const resolvedCssUrl = resolveUrl(styleUrl);
        const cssContent = await this.loadResource(resolvedCssUrl, cache);
        cssUrls.push(this.createBlobUrl(cssContent, 'text/css'));
      }
    }

    return {
      remote: {
        jsUrl: jsBlobUrl,
        cssUrl: cssUrls.length > 0 ? cssUrls : undefined,
        version: manifest.version,
        integrity: undefined // TODO: 支持 SRI
      }
    };
  }

  /**
   * 清除缓存
   */
  clearCache(manifestUrl?: string): void {
    if (manifestUrl) {
      this.cache.delete(manifestUrl);
      log.info('Cleared cache for manifest', { url: manifestUrl });
    } else {
      this.cache.clear();
      log.info('Cleared all cache');
    }
  }

  /**
   * 设置缓存超时
   */
  setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
  }

  /**
   * 验证组件清单
   */
  private validateManifest(manifest: ComponentManifest): void {
    // 验证版本号
    const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
    if (!versionRegex.test(manifest.version)) {
      throw new Error(`Invalid version format: ${manifest.version}`);
    }

    // 验证入口 URL
    if (!isValidUrl(manifest.entry)) {
      throw new Error(`Invalid entry URL: ${manifest.entry}`);
    }

    // 验证样式 URL
    if (manifest.styles) {
      for (const styleUrl of manifest.styles) {
        if (!isValidUrl(styleUrl)) {
          throw new Error(`Invalid style URL: ${styleUrl}`);
        }
      }
    }

    log.debug('Manifest validated');
  }

  /**
   * 验证来源
   */
  private validateOrigin(origin: string): void {
    const allowedOrigins = this.security.allowedOrigins || [];

    // 允许所有来源（开发环境）
    if (allowedOrigins.includes('*')) {
      return;
    }

    // 检查来源白名单
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === origin) {
        return true;
      }

      // 支持子域名匹配
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        return origin.endsWith(`.${domain}`) || origin === domain;
      }

      return false;
    });

    if (!isAllowed) {
      throw new Error(`Origin not allowed: ${origin}`);
    }

    log.debug('Origin validated', { origin });
  }

  /**
   * 验证权限
   */
  private validatePermissions(manifest: ComponentManifest): void {
    const requested = manifest.security?.permissions || [];
    const allowed = this.security.allowedPermissions || ['*'];

    for (const permission of requested) {
      if (!allowed.includes('*') && !allowed.includes(permission)) {
        throw new Error(`Permission denied: ${permission}`);
      }
    }

    log.debug('Permissions validated', { count: requested.length });
  }

  /**
   * 加载单个资源
   */
  private async loadResource(
    url: string,
    cache: CacheEntry
  ): Promise<string> {
    // 检查缓存
    if (cache.resources.has(url)) {
      return cache.resources.get(url)!;
    }

    log.debug('Loading resource', { url });
    const response = await this.fetchWithSecurity(url);

    if (!response.ok) {
      throw new Error(`Failed to load resource: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    cache.resources.set(url, content);

    return content;
  }

  /**
   * 带安全设置的 fetch
   */
  private async fetchWithSecurity(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers();

    // 复制现有 headers
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => headers.set(key, value));
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => headers.set(key, value));
      } else {
        Object.entries(options.headers).forEach(([key, value]) => {
          if (value !== undefined) {
            headers.set(key, String(value));
          }
        });
      }
    }

    // 添加 CSP 头
    if (this.security.csp) {
      headers.set('Content-Security-Policy', this.security.csp);
    }

    // 对于相对路径，使用 same-origin 模式；对于绝对 URL，使用 cors 模式
    const isRelativeUrl = url.startsWith('/') || url.startsWith('./') || url.startsWith('../');

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'omit', // 不发送凭证
      mode: isRelativeUrl ? 'same-origin' : 'cors' // 根据路径类型选择模式
    });

    return response;
  }

  /**
   * 创建 Blob URL
   */
  private createBlobUrl(content: string, mimeType: string): string {
    const blob = new Blob([content], { type: mimeType });
    return URL.createObjectURL(blob);
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * 获取资源内容（用于 Shadow DOM 方案）
   * @param resourceUrl - 资源 URL（完整路径）
   * @returns 资源内容字符串
   */
  async getResourceContent(resourceUrl: string): Promise<string> {
    const response = await this.fetchWithSecurity(resourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to load resource: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  }

  /**
   * 获取资源内容（通过 manifest URL 和相对路径）
   * @param manifestUrl - manifest URL（用于解析相对路径）
   * @param relativePath - 相对路径（如 "./index.js"）
   * @returns 资源内容字符串
   */
  async loadResourceContent(manifestUrl: string, relativePath: string): Promise<string> {
    const cache = this.cache.get(manifestUrl);
    if (!cache) {
      throw new Error('Manifest not cached');
    }

    // 解析相对路径为完整 URL
    const resolveUrl = (path: string): string => {
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
      }
      if (manifestUrl.startsWith('http://') || manifestUrl.startsWith('https://')) {
        return new URL(path, manifestUrl).href;
      }
      // 相对路径手动拼接
      const manifestDir = manifestUrl.substring(0, manifestUrl.lastIndexOf('/'));
      if (path.startsWith('./')) {
        path = path.substring(2);
      } else if (path.startsWith('../')) {
        const lastSlash = manifestDir.lastIndexOf('/');
        path = manifestDir.substring(0, lastSlash) + '/' + path.substring(3);
      } else if (!path.startsWith('/')) {
        path = manifestDir + '/' + path;
      }
      return path;
    };

    const fullUrl = resolveUrl(relativePath);
    return await this.getResourceContent(fullUrl);
  }
}

/**
 * 创建默认的 ComponentLoader
 */
export function createComponentLoader(
  security?: HostSecurityConfig
): ComponentLoader {
  return new ComponentLoader(security);
}
