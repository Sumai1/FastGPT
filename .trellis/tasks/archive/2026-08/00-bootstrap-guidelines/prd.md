# Bootstrap Task: Fill Project Development Guidelines

**You (the AI) are running this task. The developer does not read this file.**

The developer just ran `trellis init` on this project for the first time.
`.trellis/` now exists with empty spec scaffolding, and this bootstrap task
exists under `.trellis/tasks/`. When they want to work on it, they should start
this task from a session that provides Trellis session identity.

**Your job**: help them populate `.trellis/spec/` with the team's real
coding conventions. Every future AI session — this project's
`trellis-implement` and `trellis-check` sub-agents — auto-loads spec files
listed in per-task jsonl manifests. Empty spec = sub-agents write generic
code. Real spec = sub-agents match the team's actual patterns.

Don't dump instructions. Open with a short greeting, figure out if the repo
has any existing convention docs (CLAUDE.md, .cursorrules, etc.), and drive
the rest conversationally.

---

## Status (update the checkboxes as you complete each item)

- [x] Fill guidelines for @fastgpt/global
- [x] Fill guidelines for @fastgpt/next
- [x] Fill guidelines for @fastgpt/service
- [x] Fill guidelines for @fastgpt/web
- [x] Fill guidelines for @fastgpt/app
- [x] Fill guidelines for @fastgpt/code-sandbox
- [x] Fill guidelines for @fastgpt/marketplace
- [x] Fill guidelines for @fastgpt/mcp_server
- [x] Fill guidelines for @fastgpt/volume-manager
- [x] Fill guidelines for @fastgpt/document
- [x] Fill guidelines for @fastgpt/icon
- [x] Fill guidelines for @fastgpt-sdk/otel
- [x] Fill guidelines for @fastgpt-sdk/sandbox-adapter
- [x] Fill guidelines for @fastgpt-sdk/storage
- [x] Fill guidelines for pro
- [x] Add code examples

---

## Spec files to populate

### Package: @fastgpt/global (`spec/global/`)

- Frontend guidelines: `.trellis/spec/global/frontend/`

### Package: @fastgpt/next (`spec/next/`)

- Frontend guidelines: `.trellis/spec/next/frontend/`

### Package: @fastgpt/service (`spec/service/`)

- Frontend guidelines: `.trellis/spec/service/frontend/`

### Package: @fastgpt/web (`spec/web/`)

- Frontend guidelines: `.trellis/spec/web/frontend/`

### Package: @fastgpt/app (`spec/app/`)

- Frontend guidelines: `.trellis/spec/app/frontend/`

### Package: @fastgpt/code-sandbox (`spec/code-sandbox/`)

- Backend guidelines: `.trellis/spec/code-sandbox/backend/`

- Frontend guidelines: `.trellis/spec/code-sandbox/frontend/`

### Package: @fastgpt/marketplace (`spec/marketplace/`)

- Frontend guidelines: `.trellis/spec/marketplace/frontend/`

### Package: @fastgpt/mcp_server (`spec/mcp_server/`)

- Backend guidelines: `.trellis/spec/mcp_server/backend/`

- Frontend guidelines: `.trellis/spec/mcp_server/frontend/`

### Package: @fastgpt/volume-manager (`spec/volume-manager/`)

- Backend guidelines: `.trellis/spec/volume-manager/backend/`

- Frontend guidelines: `.trellis/spec/volume-manager/frontend/`

### Package: @fastgpt/document (`spec/document/`)

- Frontend guidelines: `.trellis/spec/document/frontend/`

### Package: @fastgpt/icon (`spec/icon/`)

- Backend guidelines: `.trellis/spec/icon/backend/`

- Frontend guidelines: `.trellis/spec/icon/frontend/`

### Package: @fastgpt-sdk/otel (`spec/otel/`)

- Backend guidelines: `.trellis/spec/otel/backend/`

- Frontend guidelines: `.trellis/spec/otel/frontend/`

### Package: @fastgpt-sdk/sandbox-adapter (`spec/sandbox-adapter/`)

- Backend guidelines: `.trellis/spec/sandbox-adapter/backend/`

- Frontend guidelines: `.trellis/spec/sandbox-adapter/frontend/`

### Package: @fastgpt-sdk/storage (`spec/storage/`)

- Backend guidelines: `.trellis/spec/storage/backend/`

- Frontend guidelines: `.trellis/spec/storage/frontend/`

### Package: pro (`spec/pro/`)

- Backend guidelines: `.trellis/spec/pro/backend/`

- Frontend guidelines: `.trellis/spec/pro/frontend/`


### Thinking guides (already populated)

`.trellis/spec/guides/` contains general thinking guides pre-filled with
best practices. Customize only if something clearly doesn't fit this project.

---

## How to fill the spec

### Step 1: Import from existing convention files first (preferred)

Search the repo for existing convention docs. If any exist, read them and
extract the relevant rules into the matching `.trellis/spec/` files —
usually much faster than documenting from scratch.

| File / Directory | Tool |
|------|------|
| `CLAUDE.md` / `CLAUDE.local.md` | Claude Code |
| `AGENTS.md` | Codex / Claude Code / agent-compatible tools |
| `.cursorrules` | Cursor |
| `.cursor/rules/*.mdc` | Cursor (rules directory) |
| `.windsurfrules` | Windsurf |
| `.clinerules` | Cline |
| `.roomodes` | Roo Code |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.vscode/settings.json` → `github.copilot.chat.codeGeneration.instructions` | VS Code Copilot |
| `CONVENTIONS.md` / `.aider.conf.yml` | aider |
| `CONTRIBUTING.md` | General project conventions |
| `.editorconfig` | Editor formatting rules |

### Step 2: Analyze the codebase for anything not covered by existing docs

Scan real code to discover patterns. Before writing each spec file:
- Find 2-3 real examples of each pattern in the codebase.
- Reference real file paths (not hypothetical ones).
- Document anti-patterns the team clearly avoids.

### Step 3: Document reality, not ideals

**Critical**: write what the code *actually does*, not what it should do.
Sub-agents match the spec, so aspirational patterns that don't exist in the
codebase will cause sub-agents to write code that looks out of place.

If the team has known tech debt, document the current state — improvement
is a separate conversation, not a bootstrap concern.

---

## Quick explainer of the runtime (share when they ask "why do we need spec at all")

- Every AI coding task spawns two sub-agents: `trellis-implement` (writes
  code) and `trellis-check` (verifies quality).
- Each task has `implement.jsonl` / `check.jsonl` manifests listing which
  spec files to load.
- The platform hook auto-injects those spec files + the task's `prd.md`
  into every sub-agent prompt, so the sub-agent codes/reviews per team
  conventions without anyone pasting them manually.
- Source of truth: `.trellis/spec/`. That's why filling it well now pays
  off forever.

---

## Completion

When the developer confirms the checklist items above are done with real
examples (not placeholders), guide them to run:

```bash
python3 ./.trellis/scripts/task.py finish
python3 ./.trellis/scripts/task.py archive 00-bootstrap-guidelines
```

After archive, every new developer who joins this project will get a
`00-join-<slug>` onboarding task instead of this bootstrap task.

---

## Suggested opening line

"Welcome to Trellis! Your init just set me up to help you fill the project
spec — a one-time setup so every future AI session follows the team's
conventions instead of writing generic code. Before we start, do you have
any existing convention docs (CLAUDE.md, .cursorrules, CONTRIBUTING.md,
etc.) I can pull from, or should I scan the codebase from scratch?"
