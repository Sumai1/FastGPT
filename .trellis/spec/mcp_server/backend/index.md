# @fastgpt/mcp_server

This Bun/Express service exposes FastGPT through MCP. `src/init.ts` owns MCP
initialization, `src/api/fastgpt.ts` owns FastGPT calls, and `src/env.ts`
validates runtime configuration.

- Keep transport conversion at the MCP boundary and shared types in global.
- Never duplicate FastGPT authorization or workflow behavior locally.
- Build with the package's Bun command after TypeScript changes.
