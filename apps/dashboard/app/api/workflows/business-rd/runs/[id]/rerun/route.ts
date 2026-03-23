import { NextResponse } from 'next/server';
import { rerun } from '@/src/lib/run-service';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await rerun(id);
  if (!run) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ run }, { status: 201 });
}
