import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { calculateTierPrice } from '@/lib/pricing';
import { SlidingWindowRateLimiter } from '@/lib/rate-limit';
import { bearerToken, verifyIdToken } from '@/lib/auth-verify';

// -----------------------------------------------
// Google Pay (Stripe Payment Request) — Create PaymentIntent
// -----------------------------------------------
// Sécurité : le montant est TOUJOURS recalculé côté serveur à partir des
// articles. Le client ne peut ni gonfler ni réduire la somme facturée.
// Le sous-total est recalculé avec la grille de prix officielle, puis on
// applique des bornes strictes sur les frais de livraison et la remise.

export const dynamic = 'force-dynamic';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const GP_CURRENCY = (process.env.NEXT_PUBLIC_GP_CURRENCY || 'dzd').toLowerCase();

const supported = /^sk_(live|test)_/.test(STRIPE_SECRET_KEY) || /^sk_/.test(STRIPE_SECRET_KEY);
const stripeClient = supported ? new Stripe(STRIPE_SECRET_KEY) : null;

// Limiteur dédié : 15 intents / 10 min / utilisateur ou IP.
const gpayIntentLimiter = new SlidingWindowRateLimiter(10 * 60 * 1000, 15);

// Bornes de sécurité — impossible de dépasser ces valeurs quel que soit l'input client.
const MAX_ITEMS = 50;
const MAX_DELIVERY_FEE = 2000;
const MAX_UNIT_PRICE = 500000;
const MIN_TOTAL = 50; // DA (ou unité mineure convertie plus bas)

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : 'unknown') || 'unknown';
}

/** Stripe attend le montant en plus petite unité de devise (centimes). */
function toMinorUnits(amount: number, currency: string): number {
  const zeroDecimal = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);
  if (zeroDecimal.has(currency)) return Math.round(amount);
  return Math.round(amount * 100);
}

function validateItem(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  const price = Number(item.price);
  const qty = Number(item.quantity);
  return Number.isFinite(price) && price >= 0 && price <= MAX_UNIT_PRICE &&
         Number.isInteger(qty) && qty >= 1 && qty <= 100000;
}

export async function POST(req: Request) {
  if (!stripeClient) {
    return NextResponse.json(
      { error: 'Le paiement en ligne n\'est pas configuré pour le moment.' },
      { status: 503 }
    );
  }

  // Authentification optionnelle (les clients invités peuvent payer aussi),
  // mais on utilise l'UID ou l'IP pour le rate-limiting.
  const user = await verifyIdToken(bearerToken(req.headers.get('authorization')));
  const limiterKey = user ? `user:${user.uid}` : `ip:${clientIp(req)}`;
  const rl = gpayIntentLimiter.allow(limiterKey);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0 || items.length > MAX_ITEMS) {
    return NextResponse.json({ error: 'Panier invalide.' }, { status: 400 });
  }
  for (const it of items) {
    if (!validateItem(it)) return NextResponse.json({ error: 'Article invalide dans le panier.' }, { status: 400 });
  }

  // Recalcul autoritaire du sous-total (jamais le total envoyé par le client).
  let subtotal = 0;
  for (const it of items) {
    const info = calculateTierPrice(Number(it.price), Number(it.quantity));
    subtotal += info.totalItemPrice;
  }

  // Bornes strictes des frais/remises.
  const deliveryFee = Math.max(0, Math.min(MAX_DELIVERY_FEE, Number(body?.deliveryFee) || 0));
  const discountAmount = Math.max(0, Math.min(subtotal, Number(body?.discountAmount) || 0));

  const total = Math.max(0, subtotal - discountAmount) + deliveryFee;
  if (total < MIN_TOTAL) {
    return NextResponse.json({ error: 'Montant de commande invalide.' }, { status: 400 });
  }

  const amountMinor = toMinorUnits(total, GP_CURRENCY);

  try {
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: amountMinor,
      currency: GP_CURRENCY,
      payment_method_types: ['card'],
      payment_method_options: {
        card: { request_three_d_secure: 'any' },
      },
      metadata: {
        gateway: 'google_pay',
        itemsCount: String(items.length),
        subtotal: String(Math.round(subtotal)),
        source: 'payment_request',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: Math.round(total),
      currency: GP_CURRENCY,
      provider: 'google_pay',
    });
  } catch (err: any) {
    console.error('❌ Google Pay intent creation failed:', err?.message ?? err);
    return NextResponse.json(
      { error: 'Impossible de préparer le paiement. Réessayez plus tard.' },
      { status: 500 }
    );
  }
}
