"use client";

import { CheckCircle, Home, ListChecks, PartyPopper, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import confetti from "canvas-confetti"; // تأثير الاحتفال الرائع

function SuccessContent() {
  const { language } = useAppStore();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  
  const [loading, setLoading] = useState(!!orderId);
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "failed" | "pending" | "cod">("cod");
  const [orderDetails, setOrderDetails] = useState<any>(null);

  const isRtl = language === "ar";

  useEffect(() => {
    // إطلاق تأثير قصاصات الورق الاحتفالية عند الدفع أو التسجيل الناجح
    const triggerConfetti = () => {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);
    };

    const verifyPayment = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        const orderRef = doc(db, "orders", orderId);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
          const orderData = orderSnap.data();
          setOrderDetails(orderData);
          setPaymentStatus("cod");
          triggerConfetti();
        }
      } catch (err) {
        console.error("Error verifying payment:", err);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <Loader2 className="animate-spin text-accent mb-4" size={48} />
        <p className="text-slate-500 dark:text-slate-400 font-bold">
          {isRtl ? "جاري التحقق من حالة الدفع والطلب..." : "Vérification du paiement en cours..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4" dir={isRtl ? 'rtl' : 'ltr'}>
      {paymentStatus === "failed" ? (
        <motion.div
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          className="relative w-32 h-32 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-8 shadow-2xl border-4 border-red-200 dark:border-red-800"
        >
          <AlertCircle size={64} />
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0, rotate: -180 }} 
          animate={{ scale: 1, rotate: 0 }} 
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative w-32 h-32 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-green-500/20 border-4 border-green-200 dark:border-green-800"
        >
          <CheckCircle size={64} />
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -top-4 -right-4 p-2 bg-yellow-100 text-yellow-500 rounded-full"
          >
            <PartyPopper size={24} />
          </motion.div>
        </motion.div>
      )}

      <motion.h1 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight"
      >
        {paymentStatus === "failed" 
          ? (isRtl ? "فشل التحقق من الدفع" : "Échec de la vérification du paiement")
          : (isRtl ? "تم استلام طلبك بنجاح!" : "Commande reçue avec succès !")}
      </motion.h1>

      <motion.p 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="text-slate-500 dark:text-slate-400 max-w-lg mb-6 font-medium leading-relaxed text-lg"
      >
        {paymentStatus === "failed"
          ? (isRtl 
              ? "نعتذر، لم نتمكن من تأكيد عملية الدفع. يرجى التحقق من بيانات التحويل والمحاولة مجدداً."
              : "Désolé, nous n'avons pas pu vérifier votre paiement. Veuillez vérifier vos informations et réessayer.")
          : paymentStatus === "paid"
            ? (isRtl
                ? "شكراً لك! تم تأكيد استلام المبلغ عبر بريدي موب بنجاح. طلبك الآن قيد المراجعة الفنية للتصميم."
                : "Merci ! Votre paiement BaridiMob a été vérifié avec succès. Votre commande est en cours de conception.")
            : (isRtl 
                ? "شكراً لثقتك بنا. سنقوم بمعالجة طلبك فوراً. يمكنك متابعة حالة الطلب خطوة بخطوة من خلال صفحة طلباتي." 
                : "Merci pour votre confiance. Nous traiterons votre commande immédiatement. Vous pouvez suivre son statut sur la page de vos commandes.")}
      </motion.p>

      {/* بطاقة تفاصيل الفاتورة والدفع */}
      {orderDetails && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="w-full max-w-md p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 mb-10 text-right md:text-left flex flex-col gap-3 shadow-md backdrop-blur-sm"
        >
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-slate-800">
            <span className="font-black text-slate-700 dark:text-slate-300 text-sm">
              {isRtl ? "تفاصيل الفاتورة" : "Détails de la facture"}
            </span>
            <span className="text-xs font-bold text-slate-400">
              ID: {orderId?.substring(0, 8)}...
            </span>
          </div>
          
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-400">{isRtl ? "المستلم:" : "Client:"}</span>
            <span className="text-slate-700 dark:text-slate-200">{orderDetails.customerName}</span>
          </div>
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-400">{isRtl ? "رقم الهاتف:" : "Téléphone:"}</span>
            <span className="text-slate-700 dark:text-slate-200">{orderDetails.phone}</span>
          </div>
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-400">{isRtl ? "طريقة الدفع:" : "Paiement:"}</span>
            <span className="text-slate-700 dark:text-slate-200">
              {orderDetails.paymentMethod === "BaridiMob" ? (isRtl ? "تحويل بريدي موب" : "BaridiMob") : (isRtl ? "الدفع عند الاستلام" : "Paiement à la réception")}
            </span>
          </div>
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-400">{isRtl ? "حالة الدفع:" : "Statut paiement:"}</span>
            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black ${
              orderDetails.paymentStatus === "paid" || paymentStatus === "paid"
                ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                : paymentStatus === "failed"
                  ? "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
            }`}>
              {orderDetails.paymentStatus === "paid" || paymentStatus === "paid"
                ? (isRtl ? "تم الدفع بنجاح" : "Payé")
                : paymentStatus === "failed"
                  ? (isRtl ? "فشل عملية الدفع" : "Échoué")
                  : (isRtl ? "في انتظار الدفع" : "En attente")}
            </span>
          </div>
          
          <div className="h-px bg-slate-200/50 dark:bg-slate-800 my-1" />
          
          <div className="flex justify-between text-sm font-black">
            <span className="text-slate-800 dark:text-slate-100">{isRtl ? "المجموع الإجمالي الكلي:" : "Total payé:"}</span>
            <span className="text-accent dark:text-blue-400">{orderDetails.total} {isRtl ? "دج" : "DA"}</span>
          </div>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
      >
        <Link 
          href="/orders" 
          className="flex items-center justify-center gap-2 px-8 py-4 bg-accent hover:bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <ListChecks size={20} /> {isRtl ? "تتبع طلبي" : "Suivre ma commande"}
        </Link>
        <Link 
          href="/" 
          className="flex items-center justify-center gap-2 px-8 py-4 premium-glass text-slate-700 dark:text-slate-200 rounded-2xl font-bold hover:shadow-lg transition-all hover:scale-105 active:scale-95 border border-slate-200 dark:border-slate-700"
        >
          <Home size={20} /> {isRtl ? "العودة للرئيسية" : "Retour à l'accueil"}
        </Link>
      </motion.div>
    </div>
  );
}

export default function SuccessPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Suspense fallback={
      <div className="min-h-[75vh] flex flex-col items-center justify-center text-center">
        <Loader2 className="animate-spin text-accent mb-4" size={48} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
