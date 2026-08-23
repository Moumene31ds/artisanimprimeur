import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  isOllamaReachable,
  hasOpenRouterKey,
  minRetryAfter,
} from "@/lib/ai";
import { getAiRuntimeConfig, invalidateAiConfigCache, DEFAULT_AI_CONFIG } from "@/lib/ai-runtime";

export const dynamic = "force-dynamic";

/**
 * حالة الذكاء الاصطناعي الحيّة للمشرف:
 * - هل Ollama متصل؟ هل مفتاح OpenRouter موجود؟
 * - مدة تهدئة قاطع الدائرة (rate limit) إن وجدت.
 * - الإعدادات الفعّالة حالياً (بعد دمج لوحة التحكم مع بيئة النشر).
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // قراءة جديدة دائماً عند فتح اللوحة (تجاهل الكاش)
  invalidateAiConfigCache();
  const runtime = await getAiRuntimeConfig();

  let ollamaReachable = false;
  try {
    ollamaReachable = await isOllamaReachable();
  } catch {
    ollamaReachable = false;
  }

  return NextResponse.json({
    ollamaReachable,
    openrouterKeyPresent: hasOpenRouterKey(),
    cooldownSeconds: minRetryAfter(),
    runtime,
    defaults: DEFAULT_AI_CONFIG,
  });
}
