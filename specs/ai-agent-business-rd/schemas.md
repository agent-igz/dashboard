# Schemas

## Candidate idea schema

```json
{
  "idea_id": "string",
  "name": "string",
  "summary": "string",
  "target_customer": "string",
  "pain_point": "string",
  "delivery_model": "string",
  "agent_role": "core-engine|service-layer|internal-advantage",
  "pricing_hint": "string",
  "time_to_mvp_days": 0,
  "time_to_first_revenue_days": 0,
  "assumptions": ["string"],
  "risks": ["string"],
  "distribution_channels": ["string"],
  "notes": "string"
}
```

## Reviewer schema

```json
{
  "idea_id": "string",
  "role": "skeptic|operator|growth|finance",
  "verdict": "advance|borderline|reject",
  "score": {
    "demand": 0,
    "execution": 0,
    "distribution": 0,
    "monetization": 0,
    "defensibility": 0,
    "speed_to_revenue": 0,
    "risk": 0,
    "agent_leverage": 0,
    "ai_authenticity": 0
  },
  "fatal_flaws": ["string"],
  "strongest_argument_for": "string",
  "strongest_argument_against": "string",
  "required_conditions": ["string"],
  "recommended_next_step": "string"
}
```

## Orchestrator output schema

```json
{
  "workflow_id": "string",
  "preset": "fast-cash|solo-founder|venture-scale|custom",
  "surviving_idea_ids": ["string"],
  "killed_ideas": [
    {
      "idea_id": "string",
      "reason": "string"
    }
  ],
  "ranked_shortlist": [
    {
      "idea_id": "string",
      "rank": 1,
      "weighted_score": 0,
      "verdict": "winner|promising|needs-validation",
      "rationale": "string",
      "next_step": "string"
    }
  ],
  "tradeoffs": ["string"],
  "notes": "string"
}
```

## Validation policy

- schema violations should trigger one retry with validation-error feedback
- if the retry still fails, the role output is marked failed
- workflow policy decides whether to continue, skip, or abort on that role failure
