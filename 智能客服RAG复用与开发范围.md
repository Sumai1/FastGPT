# 智能客服 RAG 复用与开发范围

## 一、可以直接复用的 FastGPT 能力

- **知识库能力**：dataset、collection、chunk、文件/QA 导入、分块、Embedding、训练队列、训练状态、错误重试和检索测试。
- **检索能力**：向量检索、全文检索、混合召回和 Rerank。
- **应用与模型**：App、Workflow、LLM、提示词、AI Proxy，以及 DeepSeek、Embedding、Reranker 配置。
- **聊天能力**：流式/非流式聊天、会话、消息、引用、Markdown 展示和会话恢复。
- **运营能力**：点赞、点踩、反馈、标注、日志、Token、费用和用量统计。
- **平台能力**：OpenAPI Key、应用绑定、过期、额度、权限、Docker Compose、数据库、Redis、MinIO 和健康检查。
- **前端页面**：聊天、知识库、导入训练、检索测试、App、模型、Key、日志和反馈等已有页面。

原则：不重复建设训练队列、聊天存储、Key 存储、SSE 协议、计费、日志、反馈和向量库能力。

## 二、需要新增开发的客服业务能力

以下内容是新增业务层的实际拆分方向。实现时优先放在 customerService 领域，复用 FastGPT 现有 service/controller；不要直接复制 dataset、chat 或 OpenAPI Key 的实现。

### 2.1 产品体系和知识范围

需要新增产品大类、系列、型号、硬件版本和软件版本的管理能力。

实操方向：

- 在 packages/global/core/customerService/ 定义产品类型、状态枚举和 Zod schema。
- 在 packages/service/core/customerService/ 新增产品相关 schema、entity 和 service。
- 产品型号保存 datasetIds，只保存与现有知识库的引用关系，不复制 dataset 内容。
- 提供产品、系列、型号、版本的新增、编辑、停用、停产、别名和有效期管理。
- 管理 API 同时校验团队权限、数据归属和产品状态；停用产品不删除历史知识和会话。
- 为型号编码、系列编码、版本编码建立 defineIndex 唯一索引，并补充重复编码和跨团队数据隔离测试。

### 2.2 知识治理和审核状态机

客服知识需要在现有 collection 之上增加一层治理记录，用于描述“这份知识适用于什么产品、什么版本、什么受众，以及是否允许被客服使用”。

建议新增：

- CustomerServiceKnowledge：collection 引用、知识类型、产品/版本范围、受众、生效时间、版本链和审核状态。
- CustomerServiceKnowledgeAudit：提交、审核、驳回、发布、下架等操作的操作者、时间、原因和变更摘要。

实操方向：

1. 客服导入入口调用现有 collection 创建和训练 service，并将 collection 设置为 forbid=true。
2. 训练状态直接读取现有 running/error/ready，不再创建客服训练状态表。
3. 训练完成、内容非空且治理字段完整后，才允许从 draft 提交到 pending。
4. 审核通过时，将治理记录设为 published，并将 collection 设置为可检索。
5. 驳回必须填写原因，collection 保持禁用；下架时设置为 offline + forbid=true。
6. 发布新版本时，在事务中下架冲突旧版本，避免同一时间命中多份冲突资料。
7. 所有状态更新使用“当前状态/版本条件更新”，防止旧页面覆盖新审核结果。

重点测试：未发布、已驳回、已下架、训练失败、版本冲突、重复审核和并发发布均不能进入客服召回。

### 2.3 客服岗位和资源权限

FastGPT 现有 manage 权限不能单独表达“可编辑但不可审核”，因此新增最小客服岗位绑定，不新增完整权限体系。

岗位包括：

- customerServiceAdmin：管理项目、规则、Key 绑定和紧急操作。
- knowledgeEditor：导入、编辑治理信息、提交审核和检索测试。
- knowledgeReviewer：审核、驳回、发布、下架和冲突处理。

实操方向：

- 新增 CustomerServiceMemberRole，按 teamId + tmbId 保存岗位、状态、变更人、变更原因和时间。
- 编辑岗位和审核岗位互斥；团队 owner 在鉴权时默认视为客服管理员。
- 编辑接口同时校验客服编辑岗位和目标 dataset 的 write 权限。
- 审核接口同时校验客服审核岗位和目标 dataset 的 manage 权限。
- 审核时比较 submitterTmbId 和当前操作者，禁止自审。
- 岗位新增、修改、停用都写入审计记录，并覆盖越权、岗位互斥和资源范围测试。

### 2.4 客服项目和 OpenAPI Key 绑定

客服项目负责把一个 FastGPT App、产品范围、受众和业务规则组合成一个可调用的服务。

建议新增：

- CustomerServiceProject：项目编码、App ID、允许的产品、默认受众、推荐问题、人工联系方式、工作时间、频率限制和会话策略。
- CustomerServiceKeyBinding：现有 OpenAPI Key ID、项目 ID、最高受众、启停状态和来源限制。

实操方向：

- 复用 FastGPT 现有 Key 创建、过期、额度、统计和管理页面，只新增“绑定客服项目”能力。
- 客服请求先完成现有 Key 认证，再查询 Key binding、项目状态和产品范围。
- 请求受众只能低于或等于 Key 的最高受众，不能由客户端提权。
- 在客服适配层增加项目级频率限制，并继续使用原有 Key 额度和用量统计。
- 已绑定客服项目的 Key 访问通用 completions 接口时直接拒绝，防止绕过白名单。
- 对停用 Key、停用项目、来源不匹配、额度不足和频率超限分别返回明确错误码。

