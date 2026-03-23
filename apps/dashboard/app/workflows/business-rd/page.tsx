import Link from 'next/link';
import { WorkflowLauncherForm } from '@/src/components/workflow-launcher-form';
import { listRuns } from '@/src/lib/workflow-store';

export default async function BusinessRdPage() {
  const runs = await listRuns();

  return (
    <main style={{ padding: 32, display: 'grid', gap: 24 }}>
      <section>
        <h1>AI-Agent Business R&amp;D</h1>
        <p>Starter workflow surface for launching and reviewing business-idea evaluation runs.</p>
      </section>

      <section style={{ border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
        <h2>Launcher</h2>
        <WorkflowLauncherForm />
      </section>

      <section style={{ border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
        <h2>Run History</h2>
        <ul>
          {runs.map((run) => (
            <li key={run.id}>
              <Link href={`/workflows/business-rd/runs/${run.id}`} style={{ color: '#93c5fd' }}>
                {run.title}
              </Link>{' '}
              — {run.status} ({run.mode})
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
