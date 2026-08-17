# @fastgpt/code-sandbox

This is a Node/Hono process-isolation service. Entry and environment validation
are `src/index.ts` and `src/env.ts`; isolation, pools and concurrency controls
live under `src/isolated/`, `src/pool/` and `src/utils/`.

- Keep execution limits, process cleanup and network checks explicit.
- Validate external inputs with Zod before spawning work.
- Cover changes with `pnpm --filter @fastgpt/code-sandbox test`.
