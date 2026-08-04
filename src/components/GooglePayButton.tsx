"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Loader2, ShieldCheck, AlertTriangle, Smartphone } from "lucide-react";

// -----------------------------------------------
// Google Pay — Bouton de paiement avancé (Stripe Payment Request)
// -----------------------------------------------
// Caractéristiques pro :
//  - Détection automatique Google Pay / Apple Pay / cartes du navigateur.
//  - Recalcule le montant côté serveur (jamais le total du client).
//  - Vérification 3D Secure automatique (request_three_d_secure: 'any').
//  - Idempotence + retour sécurisé : la commande n'est créée qu'après
//    confirmation "succeeded" vérifiée côté serveur.
//  - États complets : vérification → prêt → traitement → erreur → indisponible.
//  - Dégradation élégante : si Stripe n'est pas configuré, rien ne s'affiche
//    et aucune erreur console n'est générée.

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const GP_CURRENCY = (process.env.NEXT_PUBLIC_GP_CURRENCY || "dzd").toLowerCase();
const MERCHANT_COUNTRY = (process.env.NEXT_PUBLIC_GP_MERCHANT_COUNTRY || "DZ").toUpperCase();

// Currencies à 0 décimales (identiques à la règle serveur).
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

function toMinorUnits(amount: number, currency: string): number {
  if (ZERO_DECIMAL.has(currency)) return Math.round(amount);
  return Math.round(amount * 100);
}

interface GooglePayButtonProps {
  /** Montant final attendu en unités majeures (DA). */
  amount: number;
  items: Array<{ id: string | number; name?: string; price: number; quantity: number; category?: string }>;
  deliveryFee: number;
  discountAmount: number;
  customer: { name: string; phone: string; wilaya: string; notes?: string };
  delivery?: { type?: "domicile" | "desk"; shippingMethod?: string; promoCode?: string | null };
  language: "ar" | "fr";
  onSuccess: (orderId: string) => void;
}

type ButtonState = "checking" | "ready" | "processing" | "error" | "unavailable" | "disabled";

const T = {
  ar: {
    label: "الدفع بضغطة واحدة عبر Google Pay",
    secure: "مدفوع بأمان عبر Stripe · مشفّر و 3D Secure",
    processing: "جاري معالجة الدفع…",
    unavailable: "الدفع عبر Google Pay غير متاح حالياً على جهازك",
    disabled: "أكمل بيانات الشحن واختر ولايتك لتفعيل الدفع",
    error: "فشل الدفع. حاول مرة أخرى أو استخدم الدفع عند الاستلام.",
    gpay: "دفع",
    apple: "Apple Pay",
    card: "بطاقة",
    tap: "ادفع بـ",
  },
  fr: {
    label: "Payez en un clic avec Google Pay",
    secure: "Paiement sécurisé par Stripe · chiffré & 3D Secure",
    processing: "Traitement du paiement…",
    unavailable: "Google Pay n'est pas disponible sur cet appareil",
    disabled: "Complétez vos informations et sélectionnez votre wilaya",
    error: "Paiement échoué. Réessayez ou utilisez le paiement à la livraison.",
    gpay: "Payer",
    apple: "Apple Pay",
    card: "Carte",
    tap: "Payer avec",
  },
};

