# agent-igz/dashboard

Business R&D dashboard for running and reviewing AI-assisted idea evaluation workflows.

## What it does

This app lets you:
- submit a business idea or research brief
- generate candidate ideas
- run role-based review stages over the idea set
- inspect rankings, kill reasons, reviewer evidence, and final synthesis
- review run history and rerun workflows from the dashboard

The current workflow uses staged roles such as:
- generator
- skeptic
- operator
- growth
- finance
- orchestrator

## Project structure

```text
apps/dashboard/                  # Next.js app
prompts/ai-agent-business-rd/    # prompt pack for workflow stages
specs/ai-agent-business-rd/      # schemas, contracts, rubric, UI docs
scripts/ai_agent_business_rd_runner.py
```

## How it works

- The web UI creates a workflow run
- The backend orchestrates stages asynchronously
- Each stage executes through OpenClaw using `openclaw agent --json`
- Run state and artifacts are persisted locally for inspection in the UI

## How OpenClaw fits in

The app does **not** call an LLM provider directly from the Next.js code.

Instead, the runtime path is:

1. the dashboard backend creates or advances a workflow stage
2. `apps/dashboard/src/lib/run-service.ts` prepares the prompt and stage payload
3. `apps/dashboard/src/lib/openclaw-runtime.ts` invokes:
   - `openclaw agent --json --session-id ... --message ...`
4. OpenClaw uses the model/provider configuration already available on the machine
5. the stage result is returned to the app and saved as part of the run artifacts

That means:
- the repo does **not** store the LLM API key in app code
- the app relies on a working local OpenClaw installation
- provider auth is handled by OpenClaw, not by the dashboard UI itself

In short:

**Dashboard app → OpenClaw CLI/runtime → configured model provider**

## Requirements

- Node.js / npm
- OpenClaw installed and configured on the machine
- access to the model/provider configuration used by OpenClaw

## Setup

From the repo root:

```bash
cp .env.example .env
cd apps/dashboard
npm install
```

## Running locally

```bash
cd apps/dashboard
npm run dev
```

Open:
- `http://localhost:3000`
- `http://localhost:3000/workflows/business-rd`

## Environment variables

Set values in repo-root `.env` as needed:

- `DASHBOARD_PORT`
- `DASHBOARD_SMOKE_PORT`
- `DASHBOARD_LIVE_CHECK_PORT`
- `OPENCLAW_STAGE_TIMEOUT_SECONDS`
- `OPENCLAW_STAGE_RETRIES`

See `.env.example` for defaults.

## Useful commands

From `apps/dashboard`:

```bash
npm run dev
npm run typecheck
npm run smoke
npm run live-check
```

## Data and artifacts

The app stores local run data under:
- `apps/dashboard/.data/business-rd-runs`
- `apps/dashboard/.data/business-rd-run-artifacts`

These are local runtime artifacts and should not be treated as committed source.

## Current limitations

- This is still an early-stage product/prototype
- Partial stage reruns are not fully implemented yet
- Some hardening and dependency upgrades are still pending
