// src/lib/email-service.ts
import { Resend } from "resend";
import { WelcomeTemplate } from "@/components/emails/WelcomeTemplate";
import { AbandonedCartTemplate } from "@/components/emails/AbandonedCartTemplate";
import * as React from "react";

let resend: Resend | null = null;

function getResendInstance() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Missing API key. Pass it to the constructor new Resend('re_123')");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || "L'Artisan Imprimeur <onboarding@resend.dev>";

/**
 * Triggers the Welcome & Promo code email upon user registration.
 */
export async function sendWelcomeEmail(to: string, displayName: string, promoCode: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ Resend skipped: RESEND_API_KEY is missing.");
    return { success: false, reason: "Missing API Key" };
  }

  try {
    const resendInstance = getResendInstance();
    const data = await resendInstance.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Bienvenue chez L'Artisan Imprimeur ! ✨",
      react: React.createElement(WelcomeTemplate, {
        displayName,
        promoCode,
      }),
    });

    console.log(`✉️ Welcome email dispatched to ${to}. Message ID: ${data.data?.id}`);
    return { success: true, id: data.data?.id };
  } catch (error) {
    console.error("❌ Failed to send welcome email:", error);
    return { success: false, error };
  }
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  selectedOptions?: {
    finition?: string;
    paper?: string;
    corners?: string;
    lamination?: string;
  };
}

/**
 * Triggers the Abandoned Cart recovery email.
 */
export async function sendAbandonedCartEmail(
  to: string,
  displayName: string,
  cartItems: CartItem[],
  checkoutUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ Resend skipped: RESEND_API_KEY is missing.");
    return { success: false, reason: "Missing API Key" };
  }

  try {
    const resendInstance = getResendInstance();
    const data = await resendInstance.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Votre panier vous attend chez L'Artisan Imprimeur 🛒",
      react: React.createElement(AbandonedCartTemplate, {
        displayName,
        cartItems,
        checkoutUrl,
      }),
    });

    console.log(`✉️ Abandoned cart email dispatched to ${to}. Message ID: ${data.data?.id}`);
    return { success: true, id: data.data?.id };
  } catch (error) {
    console.error("❌ Failed to send abandoned cart email:", error);
    return { success: false, error };
  }
}

/**
 * Generic plain-text email used by marketing automations and order
 * notifications. Safe no-op when RESEND_API_KEY is not configured.
 */
export async function sendSimpleEmail(
  to: string,
  subject: string,
  textBody: string
): Promise<{ success: boolean; id?: string; reason?: string; error?: unknown }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️ Resend skipped: RESEND_API_KEY is missing.");
    return { success: false, reason: "Missing API Key" };
  }
  if (!to) return { success: false, reason: "Missing recipient email" };

  try {
    const resendInstance = getResendInstance();
    const data = await resendInstance.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      text: textBody,
    });
    console.log(`✉️ Email dispatched to ${to} — "${subject}". Message ID: ${data.data?.id}`);
    return { success: true, id: data.data?.id };
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return { success: false, error };
  }
}

/**
 * Order status change notification email (lightweight, no template needed).
 */
export async function sendOrderStatusEmail(
  to: string,
  customerName: string,
  orderId: string,
  status: string
) {
  const text =
    `L'Artisan Imprimeur — Mise à jour de votre commande\n\n` +
    `Bonjour ${customerName},\n\n` +
    `Votre commande #${orderId.slice(-6).toUpperCase()} est maintenant : ${status}.\n\n` +
    `Suivez votre commande ici : ${process.env.NEXT_PUBLIC_APP_URL || 'https://artisanimprimeur.vercel.app'}/orders\n\n` +
    `Merci de votre confiance.`;

  return sendSimpleEmail(to, `Commande #${orderId.slice(-6).toUpperCase()} — ${status}`, text);
}
