// src/app/api/marketing/insights/route.ts
// توليد رؤى تسويقية/تحسين أوصاف عبر AI. متاح للزوار (يستخدمه استوديو التصميم)
// لكن مع سقف صارم: حد معدل لكل IP + طول محدود للمُدخل + عدد رموز مخرجات محدود
// لمنع استنزاف حصة AI.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateTextWithFallback, AIUnavailableError } from "@/lib/ai";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";
import { fail } from "@/lib/security/api-error";

// 10 طلبات في الساعة لكل IP — كافٍ للاستخدام البشري ويمنع الاستنزاف.
const limiter = new SlidingWindowRateLimiter(60 * 60 * 1000, 10);

const insightSchema = z.object({
  prompt: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-client-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rl = limiter.allow(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfterSeconds: Math.ceil(rl.retryAfterMs / 1000) },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const parsed = insightSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", fields: parsed.error.issues.map((i) => i.path.join(".")) },
        { status: 400 }
      );
    }
    const prompt = parsed.data.prompt;

    const result = await generateTextWithFallback({
      prompt,
      temperature: 0.7,
    });
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
    return fail(error);
  }
}
