import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface StageExecutionRequest {
  runId: string;
  stage: string;
  prompt: string;
  timeoutSeconds?: number;
  retries?: number;
  artifactDir?: string;
}

export interface StageExecutionResult {
  ok: boolean;
  stage: string;
  sessionId: string;
  startedAt: string;
  endedAt: string;
  attempts: number;
  model?: string;
  provider?: string;
  text?: string;
  error?: string;
  raw?: unknown;
}

function makeSessionId(runId: string, stage: string) {
  const safeRun = runId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const safeStage = stage.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `business-rd-${safeRun}-${safeStage}`;
}

async function persistArtifact(dir: string | undefined, stage: string, data: unknown) {
  if (!dir) return;
  await fs.mkdir(dir, { recursive: true });
  const out = path.join(dir, `${stage}-runtime.json`);
  await fs.writeFile(out, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function executeStage(request: StageExecutionRequest): Promise<StageExecutionResult> {
  const sessionId = makeSessionId(request.runId, request.stage);
  const retries = request.retries ?? Number(process.env.OPENCLAW_STAGE_RETRIES ?? '1');
  let attempts = 0;
  let lastError = 'unknown';
  const startedAt = new Date().toISOString();

  while (attempts <= retries) {
    attempts += 1;
    try {
      const timeoutSeconds = request.timeoutSeconds ?? Number(process.env.OPENCLAW_STAGE_TIMEOUT_SECONDS ?? '120');
      const { stdout } = await execFileAsync('openclaw', [
        'agent',
        '--json',
        '--session-id',
        sessionId,
        '--message',
        request.prompt,
        '--timeout',
        String(timeoutSeconds),
      ]);
      const parsed = JSON.parse(stdout);
      const result: StageExecutionResult = {
        ok: parsed.status === 'ok',
        stage: request.stage,
        sessionId,
        startedAt,
        endedAt: new Date().toISOString(),
        attempts,
        provider: parsed.result?.meta?.agentMeta?.provider,
        model: parsed.result?.meta?.agentMeta?.model,
        text: parsed.result?.payloads?.[0]?.text,
        raw: parsed,
      };
      await persistArtifact(request.artifactDir, request.stage, result);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempts > retries) break;
    }
  }

  const failed: StageExecutionResult = {
    ok: false,
    stage: request.stage,
    sessionId,
    startedAt,
    endedAt: new Date().toISOString(),
    attempts,
    error: lastError,
  };
  await persistArtifact(request.artifactDir, request.stage, failed);
  return failed;
}
