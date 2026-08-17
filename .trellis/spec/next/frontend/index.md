# @fastgpt/next

`packages/next` is a small Next.js boundary package. `type.ts` owns shared API
request/response types and `middle/cors.ts` owns CORS middleware.

- Keep it framework-focused and dependency-light.
- Do not move business logic or database access here.
- Run `pnpm --filter @fastgpt/next typecheck` and lint after changes.
