# Rubric Presets

## Scoring dimensions

All reviewer outputs may contribute to these dimensions:
- demand realism
- ease of execution
- distribution viability
- monetization quality
- defensibility
- speed to first revenue
- risk
- agent leverage
- AI authenticity

Scores are normalized to a shared scale before weighted aggregation.

## Preset: `fast-cash`

Optimize for speed to revenue and low execution drag.

Suggested weights:
- speed to first revenue: 0.22
- execution: 0.18
- monetization: 0.16
- distribution: 0.14
- demand: 0.12
- risk: 0.08
- agent leverage: 0.05
- ai_authenticity: 0.03
- defensibility: 0.02

## Preset: `solo-founder`

Optimize for one-person practicality and manageable operations.

Suggested weights:
- execution: 0.20
- distribution: 0.16
- speed to first revenue: 0.16
- demand: 0.14
- monetization: 0.12
- risk: 0.10
- agent leverage: 0.06
- ai_authenticity: 0.04
- defensibility: 0.02

## Preset: `venture-scale`

Optimize for market size, leverage, and moat rather than immediate cash.

Suggested weights:
- demand: 0.18
- defensibility: 0.18
- agent leverage: 0.14
- ai_authenticity: 0.10
- distribution: 0.10
- monetization: 0.10
- execution: 0.08
- speed to first revenue: 0.04
- risk: 0.08

## Orchestrator override rule

The orchestrator may override weighted ranking, but must:
- state which idea moved
- explain why
- preserve both raw weighted scores and the final ranked order
