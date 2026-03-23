#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parents[1]
PROMPTS = ROOT / 'prompts' / 'ai-agent-business-rd'

PRESETS = {
    'fast-cash': {'speed_to_revenue': 0.22, 'execution': 0.18, 'monetization': 0.16, 'distribution': 0.14, 'demand': 0.12, 'risk': 0.08, 'agent_leverage': 0.05, 'ai_authenticity': 0.03, 'defensibility': 0.02},
    'solo-founder': {'execution': 0.20, 'distribution': 0.16, 'speed_to_revenue': 0.16, 'demand': 0.14, 'monetization': 0.12, 'risk': 0.10, 'agent_leverage': 0.06, 'ai_authenticity': 0.04, 'defensibility': 0.02},
    'venture-scale': {'demand': 0.18, 'defensibility': 0.18, 'agent_leverage': 0.14, 'ai_authenticity': 0.10, 'distribution': 0.10, 'monetization': 0.10, 'execution': 0.08, 'speed_to_revenue': 0.04, 'risk': 0.08},
}

ROLE_ORDER = {
    'simple': ['generator', 'skeptic', 'orchestrator'],
    'full': ['generator', 'skeptic', 'operator', 'growth', 'finance', 'orchestrator'],
}


def write_json(path: Path, data: Dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')


def init_run(payload_path: Path, out_dir: Path) -> int:
    payload = json.loads(payload_path.read_text(encoding='utf-8'))
    mode = payload['mode']
    preset = payload['preset']
    roles = ROLE_ORDER.get(mode, ROLE_ORDER['full']) if mode != 'custom' else payload['roles']
    run = {
        'mode': mode,
        'preset': preset,
        'roles': roles,
        'status': 'initialized',
    }
    write_json(out_dir / 'metadata.json', run)
    write_json(out_dir / 'payload.json', payload)
    stage_packets: List[Dict] = []
    for role in roles:
        stage_packets.append({
            'role': role,
            'prompt_file': str(PROMPTS / f'{role}.md'),
            'retry_budget': 1,
            'status': 'pending',
        })
    write_json(out_dir / 'stage-packets.json', {'stages': stage_packets})
    return 0


def aggregate(run_dir: Path) -> int:
    payload = json.loads((run_dir / 'payload.json').read_text(encoding='utf-8'))
    weights = PRESETS[payload['preset']]
    reviewer_dir = run_dir / 'reviewer'
    scores: Dict[str, float] = {}
    verdicts: Dict[str, List[str]] = {}
    for path in sorted(reviewer_dir.glob('*.json')):
        data = json.loads(path.read_text(encoding='utf-8'))
        idea_id = data['idea_id']
        verdicts.setdefault(idea_id, []).append(data['verdict'])
        weighted = sum(float(data['score'].get(k, 0)) * w for k, w in weights.items())
        scores[idea_id] = scores.get(idea_id, 0.0) + weighted
    ranked = [
        {'idea_id': idea_id, 'weighted_score': round(score, 2), 'verdicts': verdicts.get(idea_id, [])}
        for idea_id, score in sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    ]
    write_json(run_dir / 'aggregation.json', {'ranked': ranked, 'preset': payload['preset']})
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest='cmd', required=True)
    p1 = sub.add_parser('init-run')
    p1.add_argument('--payload', required=True)
    p1.add_argument('--out', required=True)
    p2 = sub.add_parser('aggregate')
    p2.add_argument('--run', required=True)
    return p


if __name__ == '__main__':
    args = build_parser().parse_args()
    if args.cmd == 'init-run':
        raise SystemExit(init_run(Path(args.payload), Path(args.out)))
    if args.cmd == 'aggregate':
        raise SystemExit(aggregate(Path(args.run)))
