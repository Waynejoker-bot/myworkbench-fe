/**
 * TodoList Component
 * An elegant todo list management component inspired by Wunderlist
 */
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
    onResize?(size: {
        width: number;
        height: number;
    }): void;
    healthCheck(): Promise<boolean> | boolean;
}
declare class TodoListComponent implements WorkbenchComponent {
    readonly id = "com.example.todolist";
    readonly version = "1.0.0";
    private host;
    private root;
    private apiBaseUrl;
    private todos;
    private filter;
    private isLoading;
    private editId;
    private deleteConfirmId;
    private isAddDrawerOpen;
    constructor();
    init(context: InitContext): Promise<void>;
    mount(element: HTMLElement): Promise<void>;
    unmount(): Promise<void>;
    handleMessage(message: WorkbenchMessage): Promise<void>;
    healthCheck(): boolean;
    onResize(size: {
        width: number;
        height: number;
    }): void;
    private apiRequest;
    private loadTodos;
    private createTodo;
    private toggleTodo;
    private updateTodo;
    private deleteTodo;
    private setLoading;
    private setFilter;
    private startEdit;
    private cancelEdit;
    private saveEdit;
    private setupEventListeners;
    private openAddDrawer;
    private closeAddDrawer;
    private handleAddFromDrawer;
    private showDeleteConfirm;
    private cancelDeleteConfirm;
    private render;
    private renderTodoList;
    private renderViewMode;
    private renderEditMode;
    private bindTodoItemEvents;
    private notify;
    private escapeHtml;
}
export default TodoListComponent;
