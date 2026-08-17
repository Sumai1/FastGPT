# 企业产品智能客服 RAG 功能开发文档

文档版本：V1.5  
文档状态：V1.5 双前端产品闭环代码已完成，最终门禁、构建与灰度部署收口中

## 1. 开发约束

- 只有用户明确授权开始开发后才修改代码、依赖、数据库、分支或部署配置。
- 开发前读取 `AGENTS.md`、`.agents/code/syntax.md` 及相关设计规范。
- 优先调用 FastGPT 现有 service/controller，不复制 dataset、chat、OpenAPI Key、权限、日志或计费实现。
- 新业务遵循 `packages/global` 类型/合约、`packages/service` 领域服务、`projects/app` API/UI 分层。
- API 边界使用 `parseApiInput`，请求和响应使用 Zod，并补齐 OpenAPI 路由信息。
- MongoDB 索引使用 `defineIndex`，索引调整同步检查已知历史索引和 index manager 测试。
- 核心业务函数、权限、审核状态机、白名单和兼容逻辑补充有意义的中文函数注释。
- 不修改现有 `/api/v1/chat/completions` 和 `/api/v2/chat/completions` 对外合约。

## 2. 直接复用清单

| 能力 | 复用位置 | 开发要求 |
|---|---|---|
| dataset、collection、chunk 和导入 | `packages/service/core/dataset`、现有 API/UI | 客服层只保存引用 ID |
| 训练队列、状态、错误和重试 | `packages/service/core/dataset/training`、`projects/app/src/service/core/dataset/queues` | 不新增 ingestion schema/queue |
| `forbid` 和双召回过滤 | `packages/service/core/dataset/search/defaultRecall` | 在现有过滤结果上求白名单交集 |
| 混合检索和 Rerank | `packages/service/core/dataset/search` | 不复制召回实现 |
| App/Workflow/LLM/AI Proxy | `packages/service/core/app`、`workflow`、`ai` | 客服项目引用现有 App |
| 聊天、流式、会话、引用和消息 | `packages/service/core/chat`、现有 completions | 复用存储和运行时 |
| 反馈、标注和日志 | `projects/app/src/pages/api/core/chat`、`core/app/logs` | 仅增加业务筛选适配 |
| OpenAPI Key | `packages/service/support/openapi` | 复用 Key、过期、额度和统计 |
| 团队/dataset/app 权限 | `packages/global/support/permission`、`packages/service/support/permission` | 映射业务动作，不另建权限框架 |

## 3. 建议目录边界

```text
packages/global/core/customerService/
├── constants.ts
├── type.ts
├── product/type.ts
├── knowledge/type.ts
├── project/type.ts
└── chat/type.ts

packages/global/openapi/customerService/
├── index.ts
├── product/api.ts
├── knowledge/api.ts
├── project/api.ts
├── chat/api.ts
└── feedback/api.ts

packages/service/core/customerService/
├── memberRole/{schema,entity,service}.ts
├── product/{schema,entity,service}.ts
├── knowledge/{schema,entity,service}.ts
├── project/{schema,entity,service}.ts
├── search/{whitelist,service}.ts
├── chat/{service,rule}.ts
└── config/{schema,entity,service}.ts

projects/app/src/pages/api/customer-service/
├── v1/{products,chat,feedback,health}.ts
└── admin/{product,knowledge,project,rule}/...

projects/app/src/pageComponents/customerService/
├── client/
├── admin/
├── hooks/
└── api.ts
```

目录是规划边界，不要求一次性生成所有文件。只在对应职责确有代码时创建，单函数使用的 helper 优先放在函数内部。

## 4. 新增数据模型

### 4.1 MongoDB collection

- `customer_service_product_categories`
- `customer_service_product_series`
- `customer_service_product_models`
- `customer_service_product_versions`
- `customer_service_member_roles`
- `customer_service_knowledges`
- `customer_service_knowledge_audits`
- `customer_service_projects`
- `customer_service_key_bindings`
- 可选 `customer_service_configs`

