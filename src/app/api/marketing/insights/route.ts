import { NextResponse } from 'next/server';
import { generateTextWithFallback, AIUnavailableError } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = body.prompt || 'Generate a smart marketing recommendation for a print shop';

    const result = await generateTextWithFallback({ prompt, temperature: 0.7 });
    return NextResponse.json({ insight: result.text });
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json(
        {
          error: 'AI capacity exceeded. Please retry in a few minutes.',
          retryAfterSeconds: error.retryAfterSeconds,
        },
        {
          status: 503,
          headers: { 'Retry-After': String(error.retryAfterSeconds) },
        }
      );
    }
    console.error('Marketing AI error', error);
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 });
  }
}
