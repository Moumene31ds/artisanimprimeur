import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  generateTextWithFallback,
  AIUnavailableError,
} from "@/lib/ai";
import { getAiRuntimeConfig } from "@/lib/ai-runtime";
import { buildChatSystemPrompt, detectUserLanguage } from "@/lib/chat-knowledge";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * ملعب التجربة: يرسل رسالة اختبار عبر نفس سلسلة المزوّدين ونفس إعدادات
 * المشرف الحيّة (شخصية، أسلوب، درجة إبداع) ويرجع النص مع هوية الموفر والمدة.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let prompt = "";
  try {
    const body = await request.json();
    prompt = String(body?.prompt ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!prompt) return NextResponse.json({ error: "Prompt requis." }, { status: 400 });
  if (prompt.length > 2000)
    return NextResponse.json({ error: "Message trop long (max 2000 caractères)." }, { status: 400 });

  const rt = await getAiRuntimeConfig();
  const startedAt = Date.now();
  try {
    const result = await generateTextWithFallback({
      system: buildChatSystemPrompt({
        detectedUserLang: rt.languagePolicy === 'auto' ? detectUserLanguage(prompt) : null,
        admin: {
          personality: rt.personality,
          customStyle: rt.customStyle,
          extraInstructions: rt.extraInstructions,
          lengthPref: rt.lengthPref,
          languagePolicy: rt.languagePolicy,
          ordersEnabled: rt.enabledOrders,
        },
      }),
      messages: [{ role: "user", content: prompt }],
      temperature: rt.temperature,
    });

    return NextResponse.json({
      success: true,
      text: result.text,
      latencyMs: Date.now() - startedAt,
      usage: result.usage
        ? {
            inputTokens: result.usage.inputTokens ?? null,
            outputTokens: result.usage.outputTokens ?? null,
          }
        : null,
    });
  } catch (error: any) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json(
        {
          error:
            "Tous les fournisseurs IA sont saturés pour le moment. Réessayez dans quelques minutes.",
          retryAfterSeconds: error.retryAfterSeconds,
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Échec de la génération." },
      { status: 500 }
    );
  }
}
