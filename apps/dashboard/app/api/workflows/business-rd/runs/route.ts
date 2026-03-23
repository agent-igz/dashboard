import { NextResponse } from 'next/server';
import type { WorkflowPayload } from '@/src/lib/types';
import { createRun, listRunSummaries } from '@/src/lib/run-service';

export async function GET() {
  const runs = await listRunSummaries();
  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as WorkflowPayload;
  const run = await createRun(payload);
  return NextResponse.json({ run }, { status: 201 });
}
