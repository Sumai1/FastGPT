# @fastgpt/service

`packages/service` owns server-only persistence and business behavior. Use the
domain tree under `core/` and infrastructure under `common/`; support concerns
such as permissions, API keys and audit records live under `support/`.

Real patterns:

- `core/ai/skill/model/schema.ts` uses Mongoose plus `defineIndex`.
- `support/openapi/auth.ts` authenticates keys while
  `support/openapi/schema.ts` owns persistence.
- `core/dataset/search/controller.ts` coordinates retrieval without exposing
  database details to API routes.
- Tests mirror source ownership under `packages/service/test/`.

Use entity/service/utils separation, optional Mongo sessions for writes, and
the API/Mongo rules in `../../guides/fastgpt-development.md`.

Domain-specific executable contracts:

- [Customer Service RAG trust boundaries](./customer-service-boundaries.md):
  server-derived retrieval whitelist, Key audience ceiling, trusted request context,
  privacy HMAC, and request idempotency/replay behavior.
