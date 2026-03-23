import { notFound } from 'next/navigation';
import { RunActions } from '@/src/components/run-actions';
import { getRun } from '@/src/lib/workflow-store';

export const revalidate = 2;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid #334155', borderRadius: 12, padding: 20 }}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function renderSynthesis(value: unknown): React.ReactNode {
  if (!value) return 'No synthesis yet.';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return <ul>{value.map((item, idx) => <li key={`${idx}-${String(item)}`}>{String(item)}</li>)}</ul>;
  }
  if (typeof value === 'object') {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {Object.entries(value as Record<string, unknown>).map(([key, entry]) => (
          <div key={key}>
            <strong>{key.replace(/_/g, ' ')}:</strong>{' '}
            {Array.isArray(entry)
              ? <ul>{entry.map((item, idx) => <li key={`${key}-${idx}`}>{String(item)}</li>)}</ul>
              : String(entry)}
          </div>
        ))}
      </div>
    );
  }
  return String(value);
}

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);

  if (!run) notFound();

  const generatedIdeas = Array.isArray((run.roleOutputs as { generator?: { candidates?: unknown[] } } | undefined)?.generator?.candidates)
    ? ((run.roleOutputs as { generator?: { candidates?: Array<Record<string, unknown>> } }).generator?.candidates ?? [])
    : [];
  const reviewerSummary =
    ((run.roleOutputs as { reviewerSummary?: Record<string, Record<string, unknown>> } | undefined)?.reviewerSummary as Record<string, Record<string, unknown>> | undefined) ??
    {};

  return (
    <main style={{ padding: 32, display: 'grid', gap: 20 }}>
      <header>
        <h1>{run.title}</h1>
        <p>Status: <strong>{run.status}</strong></p>
        <p>Mode: {run.mode}</p>
        <RunActions id={run.id} payload={run.payload} />
      </header>

      <Section title="Stage Progress">
        <ul>
          {Object.entries(run.stageLifecycle ?? {}).map(([stage, meta]) => (
            <li key={stage}>
              <strong>{stage}</strong>: {meta.status}
              {meta.error ? ` — ${meta.error}` : ''}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Generated Ideas">
        <div style={{ display: 'grid', gap: 16 }}>
          {generatedIdeas.map((idea) => (
            <article key={String(idea.idea_id)} style={{ border: '1px solid #475569', borderRadius: 10, padding: 16 }}>
              <h3>{String(idea.name ?? idea.idea_id)}</h3>
              <p>{String(idea.summary ?? '')}</p>
              <ul>
                <li><strong>Target customer:</strong> {String(idea.target_customer ?? '')}</li>
                <li><strong>Pain:</strong> {String(idea.pain_point ?? '')}</li>
                <li><strong>Delivery:</strong> {String(idea.delivery_model ?? '')}</li>
                <li><strong>Pricing hint:</strong> {String(idea.pricing_hint ?? '')}</li>
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Ranked Shortlist">
        <div style={{ display: 'grid', gap: 16 }}>
          {run.rankedIdeaDetails?.map((idea) => (
            <article key={idea.id} style={{ border: '1px solid #475569', borderRadius: 10, padding: 16 }}>
              <h3>{idea.name}</h3>
              <p>{idea.description}</p>
              <p><strong>Weighted score:</strong> {idea.weightedScore ?? 'n/a'}</p>
              {idea.whyItCouldWork?.length ? (
                <>
                  <h4>Why it advanced</h4>
                  <ul>{idea.whyItCouldWork.map((x) => <li key={x}>{x}</li>)}</ul>
                </>
              ) : null}
              {idea.keyRisks?.length ? (
                <>
                  <h4>Key risks</h4>
                  <ul>{idea.keyRisks.map((x) => <li key={x}>{x}</li>)}</ul>
                </>
              ) : null}
            </article>
          ))}
        </div>
      </Section>

      <Section title="Killed Ideas">
        <div style={{ display: 'grid', gap: 16 }}>
          {run.killedIdeaDetails?.map((idea) => (
            <article key={idea.id} style={{ border: '1px solid #7f1d1d', borderRadius: 10, padding: 16 }}>
              <h3>{idea.name}</h3>
              <p>{idea.description}</p>
              <p><strong>Why it was killed:</strong> {idea.reason}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Reviewer Evidence">
        <div style={{ display: 'grid', gap: 12 }}>
          {Object.entries(reviewerSummary).map(([ideaId, rollup]) => (
            <article key={ideaId} style={{ border: '1px solid #475569', borderRadius: 10, padding: 16 }}>
              <h3>{ideaId}</h3>
              <p><strong>Verdicts:</strong> {Array.isArray(rollup.verdicts) ? rollup.verdicts.join(', ') : 'n/a'}</p>
              <p><strong>Why it could work:</strong> {Array.isArray(rollup.strongestFor) ? rollup.strongestFor.join(' | ') : 'n/a'}</p>
              <p><strong>Main concerns:</strong> {Array.isArray(rollup.strongestAgainst) ? rollup.strongestAgainst.join(' | ') : 'n/a'}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Final Synthesis">
        {renderSynthesis(run.finalSynthesis)}
      </Section>

      <Section title="Raw Debug Data">
        <details>
          <summary>Show raw role outputs / aggregation / payload</summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ roleOutputs: run.roleOutputs, aggregation: run.aggregation, payload: run.payload, failures: run.failures }, null, 2)}</pre>
        </details>
      </Section>
    </main>
  );
}
