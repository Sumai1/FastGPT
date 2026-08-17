# 技术设计

## 总体方案

采用引用式扩展，不改变 FastGPT 数据集的存储模型：产品目录和知识治理记录引用现有 dataset/collection；客服项目引用现有 App；客服 Key 绑定引用现有 OpenAPI Key。所有客服入口在服务端解析项目、受众、产品和版本，生成已发布 collection 白名单，再调用现有检索和聊天链路。

```text
站内入口 / 客服 API
  → Key/登录态鉴权与项目绑定
  → 产品、版本、受众解析
  → 已发布治理记录生成 collection 白名单
  → FastGPT dataset search + metadata + forbid + Rerank
  → FastGPT App/LLM + chat/session/reference/usage/log
  → 客服响应、反馈或转人工
```

## 数据域

- `CustomerServiceProductCategory`、`ProductSeries`、`ProductModel`：产品树、别名、启停/停产状态。
- `CustomerServiceProductVersion`：型号下的硬件/软件版本和有效期。
- `CustomerServiceProductDatasetBinding`：型号与现有 dataset 的关联。
- `CustomerServiceKnowledgeGovernance`：引用 collection，保存知识类型、受众、产品/版本、生效期、状态和版本链，不复制正文、chunk 或向量。
- `CustomerServiceMemberRole`：团队成员与三个客服业务岗位的最小绑定及变更审计。
- `CustomerServiceProject`：引用 App，保存客服配置、人工联系方式、推荐问题和保留策略。
- `CustomerServiceKeyBinding`：引用现有 OpenAPI Key 和项目，保存最高受众、来源、启停和限流策略。

所有记录携带 `teamId`；唯一键、查询键和废弃索引均通过 `defineIndex` 声明。状态发布/下架与 collection `forbid` 通过事务联动；审核使用条件更新并校验 reviewer 不等于 editor。

## 权限和检索边界

- 客服岗位只表达业务职责，不能替代 FastGPT 原权限。编辑动作需要 editor + dataset write，审核动作需要 reviewer + dataset manage，项目管理需要 admin/owner + app/team 权限。
- 请求受众取调用方请求与 Key 最高受众的较低值；客户端不能提交更高权限。
- 白名单由服务端根据项目、产品、版本、受众、发布时间和治理状态计算，不接受外部 API 直接传 collection ID。
- 统一检索入口新增内部 `collectionIdWhitelist`，分别注入 embedding 和全文查询，并与现有 dataset、metadata 和 `forbid` 条件求交集。空列表、团队不匹配或治理查询失败时返回空结果/拒绝，不降级为全库搜索。

## API 和兼容

- 管理 API 继续放在 `projects/app/src/pages/api/`，合约放在 `packages/global/openapi/`，业务逻辑放在 `packages/service/` 或 `projects/app/src/service/`。
- 外部接口固定前缀 `/api/customer-service/v1`，使用现有 Key 鉴权、额度和审计；站内浏览器经同源服务端入口使用登录态或服务端凭证。
- 客服 Key 在通用 v1/v2 completions 鉴权后检查绑定，存在启用绑定则拒绝，避免绕过产品、受众和白名单。
- 未提供 `collectionIdWhitelist` 的普通 FastGPT 搜索保持原行为；现有历史 Key 保持兼容。

## 测试策略

- global：Zod 合约、枚举、受众比较和产品版本解析。
- service：Mongo schema/index、状态机、权限组合、白名单、Key 绑定、转人工和幂等逻辑。
- app：API 入参/鉴权/响应、通用 completions 绕过、站内代理和主要 UI 状态。
- 先运行相关测试文件及包 typecheck；全部功能完成后运行 lint、全量测试和生产构建。

详细字段、接口和阶段交付物以《智能客服RAG功能开发文档.md》V1.1 为准。

## V1.2 原生 Workflow 与标准模板设计补充

- 新入口使用 `/dashboard/create?appType=workflow&scene=customerService`，scene 只影响前端展示。
- 不修改 `community-CQ` 的插件源内容；从原生工作台导出定制流程，注册本地模板 `commercial-customer-service-standard-v1`。
- 模板只使用问题分类、知识库搜索、条件判断、AI 对话和指定回复等原生节点。
- 知识分支采用混合检索、查询扩展、Rerank和空引用判断。
- 客服 API 在同一 Workflow App 执行前后继续注入白名单并处理产品、受众、危险和低置信度规则。
- 创建页继续调用现有模板列表、模板详情和 `postCreateApp`。
- 创建结果保持 `AppTypeEnum.workflow`，成功后继续进入 `/app/detail?appId=...`。
- 不修改 App Schema、AppTypeEnum、Workflow Dispatcher、Dataset API 和 App 创建 API。

