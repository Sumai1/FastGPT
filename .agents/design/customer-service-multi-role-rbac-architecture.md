# 智能客服系统多角色权限体系与数据库深度增强 Trellis 实施规范

- **文档版本**：V2.0（多角色工作台隔离与三权分立闭环版）
- **适用系统**：企业无人自助设备（拍照机 / 售货机）智能客服与知识治理系统
- **状态**：阶段 1 - 需求分析与 Trellis 实施流程规划（待用户确认，暂不执行）

---

## 🎯 一、 核心目标与需求边界

### 1.1 核心业务目标
1. **彻底解决“单页面平铺”问题**：
   - 将现有单页面 `/customer-service/console` 彻底解耦为 **3 大角色专属工作台 + 1 个独立权限管理中心**，实现不同角色的物理路由与视图隔离；
2. **多角色职责与权限隔离 (RBAC & Separation of Duties)**：
   - **知识采编员 (Knowledge Editor)**：专属路由 `/customer-service/editor`，聚焦 4 大模板录入、草稿箱、待提交队列与驳回修改，**彻底隐藏发布/下架按钮与敏感系统配置**；
   - **知识审核员 (Knowledge Reviewer)**：专属路由 `/customer-service/reviewer`，聚焦待审队列、新旧版本 Diff、沙盒试问与审批批注，**强制拦截自编自审**；
   - **系统管理员 (Customer Service Admin)**：专属路由 `/customer-service/admin`，聚焦项目编排、产品四级拓扑、OpenAPI Key 绑定与全局运营大盘；
   - **权限管理中心 (Role Center)**：专属路由 `/customer-service/roles`，团队成员角色矩阵看板、采编与审核互斥校验、岗位变更审计流水。
3. **数据库模型深度升级**：
   - 新增审核历史流水表 `customer_service_knowledge_audits`（记录每次提交、驳回批注、发布与下架）；
   - 扩展角色表 `customer_service_member_roles` 支持基于产品大类/型号的**精细化范围授权 (`allowedCategoryIds` / `allowedModelIds`)**；
   - 扩展请求表 `customer_service_requests` 增加**转人工排查留痕 (`handoffSnapshot`)**；
   - 声明错误代码等关键字段的二级索引。
4. **角色视角切换与权限模拟器**：
   - 顶栏提供当前身份徽章与一键切换视角能力，方便管理员体验和验证不同角色的界面权限。

---

## 🗄️ 二、 数据库 Schema 扩展设计 (Strict defineIndex 规范)