不新增：

- 客服 API Key 存储：引用现有 `openapi` 文档。
- 客服训练状态：读取现有 `dataset_trainings` 聚合状态。
- 客服 chat/chatItem：复用现有聊天集合。
- 客服日志/反馈/费用集合：优先复用现有字段和查询。

### 4.2 关键关联

- 产品型号保存 `datasetIds`，不复制 dataset 信息。
- 知识治理记录通过 `teamId + collectionId` 唯一引用 collection。
- 项目通过 `appId` 引用现有 FastGPT App。
- Key binding 通过 `openApiKeyId` 引用现有 OpenAPI Key。
- 会话通过 metadata 记录 `projectId`、产品版本、受众和人工状态。

### 4.3 索引

- `teamId + modelCode`：型号编码唯一。
- `teamId + tmbId`：每个成员一条有效客服岗位绑定。
- `teamId + seriesId + code`：系列编码唯一。
- `teamId + modelId + type + versionCode`：产品版本唯一。
- `teamId + collectionId`：治理记录唯一。
- `teamId + projectCode`：项目编码唯一。
- `teamId + openApiKeyId`：客服 Key binding 唯一。
- 白名单查询覆盖 `teamId + status + audienceLevel + effectiveFrom + effectiveTo` 及型号/版本字段。
- 审计查询覆盖 `knowledgeId + createTime`。

## 5. 权限实现

### 5.1 最小岗位绑定

`CustomerServiceMemberRole` 仅保存 `teamId`、`tmbId`、单个客服岗位、状态、创建/更新人和变更原因：

- `customerServiceAdmin`：岗位、项目、规则、日志和紧急操作。
- `knowledgeEditor`：治理编辑、导入、提交审核和检索测试。
- `knowledgeReviewer`：审核、驳回、发布、下架和冲突处理。

编辑与审核岗位互斥；团队 owner 在鉴权服务中默认视为客服管理员，避免首次配置死锁。岗位变更写审计，但不引入资源协作者或权限继承。

### 5.2 与现有资源权限叠加

- 编辑操作同时要求 `knowledgeEditor` 岗位和目标 dataset `WritePermissionVal`。
- 审核操作同时要求 `knowledgeReviewer` 岗位和目标 dataset `ManagePermissionVal`。
- 管理操作同时要求 `customerServiceAdmin` 岗位和团队/app 对应权限。
- 禁止自审比较版本固化的 `submitterTmbId` 与当前 `tmbId`，岗位变更不能绕过。

岗位决定业务动作，FastGPT 权限决定数据范围；除此之外不增加新资源权限类型。

## 6. 知识导入与审核

### 6.1 导入复用

客服导入 API/UI 调用现有 collection 创建和训练服务：

1. 根据产品选择目标 dataset。
2. 创建 collection 时设置 `forbid=true`。
3. 创建 `draft` 治理记录并保存 collection ID。
4. 沿用现有解析、分块、Embedding、训练状态、错误和重试。
5. 管理页面直接展示现有 collection 训练结果。

通用 FastGPT 导入保持不变。客服白名单只查询存在 `published` 治理记录的 collection，因此未治理 collection 不会进入客服问答。

### 6.2 审核发布

`knowledge/service.ts` 负责业务状态，不负责解析和向量训练：

- 提交前校验现有训练状态为 `ready`、内容非空及治理字段完整。
- 审核时校验 `reviewerTmbId !== submitterTmbId`。
- 驳回必须填写原因，collection 保持 `forbid=true`。
- 发布事务写治理状态、审计并设置新 collection `forbid=false`。
- 冲突旧版本在同一事务切换为 `offline` 和 `forbid=true`。
- 下架事务写原因、审计和 `forbid=true`。
- 使用状态/版本条件更新，避免并发审核或旧页面覆盖新状态。

## 7. 最小检索扩展

### 7.1 白名单计算

`search/whitelist.ts` 根据以下输入查询治理记录：

