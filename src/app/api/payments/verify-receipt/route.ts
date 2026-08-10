import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  generateTextWithFallback,
  AIUnavailableError,
} from '@/lib/ai';
import { bearerToken, verifyIdToken } from '@/lib/auth-verify';
import { verifyReceiptLimiter } from '@/lib/rate-limit';
import { fsGet, fsPatch, fsCreate } from '@/lib/firestore-rest';
import { ok, fail, ApiError } from '@/lib/security';
import { receiptSchema } from '@/lib/security';

export const maxDuration = 60; // Allow ample time for AI processing and database checks

const MAX_IMAGE_BASE64 = 12 * 1024 * 1024; // ~9 MB binary
const MAX_TX_LENGTH = 40;

const ALLOWED_VERDICTS = new Set(['approved', 'suspicious', 'invalid', 'needs_manual_review']);

function sanitizeTxId(raw: unknown): string {
  return String(raw ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, MAX_TX_LENGTH);
}

function normalizeReport(raw: any) {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const verdict = ALLOWED_VERDICTS.has(String(r.verdict)) ? String(r.verdict) : 'needs_manual_review';
  return {
    isReceipt: r.isReceipt === true || r.isReceipt === 'true',
    extractedTxId: String(r.extractedTxId ?? r.extractedTxID ?? '').trim(),
    extractedAmount: Number(r.extractedAmount) || 0,
    extractedSenderRip: String(r.extractedSenderRip ?? '').trim(),
    extractedDate: String(r.extractedDate ?? '').trim(),
    confidenceScore: Math.max(0, Math.min(100, Number(r.confidenceScore) || 0)),
    isAltered: r.isAltered === true || r.isAltered === 'true',
    fraudAssessment: String(r.fraudAssessment ?? '').trim(),
    verdict,
  };
}

