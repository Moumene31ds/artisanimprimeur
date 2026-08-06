import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerName, phone, wilaya, product, quantity, notes } = body;

    if (!customerName || !phone || !product || !quantity) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    const orderRef = await addDoc(collection(db, 'orders'), {
      customerUserId: 'chat-bot',
      customerName,
      phone,
      wilaya: wilaya || 'Non spécifiée',
      deliveryType: 'desk',
      shippingMethod: 'collect',
      designReadyStatus: 'needs_review',
      notes: notes || 'Commande créée via le chat bot',
      items: [{ name: product, quantity, price: 0 }],
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
