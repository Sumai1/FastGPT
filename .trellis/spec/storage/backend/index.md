# @fastgpt-sdk/storage

This publishable SDK owns storage factories, common types and signed access-link
behavior. See `src/factory.ts`, `src/types.ts` and `src/access-link/service.ts`.

- Keep provider selection behind the factory and cryptographic validation at
  the access-link boundary.
- Public exports, built declarations and tests must change together.
