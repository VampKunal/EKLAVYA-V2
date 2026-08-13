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

    const { topic, questionText, userAnswer, correctAnswer } = await req.json();

    const res = await fetch(`${FASTAPI_URL}/api/v1/quiz/remediate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, questionText, userAnswer, correctAnswer }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `Remediation Agent Error: ${errorText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Agents API] Quiz remediation proxy error:', error);
    return NextResponse.json({ error: 'Failed to communicate with Remediation Agent' }, { status: 500 });
  }
}
