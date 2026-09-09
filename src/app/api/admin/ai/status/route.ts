import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  probeOllama,
  hasOpenRouterKey,
  hasOllamaKey,
  minRetryAfter,
} from "@/lib/ai";
import { getAiRuntimeConfig, invalidateAiConfigCache, DEFAULT_AI_CONFIG } from "@/lib/ai-runtime";

export const dynamic = "force-dynamic";

/**
 * حالة الذكاء الاصطناعي الحيّة للمشرف:
 * - فحص شامل لخادم Ollama (محلي أو بعيد): وصول، زمن استجابة، موديلات مثبتة.
 * - هل مفتاح OpenRouter موجود؟ هل خادم Ollama محمي بمفتاح؟
 * - مدة تهدئة قاطع الدائرة (rate limit) إن وجدت.
 * - الإعدادات الفعّالة حالياً (بعد دمج لوحة التحكم مع بيئة النشر).
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // قراءة جديدة دائماً عند فتح اللوحة (تجاهل الكاش)
  invalidateAiConfigCache();
  const runtime = await getAiRuntimeConfig();

  const ollama = await probeOllama({ noCache: true });
  const openrouterKeyPresent = hasOpenRouterKey();

  // تحذيرات ذكية للمشرف
  const warnings: string[] = [];
  if (!ollama.reachable && !openrouterKeyPresent) {
    warnings.push("no-provider");
  }
  if (runtime.ollamaBaseUrl && !hasOllamaKey()) {
    warnings.push("remote-ollama-unprotected");
  }

  return NextResponse.json({
    // حقول مسطّحة متوافقة مع الواجهة القديمة
    ollamaReachable: ollama.reachable,
    openrouterKeyPresent,
    cooldownSeconds: minRetryAfter(),
    runtime,
    defaults: DEFAULT_AI_CONFIG,
    // تفاصيل إضافية
    ollama: {
      reachable: ollama.reachable,
      latencyMs: ollama.latencyMs,
      models: ollama.models.slice(0, 20),
      baseUrl: ollama.baseUrl,
      error: ollama.error ?? null,
      remote: !!runtime.ollamaBaseUrl,
      protectedBykey: hasOllamaKey(),
    },
    warnings,
  });
}
