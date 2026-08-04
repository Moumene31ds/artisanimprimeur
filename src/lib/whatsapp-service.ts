import { formatWhatsAppPhone } from './phone-utils';

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessPhone: string;
  apiVersion?: string;
}

function getConfig(): WhatsAppConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const businessPhone = process.env.WHATSAPP_BUSINESS_PHONE;

  if (!phoneNumberId || !accessToken || !businessPhone) {
    return null;
  }

  return { phoneNumberId, accessToken, businessPhone };
}

interface WhatsAppMessage {
  to: string;
  templateName?: string;
  templateParams?: string[];
  body?: string;
}

export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const config = getConfig();
  if (!config) {
    return { success: false, error: 'WhatsApp not configured' };
  }

  try {
    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formatWhatsAppPhone(message.to),
      type: 'template',
    };

    if (message.templateName) {
      body.type = 'template';
      body.template = {
        name: message.templateName,
        language: { code: 'fr' },
        components: message.templateParams
          ? [{ type: 'body', parameters: message.templateParams.map((p) => ({ type: 'text', text: p })) }]
          : [],
      };
    } else if (message.body) {
      body.type = 'text';
      body.text = { preview_url: true, body: message.body };
    }

    const response = await fetch(
      `${WHATSAPP_API_BASE}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error?.message || 'WhatsApp API error' };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

export async function sendOrderConfirmation(
  phone: string,
  customerName: string,
  orderId: string,
  total: number
) {
  const message =
    `🖨️ *L'Artisan Imprimeur - Confirmation de commande*\n\n` +
    `Bonjour *${customerName}*,\n\n` +
    `✅ Votre commande #${orderId.slice(-6).toUpperCase()} a été reçue avec succès !\n\n` +
    `📋 *Récapitulatif:*\n` +
    `• Numéro: #${orderId.slice(-6).toUpperCase()}\n` +
    `• Montant: ${total} DA\n` +
    `• Statut: En attente de traitement\n\n` +
    `📌 Vous serez notifié dès que votre commande sera en cours de traitement.\n\n` +
    `🔗 Suivez votre commande: ${process.env.NEXT_PUBLIC_APP_URL || 'https://artisanimprimeur.vercel.app'}/orders\n\n` +
    `Merci de votre confiance 🙏`;

  return sendWhatsAppMessage({ to: phone, body: message });
}

export async function sendOrderStatusUpdate(
  phone: string,
  customerName: string,
  orderId: string,
  newStatus: string
) {
  const statusLabels: Record<string, string> = {
    'En attente': '📋 En attente',
    'Conception': '🎨 En conception',
    'Impression': '🖨️ En impression',
    'Découpage': '✂️ Découpage',
    'Façonnage': '📐 Façonnage',
    'Contrôle qualité': '🔍 Contrôle qualité',
    'Prêt': '✅ Prêt',
    'Terminé': '🎉 Terminé',
    'Annulé': '❌ Annulé',
  };

  const message =
    `🖨️ *L'Artisan Imprimeur - Mise à jour de commande*\n\n` +
    `Bonjour *${customerName}*,\n\n` +
    `📦 Votre commande #${orderId.slice(-6).toUpperCase()} a changé de statut :\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `  ${statusLabels[newStatus] || newStatus}\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `🔗 Suivez votre commande: ${process.env.NEXT_PUBLIC_APP_URL || 'https://artisanimprimeur.vercel.app'}/orders`;

  return sendWhatsAppMessage({ to: phone, body: message });
}

export async function sendBATNotification(
  phone: string,
  customerName: string,
  orderId: string,
  batUrl: string
) {
  const message =
    `🖨️ *L'Artisan Imprimeur - Bon à Tirer (BAT)*\n\n` +
    `Bonjour *${customerName}*,\n\n` +
    `🎨 Votre Bon à Tirer (BAT) pour la commande #${orderId.slice(-6).toUpperCase()} est prêt !\n\n` +
    `📎 Lien du BAT: ${batUrl}\n\n` +
    `⚠️ *Merci de vérifier votre BAT et de confirmer votre approbation* pour lancer l'impression.\n` +
    `🔗 Répondre sur: ${process.env.NEXT_PUBLIC_APP_URL || 'https://artisanimprimeur.vercel.app'}/orders/${orderId}`;

  return sendWhatsAppMessage({ to: phone, body: message });
}

export async function sendOrderReadyNotification(
  phone: string,
  customerName: string,
  orderId: string
) {
  const message =
    `🖨️ *L'Artisan Imprimeur - Commande prête !*\n\n` +
    `Bonjour *${customerName}*,\n\n` +
    `✅ Votre commande #${orderId.slice(-6).toUpperCase()} est *prête* !\n\n` +
    `📍 Vous pouvez venir la récupérer à notre atelier ou nous contacter pour la livraison.\n\n` +
    `📞 Contactez-nous: ${process.env.NEXT_PUBLIC_CONTACT_PHONE || '+213549179000'}\n\n` +
    `Merci de votre confiance 🙏`;

  return sendWhatsAppMessage({ to: phone, body: message });
}

export async function sendPromotionalMessage(
  phone: string,
  promoCode: string,
  discountValue: number,
  discountType: string
) {
  const discountText = discountType === 'percent'
    ? `${discountValue}% de réduction`
    : `${discountValue} DA de réduction`;

  const message =
    `🎉 *L'Artisan Imprimeur - Offre spéciale !*\n\n` +
    `Bonjour,\n\n` +
    `Profitez de *${discountText}* sur votre prochaine commande !\n\n` +
    `🎟️ Code promo: *${promoCode}*\n\n` +
    `🛒 Commandez maintenant: ${process.env.NEXT_PUBLIC_APP_URL || 'https://artisanimprimeur.vercel.app'}\n\n` +
    `Offre valable pour une durée limitée ⏳`;

  return sendWhatsAppMessage({ to: phone, body: message });
}

export async function sendAbandonedCartReminder(
  phone: string,
  customerName: string
) {
  const message =
    `🛒 *L'Artisan Imprimeur - Panier abandonné*\n\n` +
    `Bonjour *${customerName}*,\n\n` +
    `Nous avons remarqué que vous n'avez pas finalisé votre commande 😊\n\n` +
    `🔗 Retrouvez votre panier et finalisez votre commande:\n` +
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://artisanimprimeur.vercel.app'}/cart\n\n` +
    `Des questions ? Contactez-nous au ${process.env.NEXT_PUBLIC_CONTACT_PHONE || '+213549179000'} 📞`;

  return sendWhatsAppMessage({ to: phone, body: message });
}

export async function verifyWebhook(mode: string, token: string, challenge: string): Promise<string | null> {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && token === verifyToken) {
    return challenge;
  }
  return null;
}
