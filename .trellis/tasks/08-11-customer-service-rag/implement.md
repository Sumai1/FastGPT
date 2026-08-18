# 实施计划

执行状态以仓库根目录《智能客服RAG-TODO.md》为唯一详细清单，本文件维护 Trellis 阶段门禁。

## 阶段一：基线与技术验证

- 记录源码、工具链、镜像和依赖基线；保留 origin 并配置官方 upstream。
- 验证现有导入、训练、混合检索、Rerank、聊天、引用、反馈、日志、费用、Key 和权限链路。
- 定位白名单注入点及客服绑定 Key 的通用 completions 拒绝点，形成可执行修改清单。

## 阶段二至三：品牌、产品、知识和权限

- 先用现有配置完成品牌和导航裁剪。
- 在 global/service/app 三层实现产品目录、版本、dataset 绑定、引用式知识治理、审核状态机和客服岗位。
- 提供管理 API、OpenAPI 合约和管理界面；每个增量同步局部测试。

## 阶段四至五：项目、检索、客服 API 和站内入口

- 实现项目/App 与 Key 的引用绑定、受众/来源/限流配置和通用接口防绕过。
- 在现有检索入口增加可选内部 collection 白名单，保证普通搜索兼容。
- 实现 products/chat/feedback/health 薄适配层和站内客服 UI，复用聊天、引用、会话、反馈、日志和 usage。

## 阶段六：导入和调优工具

- 提供产品资料模板、脱敏检查、批量导入说明、200 题格式和评测工具。
- 用仓库内样例验证完整流程；真实三产品资料和模型密钥到位后直接替换配置与样例。

## 阶段七：部署和验收

- 提供 Compose/环境模板、健康检查、数据迁移、升级、回滚、备份恢复和上线检查文档。
- 完成最终 typecheck、lint、测试和构建，逐项关闭 TODO；外部环境验收项保留明确证据和操作命令。

## V1.2 原生创建与标准模板改造（已完成可交付项）

1. [x] 使用原生节点创建模板源 App，完成客服分类、检索、兜底、提示词和“产品库”绑定。
2. [-] 结构测试、问候、无关问题、正常知识问答、投诉/安全/人工、无资料兜底和同会话话题切换的真实冒烟已通过；型号不明和完整题集仍待验证。
3. [x] 将工作流注册为本地 `commercial-customer-service-standard-v1` 模板。
4. [x] 在原生应用列表增加“创建智能客服”入口并推荐该模板。
5. [x] 创建后继续进入原生 App Detail；与客服 API 联调白名单、引用和低置信度规则。
6. [x] 通过类型检查、生产构建和线上路由/客服冒烟验证兼容并上线，保留旧项目及旧镜像回滚路径。

## V1.3 无 Rerank 先行交付（已上线）

1. [x] 标准模板关闭 Rerank、收紧检索上下文并增加完整条目分页及指定系列边界规则。
2. [x] 客服结果适配器识别标准工作流固定分支，并覆盖嵌套、未知和知识分支测试。
3. [x] 客服 API 对问候/非业务、人工/安全、资料不足和知识回答分别执行正确的状态及引用规则。
4. [x] 应用列表增加“创建智能客服”，创建页默认使用标准 Workflow 模板。
5. [x] global/app 定向测试、类型检查、格式、lint 和 ARM64 生产构建通过。
6. [x] 模板源 App 编辑态与发布态已同步为 V1.3.1；生产 Key 在新版部署及冒烟后绑定标准工作流。

上线证据（2026-08-12）：

- 生产镜像：`fastgpt-customer-service:20260812-1535`，应用和 MongoDB 均为 `healthy`。
- 工作流发布版本：`客服工作流 V1.3.1（无 Rerank，收紧系列边界）`。
- 生产 Key 绑定 App：`6a7acee8b28b311d5ef28803`；问候、非业务、转人工和知识回答均返回 200。
- 价格知识冒烟返回 `answered`，六组价格对应正确且带 3 条真实引用；当前 Grok 模型耗时 94 秒。
- 无 Rerank 时项目低置信度阈值按真实命中分数从 `0.45` 调整为 `0.35`；后续接入 Rerank 后用完整题集重标定。

## V1.4 产品化控制台（已上线）

