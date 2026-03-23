# Business R&D Dashboard App

Minimal Next.js app shell for the AI-agent business R&D workflow.

## Location

This app lives at `apps/dashboard`.

## Environment setup

From the repo root:

```bash
cp .env.example .env
```

Current configurable values:
- `DASHBOARD_PORT` — preferred local app port if you export/use it when starting dev
- `DASHBOARD_SMOKE_PORT` — port used by `npm run smoke`
- `DASHBOARD_LIVE_CHECK_PORT` — port used by `npm run live-check`
- `OPENCLAW_STAGE_TIMEOUT_SECONDS` — timeout passed to live OpenClaw stage execution
- `OPENCLAW_STAGE_RETRIES` — retry budget for stage execution

## Local development

```bash
cp .env.example .env
cd apps/dashboard
npm install
npm run dev
```

By default the app docs assume port `3000`. Verification scripts read the root `.env` file (or your exported environment) for configurable port values.

## Runtime wiring

Live stage execution is routed through **OpenClaw**, not a separate direct model integration path.

Current runtime path:
- backend run orchestration lives in `src/lib/run-service.ts`
- stage execution adapter lives in `src/lib/openclaw-runtime.ts`
- live stages call `openclaw agent --json` using the configured OpenAI-backed model already available through OpenClaw

## Environment variables

Copy `.env.example` to `.env` at the repo root and adjust only what you need.

- `DASHBOARD_PORT` — default human-facing dev port documentation value
- `DASHBOARD_SMOKE_PORT` — port used by `npm run smoke`
- `DASHBOARD_LIVE_CHECK_PORT` — port used by `npm run live-check`
- `OPENCLAW_STAGE_TIMEOUT_SECONDS` — default timeout for a live stage execution
- `OPENCLAW_STAGE_RETRIES` — default retry budget for a live stage execution

If these are missing, the app/scripts fall back to safe local defaults instead of silently requiring machine-specific hardcoded values.

## Default vs demo/fallback behavior

- The default path is intended to be **live**, not fixture-backed
- Generated ideas, reviewer scorecards, orchestration output, and lifecycle metadata are persisted as run artifacts
- Demo/sample data remains only as explicit local-dev/demo support material and should not be confused with the default execution path

## Current routes

- `/` — app shell landing page
- `/workflows/business-rd` — workflow launcher/history surface
- `/workflows/business-rd/runs/[id]` — run detail/results view
- `/api/workflows/business-rd/runs` — list/create run
- `/api/workflows/business-rd/runs/[id]` — get run
- `/api/workflows/business-rd/runs/[id]/rerun` — rerun whole workflow
- `/api/workflows/business-rd/runs/[id]/rerun/[stage]` — documented stub for future stage reruns

## How to run a workflow locally

1. Start the app with `npm run dev`
2. Open `/workflows/business-rd`
3. Fill the launcher form and submit
4. The app will create a run through the backend API and route you to the run detail page

## Stored artifacts

- run summaries/details: `apps/dashboard/.data/business-rd-runs`
- runner-created artifacts: `apps/dashboard/.data/business-rd-run-artifacts`

## Demo-ready sample data

- `run-001.json` — successful run example
- `run-failed-demo.json` — failed-stage example so the UI can show understandable failure output

## Automated checks

```bash
cd apps/dashboard
npm run smoke
npm run live-check
```

- `smoke` boots the Next.js dev server, creates a run through the API, fetches it back, and verifies the run API path works.
- `live-check` boots the app, launches two materially different briefs, and fails if they produce the same first generated idea name or if the old sample reviewer fixture path reappears in `run-service.ts`.

## Notes

The app shell uses shared TypeScript types in `src/lib/types.ts` that align with the workflow payload/run model already defined in the repo specs.
