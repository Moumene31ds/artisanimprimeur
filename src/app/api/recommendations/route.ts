import { NextRequest, NextResponse } from "next/server";
import { fsQuery } from "@/lib/firestore-rest";
import { generateTextWithFallback, recordProviderFailure } from "@/lib/ai";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";

const recommendLimiter = new SlidingWindowRateLimiter(5 * 60 * 1000, 60);

interface CartItemInput {
  id?: string;
  name?: string;
  quantity?: number;
  category?: string;
}

/**
 * POST /api/recommendations
 * AI-powered cross-sell: returns up to 4 product suggestions for the cart.
 *
 * Body: { token?: string, cart: CartItemInput[], lang?: 'ar' | 'fr' }
 *
 * Uses the free AI layer (Ollama → OpenRouter). Falls back to a keyword /
 * category heuristic when no provider is available, so the cart page always
 * has suggestions.
 */
export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (!recommendLimiter.allow(ip).allowed) {
    return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const cart: CartItemInput[] = Array.isArray(body?.cart) ? body.cart : [];
  const lang: "ar" | "fr" = body?.lang === "ar" ? "ar" : "fr";
  if (cart.length === 0) return NextResponse.json({ success: false, error: "Empty cart" }, { status: 400 });

  const token = typeof body?.token === "string" && body.token.length > 0 ? body.token : "public";

  let products: any[] = [];
  try {
    products = await fsQuery(token, {
      from: [{ collectionId: "products" }],
      limit: 50,
    });
  } catch (err) {
    console.error("[recommendations] failed to load products:", err);
  }
  const catalog = (products || []).filter(
    (p: any) => p.active !== false && !!p.name && p.price != null
  );
  if (catalog.length === 0) {
    return NextResponse.json({ success: true, ai: false, recommendations: [], source: "empty" });
  }

  const cartIds = new Set(cart.map((c) => String(c.id)).filter(Boolean));
  const candidates = catalog.filter((p) => !cartIds.has(String(p.id)));

  const inCartText = cart
    .map((c) => `${c.name || c.id}${c.category ? ` (${c.category})` : ""} x${c.quantity || 1}`)
    .join(", ");

  let aiIds: string[] | null = null;
  if (candidates.length > 0) {
    try {
      const sys =
        `You are a smart cross-sell assistant for a print shop (cartes, flyers, affiches, stickers, roll-ups, goodies). ` +
        `Recommend up to 4 products from the provided catalog that complement the customer's cart. ` +
        `Reply with ONLY a JSON array of ids, e.g. ["id1","id2"]. Never repeat an id. ` +
        `No explanations, no markdown.`;
      const user = `Catalogue (id: name — category — price):\n${candidates
        .map((p: any) => `${p.id}: ${p.name} — ${p.category || "?"} — ${p.price} DA`)
        .join("\n")}\n\nPanier: ${inCartText}\n\nIdées recommandées (JSON array):`;

      const result = await generateTextWithFallback({
        system: sys,
        prompt: user,
        temperature: 0.3,
        maxRetries: 1,
      });

      const text = result.text.trim();
      const m = text.match(/\[[\s\S]*\]/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        if (Array.isArray(parsed)) {
          const valid = new Set(candidates.map((p: any) => String(p.id)));
          aiIds = parsed.map(String).filter((id) => valid.has(id)).slice(0, 4);
        }
      }
    } catch (err: any) {
      recordProviderFailure("openrouter", err);
      console.warn("[recommendations] AI failed, using heuristic fallback:", err?.message);
    }
  }

  // Heuristic fallback (keyword/category) — deterministic, no AI needed.
  const keywordMap: Array<[string, string]> = [
    ["carte", "Flyers"],
    ["carte", "Goodies"],
    ["flyer", "Goodies"],
    ["flyer", "Impression"],
    ["affiche", "Goodies"],
    ["sticker", "Flyers"],
    ["invitation", "Flyers"],
  ];
  const score = new Map<string, number>();
  for (const c of cart) {
    const name = (c.name || "").toLowerCase();
    for (const p of candidates) {
      const pName = (p.name || "").toLowerCase();
      let s = 0;
      for (const [kw, cat] of keywordMap) {
        if (name.includes(kw) && (p.category === cat || pName.includes(cat.toLowerCase()))) s += 2;
      }
      if (name && pName && (pName.includes(name.slice(0, 6)) || name.includes(pName.slice(0, 6)))) s += 1;
      score.set(String(p.id), (score.get(String(p.id)) || 0) + s);
    }
  }
  const heuristicIds = [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, s]) => s > 0)
    .map(([id]) => id)
    .slice(0, 4);

  const chosen = aiIds && aiIds.length > 0 ? aiIds : heuristicIds;
  const recs = chosen
    .map((id) => catalog.find((p: any) => String(p.id) === id))
    .filter(Boolean);

  return NextResponse.json({
    success: true,
    ai: !!aiIds && aiIds.length > 0,
    source: aiIds && aiIds.length > 0 ? "ai" : "heuristic",
    recommendations: recs.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image || p.images?.[0] || null,
      category: p.category || null,
    })),
    lang,
  });
}
