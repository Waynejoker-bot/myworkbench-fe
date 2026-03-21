/**
 * TodoList Component
 * An elegant todo list management component inspired by Wunderlist
 */
// ========== TodoList Component ==========
class TodoListComponent {
    constructor() {
        this.id = 'com.example.todolist';
        this.version = '1.0.0';
        this.host = null;
        this.root = null;
        this.todos = [];
        this.filter = 'active';
        this.isLoading = false;
        this.editId = null;
        this.deleteConfirmId = null;
        this.isAddDrawerOpen = false;
        // 默认使用当前域名（同源请求），可通过 config 覆盖
        this.apiBaseUrl = '';
    }
    // ========== Initialization ==========
    async init(context) {
        this.host = context.host;
        // 从配置中读取 API 地址
        if (context.config.apiBaseUrl) {
            this.apiBaseUrl = String(context.config.apiBaseUrl);
        }
        console.log('[TodoList] Initializing with API:', this.apiBaseUrl);
        // 发送成功通知
        this.notify({
            level: 'success',
            title: 'TodoList 已加载',
            message: '待办事项组件准备就绪',
            duration: 2000
        });
    }
    // ========== Mount ==========
    async mount(element) {
        this.root = element;
        this.render();
        // 加载 todos
        await this.loadTodos();
        // 设置事件监听
        this.setupEventListeners();
    }
    // ========== Unmount ==========
    async unmount() {
        if (this.root) {
            this.root.innerHTML = '';
            this.root = null;
        }
        this.todos = [];
    }
    // ========== Message Handling ==========
    async handleMessage(message) {
        console.log('[TodoList] Received message:', message);
    }
    // ========== Health Check ==========
    healthCheck() {
        return this.root !== null;
    }
    // ========== Resize Handler ==========
    onResize(size) {
        console.log('[TodoList] Container resized:', size);
        // CSS 布局会自动适应，这里可以处理特殊逻辑
    }
    // ========== API Methods ==========
    async apiRequest(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('[TodoList] API request failed:', error);
            throw error;
        }
    }
    async loadTodos() {
        this.setLoading(true);
        try {
            const completedFilter = this.filter === 'all' ? '' : `?completed=${this.filter === 'completed'}`;
            const response = await this.apiRequest(`/api/todos${completedFilter}`);
            this.todos = response.todos || [];
            this.renderTodoList();
        }
        catch (error) {
            this.notify({
                level: 'error',
                title: '加载失败',
                message: '无法加载待办事项，请检查 API 连接',
                duration: 3000
            });
        }
        finally {
            this.setLoading(false);
        }
    }
    async createTodo(title, content) {
        if (!title.trim())
            return;
        this.setLoading(true);
        try {
            const newTodo = await this.apiRequest('/api/todos', {
                method: 'POST',
                body: JSON.stringify({ title, content })
            });
            this.todos.unshift(newTodo);
            this.renderTodoList();
            this.notify({
                level: 'success',
                title: '创建成功',
                message: `已添加: ${title}`,
                duration: 2000
            });
        }
        catch (error) {
            this.notify({
                level: 'error',
                title: '创建失败',
                message: '无法创建待办事项',
                duration: 3000
            });
        }
        finally {
            this.setLoading(false);
        }
    }
    async toggleTodo(id) {
        try {
            const updatedTodo = await this.apiRequest(`/api/todos/${id}/toggle`, { method: 'POST' });
            const index = this.todos.findIndex(t => t.id === id);
            if (index !== -1) {
                // 如果当前在"待完成"tab，且 item 变成了已完成，直接从列表移除
                // 如果当前在"已完成"tab，且 item 变成了未完成，也直接从列表移除
                if ((this.filter === 'active' && updatedTodo.completed) ||
                    (this.filter === 'completed' && !updatedTodo.completed)) {
                    this.todos.splice(index, 1);
                }
                else {
                    this.todos[index] = updatedTodo;
                }
                this.renderTodoList();
            }
        }
        catch (error) {
            this.notify({
                level: 'error',
                title: '操作失败',
                message: '无法切换完成状态',
                duration: 2000
            });
        }
    }
    async updateTodo(id, title, content) {
        try {
            const updatedTodo = await this.apiRequest(`/api/todos/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ title, content })
            });
            const index = this.todos.findIndex(t => t.id === id);
            if (index !== -1) {
                this.todos[index] = updatedTodo;
                this.renderTodoList();
            }
            this.notify({
                level: 'success',
                title: '更新成功',
                message: '待办事项已更新',
                duration: 2000
            });
        }
        catch (error) {
            this.notify({
                level: 'error',
                title: '更新失败',
                message: '无法更新待办事项',
                duration: 3000
            });
        }
    }
    async deleteTodo(id) {
        try {
            await this.apiRequest(`/api/todos/${id}`, {
                method: 'DELETE'
            });
            this.todos = this.todos.filter(t => t.id !== id);
            this.renderTodoList();
            this.notify({
                level: 'success',
                title: '删除成功',
                message: '待办事项已删除',
                duration: 2000
            });
        }
        catch (error) {
            this.notify({
                level: 'error',
                title: '删除失败',
                message: '无法删除待办事项',
                duration: 3000
            });
        }
    }
    // ========== UI Methods ==========
    setLoading(loading) {
        this.isLoading = loading;
        const loadingEl = this.root?.querySelector('.td-loading');
        const inputEl = this.root?.querySelector('.td-input-add');
        if (loadingEl) {
            loadingEl.classList.toggle('td-loading--visible', loading);
        }
        if (inputEl) {
            inputEl.disabled = loading;
        }
    }
    setFilter(filter) {
        this.filter = filter;
        // 更新按钮状态
        const buttons = this.root?.querySelectorAll('.td-filter-btn');
        buttons?.forEach(btn => {
            const btnFilter = btn.getAttribute('data-filter');
            btn.classList.toggle('td-filter-btn--active', btnFilter === filter);
        });
        this.loadTodos();
    }
    startEdit(id) {
        this.editId = id;
        this.renderTodoList();
        // 聚焦到编辑框
        setTimeout(() => {
            const editInput = this.root?.querySelector(`.td-item[data-id="${id}"] .td-edit-input`);
            if (editInput) {
                editInput.focus();
                editInput.select();
            }
        }, 50);
    }
    cancelEdit() {
        this.editId = null;
        this.renderTodoList();
    }
    saveEdit(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo)
            return;
        const editInput = this.root?.querySelector(`.td-item[data-id="${id}"] .td-edit-input`);
        const editContent = this.root?.querySelector(`.td-item[data-id="${id}"] .td-edit-content`);
        if (editInput) {
            const newTitle = editInput.value.trim();
            const newContent = editContent?.value.trim() || '';
            if (newTitle) {
                this.updateTodo(id, newTitle, newContent);
            }
            else {
                this.notify({
                    level: 'warning',
                    title: '标题不能为空',
                    message: '请输入待办事项标题',
                    duration: 2000
                });
            }
        }
        this.editId = null;
    }
    // ========== Event Listeners ==========
    setupEventListeners() {
        if (!this.root)
            return;
        // Header 添加按钮 - 打开抽屉
        const headerAddBtn = this.root.querySelector('#tdHeaderAddBtn');
        headerAddBtn?.addEventListener('click', () => this.openAddDrawer());
        // 抽屉关闭按钮
        const drawerClose = this.root.querySelector('#tdDrawerClose');
        drawerClose?.addEventListener('click', () => this.closeAddDrawer());
        // 抽屉取消按钮
        const drawerCancel = this.root.querySelector('#tdDrawerCancel');
        drawerCancel?.addEventListener('click', () => this.closeAddDrawer());
        // 抽屉添加按钮
        const drawerAdd = this.root.querySelector('#tdDrawerAdd');
        drawerAdd?.addEventListener('click', () => this.handleAddFromDrawer());
        // 抽屉遮罩点击关闭
        const drawerOverlay = this.root.querySelector('#tdDrawerOverlay');
        drawerOverlay?.addEventListener('click', (e) => {
            if (e.target === drawerOverlay) {
                this.closeAddDrawer();
            }
        });
        // 抽屉输入框回车保存
        const drawerInput = this.root.querySelector('#tdInputAdd');
        drawerInput?.addEventListener('keypress', (e) => {
            const keyEvent = e;
            if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
                keyEvent.preventDefault();
                this.handleAddFromDrawer();
            }
        });
        // ESC 键关闭抽屉和取消删除确认
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isAddDrawerOpen) {
                    this.closeAddDrawer();
                }
                if (this.deleteConfirmId !== null) {
                    this.cancelDeleteConfirm();
                }
            }
        });
        // 过滤按钮
        const filterBtns = this.root.querySelectorAll('.td-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.getAttribute('data-filter');
                this.setFilter(filter);
            });
        });
    }
    // ========== Add Drawer Methods ==========
    openAddDrawer() {
        this.isAddDrawerOpen = true;
        const overlay = this.root?.querySelector('#tdDrawerOverlay');
        const drawer = this.root?.querySelector('.td-drawer');
        const headerAddBtn = this.root?.querySelector('#tdHeaderAddBtn');
        if (overlay && drawer && headerAddBtn) {
            // 获取按钮的位置信息
            const btnRect = headerAddBtn.getBoundingClientRect();
            // 计算 drawer 应该显示的位置（按钮左侧）
            const drawerWidth = 340; // drawer 固定宽度
            const rightOffset = window.innerWidth - btnRect.right;
            const topOffset = btnRect.top;
            // 设置 drawer 的位置为相对于按钮左侧的定位
            drawer.style.position = 'absolute';
            drawer.style.right = `${rightOffset + btnRect.width + 8}px`;
            drawer.style.top = `${topOffset}px`;
            drawer.style.maxWidth = `${drawerWidth}px`;
            drawer.style.borderRadius = '8px';
            drawer.style.transform = 'none';
            overlay.style.display = 'block';
        }
        // 聚焦到输入框
        setTimeout(() => {
            const input = this.root?.querySelector('#tdInputAdd');
            if (input)
                input.focus();
        }, 100);
    }
    closeAddDrawer() {
        this.isAddDrawerOpen = false;
        const overlay = this.root?.querySelector('#tdDrawerOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        // 清空输入
        const input = this.root?.querySelector('#tdInputAdd');
        const contentInput = this.root?.querySelector('#tdContentAdd');
        if (input)
            input.value = '';
        if (contentInput)
            contentInput.value = '';
    }
    async handleAddFromDrawer() {
        const input = this.root?.querySelector('#tdInputAdd');
        const contentInput = this.root?.querySelector('#tdContentAdd');
        if (!input)
            return;
        const title = input.value.trim();
        const content = contentInput?.value.trim() || '';
        if (title) {
            await this.createTodo(title, content);
            this.closeAddDrawer();
        }
        else {
            input.focus();
            this.notify({
                level: 'warning',
                title: '标题不能为空',
                message: '请输入待办事项标题',
                duration: 2000
            });
        }
    }
    // ========== Delete Confirmation Methods ==========
    showDeleteConfirm(id, itemElement) {
        // 关闭之前的确认框
        this.cancelDeleteConfirm();
        this.deleteConfirmId = id;
        // 创建确认框元素
        const confirmDiv = document.createElement('div');
        confirmDiv.className = 'td-delete-confirm';
        confirmDiv.innerHTML = `
      <div class="td-delete-confirm-text">确定删除？</div>
      <div class="td-delete-confirm-actions">
        <button class="td-confirm-btn td-confirm-btn--cancel" data-action="cancel-delete">取消</button>
        <button class="td-confirm-btn td-confirm-btn--delete" data-action="confirm-delete">删除</button>
      </div>
    `;
        itemElement.appendChild(confirmDiv);
        // 绑定事件
        confirmDiv
            .querySelector('[data-action="cancel-delete"]')
            ?.addEventListener('click', () => this.cancelDeleteConfirm());
        confirmDiv
            .querySelector('[data-action="confirm-delete"]')
            ?.addEventListener('click', () => {
            this.deleteTodo(id);
            this.cancelDeleteConfirm();
        });
    }
    cancelDeleteConfirm() {
        this.deleteConfirmId = null;
        const confirms = this.root?.querySelectorAll('.td-delete-confirm');
        confirms?.forEach(el => el.remove());
    }
    // ========== Rendering ==========
    render() {
        if (!this.root)
            return;
        this.root.innerHTML = `
      <div class="td-container">
        <!-- Header -->
        <div class="td-header">
          <div class="td-header-left">
            <span class="td-icon">✓</span>
            <h1 class="td-title">TodoList</h1>
            <span class="td-stats-inline">
              <span class="td-stat-inline" id="tdStatTotal">总计 0</span>
              <span class="td-stat-separator">·</span>
              <span class="td-stat-inline" id="tdStatActive">待完成 0</span>
            </span>
          </div>
          <button class="td-header-add-btn" id="tdHeaderAddBtn" title="添加待办事项">
            <span class="td-plus-icon">+</span>
          </button>
        </div>

        <!-- Filter Tabs -->
        <div class="td-filters">
          <button class="td-filter-btn td-filter-btn--active" data-filter="active">
            待完成
          </button>
          <button class="td-filter-btn" data-filter="completed">
            已完成
          </button>
          <button class="td-filter-btn" data-filter="all">
            全部
          </button>
        </div>

        <!-- Todo List -->
        <div class="td-list-container">
          <div class="td-loading"></div>
          <div class="td-list" id="tdList">
            <!-- Todos will be rendered here -->
          </div>
          <div class="td-empty" id="tdEmpty" style="display: none;">
            <span class="td-empty-icon">📝</span>
            <p>暂无待办事项</p>
            <p class="td-empty-hint">点击右上角 + 添加新的待办事项</p>
          </div>
        </div>

        <!-- Add Drawer -->
        <div class="td-drawer-overlay" id="tdDrawerOverlay" style="display: none;">
          <div class="td-drawer">
            <div class="td-drawer-header">
              <h2 class="td-drawer-title">添加待办事项</h2>
              <button class="td-drawer-close" id="tdDrawerClose">×</button>
            </div>
            <div class="td-drawer-body">
              <input
                type="text"
                class="td-input-add"
                id="tdInputAdd"
                placeholder="添加新的待办事项..."
                maxlength="200"
              />
              <textarea
                class="td-content-add"
                id="tdContentAdd"
                placeholder="添加描述（可选）"
                rows="3"
              ></textarea>
            </div>
            <div class="td-drawer-footer">
              <button class="td-drawer-btn td-drawer-btn--cancel" id="tdDrawerCancel">
                取消
              </button>
              <button class="td-drawer-btn td-drawer-btn--add" id="tdDrawerAdd">
                添加
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>
        /* ===== TodoList Styles (Wunderlist-inspired) ===== */

        :host {
          display: block;
        }

        .td-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            'Helvetica Neue', Arial, sans-serif;
          background: #ffffff;
          color: #333333;
          line-height: 1.5;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .td-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        }

        .td-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .td-icon {
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .td-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }

        .td-stats-inline {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          opacity: 0.9;
          margin-left: 8px;
        }

        .td-stat-inline {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .td-stat-separator {
          opacity: 0.5;
        }

        .td-header-add-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .td-header-add-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
        }

        .td-plus-icon {
          font-size: 24px;
          line-height: 1;
          font-weight: 300;
        }

        /* Add Form in Drawer */
        .td-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: none;
          z-index: 1000;
          animation: td-fade-in 0.2s ease-out;
        }

        @keyframes td-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .td-drawer {
          width: 340px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          animation: td-pop-in 0.2s ease-out;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }

        @keyframes td-pop-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .td-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .td-drawer-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          color: #1e293b;
        }

        .td-drawer-close {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .td-drawer-close:hover {
          background: #e2e8f0;
          color: #475569;
        }

        .td-drawer-body {
          padding: 20px;
          overflow-y: auto;
        }

        .td-drawer .td-input-add {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          color: #1e293b;
          background: white;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .td-drawer .td-input-add:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .td-drawer .td-content-add {
          width: 100%;
          margin-top: 12px;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #475569;
          background: white;
          transition: all 0.2s;
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .td-drawer .td-content-add:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .td-drawer-footer {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 0 0 16px 16px;
        }

        .td-drawer-btn {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .td-drawer-btn--cancel {
          background: #f1f5f9;
          color: #64748b;
        }

        .td-drawer-btn--cancel:hover {
          background: #e2e8f0;
        }

        .td-drawer-btn--add {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }

        .td-drawer-btn--add:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .td-drawer-btn--add:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Filters */
        .td-filters {
          display: flex;
          padding: 12px 24px;
          gap: 8px;
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
        }

        .td-filter-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s;
        }

        .td-filter-btn:hover {
          color: #475569;
          background: rgba(0, 0, 0, 0.05);
        }

        .td-filter-btn--active {
          color: white;
          background: #3b82f6;
        }

        /* List Container */
        .td-list-container {
          flex: 1;
          overflow-y: auto;
          position: relative;
        }

        .td-loading {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(
            90deg,
            #3b82f6,
            #60a5fa,
            #3b82f6
          );
          background-size: 200% 100%;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }

        .td-loading--visible {
          opacity: 1;
          animation: td-loading 1.5s ease-in-out infinite;
        }

        @keyframes td-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .td-list {
          padding: 12px 16px;
        }

        /* Todo Item */
        .td-item {
          display: flex;
          align-items: flex-start;
          padding: 14px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          margin-bottom: 8px;
          transition: all 0.2s;
          position: relative;
        }

        .td-item:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .td-item--completed {
          background: #f8fafc;
        }

        .td-item--completed .td-item-title {
          text-decoration: line-through;
          color: #94a3b8;
        }

        .td-checkbox {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          margin-top: 2px;
          margin-right: 14px;
          border: 2px solid #cbd5e1;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          background: white;
        }

        .td-checkbox:hover {
          border-color: #3b82f6;
        }

        .td-item--completed .td-checkbox {
          background: #10b981;
          border-color: #10b981;
        }

        .td-item--completed .td-checkbox::after {
          content: '';
          position: absolute;
          left: 6px;
          top: 2px;
          width: 5px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .td-item-content {
          flex: 1;
          min-width: 0;
        }

        .td-item-title {
          font-size: 15px;
          font-weight: 500;
          color: #1e293b;
          line-height: 1.4;
          word-break: break-word;
        }

        .td-item-desc {
          font-size: 13px;
          color: #64748b;
          margin-top: 4px;
          line-height: 1.4;
          word-break: break-word;
        }

        .td-item-meta {
          display: flex;
          gap: 8px;
          margin-top: 6px;
          font-size: 11px;
          color: #94a3b8;
        }

        .td-item-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .td-item:hover .td-item-actions {
          opacity: 1;
        }

        .td-action-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          background: #f1f5f9;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .td-action-btn:hover {
          background: #e2e8f0;
          color: #475569;
        }

        .td-action-btn--edit:hover {
          background: #dbeafe;
          color: #2563eb;
        }

        .td-action-btn--delete:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        /* Delete Confirmation Popup */
        .td-delete-confirm {
          position: absolute;
          right: 40px;
          top: 50%;
          transform: translateY(-50%);
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          padding: 12px 16px;
          z-index: 100;
          min-width: 160px;
          animation: td-pop-in 0.2s ease-out;
        }

        @keyframes td-pop-in {
          from {
            opacity: 0;
            transform: translateY(-50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
        }

        .td-delete-confirm::after {
          content: '';
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid white;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
        }

        .td-delete-confirm-text {
          font-size: 13px;
          color: #475569;
          margin-bottom: 10px;
          font-weight: 500;
        }

        .td-delete-confirm-actions {
          display: flex;
          gap: 8px;
        }

        .td-confirm-btn {
          flex: 1;
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .td-confirm-btn--cancel {
          background: #f1f5f9;
          color: #64748b;
        }

        .td-confirm-btn--cancel:hover {
          background: #e2e8f0;
        }

        .td-confirm-btn--delete {
          background: #fee2e2;
          color: #dc2626;
        }

        .td-confirm-btn--delete:hover {
          background: #fecaca;
        }

        /* Edit Mode */
        .td-item--editing {
          flex-direction: column;
          gap: 10px;
        }

        .td-item--editing .td-item-actions {
          opacity: 1;
        }

        .td-edit-input {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #3b82f6;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 500;
          font-family: inherit;
          box-sizing: border-box;
        }

        .td-edit-content {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          min-height: 60px;
          box-sizing: border-box;
        }

        .td-edit-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .td-edit-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .td-edit-btn--save {
          background: #10b981;
          color: white;
        }

        .td-edit-btn--save:hover {
          background: #059669;
        }

        .td-edit-btn--cancel {
          background: #f1f5f9;
          color: #64748b;
        }

        .td-edit-btn--cancel:hover {
          background: #e2e8f0;
        }

        /* Empty State */
        .td-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #94a3b8;
        }

        .td-empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .td-empty p {
          margin: 4px 0;
          font-size: 15px;
        }

        .td-empty-hint {
          font-size: 13px;
          color: #cbd5e1;
        }

        /* Scrollbar */
        .td-list-container::-webkit-scrollbar {
          width: 8px;
        }

        .td-list-container::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .td-list-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .td-list-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .td-header {
            padding: 10px 12px;
          }

          .td-icon {
            font-size: 18px;
          }

          .td-title {
            font-size: 16px;
          }

          .td-stats-inline {
            font-size: 11px;
            margin-left: 6px;
          }

          .td-header-add-btn {
            width: 28px;
            height: 28px;
          }

          .td-plus-icon {
            font-size: 20px;
          }

          .td-filters {
            padding: 10px 12px;
          }

          .td-list {
            padding: 10px 12px;
          }

          .td-item-actions {
            opacity: 1;
          }

          .td-drawer {
            width: calc(100vw - 32px);
            max-width: none;
          }
        }
      </style>
    `;
        // 设置初始过滤状态
        this.setFilter(this.filter);
    }
    renderTodoList() {
        const listEl = this.root?.querySelector('#tdList');
        const emptyEl = this.root?.querySelector('#tdEmpty');
        const statTotal = this.root?.querySelector('#tdStatTotal');
        const statActive = this.root?.querySelector('#tdStatActive');
        if (!listEl)
            return;
        // 更新统计
        const total = this.todos.length;
        const active = this.todos.filter(t => !t.completed).length;
        if (statTotal)
            statTotal.textContent = String(total);
        if (statActive)
            statActive.textContent = String(active);
        // 空状态处理
        if (this.todos.length === 0) {
            listEl.innerHTML = '';
            if (emptyEl)
                emptyEl.style.display = 'flex';
            return;
        }
        if (emptyEl)
            emptyEl.style.display = 'none';
        // 渲染列表
        listEl.innerHTML = this.todos
            .map(todo => `
      <div class="td-item ${todo.completed ? 'td-item--completed' : ''} ${this.editId === todo.id ? 'td-item--editing' : ''}" data-id="${todo.id}">
        ${this.editId === todo.id
            ? this.renderEditMode(todo)
            : this.renderViewMode(todo)}
      </div>
    `)
            .join('');
        // 绑定列表项事件
        this.bindTodoItemEvents();
    }
    renderViewMode(todo) {
        const date = new Date(todo.created_at).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        return `
      <div class="td-checkbox" data-action="toggle"></div>
      <div class="td-item-content">
        <div class="td-item-title">${this.escapeHtml(todo.title)}</div>
        ${todo.content
            ? `<div class="td-item-desc">${this.escapeHtml(todo.content)}</div>`
            : ''}
        <div class="td-item-meta">
          <span>📅 ${date}</span>
        </div>
      </div>
      <div class="td-item-actions">
        <button class="td-action-btn td-action-btn--edit" data-action="edit" title="编辑">
✎
        </button>
        <button class="td-action-btn td-action-btn--delete" data-action="delete" title="删除">
✕
        </button>
      </div>
    `;
    }
    renderEditMode(todo) {
        return `
      <input
        type="text"
        class="td-edit-input"
        value="${this.escapeHtml(todo.title)}"
        placeholder="标题"
        maxlength="200"
      />
      <textarea
        class="td-edit-content"
        placeholder="描述（可选）"
      >${this.escapeHtml(todo.content || '')}</textarea>
      <div class="td-edit-actions">
        <button class="td-edit-btn td-edit-btn--cancel" data-action="cancel">
          取消
        </button>
        <button class="td-edit-btn td-edit-btn--save" data-action="save">
          保存
        </button>
      </div>
    `;
    }
    bindTodoItemEvents() {
        if (!this.root)
            return;
        // 列表项事件
        const items = this.root.querySelectorAll('.td-item');
        items.forEach(item => {
            const id = parseInt(item.getAttribute('data-id') || '0');
            // 切换完成
            const checkbox = item.querySelector('.td-checkbox');
            checkbox?.addEventListener('click', () => this.toggleTodo(id));
            // 编辑按钮
            const editBtn = item.querySelector('[data-action="edit"]');
            editBtn?.addEventListener('click', () => this.startEdit(id));
            // 删除按钮 - 显示内联确认
            const deleteBtn = item.querySelector('[data-action="delete"]');
            deleteBtn?.addEventListener('click', () => {
                // 如果已经显示确认框，则执行删除
                if (this.deleteConfirmId === id) {
                    this.deleteTodo(id);
                    this.cancelDeleteConfirm();
                }
                else {
                    // 显示确认框
                    this.showDeleteConfirm(id, item);
                }
            });
            // 保存编辑
            const saveBtn = item.querySelector('[data-action="save"]');
            saveBtn?.addEventListener('click', () => this.saveEdit(id));
            // 取消编辑
            const cancelBtn = item.querySelector('[data-action="cancel"]');
            cancelBtn?.addEventListener('click', () => this.cancelEdit());
            // 编辑模式下回车保存
            const editInput = item.querySelector('.td-edit-input');
            editInput?.addEventListener('keypress', (e) => {
                const keyEvent = e;
                if (keyEvent.key === 'Enter') {
                    keyEvent.preventDefault();
                    this.saveEdit(id);
                }
            });
        });
    }
    // ========== Utility Methods ==========
    notify(options) {
        if (this.host) {
            this.host.ui.notify(options);
        }
    }
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
// ========== Export ==========
export default TodoListComponent;