### 2.5 检索白名单和产品隔离

这是客服功能最关键的安全改造：客服请求不能直接使用 App 默认 dataset，而必须使用服务端计算出的 collection 白名单。

实操方向：

1. 根据项目允许产品、当前型号、硬件版本、软件版本、请求受众和当前时间查询 published 治理记录。
2. 只返回同时满足产品、版本、生效时间、受众和 forbid=false 条件的 collection ID。
3. 在现有统一搜索入口增加内部参数 collectionIdWhitelist。
4. 将白名单与现有 dataset 范围、metadata filter 和 forbid 结果求交集。
5. embedding 和全文召回必须使用同一交集，之后继续走原有 Rerank。
6. 白名单为空、查询异常或团队不匹配时返回空结果，禁止回退到全部 dataset。

该参数只能由客服服务端生成，不能出现在外部 OpenAPI、普通 Workflow 输入或模型工具参数中。

重点测试：public/dealer/internal、相邻型号、硬件版本、软件版本、过期知识、空白名单、查询异常和通用 API 绕过。

### 2.6 客服 Chat 服务和业务规则

新增 Chat service 只负责编排业务规则，具体聊天、流式输出、消息存储、引用和计费继续调用 FastGPT 原有服务。

实操方向：

- 按“Key 认证 → 项目校验 → 产品/版本解析 → 白名单 → 规则判断 → 原有 Chat/LLM → 结果处理”的顺序组织代码。
- 产品上下文优先读取业务页面服务端字段，其次读取请求字段和会话 metadata。
- 型号缺失或存在歧义时返回结构化追问；版本敏感问题缺少版本时要求补充版本。
- 无有效引用或低于置信度阈值时标记低置信度，不允许模型自行编造。
- 危险操作、支付退款、保修争议、投诉和明确要求人工时，由服务端直接返回转人工状态。
- 使用 requestId 对接现有 responseChatItemId/dataId 幂等机制，避免重试重复调用模型和计费。
- 在现有 metadata 和日志中补充项目、产品、版本、受众、引用数、低置信度和转人工原因。
- 复用或扩展现有脱敏和上传校验，隐藏完整 Key、手机号、身份证、地址、订单号和付款信息。

### 2.7 客服业务 API

一期先实现四个薄适配接口：

    GET  /api/customer-service/v1/products
    POST /api/customer-service/v1/chat
    POST /api/customer-service/v1/feedback
    GET  /api/customer-service/v1/health

实操要求：

- 在 packages/global/openapi/customerService/ 定义请求、响应、错误码和 OpenAPI 信息。
- Next.js API 路由使用 parseApiInput 校验 body/query，不直接调用 schema.parse(req.body)。
- Chat 尽量沿用 FastGPT 现有流式和非流式格式，只增加状态、产品上下文、引用、安全警告和人工信息。
- feedback 调用现有反馈 service；health 组合现有应用、数据库和模型健康检查。
- API 不接收客户端传入的 dataset ID、collection ID 或任意检索过滤表达式。
- 浏览器端通过 Next.js 服务端代理调用，OpenAPI Key 不下发到浏览器。

### 2.8 客服端和管理端页面

客服端以现有聊天组件为基础增加：

- 品牌、欢迎语和推荐问题。
- 系列、型号、硬件版本和软件版本选择。
- 业务页面自动传入产品上下文。
- 结构化追问、安全警告、低置信度提示和人工客服卡片。
- 引用、流式 Markdown、会话恢复、点赞和点踩的复用。

管理端新增：

- 产品树、版本管理和 dataset 绑定。
- 知识治理列表、版本历史和审核队列。
- 客服项目、Key 受众绑定、规则和人工联系方式配置。
- 推荐问题和会话保留策略配置。

导入、分块、训练、检索测试、App、Key、日志和反馈页面尽量直接复用，只增加客服业务字段和筛选条件。

### 2.9 测试和交付顺序

建议按以下顺序落地：

1. 先验证现有搜索入口、Key 认证、权限和聊天运行时的最小改动点。
2. 开发产品模型、知识治理模型、索引和纯 service 测试。
3. 开发审核状态机、forbid 联动和权限负向测试。
4. 开发项目、Key binding、白名单和搜索交集逻辑。
5. 开发 Chat service、客服 API 和幂等/转人工规则。
6. 开发管理端和客服端页面。
7. 导入试点资料，使用不少于 200 条问题进行检索和回答调优。
8. 最后完成类型检查、局部测试、全量测试、构建、部署、备份和恢复演练。

## 三、开发边界

- 新代码集中在 `customerService` 领域，优先通过配置和薄适配层实现。
- API 使用 Zod、OpenAPI 和 `parseApiInput`；数据库索引使用 `defineIndex`。
- 客服 Key 不能通过通用 completions 接口绕过产品、版本和受众过滤。
- 浏览器不保存 OpenAPI Key，站内客服请求通过服务端代理转发。
- 普通 FastGPT App、Workflow、Agent 和通用 API 的原有行为保持不变。
