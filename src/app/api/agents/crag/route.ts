import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const FASTAPI_URL = process.env.FASTAPI_AGENT_URL || 'http://localhost:8000';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, courseId } = await req.json();

    const res = await fetch(`${FASTAPI_URL}/api/v1/crag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, courseId: courseId || '' }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `CRAG Agent Error: ${errorText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Agents API] CRAG proxy error:', error);
    return NextResponse.json({ error: 'Failed to communicate with CRAG Agent' }, { status: 500 });
  }
}
