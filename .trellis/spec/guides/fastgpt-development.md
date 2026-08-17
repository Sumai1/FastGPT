# FastGPT Development Guide

This repository is a pnpm 10 workspace using Node.js 20+, TypeScript, Next.js,
Chakra UI, MongoDB/Mongoose and pluggable vector databases. The authoritative
human-maintained rules remain `AGENTS.md`, `.agents/code/syntax.md` and
`.agents/code/commands.md`; this file is their executable Trellis summary.

## Layer ownership

- Put browser/server shared Zod schemas, types and constants in `packages/global/`.
  `packages/global/core/dataset/search/` is a real example of domain ownership.
- Put server-only entities, schemas and services in `packages/service/`. Follow
  the `schema.ts` / `entity.ts` / `service.ts` / `utils.ts` roles used under
  `packages/service/core/app/` and `packages/service/core/dataset/`.
- Put reusable React components and hooks in `packages/web/`; app-specific pages,
  API routes and orchestration belong in `projects/app/src/`.
- Never import `@fastgpt/service` from browser code. Cross-layer contracts flow
  from `global` to `service` and `app`, not in the opposite direction.

## API contract

- Define request and response Zod schemas under `packages/global/openapi/` and
  infer TypeScript types with `z.infer`. Reuse business schemas rather than
  cloning them for documentation.
- Validate Next.js request input with `parseApiInput`. See
  `projects/app/src/pages/api/support/openapi/create.ts` and
  `projects/app/src/pages/api/support/mcp/create.ts`.
- Export handlers through `NextAPI`; return data matching the response schema.
  Empty success responses use `z.undefined()` rather than `{}`, `null` or text.
- Use `BoolSchema`, `NumSchema` and `IntSchema` for transport coercion. Document
  public fields with `meta({ description, example })`.

```ts
const { body } = parseApiInput({ req, bodySchema: CreateThingBodySchema });
return CreateThingResponseSchema.parse(await createThing(body));
```

## MongoDB and business services

- Declare every managed index with `defineIndex`; do not use `schema.index()`,
  `index: true` or `unique: true`. Real examples are in
  `packages/service/core/ai/skill/model/schema.ts`.
- A field or index change requires checking historical FastGPT indexes. Register
  only confirmed retired indexes with `deprecated: true` and cover cleanup in
  `packages/service/test/common/mongo/indexManager.test.ts`.
- Database write helpers accept an optional `ClientSession`. Coordinate a
  transaction with `mongoSessionRun` at the service layer.
- Entities perform persistence; services own rules; utils are pure. Avoid
  service-to-service cycles and pass collaborators into the coordinating layer.

## TypeScript and comments

- New declarations use `type`, not `interface`; import types with `import type`.
- Prefer `??` over `||` for defaults and `callback?.()` for optional callbacks.
- More than two function parameters must be wrapped in an object.
- Exported, cross-module and complex business functions need `/** ... */`
  comments explaining boundaries and design decisions, not line-by-line prose.
- Use two spaces, single quotes, semicolons, no trailing commas, 100 columns and
  LF as configured by `.prettierrc.js`.

## Verification

- Add Vitest tests near the owning package: `packages/global/test/`,
  `packages/service/test/`, `projects/app/test/` or the project's `test/` tree.
- During development run the narrowest test file or package typecheck. Run the
  repository-wide test gate only after all planned work is complete.
- Useful commands are `pnpm --filter @fastgpt/global test`,
  `pnpm --filter @fastgpt/service test`, `pnpm --filter @fastgpt/app typecheck`
  and finally `pnpm test`.
