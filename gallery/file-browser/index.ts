/**
 * File Browser Component
 * A file browser component for the Workbench
 */

// ========== Type Definitions ==========

// File System Types
type FileType = "file" | "directory";

interface FileItem {
  name: string;
  type: FileType;
  size: number | null;
  modified_time: string;
  full_path?: string;
}

interface ListResponse {
  success: boolean;
  prefix: string;
  path: string;
  full_path: string;
  items: FileItem[];
}

interface ReadResponse {
  success: boolean;
  prefix: string;
  path: string;
  full_path: string;
  content: string;
  size: number;
  encoding: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  detail?: string;
}

interface HostAPI {
  ui: {
    notify(options: {
      level: 'info' | 'success' | 'warning' | 'error';
      title: string;
      message: string;
      duration?: number;
    }): void;
    resize(width: number, height?: number): void;
    close(): void;
    focus(): void;
  };
  messages?: any;
  sessions?: any;
  input?: any;
  events?: {
    on(event: string, handler: (data?: any) => void): () => void;
    emit(event: string, data?: any): void;
  };
}

interface InitContext {
  host: HostAPI;
  params: Record<string, unknown>;
  session: {
    id: string;
    title?: string;
  };
  config: Record<string, unknown>;
  manifest: any;
}

interface WorkbenchMessage {
  id: string;
  timestamp: number;
  source: string;
  target: string;
  type: string;
  payload: unknown;
}

interface WorkbenchComponent {
  readonly id: string;
  readonly version: string;
  init(context: InitContext): Promise<void> | void;
  mount(element: HTMLElement): Promise<void> | void;
  unmount(): Promise<void> | void;
  handleMessage?(message: WorkbenchMessage): Promise<void> | void;
  onResize?(size: { width: number; height: number }): void;
  healthCheck(): Promise<boolean> | boolean;
}

// ========== File Browser Component ==========

class FileBrowserComponent implements WorkbenchComponent {
  readonly id = 'com.workbench.file-browser';
  readonly version = '1.1.2';

  private host: HostAPI | null = null;
  private root: HTMLElement | null = null;

  // State
  private token: string | null = null;
  private files: FileItem[] = [];
  private currentPath: string = '';
  private prefix: string = '';
  private selectedFile: FileItem | null = null;
  private fileContent: string | null = null;
  private loading = false;
  private error: string | null = null;
  private showPanel = 'list'; // 'list', 'content', 'split'

  // Markdown rendering state
  private showRawMarkdown = false; // Toggle between rendered and raw markdown
  private markedLoaded = false; // Whether marked.js is loaded
  private highlightJsLoaded = false; // Whether highlight.js is loaded

  // API Base URL
  private readonly apiBase = this.getApiBaseUrl();

  private getApiBaseUrl(): string {
    // Try to detect environment
    if (typeof window !== 'undefined') {
      // Check for environment variable
      const env = (window as any).__ENV__;
      if (env && env.VITE_API_BASE_URL) {
        return env.VITE_API_BASE_URL;
      }

      // Always use relative path to work with current domain
      return '/api';
    }
    return '/api';
  }

  // ========== Initialization
  async init(context: InitContext): Promise<void> {
    this.host = context.host;

    console.log('[FileBrowser] Initializing...');

    // Load token from storage
    this.loadToken();

    if (this.token) {
      // 加载保存的路径，如果没有则使用根目录
      const saved = this.loadSavedPath();
      const initialPath = saved ? saved.path : '';
      this.prefix = saved?.prefix || '';
      await this.loadFiles(initialPath);
    } else {
      this.showError('请输入文件访问密码');
      this.renderLogin();
    }
  }

  // ========== Mount ==========
  async mount(element: HTMLElement): Promise<void> {
    this.root = element;
    this.render();

    this.setupEventListeners();
  }

  // ========== Unmount ==========
  async unmount(): Promise<void> {
    if (this.root) {
      this.root.innerHTML = '';
      this.root = null;
    }
  }

  // ========== Message Handling ==========
  async handleMessage(message: WorkbenchMessage): Promise<void> {
    console.log('[FileBrowser] Received message:', message);
  }

