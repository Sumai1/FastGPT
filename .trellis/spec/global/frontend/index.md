# @fastgpt/global

`packages/global` owns data contracts shared by browser and server. Put domain
types and constants under `core/` or `support/`, and API boundary schemas under
`openapi/`. Examples include `core/dataset/search/type.ts`,
`support/permission/dataset/controller.ts` and
`openapi/support/openapi/api.ts`.

- Do not import Mongoose, Node-only SDKs or service implementations.
- Define Zod schemas once and infer types with `z.infer`.
- Keep API route metadata beside query/body/response schemas.
- Add focused Vitest coverage under `packages/global/test/`.

Workflow templates using the native question-classification node must also follow
[Workflow template classification contracts](./workflow-template-classification.md).

Scripts or deployment operations that synchronize an existing workflow App must also follow
[Workflow editing and publication contracts](./workflow-publication.md).

Follow `../../guides/fastgpt-development.md` for API and style rules.
