# Artifact Model

## Workflow run artifact

Each run should persist inspectable artifacts containing:
- workflow id
- parent workflow definition / preset
- run payload / brief
- idea count and selected mode
- prompt pack / prompt version metadata
- spawned session ids per role
- per-role outputs
- weighted score table
- eliminated ideas and reasons
- orchestrator final synthesis
- timestamps, duration, and failure metadata

## Recommended directory / storage shape

```text
workflow-run/
  metadata.json
  payload.json
  role-definitions.json
  candidate-ideas.json
  reviewer/
    skeptic.json
    operator.json
    growth.json
    finance.json
  aggregation.json
  orchestrator.json
  eliminations.json
  logs.json
```

## Partial failure handling

Store failures as first-class artifacts:
- failed role
- validation error
- retry count
- whether the run continued
- impact on final ranking confidence

## Why this matters

- reproducibility
- auditability
- future dashboard run detail pages
- side-by-side comparisons between runs
- targeted reruns of only the failed or weak stages
