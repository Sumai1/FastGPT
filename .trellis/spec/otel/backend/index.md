# @fastgpt-sdk/otel

This publishable TypeScript SDK separates logger, metrics and tracing entry
points. Public exports are defined by `sdk/otel/package.json`; implementations
live under `src/logger`, `src/metrics` and `src/tracing`.

- Preserve browser/client-safe entry points and avoid leaking server-only code.
- Update exports and types together; run build and Vitest before publishing.
