import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Business R&amp;D Dashboard</h1>
      <p>Starter app shell for the AI-agent-driven online business workflow.</p>
      <p>
        <Link href="/workflows/business-rd" style={{ color: '#93c5fd' }}>
          Open workflow surface
        </Link>
      </p>
    </main>
  );
}
