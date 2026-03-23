import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  IdeaReviewRollup,
  KilledIdeaDetail,
  RankedIdeaDetail,
  StageLifecycleEntry,
  WorkflowPayload,
  WorkflowRunDetail,
} from '@/src/lib/types';
import { executeStage } from '@/src/lib/openclaw-runtime';
import { getRun, listRuns, saveRun } from '@/src/lib/workflow-store';

const execFileAsync = promisify(execFile);
const APP_ROOT = process.cwd();
const WORKSPACE_ROOT = path.resolve(APP_ROOT, '..', '..');
const RUNNER = path.join(WORKSPACE_ROOT, 'scripts', 'ai_agent_business_rd_runner.py');
const RUN_ARTIFACT_DIR = path.join(APP_ROOT, '.data', 'business-rd-run-artifacts');

type ReviewerRecord = {
  idea_id: string;
  role: string;
  verdict: string;
  score?: Record<string, number>;
  strongest_argument_for?: string;
  strongest_argument_against?: string;
  fatal_flaws?: string[];
  required_conditions?: string[];
  recommended_next_step?: string;
};

type GeneratedIdea = {
  idea_id: string;
  name: string;
  summary: string;
  target_customer: string;
  pain_point: string;
  delivery_model: string;
  pricing_hint?: string;
  risks?: string[];
  notes?: string;
};

type OrchestratorResult = {
  surviving_idea_ids?: string[];
  killed_ideas?: Array<{ idea_id: string; reason: string }>;
  ranked_shortlist?: Array<{ idea_id: string; rank?: number; weighted_score?: number; rationale?: string; next_step?: string }>;
  notes?: string;
};