### 2.1 新增：知识审核流水表 (`MongoCustomerServiceKnowledgeAudit`)
- **集合名**：`customer_service_knowledge_audits`
- **文件位置**：[`packages/service/core/customerService/knowledge/auditSchema.ts`](file:///root/FastGPT-source/packages/service/core/customerService/knowledge/auditSchema.ts)

```ts
const CustomerServiceKnowledgeAuditSchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: TeamCollectionName, required: true },
  knowledgeId: { type: Schema.Types.ObjectId, ref: CustomerServiceKnowledgeCollectionName, required: true },
  versionGroupId: { type: String, required: true },
  version: { type: Number, required: true },
  action: {
    type: String,
    enum: ['createDraft', 'submitReview', 'reject', 'publish', 'offline', 'emergencyOffline'],
    required: true
  },
  operatorTmbId: { type: Schema.Types.ObjectId, ref: TeamMemberCollectionName, required: true },
  fromStatus: { type: String },
  toStatus: { type: String, required: true },
  reason: { type: String, default: '' },       // 驳回或下架的具体审核意见
  diffSummary: { type: String, default: '' },  // 版本变更摘要
  createTime: { type: Date, default: () => new Date() }
});

// 索引声明
defineIndex(CustomerServiceKnowledgeAuditSchema, { key: { teamId: 1, knowledgeId: 1, createTime: -1 } });
defineIndex(CustomerServiceKnowledgeAuditSchema, { key: { teamId: 1, versionGroupId: 1, createTime: -1 } });
defineIndex(CustomerServiceKnowledgeAuditSchema, { key: { teamId: 1, operatorTmbId: 1, createTime: -1 } });
```

### 2.2 扩展：成员角色表增加范围授权 (`MongoCustomerServiceMemberRole`)
- **文件位置**：[`packages/service/core/customerService/memberRole/schema.ts`](file:///root/FastGPT-source/packages/service/core/customerService/memberRole/schema.ts)

```ts
// 扩展字段
allowedCategoryIds: {
  type: [Schema.Types.ObjectId],
  ref: CustomerServiceProductCategoryCollectionName,
  default: [] // 空数组表示拥有全量产品大类权限
},
allowedModelIds: {
  type: [Schema.Types.ObjectId],
  ref: CustomerServiceProductModelCollectionName,
  default: [] // 空数组表示拥有全量型号权限
}
```

### 2.3 扩展：客服请求表增加排查留痕 (`MongoCustomerServiceRequest`)
- **文件位置**：[`packages/service/core/customerService/request/schema.ts`](file:///root/FastGPT-source/packages/service/core/customerService/request/schema.ts)

```ts
// 扩展字段
handoffSnapshot: {
  productModelName: { type: String },
  hardwareVersionName: { type: String },
  softwareVersionName: { type: String },
  faultCode: { type: String },
  completedSteps: { type: [String], default: [] }, // 用户在前端打钩确认已执行的排查项
  summaryText: { type: String }                    // 自动生成的工单摘要文本
}
```

---

## 🖥️ 三、 前端专属角色工作台与路由架构

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │             智能客服前端多角色工作空间体系              │
                                  └──────────────────────────┬─────────────────────────────┘
                                                             │
         ┌───────────────────────────────────┬───────────────┴───────────────┬───────────────────────────────────┐
         ▼                                   ▼                               ▼                                   ▼
【知识采编专属工作台】               【知识审核专属工作台】          【系统管理员控制台】                【角色与权限独立管理中心】
  路由: /customer-service/editor       路由: /customer-service/reviewer 路由: /customer-service/admin       路由: /customer-service/roles
  • 4 大结构化模板新建与导入           • 待审知识优先级队列 (Pending)   • 客服项目编排与参数配置            • 团队成员列表与客服角色矩阵
  • 我的草稿箱 (Drafts)                • 新旧版本双栏/单栏 Diff 审查   • 产品四级拓扑树看板                • 编辑员 / 审核员互斥授权
  • 被驳回修改队列 (Rejected)          • 审核沙盒隔离试问与评分        • 全局 OpenAPI Key 绑定与配额       • 岗位变更历史与安全审计日志
  • 知识命中检索自测                   • 审批通过 / 驳回批注           • 运营大盘与系统健康监控            • 双人复核防范规则配置
  • 【权限阻断】无发布/配置权限        • 【权限阻断】禁止自编自审提示  • 紧急下架与全局接管                • 权限模拟器（一键切换视角体验）
```

### 3.1 页面路由划分与功能映射

1. **`/customer-service/editor`（采编员专属工作台）**：
   - 顶部快捷操作栏：4 大模板新建入口（产品主档 / 操作说明 / 批量 FAQ / 售后故障卡）；
   - 左侧工作区导航：
     - ① **我的草稿箱**：展示由我创建处于 `draft` 状态的知识，支持在线编辑与一键提交审核；
     - ② **待审核跟踪**：展示已提交给审核员的 `pending` 知识，实时查看审核进度；
     - ③ **被驳回待修单**：高亮展示 `rejected` 知识，悬浮查看审核员给出的驳回批注与修改建议；
     - ④ **知识自测台**：输入问题自测知识切片的召回情况。
   - **权限红线**：不显示任何“审批通过”、“发布”、“下架”、“API Key 分配”、“角色授权”等越权按钮。

2. **`/customer-service/reviewer`（审核员专属工作台）**：
   - 核心视图：
     - ① **待审优先级队列**：展示所有 `pending` 状态的待审核知识（按紧急度、提交时间排序）；
     - ② **新旧版本双栏 Diff 查看器**：高亮对比新增/删除/修改内容，展示受众/型号影响面；
     - ③ **审核沙盒试问引擎**：对当前待审知识直接执行隔离试问与评分；
     - ④ **审批操作面板**：
       - 点击【通过审核】：自动平滑下架同版本组旧知识，生效新版本；
       - 点击【驳回草稿】：弹出驳回原因模态框，填写修改批注并记录到审核流水表；
     - ⑤ **双人复核安全拦截**：若当前审核员是该知识草稿的 `submitterTmbId`，发布按钮自动置灰禁用，并显示醒目黄色警示条 ⚠️「**双人复核原则：您是该草稿提交人，禁止自审，请交由其他审核员审批**」。

3. **`/customer-service/admin`（系统管理员控制台）**：
   - 核心视图：
     - ① **客服项目管理**：创建/配置客服项目、无 Key 访问开关、转人工规则与敏感词拦截；
     - ② **产品架构工作台**：大类 ➔ 系列 ➔ 型号 ➔ 版本四级树形拓扑看板与关联知识库配置；
     - ③ **全局 API Key 授权中心**：OpenAPI Key 绑定与受众权限分级（Public/Dealer/Internal）；
     - ④ **运营效能大盘**：Token/费用/好评率趋势图、转人工归因分析与 Badcase 聚类大屏；
     - ⑤ **紧急治理操作**：支持管理员对任意异常知识执行紧急强制下架（填写紧急下架审计理由）。

4. **`/customer-service/roles`（角色与权限独立管理中心）**：
   - 核心视图：
     - ① **团队成员角色看板**：展示当前团队成员列表、姓名、邮箱、当前客服角色徽章、负责的产品线范围；
     - ② **一键授权模态框**：为成员分配 `客服管理员` / `知识编辑员` / `知识审核员`；
     - ③ **互斥性校验提示**：明确标注“**知识编辑员与知识审核员岗位天然互斥，严禁单人兼任**”；
     - ④ **权限变更审计日志表格**：分页展示所有历史授权变更流水（操作人、时间、变更前角色、变更后角色、授权原因）。

5. **顶栏角色视角切换器 (Role Switcher & Simulator)**：
   - 顶栏右侧展示当前用户身份徽章（如 `🛡️ 系统管理员` / `📝 知识采编员` / `🔍 知识审核员`）；
   - 管理员点击下拉菜单，可一键切换为 **“编辑员视角模拟”** 或 **“审核员视角模拟”**，实时体验不同角色在前端的页面导航、按钮可见性与拦截逻辑。

---

## 🔒 四、 后端 API 扩展与双人复核安全拦截

1. **审核流水记录 API**：
   - `GET /api/customer-service/admin/knowledge/audits`：获取指定知识的历史审核流水与驳回批注列表；
2. **防自审服务端拦截**：
   - 在 [`review.ts`](file:///root/FastGPT-source/projects/app/src/pages/api/customer-service/admin/knowledge/review.ts) 中增加强校验：
     ```ts
     if (action === 'publish' && String(knowledge.submitterTmbId) === String(tmbId)) {
       throw new UserError('双人复核原则：您是该知识版本的提交人，禁止自行审核发布，请交由其他审核员审批');
     }
     ```
3. **带产品范围的角色授权 API**：
   - 扩展 `POST /api/customer-service/admin/role/set`，支持传入 `allowedCategoryIds` 与 `allowedModelIds`；
4. **转人工摘要上报 API**：
   - `POST /api/customer-service/public/handoff`：接收用户已勾选的排查步骤并持久化存入 `customer_service_requests.handoffSnapshot`。

---

## 📋 五、 标准 Trellis 实施 TODO 清单

### 📌 阶段 1：数据库 Schema 扩展与数据迁移
- [x] **T1.1 审核流水 Schema**
  - [x] 扩展 `packages/service/core/customerService/knowledge/schema.ts`（支持 `versionGroupId`, `version`, `diffSummary`）并通过 `defineIndex` 声明索引
- [x] **T1.2 角色范围与排查留痕 Schema 扩展**
  - [x] 在 `memberRole/schema.ts` 增加 `allowedCategoryIds`, `allowedModelIds`
  - [x] 在 `request/schema.ts` 增加 `handoffSnapshot`
- [x] **T1.3 全局类型与 OpenAPI 契约更新**
  - [x] 更新 `packages/global/core/customerService/type.ts` 与 `api.ts`

### 📌 阶段 2：后端多角色接口与防自审安全拦截
- [x] **T2.1 实现审核流水记录与查询接口**
  - [x] 在 `knowledge/service.ts` 中流转状态时自动写入 `MongoCustomerServiceKnowledgeAudit`
  - [x] 新建 `projects/app/src/pages/api/customer-service/admin/knowledge/audits.ts` 与 `admin/role/audits.ts`
- [x] **T2.2 严格防自审服务端拦截**
  - [x] 在 `review.ts` 增加提交人与审核人相同拦截（自审 400 阻断）
- [x] **T2.3 角色范围授权与转人工留痕接口**
  - [x] 更新 `admin/role/set.ts` 与新建 `public/handoff.ts`

### 📌 阶段 3：前端 3 大独立角色工作台与权限中心路由
- [x] **T3.1 采编员专属工作台 (`/customer-service/editor`)**
  - [x] 创建独立路由与页面组件，集成草稿箱、待审跟踪、被驳回修订单、自测台
- [x] **T3.2 审核员专属工作台 (`/customer-service/reviewer`)**
  - [x] 创建独立路由与页面组件，集成待审队列、双栏 Diff、沙盒试问、防自审禁用提示
- [x] **T3.3 管理员控制台 (`/customer-service/admin`)**
  - [x] 精简为项目编排、产品拓扑、Key 绑定、运营大盘
- [x] **T3.4 角色与权限独立管理中心 (`/customer-service/roles`)**
  - [x] 创建独立成员角色看板、互斥授权模态框与审计日志流水表
- [x] **T3.5 顶栏角色视角切换器与全局路由守卫 (RBAC Guard)**
  - [x] 顶部嵌入身份徽章与管理员视角模拟器，根据当前角色动态阻断未授权路由访问

### 📌 阶段 4：质量门禁、单测回归与代码自测
- [x] **T4.1 单元测试与 TypeScript 全量校验**
  - [x] 补充角色互斥与防自审单元测试（全局、服务端、应用端 15+ 套件全量通过）
  - [x] 运行 `pnpm --filter @fastgpt/app typecheck` 验证 0 错误

---

## 🎯 六、 验收标准与交付物

1. **路由与页面隔离**：
   - 访问 `/customer-service/editor` 直达采编员专属界面，无越权按钮；
   - 访问 `/customer-service/reviewer` 直达审核员待审队列与 Diff 试问台；
   - 访问 `/customer-service/admin` 直达管理员配置与运营大盘；
   - 访问 `/customer-service/roles` 直达成员权限与审计流水中心。
2. **三权分立与双人复核**：
   - 采编员无法看到发布/下架按钮；
   - 审核员无法审批自己提交的草稿（UI 明确提示禁用，服务端返回 400 阻断）；
   - 编辑与审核岗位互斥，单人无法同时拥有两种角色。
3. **数据库留痕完整**：
   - 每次审核流转均在 `customer_service_knowledge_audits` 中留下时间戳、操作人与驳回批注；
   - C 端转人工时已完成的排查步骤在 `customer_service_requests` 中完整留痕。
