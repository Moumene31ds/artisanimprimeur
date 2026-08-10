import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getClientIp, sanitizePhone, sanitizeQuantity, sanitizeTextInput } from '@/lib/security';
import { uploadLimiter } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // حماية: تقييد معدل الإنشاء لكل IP (يمنع إغراق قاعدة البيانات بطلبات آلية).
    const rl = uploadLimiter.allow(`order-flow:${getClientIp(req)}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de commandes récentes. Réessayez plus tard.', retryAfterSeconds: Math.ceil(rl.retryAfterMs / 1000) },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await req.json();
    const { customerName, phone, wilaya, product, quantity, notes } = body;

    // تنظيف وتقييد كل حقل قبل الكتابة في قاعدة البيانات.
    const cleanName = sanitizeTextInput(customerName, 120);
    const cleanPhone = sanitizePhone(phone);
    const cleanProduct = sanitizeTextInput(product, 200);
    const cleanQuantity = sanitizeQuantity(quantity, 100000);
    const cleanWilaya = sanitizeTextInput(wilaya, 60);
    const cleanNotes = sanitizeTextInput(notes, 500);

    if (!cleanName || !cleanPhone || !cleanProduct || cleanQuantity <= 0) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }
    if (cleanPhone.length < 8) {
      return NextResponse.json({ error: 'Phone number is invalid' }, { status: 400 });
    }

    const orderRef = await addDoc(collection(db, 'orders'), {
      customerUserId: 'chat-bot',
      customerName: cleanName,
      phone: cleanPhone,
      wilaya: cleanWilaya || 'Non spécifiée',
      deliveryType: 'desk',
      shippingMethod: 'collect',
      designReadyStatus: 'needs_review',
      notes: cleanNotes || 'Commande créée via le chat bot',
      items: [{ name: cleanProduct, quantity: cleanQuantity, price: 0 }],
      subtotal: 0,
      discountAmount: 0,
      deliveryFee: 0,
      total: 0,
      status: 'En attente',
      paymentMethod: 'Paiement à la réception',
      paymentStatus: 'unpaid',
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, orderId: orderRef.id });
  } catch (error) {
    console.error('Chat order creation failed', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
