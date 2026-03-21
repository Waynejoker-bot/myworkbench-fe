/**
 * WorkbenchHost - Host 端核心实现
 * 负责组件生命周期管理、消息路由、事件通知
 * 使用 Shadow DOM 实现样式隔离（而非 iframe 沙箱）
 */

import type {
  HostAPI,
  HostConfig,
  ComponentInstance as PublicComponentInstance
} from '../types/host';
import type { ComponentManifest, WorkbenchComponent } from '../types/component';
import type { Session } from '../types/common';
import type { MessageStreamEvent } from '../types/message';
import { MessageBus } from '../core/message-bus';
import { isWorkbenchMessage } from '../types';
import { HostCapabilitiesBuilder } from './capabilities';
import { ComponentLoader } from './loader';
import { uuid } from '../utils/uuid';
import { logger } from '../utils/logger';
import * as Protocol from '../core/protocol';
import { ComponentRegistryClient } from '../registry/client';

const log = logger.child('WorkbenchHost');

/**
 * 组件实例
 */
interface ComponentInstance {
  id: string;
  manifest: ComponentManifest;
  component: WorkbenchComponent | null;
  hostElement: HTMLElement | null;  // Shadow DOM host 元素
  shadowRoot: ShadowRoot | null;     // Shadow Root
  state: 'initializing' | 'ready' | 'error' | 'destroyed';
  error?: Error;
  context?: {
    sessionId: string;
    params: Record<string, unknown>;
  };
}

/**
 * Shadow DOM 容器
 * 使用 Shadow DOM 实现样式隔离，而非 iframe 沙箱
 *
 * 样式隔离：通过 Shadow DOM 实现
 * 脚本隔离：无（组件代码在主线程执行，需信任组件来源）
 */
class ShadowDOMContainer {
  private hostElement: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private rootElement: HTMLElement | null = null;  // 组件挂载的根元素
  private styleElements: HTMLStyleElement[] = [];  // 跟踪注入的样式元素
  private resizeObserver: ResizeObserver | null = null;  // 监听容器尺寸变化

