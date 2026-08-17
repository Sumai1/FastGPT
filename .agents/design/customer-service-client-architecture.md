# 企业产品智能客服双端彻底分离架构设计方案

## 1. 架构背景与目标

当前智能客服业务在 FastGPT 仓库内已完成“路由与权限级”的逻辑闭环，但客户端与管理端仍打包在同一个 Next.js 庞大单体应用（`projects/app`）中。为了满足企业生产级对**极致性能、绝对安全隔离、全渠道嵌入能力以及独立发布**的高标准要求，特制定本方案，将系统彻底拆分为：
- **客户端（`support.pkiln.com`）**：专属极轻量前端工程，支持独立网页与官网嵌入式 Widget 两种形态；
- **管理端（`admin.pkiln.com`）**：依托 FastGPT 核心服务，负责客服运营、知识治理、审核中心与工作流编排。

---

## 2. 总体系统拓扑与网络边界

```
                                  用户请求 / DNS 解析
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
        【客户端】support.pkiln.com                      【管理端】admin.pkiln.com
                    │                                             │
                    ▼                                             ▼
        ┌───────────────────────┐                     ┌───────────────────────┐
        │  Nginx 网关 / CDN     │                     │  Nginx 网关           │
        └───────────┬───────────┘                     └───────────┬───────────┘
                    │                                             │
          ┌─────────┴─────────┐                                   │
          │                   │ (Public API 反代)                  │
          ▼                   ▼                                   ▼
┌───────────────────┐ ┌────────────────────────────────────────────────────────┐
│ 极轻量客户端容器   │ │                 FastGPT 主服务容器                   │
│ (Nginx Alpine)    │ │                 (projects/app:3001)                    │
│ • 纯静态产物 (~300KB│ │ • 管理控制台 (/customer-service/console)              │
│ • 独立 Web 页面    │ │ • 知识库与工作流引擎                                   │
│ • 嵌入式 Widget   │ │ • 公共/管理/V1 API 服务                                │
└───────────────────┘ └────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
      MongoDB (业务数据)      PGVector (知识向量)       Redis (限流/缓存)
```

---

## 3. 客户端独立子工程架构设计 (`projects/customer-service-client`)

### 3.1 技术选型

| 维度 | 选型方案 | 选型理由 |
| :--- | :--- | :--- |
| **工程定位** | Monorepo Workspace 子项目 | 位于 `projects/customer-service-client`，复用 `@fastgpt/global` 契约 |
| **构建工具** | **Vite 6** | 毫秒级 HMR，Rollup 极致树摇与分包优化 |
| **UI 核心** | **React 18 + TypeScript** | 与主仓库语言栈一致，类型安全 |
| **样式方案** | **Vanilla CSS + CSS Modules / Tailwind** | 零运行时体积负担，杜绝 ChakraUI 等重型 CSS-in-JS 库 |
| **图标库** | **Lucide React** (按需导入) | 仅打包实际使用的 6~8 个图标，体积 < 10KB |
| **通信机制** | **原生 Fetch + ReadableStream** | 轻量解析“安全 SSE”事件流，无额外第三方 SDK 依赖 |

### 3.2 交付物与分发双形态

```
projects/customer-service-client/dist/
├── index.html               # 独立客服聊天 Web 页面 (support.pkiln.com/chat/:projectCode)
├── embed.js                 # 官网嵌入式 Widget SDK (单文件，供外部网站一键引入)
└── assets/                  # 静态 JS/CSS 资源 (Gzip 后总大小 < 150KB)
```

1. **形态 A：独立 Web 页面（Standalone Web）**
   - 适配 PC 桌面端双栏/居中布局与手机端全屏沉浸式体验；
   - 自动解析 URL 路径参数 `/:projectCode`，加载对应品牌配置与欢迎语；
   - 支持产品分类/型号级联选择、流式问答、知识引用源展开、点赞点踩及未解决反馈。

