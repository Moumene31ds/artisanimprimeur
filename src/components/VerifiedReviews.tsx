// src/components/VerifiedReviews.tsx
"use client";

import { useEffect, useState } from "react";
import { getRecentReviewsAction, submitReviewAction } from "@/app/actions/review-actions";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ShieldCheck, User, MessageSquare, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface VerifiedReviewsProps {
  userId?: string | null;
}

export default function VerifiedReviews({ userId }: VerifiedReviewsProps) {
  const { language } = useAppStore();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [orderId, setOrderId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isRtl = language === "ar";

  const t = {
    title: isRtl ? "آراء عملائنا الأوفياء" : "Avis de nos Clients",
    subtitle: isRtl ? "مراجعات موثقة من مشترين حقيقيين" : "Retours authentiques d'acheteurs vérifiés",
    leaveReview: isRtl ? "اكتب مراجعتك" : "Laisser un avis",
    commentPlaceholder: isRtl ? "شاركنا تجربتك مع جودة الطباعة والتوصيل..." : "Partagez votre expérience sur l'impression et la livraison...",
    orderIdPlaceholder: isRtl ? "رقم الطلب (اختياري - للحصول على شارة مشترٍ مؤكد)" : "ID de commande (Optionnel - pour le badge Acheteur Vérifié)",
    submitBtn: isRtl ? "إرسال المراجعة" : "Publier l'avis",
    verifiedBuyer: isRtl ? "مشتري مؤكد" : "Acheteur Vérifié",
    noReviews: isRtl ? "لا توجد مراجعات حالياً. كن أول من يشارك رأيه!" : "Aucun avis pour le moment. Soyez le premier !",
    starsRequired: isRtl ? "يرجى تحديد التقييم بالنجوم" : "Veuillez sélectionner une note.",
  };

  const loadReviews = async () => {
    setLoading(true);
    const res = await getRecentReviewsAction(15);
    if (res.success && res.reviews) {
      setReviews(res.reviews);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      toast.error(t.starsRequired);
      return;
    }

    setSubmitting(true);
    const res = await submitReviewAction({
      userId: userId || null,
      orderId: orderId.trim() || null,
      rating,
      comment: comment.trim() || null,
    });

    if (res.success) {
      toast.success(res.message);
      setComment("");
      setOrderId("");
      setRating(5);
      // Reload reviews
      loadReviews();
    } else {
      toast.error(res.error || "Une erreur est survenue.");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      
      {/* Title Header */}
      <div className={`text-center space-y-2 ${isRtl ? 'rtl' : 'ltr'}`}>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <MessageSquare className="text-accent" size={28} />
          {t.title}
        </h2>
        <p className="text-sm font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
          {t.subtitle}
        </p>
      </div>

      {/* Grid: Form Left, Feed Right */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        
        {/* Form Box (Glassmorphic) */}
        <motion.div 
          initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-2 premium-glass p-6 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-xl space-y-6"
        >
          <h3 className="font-black text-lg text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-3">
            {t.leaveReview}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Interactive Stars Selection */}
            <div className="flex justify-center items-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="transition-transform active:scale-90 hover:scale-110"
                >
                  <Star 
                    size={32} 
                    className={`cursor-pointer transition-colors ${
                      star <= (hoverRating ?? rating) 
                        ? "text-yellow-405 fill-yellow-400" 
                        : "text-slate-250 dark:text-slate-700"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comment Area */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t.commentPlaceholder}
              required
              rows={4}
              className="w-full text-xs p-4 rounded-2xl bg-white/70 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 outline-none focus:ring-1 focus:ring-accent font-bold text-slate-805 dark:text-slate-200 resize-none"
            />

            {/* Optional Order ID Input for Buyer verification */}
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder={t.orderIdPlaceholder}
              className="w-full text-xs p-4 rounded-2xl bg-white/70 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 outline-none focus:ring-1 focus:ring-accent font-bold text-slate-800 dark:text-slate-200"
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-slate-900 hover:bg-slate-850 dark:bg-accent dark:hover:bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-102 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Send size={14} className={isRtl ? "rotate-180" : ""} />
                  <span>{t.submitBtn}</span>
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Reviews Feed */}
        <div className="md:col-span-3 space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 size={24} className="animate-spin text-accent" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 premium-glass rounded-[2rem] border border-white/60 dark:border-white/10 text-xs font-bold text-slate-400">
                {t.noReviews}
              </div>
            ) : (
              reviews.map((review) => (
                <motion.div 
                  key={review.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="premium-glass p-5 rounded-[2rem] border border-white/60 dark:border-white/10 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-accent to-blue-400 text-white flex items-center justify-center text-sm font-bold border border-white/20">
                        {review.user?.photoUrl ? (
                          <img src={review.user.photoUrl} alt="User" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <User size={18} />
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-slate-800 dark:text-white leading-tight flex items-center gap-2">
                          {review.user?.displayName || (isRtl ? "مستخدم محلي" : "Artisan Client")}
                          
                          {/* Verified Buyer Badge */}
                          {review.isVerified && (
                            <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-250/20">
                              <ShieldCheck size={10} />
                              {t.verifiedBuyer}
                            </span>
                          )}
                        </h4>
                        
                        {/* Rating stars display */}
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              size={12} 
                              className={i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 dark:text-slate-800"} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                      {new Date(review.createdAt).toLocaleDateString(language === "ar" ? "ar-DZ" : "fr-CA", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-bold pl-1">
                    {review.comment}
                  </p>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
