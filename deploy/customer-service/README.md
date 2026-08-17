# 智能客服生产部署与恢复手册

本目录是在 FastGPT 原 Compose 之上的生产覆盖层，不复制数据库、向量库、MinIO、AI Proxy
或 Key 管理能力。基础 Compose 仍由 `deploy/init.mjs` 按正式版本生成。

## 1. 上线前准备

1. 锁定应用镜像 digest，不使用浮动 `latest`。
2. 复制 `.env.production.example` 为服务器上的 `.env.production`，替换所有密码和密钥，并设为
   `chmod 600`。`ALLOWED_ORIGINS` 配置全部浏览器来源并集，每个客服 Key 再设置更窄的来源；真实密钥
   不得提交仓库。
3. 生成 FastGPT 正式 Compose，修改其中 Mongo、Redis、PostgreSQL、MinIO 和 AI Proxy 的默认密码，
   确认仅 Nginx 的 80/443 对公网开放。
4. 将 `nginx.conf.example` 中的域名和证书路径换成生产值，先用 `nginx -t` 校验。
5. 在 FastGPT 原页面配置 DeepSeek、Embedding、Reranker，创建 App、dataset 和 OpenAPI Key；再到
   `/customer-service/admin` 完成产品、知识发布、项目和 Key 绑定。

启动示例（`fastgpt-compose.yml` 表示由 FastGPT 官方脚本生成并完成密码加固的文件）：

```bash
docker compose --env-file deploy/customer-service/.env.production \
  -f fastgpt-compose.yml \
  -f deploy/customer-service/docker-compose.override.yml \
  config --quiet
docker compose --env-file deploy/customer-service/.env.production \
  -f fastgpt-compose.yml \
  -f deploy/customer-service/docker-compose.override.yml up -d
```

## 2. 健康、日志和告警

- Compose 健康检查验证 App 初始化接口；Mongo、PostgreSQL、Redis、MinIO、Plugin 和 Sandbox 继续使用
  原 Compose 健康检查。
- 客服业务健康检查必须使用已绑定 Key：

```bash
CUSTOMER_SERVICE_BASE_URL=https://support.example.com \
CUSTOMER_SERVICE_API_KEY=fastgpt-replace \
deploy/customer-service/scripts/verify.sh
```

脚本默认把 `CUSTOMER_SERVICE_BASE_URL` 作为 Origin；若通过网关地址检查另一个浏览器来源，可额外设置
`CUSTOMER_SERVICE_ORIGIN=https://actual-browser-origin.example.com`。

- 生产日志使用 `info`，通过 `LOG_OTEL_URL` 接入现有 OTLP 平台。至少对 5xx、模型错误、队列积压、
  磁盘 80%、费用预算 80%、连续转人工率突增告警。
- 项目的 `sessionRetentionDays` 由每天 03:20 的清理任务执行，只删除整段已过期会话，并复用现有
  chat/S3 关联删除能力。

## 3. 备份

每天执行 `scripts/backup.sh`，备份 MongoDB、默认 PGVector、AI Proxy PostgreSQL 和 MinIO；备份目录
必须位于独立磁盘或对象存储挂载。Redis 只保存可重建缓存，不作为业务恢复源。

```bash
CS_BACKUP_DIR=/backup/fastgpt-customer-service \
CS_MONGODB_BACKUP_URI='mongodb://backup-user:replace@localhost:27017/fastgpt?authSource=admin' \
CS_VECTOR_PG_USER=username CS_VECTOR_PG_PASSWORD=replace CS_VECTOR_PG_DATABASE=postgres \
CS_AIPROXY_PG_USER=postgres CS_AIPROXY_PG_PASSWORD=replace CS_AIPROXY_PG_DATABASE=aiproxy \
deploy/customer-service/scripts/backup.sh
```

备份完成后必须把 `SHA256SUMS` 与文件一同异地保存，并每月至少恢复演练一次。若生产使用 Milvus、
OceanBase、SeekDB 或 OpenGauss，按对应数据库官方一致性快照替换 PGVector 两行命令。

## 4. 升级与回滚

1. 在 staging 从生产备份恢复，运行数据库索引同步、局部测试、完整 200 题评测和业务健康检查。
2. 记录旧镜像 digest、Compose 文件和备份目录；备份成功后再拉取新镜像。
3. 使用新镜像启动，检查容器健康、`/api/customer-service/v1/health`、产品列表、正常问答、低置信度、
   转人工、反馈和通用 completions 防绕过。
4. 应用回滚只把 `CUSTOMER_SERVICE_IMAGE` 改回旧 digest 并重新 `up -d`。数据库结构不兼容时停止写入，
   新建隔离恢复环境，校验备份哈希后执行下述恢复，禁止直接覆盖仍在运行的生产库。

恢复命令必须在隔离环境先验证，并由两人确认具体容器与备份时间：

```bash
cd /backup/fastgpt-customer-service/20260811T000000Z
sha256sum -c SHA256SUMS

docker exec -i fastgpt-mongo mongorestore \
  --uri='mongodb://restore-user:replace@localhost:27017/fastgpt?authSource=admin' \
  --archive --gzip <mongodb.archive.gz
docker exec -i fastgpt-pg pg_restore --clean --if-exists \
  --username=username --dbname=postgres <vector.pg.dump
docker exec -i fastgpt-aiproxy-pg pg_restore --clean --if-exists \
  --username=postgres --dbname=aiproxy <aiproxy.pg.dump
docker exec -i fastgpt-minio tar -C /data -xzf - <minio.tar.gz
```

上述 `--clean` 和对象存储解包会覆盖目标环境，未完成隔离、停写、备份时间和容器名称核对时不得执行。

## 5. 上线验收清单

- HTTPS 证书、HSTS/WAF（如使用）、来源白名单和限流生效，浏览器无 OpenAPI Key。
- public/dealer/internal、产品型号、软硬件版本、未发布/下架资料隔离通过。
- 危险、投诉、争议、主动人工和连续低置信度按规则转人工。
- 引用、会话、反馈、Token/费用和调用日志可在原 FastGPT 页面查询。
- 200 题报告包含正确率、引用准确率、Recall@5、型号隔离、编造率、转人工率和延迟。
- 备份哈希、隔离恢复、旧镜像回滚均有演练记录；上线后观察至少一个完整业务高峰。
