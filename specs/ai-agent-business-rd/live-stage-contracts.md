# Live Stage Contracts

## Purpose

Define the durable prompt/output/validation contracts for live multi-stage business R&D runs.

## Stage sequences

### Simple mode
1. `generator`
2. `skeptic`
3. `orchestrator`

### Full mode
1. `generator`
2. `skeptic`
3. `operator`
4. `growth`
5. `finance`
6. `orchestrator`

### Custom mode
- user-selected subset/order
- must still end with `orchestrator`
- every included reviewer stage must declare a schema and validation rule

## Shared idea record contract

Every generated idea must include:
- `idea_id`
- `name`
- `summary`
- `target_customer`
- `pain_point`
- `delivery_model`
- `agent_role`
- `pricing_hint`
- `time_to_mvp_days`
- `time_to_first_revenue_days`
- `assumptions[]`
- `risks[]`
- `distribution_channels[]`
- `notes`

## Reviewer scorecard contract

Every reviewer stage (`skeptic`, `operator`, `growth`, `finance`) must return:
- `idea_id`
- `role`
- `verdict` = `advance | borderline | reject`
- `score`
  - `demand`
  - `execution`
  - `distribution`
  - `monetization`
  - `defensibility`
  - `speed_to_revenue`
  - `risk`
  - `agent_leverage`
  - `ai_authenticity`
- `fatal_flaws[]`
- `strongest_argument_for`
- `strongest_argument_against`
- `required_conditions[]`
- `recommended_next_step`

## Orchestrator contract

The orchestrator must return:
- `workflow_id`
- `preset`
- `surviving_idea_ids[]`
- `killed_ideas[]` with explicit reasons
- `ranked_shortlist[]` with weighted scores and rationale
- `tradeoffs[]`
- `notes`

## Prompt pack alignment

The active live prompt pack is stored in:
- `prompts/ai-agent-business-rd/generator.md`
- `prompts/ai-agent-business-rd/skeptic.md`
- `prompts/ai-agent-business-rd/operator.md`
- `prompts/ai-agent-business-rd/growth.md`
- `prompts/ai-agent-business-rd/finance.md`
- `prompts/ai-agent-business-rd/orchestrator.md`

Each prompt must:
- state the role objective clearly
- state the failure mode to avoid
- require structured output only
- align with the declared contract for that stage

## Validation rules

A stage fails validation if:
- required top-level fields are missing
- `verdict` is outside the declared enum
- any score dimension is missing from a reviewer scorecard
- a killed idea has no reason
- the orchestrator output has no ranked shortlist
- freeform prose is returned without the required structured fields

## Failure behavior

- retry once with validation error feedback
- if still invalid, persist the failed output/error as a first-class artifact
- mark the stage failed explicitly in lifecycle state
- allow the workflow to continue only if the policy for that run permits it

## UI / persistence alignment

These contracts are designed to align with:
- `specs/ai-agent-business-rd/schemas.md`
- `specs/ai-agent-business-rd/artifact-model.md`
- `specs/ai-agent-business-rd/dashboard-ui.md`
- `apps/dashboard/src/lib/types.ts`
- `apps/dashboard/src/lib/workflow-store.ts`
