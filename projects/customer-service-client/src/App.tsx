import React, { useState } from 'react';
import { CustomerServiceApp } from './components/CustomerServiceApp';
import { Bot, ArrowRight } from './components/icons';
import './styles/index.css';

export const App: React.FC = () => {
  const [publicId, setPublicId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';

    // 1. 从 URL Search Query 解析 (?publicId=xxx / ?project=xxx)
    const params = new URLSearchParams(window.location.search);
    const queryPublicId =
      params.get('publicId') || params.get('project') || params.get('projectCode');
    if (queryPublicId) {
      return queryPublicId;
    }

    // 2. 从 URL Path 解析 (/chat/:projectCode 或 /:projectCode)
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (pathname) {
      const parts = pathname.split('/');
      const code = parts[parts.length - 1];
      if (code && code !== 'index.html' && code !== 'chat') {
        return code;
      }
    }
    return '';
  });
  const [inputCode, setInputCode] = useState<string>('');

  // 未指定项目标识时的引导界面
  if (!publicId) {
    return (
      <div className="cs-app-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          className="cs-welcome-hero"
          style={{ maxWidth: 440, width: '90%', margin: '0 auto', textAlign: 'center' }}
        >
          <div className="cs-brand-logo" style={{ width: 56, height: 56, margin: '0 auto' }}>
            <Bot size={32} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>FastGPT 智能产品客服</h1>
          <p style={{ color: 'var(--cs-text-secondary)', fontSize: 13 }}>
            请输入客服项目唯一公开标识（Public ID 或 Project Code）进入专属咨询空间：
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputCode.trim()) {
                setPublicId(inputCode.trim());
              }
            }}
            style={{ display: 'flex', gap: 8, marginTop: 12 }}
          >
            <input
              type="text"
              className="cs-select"
              style={{ flex: 1, height: 42, fontSize: 14 }}
              placeholder="例如: YIPAIJIHE_SUPPORT"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="cs-btn cs-btn-primary"
              style={{ height: 42, padding: '0 18px' }}
              disabled={!inputCode.trim()}
            >
              <span>进入</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <CustomerServiceApp access={{ type: 'public', publicId }} />;
};

export default App;
