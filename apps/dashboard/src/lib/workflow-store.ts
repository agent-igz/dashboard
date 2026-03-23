import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { WorkflowRunDetail, WorkflowRunSummary } from '@/src/lib/types';

const DATA_DIR = path.join(process.cwd(), '.data', 'business-rd-runs');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function runPath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

export async function listRuns(): Promise<WorkflowRunSummary[]> {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR);
  const runs = await Promise.all(
    files.filter((f) => f.endsWith('.json')).map(async (file) => {
      const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
      const run = JSON.parse(raw) as WorkflowRunDetail;
      return {
        id: run.id,
        title: run.title,
        status: run.status,
        mode: run.mode,
      } satisfies WorkflowRunSummary;
    }),
  );
  return runs.sort((a, b) => a.id.localeCompare(b.id));
}

export async function getRun(id: string): Promise<WorkflowRunDetail | null> {
  await ensureDir();
  try {
    const raw = await fs.readFile(runPath(id), 'utf8');
    return JSON.parse(raw) as WorkflowRunDetail;
  } catch {
    return null;
  }
}

export async function saveRun(run: WorkflowRunDetail): Promise<void> {
  await ensureDir();
  await fs.writeFile(runPath(run.id), JSON.stringify(run, null, 2) + '\n', 'utf8');
}
