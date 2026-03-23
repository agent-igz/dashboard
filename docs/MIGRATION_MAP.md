# Dashboard Migration Map

## Goal

Move the business R&D dashboard product out of `.openclaw/workspace` and into the standalone `agent-igz/dashboard` repo so the app, prompts, specs, runtime glue, and tests live together.

## Source audit summary

### Primary app source to move
Copy/migrate from workspace:
- `apps/dashboard/*`

### Support files currently outside the app folder
These are required by the current app/runtime and must either move or be rewritten repo-locally:
- `scripts/ai_agent_business_rd_runner.py`
- `prompts/ai-agent-business-rd/*`
- `specs/ai-agent-business-rd/*`

### Runtime/path assumptions that must be rewritten
Current files with workspace-relative assumptions:
- `apps/dashboard/src/lib/run-service.ts`
- `apps/dashboard/src/lib/openclaw-runtime.ts`

They currently assume the broader OpenClaw workspace exists and reference files under:
- `../../scripts/...`
- `../../prompts/...`
- `../../specs/...`

These must become **repo-local paths** after migration.

## Target repo layout

```text
agent-igz/dashboard/
  docs/
    MIGRATION_MAP.md
  apps/
    dashboard/
      app/
      src/
      scripts/
      package.json
      tsconfig.json
      next.config.mjs
      README.md
  prompts/
    ai-agent-business-rd/
  specs/
    ai-agent-business-rd/
  scripts/
    ai_agent_business_rd_runner.py
  tests/
```

## Copy vs rewrite vs leave behind

### Copy directly (or nearly directly)
- `apps/dashboard/app/*`
- `apps/dashboard/src/components/*`
- `apps/dashboard/src/lib/types.ts`
- `apps/dashboard/src/lib/workflow-store.ts`
- `apps/dashboard/README.md`
- `apps/dashboard/package.json`
- `apps/dashboard/tsconfig.json`
- `apps/dashboard/next.config.mjs`
- `prompts/ai-agent-business-rd/*`
- `specs/ai-agent-business-rd/*`
- `scripts/ai_agent_business_rd_runner.py`
- `apps/dashboard/scripts/smoke.sh`
- `apps/dashboard/scripts/live-check.sh`

### Rewrite during migration
- `apps/dashboard/src/lib/run-service.ts`
  - remove workspace-relative path assumptions
  - ensure artifact locations are repo-local and `.gitignore`d appropriately
- `apps/dashboard/src/lib/openclaw-runtime.ts`
  - verify runtime/session assumptions remain valid from the repo context
- any README/docs that still talk about `.openclaw/workspace` as the product home

### Leave behind / do not migrate as product source
- `.next/`
- `node_modules/`
- local run artifacts under `.data/business-rd-run-artifacts/`
- local sample run state under `.data/business-rd-runs/` except explicit demo fixtures if intentionally retained
- unrelated OpenClaw workspace docs/roles/workflows that are agent-home infrastructure rather than product code

## What would break if copied naively

- `run-service.ts` / `openclaw-runtime.ts` would still resolve files relative to the old workspace structure
- local `.data/` run artifacts would pollute the product repo if copied blindly
- `.next/` and `node_modules/` are build/dev byproducts and should not be migrated
- README/setup text would mislead future work if it continues to point at `.openclaw/workspace` as the canonical source

## Recommended migration chain

1. Move app source into repo-local `apps/dashboard`
2. Move prompts/specs/runner into repo-local `prompts/`, `specs/`, `scripts/`
3. Rewrite runtime path assumptions to repo-local references
4. Externalize sensitive/machine-specific config to `.env`
5. Verify the migrated repo works from a clean checkout
6. Remove old workspace copy once parity is confirmed

## Sensitive data note

Do **not** migrate:
- local run history
- local artifact runs
- machine-specific config
- any secrets/tokens/env files

Those should be regenerated locally or moved behind explicit `.env` configuration later.