  /**
   * 创建 Shadow DOM 容器
   * @param manifest - 组件清单
   * @param manifestUrl - 清单 URL（用于解析相对路径）
   * @param loader - 组件加载器（用于加载样式内容）
   */
  async create(
    manifest: ComponentManifest,
    manifestUrl: string,
    loader: ComponentLoader
  ): Promise<{ hostElement: HTMLElement; mountElement: HTMLElement }> {
    // 创建 host 元素
    this.hostElement = document.createElement('div');
    this.hostElement.className = `workbench-component-${manifest.name}`;
    this.hostElement.style.width = '100%';
    this.hostElement.style.height = '100%';
    this.hostElement.style.overflow = 'auto';

    // 创建 Shadow Root（使用 open 模式便于调试）
    this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });

    // 创建组件挂载的根元素
    this.rootElement = document.createElement('div');
    this.rootElement.id = 'workbench-root';
    this.shadowRoot.appendChild(this.rootElement);

    // 注入样式（获取内容后使用 style 标签）
    if (manifest.styles && Array.isArray(manifest.styles)) {
      for (const styleUrl of manifest.styles) {
        await this.injectStyle(styleUrl, manifestUrl, loader);
      }
    }

    // 设置 ResizeObserver 监听容器尺寸变化
    this.setupResizeObserver();

    log.debug('Shadow DOM container created', { component: manifest.name });

    return {
      hostElement: this.hostElement,
      mountElement: this.rootElement
    };
  }

  /**
   * 注入样式
   * 获取 CSS 内容后使用 style 标签注入，避免 Shadow DOM 中 link 标签的兼容性问题
   * @param styleUrl - 样式 URL（可以是相对路径）
   * @param manifestUrl - 清单 URL（用于解析相对路径）
   * @param loader - 组件加载器
   */
  private async injectStyle(styleUrl: string, manifestUrl: string, loader: ComponentLoader): Promise<void> {
    if (!this.shadowRoot) {
      throw new Error('Shadow DOM not initialized');
    }

    try {
      // 获取 CSS 内容
      const cssContent = await loader.loadResourceContent(manifestUrl, styleUrl);

      // 创建 style 标签
      const styleElement = document.createElement('style');
      styleElement.textContent = cssContent;

      // 插入到 rootElement 之前
      if (this.rootElement && this.shadowRoot.contains(this.rootElement)) {
        this.shadowRoot.insertBefore(styleElement, this.rootElement);
      } else {
        this.shadowRoot.appendChild(styleElement);
      }

      // 跟踪样式元素以便后续清理
      this.styleElements.push(styleElement);

      log.debug('Style injected', { url: styleUrl, size: cssContent.length });
    } catch (error) {
      log.error('Failed to inject style', { url: styleUrl, error });
      // 样式加载失败不应阻塞组件加载
    }
  }

  /**
   * 设置 ResizeObserver 监听容器尺寸变化
   * 当容器尺寸变化时，派发 'workbench-resize' 事件通知组件
   */
  private setupResizeObserver(): void {
    if (!this.hostElement) {
      log.warn('Cannot setup ResizeObserver: hostElement is null');
      return;
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.notifyResize(width, height);
      }
    });

    this.resizeObserver.observe(this.hostElement);
    log.debug('ResizeObserver setup complete');
  }

  /**
   * 通知组件尺寸变化
   * 通过 CustomEvent 派发 resize 事件
   * @param width - 新的宽度
   * @param height - 新的高度
   */
  private notifyResize(width: number, height: number): void {
    if (!this.rootElement) {
      return;
    }

    const event = new CustomEvent('workbench-resize', {
      detail: { width, height },
      bubbles: true,
      cancelable: false
    });

    this.rootElement.dispatchEvent(event);
    log.debug('Resize event dispatched', { width, height });
  }

  /**
   * 执行脚本
   * 直接使用 URL 进行动态 import，避免 blob URL 的性能开销
   */
  async executeScript(scriptUrl: string): Promise<any> {
    if (!this.shadowRoot || !this.rootElement) {
      throw new Error('Shadow DOM not initialized');
    }

    try {
      // 直接使用 /market/ URL 进行动态 import，无需创建 blob URL
      // 组件脚本通过 nginx 静态资源从 /market/ 路径提供
      const module = await import(/* @vite-ignore */ scriptUrl);
      const ComponentClass = module.default || module;

      if (!ComponentClass) {
        throw new Error('Component must have a default export');
      }

      log.debug('Script executed', { scriptUrl, hasClass: typeof ComponentClass === 'function' });

      return ComponentClass;
    } catch (error) {
      log.error('Failed to execute script', { scriptUrl, error });
      throw error;
    }
  }

  /**
   * 获取组件挂载的根元素
   */
  getRootElement(): HTMLElement | null {
    return this.rootElement;
  }

  /**
   * 获取 host 元素（用于插入到页面）
   */
  getHostElement(): HTMLElement | null {
    return this.hostElement;
  }

  /**
   * 销毁容器
   */
  destroy(): void {
    // 清理 ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.hostElement && this.hostElement.parentNode) {
      this.hostElement.parentNode.removeChild(this.hostElement);
    }
    this.hostElement = null;
    this.shadowRoot = null;
    this.rootElement = null;
  }
}

/**
 * WorkbenchHost 类
 */
export class WorkbenchHost {
  private components = new Map<string, ComponentInstance>();
  private messageBus: MessageBus;
  private capabilities: HostAPI;
  private loader: ComponentLoader;
  private registryClient: ComponentRegistryClient;
  private initialized = false;

  constructor(private config: HostConfig) {
    this.messageBus = new MessageBus();
    this.loader = new ComponentLoader(config.security);
    this.registryClient = new ComponentRegistryClient();
    this.capabilities = this.buildCapabilities();
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    log.info('WorkbenchHost initialized');
  }

