import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

export const maxDuration = 60; // Allow ample time for Gemini processing and database checks

// Retry helper with exponential backoff + model fallback
async function generateWithRetry(google: any, prompt: string, imageBuffer: Buffer, maxAttempts = 3) {
  const models = ['gemini-3.5-flash', 'gemini-2.5-flash'];
  for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
    const modelName = models[modelIdx];
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { generateText } = await import('ai');
        const result = await generateText({
          model: google(modelName),
          messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image', image: imageBuffer, mediaType: 'image/jpeg' }] }],
          temperature: 0.1,
        });
        console.log(`✅ Receipt AI succeeded with ${modelName} on attempt ${attempt}`);
        return result;
      } catch (err: any) {
        const isOverloaded = err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE') || err?.message?.includes('overloaded') || err?.message?.includes('high demand');
        const isLastAttempt = attempt === maxAttempts;
        const isLastModel = modelIdx === models.length - 1;
        if (isOverloaded && !isLastAttempt) {
          const delay = attempt * 2000;
          console.warn(`⚠️ ${modelName} overloaded (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        } else if (isOverloaded && isLastAttempt && !isLastModel) {
          console.warn(`⚠️ ${modelName} unavailable after ${maxAttempts} attempts. Switching to fallback model...`);
          break; // try next model
        } else {
          throw err; // non-overload error, throw immediately
        }
      }
    }
  }
  throw new Error('All Gemini models are currently unavailable. Please try again in a few minutes.');
}

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error("❌ Gemini API Key is missing in .env.local");
    return NextResponse.json({ 
      error: "Google Gemini API Key is missing. Please configure GOOGLE_API_KEY in .env.local." 
    }, { status: 500 });
  }

  try {
    const { image, orderId, txId, orderTotal, ripSender } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Missing receipt image" }, { status: 400 });
    }
    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }
    if (!txId) {
      return NextResponse.json({ error: "Missing entered transaction ID" }, { status: 400 });
    }

    // 1. Prepare base64 image for Vercel AI SDK / Gemini
    const base64Data = image.startsWith('data:') 
      ? image.split(';base64,').pop() 
      : image;

    if (!base64Data) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    const imageBuffer = Buffer.from(base64Data, 'base64');
    const google = createGoogleGenerativeAI({ apiKey });

    // Fetch UI settings to calculate required deposit (versement)
    let requiredAmount = orderTotal;
    try {
      const settingsDoc = await getDoc(doc(db, "settings", "ui"));
      if (settingsDoc.exists()) {
        const uiConfig = settingsDoc.data();
        const depType = uiConfig.baridimobMinDepositType || 'none';
        const depVal = Number(uiConfig.baridimobMinDepositValue) || 0;
        
        if (depType === 'percentage' && depVal > 0) {
          requiredAmount = (orderTotal * depVal) / 100;
        } else if (depType === 'fixed' && depVal > 0) {
          requiredAmount = Math.min(orderTotal, depVal);
        }
      }
    } catch (e) {
      console.warn("Could not retrieve uiConfig settings for deposit check:", e);
    }

    // 2. Perform AI OCR & Fraud Analysis via Gemini 2.5 Flash
    const prompt = `
      You are an automated Algerian banking receipt verification assistant. 
      Analyze the uploaded payment receipt screenshot. This is typically a BaridiMob (Algeria Post mobile app) transfer confirmation or a CCP paper slip.
      
      Tasks:
      1. Verify if this image is actually a valid payment receipt or transfer confirmation (CCP or BaridiMob).
      2. Extract the transaction ID (Numéro de transaction / Référence). Note: BaridiMob transaction IDs are usually 16 to 22 digits.
      3. Extract the total amount transferred in Algerian Dinars (DZD). Compare it with the minimum expected amount of ${requiredAmount} DZD.
      4. Extract the sender RIP (Clé/Compte CCP or RIP beginning with 007) and transaction date/time if visible.
      5. Perform a visual security scan: check for any signs of tampering (cloned text, mismatched fonts, overlapping text, edits around the amount or reference number).
      
      Match details:
      - Expected Transaction ID: "${txId}"
      - Expected Minimum Amount (Versement/Total): ${requiredAmount} DZD

      Format your response strictly as a JSON object, without any markdown formatting blocks.
      Ensure the JSON has the following exact keys:
      {
        "isReceipt": boolean,
        "extractedTxId": string (raw extracted transaction ID, clean digits only, empty if not found),
        "extractedAmount": number (the transaction amount in DZD, strictly numeric, 0 if not found),
        "extractedSenderRip": string (sender RIP or CCP account number, empty if not found),
        "extractedDate": string (transaction date and time, empty if not found),
        "confidenceScore": number (OCR confidence from 0 to 100),
        "isAltered": boolean (true if photoshop or text modifications are suspected),
        "fraudAssessment": string (detailed explanation of any security issues or font edits, written in French/Arabic),
        "verdict": "approved" | "suspicious" | "invalid" | "needs_manual_review"
      }
      
      Verdict guidelines:
      - "approved": If isReceipt is true, amount is greater than or equal to ${requiredAmount} DZD, transaction ID matches (or is 90%+ similar due to OCR minor typos), and there are no signs of tampering (isAltered is false).
      - "needs_manual_review": If it is a valid receipt, but the amount is slightly below expected, the image is blurry, or the transaction ID does not match.
      - "suspicious": If isAltered is true, or if it clearly does not look like a genuine receipt.
      - "invalid": If the uploaded image is completely unrelated (e.g. self-portraits, blank screens, documents, etc.).
    `;

    const aiResponse = await generateWithRetry(google, prompt, imageBuffer);

    // Parse the output safely
    let responseText = aiResponse.text.trim();
    
    // Strip markdown formatting if Gemini included it
    if (responseText.startsWith('```json')) {
      responseText = responseText.substring(7);
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.substring(0, responseText.length - 3);
    }
    responseText = responseText.trim();

    let report: any;
    try {
      report = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON. Raw text:", responseText);
      return NextResponse.json({
        error: "AI parsing error. The receipt analysis output was invalid.",
        rawText: responseText
      }, { status: 500 });
    }

    // 3. Database Check: Check for Duplicate Receipts (Double-use prevention)
    // We check if any OTHER order has already registered the same transaction ID
    let isDuplicate = false;
    let duplicateOrderId = "";

    const txToCheck = [txId.trim()];
    if (report.extractedTxId && report.extractedTxId.trim() && report.extractedTxId.trim() !== txId.trim()) {
      txToCheck.push(report.extractedTxId.trim());
    }

    for (const singleTxId of txToCheck) {
      if (!singleTxId || singleTxId.length < 5) continue; // avoid matching short strings or empty fields
      
      const q = query(
        collection(db, "orders"),
        where("baridimobTxId", "==", singleTxId)
      );
      
      const snap = await getDocs(q);
      const otherOrders = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((o: any) => o.id !== orderId && o.paymentStatus !== "Refusé"); // ignore current order and previously rejected ones
      
      if (otherOrders.length > 0) {
        isDuplicate = true;
        duplicateOrderId = otherOrders[0].id;
        break;
      }
    }

    if (isDuplicate) {
      report.verdict = "suspicious";
      report.fraudAssessment = report.fraudAssessment 
        ? `${report.fraudAssessment} [FRAUD_ALERT: Ce reçu de virement a déjà été utilisé pour la commande #${duplicateOrderId.slice(-6).toUpperCase()}]`
        : `Ce reçu de virement a déjà été utilisé pour une autre commande (#${duplicateOrderId.slice(-6).toUpperCase()}). Accès bloqué.`;
    }

    return NextResponse.json({
      success: true,
      report,
      isDuplicate,
      duplicateOrderId
    });

  } catch (error: any) {
    console.error("❌ Receipt Verification Error:", error);
    return NextResponse.json({
      error: "Verification failed due to an internal server error.",
      details: error.message || "Unknown error"
    }, { status: 500 });
  }
}
