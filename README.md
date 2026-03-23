# agent-igz/dashboard

Business R&D dashboard for running and inspecting AI-agent-driven online business idea workflows.

## What this repo does

This repo contains a migrated Next.js dashboard app plus the prompt/spec/runtime assets needed to launch, inspect, and validate multi-stage business-idea workflows.

Current workflow shape:
- generate candidate ideas
- run reviewer stages (`skeptic`, `operator`, `growth`, `finance` when enabled)
- aggregate scores and kill reasons
- run an orchestrator stage
- inspect the resulting shortlist, killed ideas, lifecycle, and raw artifacts in the dashboard

## Repo layout

```text
apps/dashboard/                  # Next.js app
prompts/ai-agent-business-rd/    # live stage prompt pack
specs/ai-agent-business-rd/      # schemas, contracts, rubric, artifact model, UI docs
scripts/ai_agent_business_rd_runner.py
scripts/                         # repo-level helper scripts as migration continues
docs/MIGRATION_MAP.md            # migration planning/reference
```

## Current architecture

### App
- main app lives in `apps/dashboard`
- launcher/history route: `/workflows/business-rd`
- run detail route: `/workflows/business-rd/runs/[id]`
- API routes live under `apps/dashboard/app/api/workflows/business-rd/runs/*`

### Runtime flow
- orchestration lives in `apps/dashboard/src/lib/run-service.ts`
- OpenClaw execution adapter lives in `apps/dashboard/src/lib/openclaw-runtime.ts`
- live stages call `openclaw agent --json`
- generated ideas, reviewer outputs, aggregation, orchestrator output, and lifecycle data are persisted as run artifacts

### Persistence
- run summaries/details: `apps/dashboard/.data/business-rd-runs`
- structured run artifacts: `apps/dashboard/.data/business-rd-run-artifacts`

## Setup

From the repo root:

```bash
cp .env.example .env
cd apps/dashboard
npm install
```

Then run the app:

```bash
npm run dev
```

Open:
- <http://localhost:3000>
- workflow page: <http://localhost:3000/workflows/business-rd>

## Environment configuration

Set values in repo-root `.env` as needed:

- `DASHBOARD_PORT`
- `DASHBOARD_SMOKE_PORT`
- `DASHBOARD_LIVE_CHECK_PORT`
- `OPENCLAW_STAGE_TIMEOUT_SECONDS`
- `OPENCLAW_STAGE_RETRIES`

See `.env.example` for safe placeholders.

## Useful commands

From `apps/dashboard`:

```bash
npm run dev
npm run typecheck
npm run smoke
npm run live-check
```

What they do:
- `typecheck` — TypeScript verification
- `smoke` — boots the app, creates a run through the API, polls until terminal state, and verifies the API path works
- `live-check` — launches materially different briefs and checks that the live path is not silently regressing to deterministic fixture behavior

## How workflow runs execute through OpenClaw

- the app creates a queued run
- backend orchestration advances the run asynchronously
- live stages execute via `openclaw agent --json`
- stage lifecycle is tracked as `queued` / `running` / `completed` / `failed`
- run detail pages surface both readable summaries and raw debug artifacts

## Known limitations / prototype boundaries

- this is still a prototype workflow system, not a hardened production product
- stage reruns are not fully implemented yet (there is still a documented stub path)
- some runtime artifact payloads can contain historical OpenClaw metadata that references the original workspace context
- dependency security hardening/upgrades are still pending (for example the currently installed Next.js version reported a security advisory during install)

## Migration status

The dashboard app and its current runtime assets have been migrated into this repo.

See `docs/MIGRATION_MAP.md` for the migration inventory and target layout history.

## Working issues in this repo

When a cron/agent is working issues here, prefer:
1. taking the lowest-numbered open issue unless the issue comment explicitly says otherwise
2. making the smallest repo-local change that fully satisfies that issue
3. closing the issue after verification
4. commenting on `#16` with:
   - what was done
   - blockers
   - what remains

## Git / agent note

Some migration issues explicitly allow pushing directly to the repo. When an issue says that, it is intentional for this migration workflow.
