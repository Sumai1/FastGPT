# 智能客服系统后端全功能增强 Trellis 设计规范与实施方案

- **项目名称**：企业无人自助设备智能客服与知识治理系统（后端深度增强）
- **技术栈**：
  - **后端框架**：Next.js API 路由 + Node.js (TypeScript) + Mongoose / MongoDB + PgVector / Milvus
  - **核心包**：`packages/service/`、`packages/global/`、`projects/app/src/pages/api/customer-service/`
- **当前阶段**：阶段 1 - 需求分析与后端技术架构设计

---

## 🎯 一、 核心目标与量化指标

1. **版本生命周期闭环与防冲突**：
   - 建立知识版本组（`versionGroupId`）与版本链路（`supersededBy`），实现当新版本审核发布通过时，同语义范围的旧版本**原子化自动平滑下架（`offline`）**并物理更新底层 `forbid=true`，彻底杜绝新旧知识串台。
2. **审核员实时试问沙箱 (Review Sandbox)**：
   - 提供隔离的 `/api/customer-service/admin/knowledge/testSearch` 接口，允许审核员在不发布的前提下，对待审知识执行混合检索 + Rerank 相似度评分试问，确保入库召回率（Recall@5 > 90%）。
3. **对话运营统计与 Badcase 聚类引擎**：
   - 提供高性能聚合接口 `/api/customer-service/admin/operation/metrics`（按日/周/月聚合 Token、费用、响应耗时、解决率与转人工率）；
   - 提供 Badcase 语义聚类接口 `/api/customer-service/admin/operation/clusters`，自动归纳高频未解决问题并支持一键生成知识草稿。
4. **4 大结构化模板与批量 FAQ 导入**：
   - 提供 `/api/customer-service/admin/knowledge/createStructured` 与 `importBatch`，支持 Excel/JSON 批量导入与去重。
5. **代码规范严守**：
   - API 入参全部使用 `parseApiInput`；
   - MongoDB 索引全部通过 `defineIndex` 声明；
   - 核心函数补充 `/** ... */` 注释。

---

## 🏗️ 二、 核心架构设计与数据库模型扩展

### 2.1 知识版本链数据模型扩展 (`MongoCustomerServiceKnowledge`)

