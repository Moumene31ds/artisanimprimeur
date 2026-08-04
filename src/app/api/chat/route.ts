import { NextResponse } from 'next/server';
import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import {
  resolveModel,
  AIUnavailableError,
  recordProviderFailure,
  recordProviderSuccess,
  NO_PROVIDER_MESSAGE,
} from '@/lib/ai';
import {
  buildChatSystemPrompt,
  computePrice,
  resolveWilaya,
  deliveryTimeFor,
  lookupPromo,
} from '@/lib/chat-knowledge';
import { getCatalogProducts } from '@/lib/catalog';

export const maxDuration = 60;

const PRODUCT_KEYS = ['cartes', 'flyers', 'stickers', 'affiches', 'invitations'] as const;

export async function POST(req: Request) {
  let messages: any[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is empty or invalid.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const toolsDef = {
      calculatePrice: tool({
        description:
          'Calculate the exact print price (DZD) for any product and quantity, with finish and quantity discounts. Always prefer this over guessing.',
        inputSchema: z.object({
          productKey: z
            .enum(PRODUCT_KEYS)
            .describe('Product type. cartes=business cards, flyers, stickers, affiches=A3 posters, invitations=wedding invitations'),
          quantity: z.coerce.number().min(1).describe('Number of units to print'),
          finish: z
            .enum(['standard', 'premium', 'luxe'])
            .optional()
            .describe('Finish: standard, premium (+50%) or luxe (x2). Defaults to standard.'),
        }),
        execute: async ({ productKey, quantity, finish }) => {
          const breakdown = computePrice(productKey, quantity, finish ?? 'standard');
          return { success: true, ...breakdown };
        },
      }),

      getShippingEstimate: tool({
        description:
          'Estimate Yalidine delivery cost and time to any of the 58 Algerian wilayas. Provide a wilaya name or number.',
        inputSchema: z.object({
          wilaya: z.string().describe('Wilaya name or number, e.g. "Oran", "31", "Alger".'),
          productTotalDZD: z.coerce.number().optional().describe('Optional subtotal of the order to compute the full total.'),
        }),
        execute: async ({ wilaya, productTotalDZD }) => {
          const resolved = resolveWilaya(wilaya);
          if (!resolved) {
            return {
              success: false,
              message: `Wilaya "${wilaya}" introuvable. Les 58 wilayas d'Algérie sont couvertes.`,
            };
          }
          const homeRate = resolved.rate;
          const bureauRate = Math.max(200, homeRate - 150);
          const time = deliveryTimeFor(resolved.code);
          return {
            success: true,
            wilaya: resolved.name,
            code: resolved.code,
            homeDeliveryDZD: homeRate,
            bureauPickupDZD: bureauRate,
            deliveryTime: time,
            totalWithProductDZD:
              typeof productTotalDZD === 'number' ? Math.round(homeRate + productTotalDZD) : undefined,
          };
        },
      }),

      searchProducts: tool({
        description:
          'Search the live store catalog for products matching a keyword (name or category) and return the top matches with real prices.',
        inputSchema: z.object({
          query: z.string().describe('Search keyword, e.g. "cartes", "flyers", "stickers", "affiche".'),
        }),
        execute: async ({ query }) => {
          const q = (query ?? '').toLowerCase().trim();
          const all = await getCatalogProducts();
          const matches = q
            ? all.filter(
                (p) =>
                  p.name.toLowerCase().includes(q) ||
                  String(p.category ?? '').toLowerCase().includes(q)
              )
            : all;
          return {
            success: true,
            query: q,
            results: matches.slice(0, 6).map((p) => ({
              id: String(p.id),
              name: p.name,
              price: p.price,
              category: p.category ?? 'Impression',
              image: p.image ?? '',
            })),
          };
        },
      }),

      checkPromoCode: tool({
        description: 'Validate a promo code and return its discount.',
        inputSchema: z.object({ code: z.string().describe('The promo code to check, e.g. PROMO10.') }),
        execute: async ({ code }) => {
          const promo = lookupPromo(code);
          if (!promo) {
            return {
              success: false,
              message: `Le code "${code}" n'est pas reconnu. Vérifiez l'orthographe ou demandez un code via la Roue de la Fortune sur la page d'accueil.`,
            };
          }
          return { success: true, code: promo.code, descriptionFr: promo.descriptionFr, descriptionAr: promo.descriptionAr };
        },
      }),

      navigateToPage: tool({
        description: 'Navigate the user to a page of the site.',
        inputSchema: z.object({
          route: z
            .enum(['/', '/cart', '/ai-studio', '/customizer', '/services', '/orders', '/rewards', '/payment-verify', '/qr-maker', '/favorites'])
            .describe('Target path'),
          messageToUser: z.string().describe('A short bilingual-ish message explaining the redirect to the user in their language.'),
        }),
        execute: async ({ route, messageToUser }) => ({ route, messageToUser, navigated: true }),
      }),

      createOrder: tool({
        description: 'Register a print order after collecting customer details.',
        inputSchema: z.object({
          customerName: z.string().describe('Full name'),
          phone: z.string().describe('Phone number'),
          product: z.string().describe('Product name'),
          quantity: z.coerce.number().min(1).describe('Quantity'),
          wilaya: z.string().optional().describe('Delivery wilaya'),
          notes: z.string().optional().describe('Special instructions'),
        }),
        execute: async ({ customerName, phone, product, quantity, wilaya, notes }) => {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
            const res = await fetch(`${baseUrl}/api/chat/order-flow`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customerName, phone, product, quantity, wilaya, notes }),
            });
            const data = await res.json();
            return {
              success: data.success ?? false,
              orderId: data.orderId,
              message: data.success
                ? 'Commande enregistrée.'
                : (data.error ?? 'Erreur lors de l\'enregistrement de la commande.'),
            };
          } catch (err: any) {
            return { success: false, message: `Erreur: ${err.message}` };
          }
        },
      }),
    };

    // Pick the healthiest provider (Ollama locally, OpenRouter free in the cloud).
    const { model, providerName, modelId } = await resolveModel();

    const result = streamText({
      model,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content || (m.parts?.[0]?.text ?? ''),
      })),
      system: buildChatSystemPrompt(),
      temperature: 0.6,
      tools: toolsDef,
      stopWhen: stepCountIs(3),
      maxRetries: 2,
      onError: (err: any) => {
        console.warn(`[chat] stream error on ${providerName} (${modelId}):`, err?.message ?? err);
        recordProviderFailure(providerName, err);
      },
      onFinish: () => recordProviderSuccess(providerName),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json(
        {
          error:
            'Tous les fournisseurs IA sont temporairement saturés (limite de débit). Veuillez réessayer dans quelques minutes.',
          retryAfterSeconds: error.retryAfterSeconds,
        },
        {
          status: 503,
          headers: { 'Retry-After': String(error.retryAfterSeconds) },
        }
      );
    }

    const msg = error.message || '';
    let errorMessage = 'An error occurred with the AI service. Please try again.';
    if (msg.includes('OPENROUTER_API_KEY') || msg.includes('NO_PROVIDER'))
      errorMessage = NO_PROVIDER_MESSAGE;
    else if (msg.includes('API key') || msg.includes('authentication') || msg.includes('401'))
      errorMessage = 'AI provider authentication failed. Please check your API keys.';
    else if (msg.includes('not found') || msg.includes('model not found'))
      errorMessage = 'AI model not found. Check the configured model name.';
    return NextResponse.json({ error: errorMessage, detail: msg }, { status: 500 });
  }
}
