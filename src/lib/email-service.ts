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