2. **形态 B：官网嵌入式浮窗（Embeddable Widget / SDK）**
   - 外部业务方仅需在任意网站引入一行代码即可接入：
     ```html
     <script 
       src="https://support.pkiln.com/embed.js" 
       data-project="YIPAIJIHE_SUPPORT" 
       data-position="bottom-right" 
       defer>
     </script>
     ```
   - 采用 **Shadow DOM** 技术进行 CSS 样式隔离，绝对不会污染或被宿主网站的 CSS 影响；
   - 提供优雅的右下角悬浮按钮与平滑展开/收起过渡动效。

---

## 4. 安全与权限隔离机制

1. **物理零代码泄露**：
   - 客户端工程中完全没有管理端路由、无 Mongoose Schema、无后台权限判断代码，从根本上杜绝反编译分析泄露后台资产。
2. **凭证与网络隔离**：
   - 客户端完全不需要用户登录态 Cookie，仅使用公开安全的会话标识；
   - `support.pkiln.com` 网关层硬性拦截 `/customer-service/console`、`/dashboard`、`/api/customer-service/admin/*` 等所有后台路径（直接返回 404）。
3. **接口防刷与防盗链**：
   - 客户端接口集成 Redis 滑动窗口限流；
   - 后端对 `AllowedOrigins` 来源域名做严格校验。

---

## 5. 域名与 Nginx 网关路由规划

### 5.1 客户端网关：`support.pkiln.com`
```nginx
# 1. 静态资源与页面直接由轻量客户端容器提供
location / {
    proxy_pass http://customer-service-client:80;
}

# 2. 公共 API 反代至 FastGPT 主后端
location /api/customer-service/public/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_buffering off; # 保证 SSE 安全流式推送
}

# 3. 硬性安全拦截（禁止访问任何后台路径）
location ~* ^/(dashboard|customer-service/console|customer-service/admin|api/admin|api/customer-service/admin) {
    return 404;
}
```

### 5.2 管理端网关：`admin.pkiln.com`
```nginx
# 首页默认直达客服控制台
location = / {
    return 302 /customer-service/console;
}

# 全量反代至 FastGPT 主服务
location / {
    proxy_pass http://127.0.0.1:3001;
    client_max_body_size 100M;
}
```

---

## 6. 实施路线图与任务分解 (TODO)

- [ ] **阶段 1：客户端独立子工程脚手架搭建**
  - [ ] 在 `projects/customer-service-client` 初始化 Vite + React + TypeScript 工程；
  - [ ] 配置 pnpm workspace 关联 `@fastgpt/global`，共享 OpenAPI 契约；
  - [ ] 搭建轻量级 CSS 主题变量体系（与产品设计语言保持一致）。
- [ ] **阶段 2：独立客户端核心功能实现**
  - [ ] 实现轻量 SSE 客户端通信协议封装（带超时、重试与中止机制）；
  - [ ] 实现独立聊天页面：欢迎语、推荐问题、产品型号/版本选择器；
  - [ ] 实现流式答案打字效果、知识引用卡片展开、点赞/点踩/未解决反馈面板；
  - [ ] 针对移动端（iOS Safari / Android Chrome / 微信浏览器）进行无障碍与软键盘适配。
- [ ] **阶段 3：官网嵌入式浮窗（Widget SDK）开发**
  - [ ] 封装 Shadow DOM 浮窗容器，实现点击浮动图标弹出对话框；
  - [ ] 导出独立的单文件打包配置 `embed.js`；
  - [ ] 提供嵌入参数配置（主题色、默认问候语、弹出位置、默认展开等）。
- [ ] **阶段 4：容器化、CI/CD 与双域名网关配置**
  - [ ] 编写轻量 Multi-stage Dockerfile（基于 Nginx Alpine，镜像大小 < 25MB）；
  - [ ] 更新 `docker-compose.override.yml` 编排配置；
  - [ ] 配置 `support.pkiln.com` 与 `admin.pkiln.com` 的 Nginx 分流与 SSL 证书。
- [ ] **阶段 5：双端全链路冒烟与性能压测**
  - [ ] 验证独立网页与嵌入 Widget 在各端的跨域通信与流式响应；
  - [ ] 首屏性能审计（Lighthouse 跑分 95+，FCP < 0.5s）；
  - [ ] 最终上线切换与灰度验证。