```ts
getCustomerServiceCollectionIds({
  teamId,
  projectId,
  maxAudience,
  requestAudience,
  modelId,
  hardwareVersionId,
  softwareVersionId,
  now
})
```

输出只包含允许的 collection ID。查询异常和无匹配均返回空列表或显式业务错误，调用方不得改用全部 dataset。

### 7.2 搜索入口改动

在现有统一默认召回参数中增加仅内部使用的可选 `collectionIdWhitelist`：

- 与 dataset 范围、现有 metadata filter 和 `forbidCollectionIdList` 求交集。
- 交集为空时 embedding/full-text 均返回空结果。
- 同一交集传入两条召回链，然后继续使用现有 Rerank。
- 字段不放入外部 OpenAPI、工作流普通输入或模型工具参数。

阶段一先通过调用链验证确定最窄改动位置。默认不修改所有工作流节点、Agent 工具和通用 App；客服专用执行路径不启用可绕过该白名单的 Agent dataset search。

## 8. 客服 API 适配

### 8.1 Key 认证

1. 使用现有 OpenAPI Key 认证服务取得 key document、team、app 和额度信息。
2. 查询 `CustomerServiceKeyBinding`，校验项目、状态、最高受众和来源。
3. 在适配层执行项目级频率限制，并继续使用现有 Key 额度和使用统计。
4. 已绑定客服项目的 Key 在通用 v1/v2 completions 入口被拒绝，防止绕过客服过滤。
5. Key 创建、轮换、过期、额度和使用统计继续使用原 FastGPT 页面和服务。

### 8.2 Chat service

`chat/service.ts` 只做业务编排：

1. 创建或接收 requestId/sessionId。
2. 完成 Key binding、项目和受众校验。
3. 将项目、Key 和 requestId 映射到现有 responseChatItemId/dataId 防重复机制；命中已有请求时不重复调用模型和计费。
4. 从业务预传字段、请求和会话中解析产品版本。
5. 执行前置危险/争议/人工规则。
6. 计算 collection 白名单。
7. 调用现有搜索、Rerank、App/LLM、流式和聊天持久化服务。
8. 根据引用和低置信度执行后置规则。
9. 在现有日志/metadata 中补充业务字段。

不复制 FastGPT 的消息准备、流式关闭、引用存储、反馈、usage 和费用聚合逻辑；优先复用已有函数，必要时仅增加薄适配参数。

写日志前复用或扩展现有脱敏工具，遮蔽完整 Key、手机号、身份证、地址、订单号和付款信息。上传和 metadata 沿用现有大小、扩展名、MIME 和字段数量限制。

### 8.3 API 合约

一期实现：

```text
GET  /api/customer-service/v1/products
POST /api/customer-service/v1/chat
POST /api/customer-service/v1/feedback
GET  /api/customer-service/v1/health
```

- `chat` 尽量沿用 FastGPT 现有流式/非流式格式，再补充产品解析和人工状态。
- `feedback` 调用现有反馈 service。
- `health` 组合现有应用、数据库和模型健康信息，不复制监控系统。
- 会话查询和删除不是默认新增存储；确有外部调用需求时再适配现有 chat service。
- 会话保留策略默认继承系统配置；如需项目级自动到期清理，只实现调用现有删除 service 的计划任务。

## 9. 前端实现

### 9.1 客服端

基于现有聊天组件扩展：

- 品牌、欢迎语和推荐问题。
- 业务页面自动传入产品型号。
- 系列、型号、硬件版本和软件版本选择。
- 已解析产品状态、结构化追问、安全警告和人工卡片。
- 复用流式 Markdown、引用、会话、点赞和点踩。

站内页面通过 Next.js 服务端代理访问客服 service，浏览器不保存 OpenAPI Key。

### 9.2 管理端

新增页面：产品树、版本、dataset 绑定、治理列表、审核队列、客服项目和受众绑定。

客服项目页同时管理推荐问题、人工联系方式、工作时间和会话保留策略。

