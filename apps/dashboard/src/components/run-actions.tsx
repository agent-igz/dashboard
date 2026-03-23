'use client';

import { useRouter } from 'next/navigation';
import type { WorkflowPayload } from '@/src/lib/types';

export function RunActions({ id, payload }: { id: string; payload?: WorkflowPayload }) {
  const router = useRouter();

  async function rerunWhole() {
    const res = await fetch(`/api/workflows/business-rd/runs/${id}/rerun`, { method: 'POST' });
    if (!res.ok) return;
    const json = await res.json();
    router.push(`/workflows/business-rd/runs/${json.run.id}`);
  }

  function duplicateToLauncher() {
    const query = new URLSearchParams({
      topic: payload?.topic ?? '',
      idea_count: String(payload?.idea_count ?? 3),
      mode: payload?.mode ?? 'simple',
      preset: payload?.preset ?? 'solo-founder',
      optimize_for: payload?.optimize_for ?? '',
      constraints: (payload?.constraints ?? []).join('\n'),
      business_model: payload?.business_model ?? '',
      agent_role: payload?.agent_role ?? 'core-engine',
    });
    router.push(`/workflows/business-rd?${query.toString()}`);
  }

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <button onClick={rerunWhole}>Rerun workflow</button>
      <button onClick={duplicateToLauncher}>Duplicate into launcher</button>
      <button disabled title="Stub for future partial reruns">Rerun stage (coming soon)</button>
    </div>
  );
}
