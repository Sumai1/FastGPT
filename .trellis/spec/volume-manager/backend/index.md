# @fastgpt/volume-manager

This Hono service manages Docker/Kubernetes volumes. HTTP routing is under
`src/routes`, orchestration in `src/services/VolumeService.ts`, and provider
details behind `src/drivers/IVolumeDriver.ts` implementations.

- Preserve the driver boundary when adding provider-specific behavior.
- Validate requests and environment data with Zod.
- Add unit tests under `test/unit` and run the package test command.