复用页面：dataset/collection、导入、分块、训练、检索测试、App、模型、OpenAPI Key、日志和反馈。

日志页复用现有查询和导出，在需要时增加项目、产品、型号、引用、Token/费用、反馈、无答案和转人工的业务筛选适配。

高频问题转知识只预填标题、问题、来源和产品上下文，标记为“待整理知识（draft）”，然后进入现有知识创建/导入流程。

## 10. 实施顺序

1. 阶段一验证现有权限、Key、聊天运行时和最小白名单注入点。
2. 完成产品/版本及知识治理 schema、索引和纯 service 测试。
3. 完成审核状态机和 collection `forbid` 联动。
4. 完成客服项目和现有 Key binding。
5. 完成白名单查询及搜索入口最小扩展。
6. 完成客服 Chat 适配、转人工规则和 API。
7. 完成管理端及客服端薄扩展。
8. 完成三个试点资料、200 题调优、生产部署和最终验证。

## 11. 验证计划

- 产品、版本、治理状态和禁止自审：service 单元/集成测试。
- 索引：index manager 测试及唯一约束测试。
- API：Zod、权限、受众、错误码、流式和非流式测试。
- 安全：频率限制、Key 停用、来源限制、文件校验和日志脱敏测试。
- 幂等：相同项目/Key/requestId 重试复用既有消息，不重复调用模型或计费。
- 白名单：public/dealer/internal、型号、版本、状态、生效时间、空列表和查询失败测试。
- 搜索：embedding/full-text 都只能返回白名单且非 `forbid` 的 collection。
- Key：客服绑定 Key 调用通用 completions 必须失败。
- 回归：现有 dataset 导入、普通 App Chat、Agent 和通用 API 行为保持不变。
- 前端：产品上下文、追问、引用、人工卡片、反馈和浏览器无 Key。
- 隐私：会话删除、附件关联清理和配置的保留期限验证。
- 阶段完成时运行局部测试；全部完成后运行全量测试、类型检查、lint 和构建。

## 12. 兼容与回滚

- 新业务集合为增量数据，不修改现有 dataset/chat 正文。
- 搜索白名单参数可选；普通调用未传入时保持原行为。
- 客服绑定检查只影响明确绑定的 OpenAPI Key。
- 客服页面和 API 可通过配置/功能开关关闭。
- 回滚应用版本时保留新增业务集合，原 FastGPT 数据仍可使用。
- 每项对 FastGPT 核心文件的改动记录到二次开发修改清单，升级时优先验证这些扩展点。

## 13. V1.5 双前端实现设计

### 13.1 路由与访问模型

```text
/customer-service/chat/[projectCode]  正式客户咨询端
/customer-service/console             管理运营端
/customer-service                     登录态测试兼容入口
/customer-service/admin               高级兼容设置
```

- 正式客户地址使用不可变的 `projectCode` 定位一个启用项目，页面不返回其他项目列表。
- 浏览器只提交项目编码和用户输入，专用 Key 由服务端读取和使用，不进入 HTML、JavaScript、URL、LocalStorage 或接口响应。
- 公开访问会话固定为 public；dealer/internal 由现有业务登录态或服务端签发的短期访问凭证确定，服务端取入口授权和项目/Key 上限的最低受众，忽略客户端自行提高的 audience。
- 管理端继续使用团队登录态和现有客服岗位校验；客户预览由管理端打开正式客户地址，不复用项目选择器。
- 两套前端保留独立布局、导航和错误状态，但共享产品选择、消息气泡、引用、反馈及人工卡片等可复用组件。

### 13.2 客户咨询端页面结构

```text
品牌头部：客服名称 / 服务状态 / 联系人工
产品上下文：系列 → 型号 → 可选软硬件版本
欢迎区域：欢迎语 / 推荐问题
会话区域：用户问题 / 流式回答 / 引用 / 安全与人工卡片
回答操作：点赞 / 点踩 / 问题未解决
输入区域：文字输入 / 发送 / 停止生成 / 新会话
```

实现要求：

