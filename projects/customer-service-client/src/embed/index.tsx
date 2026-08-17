import React from 'react';
import ReactDOM from 'react-dom/client';
import { MessageSquare, X } from '../components/icons';
import { CustomerServiceApp } from '../components/CustomerServiceApp';
import type { WidgetOptions } from '../types';

import mainStyles from '../styles/index.css?inline';
import widgetStyles from './widget.css?inline';

/**
 * 嵌入式 Widget UI 组件
 */
const WidgetRoot: React.FC<{
  options: WidgetOptions;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}> = ({ options, isOpen, onToggle, onClose }) => {
  const publicId = options.publicId || options.project || '';
  const positionClass = options.position === 'bottom-left' ? 'position-left' : '';

  return (
    <div className={`cs-widget-host ${positionClass}`}>
      {/* 浮动聊天弹窗 */}
      <div className={`cs-widget-dialog ${isOpen ? 'open' : ''}`}>
        {publicId && (
          <CustomerServiceApp
            access={{
              type: 'public',
              publicId,
              apiHost: options.apiHost
            }}
            isWidget={true}
            onCloseWidget={onClose}
          />
        )}
      </div>

      {/* 悬浮呼出按钮 (FAB) */}
      <button
        type="button"
        className="cs-widget-fab"
        onClick={onToggle}
        aria-label={isOpen ? '收起客服' : '咨询客服'}
        title={options.title || (isOpen ? '收起客服' : '咨询智能客服')}
        style={options.themeColor ? { background: options.themeColor } : undefined}
      >
        <div className="cs-widget-fab-icon">
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </div>
      </button>
    </div>
  );
};

class FastGPTCustomerServiceSDK {
  private container: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private reactRoot: ReactDOM.Root | null = null;
  private options: WidgetOptions = {};
  private _isOpen: boolean = false;

  /** 初始化并挂载 SDK 浮窗 */
  public init(options: WidgetOptions = {}) {
    this.options = {
      position: 'bottom-right',
      defaultOpen: false,
      ...options
    };

    if (this.options.defaultOpen) {
      this._isOpen = true;
    }

    this.mount();
  }

  /** 打开客服浮窗 */
  public open() {
    this._isOpen = true;
    this.render();
  }

  /** 关闭客服浮窗 */
  public close() {
    this._isOpen = false;
    this.render();
  }

  /** 切换打开/关闭状态 */
  public toggle() {
    this._isOpen = !this._isOpen;
    this.render();
  }

  /** 获取当前打开状态 */
  public isOpen(): boolean {
    return this._isOpen;
  }

  private mount() {
    if (typeof document === 'undefined') return;

    // 确保单例容器
    const existing = document.getElementById('fastgpt-cs-widget-root');
    if (existing) {
      existing.remove();
    }

    this.container = document.createElement('div');
    this.container.id = 'fastgpt-cs-widget-root';
    document.body.appendChild(this.container);

    // 启用 Shadow DOM 进行样式硬隔离
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // 注入全套 CSS 变量与组件样式
    const styleElement = document.createElement('style');
    styleElement.textContent = `${mainStyles}\n${widgetStyles}`;
    this.shadowRoot.appendChild(styleElement);

    // 挂载 React 根节点
    const mountPoint = document.createElement('div');
    mountPoint.className = 'cs-widget-shadow-mount';
    this.shadowRoot.appendChild(mountPoint);

    this.reactRoot = ReactDOM.createRoot(mountPoint);
    this.render();
  }

  private render() {
    if (!this.reactRoot) return;

    this.reactRoot.render(
      <WidgetRoot
        options={this.options}
        isOpen={this._isOpen}
        onToggle={() => this.toggle()}
        onClose={() => this.close()}
      />
    );
  }
}

// 实例化单例并挂载到全局 window 对象
const sdkInstance = new FastGPTCustomerServiceSDK();

declare global {
  interface Window {
    FastGPTCustomerService: FastGPTCustomerServiceSDK;
  }
}

if (typeof window !== 'undefined') {
  window.FastGPTCustomerService = sdkInstance;

  // 自动探测 <script data-project="..." data-public-id="..."> 属性并自动初始化
  const autoInit = () => {
    const scripts = document.querySelectorAll('script[data-project], script[data-public-id]');
    const currentScript = (document.currentScript ||
      scripts[scripts.length - 1]) as HTMLScriptElement | null;

    if (currentScript) {
      const project =
        currentScript.getAttribute('data-project') ||
        currentScript.getAttribute('data-public-id') ||
        '';
      const apiHost = currentScript.getAttribute('data-api-host') || undefined;
      const position =
        (currentScript.getAttribute('data-position') as WidgetOptions['position']) ||
        'bottom-right';
      const themeColor = currentScript.getAttribute('data-theme') || undefined;
      const title = currentScript.getAttribute('data-title') || undefined;
      const defaultOpen = currentScript.getAttribute('data-default-open') === 'true';

      if (project) {
        sdkInstance.init({
          project,
          publicId: project,
          apiHost,
          position,
          themeColor,
          title,
          defaultOpen
        });
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}

export default sdkInstance;
