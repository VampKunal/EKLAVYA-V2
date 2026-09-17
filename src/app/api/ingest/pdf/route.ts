import { NextResponse } from 'next/server';

const FASTAPI_URL = process.env.FASTAPI_AGENT_URL || 'http://localhost:8000';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const response = await fetch(`${FASTAPI_URL}/api/v1/ingest/pdf`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'PDF ingestion failed', details: error.message },
      { status: 500 }
    );
  }
}
