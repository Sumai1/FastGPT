# 智能客服 RAG 二次开发修改清单

版本：V1.5  
状态：代码整改完成，最终测试、构建和灰度部署收口中

这份清单记录升级 FastGPT 时需要重点复核的扩展点。客服功能优先复用原生 App、Workflow、Dataset、
聊天、反馈、Key、权限和部署能力；没有复制原生 chat/chatItem 集合。`customer_service_requests` 只保存
经过脱敏的最小运营投影（幂等键、问题摘要、状态、引用计数和少量固定/服务端答案摘要）。

## 1. 共享合约与入口

| 区域 | 主要文件/目录 | 复核内容 |
| --- | --- | --- |
| 业务常量与类型 | `packages/global/core/customerService/` | 产品、受众、治理状态、客服状态、岗位和请求投影 |
| OpenAPI/Zod | `packages/global/openapi/customerService/` | products/chat/stop/feedback/health、管理端和公开端脱敏字段 |
| API 路由 | `projects/app/src/pages/api/customer-service/` | `parseApiInput`、公开项目固定路由、Key 不出浏览器、权限和限流 |
| 客户页 | `projects/app/src/pageComponents/customerService/CustomerServiceChat.tsx` | 安全 SSE、心跳、35 秒无数据/120 秒总时限、原位幂等重试、停止请求 |
| 控制台 | `projects/app/src/pages/customer-service/console.tsx` | 七个业务模块、高级工作台边界、名称化展示和待办 |

## 2. 服务端扩展点

| 区域 | 主要文件/目录 | 复核内容 |
| --- | --- | --- |
| 产品与知识治理 | `packages/service/core/customerService/{product,knowledge}` | 只保存 Dataset/Collection 引用；发布 CAS、禁止自审、`forbid` 联动 |
| 检索白名单 | `packages/service/core/customerService/search/`、`packages/service/core/dataset/search/` | 服务端求交集；空数组必须 fail-closed；普通 FastGPT 搜索未传白名单时保持原行为 |
| 请求幂等 | `packages/service/core/customerService/request/` | `teamId + projectId + openApiKeyId + requestId` 唯一；完成回放、失败重试、上下文冲突和脱敏 |
| 工作流停止 | `projects/app/src/service/customerService/context.ts`、`packages/service/core/workflow/dispatch/` | 只有可信客服上下文开启服务端停止轮询；普通 v1 不增加 Redis 轮询；客服入口先清理旧标记避免竞态 |
| 通用 completions | `projects/app/src/pages/api/v2/chat/completions.ts`、`projects/app/src/service/support/permission/auth/chatCompletion.ts` | 绑定客服 Key 不得绕过客服接口；客服白名单和停止能力只能由进程内上下文注入 |
| Dataset 权限 | `projects/app/src/pages/api/core/dataset/**`、`packages/service/support/permission/dataset/auth.ts` | 写操作必须同时通过原生 Dataset 权限和客服治理检查 |

## 3. 数据库与索引

- 新增 Mongo Schema 的索引统一通过 `defineIndex` 声明；状态迁移使用条件更新或事务。
- 升级前运行索引同步并检查已确认废弃索引；不删除客户自建或来源不明的索引。
- 生产备份包括 MongoDB、向量 PostgreSQL、AI Proxy PostgreSQL 和 MinIO，并保存 `SHA256SUMS`。

## 4. 升级检查顺序

1. 先运行 Global、Service、App 客服定向测试和 App typecheck。
2. 串行运行三个受影响包的全量测试，再运行生产构建。
3. 从生产备份恢复到隔离环境，检查客服项目、绑定 Key、治理状态和 Workflow 发布快照。
4. 使用候选镜像在 `127.0.0.1:3101` 灰度，验证客户页和控制台桌面/移动布局、SSE 状态、停止、重试及三条闭环。
5. 通过健康检查后切换 `support.pkiln.com`；保留旧镜像 `fastgpt-customer-service:20260813-1231` 回滚。

## 5. 已知边界

- 当前为安全 SSE，不是模型 token 级实时透传；完整答案在引用、置信度和安全门禁后才发送。
- 120 秒总时限解决浏览器无限等待；模型供应商本身的生成耗时仍需通过模型渠道、提示词和后续 Rerank 调优降低。
- Rerank 暂不接入；真实三产品资料、200 题质量报告、日文全站资源和正式外部受众凭证属于后续输入。