export default function GooglePayButton({
  amount,
  items,
  deliveryFee,
  discountAmount,
  customer,
  delivery,
  language,
  onSuccess,
}: GooglePayButtonProps) {
  const t = T[language];
  const isRtl = language === "ar";

  const [state, setState] = useState<ButtonState>("checking");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const buttonElementRef = useRef<any>(null);
  const paymentRequestRef = useRef<any>(null);
  const destroyedRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const canEnable = Boolean(
    amount > 0 &&
    customer.name.trim() &&
    /^(0)(5|6|7)[0-9]{8}$/.test(customer.phone.trim()) &&
    customer.wilaya.trim()
  );

  const stateRef = useRef<ButtonState>("checking");
  stateRef.current = state;

  const buildAndMount = useCallback(async () => {
    if (!PUBLISHABLE_KEY) {
      setState("unavailable");
      return;
    }

    destroyedRef.current = false;

    // 1) Récupérer un PaymentIntent préparé côté serveur (montant recalculé là-bas).
    let intent: { clientSecret: string; paymentIntentId: string; amount: number; currency: string };
    try {
      const res = await fetch("/api/payments/google-pay/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, deliveryFee, discountAmount }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        setState("unavailable");
        return;
      }
      intent = data;
    } catch {
      setState("unavailable");
      return;
    }

    if (destroyedRef.current) return;

    // 2) Charger Stripe.js et préparer le PaymentRequest (Google Pay / Apple Pay).
    let stripe = stripeRef.current;
    if (!stripe) {
      stripe = await loadStripe(PUBLISHABLE_KEY);
      if (!stripe) {
        setState("unavailable");
        return;
      }
      stripeRef.current = stripe;
    }

    const currency = (intent.currency || GP_CURRENCY).toLowerCase();
    const amountMinor = toMinorUnits(Number(intent.amount) || amount, currency);

    const options = {
      country: MERCHANT_COUNTRY,
      currency,
      total: {
        label: "L'Artisan Imprimeur",
        amount: amountMinor,
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: false,
      requestShipping: false,
      disableWallets: ["link"] as "link"[],
    };

    const paymentRequest = stripe.paymentRequest(options);
    paymentRequestRef.current = paymentRequest;

    const onPaymentMethod = async (ev: any) => {
      if (stateRef.current === "processing") return;
      setState("processing");
      setErrorMsg("");
      try {
        const { paymentIntent, error } = await stripe!.confirmCardPayment(intent.clientSecret, {
          payment_method: ev.paymentMethod.id,
        });

        if (error) {
          throw new Error(error.message || "payment_error");
        }

        if (paymentIntent?.status !== "succeeded") {
          throw new Error(`Unexpected status: ${paymentIntent?.status}`);
        }

        // 3) Confirmation serveur + création de la commande (idempotent).
        const completeRes = await fetch("/api/payments/google-pay/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            customer: {
              name: customer.name,
              phone: customer.phone,
              wilaya: customer.wilaya,
              notes: customer.notes || "",
            },
            delivery: {
              type: delivery?.type || "domicile",
              shippingMethod: delivery?.shippingMethod || "national",
              wilaya: customer.wilaya,
              fee: deliveryFee,
              discount: discountAmount,
              promoCode: delivery?.promoCode || null,
            },
            items,
          }),
        });
        const completeData = await completeRes.json();

        if (!completeRes.ok || !completeData.success) {
          throw new Error(completeData.error || "server_error");
        }

        ev.complete("success");
        onSuccessRef.current(completeData.orderId);
      } catch (err: any) {
        console.error("Google Pay flow failed:", err);
        try { ev.complete("fail"); } catch { /* ignore */ }
        setErrorMsg(err?.message || t.error);
        setState("error");
      }
    };

    paymentRequest.on("paymentmethod", onPaymentMethod);
    paymentRequest.on("cancel", () => {
      if (state === "processing") setState("ready");
    });

    const canMake = await paymentRequest.canMakePayment();
    if (destroyedRef.current) return;

    if (!canMake) {
      setState("unavailable");
      return;
    }

    // 3) Monter le bouton natif Google Pay.
    const elements = stripe.elements();
    const buttonElement = elements.create("paymentRequestButton", {
      paymentRequest,
      style: {
        paymentRequestButton: {
          type: "buy",
          theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
          height: "48px",
        },
      },
    });
    buttonElementRef.current = buttonElement;

    if (containerRef.current) {
      buttonElement.mount(containerRef.current);
    }
    setState("ready");
  }, [amount, items, deliveryFee, discountAmount, customer.name, customer.phone, customer.wilaya, customer.notes, delivery?.type, delivery?.shippingMethod, delivery?.promoCode]);

  useEffect(() => {
    if (!canEnable) {
      setState("disabled");
      return;
    }
    setState("checking");
    const timer = setTimeout(() => {
      buildAndMount();
    }, 120);

    return () => {
      clearTimeout(timer);
      destroyedRef.current = true;
      try {
        buttonElementRef.current?.destroy();
      } catch { /* ignore */ }
      buttonElementRef.current = null;
      paymentRequestRef.current = null;
    };
  }, [canEnable, amount, buildAndMount]);

  const errorLabel = T[language].error;

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {state === "checking" && (
          <motion.div
            key="checking"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse flex items-center justify-center gap-2"
          >
            <Loader2 size={16} className="animate-spin text-slate-400" />
            <span className="text-[11px] font-bold text-slate-400">{t.processing}</span>
          </motion.div>
        )}

        {state === "ready" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-2"
          >
            <div ref={containerRef} className="w-full [&>div]:!w-full min-h-[48px]" />
            <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
              <Lock size={10} className="shrink-0" />
              {t.secure}
            </p>
          </motion.div>
        )}

        {state === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center gap-2 font-black text-xs"
          >
            <Loader2 size={18} className="animate-spin" />
            {t.processing}
          </motion.div>
        )}

        {state === "disabled" && (
          <motion.div
            key="disabled"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-[10px] font-bold text-slate-400"
          >
            <AlertTriangle size={14} className="shrink-0 text-amber-500" />
            {t.disabled}
          </motion.div>
        )}

        {state === "unavailable" && (
          <motion.div
            key="unavailable"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 flex items-center gap-2 text-[10px] font-bold text-slate-400"
          >
            <Smartphone size={14} className="shrink-0" />
            {t.unavailable}
          </motion.div>
        )}

        {state === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full flex flex-col gap-2"
          >
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 flex items-center gap-2 text-[10px] font-bold text-red-600 dark:text-red-400">
              <AlertTriangle size={14} className="shrink-0" />
              {errorMsg || errorLabel}
            </div>
            <button
              type="button"
              onClick={() => { setState("checking"); buildAndMount(); }}
              className="w-full py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck size={14} />
              {isRtl ? "إعادة محاولة الدفع" : "Réessayer le paiement"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