详细节点、提示词、分工和验收以《智能客服RAG项目开发规划书.md》V1.2 第 16 章为准。

## V1.3 无 Rerank 运行设计

- 当前模板保持 mixed recall，但将 `usingReRank` 显式设为 `false`，避免无模型环境产生无效调用；该开关仍使用 FastGPT 原生配置，后续接入时无需改运行时。
- 问题扩展继续启用，用于保留型号、错误码和口语同义词；检索上下文上限下调，减少回答模型输入和无关片段。
- AI 回答节点正常回答以约 600 Token 为目标，长清单每页只输出若干完整条目，并提示用户回复“继续”；节点最大输出保留 1200 Token 作为防截断上限。
- 客服 API 从已持久化的完整 `responseData` 读取标准模板终止节点。问候和非业务分支可作为无引用的 `answered` 返回；人工/安全分支返回 `human_required`；资料不足分支继续进入低置信度计数。其他工作流和知识回答仍执行原有引用门禁。
- 创建入口只传入 `appType=workflow&scene=customerService`。创建页默认以标准模板调用现有模板详情和 `postCreateApp`，不新增类型、接口或工作台。
- 生产项目只有在新版代码部署并完成客服 API 冒烟后才改绑标准 Workflow App，避免旧 API 把固定回复误判为低置信度。

## V1.4 产品化控制台设计

### 页面边界

- 新增 `/customer-service/console` 作为业务控制台，不直接替换旧
  `/customer-service/admin`，后者改为控制台“高级设置”的兼容入口。
- 控制台使用页面内业务导航，不复制 FastGPT 全局导航。各模块先复用现有客服管理 API；原生
  App、Dataset 和 Key 页面只在高级操作时打开。
- 在线咨询 `/customer-service` 继续保持客户使用场景，管理人员从控制台显式进入预览，不再与
  管理首页混为同一入口。

### 创建数据流

```text
业务向导填写客服信息
  → 服务端校验产品、知识库和可用模型
  → 读取企业产品智能客服标准模板并注入知识库
  → 在同一 MongoDB 事务内创建原生 Workflow App、客服项目、专用 Key 和绑定
  → 成功后进入控制台客服详情/测试入口
```

创建过程由 `/api/customer-service/admin/project/createManaged` 统一编排，任何一步失败都回滚，避免
产生没有项目、没有 Key 或没有知识范围的半成品 App。接口只接收业务字段，不接收 App ID、Key ID
或 Dataset ID；底层资源仍使用 FastGPT 原生 Schema、权限和运行时。

### 展示和兼容

- 控制台直接使用共享 OpenAPI 返回类型，不在组件内重建响应结构。
- 内部 ID 可以作为 React key 和 API 参数使用，但不在普通列表、表单提示和操作文案中展示。
- 状态在前端映射为中文业务词；原始枚举值仍作为唯一判断依据。
- 旧管理页、原生工作流编辑器和知识库页面均保留，因此控制台可以按路由级回滚。

## V1.5 双前端产品闭环设计

- 客户咨询端使用 `/customer-service/chat/[projectCode]`，只返回一个启用项目的公开配置和可用产品；公开受众固定 public，dealer/internal 由可信业务登录态或短期签名授权。
- 管理运营端继续使用 `/customer-service/console`，导航扩展为工作台、客服、知识、产品、审核、对话运营、团队与设置。
- 客户端复用现有 chat service、SSE、Markdown、引用、反馈和会话；新增固定项目适配、常驻人工、unresolved、停止、超时和错误态。
- 管理端对话运营联合读取客服请求、原生 chat item、feedback 和 usage；不复制原生 chat/chatItem
  集合，但客服请求表保留经过脱敏的最小运营投影（问题、状态、少量固定/服务端答案摘要和引用计数），
  供筛选、幂等和转知识草稿使用。
- 管理端知识向导串联原生文件上传、Collection 创建、训练状态与治理草稿；未登记 Collection 可以恢复。
- 产品 Dataset 绑定变化触发相关客服 Workflow dataset 节点同步；失败保留旧版本，并通过就绪检查展示和重试。
- FastGPT 原生页面收口为高级工作台，不作为原需求 10.1、10.2 的日常操作入口。

完整设计和 TODO 见根目录《智能客服RAG功能开发文档.md》第 13 章与《智能客服RAG-TODO.md》第 11 节。