function makeId() {
  return `run-${Date.now()}`;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function runDir(id: string) {
  return path.join(RUN_ARTIFACT_DIR, id);
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'idea';
}

function cleanJson(raw: string | undefined) {
  if (!raw) return '';
  return raw.trim().replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
}

function buildGeneratorPrompt(payload: WorkflowPayload) {
  return [
    'Generate fresh AI-agent-driven online business ideas for the following brief.',
    `Topic: ${payload.topic}`,
    `Idea count: ${payload.idea_count}`,
    `Mode: ${payload.mode}`,
    `Preset: ${payload.preset}`,
    `Optimize for: ${payload.optimize_for ?? 'practical traction'}`,
    `Business model: ${payload.business_model ?? 'unspecified'}`,
    `Agent role: ${payload.agent_role ?? 'core-engine'}`,
    `Constraints: ${(payload.constraints ?? []).join(', ') || 'none'}`,
    'Return ONLY a JSON array. Each item must include: idea_id, name, summary, target_customer, pain_point, delivery_model, pricing_hint, risks, notes.',
    'Make the ideas materially different from each other.',
  ].join('\n');
}

function parseGeneratedIdeas(raw: string | undefined, payload: WorkflowPayload): GeneratedIdea[] {
  const parsed = JSON.parse(cleanJson(raw));
  const items = Array.isArray(parsed) ? parsed : [];
  return items.slice(0, Math.max(1, payload.idea_count)).map((item, idx) => ({
    idea_id: item.idea_id || `${slug(item.name || `idea-${idx + 1}`)}`,
    name: item.name || `Idea ${idx + 1}`,
    summary: item.summary || 'No summary provided.',
    target_customer: item.target_customer || 'Unspecified target customer',
    pain_point: item.pain_point || 'Unspecified pain point',
    delivery_model: item.delivery_model || 'Unspecified delivery model',
    pricing_hint: item.pricing_hint || '',
    risks: Array.isArray(item.risks) ? item.risks : [],
    notes: item.notes || '',
  }));
}

function buildReviewerPrompt(role: string, ideas: GeneratedIdea[], payload: WorkflowPayload) {
  return [
    `You are the ${role} stage in a business-R&D workflow.`,
    `Topic: ${payload.topic}`,
    `Mode: ${payload.mode}`,
    `Preset: ${payload.preset}`,
    'Review the following idea set and return ONLY a JSON array of reviewer scorecards.',
    'Each scorecard must include: idea_id, role, verdict, score{demand,execution,distribution,monetization,defensibility,speed_to_revenue,risk,agent_leverage,ai_authenticity}, fatal_flaws, strongest_argument_for, strongest_argument_against, required_conditions, recommended_next_step.',
    JSON.stringify(ideas, null, 2),
  ].join('\n');
}

function parseReviewerRecords(raw: string | undefined, role: string): ReviewerRecord[] {
  const parsed = JSON.parse(cleanJson(raw));
  const items = Array.isArray(parsed) ? parsed : [];
  return items.map((item) => ({
    idea_id: item.idea_id,
    role: item.role || role,
    verdict: item.verdict || 'borderline',
    score: item.score || {},
    strongest_argument_for: item.strongest_argument_for || '',
    strongest_argument_against: item.strongest_argument_against || '',
    fatal_flaws: Array.isArray(item.fatal_flaws) ? item.fatal_flaws : [],
    required_conditions: Array.isArray(item.required_conditions) ? item.required_conditions : [],
    recommended_next_step: item.recommended_next_step || '',
  }));
}

function buildOrchestratorPrompt(ideas: GeneratedIdea[], reviews: ReviewerRecord[], aggregation: Record<string, unknown>, payload: WorkflowPayload) {
  return [
    'You are the orchestrator stage in a business-R&D workflow.',
    `Topic: ${payload.topic}`,
    `Mode: ${payload.mode}`,
    `Preset: ${payload.preset}`,
    'Use the generated ideas, reviewer scorecards, and aggregate ranking to produce the final structured result.',
    'Return ONLY a JSON object with: surviving_idea_ids, killed_ideas[{idea_id,reason}], ranked_shortlist[{idea_id,rank,weighted_score,rationale,next_step}], notes.',
    'Generated ideas:',
    JSON.stringify(ideas, null, 2),
    'Reviewer outputs:',
    JSON.stringify(reviews, null, 2),
    'Aggregation:',
    JSON.stringify(aggregation, null, 2),
  ].join('\n');
}

function parseOrchestratorResult(raw: string | undefined): OrchestratorResult {
  return JSON.parse(cleanJson(raw));
}

function rollupReviews(records: ReviewerRecord[]) {
  const byIdea = new Map<string, IdeaReviewRollup>();

  for (const record of records) {
    const current = byIdea.get(record.idea_id) ?? {
      verdicts: [],
      strongestFor: [],
      strongestAgainst: [],
      requiredConditions: [],
      recommendedNextSteps: [],
      roleScores: {},
    };

    current.verdicts.push(record.verdict);
    if (record.strongest_argument_for) current.strongestFor.push(record.strongest_argument_for);
    if (record.strongest_argument_against) current.strongestAgainst.push(record.strongest_argument_against);
    current.requiredConditions.push(...(record.required_conditions ?? []));
    if (record.recommended_next_step) current.recommendedNextSteps.push(record.recommended_next_step);
    if (record.score) current.roleScores[record.role] = record.score;

    byIdea.set(record.idea_id, current);
  }

  for (const [ideaId, current] of byIdea.entries()) {
    byIdea.set(ideaId, {
      verdicts: current.verdicts,
      strongestFor: dedupe(current.strongestFor),
      strongestAgainst: dedupe(current.strongestAgainst),
      requiredConditions: dedupe(current.requiredConditions),
      recommendedNextSteps: dedupe(current.recommendedNextSteps),
      roleScores: current.roleScores,
    });
  }

  return byIdea;
}

function buildIdeaCatalog(generatedIdeas: GeneratedIdea[]): Record<string, { name: string; description: string }> {
  return Object.fromEntries(
    generatedIdeas.map((idea) => [
      idea.idea_id,
      {
        name: idea.name,
        description: `${idea.summary} Target customer: ${idea.target_customer}. Pain: ${idea.pain_point}. Delivery: ${idea.delivery_model}.`,
      },
    ]),
  );
}

function buildRankedIdeaDetails(
  generatedIdeas: GeneratedIdea[],
  aggregation: Record<string, unknown>,
  reviewRollups: Map<string, IdeaReviewRollup>,
  orchestrator: OrchestratorResult,
): RankedIdeaDetail[] {
  const catalog = buildIdeaCatalog(generatedIdeas);
  const ranked = Array.isArray(orchestrator.ranked_shortlist) && orchestrator.ranked_shortlist.length > 0
    ? orchestrator.ranked_shortlist
    : Array.isArray(aggregation.ranked)
      ? aggregation.ranked as Array<{ idea_id: string; weighted_score?: number }>
      : [];

  return ranked.map((entry) => {
    const rankedEntry = entry as { idea_id: string; weighted_score?: number; rationale?: string; next_step?: string };
    const idea = catalog[rankedEntry.idea_id] ?? {
      name: titleCase(rankedEntry.idea_id),
      description: 'No description available for this idea yet.',
    };
    const rollup = reviewRollups.get(rankedEntry.idea_id);

    return {
      id: rankedEntry.idea_id,
      name: idea.name,
      description: idea.description,
      weightedScore: rankedEntry.weighted_score,
      verdicts: rollup?.verdicts ?? [],
      whyItCouldWork: rollup?.strongestFor ?? [],
      keyRisks: rollup?.strongestAgainst ?? [],
      requiredConditions: rollup?.requiredConditions ?? [],
      nextSteps: dedupe([...(rollup?.recommendedNextSteps ?? []), rankedEntry.next_step ?? '']),
      scoreBreakdown: rollup?.roleScores ?? {},
    } satisfies RankedIdeaDetail;
  });
}

function buildKilledIdeaDetails(generatedIdeas: GeneratedIdea[], orchestrator: OrchestratorResult): KilledIdeaDetail[] {
  const catalog = buildIdeaCatalog(generatedIdeas);
  const killed = Array.isArray(orchestrator.killed_ideas) ? orchestrator.killed_ideas : [];
  return killed.map((item) => ({
    id: item.idea_id,
    name: catalog[item.idea_id]?.name ?? titleCase(item.idea_id),
    description: catalog[item.idea_id]?.description ?? 'No description available.',
    reason: item.reason,
  }));
}

async function updateRun(id: string, patch: Partial<WorkflowRunDetail>) {
  const current = await getRun(id);
  if (!current) return;
  await saveRun({ ...current, ...patch });
}

function nextLifecycle(current: Record<string, StageLifecycleEntry> | undefined, stage: string, patch: Partial<StageLifecycleEntry>): Record<string, StageLifecycleEntry> {
  const entry: StageLifecycleEntry = {
    status: 'queued',
    ...(current?.[stage] ?? {}),
    ...patch,
  };
  return {
    ...(current ?? {}),
    [stage]: entry,
  };
}

async function persistStructuredArtifacts(
  dir: string,
  data: {
    generatedIdeas?: GeneratedIdea[];
    reviewerResults?: ReviewerRecord[];
    reviewRollups?: Map<string, IdeaReviewRollup>;
    aggregation?: Record<string, unknown>;
    orchestrator?: OrchestratorResult;
    rankedIdeaDetails?: RankedIdeaDetail[];
    killedIdeaDetails?: KilledIdeaDetail[];
    finalSynthesis?: string;
    stageLifecycle?: Record<string, StageLifecycleEntry>;
  },
) {
  await ensureDir(dir);
  if (data.generatedIdeas) {
    await fs.writeFile(path.join(dir, 'generated-ideas.json'), JSON.stringify(data.generatedIdeas, null, 2) + '\n', 'utf8');
  }
  if (data.reviewerResults) {
    await fs.writeFile(path.join(dir, 'reviewer-scorecards.json'), JSON.stringify(data.reviewerResults, null, 2) + '\n', 'utf8');
  }
  if (data.reviewRollups) {
    await fs.writeFile(path.join(dir, 'review-rollups.json'), JSON.stringify(Object.fromEntries(data.reviewRollups), null, 2) + '\n', 'utf8');
  }
  if (data.aggregation) {
    await fs.writeFile(path.join(dir, 'aggregation.json'), JSON.stringify(data.aggregation, null, 2) + '\n', 'utf8');
  }
  if (data.orchestrator) {
    await fs.writeFile(path.join(dir, 'orchestrator-result.json'), JSON.stringify(data.orchestrator, null, 2) + '\n', 'utf8');
  }
  if (data.rankedIdeaDetails) {
    await fs.writeFile(path.join(dir, 'ranked-ideas.json'), JSON.stringify(data.rankedIdeaDetails, null, 2) + '\n', 'utf8');
  }
  if (data.killedIdeaDetails) {
    await fs.writeFile(path.join(dir, 'killed-ideas.json'), JSON.stringify(data.killedIdeaDetails, null, 2) + '\n', 'utf8');
  }
  if (data.finalSynthesis) {
    await fs.writeFile(path.join(dir, 'final-synthesis.txt'), data.finalSynthesis + '\n', 'utf8');
  }
  if (data.stageLifecycle) {
    await fs.writeFile(path.join(dir, 'stage-lifecycle.json'), JSON.stringify(data.stageLifecycle, null, 2) + '\n', 'utf8');
  }
}

async function processRun(id: string, payload: WorkflowPayload): Promise<void> {
  const dir = runDir(id);
  const failures: string[] = [];
  let stageLifecycle: Record<string, StageLifecycleEntry> = {};
  const roleOutputs: Record<string, unknown> = {};

  await updateRun(id, { status: 'running' });

  const generator = await executeStage({
    runId: id,
    stage: 'generator',
    prompt: buildGeneratorPrompt(payload),
    artifactDir: dir,
    retries: 1,
    timeoutSeconds: 120,
  });
  stageLifecycle = nextLifecycle(stageLifecycle, 'generator', {
    status: generator.ok ? 'completed' : 'failed',
    startedAt: generator.startedAt,
    endedAt: generator.endedAt,
    error: generator.error,
  });
  roleOutputs.generator = { runtime: generator };
  await updateRun(id, { status: 'running', stageLifecycle, roleOutputs });

  let generatedIdeas: GeneratedIdea[] = [];
  try {
    generatedIdeas = parseGeneratedIdeas(generator.text, payload);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  if (!generator.ok || generatedIdeas.length === 0) {
    failures.push(generator.error ?? 'generator failed');
    await updateRun(id, {
      status: 'failed',
      stageLifecycle,
      roleOutputs,
      failures,
      finalSynthesis: 'Generator stage failed before live candidate ideas could be produced.',
    });
    return;
  }

  await persistStructuredArtifacts(dir, { generatedIdeas, stageLifecycle });
  roleOutputs.generator = { runtime: generator, candidates: generatedIdeas };
  await updateRun(id, { stageLifecycle, roleOutputs });

  const reviewerStages = payload.mode === 'simple' ? ['skeptic'] : ['skeptic', 'operator', 'growth', 'finance'];
  await ensureDir(path.join(dir, 'reviewer'));
  const reviewerResults: ReviewerRecord[] = [];

  for (const stage of reviewerStages) {
    stageLifecycle = nextLifecycle(stageLifecycle, stage, { status: 'running', startedAt: new Date().toISOString() });
    await updateRun(id, { status: 'running', stageLifecycle, roleOutputs, failures });

    const runtime = await executeStage({
      runId: id,
      stage,
      prompt: buildReviewerPrompt(stage, generatedIdeas, payload),
      artifactDir: dir,
      retries: 1,
      timeoutSeconds: 120,
    });

    if (!runtime.ok) {
      failures.push(runtime.error ?? `${stage} failed`);
      stageLifecycle = nextLifecycle(stageLifecycle, stage, {
        status: 'failed',
        startedAt: runtime.startedAt,
        endedAt: runtime.endedAt,
        error: runtime.error,
      });
      roleOutputs[stage] = { runtime };
      await updateRun(id, { status: 'running', stageLifecycle, roleOutputs, failures });
      continue;
    }

    try {
      const records = parseReviewerRecords(runtime.text, stage);
      reviewerResults.push(...records);
      for (const record of records) {
        await fs.writeFile(path.join(dir, 'reviewer', `${stage}-${record.idea_id}.json`), JSON.stringify(record, null, 2) + '\n', 'utf8');
      }
      roleOutputs[stage] = { runtime, records };
      stageLifecycle = nextLifecycle(stageLifecycle, stage, {
        status: 'completed',
        startedAt: runtime.startedAt,
        endedAt: runtime.endedAt,
      });
      await updateRun(id, { status: 'running', stageLifecycle, roleOutputs, failures });
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      roleOutputs[stage] = { runtime };
      stageLifecycle = nextLifecycle(stageLifecycle, stage, {
        status: 'failed',
        startedAt: runtime.startedAt,
        endedAt: runtime.endedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      await updateRun(id, { status: 'running', stageLifecycle, roleOutputs, failures });
    }
  }

  await execFileAsync('python3', [RUNNER, 'aggregate', '--run', dir]);
  const aggregation = JSON.parse(await fs.readFile(path.join(dir, 'aggregation.json'), 'utf8'));

  stageLifecycle = nextLifecycle(stageLifecycle, 'orchestrator', { status: 'running', startedAt: new Date().toISOString() });
  await updateRun(id, { status: 'running', stageLifecycle, roleOutputs, failures, aggregation });

  const orchestratorRuntime = await executeStage({
    runId: id,
    stage: 'orchestrator',
    prompt: buildOrchestratorPrompt(generatedIdeas, reviewerResults, aggregation, payload),
    artifactDir: dir,
    retries: 1,
    timeoutSeconds: 120,
  });

  let orchestrator: OrchestratorResult = { ranked_shortlist: [], killed_ideas: [], notes: '' };
  if (orchestratorRuntime.ok) {
    try {
      orchestrator = parseOrchestratorResult(orchestratorRuntime.text);
      stageLifecycle = nextLifecycle(stageLifecycle, 'orchestrator', {
        status: 'completed',
        startedAt: orchestratorRuntime.startedAt,
        endedAt: orchestratorRuntime.endedAt,
      });
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      stageLifecycle = nextLifecycle(stageLifecycle, 'orchestrator', {
        status: 'failed',
        startedAt: orchestratorRuntime.startedAt,
        endedAt: orchestratorRuntime.endedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    failures.push(orchestratorRuntime.error ?? 'orchestrator failed');
    stageLifecycle = nextLifecycle(stageLifecycle, 'orchestrator', {
      status: 'failed',
      startedAt: orchestratorRuntime.startedAt,
      endedAt: orchestratorRuntime.endedAt,
      error: orchestratorRuntime.error,
    });
  }
  roleOutputs.orchestrator = { runtime: orchestratorRuntime, result: orchestrator };

  const reviewRollups = rollupReviews(reviewerResults);
  const rankedIdeaDetails = buildRankedIdeaDetails(generatedIdeas, aggregation, reviewRollups, orchestrator);
  const killedIdeaDetails = buildKilledIdeaDetails(generatedIdeas, orchestrator);
  const finalSynthesis =
    orchestrator.notes ||
    'Run completed with live generator, reviewer, and orchestrator stages routed through OpenClaw agent execution.';

  await persistStructuredArtifacts(dir, {
    generatedIdeas,
    reviewerResults,
    reviewRollups,
    aggregation,
    orchestrator,
    rankedIdeaDetails,
    killedIdeaDetails,
    finalSynthesis,
    stageLifecycle,
  });

  await updateRun(id, {
    status: failures.length > 0 ? 'failed' : 'completed',
    stageLifecycle,
    aggregation,
    topIdeas: rankedIdeaDetails.map((idea) => idea.id),
    killedIdeas: killedIdeaDetails.map((idea) => idea.id),
    rankedIdeaDetails,
    killedIdeaDetails,
    roleOutputs,
    failures,
    finalSynthesis,
  });
}

export async function createRun(payload: WorkflowPayload): Promise<WorkflowRunDetail> {
  const id = makeId();
  const title = payload.topic;
  const detail: WorkflowRunDetail = {
    id,
    title,
    status: 'queued',
    mode: payload.mode,
    payload,
    topIdeas: [],
    killedIdeas: [],
    stageStatus: {},
    stageLifecycle: {
      generator: { status: 'queued' },
      ...(payload.mode === 'simple'
        ? { skeptic: { status: 'queued' }, orchestrator: { status: 'queued' } }
        : {
            skeptic: { status: 'queued' },
            operator: { status: 'queued' },
            growth: { status: 'queued' },
            finance: { status: 'queued' },
            orchestrator: { status: 'queued' },
          }),
    },
    roleOutputs: {},
    failures: [],
  };
  await saveRun(detail);

  const dir = runDir(id);
  await ensureDir(dir);
  const payloadFile = path.join(dir, 'payload.json');
  await fs.writeFile(payloadFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  await execFileAsync('python3', [RUNNER, 'init-run', '--payload', payloadFile, '--out', dir]);

  void processRun(id, payload);
  return detail;
}

export async function getRunDetail(id: string) {
  return getRun(id);
}

export async function listRunSummaries() {
  return listRuns();
}

export async function rerun(id: string) {
  const existing = await getRun(id);
  if (!existing?.payload) return null;
  return createRun(existing.payload);
}
