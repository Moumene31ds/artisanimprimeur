"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, doc, setDoc, 
  serverTimestamp, addDoc 
} from "firebase/firestore";
import { 
  Crown, Gift, Loader2, Star, CheckCircle, 
  ArrowLeft, Zap, Trophy, Ticket, RefreshCw, HelpCircle, History 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { GlobalLoader } from "@/components/GlobalLoader";
import confetti from "canvas-confetti";

const REWARDS = [
  { 
    id: "r1", 
    title: "Remise 10%", 
    titleAr: "خصم 10%",
    points: 200, 
    icon: <Ticket className="text-blue-500" size={32} />, 
    type: "percent", 
    value: 10,
    color: "from-blue-500/20 to-cyan-500/20"
  },
  { 
    id: "r2", 
    title: "Bon de 600 DA", 
    titleAr: "قسيمة 600 دج",
    points: 500, 
    icon: <Zap className="text-emerald-500" size={32} />, 
    type: "fixed", 
    value: 600,
    color: "from-emerald-500/20 to-green-500/20"
  },
  { 
    id: "r3", 
    title: "Bon de 1000 DA", 
    titleAr: "قسيمة 1000 دج",
    points: 1000, 
    icon: <Trophy className="text-yellow-500" size={32} />, 
    type: "fixed", 
    value: 1000,
    color: "from-yellow-500/20 to-orange-500/20"
  },
];

// --- Spin the Wheel Prizes ---
const SPIN_PRIZES = [
  { label: "10% Remise", labelAr: "خصم 10%", type: "percent", value: 10, color: "#3b82f6" },
  { label: "20 Points", labelAr: "20 نقطة", type: "points", value: 20, color: "#10b981" },
  { label: "700 DA Bon", labelAr: "قسيمة 700 دج", type: "fixed", value: 700, color: "#8b5cf6" },
  { label: "Pas de chance", labelAr: "حظ أوفر", type: "none", value: 0, color: "#64748b" },
  { label: "50 Points", labelAr: "50 نقطة", type: "points", value: 50, color: "#f59e0b" },
  { label: "15% Remise", labelAr: "خصم 15%", type: "percent", value: 15, color: "#ec4899" },
  { label: "500 DA Bon", labelAr: "قسيمة 500 دج", type: "fixed", value: 500, color: "#06b6d4" },
  { label: "100 Points", labelAr: "100 نقطة", type: "points", value: 100, color: "#eab308" }
];

interface PointTransaction {
  id: string;
  type: 'earned' | 'redeemed' | 'won' | 'spin_cost';
  title: string;
  titleAr: string;
  points: number;
  date: Date;
}

export default function RewardsPage() {
  const { user, loading: authLoading, isLoggedIn } = useAuth();
  const { language } = useAppStore();
  const [points, setPoints] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [calculating, setCalculating] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [mounted, setMounted] = useState(false);

  // --- Wheel states ---
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [prizeResult, setPrizeResult] = useState<any | null>(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);

  const isRtl = language === 'ar';

  const fetchAndCalculateData = async () => {
    if (!user) {
      setCalculating(false);
      return;
    }

    try {
      // 1. Fetch Orders to calculate spent amount & standard points
      const qOrders = query(
        collection(db, "orders"), 
        where("customerUserId", "==", user.uid)
      );
      const snapOrders = await getDocs(qOrders);
      
      let spent = 0;
      const orderTxs: PointTransaction[] = [];

      snapOrders.forEach(docSnap => {
        const data = docSnap.data();
        if (data.status !== 'Annulé') {
          const totalVal = Number(data.total) || 0;
          spent += totalVal;
          
          const ptsEarned = Math.floor(totalVal / 100);
          if (ptsEarned > 0) {
            orderTxs.push({
              id: docSnap.id,
              type: 'earned',
              title: `Points earned from order #${docSnap.id.substring(0, 6)}`,
              titleAr: `نقاط مكتسبة من الطلب #${docSnap.id.substring(0, 6)}`,
              points: ptsEarned,
              date: data.createdAt?.toDate() || new Date(),
            });
          }
        }
      });
      setTotalSpent(spent);

      // 2. Fetch custom transactions (redeemed coupons, wheel spins) from Firestore
      const qTxs = query(
        collection(db, "pointTransactions"), 
        where("userId", "==", user.uid)
      );
      const snapTxs = await getDocs(qTxs);
      
      const customTxs: PointTransaction[] = [];
      let pointAdjustments = 0;

      snapTxs.forEach(docSnap => {
        const data = docSnap.data();
        const ptsVal = Number(data.points) || 0;
        
        pointAdjustments += ptsVal; // Negative for redemptions/spins, positive for wheel wins
        customTxs.push({
          id: docSnap.id,
          type: data.type,
          title: data.title || '',
          titleAr: data.titleAr || '',
          points: Math.abs(ptsVal),
          date: data.createdAt?.toDate() || new Date(),
        });
      });

      // Calculate final points: (Base points from orders) + adjustments
      const basePoints = Math.floor(spent / 100);
      const computedPoints = Math.max(0, basePoints + pointAdjustments);
      setPoints(computedPoints);

      // Save calculated points count to user document for global caching and AI queries
      await setDoc(doc(db, "users", user.uid), { points: computedPoints }, { merge: true });

      // Combine and sort transactions by date
      const allTxs = [...orderTxs, ...customTxs].sort((a, b) => b.date.getTime() - a.date.getTime());
      setTransactions(allTxs);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(isRtl ? "فشل في جلب البيانات" : "Erreur de chargement des données");
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (!authLoading) {
      fetchAndCalculateData();
    }
  }, [user, authLoading]);

  // --- Redeem Promo Code Logic ---
  const handleRedeem = async (reward: any) => {
    if (points < reward.points) {
      toast.error(isRtl ? "نقاطك لا تكفي لاستبدال هذه المكافأة" : "Points insuffisants !");
      return;
    }

    setRedeeming(reward.id);
    const generatedCode = `VIP-${reward.id.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    try {
      // 1. Add Promo code to Firestore
      const promoData = {
        code: generatedCode,
        discountType: reward.type,
        discountValue: reward.value,
        minAmount: 0,
        active: true,
        isReward: true,
        ownerId: user?.uid,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, "promoCodes", generatedCode), promoData);

      // 2. Add transaction record to Firestore
      const txData = {
        userId: user?.uid,
        type: 'redeemed',
        points: -reward.points,
        title: `Redeemed standard reward: ${reward.title}`,
        titleAr: `استبدال مكافأة: ${reward.titleAr}`,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "pointTransactions"), txData);

      // Re-trigger reload
      await fetchAndCalculateData();
      setRedeemedCode(generatedCode);
      
      toast.success(isRtl ? "مبروك! تم توليد كود الخصم" : "Félicitations ! Code généré");
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error("Redemption error:", error);
      toast.error("Error during redemption. Please try again.");
    } finally {
      setRedeeming(null);
    }
  };

  // --- Spin the Wheel Logic ---
  const handleSpinWheel = async () => {
    if (isSpinning) return;
    if (points < 50) {
      toast.error(isRtl ? "تحتاج إلى 50 نقطة على الأقل للعب" : "Vous avez besoin d'au moins 50 points !");
      return;
    }

    setIsSpinning(true);
    setPrizeResult(null);

    // 1. Deduct spin cost in Firestore
    try {
      const spinCostTx = {
        userId: user?.uid,
        type: 'spin_cost',
        points: -50,
        title: "Spun the Wheel",
        titleAr: "لعب عجلة الحظ",
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "pointTransactions"), spinCostTx);

      // Choose random index
      const prizeIndex = Math.floor(Math.random() * SPIN_PRIZES.length);
      const prize = SPIN_PRIZES[prizeIndex];

      // Spin rotation math
      const sliceAngle = 360 / SPIN_PRIZES.length;
      const targetRotation = wheelRotation + 1800 + (360 - (prizeIndex * sliceAngle)) - (sliceAngle / 2);
      setWheelRotation(targetRotation);

      setTimeout(async () => {
        setIsSpinning(false);
        setPrizeResult(prize);
        setShowPrizeModal(true);

        // Process reward
        try {
          if (prize.type === 'points') {
            const winTx = {
              userId: user?.uid,
              type: 'won',
              points: prize.value,
              title: `Won points on Spin Wheel: +${prize.value} Pts`,
              titleAr: `فوز بنقاط في عجلة الحظ: +${prize.value} نقطة`,
              createdAt: serverTimestamp(),
            };
            await addDoc(collection(db, "pointTransactions"), winTx);
          } else if (prize.type !== 'none') {
            const wonCode = `SPIN-${prize.type.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const promoData = {
              code: wonCode,
              discountType: prize.type,
              discountValue: prize.value,
              minAmount: 0,
              active: true,
              isReward: true,
              isFreeShipping: (prize as any).isFreeShipping || false,
              ownerId: user?.uid,
              createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, "promoCodes", wonCode), promoData);

            const winTx = {
              userId: user?.uid,
              type: 'won',
              points: 0, // No points gained directly, but code issued
              title: `Won coupon code: ${wonCode}`,
              titleAr: `فوز بكود خصم: ${wonCode}`,
              createdAt: serverTimestamp(),
            };
            await addDoc(collection(db, "pointTransactions"), winTx);
            setRedeemedCode(wonCode);
          } else {
            // Pas de chance
            const loseTx = {
              userId: user?.uid,
              type: 'spin_cost',
              points: 0,
              title: "Pas de chance on Spin Wheel",
              titleAr: "لم يحالفك الحظ في عجلة الحظ",
              createdAt: serverTimestamp(),
            };
            await addDoc(collection(db, "pointTransactions"), loseTx);
          }

          // Reload data
          await fetchAndCalculateData();
          
          if (prize.type !== 'none') {
            confetti({
              particleCount: 100,
              spread: 60,
              origin: { y: 0.6 }
            });
          }
        } catch (err) {
          console.error("Error processing spin reward:", err);
        }

      }, 5000);

    } catch (err) {
      console.error("Spin wheel deduction failed:", err);
      toast.error("Transaction failed");
      setIsSpinning(false);
    }
  };

  // Determine Tiers Info
  const tierProgress = useMemo(() => {
    let currentTier = isRtl ? "عادي" : "Standard";
    let nextTier = "Silver";
    let required = 20000;
    let progress = Math.min((totalSpent / 20000) * 100, 100);

    if (totalSpent > 50000) {
      currentTier = "VIP Gold";
      nextTier = isRtl ? "الحد الأقصى" : "Max Tier";
      required = 50000;
      progress = 100;
    } else if (totalSpent > 20000) {
      currentTier = "Silver";
      nextTier = "VIP Gold";
      required = 50000;
      progress = Math.min((totalSpent / 50000) * 100, 100);
    }

    return { currentTier, nextTier, required, progress };
  }, [totalSpent, isRtl]);

  if (!mounted || authLoading || calculating) return <GlobalLoader />;
  
  if (!isLoggedIn) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 animate-fadeIn">
      <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
        <Crown size={64} className="text-slate-400" />
      </div>
      <h2 className="text-2xl font-black mb-4 text-slate-800 dark:text-white">
        {isRtl ? "سجل الدخول لرؤية مكافآتك" : "Connectez-vous pour voir vos points"}
      </h2>
      <Link href="/login" className="px-10 py-4 bg-accent text-white rounded-2xl font-black shadow-xl hover:scale-105 transition-all">
        {isRtl ? "تسجيل الدخول" : "Se connecter"}
      </Link>
    </div>
  );

  return (
    <div className={`max-w-6xl mx-auto pb-24 px-4 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <header className="flex items-center gap-4 mb-10">
        <Link href="/profile" className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
           <ArrowLeft size={24} className={isRtl ? 'rotate-180' : ''} />
        </Link>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">VIP Rewards & Games</h1>
      </header>

      {/* Balance Card */}
      <section className="relative bg-gradient-to-br from-slate-900 to-black dark:from-slate-900 dark:to-slate-950 rounded-[3rem] p-8 md:p-12 mb-12 overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/10 rounded-full blur-[100px] -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -ml-20 -mb-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-start flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-black mb-6 border border-yellow-500/30">
              <Star size={14} fill="currentColor" /> {isRtl ? "نادي الحرفي VIP" : "L'ARTISAN VIP CLUB"}
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              {isRtl ? "رصيد نقاطك الحالي" : "Votre Solde Actuel"}
            </h2>
            <p className="text-slate-400 font-medium max-w-md text-sm leading-relaxed">
              {isRtl 
                ? "اربح 1 نقطة مقابل كل 100 دينار تنفقها. استخدم نقاطك في العجلة أو استبدلها بكوبونات خصم فورية." 
                : "Gagnez 1 point pour chaque 100 DA dépensés. Utilisez-les dans la roue ou échangez-les contre des réductions."}
            </p>
          </div>

          <motion.div 
            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] text-center min-w-[240px] shadow-inner"
          >
            <Crown size={44} className="text-yellow-500 mx-auto mb-3 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
            <span className="block text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 mb-1">
              {points}
            </span>
            <p className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px]">Points de Fidélité</p>
          </motion.div>
        </div>
      </section>

      {/* Promocode successfully generated */}
      <AnimatePresence>
        {redeemedCode && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="mb-12 p-8 bg-emerald-600 text-white rounded-[3rem] shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
            <CheckCircle size={48} className="mb-3" />
            <h3 className="text-2xl font-black mb-1">{isRtl ? "تم توليد الكود بنجاح!" : "Code généré avec succès !"}</h3>
            <p className="mb-5 text-sm opacity-90">{isRtl ? "انسخ الكود التالي واستخدمه في سلة المشتريات للحصول على الخصم:" : "Copiez ce code et utilisez-le dans votre panier :"}</p>
            <div className="bg-white text-emerald-700 text-3xl font-black font-mono px-8 py-5 rounded-2xl tracking-[0.2em] shadow-xl border border-emerald-500/20 select-all cursor-pointer" title={isRtl ? "اضغط للنسخ" : "Cliquez pour copier"}>
              {redeemedCode}
            </div>
            <button onClick={() => setRedeemedCode(null)} className="mt-6 text-xs font-bold bg-white/20 hover:bg-white/30 px-5 py-2 rounded-full transition-all">
              {isRtl ? "حسناً" : "Fermer"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid: Spin Wheel + Tiers Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 items-start">
        
        {/* Spin the Wheel Card */}
        <section className="lg:col-span-2 premium-glass p-8 rounded-[3rem] border border-white/60 dark:border-slate-800 shadow-xl flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-6 w-full justify-center md:justify-start border-b border-slate-100 dark:border-slate-800 pb-4">
             <Trophy className="text-yellow-500" size={24} />
             <h3 className="font-black text-xl text-slate-800 dark:text-white">{isRtl ? "عجلة الحظ التفاعلية" : "La Roue de la Fortune"}</h3>
             <span className="text-[10px] bg-purple-100 dark:bg-purple-950/40 text-purple-600 px-2.5 py-1 rounded-full font-bold ml-auto">
               50 Pts / Spin
             </span>
          </div>

          <div className="relative w-72 h-72 md:w-80 md:h-80 my-4 flex items-center justify-center">
            {/* Pointer indicator */}
            <div className="absolute top-[-10px] z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-red-500 drop-shadow-md"></div>
            
            {/* SVG Wheel */}
            <div 
              style={{ 
                transform: `rotate(${wheelRotation}deg)`, 
                transition: isSpinning ? 'transform 5s cubic-bezier(0.15, 0.95, 0.3, 1)' : 'none'
              }}
              className="w-full h-full select-none"
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <circle cx="100" cy="100" r="95" fill="#1e293b" stroke="#f1f5f9" strokeWidth="3" />
                {SPIN_PRIZES.map((prize, idx) => {
                  const angle = 360 / SPIN_PRIZES.length;
                  const startAngle = idx * angle;
                  const endAngle = startAngle + angle;
                  // SVG arc path math
                  const radStart = (startAngle - 90) * Math.PI / 180;
                  const radEnd = (endAngle - 90) * Math.PI / 180;
                  const x1 = 100 + 90 * Math.cos(radStart);
                  const y1 = 100 + 90 * Math.sin(radStart);
                  const x2 = 100 + 90 * Math.cos(radEnd);
                  const y2 = 100 + 90 * Math.sin(radEnd);
                  
                  return (
                    <g key={idx}>
                      <path 
                        d={`M100,100 L${x1},${y1} A90,90 0 0,1 ${x2},${y2} Z`} 
                        fill={prize.color} 
                        stroke="#0f172a" 
                        strokeWidth="0.7" 
                      />
                      {/* Text placement along the slice */}
                      <g transform={`rotate(${startAngle + angle / 2} 100 100)`}>
                        <text 
                          x="100" 
                          y="32" 
                          fill="#ffffff" 
                          fontSize="7" 
                          fontWeight="900" 
                          textAnchor="middle"
                          transform="rotate(90 100 32)"
                          className="font-sans tracking-tighter"
                        >
                          {isRtl ? prize.labelAr : prize.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="22" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>

            {/* Central Play button */}
            <button 
              onClick={handleSpinWheel}
              disabled={isSpinning || points < 50}
              className={`absolute z-10 w-14 h-14 rounded-full font-black text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center border-2 border-white text-white ${
                isSpinning 
                  ? 'bg-slate-700 cursor-not-allowed' 
                  : points >= 50 
                    ? 'bg-purple-600 hover:bg-purple-500 hover:scale-105 cursor-pointer' 
                    : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              {isSpinning ? <RefreshCw className="animate-spin text-white" size={18} /> : (isRtl ? "إبدأ" : "SPIN")}
            </button>
          </div>

          <p className="text-xs text-slate-500 font-bold mt-4 max-w-sm">
            {isRtl 
              ? "جرّب حظك الآن بالفوز بجوائز مذهلة. كل محاولة تكلف 50 نقطة فقط." 
              : "Tentez votre chance ! Chaque lancer consomme 50 points de fidélité."}
          </p>
        </section>

        {/* Tier progress card */}
        <section className="premium-glass p-8 rounded-[3rem] border border-white/60 dark:border-slate-800 shadow-xl flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
             <Crown className="text-yellow-500" size={24} />
             <h3 className="font-black text-xl text-slate-800 dark:text-white">{isRtl ? "مستويات العضوية ومزاياها" : "Statut et Avantages"}</h3>
          </div>

          <div className="space-y-6 flex-1">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">{isRtl ? "المستوى الحالي" : "Tier Actuel"}</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{tierProgress.currentTier}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>{isRtl ? `التقدم للمستوى القادم: ${tierProgress.nextTier}` : `Vers le niveau : ${tierProgress.nextTier}`}</span>
                <span>{totalSpent.toLocaleString()} / {tierProgress.required.toLocaleString()} DA</span>
              </div>
              
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${tierProgress.progress}%` }} 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                  transition={{ duration: 1 }}
                />
              </div>
            </div>

            {/* List of perks */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{isRtl ? "مزايا حسابك الفعّالة:" : "Vos avantages activés :"}</span>
              <ul className="space-y-2 text-xs font-bold text-slate-600 dark:text-slate-350">
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  <span>{isRtl ? "ربح 1 نقطة لكل 100 دج إنفاق" : "1 point pour chaque 100 DA"}</span>
                </li>
                {totalSpent >= 20000 && (
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <span>{isRtl ? "عضوية الفئة الفضية Silver" : "Avantage Tier Silver débloqué"}</span>
                  </li>
                )}
                {totalSpent >= 50000 && (
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <span>{isRtl ? "خصومات خاصة بأعضاء VIP وأولوية في معالجة الطلبات" : "VIP discounts exclusifs & priorité de traitement"}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Point Exchange (Standard coupons list) */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-8">
          <Gift className="text-accent" size={28} />
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            {isRtl ? "استبدال النقاط بكوبونات خصم" : "Échanger mes points"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {REWARDS.map((reward) => {
            const canRedeem = points >= reward.points;
            const isProcessing = redeeming === reward.id;

            return (
              <motion.div 
                key={reward.id}
                whileHover={canRedeem ? { y: -6 } : {}}
                className={`premium-glass p-8 rounded-[2.5rem] border relative overflow-hidden flex flex-col h-full transition-all duration-300 ${
                  canRedeem 
                    ? 'border-white/60 dark:border-white/10 shadow-lg' 
                    : 'opacity-60 grayscale-[0.3] border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${reward.color.replace('/20', '')}`}></div>
                
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${reward.color} flex items-center justify-center mb-6`}>
                  {reward.icon}
                </div>

                <h4 className="font-black text-xl text-slate-800 dark:text-white mb-2 leading-tight">
                  {isRtl ? reward.titleAr : reward.title}
                </h4>
                
                <div className="mt-auto pt-6">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coût d'échange</span>
                    <span className={`font-black text-xl ${canRedeem ? 'text-yellow-500' : 'text-slate-450'}`}>
                      {reward.points} <span className="text-xs">Pts</span>
                    </span>
                  </div>

                  <button 
                    onClick={() => handleRedeem(reward)}
                    disabled={!canRedeem || redeeming !== null}
                    className={`w-full py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      canRedeem 
                        ? 'bg-slate-900 dark:bg-accent text-white hover:shadow-xl cursor-pointer' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : canRedeem ? (
                      <><Zap size={14} fill="currentColor" /> {isRtl ? "استبدال الآن" : "Échanger maintenant"}</>
                    ) : (
                      isRtl ? "نقاط غير كافية" : "Points insuffisants"
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Points History timeline */}
      <section className="premium-glass p-8 rounded-[3rem] border border-white/60 dark:border-slate-800 shadow-xl max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
           <History className="text-purple-500" size={24} />
           <h3 className="font-black text-xl text-slate-800 dark:text-white">{isRtl ? "سجل معاملات النقاط" : "Historique des points"}</h3>
        </div>

        {transactions.length > 0 ? (
          <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-8">
            {transactions.map((tx) => {
              const isEarn = tx.type === 'earned' || tx.type === 'won';
              return (
                <div key={tx.id} className="relative">
                  {/* Circle dot on timeline */}
                  <span className={`absolute left-[-31px] top-1.5 w-4.5 h-4.5 rounded-full border-4 border-white dark:border-slate-900 shadow-md ${
                    isEarn ? 'bg-emerald-500' : 'bg-red-500'
                  }`}></span>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {isRtl ? tx.titleAr : tx.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">
                        {tx.date.toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'fr-FR', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <span className={`text-base font-black px-3 py-1 rounded-xl self-start sm:self-center ${
                      isEarn ? 'bg-emerald-100/60 dark:bg-emerald-950/20 text-emerald-600' : 'bg-red-100/60 dark:bg-red-950/20 text-red-500'
                    }`}>
                      {isEarn ? `+${tx.points}` : `-${tx.points}`} Pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400">
            <Trophy size={48} className="mx-auto opacity-20 mb-3" />
            <p className="text-xs font-bold">{isRtl ? "لا توجد معاملات نقاط سابقة بعد" : "Aucun historique de points disponible."}</p>
          </div>
        )}
      </section>

      {/* Spin Wheel Prize announcement modal overlay */}
      <AnimatePresence>
        {showPrizeModal && prizeResult && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[3.5rem] text-center max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <Trophy size={60} className="text-yellow-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
                {isRtl ? "تهانينا! لقد فزت" : "Félicitations ! Vous avez gagné"}
              </h3>
              <p className="text-3xl font-black text-purple-600 dark:text-accent mb-6">
                {isRtl ? prizeResult.labelAr : prizeResult.label}
              </p>
              <p className="text-xs text-slate-500 mb-6 font-bold leading-relaxed">
                {prizeResult.type === 'points' 
                  ? (isRtl ? "تمت إضافة النقاط مباشرة إلى رصيدك." : "Les points ont été ajoutés à votre compte.")
                  : (prizeResult.type !== 'none' 
                    ? (isRtl ? "تم توليد كود خصم خاص بك، انظر أعلى الصفحة لنسخه." : "Code coupon généré avec succès en haut.")
                    : (isRtl ? "حظ أفضل في المرة القادمة." : "Plus de chance au prochain tour !"))
                }
              </p>
              <button 
                onClick={() => setShowPrizeModal(false)}
                className="w-full bg-slate-900 dark:bg-accent text-white py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-md"
              >
                {isRtl ? "متابعة" : "Continuer"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
