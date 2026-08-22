import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendBATNotification,
  sendOrderReadyNotification,
} from '@/lib/whatsapp-service';
import { sendSimpleEmail, sendOrderStatusEmail } from '@/lib/email-service';
import { executeAutomations } from '@/lib/automation-executor';
import { SlidingWindowRateLimiter } from '@/lib/rate-limit';

const notifyLimiter = new SlidingWindowRateLimiter(10 * 60 * 1000, 20);

// ملاحظة: المسار عام لأنه يخدم طلبات الضيوف بعد إنشاء الطلب، لكن الحقول
// مُتحقَّق منها بدقة لمنع حقن محتوى الرسائل أو استنزاف قنوات الإرسال.
const notifySchema = z.object({
  type: z.enum(['created', 'status', 'bat', 'ready']),
  token: z.string().max(2048).optional(),
  order: z.object({
    id: z.string().min(1).max(128),
    phone: z.string().min(6).max(20),
    customerName: z.string().max(120).optional(),
    customerEmail: z.string().email().max(254).optional(),
    customerUserId: z.string().max(128).optional(),
    status: z.string().max(60).optional(),
    total: z.number().nonnegative().max(10_000_000).optional(),
    orderNumber: z.string().max(60).optional(),
    batUrl: z.string().url().max(2048).optional(),
  }),
});

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * POST /api/orders/notify
 * Unified notification endpoint used after order creation and on every
 * status change. Delivers WhatsApp + email messages and, for registered
 * customers, triggers the matching marketing automations (trigger "purchase").
 *
 * Body:
 *  {
 *    type: 'created' | 'status' | 'bat' | 'ready',
 *    order: {
 *      id, phone, customerName, customerEmail?, status?, total?, orderNumber?
 *    },
 *    token?: string  // user Firestore token (automations only)
 *  }
 */
export async function POST(req: NextRequest) {
  if (!notifyLimiter.allow(getIp(req)).allowed) {
    return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = notifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  }
  const { type, order, token } = parsed.data;

  const customerName = order.customerName || 'Cher client';
  const orderRef = order.orderNumber || order.id.slice(-6).toUpperCase();
  const results: Array<{ channel: string; success: boolean; detail?: string }> = [];

  try {
    if (type === 'created') {
      const wa = await sendOrderConfirmation(order.phone, customerName, orderRef, order.total || 0);
      results.push({ channel: 'whatsapp', success: wa.success, detail: wa.error });
      if (order.customerEmail) {
        const em = await sendSimpleEmail(
          order.customerEmail,
          `Confirmation de votre commande #${orderRef}`,
          `L'Artisan Imprimeur\n\nBonjour ${customerName},\n\nVotre commande #${orderRef} a bien été enregistrée.\nMontant à payer à la réception : ${order.total || 0} DZD.\n\nRetrait à l'atelier : Cité Akid Lotfi, Oran.\n\nSuivez votre commande : ${process.env.NEXT_PUBLIC_APP_URL || 'https://artisanimprimeur.vercel.app'}/orders\n\nMerci pour votre confiance.`
        );
        results.push({ channel: 'email', success: em.success, detail: em.reason });
      }
    } else if (type === 'status') {
      const wa = await sendOrderStatusUpdate(order.phone, customerName, orderRef, order.status || '');
      results.push({ channel: 'whatsapp', success: wa.success, detail: wa.error });
      if (order.customerEmail) {
        const em = await sendOrderStatusEmail(order.customerEmail, customerName, order.id, order.status || '');
        results.push({ channel: 'email', success: em.success, detail: em.reason });
      }
    } else if (type === 'bat') {
      const wa = await sendBATNotification(
        order.phone,
        customerName,
        orderRef,
        order.batUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://artisanimprimeur.vercel.app'}/orders`
      );
      results.push({ channel: 'whatsapp', success: wa.success, detail: wa.error });
    } else if (type === 'ready') {
      const wa = await sendOrderReadyNotification(order.phone, customerName, orderRef);
      results.push({ channel: 'whatsapp', success: wa.success, detail: wa.error });
    } else {
      return NextResponse.json({ success: false, error: 'Unknown type' }, { status: 400 });
    }
  } catch (err: any) {
    results.push({ channel: 'unknown', success: false, detail: String(err?.message || err) });
  }

  let automations: Awaited<ReturnType<typeof executeAutomations>> = { ran: 0, skipped: 0, results: [] };
  if (type === 'created' && token && order.customerUserId && order.customerUserId !== 'guest') {
    try {
      automations = await executeAutomations(token, 'purchase', {
        order,
        customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.phone,
      });
    } catch (err) {
      console.error('❌ [notify] automations failed:', err);
    }
  }

  return NextResponse.json({ success: true, sent: results, automations });
}
