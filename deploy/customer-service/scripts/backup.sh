#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${CS_BACKUP_DIR:?CS_BACKUP_DIR is required and must be an absolute path}"
: "${CS_MONGODB_BACKUP_URI:?CS_MONGODB_BACKUP_URI is required}"
: "${CS_VECTOR_PG_USER:?CS_VECTOR_PG_USER is required}"
: "${CS_VECTOR_PG_PASSWORD:?CS_VECTOR_PG_PASSWORD is required}"
: "${CS_VECTOR_PG_DATABASE:?CS_VECTOR_PG_DATABASE is required}"
: "${CS_AIPROXY_PG_USER:?CS_AIPROXY_PG_USER is required}"
: "${CS_AIPROXY_PG_PASSWORD:?CS_AIPROXY_PG_PASSWORD is required}"
: "${CS_AIPROXY_PG_DATABASE:?CS_AIPROXY_PG_DATABASE is required}"

case "${CS_BACKUP_DIR}" in
  /*) ;;
  *) echo "CS_BACKUP_DIR must be absolute" >&2; exit 1 ;;
esac

cs_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
cs_target="${CS_BACKUP_DIR%/}/${cs_stamp}"
mkdir -p "${cs_target}"

docker exec -e CS_MONGODB_BACKUP_URI="${CS_MONGODB_BACKUP_URI}" fastgpt-mongo \
  sh -c 'exec mongodump --uri="$CS_MONGODB_BACKUP_URI" --archive --gzip' \
  >"${cs_target}/mongodb.archive.gz"
docker exec -e PGPASSWORD="${CS_VECTOR_PG_PASSWORD}" fastgpt-pg pg_dump \
  --username "${CS_VECTOR_PG_USER}" --dbname "${CS_VECTOR_PG_DATABASE}" --format=custom \
  >"${cs_target}/vector.pg.dump"
docker exec -e PGPASSWORD="${CS_AIPROXY_PG_PASSWORD}" fastgpt-aiproxy-pg pg_dump \
  --username "${CS_AIPROXY_PG_USER}" --dbname "${CS_AIPROXY_PG_DATABASE}" --format=custom \
  >"${cs_target}/aiproxy.pg.dump"
docker exec fastgpt-minio tar -C /data -czf - . >"${cs_target}/minio.tar.gz"

sha256sum "${cs_target}"/* >"${cs_target}/SHA256SUMS"
printf '%s\n' "${cs_target}"
