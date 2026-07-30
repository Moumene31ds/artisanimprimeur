import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 60;

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google API Key is missing. Please check .env.local and restart the server.' },
      { status: 500 }
    );
  }

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
    const google = createGoogleGenerativeAI({ apiKey });

    const systemPrompt = `You are L'Artisan AI, the premium print consultant and AI assistant for 'L'Artisan Imprimeur' in Algeria.
Your goal is to guide clients on print products, resolution (min 300 DPI), shipping, payment terms, marketing campaigns, and upselling.
Be professional, friendly, and helpful. Answer fluently in Arabic or French depending on the user's language.

You can help with:
- Smart campaign and offer recommendations
- Generating promotional messages for print products
- Answering follow-up questions with clear actionable advice
- Navigating the user to the right page using available tools
- Creating complete print orders step-by-step

When the user wants to place an order:
1. Ask for their full name.
2. Ask for their phone number.
3. Ask for the product (cartes, flyers, stickers, affiches).
4. Ask for the quantity.
5. Ask for the wilaya or delivery location.
6. Ask for notes or special instructions.
7. Confirm and use the createOrder tool to register it.

Product Catalog:
1. Cartes de Visite Premium (بطاقات عمل) - standard and luxury finishes
2. Flyers Publicitaires (فلايرز إعلانية) - A5, A4, A3 high-impact
3. Stickers Personnalisés (ملصقات) - custom contour cut labels
4. Affiches (ملصقات حائطية) - high-resolution wall prints`;

    const toolsDef = {
      calculatePrice: tool({
        description: 'Calculate the total price for printing products based on quantity and type.',
        parameters: z.object({
          productType: z
            .enum(['cartes', 'flyers', 'stickers', 'affiches'])
            .describe('The type of product'),
          quantity: z.number().min(1).describe('Number of items to print'),
          finish: z
            .enum(['standard', 'premium', 'luxe'])
            .optional()
            .describe('Finish type, defaults to standard'),
        }),
        execute: async ({ productType, quantity, finish }) => {
          const basePrices: Record<string, number> = {
            cartes: 15,
            flyers: 30,
            stickers: 10,
            affiches: 150,
          };
          const basePrice = basePrices[productType] ?? 20;
          const multiplier = finish === 'luxe' ? 2 : finish === 'premium' ? 1.5 : 1;
          const totalDZD = basePrice * quantity * multiplier;

          return {
            success: true,
            product: productType,
            quantity,
            finish: finish ?? 'standard',
            totalPriceDZD: totalDZD,
          };
        },
      }),

      navigateToPage: tool({
        description: 'Navigate the user to a specific page in the application.',
        parameters: z.object({
          route: z
            .enum(['/', '/cart', '/products', '/studio', '/contact', '/orders', '/rewards'])
            .describe('Target path'),
          messageToUser: z.string().describe('Friendly message explaining the redirect.'),
        }),
        execute: async ({ route, messageToUser }) => {
          return { route, messageToUser, navigated: true };
        },
      }),

      suggestOffer: tool({
        description: 'Suggest a strong marketing offer or campaign for the print shop.',
        parameters: z.object({
          audience: z.string().describe('Who the offer targets'),
          product: z.string().describe('The print product or service'),
          goal: z.string().describe('The marketing goal'),
        }),
        execute: async ({ audience, product, goal }) => {
          return {
            success: true,
            suggestion: `Offre IA: ${goal} pour ${audience} avec ${product}. Proposez une remise limitée dans le temps, une livraison express et un service premium pour maximiser la conversion.`,
          };
        },
      }),

      createOrder: tool({
        description: 'Register a print order after collecting all customer details.',
        parameters: z.object({
          customerName: z.string().describe('Full name of the customer'),
          phone: z.string().describe('Customer phone number'),
          product: z.string().describe('Product name'),
          quantity: z.number().min(1).describe('Quantity ordered'),
          wilaya: z.string().optional().describe('Delivery wilaya'),
          notes: z.string().optional().describe('Special instructions'),
          deliveryType: z.string().optional().describe('Delivery method'),
        }),
        execute: async ({ customerName, phone, product, quantity, wilaya, notes, deliveryType }) => {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
            const res = await fetch(`${baseUrl}/api/chat/order-flow`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customerName, phone, product, quantity, wilaya, notes, deliveryType }),
            });
            const data = await res.json();
            return {
              success: data.success ?? false,
              orderId: data.orderId,
              message: data.success
                ? 'Commande enregistrée avec succès. Vous recevrez une confirmation sous peu.'
                : (data.error ?? 'Erreur lors de l\'enregistrement.'),
            };
          } catch (err: any) {
            return {
              success: false,
              message: `Impossible d'enregistrer la commande: ${err.message}`,
            };
          }
        },
      }),
    };

    let lastError: any;
    for (const modelName of GEMINI_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = streamText({
            model: google(modelName),
            messages,
            system: systemPrompt,
            temperature: 0.6,
            tools: toolsDef,
            maxSteps: 3,
          });

          return result.toDataStreamResponse();

        } catch (err: any) {
          lastError = err;
          const isOverloaded =
            err?.message?.includes('503') ||
            err?.message?.includes('UNAVAILABLE') ||
            err?.message?.includes('overloaded') ||
            err?.message?.includes('high demand') ||
            err?.message?.includes('429');

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

    throw lastError ?? new Error('All Gemini models are currently unavailable.');

  } catch (error: any) {
    let errorMessage = 'An error occurred with the AI service. Please try again.';

    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key')) {
      errorMessage = 'Google API Key is invalid. Please check your .env.local file.';
    } else if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      errorMessage = 'API quota exceeded. Please try again later.';
    } else if (error.message?.includes('PERMISSION_DENIED')) {
      errorMessage = 'Permission denied. Ensure the Gemini API is enabled for your Google project.';
    } else if (error.message?.includes('unavailable') || error.message?.includes('UNAVAILABLE')) {
      errorMessage = 'The AI service is temporarily overloaded. Please try again in a moment.';
    } else if (error.message?.includes('not found')) {
      errorMessage = 'AI model not found. Please check API configuration.';
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
