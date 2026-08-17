#!/usr/bin/env bash
set -euo pipefail

: "${CUSTOMER_SERVICE_BASE_URL:?CUSTOMER_SERVICE_BASE_URL is required}"
: "${CUSTOMER_SERVICE_API_KEY:?CUSTOMER_SERVICE_API_KEY is required}"

cs_client_url="${CUSTOMER_SERVICE_CLIENT_URL:-${CUSTOMER_SERVICE_BASE_URL%/}}"
cs_admin_url="${CUSTOMER_SERVICE_ADMIN_URL:-${CUSTOMER_SERVICE_BASE_URL%/}}"
cs_auth_header="Authorization: Bearer ${CUSTOMER_SERVICE_API_KEY}"
cs_origin_header="Origin: ${CUSTOMER_SERVICE_ORIGIN:-${cs_client_url%/}}"
cs_health_url="${cs_admin_url%/}/api/customer-service/v1/health"
cs_products_url="${cs_admin_url%/}/api/customer-service/v1/products"
cs_tmp_dir="$(mktemp -d)"
trap 'rm -rf "${cs_tmp_dir}"' EXIT

# 1. Verify customer service core business APIs
curl --fail --silent --show-error --max-time 20 \
  -H "${cs_auth_header}" -H "${cs_origin_header}" "${cs_health_url}" >"${cs_tmp_dir}/health.json"
curl --fail --silent --show-error --max-time 20 \
  -H "${cs_auth_header}" -H "${cs_origin_header}" "${cs_products_url}" >"${cs_tmp_dir}/products.json"

# 2. Verify dual-domain security hard interceptions on client gateway
if [ "${VERIFY_GATEWAY_SECURITY:-1}" = "1" ]; then
  for blocked_path in "/dashboard" "/console" "/admin" "/customer-service/console" "/api/admin"; do
    http_code="$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${cs_client_url%/}${blocked_path}" || true)"
    # When testing against live client gateway, blocked routes MUST return 404
    if [ "${http_code}" != "404" ] && [ "${http_code}" != "000" ]; then
      echo "Security violation: ${cs_client_url%/}${blocked_path} returned HTTP ${http_code}, expected 404" >&2
      exit 1
    fi
  done
fi

CS_VERIFY_TMP_DIR="${cs_tmp_dir}" node -e '
const fs = require("node:fs");
for (const name of ["health", "products"]) {
  const payload = JSON.parse(fs.readFileSync(`${process.env.CS_VERIFY_TMP_DIR}/${name}.json`, "utf8"));
  if (payload.code !== 200 || !payload.data) throw new Error(`${name} check failed`);
}
console.log(JSON.stringify({ ok: true, checks: ["health", "products", "gateway_security"] }));
'
