export type WorkflowMode = 'simple' | 'full' | 'custom';

export interface WorkflowPayload {
  topic: string;
  idea_count: number;
  mode: WorkflowMode;
  preset: 'fast-cash' | 'solo-founder' | 'venture-scale' | 'custom';
  optimize_for?: string;
  constraints: string[];
  business_model?: string;
  agent_role?: 'core-engine' | 'service-layer' | 'internal-advantage';
}

export interface WorkflowRunSummary {
  id: string;
  title: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  mode: WorkflowMode;
}

export interface IdeaReviewRollup {
  verdicts: string[];
  strongestFor: string[];
  strongestAgainst: string[];
  requiredConditions: string[];
  recommendedNextSteps: string[];
  roleScores: Record<string, Record<string, number>>;
}

export interface RankedIdeaDetail {
  id: string;
  name: string;
  description: string;
  weightedScore?: number;
  verdicts?: string[];
  whyItCouldWork?: string[];
  keyRisks?: string[];
  requiredConditions?: string[];
  nextSteps?: string[];
  scoreBreakdown?: Record<string, Record<string, number>>;
}

export interface KilledIdeaDetail {
  id: string;
  name: string;
  description: string;
  reason: string;
}

export interface StageLifecycleEntry {
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  endedAt?: string;
  error?: string;
}

export interface WorkflowRunDetail extends WorkflowRunSummary {
  topIdeas: string[];
  killedIdeas: string[];
  payload?: WorkflowPayload;
  stageStatus?: Record<string, string>;
  stageLifecycle?: Record<string, StageLifecycleEntry>;
  roleOutputs?: Record<string, unknown>;
  aggregation?: Record<string, unknown>;
  finalSynthesis?: string | Record<string, unknown> | string[];
  failures?: string[];
  rankedIdeaDetails?: RankedIdeaDetail[];
  killedIdeaDetails?: KilledIdeaDetail[];
}
