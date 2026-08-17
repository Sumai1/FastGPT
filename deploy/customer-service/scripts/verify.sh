#!/usr/bin/env bash
set -euo pipefail

: "${CUSTOMER_SERVICE_BASE_URL:?CUSTOMER_SERVICE_BASE_URL is required}"
: "${CUSTOMER_SERVICE_API_KEY:?CUSTOMER_SERVICE_API_KEY is required}"

cs_auth_header="Authorization: Bearer ${CUSTOMER_SERVICE_API_KEY}"
cs_origin_header="Origin: ${CUSTOMER_SERVICE_ORIGIN:-${CUSTOMER_SERVICE_BASE_URL%/}}"
cs_health_url="${CUSTOMER_SERVICE_BASE_URL%/}/api/customer-service/v1/health"
cs_products_url="${CUSTOMER_SERVICE_BASE_URL%/}/api/customer-service/v1/products"
cs_tmp_dir="$(mktemp -d)"
trap 'rm -rf "${cs_tmp_dir}"' EXIT

curl --fail --silent --show-error --max-time 20 \
  -H "${cs_auth_header}" -H "${cs_origin_header}" "${cs_health_url}" >"${cs_tmp_dir}/health.json"
curl --fail --silent --show-error --max-time 20 \
  -H "${cs_auth_header}" -H "${cs_origin_header}" "${cs_products_url}" >"${cs_tmp_dir}/products.json"

CS_VERIFY_TMP_DIR="${cs_tmp_dir}" node -e '
const fs = require("node:fs");
for (const name of ["health", "products"]) {
  const payload = JSON.parse(fs.readFileSync(`${process.env.CS_VERIFY_TMP_DIR}/${name}.json`, "utf8"));
  if (payload.code !== 200 || !payload.data) throw new Error(`${name} check failed`);
}
console.log(JSON.stringify({ ok: true, checks: ["health", "products"] }));
'
