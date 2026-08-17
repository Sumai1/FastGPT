# 智能客服生产部署与双域名分离运维手册

本目录是在 FastGPT 官方 Compose 之上的生产覆盖层，实现**客户端（`support.pkiln.com`）与管理控制台（`admin.pkiln.com`）的双域名彻底物理隔离与网关分流**。

---

## 1. 架构拓扑与域名分流

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
│ (3002:80 Nginx)   │ │                 (projects/app:3001)                    │
│ • 纯静态产物 (<25M) │ │ • 管理控制台 (/customer-service/console)              │
│ • 独立 Web 页面    │ │ • 知识库与工作流引擎                                   │
│ • 嵌入式 Widget   │ │ • 公共/管理/V1 API 服务                                │
└───────────────────┘ └────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    MongoDB (业务数据)      PGVector (知识向量)       Redis (限流/缓存)
```

### 1.1 域名与安全隔离矩阵

| 域名 | 承载服务与路径 | 转发目标 | 安全策略 |
| :--- | :--- | :--- | :--- |
| **`support.pkiln.com`** | 静态 SPA / 嵌入式 Widget / `/embed.js` | `customer-service-client:80` (宿主 3002) | 强缓存 `assets/` (1y immutable)，SPA fallback |
| **`support.pkiln.com`** | 公共流式问答 `/api/customer-service/public/*` | `fastgpt-app:3000` (宿主 3001) | `proxy_buffering off`，严格 CORS 与 IP 限流 |
| **`support.pkiln.com`** | 管理端路径 `/dashboard`, `/console`, `/admin` 等 | **网关硬性拦截** | **直接返回 HTTP 404**，物理杜绝后台探测 |
| **`admin.pkiln.com`** | 根路径 `/` | 重定向 | **302 跳转至 `/customer-service/console`** |
| **`admin.pkiln.com`** | 控制台、FastGPT 核心后台及管理 API | `fastgpt-app:3000` (宿主 3001) | Cookie/JWT 权限校验、100M 上传支持 |

---

## 2. 上线前准备

1. **镜像准备**：
   - 客户端镜像：`customer-service-client`（由 `projects/customer-service-client/Dockerfile` 构建，基于 `nginx:alpine`，镜像体积 < 25MB）；
   - 主后端镜像：`fastgpt-customer-service`（锁定 digest 或具体版本 tag，严禁使用浮动 `latest`）。
2. **环境变量配置**：
   - 复制 `.env.production.example` 为 `.env.production`，替换所有密钥、密码与镜像地址，并执行 `chmod 600 .env.production`。
   - `ALLOWED_ORIGINS` 配置允许嵌入 Widget 的业务域名白名单（逗号分隔）。
3. **Nginx 网关配置**：
   - 参考 `deploy/customer-service/nginx.conf.example` 配置 `support.pkiln.com` 与 `admin.pkiln.com` 站点；
   - 确保证书文件（如 Let's Encrypt）配置就绪并执行 `nginx -t` 测试通过。

---

## 3. 容器编排与启动命令

### 3.1 生产全量启动（基础 Compose + 生产覆盖层）

```bash
# 1. 校验 Compose 编排语法
docker compose --env-file deploy/customer-service/.env.production \
  -f fastgpt-compose.yml \
  -f deploy/customer-service/docker-compose.override.yml \
  config --quiet

# 2. 启动服务矩阵
docker compose --env-file deploy/customer-service/.env.production \
  -f fastgpt-compose.yml \
  -f deploy/customer-service/docker-compose.override.yml up -d
```

### 3.2 独立环境启动（support.pkiln.com 专用覆盖层）

```bash
docker compose -f docker-compose.yml -f deploy/customer-service/docker-compose.support.pkiln.override.yml up -d
```

---

## 4. 健康检查与双端安全校验

上线或发布后，执行验证脚本进行全链路校验（包含双端业务 API 与网关安全拦截检查）：

```bash
CUSTOMER_SERVICE_BASE_URL=https://support.pkiln.com \
CUSTOMER_SERVICE_ADMIN_URL=https://admin.pkiln.com \
CUSTOMER_SERVICE_API_KEY=fastgpt-your-secret-api-key \
deploy/customer-service/scripts/verify.sh
```

**检查项覆盖**：
1. `health`：验证 `/api/customer-service/v1/health` 探针健康；
2. `products`：验证 `/api/customer-service/v1/products` 产品知识体系读取正常；
3. `gateway_security`：验证客户端域名访问 `/dashboard`、`/console`、`/admin`、`/customer-service/console` 等路径被网关 404 硬性拦截。

---

## 5. 数据与配置备份

每天通过 `cron` 执行 `scripts/backup.sh`，备份 MongoDB、默认 PGVector、AI Proxy PostgreSQL 及 MinIO 资产：

```bash
CS_BACKUP_DIR=/backup/fastgpt-customer-service \
CS_MONGODB_BACKUP_URI='mongodb://backup-user:replace@localhost:27017/fastgpt?authSource=admin' \
CS_VECTOR_PG_USER=username CS_VECTOR_PG_PASSWORD=replace CS_VECTOR_PG_DATABASE=postgres \
CS_AIPROXY_PG_USER=postgres CS_AIPROXY_PG_PASSWORD=replace CS_AIPROXY_PG_DATABASE=aiproxy \
deploy/customer-service/scripts/backup.sh
```

备份完成后将自动生成 `SHA256SUMS` 校验清单并支持异地归档。

---

## 6. 升级与回滚指南

1. **升级步骤**：
   - 拉取并更新 `.env.production` 中 `CUSTOMER_SERVICE_IMAGE` 和 `CUSTOMER_SERVICE_CLIENT_IMAGE` 的镜像标签；
   - 执行 `docker compose ... up -d` 进行平滑滚动重启；
   - 运行 `verify.sh` 脚本确保双端健康与网关拦截生效。
2. **回滚步骤**：
   - 将镜像标签改回上一个稳定镜像 digest，重新执行 `docker compose ... up -d`；
   - 如遇数据库兼容性变更，参照备份目录的 `SHA256SUMS` 校验后在隔离环境恢复测试再切换生产。
