"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  Crown, Gift, Loader2, Star, CheckCircle,
  ArrowLeft, Zap, Trophy, Ticket, RefreshCw, HelpCircle, History,
  Flame, CalendarDays, MessageSquare, Share2, Copy, Check, Coins, Medal, Gem,
  Users, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { GlobalLoader } from "@/components/GlobalLoader";
import confetti from "canvas-confetti";
import { LOYALTY_TIERS, LoyaltyTier, getPointsForAmount } from "@/lib/loyalty";
import { isContactPickerSupported, pickContacts } from "@/lib/capabilities";

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

const TIER_ICONS: Record<string, any> = {
  bronze: Medal, silver: Medal, gold: Crown, platinum: Gem, diamond: Gem,
};

export default function RewardsPage() {
  const { user, loading: authLoading, isLoggedIn } = useAuth();
  const { language } = useAppStore();
  const isRtl = language === 'ar';

  // --- البيانات من الخادم ---
  const [mounted, setMounted] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  // --- Wheel states ---
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [prizeResult, setPrizeResult] = useState<any | null>(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);

  // --- Birthday state ---
  const [birthdayInput, setBirthdayInput] = useState("");
  const [claimingBirthday, setClaimingBirthday] = useState(false);

  // --- Referral ---
  const [copied, setCopied] = useState(false);
  // جهات الاتصال المختارة للدعوة (Contact Picker API)
  const [invitedContacts, setInvitedContacts] = useState<{ name: string; tel: string }[]>([]);

  /** فتح منتقي جهات الاتصال وتجهيز دعوات واتساب جاهزة للإرسال. */
  const handleInviteContacts = async () => {
    try {
      const contacts = await pickContacts(["name", "tel"], true);
      const mapped = (contacts || [])
        .filter((c) => c.tel?.[0])
        .map((c) => ({
          name: c.name?.[0] || "",
          tel: (c.tel as string[])[0].replace(/[^+\d]/g, ""),
        }));
      if (mapped.length === 0) {
        toast.info(isRtl ? "لا توجد أرقام هاتف في جهات الاتصال المختارة" : "Aucun numéro dans les contacts sélectionnés");
        return;
      }
      setInvitedContacts(mapped.slice(0, 20));
    } catch (err: any) {
      if (err?.message !== "unsupported" && err?.name !== "AbortError") {
        toast.error(isRtl ? "تعذّر فتح جهات الاتصال" : "Impossible d'ouvrir les contacts");
      }
    }
  };

  /** بناء رابط واتساب لدعوة جهة اتصال برقم محلي جزائري. */
  const inviteLink = (contact: { name: string; tel: string }) => {
    const intl = contact.tel.startsWith("+") ? contact.tel.slice(1) : contact.tel.replace(/^0/, "213");
    const msg = isRtl
      ? `مرحباً ${contact.name || ""}! 👋 أنصحك بتجربة L'Artisan Imprimeur لكل أعمال الطباعة — سجّل من رابطي واحصل على عرض ترحيبي: ${referralLink}`
      : `Salut ${contact.name || ""} ! 👋 Je te recommande L'Artisan Imprimeur pour tous vos travaux d'impression — inscris-toi avec mon lien et profite de l'offre de bienvenue : ${referralLink}`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  };

  // --- Check-in ---
  const [checkingIn, setCheckingIn] = useState(false);

  const tier: LoyaltyTier | null = profile?.tier || null;
  const spinCost = settings?.config?.spinCost ?? 50;
  const rewardsCatalog = settings?.rewards || [];

  const fetchProfile = async () => {
    if (!user) { setLoadingProfile(false); return; }
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/loyalty/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setProfile(data.profile);
    } catch (err) {
      console.error("Failed to load loyalty profile:", err);
      toast.error(isRtl ? "فشل تحميل بيانات الولاء" : "Erreur de chargement");
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const snap = await getDoc(doc(db, "settings", "loyalty"));
      if (snap.exists()) setSettings(snap.data());
      else {
        setSettings({
          config: {
            basePointsPer100: 1, signupBonus: 200, dailyCheckInBase: 10,
            dailyCheckInStreakBonus: 50, birthdayBonus: 100, reviewBonus: 50,
            referralBonus: 100, spinCost: 50,
          },
          rewards: [
            { id: "r1", points: 200, type: "percent", value: 10, title: { ar: "خصم 10%", fr: "Remise 10%" }, icon: "Ticket" },
            { id: "r2", points: 500, type: "fixed", value: 600, title: { ar: "قسيمة 600 دج", fr: "Bon de 600 DA" }, icon: "Zap" },
            { id: "r3", points: 1000, type: "fixed", value: 1000, title: { ar: "قسيمة 1000 دج", fr: "Bon de 1000 DA" }, icon: "Trophy" },
            { id: "r4", points: 2000, type: "fixed", value: 2500, title: { ar: "قسيمة 2500 دج", fr: "Bon de 2500 DA" }, icon: "Gem" },
            { id: "r5", points: 5000, type: "percent", value: 20, title: { ar: "خصم 20%", fr: "Remise 20%" }, icon: "Crown" },
          ],
        });
      }
    } catch (err) {
      console.error("Failed to load loyalty settings:", err);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (!authLoading) {
      if (isLoggedIn && user) {
        fetchProfile();
        fetchSettings();
      } else {
        setLoadingProfile(false);
      }
    }
  }, [authLoading, isLoggedIn, user]);

  // ============ DAILY CHECK-IN ============
  const handleCheckIn = async () => {
    if (checkingIn || !user) return;
    setCheckingIn(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/loyalty/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        toast.success(isRtl ? `+${data.pointsAwarded} نقطة!` : `+${data.pointsAwarded} points !`);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } else if (data.alreadyCheckedIn) {
        toast.info(isRtl ? "سجلت حضورك اليوم بالفعل" : "Déjà enregistré aujourd'hui");
      } else {
        toast.error(data.error || (isRtl ? "خطأ" : "Erreur"));
      }
    } catch (err) {
      toast.error(isRtl ? "حدث خطأ" : "Erreur");
    } finally {
      setCheckingIn(false);
    }
  };

  // ============ BIRTHDAY ============
  const saveBirthday = async () => {
    if (!user || !birthdayInput) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/loyalty/birthday", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "save", birthday: birthdayInput }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        toast.success(isRtl ? "تم حفظ تاريخ ميلادك 🎂" : "Date d'anniversaire enregistrée 🎂");
      } else {
        toast.error(data.error || (isRtl ? "خطأ" : "Erreur"));
      }
    } catch (err) {
      toast.error(isRtl ? "حدث خطأ" : "Erreur");
    }
  };

  const claimBirthday = async () => {
    if (claimingBirthday || !user) return;
    setClaimingBirthday(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/loyalty/birthday", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "claim" }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        toast.success(isRtl ? `هدية عيد ميلاد: +${data.pointsAwarded} نقطة 🎉` : `Bonus anniversaire : +${data.pointsAwarded} points 🎉`);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      } else if (data.alreadyClaimed) {
        toast.info(isRtl ? "حصلت على هدية عيد الميلاد هذه السنة" : "Bonus déjà réclamé cette année");
      } else {
        toast.error(data.error || (isRtl ? "خطأ" : "Erreur"));
      }
    } catch (err) {
      toast.error(isRtl ? "حدث خطأ" : "Erreur");
    } finally {
      setClaimingBirthday(false);
    }
  };

  // ============ REDEEM (via API) ============
  const handleRedeem = async (reward: any) => {
    if (redeeming || !user) return;
    if (profile.points < reward.points) {
      toast.error(isRtl ? "نقاطك لا تكفي لاستبدال هذه المكافأة" : "Points insuffisants !");
      return;
    }
    setRedeeming(reward.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rewardId: reward.id }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setRedeemedCode(data.code);
        toast.success(isRtl ? "مبروك! تم توليد كود الخصم" : "Félicitations ! Code généré");
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      } else {
        toast.error(data.error || (isRtl ? "خطأ" : "Erreur"));
      }
    } catch (err) {
      toast.error(isRtl ? "حدث خطأ أثناء الاستبدال" : "Erreur lors de l'échange");
    } finally {
      setRedeeming(null);
    }
  };

  // ============ SPIN WHEEL (via /api/loyalty/spin-win) ============
  const handleSpinWheel = async () => {
    if (isSpinning || !user) return;
    if (profile.points < spinCost) {
      toast.error(isRtl ? `تحتاج إلى ${spinCost} نقطة على الأقل للعب` : `Vous avez besoin d'au moins ${spinCost} points !`);
      return;
    }

    setIsSpinning(true);
    setPrizeResult(null);

    const token = await user.getIdToken();
    const spinId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // اختيار الجائزة وتحريك العجلة على العميل
    const prizeIndex = Math.floor(Math.random() * SPIN_PRIZES.length);
    const prize = SPIN_PRIZES[prizeIndex];
    const sliceAngle = 360 / SPIN_PRIZES.length;
    const targetRotation = wheelRotation + 1800 + (360 - (prizeIndex * sliceAngle)) - (sliceAngle / 2);
    setWheelRotation(targetRotation);

    setTimeout(async () => {
      setIsSpinning(false);
      setPrizeResult(prize);
      setShowPrizeModal(true);

      if (prize.type === 'none') return;

      // تسجيل الدوران والجائزة على الخادم (خصم النقاط + منح الجائزة)
      try {
        const res = await fetch("/api/loyalty/spin-win", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ spinId, prize: { type: prize.type, value: prize.value } }),
        });
        const data = await res.json();
        if (data.success) {
          if (data.profile) setProfile(data.profile);
          if (data.code) {
            setRedeemedCode(data.code);
            toast.success(isRtl ? "مبروك! تم توليد كود الخصم" : "Félicitations ! Code généré");
          } else if (data.prizePoints) {
            toast.success(isRtl ? `+${data.prizePoints} نقطة!` : `+${data.prizePoints} points !`);
          }
        } else {
          toast.error(data.error || (isRtl ? "خطأ" : "Erreur"));
          await fetchProfile();
        }
      } catch (err) {
        console.error("Error processing spin reward:", err);
        toast.error(isRtl ? "تعذر تسجيل الجائزة، حاول مجدداً" : "Erreur lors de l'enregistrement");
        await fetchProfile();
      }
    }, 5000);
  };

  const referralLink = profile?.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/login?ref=${profile.referralCode}`
    : "";

  const copyText = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(msg);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(isRtl ? "فشل النسخ" : "Erreur de copie");
    }
  };

  // Progress toward next tier
  const tierProgress = useMemo(() => {
    if (!profile || !tier) return { current: "Bronze", next: "Silver", required: 20000, progress: 0, remaining: 20000 };
    const next = profile.nextTier;
    if (!next) {
      return { current: tier.label.fr, next: null, required: 0, progress: 100, remaining: 0 };
    }
    const spending = profile.lifetimeSpending || 0;
    const range = next.minSpending - tier.minSpending;
    const passed = spending - tier.minSpending;
    return {
      current: tier.label.fr,
      next: next.label.fr,
      required: next.minSpending,
      progress: Math.min(100, Math.max(0, (passed / range) * 100)),
      remaining: Math.max(0, next.minSpending - spending),
    };
  }, [profile, tier]);

  if (!mounted || authLoading || loadingProfile) return <GlobalLoader />;

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

  const baseRate = settings?.config?.basePointsPer100 ?? 1;
  const multiplier = tier?.multiplier ?? 1;

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
                ? `اربح ${baseRate} نقطة مقابل كل 100 دينار (×${multiplier} حسب مستواك). استخدم نقاطك في العجلة أو استبدلها بكوبونات خصم فورية.`
                : `Gagnez ${baseRate} point / 100 DA (×${multiplier} selon votre statut). Jouez ou échangez vos points !`}
            </p>

            {/* Tier badge */}
            {tier && (
              <div className={`inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-2xl bg-gradient-to-r ${tier.gradient} text-white font-black text-sm shadow-lg`}>
                <Crown size={16} />
                {isRtl ? tier.label.ar : tier.label.fr} ×{tier.multiplier}
              </div>
            )}
          </div>

          <motion.div
            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] text-center min-w-[240px] shadow-inner"
          >
            <Crown size={44} className="text-yellow-500 mx-auto mb-3 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
            <span className="block text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 mb-1">
              {profile?.points ?? 0}
            </span>
            <p className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px]">Points de Fidélité</p>
          </motion.div>
        </div>
      </section>

      {/* ====== EARN POINTS SECTION ====== */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-8">
          <Coins className="text-accent" size={28} />
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            {isRtl ? "اكسب النقاط" : "Gagnez des points"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Daily Check-in */}
          <div className="premium-glass p-6 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-lg flex flex-col items-center text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${profile?.canCheckIn ? "bg-orange-100 dark:bg-orange-950/40 text-orange-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
              <Flame size={26} />
            </div>
            <h4 className="font-black text-slate-800 dark:text-white">{isRtl ? "التسجيل اليومي" : "Check-in quotidien"}</h4>
            <p className="text-[10px] text-slate-400 font-bold mt-1 mb-3">
              {isRtl
                ? `+${settings?.config?.dailyCheckInBase ?? 10} نقطة كل يوم، +${settings?.config?.dailyCheckInStreakBonus ?? 50} عند إكمال 7 أيام متتالية 🔥`
                : `+${settings?.config?.dailyCheckInBase ?? 10} pts/jour, +${settings?.config?.dailyCheckInStreakBonus ?? 50} pour 7 jours 🔥`}
            </p>
            {profile?.streak > 0 && (
              <span className="text-[10px] font-black text-orange-500 bg-orange-100 dark:bg-orange-950/40 px-3 py-1 rounded-full mb-3">
                {isRtl ? `سلسلة ${profile.streak} أيام` : `Streak : ${profile.streak} jours`}
              </span>
            )}
            <button
              onClick={handleCheckIn}
              disabled={checkingIn || !profile?.canCheckIn}
              className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                profile?.canCheckIn
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-xl cursor-pointer"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              }`}
            >
              {checkingIn ? <Loader2 size={14} className="animate-spin" /> : <Flame size={14} />}
              {profile?.canCheckIn
                ? (isRtl ? "سجّل حضورك الآن" : "Pointer maintenant")
                : (isRtl ? "تم اليوم ✓" : "Fait aujourd'hui ✓")}
            </button>
          </div>

          {/* Birthday */}
          <div className="premium-glass p-6 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-lg flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-pink-100 dark:bg-pink-950/40 text-pink-500">
              <CalendarDays size={26} />
            </div>
            <h4 className="font-black text-slate-800 dark:text-white">{isRtl ? "هدية عيد الميلاد" : "Bonus anniversaire"}</h4>
            <p className="text-[10px] text-slate-400 font-bold mt-1 mb-3">
              {isRtl
                ? `+${settings?.config?.birthdayBonus ?? 100} نقطة في عيد ميلادك كل سنة 🎂`
                : `+${settings?.config?.birthdayBonus ?? 100} points chaque année 🎂`}
            </p>

            {!profile?.birthday ? (
              <div className="flex gap-2 w-full">
                <input
                  type="date"
                  value={birthdayInput}
                  onChange={(e) => setBirthdayInput(e.target.value)}
                  className="flex-1 min-w-0 p-2.5 rounded-xl bg-white/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  onClick={saveBirthday}
                  disabled={!birthdayInput}
                  className="px-3 py-2 rounded-xl bg-pink-500 text-white font-black text-[10px] hover:bg-pink-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isRtl ? "حفظ" : "OK"}
                </button>
              </div>
            ) : (
              <button
                onClick={claimBirthday}
                disabled={claimingBirthday || profile.birthdayClaimYear === new Date().getFullYear()}
                className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  profile.birthdayClaimYear === new Date().getFullYear()
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:shadow-xl cursor-pointer"
                }`}
              >
                {claimingBirthday ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                {profile.birthdayClaimYear === new Date().getFullYear()
                  ? (isRtl ? "حصلت عليها ✓" : "Réclamé ✓")
                  : (isRtl ? "استلم هديتك" : "Réclamer")}
              </button>
            )}
          </div>

          {/* Referral */}
          <div className="premium-glass p-6 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-lg flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-500">
              <Share2 size={26} />
            </div>
            <h4 className="font-black text-slate-800 dark:text-white">{isRtl ? "دعوة الأصدقاء" : "Parrainage"}</h4>
            <p className="text-[10px] text-slate-400 font-bold mt-1 mb-3">
              {isRtl
                ? `+${settings?.config?.referralBonus ?? 100} نقطة عندما ينجز صديقك أول طلب له 💌`
                : `+${settings?.config?.referralBonus ?? 100} points quand un ami passe sa 1ère commande 💌`}
            </p>
            {profile?.referralCode ? (
              <>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => copyText(profile.referralCode, isRtl ? "تم نسخ الكود!" : "Code copié !")}
                    className="flex-1 p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono font-black text-sm tracking-widest hover:bg-emerald-200 cursor-pointer border border-emerald-200 dark:border-emerald-900"
                  >
                    {profile.referralCode}
                  </button>
                  <button
                    onClick={() => copyText(referralLink, isRtl ? "تم نسخ رابط الدعوة!" : "Lien copié !")}
                    className="px-3 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
                    title={isRtl ? "نسخ رابط الدعوة" : "Copier le lien"}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                {/* دعوة جهات الاتصال مباشرة (Contact Picker API) */}
                {isContactPickerSupported() && (
                  <button
                    onClick={handleInviteContacts}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 text-white font-black text-[11px] hover:bg-blue-600 transition-colors cursor-pointer"
                  >
                    <Users size={13} />
                    {isRtl ? "دعوة من جهات الاتصال" : "Inviter vos contacts"}
                  </button>
                )}
              </>
            ) : (
              <span className="text-[10px] font-bold text-slate-400">{isRtl ? "افتح حساباً لتحصل على كودك" : "Créez un compte pour votre code"}</span>
            )}
          </div>

          {/* Review */}
          <div className="premium-glass p-6 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-lg flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-purple-100 dark:bg-purple-950/40 text-purple-500">
              <MessageSquare size={26} />
            </div>
            <h4 className="font-black text-slate-800 dark:text-white">{isRtl ? "كتابة مراجعة" : "Laisser un avis"}</h4>
            <p className="text-[10px] text-slate-400 font-bold mt-1 mb-3">
              {isRtl
                ? `+${settings?.config?.reviewBonus ?? 50} نقطة عند تقييم طلبك بمراجعة موثقة ✍️`
                : `+${settings?.config?.reviewBonus ?? 50} points pour un avis vérifié ✍️`}
            </p>
            <a
              href="/orders"
              className="w-full py-3 rounded-xl bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-purple-600 hover:shadow-xl transition-all cursor-pointer"
            >
              <MessageSquare size={14} /> {isRtl ? "قيّم طلبك" : "Évaluer"}
            </a>
          </div>
        </div>
      </section>

      {/* لوحة إرسال الدعوات لجهات الاتصال المختارة */}
      <AnimatePresence>
        {invitedContacts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setInvitedContacts([])}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">
                    {isRtl ? "إرسال الدعوات" : "Envoyer les invitations"}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {isRtl
                      ? `${invitedContacts.length} جهة اتصال — أرسل عبر واتساب`
                      : `${invitedContacts.length} contact(s) — envoi via WhatsApp`}
                  </p>
                </div>
                <button
                  onClick={() => setInvitedContacts([])}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label={isRtl ? "إغلاق" : "Fermer"}
                >
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {invitedContacts.map((contact, i) => (
                  <a
                    key={`${contact.tel}-${i}`}
                    href={inviteLink(contact)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors"
                  >
                    <span className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-black text-xs">
                      {(contact.name || contact.tel).slice(0, 2)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] font-black text-slate-800 dark:text-white truncate">
                        {contact.name || contact.tel}
                      </span>
                      <span className="block text-[10px] font-bold text-slate-400" dir="ltr">{contact.tel}</span>
                    </span>
                    <MessageSquare size={15} className="text-emerald-500 shrink-0" />
                  </a>
                ))}
              </div>
              <p className="px-5 py-3 text-[9px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-950/40">
                {isRtl
                  ? "تُفتح المحادثات عبر واتساب — لا نصل إلى رسائلك أبداً."
                  : "Les conversations s'ouvrent via WhatsApp — nous n'accédons jamais à vos messages."}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <div
              onClick={() => copyText(redeemedCode, isRtl ? "تم النسخ!" : "Copié !")}
              className="bg-white text-emerald-700 text-3xl font-black font-mono px-8 py-5 rounded-2xl tracking-[0.2em] shadow-xl border border-emerald-500/20 select-all cursor-pointer"
              title={isRtl ? "اضغط للنسخ" : "Cliquez pour copier"}
            >
              {redeemedCode}
            </div>
            <button onClick={() => setRedeemedCode(null)} className="mt-6 text-xs font-bold bg-white/20 hover:bg-white/30 px-5 py-2 rounded-full transition-all cursor-pointer">
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
              {spinCost} Pts / Spin
            </span>
          </div>

          <div className="relative w-72 h-72 md:w-80 md:h-80 my-4 flex items-center justify-center">
            <div className="absolute top-[-10px] z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-red-500 drop-shadow-md"></div>
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
                  const radStart = (startAngle - 90) * Math.PI / 180;
                  const radEnd = (endAngle - 90) * Math.PI / 180;
                  const x1 = 100 + 90 * Math.cos(radStart);
                  const y1 = 100 + 90 * Math.sin(radStart);
                  const x2 = 100 + 90 * Math.cos(radEnd);
                  const y2 = 100 + 90 * Math.sin(radEnd);
                  return (
                    <g key={idx}>
                      <path d={`M100,100 L${x1},${y1} A90,90 0 0,1 ${x2},${y2} Z`} fill={prize.color} stroke="#0f172a" strokeWidth="0.7" />
                      <g transform={`rotate(${startAngle + angle / 2} 100 100)`}>
                        <text x="100" y="32" fill="#ffffff" fontSize="7" fontWeight="900" textAnchor="middle" transform="rotate(90 100 32)">
                          {isRtl ? prize.labelAr : prize.label}
                        </text>
                      </g>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="22" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>

            <button
              onClick={handleSpinWheel}
              disabled={isSpinning || profile.points < spinCost}
              className={`absolute z-10 w-14 h-14 rounded-full font-black text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center border-2 border-white text-white ${
                isSpinning
                  ? 'bg-slate-700 cursor-not-allowed'
                  : profile.points >= spinCost
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
              <span className={`inline-flex items-center gap-2 text-2xl font-black px-4 py-1.5 rounded-2xl bg-gradient-to-r ${tier?.gradient} text-white`}>
                <Crown size={18} /> {tierProgress.current} ×{tier?.multiplier ?? 1}
              </span>
            </div>

            {tierProgress.next ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>{isRtl ? `التقدم نحو: ${tierProgress.next}` : `Vers le niveau : ${tierProgress.next}`}</span>
                  <span>{isRtl ? `${tierProgress.remaining.toLocaleString()} دج متبقية` : `${tierProgress.remaining.toLocaleString()} DA restants`}</span>
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
            ) : (
              <div className="p-4 rounded-2xl bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 text-xs font-black text-center">
                {isRtl ? "🏆 وصلت إلى أعلى مستوى! أنت نجمنا" : "🏆 Vous êtes au niveau maximum !"}
              </div>
            )}

            {/* Tier ladder */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{isRtl ? "سلم المستويات:" : "Échelle des statuts :"}</span>
              {LOYALTY_TIERS.map((t) => {
                const Icon = TIER_ICONS[t.id] || Crown;
                const isCurrent = t.id === tier?.id;
                const reached = (profile?.lifetimeSpending || 0) >= t.minSpending;
                return (
                  <div key={t.id} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${isCurrent ? "border-accent/40 bg-accent/5" : "border-slate-100 dark:border-slate-800"}`}>
                    <span className={`flex items-center gap-2 ${reached ? "text-slate-800 dark:text-white" : "text-slate-400"}`}>
                      <Icon size={14} className={isCurrent ? "text-accent" : reached ? "text-yellow-500" : "text-slate-400"} />
                      {isRtl ? t.label.ar : t.label.fr}
                      <span className="text-[9px] text-slate-400">×{t.multiplier}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{t.minSpending.toLocaleString()} DA</span>
                  </div>
                );
              })}
            </div>

            {/* Perks */}
            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{isRtl ? "مزايا مستواك:" : "Vos avantages :"}</span>
              {tier?.perks && (isRtl ? tier.perks.ar : tier.perks.fr).map((perk: string, i: number) => (
                <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 list-none">
                  <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  {perk}
                </li>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Point Exchange (coupons) */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-8">
          <Gift className="text-accent" size={28} />
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            {isRtl ? "استبدال النقاط بكوبونات خصم" : "Échanger mes points"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {rewardsCatalog.map((reward: any) => {
            const canRedeem = profile?.points >= reward.points;
            const isProcessing = redeeming === reward.id;
            const Icon = reward.icon === "Ticket" ? Ticket : reward.icon === "Zap" ? Zap : reward.icon === "Trophy" ? Trophy : reward.icon === "Gem" ? Gem : Gift;

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
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-purple-500"></div>

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-purple-500/20 flex items-center justify-center mb-6">
                  <Icon className="text-accent" size={32} />
                </div>

                <h4 className="font-black text-xl text-slate-800 dark:text-white mb-2 leading-tight">
                  {isRtl ? reward.title?.ar : reward.title?.fr}
                </h4>

                <div className="mt-auto pt-6">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coût d'échange</span>
                    <span className={`font-black text-xl ${canRedeem ? 'text-yellow-500' : 'text-slate-400'}`}>
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

        {profile?.transactions?.length > 0 ? (
          <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-8">
            {profile.transactions.map((tx: any) => {
              const isEarn = (tx.signed ?? 0) >= 0;
              return (
                <div key={tx.id} className="relative">
                  <span className={`absolute left-[-31px] top-1.5 w-4.5 h-4.5 rounded-full border-4 border-white dark:border-slate-900 shadow-md ${isEarn ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {isRtl ? tx.titleAr : tx.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString(language === 'ar' ? 'ar-DZ' : 'fr-FR', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : ""}
                      </span>
                    </div>
                    <span className={`text-base font-black px-3 py-1 rounded-xl self-start sm:self-center ${isEarn ? 'bg-emerald-100/60 dark:bg-emerald-950/20 text-emerald-600' : 'bg-red-100/60 dark:bg-red-950/20 text-red-500'}`}>
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

      {/* Spin Wheel Prize announcement modal */}
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
                className="w-full bg-slate-900 dark:bg-accent text-white py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-md cursor-pointer"
              >
                {isRtl ? "متابعة" : "Continuer"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help hint */}
      <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400 font-bold">
        <HelpCircle size={14} />
        {isRtl ? "النقاط تُمنح تلقائياً عند إتمام طلبك (الحالة: تم التسليم)" : "Les points sont crédités automatiquement à la fin de votre commande (Terminé)"}
      </div>
    </div>
  );
}
