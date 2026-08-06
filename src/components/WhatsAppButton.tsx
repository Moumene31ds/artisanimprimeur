"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function WhatsAppButton() {
  const { language } = useAppStore();
  const phoneNumber = "213549179000"; // رقم هاتفك الشخصي
  
  const message = language === 'ar' 
    ? "مرحباً L'Artisan، أريد الاستفسار عن خدمات الطباعة." 
    : "Bonjour L'Artisan, je voudrais me renseigner sur vos services d'impression.";
    
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      // ✅ تم تعديل هذه الكلاسات لجعله يظهر في مكان زر الشات بوت السابق (أسفل اليمين)
      className={`fixed bottom-[calc(10rem+env(safe-area-inset-bottom))] md:bottom-8 right-6 z-[998] w-14 h-14 bg-[#25D366] text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/40 border border-white/20 min-tap`}
      title="Contactez-nous sur WhatsApp"
    >
      {/* تأثير النبض المستمر */}
      <span className="absolute inset-0 rounded-2xl bg-green-400 animate-ping opacity-25"></span>
      <MessageCircle size={28} fill="currentColor" className="text-white" />
    </motion.a>
  );
}
