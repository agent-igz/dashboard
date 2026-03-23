import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Partial stage reruns are not implemented yet. This route is a documented MVP stub.' },
    { status: 501 },
  );
}
