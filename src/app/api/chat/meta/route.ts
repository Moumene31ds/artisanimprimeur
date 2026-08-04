import { NextResponse } from 'next/server';
import { resolveModel, isOllamaReachable, hasOpenRouterKey, AIUnavailableError } from '@/lib/ai';

export const maxDuration = 5;
export const dynamic = 'force-dynamic';

const PROVIDER_LABELS: Record<string, { fr: string; ar: string }> = {
  ollama: { fr: 'IA locale (Ollama)', ar: 'ذكاء اصطناعي محلي (Ollama)' },
  openrouter: { fr: 'IA cloud gratuite (OpenRouter)', ar: 'ذكاء اصطناعي سحابي مجاني (OpenRouter)' },
};

export async function GET() {
  try {
    const { providerName, modelId } = await resolveModel(false);
    return NextResponse.json({
      available: true,
      provider: providerName,
      model: modelId,
      label: PROVIDER_LABELS[providerName] ?? { fr: providerName, ar: providerName },
      ollamaReachable: await isOllamaReachable(),
      hasOpenRouter: hasOpenRouterKey(),
    });
  } catch (e) {
    if (e instanceof AIUnavailableError) {
      return NextResponse.json(
        { available: false, message: e.message, retryAfterSeconds: e.retryAfterSeconds },
        { status: 503, headers: { 'Retry-After': String(e.retryAfterSeconds) } }
      );
    }
    return NextResponse.json({ available: false, message: String((e as any)?.message ?? e) }, { status: 500 });
  }
}
