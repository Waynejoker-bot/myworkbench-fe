class FileBrowserComponent {
  constructor() {
    this.id = "com.workbench.file-browser";
    this.version = "1.1.1";
    this.host = null;
    this.root = null;
    // State
    this.token = null;
    this.files = [];
    this.currentPath = "";
    this.prefix = "";
    this.selectedFile = null;
    this.fileContent = null;
    this.loading = false;
    this.error = null;
    this.showPanel = "list";
    // 'list', 'content', 'split'
    // Markdown rendering state
    this.showRawMarkdown = false;
    // Toggle between rendered and raw markdown
    this.markedLoaded = false;
    // Whether marked.js is loaded
    this.highlightJsLoaded = false;
    // Whether highlight.js is loaded
    // API Base URL
    this.apiBase = this.getApiBaseUrl();
  }
  getApiBaseUrl() {
    if (typeof window !== "undefined") {
      const env = window.__ENV__;
      if (env && env.VITE_API_BASE_URL) {
        return env.VITE_API_BASE_URL;
      }
      return "/api";
    }
    return "/api";
  }
  // ========== Initialization
  async init(context) {
    this.host = context.host;
    console.log("[FileBrowser] Initializing...");
    this.loadToken();
    if (this.token) {
      const saved = this.loadSavedPath();
      const initialPath = saved ? saved.path : "";
      this.prefix = saved?.prefix || "";
      await this.loadFiles(initialPath);
    } else {
      this.showError("\u8BF7\u8F93\u5165\u6587\u4EF6\u8BBF\u95EE\u5BC6\u7801");
      this.renderLogin();
    }
  }
  // ========== Mount ==========
  async mount(element) {
    this.root = element;
    this.render();
    this.setupEventListeners();
  }
  // ========== Unmount ==========
  async unmount() {
    if (this.root) {
      this.root.innerHTML = "";
      this.root = null;
    }
  }
  // ========== Message Handling ==========
  async handleMessage(message) {
    console.log("[FileBrowser] Received message:", message);
  }
  // ========== Health Check ==========
  healthCheck() {
    return this.root !== null;
  }
  // ========== Resize Handler ==========
  onResize(size) {
    console.log("[FileBrowser] Container resized:", size);
    if (size.width < 400 && this.showPanel === "list" && this.fileContent) {
    }
  }
  // ========== API Methods ==========
  async request(endpoint, options = {}) {
    const url = `${this.apiBase}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    const response = await fetch(url, {
      ...options,
      headers
    });
    if (response.status === 401) {
      this.clearToken();
      this.showError("\u672A\u6388\u6743\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55");
      this.renderLogin();
      throw new Error("Unauthorized");
    }
    if (!response.ok) {
      let errorMessage = `\u8BF7\u6C42\u5931\u8D25: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.error || errorMessage;
      } catch {
      }
      throw new Error(errorMessage);
    }
    return response.json();
  }
  async login(password) {
    this.setLoading(true);
    this.clearError();
    try {
      const response = await this.request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ password })
      });
      this.token = response.access_token;
      this.saveToken(response.access_token, response.expires_in);
      this.notifyHost({
        level: "success",
        title: "\u767B\u5F55\u6210\u529F",
        message: "\u5DF2\u8FDE\u63A5\u5230\u6587\u4EF6\u7CFB\u7EDF",
        duration: 2e3
      });
      await this.loadFiles("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "\u767B\u5F55\u5931\u8D25";
      this.showError(message);
      this.notifyHost({
        level: "error",
        title: "\u767B\u5F55\u5931\u8D25",
        message,
        duration: 3e3
      });
    } finally {
      this.setLoading(false);
    }
  }
  async loadFiles(path) {
    if (!this.token) return;
    this.setLoading(true);
    this.clearError();
    try {
      const params = new URLSearchParams();
      if (this.prefix) params.append("prefix", this.prefix);
      if (path) params.append("path", path);
      const response = await this.request(
        `/fs/list?${params.toString()}`
      );
      const basePath = response.full_path.startsWith("/") ? response.full_path : `/${response.full_path}`;
      this.files = response.items.map((item) => ({
        ...item,
        full_path: `${basePath}/${item.name}`.replace(/\/+/g, "/")
      }));
      this.currentPath = response.path;
      this.prefix = response.prefix;
      this.selectedFile = null;
      this.fileContent = null;
      this.savePath();
      this.showPanel = "list";
      this.render();
    } catch (err) {
      const message = err instanceof Error ? err.message : "\u52A0\u8F7D\u5931\u8D25";
      this.showError(message);
      this.render();
    } finally {
      this.setLoading(false);
    }
  }
  async readFile(fullPath) {
    if (!this.token) return;
    this.setLoading(true);
    this.clearError();
    try {
      const params = new URLSearchParams();
      params.append("path", fullPath);
      const response = await this.request(
        `/fs/read?${params.toString()}`
      );
      this.fileContent = response.content;
      this.showPanel = "content";
      this.showRawMarkdown = false;
      await this.loadExternalLibs();
      this.setLoading(false);
      this.render();
    } catch (err) {
      const message = err instanceof Error ? err.message : "\u8BFB\u53D6\u6587\u4EF6\u5931\u8D25";
      this.showError(message);
      this.setLoading(false);
      this.render();
    }
  }
  // ========== Path Persistence ==========
  loadSavedPath() {
    try {
      const storedPath = localStorage.getItem("fb_current_path");
      const storedPrefix = localStorage.getItem("fb_prefix");
      console.log("[FileBrowser] loadSavedPath:", { storedPath, storedPrefix });
      if (storedPath !== null || storedPrefix !== null) {
        return {
          path: storedPath || "",
          prefix: storedPrefix || ""
        };
      }
    } catch {
    }
    return null;
  }
  savePath() {
    try {
      console.log("[FileBrowser] savePath:", { currentPath: this.currentPath, prefix: this.prefix });
      localStorage.setItem("fb_current_path", this.currentPath);
      localStorage.setItem("fb_prefix", this.prefix);
    } catch {
    }
  }
  clearSavedPath() {
    try {
      localStorage.removeItem("fb_current_path");
      localStorage.removeItem("fb_prefix");
    } catch {
    }
  }
  // ========== Token Management ==========
  loadToken() {
    try {
      const storedToken = localStorage.getItem("access_token");
      const storedExpire = localStorage.getItem("token_expire");
      if (storedToken && storedExpire) {
        const expireTime = parseInt(storedExpire, 10);
        if (Date.now() < expireTime - 5 * 60 * 1e3) {
          this.token = storedToken;
        } else {
          this.clearToken();
        }
      }
    } catch {
      this.clearToken();
    }
  }
  saveToken(token, expiresIn) {
    const expireTime = Date.now() + expiresIn * 1e3;
    localStorage.setItem("access_token", token);
    localStorage.setItem("token_expire", expireTime.toString());
  }
  clearToken() {
    this.token = null;
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_expire");
    this.clearSavedPath();
  }
  // ========== State Helpers ==========
  setLoading(value) {
    this.loading = value;
  }
  showError(message) {
    this.error = message;
  }
  clearError() {
    this.error = null;
  }
  // ========== Markdown Helpers ==========
  // Check if file is a markdown file
  isMarkdownFile() {
    if (!this.selectedFile?.name) return false;
    const ext = this.selectedFile.name.split(".").pop()?.toLowerCase();
    return ext === "md" || ext === "markdown";
  }
  // Get language from filename for syntax highlighting
  getLanguage(filename) {
    if (!filename) return "plaintext";
    const ext = filename.split(".").pop()?.toLowerCase();
    const langMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      json: "json",
      xml: "xml",
      html: "html",
      css: "css",
      md: "markdown",
      sh: "bash",
      bash: "bash",
      yaml: "yaml",
      yml: "yaml",
      toml: "toml",
      sql: "sql"
    };
    return langMap[ext || ""] || "plaintext";
  }
  // Load external libraries (marked.js and highlight.js)
  async loadExternalLibs() {
    if (this.markedLoaded && this.highlightJsLoaded) return;
    const loadScript = (src, timeout = 5e3) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout loading ${src}`));
        }, timeout);
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => {
          clearTimeout(timeoutId);
          resolve();
        };
        script.onerror = () => {
          clearTimeout(timeoutId);
          console.warn(`[FileBrowser] Failed to load ${src}, continuing without it`);
          resolve();
        };
        document.head.appendChild(script);
      });
    };
    const loadCSS = (href) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    };
    try {
      if (!this.markedLoaded) {
        await loadScript("https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js");
        this.markedLoaded = true;
      }
      if (!this.highlightJsLoaded) {
        await loadScript("https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/highlight.min.js", 1e4);
        loadCSS("https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css");
        this.highlightJsLoaded = true;
      }
    } catch (err) {
      console.error("[FileBrowser] Failed to load external libraries:", err);
    }
  }
  // Render markdown content to HTML
  renderMarkdown(content) {
    if (typeof window === "undefined") return content;
    const marked = window.marked;
    if (!marked) return content;
    marked.setOptions({
      highlight: (code, lang) => {
        const hljs = window.hljs;
        if (hljs && lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error("[FileBrowser] Highlight error:", err);
          }
        }
        return code;
      },
      breaks: true,
      gfm: true
    });
    try {
      return marked.parse(content);
    } catch (err) {
      console.error("[FileBrowser] Markdown parse error:", err);
      return content;
    }
  }
  // Highlight code for non-markdown files
  highlightCode(content, language) {
    if (typeof window === "undefined") return this.escapeHtml(content);
    const hljs = window.hljs;
    if (!hljs) return this.escapeHtml(content);
    try {
      return hljs.highlight(content, { language }).value;
    } catch (err) {
      console.error("[FileBrowser] Highlight error:", err);
      return this.escapeHtml(content);
    }
  }
  // ========== Event Listeners ==========
  setupEventListeners() {
    if (!this.root) return;
    const loginForm = this.root.querySelector("#loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = this.root?.querySelector("#passwordInput");
        if (input && input.value) {
          this.login(input.value);
        }
      });
    }
    this.root.addEventListener("click", (e) => {
      const target = e.target;
      if (target.closest("#closeBtn")) {
        if (this.host) {
          this.host.ui.close();
        }
        return;
      }
      if (target.closest("#refreshBtn")) {
        this.loading = false;
        if (this.showPanel === "content" && this.selectedFile?.full_path) {
          this.readFile(this.selectedFile.full_path);
        } else {
          this.loadFiles(this.currentPath);
        }
        return;
      }
      if (target.closest("#togglePanelBtn")) {
        this.showPanel = this.showPanel === "list" ? "content" : "list";
        this.render();
        return;
      }
      if (target.closest("#navUpBtn")) {
        if (this.currentPath) {
          const parts = this.currentPath.split("/");
          parts.pop();
          const newPath = parts.join("/");
          this.loadFiles(newPath);
        }
        return;
      }
      if (target.closest("#logoutBtn")) {
        this.clearToken();
        this.renderLogin();
        return;
      }
    });
    this.root.addEventListener("click", (e) => {
      const target = e.target;
      const fileItem = target.closest(".file-item");
      if (fileItem) {
        const index = parseInt(fileItem.dataset.index || "0", 10);
        const item = this.files[index];
        if (item) {
          if (item.type === "directory") {
            const newPath = this.currentPath ? `${this.currentPath}/${item.name}` : item.name;
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
    this.root.addEventListener("click", (e) => {
      const breadcrumb = e.target.closest(".breadcrumb-item");
      if (breadcrumb) {
        const path = breadcrumb.dataset.path || "";
        this.loadFiles(path);
      }
    });
    this.root.addEventListener("click", async (e) => {
      const target = e.target;
      if (target.closest("#toggleMarkdownBtn")) {
        this.showRawMarkdown = !this.showRawMarkdown;
        this.render();
        return;
      }
      if (e.target.closest("#copyContentBtn")) {
        if (this.fileContent) {
          try {
            await navigator.clipboard.writeText(this.fileContent);
            this.notifyHost({
              level: "success",
              title: "\u5DF2\u590D\u5236",
              message: "\u6587\u4EF6\u5185\u5BB9\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F",
              duration: 2e3
            });
          } catch {
            this.notifyHost({
              level: "error",
              title: "\u590D\u5236\u5931\u8D25",
              message: "\u65E0\u6CD5\u590D\u5236\u5230\u526A\u8D34\u677F",
              duration: 2e3
            });
          }
        }
      }
      if (e.target.closest("#downloadBtn")) {
        if (this.fileContent && this.selectedFile) {
          const blob = new Blob([this.fileContent], { type: "text/plain;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = this.selectedFile.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          this.notifyHost({
            level: "success",
            title: "\u4E0B\u8F7D\u4E2D",
            message: `\u6B63\u5728\u4E0B\u8F7D ${this.selectedFile.name}`,
            duration: 2e3
          });
        }
      }
      if (e.target.closest("#copyPathBtn")) {
        const fullPath = this.getFullPath();
        try {
          await navigator.clipboard.writeText(fullPath);
          this.notifyHost({
            level: "success",
            title: "\u5DF2\u590D\u5236",
            message: "\u8DEF\u5F84\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F",
            duration: 1500
          });
        } catch {
          this.notifyHost({
            level: "error",
            title: "\u590D\u5236\u5931\u8D25",
            message: "\u65E0\u6CD5\u590D\u5236\u5230\u526A\u8D34\u677F",
            duration: 2e3
          });
        }
      }
    });
    this.root.addEventListener("contextmenu", (e) => {
      const fileItem = e.target.closest(".file-item");
      if (fileItem) {
        e.preventDefault();
        const index = parseInt(fileItem.dataset.index || "0", 10);
        const item = this.files[index];
        if (item && item.full_path) {
          this.showContextMenu(e.clientX, e.clientY, item.full_path);
        }
      }
    });
  }
  showContextMenu(x, y, path) {
    if (!this.root) return;
    const existingMenu = this.root.querySelector(".context-menu");
    if (existingMenu) {
      existingMenu.remove();
    }
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.innerHTML = `
      <div class="context-menu-item" data-action="copy">
        <span>\u{1F4CB}</span>
        <span>\u590D\u5236\u8DEF\u5F84</span>
      </div>
    `;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.addEventListener("click", (e) => {
      const menuItem = e.target.closest(".context-menu-item");
      const action = menuItem && menuItem.dataset.action;
      if (action === "copy") {
        navigator.clipboard.writeText(path).then(() => {
          this.notifyHost({
            level: "success",
            title: "\u5DF2\u590D\u5236",
            message: "\u8DEF\u5F84\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F",
            duration: 1500
          });
        });
      }
      menu.remove();
    });
    const closeMenu = () => {
      menu.remove();
      document.removeEventListener("click", closeMenu);
    };
    setTimeout(() => document.addEventListener("click", closeMenu), 0);
    this.root.appendChild(menu);
  }
  // ========== Rendering ==========
  render() {
    if (!this.root) return;
    if (!this.token) {
      this.renderLogin();
      return;
    }
    this.root.innerHTML = this.getTemplate();
  }
  renderLogin() {
    if (!this.root) return;
    this.root.innerHTML = `
      <div class="fb-container">
        <div class="fb-login">
          <div class="fb-login-header">
            <span class="fb-icon">\u{1F4C1}</span>
            <h2>\u6587\u4EF6\u6D4F\u89C8\u5668</h2>
          </div>

          ${this.error ? `
            <div class="fb-error">
              ${this.escapeHtml(this.error)}
            </div>
          ` : ""}

          <form id="loginForm" class="fb-login-form">
            <input
              id="passwordInput"
              type="password"
              placeholder="\u8F93\u5165\u8BBF\u95EE\u5BC6\u7801"
              class="fb-input"
              autocomplete="current-password"
              ${this.loading ? "disabled" : ""}
            />
            <button type="submit" class="fb-btn fb-btn-primary" ${this.loading ? "disabled" : ""}>
              ${this.loading ? '<span class="fb-spinner"></span> \u8FDE\u63A5\u4E2D...' : "\u8FDE\u63A5"}
            </button>
          </form>

          <p class="fb-hint">\u8BF7\u8F93\u5165\u6587\u4EF6\u7CFB\u7EDF\u8BBF\u95EE\u5BC6\u7801\u4EE5\u7EE7\u7EED</p>
        </div>

        <button id="closeBtn" class="fb-close-btn" title="\u5173\u95ED">
          \u2715
        </button>
      </div>

      ${this.getStyles()}
      ${this.getLoginStyles()}
    `;
  }
  getTemplate() {
    const canNavigateUp = Boolean(this.currentPath);
    return `
      <div class="fb-container">
        <!-- Header -->
        <div class="fb-header">
          <div class="fb-header-left">
            <span class="fb-icon">\u{1F4C1}</span>
            <div class="fb-breadcrumb">
              ${this.renderBreadcrumb()}
            </div>
            <button
              id="copyPathBtn"
              class="fb-icon-btn"
              title="\u590D\u5236\u8DEF\u5F84"
            >
              \u{1F4CB}
            </button>
          </div>
          <div class="fb-header-right">
            <button
              id="navUpBtn"
              class="fb-icon-btn"
              ${canNavigateUp ? "" : "disabled"}
              title="\u8FD4\u56DE\u4E0A\u7EA7"
            >
              \u2191
            </button>
            <button
              id="refreshBtn"
              class="fb-icon-btn ${this.loading ? "fb-btn-disabled" : ""}"
              title="\u5237\u65B0"
            >
              ${this.loading ? "\u27F3" : "\u{1F504}"}
            </button>
            <button
              id="togglePanelBtn"
              class="fb-icon-btn"
              title="${this.showPanel === "list" ? "\u663E\u793A\u5185\u5BB9" : "\u663E\u793A\u5217\u8868"}"
            >
              ${this.showPanel === "list" ? "\u{1F4C4}" : "\u{1F4CB}"}
            </button>
            <button
              id="logoutBtn"
              class="fb-icon-btn"
              title="\u767B\u51FA"
            >
              \u{1F6AA}
            </button>
            <button
              id="closeBtn"
              class="fb-icon-btn"
              title="\u5173\u95ED"
            >
              \u2715
            </button>
          </div>
        </div>

        <!-- Error Banner -->
        ${this.error ? `
          <div class="fb-error-banner">
            ${this.escapeHtml(this.error)}
          </div>
        ` : ""}

        <!-- Content -->
        <div class="fb-content">
          <!-- File List Panel -->
          <div class="fb-panel ${this.showPanel === "list" ? "fb-panel-visible" : "fb-panel-hidden"}">
            ${this.loading && this.files.length === 0 ? `
              <div class="fb-loading">
                <div class="fb-spinner"></div>
                <p>\u52A0\u8F7D\u4E2D...</p>
              </div>
            ` : this.files.length === 0 ? `
              <div class="fb-empty">
                <span>\u{1F4ED}</span>
                <p>\u6B64\u76EE\u5F55\u4E3A\u7A7A</p>
              </div>
            ` : `
              <div class="fb-file-list">
                ${this.files.map((item, index) => `
                  <div
                    class="file-item ${this.selectedFile && this.selectedFile.name === item.name ? "file-item-selected" : ""}"
                    data-index="${index}"
                  >
                    <span class="file-icon">${item.type === "directory" ? "\u{1F4C1}" : "\u{1F4C4}"}</span>
                    <span class="file-name">${this.escapeHtml(item.name)}</span>
                    ${item.type === "file" && item.size !== null ? `
                      <span class="file-size">${this.formatFileSize(item.size)}</span>
                    ` : ""}
                  </div>
                `).join("")}
              </div>
            `}
          </div>

          <!-- File Content Panel -->
          <div class="fb-panel ${this.showPanel === "content" ? "fb-panel-visible" : "fb-panel-hidden"}">
            ${this.loading ? `
              <div class="fb-loading">
                <div class="fb-spinner"></div>
                <p>\u52A0\u8F7D\u4E2D...</p>
              </div>
            ` : !this.selectedFile ? `
              <div class="fb-empty">
                <span>\u{1F4C4}</span>
                <p>\u9009\u62E9\u6587\u4EF6\u67E5\u770B\u5185\u5BB9</p>
              </div>
            ` : this.selectedFile.type === "directory" ? `
              <div class="fb-empty">
                <span>\u{1F4C1}</span>
                <p>${this.escapeHtml(this.selectedFile.name)}</p>
                <small>\u8FD9\u662F\u4E00\u4E2A\u76EE\u5F55</small>
              </div>
            ` : this.getFileContentTemplate()}
          </div>
        </div>
      </div>

      ${this.getStyles()}
    `;
  }
  // Get file content template with markdown support
  getFileContentTemplate() {
    if (!this.selectedFile || !this.fileContent) return "";
    const isMarkdown = this.isMarkdownFile();
    const language = this.getLanguage(this.selectedFile.name);
    const lines = this.fileContent.split("\n");
    const lineNumbersHtml = lines.map((_, i) => `<div>${i + 1}</div>`).join("");
    return `
      <div class="fb-file-content">
        <div class="fb-content-header">
          <span class="content-filename">${this.escapeHtml(this.selectedFile.name)}</span>
          ${this.selectedFile.size !== null ? `
            <span class="content-filesize">(${this.formatFileSize(this.selectedFile.size)})</span>
          ` : ""}
          <span class="content-language">${language}</span>
          ${isMarkdown ? `
            <button id="toggleMarkdownBtn" class="fb-btn fb-btn-sm" title="${this.showRawMarkdown ? "\u67E5\u770B\u6E32\u67D3\u89C6\u56FE" : "\u67E5\u770B\u539F\u6587"}">
              ${this.showRawMarkdown ? "\u{1F4D6} \u6E32\u67D3" : "\u{1F4DD} \u539F\u6587"}
            </button>
          ` : ""}
          <button id="downloadBtn" class="fb-btn fb-btn-sm" title="\u4E0B\u8F7D\u6587\u4EF6">
            \u2B07\uFE0F
          </button>
          <button id="copyContentBtn" class="fb-btn fb-btn-sm" title="\u590D\u5236\u5185\u5BB9">
            \u{1F4CB}
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
  renderBreadcrumb() {
    const segments = [
      { label: "/", path: "" }
    ];
    if (this.prefix) {
      segments.push({ label: this.prefix, path: "" });
    }
    if (this.currentPath) {
      const parts = this.currentPath.split("/").filter(Boolean);
      parts.forEach((part, index) => {
        const path = parts.slice(0, index + 1).join("/");
        segments.push({ label: part, path });
      });
    }
    return segments.map((seg, index) => `
      <span
        class="breadcrumb-item ${index === segments.length - 1 ? "breadcrumb-current" : ""}"
        data-path="${seg.path}"
      >
        ${this.escapeHtml(seg.label)}
      </span>
      ${index < segments.length - 1 ? '<span class="breadcrumb-sep">\u203A</span>' : ""}
    `).join("");
  }
  // ========== Styles ==========
  getStyles() {
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
  getLoginStyles() {
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
  getFullPath() {
    const path = this.prefix && this.currentPath ? `/${this.prefix}/${this.currentPath}` : this.prefix ? `/${this.prefix}` : this.currentPath ? `/${this.currentPath}` : "/";
    return path.replace(/\/+/g, "/");
  }
  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  notifyHost(options) {
    if (this.host) {
      this.host.ui.notify(options);
    }
  }
}
var file_browser_default = FileBrowserComponent;
export {
  file_browser_default as default
};
//# sourceMappingURL=index.js.map
