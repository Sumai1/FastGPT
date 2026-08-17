# @fastgpt-sdk/sandbox-adapter

This publishable SDK provides a provider-neutral sandbox adapter. The base
contract is `src/adapters/base.ts`; implementations live in provider folders
such as `opensandbox` and `sealos-devbox`.

- Extend the base capability contract before adding provider branches to
  consumers.
- Keep lifecycle normalization and polyfills inside adapters.
- Run the SDK build and Vitest suite after contract changes.
