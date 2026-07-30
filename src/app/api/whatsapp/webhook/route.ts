import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/whatsapp-service";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (!mode || !token || !challenge) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const result = await verifyWebhook(mode, token, challenge);

  if (result) {
    return new NextResponse(result, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ok" });
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;

        for (const message of change.value?.messages || []) {
          if (message.type === "text") {
            const from = message.from;
            const text = message.text?.body?.toLowerCase().trim();
            const messageId = message.id;

            await handleIncomingMessage(from, text, messageId);
          }

          if (message.type === "interactive") {
            const from = message.from;
            const reply = message.interactive?.button_reply?.id;
            const listReply = message.interactive?.list_reply?.id;
            const responseId = reply || listReply;

            if (responseId) {
              await handleInteractiveResponse(from, responseId, message.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json({ status: "ok" });
  }
}

async function handleIncomingMessage(from: string, text: string, messageId: string) {
  if (text === "suivi" || text === "order" || text === "طلب" || text === "commands") {
    const message =
      `🔍 *Suivi de commande*\n\n` +
      `Pour suivre votre commande, veuillez envoyer votre numéro de commande (ex: #A1B2C3).\n\n` +
      `Ou visitez: ${process.env.NEXT_PUBLIC_APP_URL || 'https://artisanimprimeur.vercel.app'}/orders`;

    await sendTextReply(from, message);
    return;
  }

  if (text === "contact" || text === "اتصال" || text === "aide" || text === "help" || text === "مساعدة") {
    const message =
      `📞 *Contactez-nous*\n\n` +
      `📍 Adresse: Cité Akid Lotfi, Oran\n` +
      `📱 Téléphone: ${process.env.NEXT_PUBLIC_CONTACT_PHONE || '+213549179000'}\n` +
      `📧 Email: imprimeurlartisan@gmail.com\n\n` +
      `🕐 Horaires: Dim - Jeu: 09:00 - 18:00`;

    await sendTextReply(from, message);
    return;
  }

  if (text === "catalogue" || text === "كتالوج" || text === "products" || text === "produits" || text === "منتجات") {
    const message =
      `🖨️ *Notre Catalogue*\n\n` +
      `Découvrez nos produits:\n\n` +
      `• Cartes de visite\n` +
      `• Flyers & Dépliants\n` +
      `• Affiches & Posters\n` +
      `• Stickers & Goodies\n` +
      `• Rollups & Bannières\n\n` +
      `🔗 Voir tout le catalogue: ${process.env.NEXT_PUBLIC_APP_URL || 'https://artisanimprimeur.vercel.app'}`;

    await sendTextReply(from, message);
    return;
  }

  const message =
    `👋 *Bienvenue chez L'Artisan Imprimeur !*\n\n` +
    `Je suis votre assistant virtuel. Voici ce que je peux faire pour vous:\n\n` +
    `📦 *Suivi de commande* - Tapez "suivi"\n` +
    `🖨️ *Catalogue* - Tapez "catalogue"\n` +
    `📞 *Contact* - Tapez "contact"\n\n` +
    `Ou visitez notre site: ${process.env.NEXT_PUBLIC_APP_URL || 'https://artisanimprimeur.vercel.app'}\n\n` +
    `Comment puis-je vous aider ? 😊`;

  await sendTextReply(from, message);
}

async function handleInteractiveResponse(from: string, responseId: string, messageId: string) {
}

async function sendTextReply(to: string, text: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) return;

  try {
    await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: true, body: text },
        }),
      }
    );
  } catch (error) {
    console.error("WhatsApp reply error:", error);
  }
}
