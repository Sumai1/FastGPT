# ==========================================
# Stage 1: Build Frontend Assets
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

ARG proxy

# Configure Alpine mirror if proxy is set
RUN [ -z "$proxy" ] || sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories
RUN apk add --no-cache libc6-compat && npm install -g pnpm@10.33.2

# Copy package management files for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ./packages ./packages
COPY ./sdk ./sdk
COPY ./projects/customer-service-client/package.json ./projects/customer-service-client/package.json

RUN [ -f pnpm-lock.yaml ] || (echo "Lockfile not found." && exit 1)

# Install monorepo dependencies
RUN if [ -z "$proxy" ]; then \
        pnpm i; \
    else \
        pnpm i --registry=https://registry.npmmirror.com; \
    fi

# Copy workspace source and client source files
COPY package.json tsconfig.json ./
COPY ./projects/customer-service-client ./projects/customer-service-client

ENV NODE_OPTIONS="--max-old-space-size=2048"

# Build lightweight customer service client
RUN pnpm --filter=@fastgpt/customer-service-client build

# ==========================================
# Stage 2: Ultra-lightweight Static Hosting
# ==========================================
FROM nginx:alpine-slim AS runner

# Remove default nginx html and configs
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/*

# Copy client SPA nginx configuration
COPY projects/customer-service-client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/projects/customer-service-client/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=5s \
  CMD wget --spider -q http://127.0.0.1:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
