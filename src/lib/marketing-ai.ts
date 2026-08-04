import { generateTextWithFallback } from './ai';

export interface MarketingAIInput {
  orders: Array<{ total?: number; status?: string; wilaya?: string }>;
  products: Array<{ name?: string; price?: number }>;
  promoCodes: Array<{ code?: string; active?: boolean }>;
  language?: string;
}

export interface MarketingAIInsight {
  headline: string;
  body: string;
  cta: string;
  focus: string[];
}

function buildFallbackInsight(input: MarketingAIInput): MarketingAIInsight {
  const completedOrders = input.orders.filter(o =>
    o.status === 'Prêt' || o.status === 'Livré' || o.status === 'Terminé'
  );
  const pendingOrders = input.orders.filter(o =>
    o.status === 'En attente' || o.status === 'Conception'
  );
  const topWilaya = input.orders.reduce<Record<string, number>>((acc, o) => {
    const key = o.wilaya || 'Autre';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topRegion = Object.entries(topWilaya).sort((a, b) => b[1] - a[1])[0]?.[0] || 'votre région';
  const topProduct = input.products[0]?.name || 'nos produits premium';
  const activePromo = input.promoCodes.find(p => p.active !== false)?.code || 'PROMO10';
  const revenue = completedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return {
    headline: `Boostez vos ventes grâce à ${topProduct}`,
    body: `Vos clients de ${topRegion} ont généré ${revenue.toLocaleString()} DA de chiffre d'affaires. Lancez une offre ciblée autour de ${topProduct} avec ${activePromo} pour convertir les ${pendingOrders.length} commandes en attente.`,
    cta: 'Commander maintenant',
    focus: [topRegion, topProduct, activePromo],
  };
}

export async function buildMarketingInsight(input: MarketingAIInput): Promise<MarketingAIInsight> {
  try {
    const lang = input.language || 'fr';
    const langInstruction = lang === 'ar'
      ? 'أجب باللغة العربية الفصحى'
      : 'Réponds en français';

    const ordersSummary = input.orders.slice(0, 20).map(o =>
      `${o.status || 'inconnu'} - ${o.total || 0} DA - ${o.wilaya || 'N/A'}`
    ).join('\n');

    const productsSummary = input.products.slice(0, 10).map(p =>
      `${p.name || 'produit'} - ${p.price || 0} DA`
    ).join('\n');

    const prompt = `${langInstruction}

Tu es un expert en marketing digital pour une imprimerie en Algérie appelée "L'Artisan Imprimeur".
Analyse les données suivantes et génère une recommandation marketing actionable.

Commandes récentes:
${ordersSummary || 'Aucune commande disponible'}

Produits:
${productsSummary || 'Aucun produit disponible'}

Codes promo: ${input.promoCodes.filter(p => p.active !== false).map(p => p.code).join(', ') || 'Aucun'}

Génère une recommandation marketing avec:
1. Un titre accrocheur (headline)
2. Un corps de recommandation détaillé (body)
3. Un appel à l'action (cta)
4. 3 mots-clés focus

Format JSON:
{
  "headline": "...",
  "body": "...",
  "cta": "...",
  "focus": ["mot1", "mot2", "mot3"]
}`;

    const result = await generateTextWithFallback({ prompt, temperature: 0.7 });
    const text = result.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        headline: parsed.headline || buildFallbackInsight(input).headline,
        body: parsed.body || buildFallbackInsight(input).body,
        cta: parsed.cta || buildFallbackInsight(input).cta,
        focus: Array.isArray(parsed.focus) ? parsed.focus.slice(0, 3) : buildFallbackInsight(input).focus,
      };
    }

    return buildFallbackInsight(input);
  } catch {
    return buildFallbackInsight(input);
  }
}
