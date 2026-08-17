# @fastgpt/icon

`scripts/icon` is JavaScript tooling for previewing and regenerating the shared
icon catalog. `index.js` serves the preview and `init.js` generates constants.

- Treat generated icon constants as output of the script, not hand-maintained
  duplicates.
- Use the root `pnpm initIcon` and `pnpm previewIcon` commands.