export async function POST(req: Request) {
  // 0. Parse body (bounded size)
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail(new ApiError(400, 'Invalid JSON body.'));
  }

  const { image, orderId, txId, ripSender, paymentProofUrl } = body;

  // 0ب. تحقق صارم من المخطط قبل أي منطق — يمنع حقن معرفات/رموز خبيثة.
  const receipt = receiptSchema.safeParse({ orderId, txId, ripSender, paymentProofUrl });
  if (!receipt.success) {
    return fail(receipt.error);
  }
  const cleanTx = receipt.data.txId;

  // 1. Authentication — a valid Firebase ID token is required
  const user = await verifyIdToken(bearerToken(req.headers.get('authorization')));
  if (!user) {
    return fail(new ApiError(401, 'Authentication required. Please log in and retry.'));
  }
  const token = bearerToken(req.headers.get('authorization')) as string;

  // 2. Rate limiting (per user)
  const rl = verifyReceiptLimiter.allow(`user:${user.uid}`);
  if (!rl.allowed) {
    const retryAfter = Math.ceil(rl.retryAfterMs / 1000);
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.', retryAfterSeconds: retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  // 3. Input validation
  if (!image || typeof image !== 'string') {
    return fail(new ApiError(400, 'Missing receipt image'));
  }
  if (image.length > MAX_IMAGE_BASE64) {
    return fail(new ApiError(413, 'Image trop volumineuse (max ~9 MB). Compressez-la et réessayez.'));
  }

  // 4. Ownership + server-side truth (never trust client-sent totals)
  let orderData: any;
  try {
    const orderSnap = await getDoc(doc(db, 'orders', orderId));
    if (!orderSnap.exists()) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    orderData = { id: orderSnap.id, ...orderSnap.data() };
  } catch (e: any) {
    console.error('❌ Failed to fetch order:', e);
    return NextResponse.json({ error: 'Could not load order.' }, { status: 500 });
  }

  if (String(orderData.customerUserId ?? orderData.userId ?? '') !== user.uid) {
    return NextResponse.json({ error: 'This order does not belong to your account.' }, { status: 403 });
  }

  const orderTotal = Number(orderData.total) || 0;
  if (orderTotal <= 0) {
    return NextResponse.json({ error: 'Order total is invalid.' }, { status: 400 });
  }

  // Idempotency: already-approved orders must not be re-submitted (blocks double bonus).
  const alreadyVerified =
    orderData.aiVerification?.verdict === 'approved' ||
    orderData.paymentStatus === 'Payé' ||
    orderData.status === 'Prêt' ||
    orderData.status === 'Terminé';
  if (alreadyVerified) {
    return NextResponse.json({
      success: true,
      alreadyVerified: true,
      report: orderData.aiVerification ?? { verdict: 'approved' },
      message: 'Cette commande est déjà validée.',
    });
  }

  // 5. Compute required deposit server-side from UI settings
  let requiredAmount = orderTotal;
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'ui'));
    if (settingsDoc.exists()) {
      const uiConfig = settingsDoc.data();
      const depType = uiConfig.baridimobMinDepositType || 'none';
      const depVal = Number(uiConfig.baridimobMinDepositValue) || 0;
      if (depType === 'percentage' && depVal > 0) requiredAmount = (orderTotal * depVal) / 100;
      else if (depType === 'fixed' && depVal > 0) requiredAmount = Math.min(orderTotal, depVal);
    }
  } catch (e) {
    console.warn('Could not retrieve uiConfig settings for deposit check:', e);
  }

  // 6. Prepare base64 image for the free vision provider
  const base64Data = typeof image === 'string' && image.startsWith('data:')
    ? image.split(';base64,').pop() || ''
    : image;

  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(base64Data, 'base64');
  } catch {
    return NextResponse.json({ error: 'Invalid image encoding.' }, { status: 400 });
  }
  if (imageBuffer.length === 0 || imageBuffer.length > MAX_IMAGE_BASE64) {
    return NextResponse.json({ error: 'Image invalide ou trop volumineuse.' }, { status: 400 });
  }

  // 7. AI OCR & fraud analysis (vision-capable model). Graceful degradation:
  //    if the AI is unavailable or returns garbage, we still record the receipt
  //    as "Envoyé" for manual review instead of failing the request.
  const prompt = `
    You are an automated Algerian banking receipt verification assistant. 
    Analyze the uploaded payment receipt screenshot. This is typically a BaridiMob (Algeria Post mobile app) transfer confirmation or a CCP paper slip.
    
    Tasks:
    1. Verify if this image is actually a valid payment receipt or transfer confirmation (CCP or BaridiMob).
    2. Extract the transaction ID (Numéro de transaction / Référence). Note: BaridiMob transaction IDs are usually 16 to 22 digits.
    3. Extract the total amount transferred in Algerian Dinars (DZD). Compare it with the minimum expected amount of ${Math.round(requiredAmount)} DZD.
    4. Extract the sender RIP (Clé/Compte CCP or RIP beginning with 007) and transaction date/time if visible.
    5. Perform a visual security scan: check for any signs of tampering (cloned text, mismatched fonts, overlapping text, edits around the amount or reference number).
    
    Match details:
    - Expected Transaction ID: "${cleanTx}"
    - Expected Minimum Amount (Versement/Total): ${Math.round(requiredAmount)} DZD

    Respond with ONLY a single JSON object, no markdown fences, no commentary:
    {
      "isReceipt": true or false,
      "extractedTxId": "digits only, empty string if not found",
      "extractedAmount": 0 or a number,
      "extractedSenderRip": "string, empty if not found",
      "extractedDate": "string, empty if not found",
      "confidenceScore": 0-100,
      "isAltered": true or false,
      "fraudAssessment": "short explanation in French or Arabic",
      "verdict": "approved" | "suspicious" | "invalid" | "needs_manual_review"
    }

    Verdict guidelines:
    - "approved": isReceipt is true, amount >= ${Math.round(requiredAmount)} DZD, transaction ID matches the expected one (or 90%+ similar, allowing OCR typos), and no signs of tampering (isAltered false).
    - "needs_manual_review": valid receipt but amount slightly below expected, blurry image, or transaction ID mismatch.
    - "suspicious": isAltered true, or it clearly is not a genuine receipt.
    - "invalid": image is completely unrelated (selfie, blank screen, random document...).
  `;

  let report: any;
  let aiOk = true;
  try {
    const aiResponse = await generateTextWithFallback({
      vision: true,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: imageBuffer, mediaType: 'image/jpeg' },
          ],
        },
      ],
      temperature: 0.1,
      maxRetries: 2,
      onAttempt: ({ provider, model, attempt }) =>
        console.log(`✅ Receipt AI attempt with ${model} (${provider}) on try ${attempt}`),
    });

    let responseText = aiResponse.text.trim();
    if (responseText.startsWith('```json')) responseText = responseText.slice(7);
    if (responseText.startsWith('```')) responseText = responseText.slice(3);
    if (responseText.endsWith('```')) responseText = responseText.slice(0, -3);
    responseText = responseText.trim();

    const bracket = responseText.indexOf('{');
    if (bracket > 0) responseText = responseText.slice(bracket);
    const closeBracket = responseText.lastIndexOf('}');
    if (closeBracket > 0) responseText = responseText.slice(0, closeBracket + 1);

    report = normalizeReport(JSON.parse(responseText));
  } catch (e: any) {
    aiOk = false;
    console.error('❌ Receipt AI analysis failed — falling back to manual review:', e?.message ?? e);
    report = {
      isReceipt: true,
      extractedTxId: '',
      extractedAmount: 0,
      extractedSenderRip: '',
      extractedDate: '',
      confidenceScore: 0,
      isAltered: false,
      fraudAssessment: "L'analyse IA a échoué (service temporairement indisponible). Le reçu sera vérifié manuellement par un administrateur.",
      verdict: 'needs_manual_review',
    };
  }

  // 8. Duplicate / double-use prevention via a global transaction-ID registry.
  //    A txId can be reserved by at most ONE order (its reservation doc id).
  let isDuplicate = false;
  let duplicateOrderId = '';
  const txsToCheck = new Set<string>([cleanTx]);
  if (report.extractedTxId) txsToCheck.add(report.extractedTxId);

  for (const singleTx of txsToCheck) {
    if (!singleTx || singleTx.length < 5) continue;
    let reservation: any = null;
    try {
      reservation = await fsGet(token, `receiptTxIds/${singleTx}`);
    } catch (e) {
      console.warn(`⚠️ receiptTxIds read failed for ${singleTx}:`, (e as Error)?.message ?? e);
    }
    if (reservation && String(reservation.orderId) !== orderId) {
      isDuplicate = true;
      duplicateOrderId = String(reservation.orderId ?? '');
      break;
    }
  }

  if (isDuplicate) {
    report.verdict = 'suspicious';
    report.fraudAssessment =
      `${report.fraudAssessment} [FRAUD_ALERT: Ce reçu a déjà été utilisé pour la commande #${duplicateOrderId.slice(-6).toUpperCase()}]`.trim();
  }

  // 9. Authoritative server-side writes (authenticated as the requesting user)
  const shouldAdvance = report.verdict === 'approved';
  const storeInOrder = report.verdict === 'approved' || report.verdict === 'needs_manual_review';

  if (storeInOrder) {
    const orderPatch: Record<string, any> = {
      paymentStatus: 'Envoyé',
      baridimobTxId: cleanTx,
      baridimobRipSender: sanitizeTxId(ripSender),
      paymentProofUrl: paymentProofUrl || orderData.paymentProofUrl || 'Uploaded',
      aiVerification: report,
      paidAmount: report.extractedAmount || 0,
    };
    if (shouldAdvance) orderPatch.status = 'Conception';
    try {
      await fsPatch(token, `orders/${orderId}`, orderPatch);
    } catch (e) {
      console.error('❌ Order update failed:', (e as Error)?.message ?? e);
      return NextResponse.json({ error: 'Could not save the receipt. Please retry.' }, { status: 500 });
    }

    // Reserve the transaction ID(s) so no other order can reuse this receipt.
    if (shouldAdvance) {
      const toReserve = new Set<string>([cleanTx]);
      if (report.extractedTxId && report.extractedTxId.length >= 5) toReserve.add(report.extractedTxId);
      for (const t of toReserve) {
        try {
          await fsCreate(token, 'receiptTxIds', {
            orderId,
            userId: user.uid,
            verifiedAt: new Date().toISOString(),
          }, t);
        } catch (e: any) {
          // ALREADY_EXISTS means another order claimed it in a race — flag it.
          const msg = String(e?.message ?? '');
          if (/already exists|409|ALREADY_EXISTS/i.test(msg)) {
            isDuplicate = true;
            duplicateOrderId = orderId;
            report.verdict = 'suspicious';
          } else {
            console.warn(`⚠️ receiptTxIds create failed for ${t}:`, msg);
          }
        }
      }
    }
  }

  // 10. Bonus points only on genuine approval (idempotency guard above protects against re-use)
  let pointsAwarded = false;
  if (shouldAdvance) {
    try {
      await fsCreate(token, 'pointTransactions', {
        userId: user.uid,
        points: 50,
        type: 'won',
        title: `Bonus points for AI Verified BaridiMob payment #${orderId.slice(0, 6)}`,
        titleAr: `نقاط إضافية للتحقق الذكي للطلب #${orderId.slice(0, 6)}`,
        createdAt: new Date().toISOString(),
      });
      pointsAwarded = true;
    } catch (e) {
      console.error('❌ Failed to award bonus points:', e);
    }
  }

  // 11. Audit log — every attempt is recorded for admin review & abuse analysis
  try {
    await fsCreate(token, 'paymentVerifications', {
      orderId,
      userId: user.uid,
      txId: cleanTx,
      verdict: report.verdict,
      isDuplicate,
      confidenceScore: report.confidenceScore,
      extractedAmount: report.extractedAmount,
      isAltered: report.isAltered,
      imageUrl: paymentProofUrl || '',
      aiOk,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('❌ Failed to write paymentVerifications audit log:', e);
  }

  return NextResponse.json({
    success: true,
    report,
    isDuplicate,
    duplicateOrderId,
    orderUpdated: storeInOrder,
    pointsAwarded,
  });
}
