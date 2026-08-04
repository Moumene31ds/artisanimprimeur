import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { calculateTierPrice } from '@/lib/pricing';
import { SlidingWindowRateLimiter } from '@/lib/rate-limit';
import { bearerToken, verifyIdToken } from '@/lib/auth-verify';
import { fsCreate, fsGet } from '@/lib/firestore-rest';
import { buildStatusHistory } from '@/lib/order-status';

// -----------------------------------------------
// Google Pay — Confirmation serveur & création commande
// -----------------------------------------------
// 1. On récupère le PaymentIntent depuis Stripe et on vérifie qu'il est
//    bien au statut "succeeded" (jamais de confiance aveugle côté client).
// 2. On revérifie le montant facturé vs le panier (anti-fraude).
// 3. On crée la commande Firestore avec paymentStatus "Payé".
// 4. Idempotence : un même paymentIntent ne peut créer qu'UNE seule commande.

export const dynamic = 'force-dynamic';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const GP_CURRENCY = (process.env.NEXT_PUBLIC_GP_CURRENCY || 'dzd').toLowerCase();

const stripeClient = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

const gpayCompleteLimiter = new SlidingWindowRateLimiter(10 * 60 * 1000, 20);

const MAX_ITEMS = 50;
const MAX_DELIVERY_FEE = 2000;
const MAX_UNIT_PRICE = 500000;

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : 'unknown') || 'unknown';
}

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
    return NextResponse.json({ error: 'Paiement en ligne indisponible.' }, { status: 503 });
  }

  const token = bearerToken(req.headers.get('authorization'));
  const user = await verifyIdToken(token);
  const limiterKey = user ? `user:${user.uid}` : `ip:${clientIp(req)}`;
  const rl = gpayCompleteLimiter.allow(limiterKey);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de tentatives.' }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { paymentIntentId, customer, delivery, items } = body || {};

  if (typeof paymentIntentId !== 'string' || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
    return NextResponse.json({ error: 'Référence de paiement invalide.' }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    return NextResponse.json({ error: 'Panier invalide.' }, { status: 400 });
  }
  for (const it of items) {
    if (!validateItem(it)) return NextResponse.json({ error: 'Article invalide.' }, { status: 400 });
  }

  const name = String(customer?.name || '').trim().slice(0, 80);
  const phone = String(customer?.phone || '').trim().slice(0, 20);
  const wilaya = String(delivery?.wilaya || '').trim().slice(0, 40);
  if (!name || !/^(0)(5|6|7)[0-9]{8}$/.test(phone)) {
    return NextResponse.json({ error: 'Coordonnées de livraison invalides.' }, { status: 400 });
  }

  // 1) Récupération autoritaire du PaymentIntent
  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
  } catch (err: any) {
    console.error('❌ Google Pay retrieve failed:', err?.message ?? err);
    return NextResponse.json({ error: 'Impossible de vérifier le paiement.' }, { status: 500 });
  }

  if (paymentIntent.status !== 'succeeded') {
    return NextResponse.json(
      { error: `Le paiement n'est pas confirmé (${paymentIntent.status}).` },
      { status: 402 }
    );
  }

  // 2) Idempotence — une commande existe déjà pour ce paiement ?
  try {
    if (token) {
      const existing = await fsGet(token, `orderPayments/${paymentIntentId}`);
      if (existing && existing.orderId) {
        return NextResponse.json({ success: true, alreadyExists: true, orderId: existing.orderId });
      }
    }
  } catch {
    // première fois — on continue
  }

  // 3) Recalcul autoritaire du montant + comparaison stricte avec le chargé réel
  let subtotal = 0;
  for (const it of items) {
    const info = calculateTierPrice(Number(it.price), Number(it.quantity));
    subtotal += info.totalItemPrice;
  }
  const deliveryFee = Math.max(0, Math.min(MAX_DELIVERY_FEE, Number(delivery?.fee) || 0));
  const discountAmount = Math.max(0, Math.min(subtotal, Number(delivery?.discount) || 0));
  const expectedTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;
  const expectedMinor = toMinorUnits(expectedTotal, GP_CURRENCY);

  if (paymentIntent.amount !== expectedMinor) {
    console.error(`❌ Amount mismatch: expected ${expectedMinor}, got ${paymentIntent.amount}`);
    return NextResponse.json({ error: 'Montant du paiement incohérent. Contactez le support.' }, { status: 409 });
  }

  // 4) Création de la commande
  const orderData = {
    customerUserId: user ? user.uid : 'guest',
    customerName: name,
    phone,
    wilaya,
    deliveryType: delivery?.type || 'domicile',
    shippingMethod: delivery?.shippingMethod || 'national',
    designReadyStatus: 'ready',
    notes: String(customer?.notes || '').slice(0, 500),
    designUrl: null,
    items,
    subtotal: Math.round(subtotal),
    discountAmount: Math.round(discountAmount),
    appliedPromoCode: delivery?.promoCode || null,
    deliveryFee: Math.round(deliveryFee),
    total: Math.round(expectedTotal),
    status: 'En attente',
    statusHistory: buildStatusHistory(null, 'En attente', 'Paiement en ligne Google Pay reçu'),
    paymentMethod: 'Google Pay (carte)',
    paymentStatus: 'Payé',
    paymentProvider: 'stripe',
    paymentProviderTxnId: paymentIntentId,
    paidAmount: Math.round(expectedTotal),
    createdAt: serverTimestamp(),
  };

  let orderId: string;
  try {
    const docRef = await addDoc(collection(db, 'orders'), orderData);
    orderId = docRef.id;
  } catch (err: any) {
    console.error('❌ Order creation failed:', err?.message ?? err);
    return NextResponse.json({ error: 'Impossible d\'enregistrer la commande.' }, { status: 500 });
  }

  // 5) Verrouillage idempotent (unique par paymentIntent)
  if (token) {
    try {
      await fsCreate(token, `orderPayments/${paymentIntentId}`, {
        orderId,
        userId: user ? user.uid : 'guest',
        paidAt: new Date().toISOString(),
        amount: Math.round(expectedTotal),
      }, paymentIntentId);
    } catch (err) {
      console.warn('⚠️ orderPayments lock write failed:', (err as Error)?.message ?? err);
    }
  }

  // 6) Journal d'audit
  try {
    await addDoc(collection(db, 'securityLogs'), {
      event: 'order_created_google_pay',
      email: user?.email || 'anonymous-customer',
      timestamp: serverTimestamp(),
      type: 'checkout',
      status: 'success',
      details: `Commande #${orderId} payée via Google Pay (${paymentIntentId}) — ${Math.round(expectedTotal)} DA.`,
      ip: 'client-logged',
    });
  } catch (err) {
    console.error('❌ Audit log failed:', err);
  }

  // 7) Notification hors chemin critique
  try {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/orders/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'created',
        order: { id: orderId, orderNumber: orderId, phone, customerName: name, total: Math.round(expectedTotal) },
      }),
    }).catch(() => {});
  } catch { /* ignore */ }

  return NextResponse.json({ success: true, orderId });
}