- 新增按 `projectCode` 加载的公开 bootstrap 和同源聊天适配；只返回该项目的公开配置及其允许的产品目录。
- 复用现有客服聊天 service、SSE、Markdown、引用和幂等 requestId，不实现第二套原生对话存储；客服请求表只保留脱敏的最小运营投影。
- 将反馈合约扩展为 `good | bad | unresolved`；`unresolved` 同步形成运营筛选标记，并继续复用 FastGPT 反馈能力保存点踩语义。
- 联系人工作为项目配置驱动的常驻组件；`human_required` 响应自动展开，普通回答后仍保留入口。
- 会话以 `projectCode + sessionId` 隔离并恢复；产品型号变化时默认建议新建会话，避免历史上下文污染新产品。
- 加入请求取消、35 秒无数据超时、120 秒总时限、原位幂等重试和停用状态；停止/超时提交服务端停止请求，错误响应不透出 App、Key、模型地址和调用栈。

### 13.3 管理运营端页面结构

管理端导航调整为：工作台、客服管理、知识中心、产品管理、审核中心、对话运营、团队与设置。

对话运营不再以“跳转原生 App 日志”作为完成标准。新增客服业务查询适配，在现有 chat、feedback、usage 和 `CustomerServiceRequest` 数据上联合读取，至少返回：

- 客服项目、产品、型号、会话和提问时间。
- 用户问题、回答状态、耗时、引用标题与 collection。
- Token 或 FastGPT 可用的用量字段；不能得到货币成本时明确显示用量，不伪造金额。
- 点赞、点踩、问题未解决、无答案和转人工标记。
- 按项目、产品、型号、时间和问题状态筛选。

“转为待整理知识”只预填问题、现有答案、来源会话和产品上下文，创建 `draft`；仍需编辑确认、提交审核和发布，不允许运营人员绕过审核直接进入检索。

### 13.4 知识导入与发布闭环

管理端使用一个业务向导串联现有 FastGPT 能力：

```text
选择产品/资料类型/受众
  → 选择已有知识库或创建知识库
  → 使用原生文件上传和 collection 创建 API
  → 显示解析与训练状态
  → 创建引用该 collection 的治理草稿
  → 提交审核并发布
```

不新增文件存储、分块器、训练队列和向量表。若文件上传成功但治理登记失败，页面必须能发现“待登记资料”并重试，不能留下只能通过数据库 ID 修复的孤立资源。

### 13.5 客服知识范围同步和就绪检查

- 同一 dataset 新增并发布 collection 后，客服通过运行时白名单自动看到新知识，无需重建 App。
- 产品型号新增或变更 dataset 绑定时，重新计算包含该型号的客服项目知识库并同步其 Workflow dataset 节点。
- 同步失败时保留原可用版本，项目列表展示“知识范围待同步”和失败原因，并提供重试。
- 就绪检查至少包含：项目启用、App 存在、标准工作流可执行、知识范围一致、产品有已发布知识、专用 Key 启用、模型配置可用。

### 13.6 岗位维护

- 在管理端读取当前团队成员，以姓名和账号展示候选人。
- 客服管理员可分配、启停客服管理员、知识编辑和知识审核岗位；接口继续校验团队身份和操作权限。
- 编辑与审核职责保持互斥，提交人禁止审核自己的知识版本；所有变更写入现有客服审计记录。

### 13.7 验证范围

- 客户端：固定项目、无项目枚举、无浏览器 Key、产品选择、安全 SSE 回答、引用、安全、三类反馈、人工入口、恢复、新会话、移动端和错误态。
- 管理端：七模块导航、资料导入恢复、训练状态、审核发布、同步重试、成员岗位和原需求 10.2 的全部筛选项。
- 跨端：发布一条样例知识后客户端可命中；提交未解决后管理端可筛出；运营转草稿后必须重新审核。
- 兼容：普通 FastGPT App、Dataset、日志、Key 和 Workflow 不受客服模式影响；旧客服页面可在回滚时继续使用。
