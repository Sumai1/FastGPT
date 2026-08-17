# @fastgpt/marketplace

This is a separate Next.js marketplace app. Pages and APIs are under
`projects/marketplace/src/pages`; client API helpers are in `src/web/api.ts`
and `src/web/query.ts`.

- Reuse global contracts and web components where dependencies already allow.
- Keep marketplace persistence and route behavior inside this project.
- Validate with its Vitest, typecheck and build scripts from `package.json`.