1. [x] 盘点旧综合管理页、全局导航和可复用的 App/Dataset/Key 客户端接口。
2. [x] 新增业务控制台壳、总览指标、待办及模块导航。
3. [x] 实现标准客服创建向导，原子创建 Workflow App、客服项目、专用 Key 和绑定。
4. [x] 提供客服、知识、产品和审核业务视图，隐藏普通操作中的内部 ID。
5. [x] 将旧管理页保留为高级设置，并切换桌面和移动端默认客服导航。
6. [x] 完成格式、lint、类型检查、生产构建和页面路由冒烟；验证旧页面仍可回退。

上线证据（2026-08-13）：

- 生产镜像：`fastgpt-customer-service:20260813-1231`，应用和 MongoDB 均为 `healthy`。
- `/customer-service/console` 与兼容页 `/customer-service/admin` 均返回 200。
- 登录态下产品、知识、项目、岗位列表以及托管创建鉴权/参数校验通过。
- 已绑定生产 Key 的 health/products 冒烟返回 200；旧镜像 `20260812-1535` 保留回滚。

本阶段只有在用户批准 V1.2 后执行，详细 TODO 见根目录《智能客服RAG-TODO.md》第 9 节。

## V1.5 双前端产品闭环整改（质量门禁与生产构建已通过，待现网发布）

1. [x] 核对原需求第十章，确认客户咨询端和管理运营端两套前端边界。
2. [x] 完成 V1.5 需求、设计、规划、TODO 和 Trellis 文档同步。
3. [x] 实现固定项目客户入口、访问边界、人工入口、unresolved 反馈、心跳/总时限和停止链路。
4. [x] 实现知识导入治理向导、训练状态和待登记恢复。
5. [x] 实现 Workflow 知识范围同步、项目就绪检查和失败重试。
6. [x] 实现对话运营查询、筛选、详情和转知识草稿。
7. [x] 实现成员岗位维护及工作台健康待办。
8. [x] 完成局部测试、跨端闭环回归、最终全量门禁（5121/5121 用例全部通过）与 Next.js 生产构建（0 错误）。
9. [ ] 备份现网并执行灰度发布至 `support.pkiln.com`。

当前客户页采用“安全 SSE”口径：请求建立后先发送处理状态与心跳，模型结果完成引用、置信度和
安全判定后才发送答案分块；这避免把后续可能被拦截的 token 提前透传，但不等同于模型 token 级实时流式。
客服请求表是最小脱敏运营投影，不复制原生 chat/chatItem 正文集合。Rerank 仍按用户决定延后。

阶段详细清单见根目录《智能客服RAG-TODO.md》第 11 节；代码设计见《智能客服RAG功能开发文档.md》第 13 章。

## V1.6 FastGPT 原生解耦与全局架构重构 (Native First)

1. [x] **原生团队管理 (`/account/team`) 改造**：在 [`MemberTable.tsx`](file:///root/FastGPT-source/projects/app/src/pageComponents/account/team/MemberTable.tsx) 接入 [`DirectAddMemberModal.tsx`](file:///root/FastGPT-source/projects/app/src/pageComponents/account/team/DirectAddMemberModal.tsx)，支持管理员直接创建成员账号。
2. [x] **知识采编与审核流拆入知识库 (`/dataset`) 体系**：建立 [`/dataset/editor`](file:///root/FastGPT-source/projects/app/src/pages/dataset/editor/index.tsx) 与 [`/dataset/reviewer`](file:///root/FastGPT-source/projects/app/src/pages/dataset/reviewer/index.tsx)，在知识库列表顶部增加直达入口。
3. [x] **全局侧边栏清理与路由兼容**：在 [`navbar.tsx`](file:///root/FastGPT-source/projects/app/src/components/Layout/navbar.tsx) 与 [`navbarPhone.tsx`](file:///root/FastGPT-source/projects/app/src/components/Layout/navbarPhone.tsx) 移除冗余的 `customer_service` 侧边栏项，将 `/customer-service/roles` 重定向至 `/account/team`，`/customer-service/console` 重定向至 `/dataset/list`。
4. [x] **自动化测试与全量验收**：运行 `createMember.test.ts` 单元测试，全部通过。