  /**
   * 加载组件
   */
  async loadComponent(
    manifestUrl: string,
    params: Record<string, unknown> = {},
    _containerElement?: HTMLElement
  ): Promise<{ componentId: string; hostElement: HTMLElement }> {
    await this.init();

    log.info('Loading component', { url: manifestUrl, params });

    // 加载清单
    const manifest = await this.loader.loadManifest(manifestUrl);

    // 创建组件实例
    const componentId = uuid();
    const instance: ComponentInstance = {
      id: componentId,
      manifest,
      component: null,
      hostElement: null,
      shadowRoot: null,
      state: 'initializing',
      context: {
        sessionId: this.config.context?.sessionId || uuid(),
        params
      }
    };

    try {
      // 创建 Shadow DOM 容器
      const sandbox = new ShadowDOMContainer();
      const { hostElement, mountElement } = await sandbox.create(manifest, manifestUrl, this.loader);
      instance.hostElement = hostElement;

      // 直接使用 manifest.entry URL 进行动态 import，无需加载内容或创建 blob URL
      const ComponentClass = await sandbox.executeScript(manifest.entry);

      if (!ComponentClass || typeof ComponentClass !== 'function') {
        throw new Error('Component must export a default function or class');
      }

      // 创建组件实例
      const componentInstance = await this.createComponentInstance(ComponentClass, instance, mountElement);
      instance.component = componentInstance;
      instance.state = 'ready';

      this.components.set(componentId, instance);

      // 发送初始化消息
      this.notifyComponentEvent(Protocol.WorkbenchEvents.COMPONENT_LOADED, {
        componentId,
        manifest
      });

      log.info('Component loaded successfully', { componentId, name: manifest.name });

      return { componentId, hostElement };
    } catch (error) {
      instance.state = 'error';
      instance.error = error as Error;

      this.notifyComponentEvent(Protocol.WorkbenchEvents.COMPONENT_ERROR, {
        componentId,
        error
      });

      throw error;
    }
  }

  /**
   * 创建组件实例并初始化
   */
  private async createComponentInstance(
    ComponentClass: any,
    instance: ComponentInstance,
    mountElement: HTMLElement
  ): Promise<WorkbenchComponent> {
    // 创建组件实例
    const component = new ComponentClass();

    // 构建初始化上下文
    const initContext = {
      host: this.capabilities,
      params: instance.context?.params || {},
      session: this.config.context || {},
      config: {},
      manifest: instance.manifest
    };

    // 初始化组件
    if (typeof component.init === 'function') {
      await component.init(initContext);
    }

    // 挂载组件
    if (typeof component.mount === 'function') {
      await component.mount(mountElement);
    }

    // 监听 resize 事件，调用组件的 onResize 方法（如果存在）
    mountElement.addEventListener('workbench-resize', ((event: CustomEvent) => {
      if (typeof component.onResize === 'function') {
        const { width, height } = event.detail;
        try {
          component.onResize({ width, height });
        } catch (error) {
          log.error('Error in component onResize', { error, componentId: instance.id });
        }
      }
    }) as EventListener);

    return component;
  }

  /**
   * 卸载组件
   */
  async unloadComponent(componentId: string): Promise<void> {
    const instance = this.components.get(componentId);
    if (!instance) {
      log.warn('Component not found', { componentId });
      return;
    }

    log.info('Unloading component', { componentId });

    // 调用组件的 unmount 方法
    if (instance.component && typeof instance.component.unmount === 'function') {
      try {
        await instance.component.unmount();
      } catch (error) {
        log.error('Error unmounting component', { error });
      }
    }

    // 移除 host 元素
    if (instance.hostElement && instance.hostElement.parentNode) {
      instance.hostElement.parentNode.removeChild(instance.hostElement);
    }

    this.components.delete(componentId);

    this.notifyComponentEvent(Protocol.WorkbenchEvents.COMPONENT_UNLOADED, { componentId });

    log.info('Component unloaded', { componentId });
  }

  /**
   * 通过组件名称加载组件
   */
  async loadComponentByName(
    componentName: string,
    params: Record<string, unknown> = {}
  ): Promise<{ componentId: string; hostElement: HTMLElement }> {
    log.info('Loading component by name', { componentName, params });

    const componentInfo = await this.registryClient.get(componentName);
    if (!componentInfo) {
      throw new Error(`Component not found: ${componentName}`);
    }

    const manifestUrl = this.registryClient.getManifestUrl(componentName);
    return await this.loadComponent(manifestUrl, params);
  }

