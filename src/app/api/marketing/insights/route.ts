import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_API_KEY missing' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const prompt = body.prompt || 'Generate a smart marketing recommendation for a print shop';
    const google = createGoogleGenerativeAI({ apiKey });

    let lastError: any;
    for (const modelName of GEMINI_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await generateText({ model: google(modelName), prompt, temperature: 0.7 });
          return NextResponse.json({ insight: result.text });
        } catch (err: any) {
          lastError = err;
          const isOverloaded = err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE') || err?.message?.includes('429');
          if (isOverloaded && attempt < 2) {
            await new Promise(r => setTimeout(r, 2000));
          } else if (isOverloaded) {
            break;
          } else {
            throw err;
          }
        }
      }
    }
    throw lastError;
  } catch (error) {
    console.error('Marketing AI error', error);
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 });
  }
}