  // ========== Health Check ==========
  healthCheck(): boolean {
    return this.root !== null;
  }

  // ========== Resize Handler ==========
  onResize(size: { width: number; height: number }): void {
    console.log('[FileBrowser] Container resized:', size);
    // 组件使用 CSS flex 布局会自动适应，这里可以选择性地处理特殊逻辑
    // 例如根据宽度切换面板显示模式（窄屏时自动切换到单面板模式）
    if (size.width < 400 && this.showPanel === 'list' && this.fileContent) {
      // 窄屏且正在查看文件时，可以考虑自动显示内容面板
      // this.showPanel = 'content';
      // this.render();
    }
  }

  // ========== API Methods ==========

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiBase}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearToken();
      this.showError('未授权，请重新登录');
      this.renderLogin();
      throw new Error('Unauthorized');
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

  private async login(password: string): Promise<void> {
    this.setLoading(true);
    this.clearError();

    try {
      const response = await this.request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });

      this.token = response.access_token;
      this.saveToken(response.access_token, response.expires_in);

      this.notifyHost({
        level: 'success',
        title: '登录成功',
        message: '已连接到文件系统',
        duration: 2000
      });

      // Load files
      await this.loadFiles('');
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';
      this.showError(message);
      this.notifyHost({
        level: 'error',
        title: '登录失败',
        message,
        duration: 3000
      });
    } finally {
      this.setLoading(false);
    }
  }

  private async loadFiles(path: string): Promise<void> {
    if (!this.token) return;

    this.setLoading(true);
    this.clearError();

    try {
      const params = new URLSearchParams();
      if (this.prefix) params.append('prefix', this.prefix);
      if (path) params.append('path', path);

      const response = await this.request<ListResponse>(
        `/fs/list?${params.toString()}`
      );

      // Add full_path to each item
      const basePath = response.full_path.startsWith('/')
        ? response.full_path
        : `/${response.full_path}`;

      this.files = response.items.map(item => ({
        ...item,
        full_path: `${basePath}/${item.name}`.replace(/\/+/g, '/'),
      }));

      this.currentPath = response.path;
      this.prefix = response.prefix;
      this.selectedFile = null;
      this.fileContent = null;

      // 保存当前路径到 localStorage
      this.savePath();
      this.showPanel = 'list';

      this.render();
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      this.showError(message);
      this.render();
    } finally {
      this.setLoading(false);
    }
  }

  private async readFile(fullPath: string): Promise<void> {
    if (!this.token) return;

    this.setLoading(true);
    this.clearError();

    try {
      const params = new URLSearchParams();
      params.append('path', fullPath);

      const response = await this.request<ReadResponse>(
        `/fs/read?${params.toString()}`
      );

      this.fileContent = response.content;
      this.showPanel = 'content';

      // Reset markdown view toggle when loading new file
      this.showRawMarkdown = false;

      // Load external libraries for markdown/code highlighting
      await this.loadExternalLibs();

      this.setLoading(false);
      this.render();
    } catch (err) {
      const message = err instanceof Error ? err.message : '读取文件失败';
      this.showError(message);
      this.setLoading(false);
      this.render();
    }
  }

  // ========== Path Persistence ==========

  private loadSavedPath(): { path: string; prefix: string } | null {
    try {
      const storedPath = localStorage.getItem('fb_current_path');
      const storedPrefix = localStorage.getItem('fb_prefix');
      console.log('[FileBrowser] loadSavedPath:', { storedPath, storedPrefix });
      if (storedPath !== null || storedPrefix !== null) {
        return {
          path: storedPath || '',
          prefix: storedPrefix || ''
        };
      }
    } catch {
      // Ignore parse error
    }
    return null;
  }

  private savePath(): void {
    try {
      console.log('[FileBrowser] savePath:', { currentPath: this.currentPath, prefix: this.prefix });
      localStorage.setItem('fb_current_path', this.currentPath);
      localStorage.setItem('fb_prefix', this.prefix);
    } catch {
      // Ignore storage error
    }
  }

  private clearSavedPath(): void {
    try {
      localStorage.removeItem('fb_current_path');
      localStorage.removeItem('fb_prefix');
    } catch {
      // Ignore
    }
  }

  // ========== Token Management ==========

  private loadToken(): void {
    try {
      const storedToken = localStorage.getItem('access_token');
      const storedExpire = localStorage.getItem('token_expire');
      if (storedToken && storedExpire) {
        const expireTime = parseInt(storedExpire, 10);
        if (Date.now() < expireTime - 5 * 60 * 1000) {
          this.token = storedToken;
        } else {
          this.clearToken();
        }
      }
    } catch {
      this.clearToken();
    }
  }

  private saveToken(token: string, expiresIn: number): void {
    const expireTime = Date.now() + expiresIn * 1000;
    localStorage.setItem('access_token', token);
    localStorage.setItem('token_expire', expireTime.toString());
  }

  private clearToken(): void {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_expire');
    // 清除保存的路径
    this.clearSavedPath();
  }

  // ========== State Helpers ==========

  private setLoading(value: boolean): void {
    this.loading = value;
  }

  private showError(message: string): void {
    this.error = message;
  }

  private clearError(): void {
    this.error = null;
  }

  // ========== Markdown Helpers ==========

  // Check if file is a markdown file
  private isMarkdownFile(): boolean {
    if (!this.selectedFile?.name) return false;
    const ext = this.selectedFile.name.split('.').pop()?.toLowerCase();
    return ext === 'md' || ext === 'markdown';
  }

  // Get language from filename for syntax highlighting
  private getLanguage(filename: string): string {
    if (!filename) return 'plaintext';
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      json: 'json',
      xml: 'xml',
      html: 'html',
      css: 'css',
      md: 'markdown',
      sh: 'bash',
      bash: 'bash',
      yaml: 'yaml',
      yml: 'yaml',
      toml: 'toml',
      sql: 'sql',
    };
    return langMap[ext || ''] || 'plaintext';
  }

  // Load external libraries (marked.js and highlight.js)
  private async loadExternalLibs(): Promise<void> {
    if (this.markedLoaded && this.highlightJsLoaded) return;

    const loadScript = (src: string, timeout = 5000): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }

        // Set timeout
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout loading ${src}`));
        }, timeout);

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
          clearTimeout(timeoutId);
          resolve();
        };
        script.onerror = () => {
          clearTimeout(timeoutId);
          // Don't reject, just log and continue - some languages may not be critical
          console.warn(`[FileBrowser] Failed to load ${src}, continuing without it`);
          resolve();
        };
        document.head.appendChild(script);
      });
    };

    const loadCSS = (href: string): void => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    };

    try {
      // Load marked.js for markdown parsing
      if (!this.markedLoaded) {
        await loadScript('https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js');
        this.markedLoaded = true;
      }

      // Load highlight.js for code highlighting (use bundled version with common languages)
      if (!this.highlightJsLoaded) {
        // Use highlight.min.js which includes common languages (javascript, typescript, python, java, json, bash, yaml, xml, css, markdown, sql, go, rust, cpp, etc.)
        await loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/highlight.min.js', 10000);

        // Load highlight.js theme
        loadCSS('https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css');

        this.highlightJsLoaded = true;
      }
    } catch (err) {
      console.error('[FileBrowser] Failed to load external libraries:', err);
    }
  }

  // Render markdown content to HTML
  private renderMarkdown(content: string): string {
    if (typeof window === 'undefined') return content;
    const marked = (window as any).marked;
    if (!marked) return content;

    // Configure marked with highlight.js
    marked.setOptions({
      highlight: (code: string, lang: string) => {
        const hljs = (window as any).hljs;
        if (hljs && lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error('[FileBrowser] Highlight error:', err);
          }
        }
        return code;
      },
      breaks: true,
      gfm: true,
    });

    try {
      return marked.parse(content);
    } catch (err) {
      console.error('[FileBrowser] Markdown parse error:', err);
      return content;
    }
  }

  // Highlight code for non-markdown files
  private highlightCode(content: string, language: string): string {
    if (typeof window === 'undefined') return this.escapeHtml(content);
    const hljs = (window as any).hljs;
    if (!hljs) return this.escapeHtml(content);

    try {
      return hljs.highlight(content, { language }).value;
    } catch (err) {
      console.error('[FileBrowser] Highlight error:', err);
      return this.escapeHtml(content);
    }
  }

  // ========== Event Listeners ==========

  private setupEventListeners(): void {
    if (!this.root) return;

    // Login form
    const loginForm = this.root.querySelector('#loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = this.root?.querySelector('#passwordInput') as HTMLInputElement;
        if (input && input.value) {
          this.login(input.value);
        }
      });
    }

    // Header buttons - using event delegation
    this.root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Close button
      if (target.closest('#closeBtn')) {
        if (this.host) {
          this.host.ui.close();
        }
        return;
      }

      // Refresh button
      if (target.closest('#refreshBtn')) {
        // 先重置 loading 状态，确保按钮不会卡在 disabled
        this.loading = false;
        if (this.showPanel === 'content' && this.selectedFile?.full_path) {
          this.readFile(this.selectedFile.full_path);
        } else {
          this.loadFiles(this.currentPath);
        }
        return;
      }

      // Toggle panel button
      if (target.closest('#togglePanelBtn')) {
        this.showPanel = this.showPanel === 'list' ? 'content' : 'list';
        this.render();
        return;
      }

      // Navigate up button
      if (target.closest('#navUpBtn')) {
        if (this.currentPath) {
          const parts = this.currentPath.split('/');
          parts.pop();
          const newPath = parts.join('/');
          this.loadFiles(newPath);
        }
        return;
      }

      // Logout button
      if (target.closest('#logoutBtn')) {
        this.clearToken();
        this.renderLogin();
        return;
      }
    });

    // File items (delegated)
    this.root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const fileItem = target.closest('.file-item') as HTMLElement;

      if (fileItem) {
        const index = parseInt(fileItem.dataset.index || '0', 10);
        const item = this.files[index];

        if (item) {
          if (item.type === 'directory') {
            const newPath = this.currentPath
              ? `${this.currentPath}/${item.name}`
              : item.name;
            this.loadFiles(newPath);
          } else {
            this.selectedFile = item;
            if (item.full_path) {
              this.readFile(item.full_path);
            }
          }
        }
      }
    });

    // Breadcrumb clicks
    this.root.addEventListener('click', (e) => {
      const breadcrumb = (e.target as HTMLElement).closest('.breadcrumb-item') as HTMLElement;
      if (breadcrumb) {
        const path = breadcrumb.dataset.path || '';
        this.loadFiles(path);
      }
    });

    // Copy content button & Toggle markdown button & Download button & Copy path button
    this.root.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;

      // Toggle markdown view
      if (target.closest('#toggleMarkdownBtn')) {
        this.showRawMarkdown = !this.showRawMarkdown;
        this.render();
        return;
      }

      // Copy content
      if ((e.target as HTMLElement).closest('#copyContentBtn')) {
        if (this.fileContent) {
          try {
            await navigator.clipboard.writeText(this.fileContent);
            this.notifyHost({
              level: 'success',
              title: '已复制',
              message: '文件内容已复制到剪贴板',
              duration: 2000
            });
          } catch {
            this.notifyHost({
              level: 'error',
              title: '复制失败',
              message: '无法复制到剪贴板',
              duration: 2000
            });
          }
        }
      }

      // Download file
      if ((e.target as HTMLElement).closest('#downloadBtn')) {
        if (this.fileContent && this.selectedFile) {
          const blob = new Blob([this.fileContent], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = this.selectedFile.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          this.notifyHost({
            level: 'success',
            title: '下载中',
            message: `正在下载 ${this.selectedFile.name}`,
            duration: 2000
          });
        }
      }

      // Copy current path (from breadcrumb)
      if ((e.target as HTMLElement).closest('#copyPathBtn')) {
        const fullPath = this.getFullPath();
        try {
          await navigator.clipboard.writeText(fullPath);
          this.notifyHost({
            level: 'success',
            title: '已复制',
            message: '路径已复制到剪贴板',
            duration: 1500
          });
        } catch {
          this.notifyHost({
            level: 'error',
            title: '复制失败',
            message: '无法复制到剪贴板',
            duration: 2000
          });
        }
      }
    });

    // Context menu for file items
    this.root.addEventListener('contextmenu', (e) => {
      const fileItem = (e.target as HTMLElement).closest('.file-item') as HTMLElement;
      if (fileItem) {
        e.preventDefault();
        const index = parseInt(fileItem.dataset.index || '0', 10);
        const item = this.files[index];
        if (item && item.full_path) {
          this.showContextMenu(e.clientX, e.clientY, item.full_path);
        }
      }
    });
  }

  private showContextMenu(x: number, y: number, path: string): void {
    if (!this.root) return;

    // Remove existing menu
    const existingMenu = this.root.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
      <div class="context-menu-item" data-action="copy">
        <span>📋</span>
        <span>复制路径</span>
      </div>
    `;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    menu.addEventListener('click', (e) => {
      const menuItem = (e.target as HTMLElement).closest('.context-menu-item') as HTMLElement;
      const action = menuItem && menuItem.dataset.action;
      if (action === 'copy') {
        navigator.clipboard.writeText(path).then(() => {
          this.notifyHost({
            level: 'success',
            title: '已复制',
            message: '路径已复制到剪贴板',
            duration: 1500
          });
        });
      }
      menu.remove();
    });

    // Close on outside click
    const closeMenu = () => {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);

    this.root.appendChild(menu);
  }

  // ========== Rendering ==========

  private render(): void {
    if (!this.root) return;

    if (!this.token) {
      this.renderLogin();
      return;
    }

    this.root.innerHTML = this.getTemplate();
  }

  private renderLogin(): void {
    if (!this.root) return;

    this.root.innerHTML = `
      <div class="fb-container">
        <div class="fb-login">
          <div class="fb-login-header">
            <span class="fb-icon">📁</span>
            <h2>文件浏览器</h2>
          </div>

          ${this.error ? `
            <div class="fb-error">
              ${this.escapeHtml(this.error)}
            </div>
          ` : ''}

          <form id="loginForm" class="fb-login-form">
            <input
              id="passwordInput"
              type="password"
              placeholder="输入访问密码"
              class="fb-input"
              autocomplete="current-password"
              ${this.loading ? 'disabled' : ''}
            />
            <button type="submit" class="fb-btn fb-btn-primary" ${this.loading ? 'disabled' : ''}>
              ${this.loading ? '<span class="fb-spinner"></span> 连接中...' : '连接'}
            </button>
          </form>

          <p class="fb-hint">请输入文件系统访问密码以继续</p>
        </div>

        <button id="closeBtn" class="fb-close-btn" title="关闭">
          ✕
        </button>
      </div>

      ${this.getStyles()}
      ${this.getLoginStyles()}
    `;
  }

  private getTemplate(): string {
    const canNavigateUp = Boolean(this.currentPath);

    return `
      <div class="fb-container">
        <!-- Header -->
        <div class="fb-header">
          <div class="fb-header-left">
            <span class="fb-icon">📁</span>
            <div class="fb-breadcrumb">
              ${this.renderBreadcrumb()}
            </div>
            <button
              id="copyPathBtn"
              class="fb-icon-btn"
              title="复制路径"
            >
              📋
            </button>
          </div>
          <div class="fb-header-right">
            <button
              id="navUpBtn"
              class="fb-icon-btn"
              ${canNavigateUp ? '' : 'disabled'}
              title="返回上级"
            >
              ↑
            </button>
            <button
              id="refreshBtn"
              class="fb-icon-btn ${this.loading ? 'fb-btn-disabled' : ''}"
              title="刷新"
            >
              ${this.loading ? '⟳' : '🔄'}
            </button>
            <button
              id="togglePanelBtn"
              class="fb-icon-btn"
              title="${this.showPanel === 'list' ? '显示内容' : '显示列表'}"
            >
              ${this.showPanel === 'list' ? '📄' : '📋'}
            </button>
            <button
              id="logoutBtn"
              class="fb-icon-btn"
              title="登出"
            >
              🚪
            </button>
            <button
              id="closeBtn"
              class="fb-icon-btn"
              title="关闭"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Error Banner -->
        ${this.error ? `
          <div class="fb-error-banner">
            ${this.escapeHtml(this.error)}
          </div>
        ` : ''}

        <!-- Content -->
        <div class="fb-content">
          <!-- File List Panel -->
          <div class="fb-panel ${this.showPanel === 'list' ? 'fb-panel-visible' : 'fb-panel-hidden'}">
            ${this.loading && this.files.length === 0 ? `
              <div class="fb-loading">
                <div class="fb-spinner"></div>
                <p>加载中...</p>
              </div>
            ` : this.files.length === 0 ? `
              <div class="fb-empty">
                <span>📭</span>
                <p>此目录为空</p>
              </div>
            ` : `
              <div class="fb-file-list">
                ${this.files.map((item, index) => `
                  <div
                    class="file-item ${(this.selectedFile && this.selectedFile.name === item.name) ? 'file-item-selected' : ''}"
                    data-index="${index}"
                  >
                    <span class="file-icon">${item.type === 'directory' ? '📁' : '📄'}</span>
                    <span class="file-name">${this.escapeHtml(item.name)}</span>
                    ${item.type === 'file' && item.size !== null ? `
                      <span class="file-size">${this.formatFileSize(item.size)}</span>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- File Content Panel -->
          <div class="fb-panel ${this.showPanel === 'content' ? 'fb-panel-visible' : 'fb-panel-hidden'}">
            ${this.loading ? `
              <div class="fb-loading">
                <div class="fb-spinner"></div>
                <p>加载中...</p>
              </div>
            ` : !this.selectedFile ? `
              <div class="fb-empty">
                <span>📄</span>
                <p>选择文件查看内容</p>
              </div>
            ` : this.selectedFile.type === 'directory' ? `
              <div class="fb-empty">
                <span>📁</span>
                <p>${this.escapeHtml(this.selectedFile.name)}</p>
                <small>这是一个目录</small>
              </div>
            ` : this.getFileContentTemplate()}
          </div>
        </div>
      </div>

      ${this.getStyles()}
    `;
  }

  // Get file content template with markdown support
  private getFileContentTemplate(): string {
    if (!this.selectedFile || !this.fileContent) return '';

    const isMarkdown = this.isMarkdownFile();
    const language = this.getLanguage(this.selectedFile.name);

    // Pre-generate line numbers HTML
    const lines = this.fileContent.split('\n');
    const lineNumbersHtml = lines.map((_, i) => `<div>${i + 1}</div>`).join('');

    return `
      <div class="fb-file-content">
        <div class="fb-content-header">
          <span class="content-filename">${this.escapeHtml(this.selectedFile.name)}</span>
          ${this.selectedFile.size !== null ? `
            <span class="content-filesize">(${this.formatFileSize(this.selectedFile.size)})</span>
          ` : ''}
          <span class="content-language">${language}</span>
          ${isMarkdown ? `
            <button id="toggleMarkdownBtn" class="fb-btn fb-btn-sm" title="${this.showRawMarkdown ? '查看渲染视图' : '查看原文'}">
              ${this.showRawMarkdown ? '📖 渲染' : '📝 原文'}
            </button>
          ` : ''}
          <button id="downloadBtn" class="fb-btn fb-btn-sm" title="下载文件">
            ⬇️
          </button>
          <button id="copyContentBtn" class="fb-btn fb-btn-sm" title="复制内容">
            📋
          </button>
        </div>
        <div class="fb-content-body">
          ${isMarkdown && !this.showRawMarkdown ? `
            <div class="fb-markdown">
              ${this.renderMarkdown(this.fileContent)}
            </div>
          ` : `
            <div class="fb-code-container">
              <div class="fb-code-linenumbers">${lineNumbersHtml}</div>
              <pre class="fb-code"><code>${this.highlightCode(this.fileContent, language)}</code></pre>
            </div>
          `}
        </div>
      </div>
    `;
  }

  private renderBreadcrumb(): string {
    const segments: { label: string; path: string }[] = [
      { label: '/', path: '' }
    ];

    if (this.prefix) {
      segments.push({ label: this.prefix, path: '' });
    }

    if (this.currentPath) {
      const parts = this.currentPath.split('/').filter(Boolean);
      parts.forEach((part, index) => {
        const path = parts.slice(0, index + 1).join('/');
        segments.push({ label: part, path });
      });
    }

    return segments.map((seg, index) => `
      <span
        class="breadcrumb-item ${index === segments.length - 1 ? 'breadcrumb-current' : ''}"
        data-path="${seg.path}"
      >
        ${this.escapeHtml(seg.label)}
      </span>
      ${index < segments.length - 1 ? '<span class="breadcrumb-sep">›</span>' : ''}
    `).join('');
  }

  // ========== Styles ==========

  private getStyles(): string {
    return `
      <style>
        .fb-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          width: 100%;
          height: 100%;
          max-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          color: #1f2937;
          overflow: hidden;
        }

        /* Header */
        .fb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          gap: 12px;
        }

        .fb-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .fb-header-right {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .fb-icon {
          font-size: 16px;
        }

        .fb-icon-btn {
          padding: 6px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fb-icon-btn:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .fb-icon-btn:disabled,
        .fb-icon-btn.fb-btn-disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Breadcrumb */
        .fb-breadcrumb {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          overflow-x: auto;
          min-width: 0;
        }

        .breadcrumb-item {
          color: #6b7280;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          transition: background 0.15s;
        }

        .breadcrumb-item:hover {
          background: #e5e7eb;
          color: #1f2937;
        }

        .breadcrumb-current {
          color: #1f2937;
          font-weight: 500;
          cursor: default;
        }

        .breadcrumb-sep {
          color: #9ca3af;
        }

        /* Error Banner */
        .fb-error-banner {
          padding: 8px 12px;
          background: #fef2f2;
          border-bottom: 1px solid #fecaca;
          color: #dc2626;
          font-size: 13px;
        }

        /* Content */
        .fb-content {
          flex: 1;
          display: flex;
          overflow: hidden;
          min-height: 0;
        }

        .fb-panel {
          flex: 1;
          overflow: hidden;
          min-height: 0;
          transition: opacity 0.15s;
        }

        .fb-panel-visible {
          opacity: 1;
        }

        .fb-panel-hidden {
          display: none;
        }

        /* File List */
        .fb-file-list {
          padding: 8px 0;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          cursor: pointer;
          transition: background 0.1s;
          border-radius: 6px;
          margin: 2px 8px;
        }

        .file-item:hover {
          background: #f3f4f6;
        }

        .file-item-selected {
          background: #e0e7ff;
        }

        .file-icon {
  font-size: 14px;
        }

        .file-name {
          flex: 1;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #374151;
        }

        .file-size {
          font-size: 11px;
          color: #9ca3af;
          shrink: 0;
        }

        /* File Content */
        .fb-file-content {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .fb-content-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          shrink: 0;
        }

        .content-filename {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }

        .content-filesize {
          font-size: 11px;
          color: #9ca3af;
        }

        .fb-content-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: auto;
          min-height: 0;
          padding-right: 8px;
        }

        .content-language {
          font-size: 11px;
          color: #9ca3af;
        }

        /* Code Container with Line Numbers */
        .fb-code-container {
          display: flex;
          border-radius: 6px;
          overflow: hidden;
        }

        .fb-code-linenumbers {
          padding: 12px 8px;
          text-align: right;
          user-select: none;
          border-right: 1px solid #e5e7eb;
          background: #f9fafb;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 12px;
          line-height: 1.6;
          color: #9ca3af;
          min-width: 50px;
          flex-shrink: 0;
        }

        .fb-code-linenumbers div {
          padding: 0 4px;
        }

        .fb-code {
          flex: 1;
          margin: 0;
          font-size: 12px;
          line-height: 1.6;
          background: #ffffff;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          white-space: pre;
          min-width: 0;
        }

        .fb-code code {
          background: transparent;
          padding: 12px;
          display: block;
        }

        /* Markdown Content */
        .fb-markdown {
          padding: 16px;
          line-height: 1.7;
          max-width: 100%;
          overflow-wrap: break-word;
        }

        .fb-markdown h1,
        .fb-markdown h2,
        .fb-markdown h3,
        .fb-markdown h4,
        .fb-markdown h5,
        .fb-markdown h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
          line-height: 1.3;
        }

        .fb-markdown h1 {
          font-size: 1.5em;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.3em;
        }

        .fb-markdown h2 {
          font-size: 1.3em;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.3em;
        }

        .fb-markdown h3 {
          font-size: 1.15em;
        }

        .fb-markdown p {
          margin: 0.75em 0;
        }

        .fb-markdown ul,
        .fb-markdown ol {
          padding-left: 2em;
          margin: 0.75em 0;
        }

        .fb-markdown li {
          margin: 0.25em 0;
        }

        .fb-markdown code {
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.9em;
        }

        .fb-markdown pre {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
          overflow-x: auto;
          margin: 1em 0;
        }

        .fb-markdown pre code {
          background: transparent;
          padding: 0;
        }

        .fb-markdown blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1em;
          margin: 1em 0;
          color: #6b7280;
        }

        .fb-markdown a {
          color: #3b82f6;
          text-decoration: none;
        }

        .fb-markdown a:hover {
          text-decoration: underline;
        }

        .fb-markdown table {
          border-collapse: collapse;
          width: 100%;
          max-width: 100%;
          margin: 1em 0;
          overflow-x: auto;
          display: block;
        }

        .fb-markdown table th,
        .fb-markdown table td {
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
          text-align: left;
          min-width: 50px;
        }

        .fb-markdown table th {
          background: #f9fafb;
          font-weight: 600;
        }

        .fb-markdown img {
          max-width: 100%;
          height: auto;
        }

        .fb-markdown hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 2em 0;
        }

        /* Highlight.js theme overrides */
        .fb-markdown .hljs {
          background: #f9fafb;
          padding: 12px;
          border-radius: 6px;
        }

        /* Loading */
        .fb-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: #6b7280;
        }

        .fb-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Empty */
        .fb-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: #6b7280;
        }

        .fb-empty span {
          font-size: 32px;
        }

        .fb-empty small {
          font-size: 12px;
        }

        /* Context Menu */
        .context-menu {
          position: fixed;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          min-width: 120px;
        }

        .context-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.1s;
        }

        .context-menu-item:hover {
          background: #f3f4f6;
        }
      </style>
    `;
  }

  private getLoginStyles(): string {
    return `
      <style>
        .fb-login {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          padding: 40px;
        }

        .fb-login-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .fb-login-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .fb-login-form {
          display: flex;
          gap: 8px;
          width: 100%;
          max-width: 300px;
        }

        .fb-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }

        .fb-input:focus {
          border-color: #3b82f6;
        }

        .fb-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .fb-btn {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }

        .fb-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .fb-btn-primary {
          background: #3b82f6;
          color: white;
        }

        .fb-btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .fb-btn-sm {
          padding: 4 px 8px;
          font-size: 12px;
        }

        .fb-error {
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
          font-size: 13px;
        }

        .fb-hint {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
        }

        .fb-close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 6px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          color: #6b7280;
          transition: background 0.15s;
        }

        .fb-close-btn:hover {
          background: #e5e7eb;
        }
      </style>
    `;
  }

  // ========== Utilities ==========

  private getFullPath(): string {
    const path = this.prefix && this.currentPath
      ? `/${this.prefix}/${this.currentPath}`
      : this.prefix
      ? `/${this.prefix}`
      : this.currentPath
      ? `/${this.currentPath}`
      : '/';
    return path.replace(/\/+/g, '/');
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private notifyHost(options: {
    level: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    duration?: number;
  }): void {
    if (this.host) {
      this.host.ui.notify(options);
    }
  }
}

// ========== Export ==========

// Export the component class as default ES6 module export
export default FileBrowserComponent;