  /**
   * 发送消息到组件
   */
  async sendToComponent(componentId: string, message: unknown): Promise<void> {
    const instance = this.components.get(componentId);
    if (!instance) {
      throw new Error(`Component not found: ${componentId}`);
    }

    // 检查消息格式
    if (!isWorkbenchMessage(message)) {
      console.warn('Invalid message format', { componentId, message });
      return;
    }

    if (instance.component && typeof instance.component.handleMessage === 'function') {
      await instance.component.handleMessage(message);
    }
  }

  /**
   * 广播消息到所有组件
   */
  async broadcast(message: unknown): Promise<void> {
    const componentIds = Array.from(this.components.keys());
    for (const componentId of componentIds) {
      await this.sendToComponent(componentId, message);
    }
  }

  /**
   * 通知新消息（支持流式）
   */
  notifyMessage(event: MessageStreamEvent): void {
    this.broadcast({
      type: Protocol.MessageTypes.EVENT_MESSAGE_STREAM,
      payload: event,
      source: Protocol.MessageSource.Workbench,
      target: Protocol.MessageTarget.Component,
      id: uuid(),
      timestamp: Date.now()
    });

    this.messageBus.emit(Protocol.WorkbenchEvents.MESSAGE_RECEIVED, event);
  }

  /**
   * 通知会话变化
   */
  notifySessionChange(session: Session): void {
    this.broadcast({
      type: Protocol.MessageTypes.EVENT_SESSION_CHANGE,
      payload: { sessionId: session.id },
      source: Protocol.MessageSource.Workbench,
      target: Protocol.MessageTarget.Component,
      id: uuid(),
      timestamp: Date.now()
    });

    this.messageBus.emit(Protocol.WorkbenchEvents.SESSION_CHANGED, session);
  }

  /**
   * 获取组件实例
   */
  getComponent(componentId: string): PublicComponentInstance | undefined {
    const instance = this.components.get(componentId);
    if (!instance) {
      return undefined;
    }

    const state = instance.state;
    return {
      id: instance.id,
      manifest: instance.manifest,
      state,
      error: instance.error,
      element: instance.hostElement,
      component: instance.component,
      isReady: () => state === 'ready',
      isLoading: () => state === 'initializing',
      hasError: () => state === 'error',
      send: async (message: unknown) => await this.sendToComponent(componentId, message),
      destroy: async () => await this.unloadComponent(componentId)
    };
  }

  /**
   * 获取所有组件
   */
  getComponents(): PublicComponentInstance[] {
    const result: PublicComponentInstance[] = [];
    const componentIds = Array.from(this.components.keys());
    for (const componentId of componentIds) {
      const instance = this.getComponent(componentId);
      if (instance) {
        result.push(instance);
      }
    }
    return result;
  }

  /**
   * 获取事件总线
   */
  getEvents() {
    return {
      on: (event: string, handler: Function) => this.messageBus.on(event, handler),
      once: (event: string, handler: Function) => this.messageBus.once(event, handler),
      off: (event: string, handler?: Function) => this.messageBus.off(event, handler),
      emit: (event: string, data?: unknown) => this.messageBus.emit(event, data)
    };
  }

  /**
   * 构建能力对象
   */
  private buildCapabilities(): HostAPI {
    return new HostCapabilitiesBuilder()
      .fromConfig(this.config)
      .withEvents({
        on: (event: string, handler: Function) => this.messageBus.on(event, handler),
        once: (event: string, handler: Function) => this.messageBus.once(event, handler),
        off: (event: string, handler?: Function) => this.messageBus.off(event, handler),
        emit: (event: string, data?: unknown) => this.messageBus.emit(event, data)
      })
      .build();
  }

  /**
   * 通知组件事件
   */
  private notifyComponentEvent(event: string, data: any): void {
    this.messageBus.emit(event, data);
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    log.info('Destroying WorkbenchHost');

    // 卸载所有组件
    const componentIds = Array.from(this.components.keys());
    for (const componentId of componentIds) {
      await this.unloadComponent(componentId);
    }

    // 清除消息总线
    this.messageBus.clear();

    this.initialized = false;
  }
}

/**
 * 创建 WorkbenchHost 实例
 */
export function createWorkbenchHost(config: HostConfig): WorkbenchHost {
  return new WorkbenchHost(config);
}