在 [`packages/service/core/customerService/knowledge/schema.ts`](file:///root/FastGPT-source/packages/service/core/customerService/knowledge/schema.ts) 中增加版本链与冲突检测字段：

```ts
// 知识治理 Schema 增强字段
versionGroupId: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() }, // 同一知识的版本族 ID
version: { type: Number, required: true, default: 1 }, // 版本序号 1, 2, 3...
supersededBy: { type: String, default: null }, // 被哪个新版本知识 ID 替代下架
supersededAt: { type: Date, default: null },   // 被替代时间
structuredData: { type: mongoose.Schema.Types.Mixed, default: null }, // 结构化模板专有字段（主档参数/故障步骤树等）
```

**索引维护（严格遵循 `defineIndex` 规范）**：
```ts
defineIndex(CustomerServiceKnowledgeSchema, {
  key: { teamId: 1, versionGroupId: 1, version: 1 }
});
defineIndex(CustomerServiceKnowledgeSchema, {
  key: { teamId: 1, datasetId: 1, status: 1, audienceLevel: 1 }
});
```

---

### 2.2 审核试问沙盒引擎设计 (`testSearch.ts`)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        审核试问沙盒执行流                              │
├────────────────────────────────────────────────────────────────────────┤
│ [审核员输入测试问题] ➔ [指定 pending / draft 状态的 collectionId]       │
│                                  │                                     │
│                                  ▼                                     │
│            [服务端构建临时白名单: { collectionIds: [targetId] }]        │
│                                  │                                     │
│                                  ▼                                     │
│       [执行混合检索 (Embedding 向量检索 + Text 全文检索) + Rerank 重排]  │
│                                  │                                     │
│                                  ▼                                     │
│     [返回: 相似度匹配分 (Score)、命中文档切片 (Chunks)、模型生成拟答]   │
└────────────────────────────────────────────────────────────────────────┘
```

- **API 路径**：`POST /api/customer-service/admin/knowledge/testSearch`
- **入参契约**：
  ```ts
  {
    datasetId: string;
    collectionId: string;
    question: string;
    modelId?: string;
  }
  ```
- **出参契约**：
  ```ts
  {
    score: number;
    matchCount: number;
    chunks: Array<{ chunkId: string; content: string; score: number }>;
    answerPreview: string;
  }
  ```

---

### 2.3 运营大盘与 Badcase 聚类统计引擎

#### 1. 运营大盘聚合接口 (`/operation/metrics`)
- **API 路径**：`GET /api/customer-service/admin/operation/metrics`
- **能力**：基于 MongoDB Aggregation Pipeline 对 `MongoCustomerServiceRequest` 进行时间切片统计：
  - `totalTokens` / `totalPoints` 趋势（按天/按周）；
  - `avgDurationSeconds`（平均响应耗时）；
  - `resolutionRate`（好评与未解决比例）；
  - `handoffReasonDistribution`（转人工原因分类占比：扣费争议/硬件故障/未查到资料/危险阻断）。

#### 2. Badcase 语义聚类接口 (`/operation/clusters`)
- **API 路径**：`GET /api/customer-service/admin/operation/clusters`
- **能力**：
  - 查询最近 30 天内所有 `feedback: 'unresolved' | 'bad'`、`lowConfidence: true` 或 `resultStatus: 'unanswered'` 的请求；
  - 按错误代码（如 `ERR-xxx`）或文本语义相似度（Levenshtein / N-Gram / 向量近似）自动归并为主题聚类；
  - 输出代表性问答与样本提问列表，供管理员一键点击生成草稿。

---

### 2.4 4 大结构化模板入库与 FAQ 批量导入协议

1. **结构化创建 API**：`POST /api/customer-service/admin/knowledge/createStructured`
   - 支持 `templateType: 'productMaster' | 'manual' | 'faq' | 'faultCard'`；
   - 服务端依据模板类型执行强类型校验，格式化为标准 Markdown 并完成 FastGPT collection 写入与治理表登记。
2. **批量 FAQ 导入 API**：`POST /api/customer-service/admin/knowledge/importBatch`
   - 接收 FAQ 列表数组 `items: Array<{ question: string; similarQuestions?: string[]; answer: string }>`；
   - 批量写入数据集并自动完成相似问索引绑定。

---

## 📝 三、 任务执行清单 (TODO List)

### 📌 阶段 1：数据模型与底层服务层升级
- [ ] **T1.1 Schema 扩展与索引声明**
  - [ ] 在 `packages/service/core/customerService/knowledge/schema.ts` 增加 `versionGroupId`, `version`, `supersededBy`, `structuredData`
  - [ ] 使用 `defineIndex` 声明联合索引
  - [ ] 更新 `packages/global/core/customerService/type.ts` 与 OpenAPI 类型定义
- [ ] **T1.2 版本链路与发布审核逻辑增强**
  - [ ] 修改 `packages/service/core/customerService/knowledge/service.ts` 中的 `reviewKnowledge` 方法：审核通过时自动将上一版本置为 `offline` 并联动底层 `forbid=true`
  - [ ] 编写单元测试验证版本升级与下架原子性

### 📌 阶段 2：审核沙盒与实时试问 API
- [ ] **T2.1 实现 `testSearch.ts` API**
  - [ ] 在 `projects/app/src/pages/api/customer-service/admin/knowledge/testSearch.ts` 实现入参校验与沙盒检索
  - [ ] 对接 FastGPT 向量与重排检索器，返回命中分与切片
- [ ] **T2.2 前端 `InlineTestSandbox.tsx` 真实联调**
  - [ ] 替换前端试问 Mock 数据为真实后端 API 调用

### 📌 阶段 3：运营大盘与 Badcase 聚类统计引擎
- [ ] **T3.1 实现 `/admin/operation/metrics.ts` 统计聚合 API**
  - [ ] 基于 MongoDB 聚合管道实现 Token/费用/好评率/转人工原因统计
- [ ] **T3.2 实现 `/admin/operation/clusters.ts` 语义聚类 API**
  - [ ] 实现低置信度与点踩提问的主题聚类聚合
- [ ] **T3.3 前端 `OperationsStudio` 真实数据接入**
  - [ ] 替换前端大屏与聚类列表为真实 API

### 📌 阶段 4：结构化知识入库与批量 FAQ API
- [ ] **T4.1 实现 `createStructured.ts` 与 `importBatch.ts`**
  - [ ] 落地 4 大结构化模板校验与批量 FAQ 导入协议
- [ ] **T4.2 质量门禁与生产验证**
  - [ ] 运行 Vitest 单元测试与 TypeScript 全量校验
  - [ ] 生产镜像构建与部署升级
