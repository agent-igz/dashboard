'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const templates = {
  'solo-founder': {
    topic: 'AI-agent-driven online businesses for solo founders',
    idea_count: 3,
    mode: 'simple',
    preset: 'solo-founder',
    optimize_for: 'first $1k MRR',
    constraints: 'solo founder\nonline only',
    business_model: 'productized service',
    agent_role: 'core-engine',
  },
  'venture-scale': {
    topic: 'AI-agent-native businesses with venture-scale potential',
    idea_count: 5,
    mode: 'full',
    preset: 'venture-scale',
    optimize_for: 'large market and defensibility',
    constraints: 'online only\nagent-native wedge',
    business_model: 'software',
    agent_role: 'core-engine',
  },
};

export function WorkflowLauncherForm() {
  const router = useRouter();
  const search = useSearchParams();
  const seed = {
    topic: search.get('topic') ?? templates['solo-founder'].topic,
    idea_count: Number(search.get('idea_count') ?? templates['solo-founder'].idea_count),
    mode: search.get('mode') ?? templates['solo-founder'].mode,
    preset: search.get('preset') ?? templates['solo-founder'].preset,
    optimize_for: search.get('optimize_for') ?? templates['solo-founder'].optimize_for,
    constraints: search.get('constraints') ?? templates['solo-founder'].constraints,
    business_model: search.get('business_model') ?? templates['solo-founder'].business_model,
    agent_role: search.get('agent_role') ?? templates['solo-founder'].agent_role,
  };
  const [form, setForm] = useState(seed);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!form.topic.trim()) throw new Error('Topic is required');
      const payload = {
        topic: form.topic.trim(),
        idea_count: Number(form.idea_count),
        mode: form.mode as 'simple' | 'full' | 'custom',
        preset: form.preset as 'fast-cash' | 'solo-founder' | 'venture-scale' | 'custom',
        optimize_for: form.optimize_for.trim(),
        constraints: form.constraints
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean),
        business_model: form.business_model,
        agent_role: form.agent_role as 'core-engine' | 'service-layer' | 'internal-advantage',
      };
      const res = await fetch('/api/workflows/business-rd/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create run');
      const json = await res.json();
      router.push(`/workflows/business-rd/runs/${json.run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
      <label>
        Template
        <select
          defaultValue=""
          onChange={(e) => {
            const key = e.target.value as keyof typeof templates;
            if (templates[key]) setForm(templates[key]);
          }}
        >
          <option value="">Custom current values</option>
          <option value="solo-founder">solo-founder</option>
          <option value="venture-scale">venture-scale</option>
        </select>
      </label>

      <label>
        Topic
        <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} style={{ display: 'block', width: '100%' }} />
      </label>

      <label>
        Mode
        <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
          <option value="simple">simple</option>
          <option value="full">full</option>
          <option value="custom">custom</option>
        </select>
      </label>

      <label>
        Preset
        <select value={form.preset} onChange={(e) => setForm({ ...form, preset: e.target.value })}>
          <option value="fast-cash">fast-cash</option>
          <option value="solo-founder">solo-founder</option>
          <option value="venture-scale">venture-scale</option>
          <option value="custom">custom</option>
        </select>
      </label>

      <label>
        Idea count
        <input type="number" min={1} max={10} value={form.idea_count} onChange={(e) => setForm({ ...form, idea_count: Number(e.target.value) })} />
      </label>

      <label>
        Optimize for
        <input value={form.optimize_for} onChange={(e) => setForm({ ...form, optimize_for: e.target.value })} style={{ display: 'block', width: '100%' }} />
      </label>

      <label>
        Business model
        <input value={form.business_model} onChange={(e) => setForm({ ...form, business_model: e.target.value })} style={{ display: 'block', width: '100%' }} />
      </label>

      <label>
        Agent role
        <select value={form.agent_role} onChange={(e) => setForm({ ...form, agent_role: e.target.value })}>
          <option value="core-engine">core-engine</option>
          <option value="service-layer">service-layer</option>
          <option value="internal-advantage">internal-advantage</option>
        </select>
      </label>

      <label>
        Constraints (one per line)
        <textarea value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} rows={4} style={{ display: 'block', width: '100%' }} />
      </label>

      {error ? <p style={{ color: '#fca5a5' }}>{error}</p> : null}

      <button type="submit" disabled={submitting} style={{ width: 'fit-content' }}>
        {submitting ? 'Starting…' : 'Start workflow run'}
      </button>
    </form>
  );
}
