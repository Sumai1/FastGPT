# @fastgpt/app

`projects/app` is the main Next.js application. Pages live in `src/pages`, API
routes in `src/pages/api`, app services in `src/service`, and app-only UI in
`src/components`. Reusable UI belongs in `packages/web`.

- API contracts come from `@fastgpt/global/openapi`; handlers use
  `parseApiInput` and `NextAPI`, as in
  `src/pages/api/support/openapi/create.ts`.
- Server orchestration may import `@fastgpt/service`; browser modules may not.
- Use existing pages such as `src/pages/chat/index.tsx` and dashboard routing
  as layout/navigation references.
- Run focused Vitest files and `pnpm --filter @fastgpt/app typecheck`.

## Pages Router SSR contract

`serviceSideProps(context, namespaces)` returns the values that belong inside
Next.js `props`; it is not itself a complete `getServerSideProps` result. Returning
it directly causes Next.js 16 to reject the extra top-level locale keys and render
HTTP 500.

```ts
// Wrong: locale keys become invalid top-level getServerSideProps keys.
return serviceSideProps(context, ['common']);

// Correct: spread the locale values inside the required props envelope.
return {
  props: {
    ...(await serviceSideProps(context, ['common']))
  }
};
```

When adding or changing a Pages Router SSR page, verify both the production build
and an unauthenticated HTTP request to the rendered route; TypeScript alone does
not validate the runtime `getServerSideProps` envelope.
