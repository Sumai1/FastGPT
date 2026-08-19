import React, { useState } from 'react';
import { CustomerServiceApp } from './components/CustomerServiceApp';
import {
  Bot,
  ArrowRight,
  Camera,
  ShoppingBag,
  Sparkles,
  Clock,
  ShieldCheck,
  Search
} from './components/icons';
import './styles/index.css';

export const App: React.FC = () => {
  const [publicId, setPublicId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';

    // 1. 从 URL Search Query 解析 (?publicId=xxx / ?project=xxx / ?projectCode=xxx)
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

  // 未指定项目标识时的 FastGPT 原生风格直选门户
  if (!publicId) {
    return (
      <div className="cs-app-root cs-portal-root">
        <div className="cs-portal-container">
          {/* FastGPT 原生风格 DesktopHomeHero */}
          <div className="cs-native-hero" style={{ padding: '40px 16px 20px' }}>
            <div
              className="cs-native-hero-icon"
              style={{ width: 60, height: 60, borderRadius: 16 }}
            >
              <Bot size={36} />
            </div>
            <h1 className="cs-native-hero-title" style={{ fontSize: 32, lineHeight: '40px' }}>
              FastGPT 智能产品客服
            </h1>
            <p className="cs-native-hero-subtitle" style={{ fontSize: 14, maxWidth: 540 }}>
              专为自助拍照机、智能售货机等无人设备打造的 7×24 小时排障、RAG 问答与售后支持闭环门户
            </p>

            {/* 44px 极简专区快捷卡 (对标 QuickApps) */}
            <div className="cs-quickapps-row" style={{ marginTop: 8 }}>
              <div
                className="cs-quickapp-chip"
                onClick={() => setPublicId('PHOTO_SUPPORT')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setPublicId('PHOTO_SUPPORT');
                }}
              >
                <div className="cs-quickapp-avatar photo">
                  <Camera size={15} />
                </div>
                <span className="cs-quickapp-text">拍照机服务专区</span>
              </div>

              <div
                className="cs-quickapp-chip"
                onClick={() => setPublicId('VENDING_SUPPORT')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setPublicId('VENDING_SUPPORT');
                }}
              >
                <div className="cs-quickapp-avatar vending">
                  <ShoppingBag size={15} />
                </div>
                <span className="cs-quickapp-text">售货机服务专区</span>
              </div>

              <div
                className="cs-quickapp-chip"
                onClick={() => setPublicId('cs_TestCustomerServiceProject2026')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    setPublicId('cs_TestCustomerServiceProject2026');
                }}
              >
                <div className="cs-quickapp-avatar tool">
                  <Sparkles size={15} />
                </div>
                <span className="cs-quickapp-text">演示客服空间 (Demo)</span>
              </div>
            </div>
          </div>

          {/* FastGPT 标志性悬浮圆角胶囊输入框 (用于输入 Public ID) */}
          <div className="cs-portal-custom-box">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inputCode.trim()) {
                  setPublicId(inputCode.trim());
                }
              }}
              className="cs-portal-floating-form"
            >
              <div className="cs-portal-input-icon">
                <Search size={16} />
              </div>
              <input
                type="text"
                className="cs-portal-input-field"
                placeholder="输入客服项目公开标识 (例如: YIPAIJIHE_SUPPORT, PHOTO_SUPPORT...)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                aria-label="输入客服项目公开标识"
              />
              <button
                type="submit"
                className="cs-btn cs-btn-primary cs-portal-send-btn"
                disabled={!inputCode.trim()}
              >
                <span>进入</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>

          {/* 底部服务保障徽标 */}
          <div className="cs-portal-trust-row" style={{ marginTop: 24 }}>
            <div className="cs-portal-trust-item">
              <ShieldCheck size={14} className="cs-text-success" />
              <span>阻断级高危电气安全防护</span>
            </div>
            <div className="cs-portal-trust-item">
              <Clock size={14} className="cs-text-primary" />
              <span>7×24 小时秒级交互响应</span>
            </div>
            <div className="cs-portal-trust-item">
              <Bot size={14} className="cs-text-info" />
              <span>四级产品型号精准知识联动</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <CustomerServiceApp access={{ type: 'public', publicId }} />;
};

export default App;
