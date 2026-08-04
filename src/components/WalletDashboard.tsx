// src/components/WalletDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { getWalletDetailsAction } from "@/app/actions/wallet-actions";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Coins, Wallet, Gift, Copy, Check, RefreshCw, 
  ArrowUpRight, ArrowDownLeft, Calendar, Info 
} from "lucide-react";
import { toast } from "sonner";

interface WalletDashboardProps {
  userId: string;
}

export default function WalletDashboard({ userId }: WalletDashboardProps) {
  const { language } = useAppStore();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isRtl = language === "ar";
  const referralCode = (wallet?.referralCode || userId.substring(userId.length - 6)).toUpperCase();
  const referralLink = `https://artisan-imprimeur.dz/register?ref=${referralCode}`;

  const loadWalletData = async () => {
    setLoading(true);
    const res = await getWalletDetailsAction(userId);
    if (res.success && res.wallet) {
      setWallet(res.wallet);
    } else {
      toast.error(isRtl ? "فشل تحميل محفظتك الشخصية" : "Échec du chargement du portefeuille.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWalletData();
  }, [userId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(isRtl ? "تم نسخ الرابط بنجاح!" : "Lien de parrainage copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  // Translation helpers
  const t = {
    walletTitle: isRtl ? "محفظتي الرقمية" : "Mon Portefeuille",
    pointsBalance: isRtl ? "نقاط الولاء" : "Points de Fidélité",
    creditBalance: isRtl ? "الرصيد المالي" : "Crédit Portefeuille",
    referralTitle: isRtl ? "برنامج الإحالة المزدوج" : "Parrainage Gagnant",
    referralDesc: isRtl 
      ? "شارك رابط الإحالة الخاص بك! عندما يقوم صديق بالتسجيل والطلب، ستحصل على 500 دج + 100 نقطة، ويحصل هو على 50 نقطة ترحيبية!" 
      : "Partagez votre lien de parrainage ! Lorsqu'un ami s'inscrit et commande, vous recevez 500 DA + 100 points, et il obtient 50 points !",
    copyBtn: isRtl ? "نسخ الرابط" : "Copier le lien",
    copiedBtn: isRtl ? "تم النسخ!" : "Copié !",
    txHistory: isRtl ? "سجل العمليات" : "Historique des Transactions",
    noTransactions: isRtl ? "لا توجد عمليات حالية" : "Aucune transaction pour le moment.",
    pointsUnit: isRtl ? "نقطة" : "Pts",
    currencyUnit: isRtl ? "دج" : "DA",
  };

  if (loading) {
    return (
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/10 flex justify-center items-center h-64">
        <RefreshCw size={28} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance Cards (Side-by-Side Glassmorphic Tiles) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Cash Wallet Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-glass p-6 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-lg relative overflow-hidden group hover:shadow-xl transition-all"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block mb-1">
                {t.creditBalance}
              </span>
              <h2 className="text-4xl font-black text-blue-650 dark:text-blue-400">
                {wallet?.creditBalance?.toLocaleString() || "0"} <span className="text-sm font-bold">{t.currencyUnit}</span>
              </h2>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Wallet size={24} />
            </div>
          </div>
        </motion.div>

        {/* Loyalty Points Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="premium-glass p-6 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-lg relative overflow-hidden group hover:shadow-xl transition-all"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <span className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest block mb-1">
                {t.pointsBalance}
              </span>
              <h2 className="text-4xl font-black text-amber-600 dark:text-amber-400">
                {wallet?.pointsBalance || "0"} <span className="text-sm font-bold">{t.pointsUnit}</span>
              </h2>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Coins size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Glassmorphic Viral Referral Box */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="premium-glass p-6 md:p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-550/10 rounded-full blur-3xl -mr-8 -mt-8"></div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
              <Gift size={20} />
            </div>
            <h4 className="font-black text-slate-900 dark:text-white text-base">
              {t.referralTitle}
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
            {t.referralDesc}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="flex-1 bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 px-4 py-3 rounded-2xl text-xs font-semibold font-mono tracking-tight text-slate-700 dark:text-slate-300 truncate select-all flex items-center justify-between">
              <span>{referralLink}</span>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-750 text-white rounded-2xl font-black text-xs shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-103 shrink-0"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  <span>{t.copiedBtn}</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>{t.copyBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Transactions List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="premium-glass p-6 md:p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-lg"
      >
        <h4 className="font-black text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
          {t.txHistory}
        </h4>

        <div className="space-y-3">
          {wallet?.transactions?.length === 0 ? (
            <div className="text-center py-10 text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
              <Info size={18} />
              <span>{t.noTransactions}</span>
            </div>
          ) : (
            wallet?.transactions?.map((tx: any, idx: number) => {
              const isCredit = tx.type !== "DEBIT" && tx.type !== "REWARD_SPIN";
              
              return (
                <div 
                  key={tx.id}
                  className="p-4 bg-white/40 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/40 rounded-2xl flex items-center justify-between gap-4 transition-all hover:bg-white/60 dark:hover:bg-slate-900/40"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      isCredit 
                        ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450" 
                        : "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-450"
                    }`}>
                      {isCredit ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                        {isRtl ? tx.titleAr || tx.title : tx.title}
                      </h5>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1 mt-1">
                        <Calendar size={10} />
                        {new Date(tx.createdAt).toLocaleDateString(language === "ar" ? "ar-DZ" : "fr-CA", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {tx.amount && (
                      <span className={`block font-black text-sm ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {isCredit ? "+" : "-"}{tx.amount} {t.currencyUnit}
                      </span>
                    )}
                    {tx.points && (
                      <span className={`block font-black text-xs ${isCredit ? "text-amber-500" : "text-red-400"}`}>
                        {isCredit ? "+" : "-"}{tx.points} {t.pointsUnit}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
