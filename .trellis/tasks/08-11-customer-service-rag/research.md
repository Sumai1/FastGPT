# 阶段一基线与技术验证记录

## 源码和工具链基线

- 源码分支：`main`
- 基线 commit：`f88b51b5c1e4987a2b917358339db1aa02bbc292`
- 现有 origin：`https://github.com/Sumai1/FastGPT.git`
- Node.js：`v22.22.1`
- pnpm：`10.33.4`
- Docker：`29.3.0`
- Docker Compose：`5.1.1`

当前执行环境将 `.git` 挂载为只读，因此无法写入 remote 和创建分支。开发期间保留现有
origin，不改写 Git 配置；交付时由仓库维护者执行：

```bash
git remote add upstream https://github.com/labring/FastGPT.git
git switch -c feat/customer-service-rag
```

## 依赖和运行环境

依赖已使用锁文件安装。由于本机 ARM 环境的原生模块安装脚本及根缓存目录权限限制，使用
`--ignore-scripts` 完成源码依赖准备，未修改 lockfile。最终生产构建仍需在正式构建机完整
执行安装脚本。

现有开发环境已验证以下服务健康：

- FastGPT `v4.15.4`，HTTP 入口可访问；
- MongoDB `5.0.32`；
- PostgreSQL 15 + pgvector `0.8.0`；
- Redis `7.2`；
- MinIO `RELEASE.2025-09-07`；
- AI Proxy `v0.6.5` 及其 PostgreSQL；
- code-sandbox、plugin、MCP 服务。

一次 Compose 启动验证因机器上已有同名容器而终止，只创建了 `dev_fastgpt`、
`dev_aiproxy` 网络及空的 `dev_fastgpt-*` 卷，没有覆盖或删除已有容器和数据。

## 现有能力复用结论

- collection 创建、文件/QA 导入、训练队列、`running/error/ready` 状态、错误重试和
  `forbid` 直接复用；不新建客服训练状态机。
- embedding、full-text、混合召回和 Rerank 共用 `multiQueryRecall` 的 collection 过滤结果；
  引用、流式聊天、会话、反馈、日志和用量继续复用现有 App/chat 链路。
- dataset `manage` 权限已包含 `write` 和 `read`；客服岗位只叠加业务职责，不改造 FastGPT
  底层资源权限模型。
- OpenAPI Key 的过期、额度、用量和 App 绑定直接复用；客服最高受众和项目绑定独立引用
  现有 Key。

## 最小修改点

1. 在 `searchDatasetData -> defaultRecall -> multiQueryRecall` 内增加可选且仅服务端调用的
   `collectionIdWhitelist`，与 metadata filter 求交集。空数组必须返回空结果；未传参数时
   普通 FastGPT 搜索行为不变。embedding 和 full-text 继续使用同一交集。
2. 客服项目根据团队、发布状态、受众、型号、版本和有效时间生成 collection 白名单；查询
   失败不得退化为全库搜索。
3. v1/v2 completions 共用 `authChatCompletionHeaderRequest`，客服绑定 Key 的通用入口拒绝
   检查放在该鉴权函数完成 Key 认证之后，可同时覆盖两套通用 completions。

## 尚需外部输入

- DeepSeek、Embedding、Reranker 可用渠道和测试密钥；
- 三个试点产品的脱敏资料及不少于 200 条验收问题；
- 人工客服联系方式、生产域名/集群、HTTPS、备份目标和数据保留策略；
- 有权写入 `.git` 的维护者完成 upstream 与开发分支设置。
