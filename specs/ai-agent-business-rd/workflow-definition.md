# Workflow Definition

## Coordinator responsibilities
- initialize run metadata and artifact directories
- create isolated role task packets per stage
- expose only allowed inputs to each role
- validate structured outputs
- retry malformed outputs once
- aggregate reviewer scores and eliminations
- hand full artifact set to orchestrator

## Stage packets
Each stage packet should include:
- role name
- prompt file path
- allowed input artifact paths
- expected output schema
- retry budget
- timeout policy

## Persistence rule
Every stage writes artifacts into the shared run directory defined in `artifact-model.md`.
