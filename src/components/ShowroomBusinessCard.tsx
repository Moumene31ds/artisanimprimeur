"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Phone, MapPin, Globe, Mail, User, Building2, Pencil, Download,
  RotateCcw, Palette, Sparkles, Check, X, Copy, Share2, QrCode, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

export interface BusinessCardData {
  name: string;
  title: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  companyName: string;
}

const DEFAULT_CARD: BusinessCardData = {
  name: "Mohamed Amine",
  title: "Directeur Commercial",
  phone: "+212 6 00 00 00 00",
  email: "contact@artisanimprimeur.com",
  address: "Casablanca, Maroc",
  website: "https://artisanimprimeur.vercel.app",
  companyName: "L'Artisan Imprimeur",
};

type CardTheme = "noir" | "royal" | "emerald" | "minimal" | "holographic";

const THEMES: Record<CardTheme, { bg: string; text: string; accent: string; gradient: string; label: string; labelAr: string }> = {
  noir: {
    bg: "from-[#0a0a0a] via-[#1a1a2e] to-[#16213e]",
    text: "text-white",
    accent: "text-amber-400",
    gradient: "from-amber-500/20 to-yellow-500/5",
    label: "Noir Elite",
    labelAr: "كلاسيكي فاخر",
  },
  royal: {
    bg: "from-[#1e1b4b] via-[#312e81] to-[#4338ca]",
    text: "text-white",
    accent: "text-blue-200",
    gradient: "from-blue-400/20 to-purple-400/10",
    label: "Royal Blue",
    labelAr: "أزرق ملكي",
  },
  emerald: {
    bg: "from-[#022c22] via-[#064e3b] to-[#065f46]",
    text: "text-white",
    accent: "text-emerald-200",
    gradient: "from-emerald-400/20 to-teal-400/10",
    label: "Emerald",
    labelAr: "زمردي",
  },
  minimal: {
    bg: "from-white via-slate-50 to-slate-100",
    text: "text-slate-900",
    accent: "text-slate-500",
    gradient: "from-slate-200/60 to-slate-100/40",
    label: "Minimal White",
    labelAr: "أبيض بسيط",
  },
  holographic: {
    bg: "from-[#0f0c29] via-[#302b63] to-[#24243e]",
    text: "text-white",
    accent: "text-pink-300",
    gradient: "from-cyan-400/20 via-purple-400/15 to-pink-400/20",
    label: "Holographic",
    labelAr: "هولوغرام",
  },
};

function CardTilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-12deg", "12deg"]);
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["10%", "90%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["10%", "90%"]);

  const handleMove = (cx: number, cy: number) => {
    if (!ref.current || shouldReduceMotion) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((cx - rect.left - rect.width / 2) / rect.width);
    y.set((cy - rect.top - rect.height / 2) / rect.height);
  };

  const reset = () => { x.set(0); y.set(0); setActive(false); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={reset}
      onTouchStart={(e) => { const t = e.touches[0]; handleMove(t.clientX, t.clientY); setActive(true); }}
      onTouchMove={(e) => { const t = e.touches[0]; handleMove(t.clientX, t.clientY); }}
      onTouchEnd={reset}
      onTouchCancel={reset}
      style={shouldReduceMotion ? {} : { rotateX, rotateY, transformStyle: "preserve-3d" } as any}
      className={className}
    >
      <motion.div style={shouldReduceMotion ? {} : { transform: "translateZ(30px)", transformStyle: "preserve-3d" } as any}>
        <motion.div
          aria-hidden
          style={{ left: glareX, top: glareY, opacity: active ? 0.35 : 0 }}
          className="pointer-events-none absolute z-30 w-32 h-32 -ml-16 -mt-16 rounded-full bg-white blur-3xl transition-opacity duration-300"
        />
        {children}
      </motion.div>
    </motion.div>
  );
}

function EditableField({
  value, onChange, icon: Icon, label, labelAr, isRtl, multiline = false,
}: {
  value: string; onChange: (v: string) => void; icon: any;
  label: string; labelAr: string; isRtl: boolean; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => { onChange(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  return (
    <div className="group/field">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Icon size={12} className="text-indigo-500" />
          {isRtl ? labelAr : label}
        </label>
        {!editing && (
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="opacity-0 group-hover/field:opacity-100 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Pencil size={11} className="text-slate-400" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2">
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } if (e.key === "Escape") cancel(); }}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
          <button onClick={save} className="p-2 bg-emerald-500 text-white rounded-xl hover:scale-105 transition-transform cursor-pointer"><Check size={14} /></button>
          <button onClick={cancel} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:scale-105 transition-transform cursor-pointer"><X size={14} /></button>
        </div>
      ) : (
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
          {value || "—"}
        </p>
      )}
    </div>
  );
}

export default function ShowroomBusinessCard() {
  const { language } = useAppStore();
  const isRtl = language === "ar";

  const [card, setCard] = useState<BusinessCardData>(DEFAULT_CARD);
  const [theme, setTheme] = useState<CardTheme>("noir");
  const [flipped, setFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const t = THEMES[theme];

  const websiteUrl = card.website || DEFAULT_CARD.website;
  const qrValue = `${websiteUrl}?ref=card&q=${encodeURIComponent(card.name)}`;

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `business-card-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success(isRtl ? "تم تحميل البطاقة بنجاح!" : "Carte téléchargée !");
    } catch {
      toast.error(isRtl ? "حدث خطأ أثناء التحميل" : "Erreur lors du téléchargement");
    }
  }, [isRtl]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: card.name,
          text: `${card.name} — ${card.title}\n${card.phone}\n${card.address}`,
          url: websiteUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${card.name}\n${card.title}\n${card.phone}\n${card.address}\n${websiteUrl}`);
        toast.success(isRtl ? "تم نسخ معلومات البطاقة" : "Informations copiées !");
      }
    } catch {}
  };

  const update = (field: keyof BusinessCardData, value: string) => {
    setCard((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className={`w-full ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>

      {/* Header */}
      <div className="text-center mb-8">
        <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-950/40 dark:to-purple-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3 inline-flex items-center gap-1.5 border border-indigo-200/60 dark:border-indigo-900/40">
          <CreditCard size={12} />
          {isRtl ? "بطاقة عمل احترافية" : "Carte de Visite Premium"}
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {isRtl ? "صمّم بطاقة عملك الفاخرة" : "Créez votre Carte de Visite"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold max-w-md mx-auto">
          {isRtl
            ? "أدخل بياناتك أدناه، اختر النمط، ثم حمّل البطاقة بصيغة صورة عالية الجودة أو شاركها مباشرة."
            : "Renseignez vos informations, choisissez un thème, puis téléchargez ou partagez votre carte en haute qualité."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ========= LEFT: Live Preview ========= */}
        <div className="lg:col-span-7 flex flex-col items-center gap-6">
          <div className="w-full max-w-[440px]">
            <CardTilt className="w-full cursor-grab active:cursor-grabbing">
              <div
                ref={cardRef}
                className="relative w-full rounded-[2rem] overflow-hidden shadow-2xl shadow-black/20 dark:shadow-black/50"
                style={{ aspectRatio: "85.6 / 53.98" }}
              >
                <AnimatePresence mode="wait">
                  {!flipped ? (
                    <motion.div
                      key="front"
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: -90, opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                      className={`absolute inset-0 bg-gradient-to-br ${t.bg} p-6 sm:p-8 flex flex-col justify-between`}
                    >
                      {/* Holographic shimmer overlay for holographic theme */}
                      {theme === "holographic" && (
                        <div
                          className="absolute inset-0 pointer-events-none z-10"
                          style={{
                            background: "linear-gradient(135deg, rgba(0,255,255,0.08) 0%, rgba(128,0,255,0.06) 25%, rgba(255,0,128,0.08) 50%, rgba(0,255,255,0.06) 75%, rgba(128,0,255,0.08) 100%)",
                            backgroundSize: "400% 400%",
                            animation: "holographic-shift 6s ease infinite",
                          }}
                        />
                      )}

                      {/* Gold foil corner accent for noir theme */}
                      {theme === "noir" && (
                        <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none z-10">
                          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-amber-400/30 to-transparent" />
                          <div className="absolute top-3 right-3 w-8 h-[1px] bg-amber-400/50" />
                          <div className="absolute top-3 right-3 w-[1px] h-8 bg-amber-400/50" />
                        </div>
                      )}

                      {/* Top section: Company + Logo placeholder */}
                      <div className="relative z-20">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${t.accent} mb-1`}>
                              {card.companyName}
                            </p>
                            <div className="w-10 h-[2px] bg-gradient-to-r from-current to-transparent rounded-full opacity-40" />
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-[10px] font-black opacity-80">
                            {card.companyName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Name & Title */}
                      <div className="relative z-20 flex-1 flex flex-col justify-center">
                        <h3 className={`text-xl sm:text-2xl font-black ${t.text} leading-tight tracking-tight`}>
                          {card.name}
                        </h3>
                        <p className={`text-xs font-bold ${t.accent} mt-1 tracking-wide`}>
                          {card.title}
                        </p>
                      </div>

                      {/* Bottom: Contact info + QR */}
                      <div className="relative z-20 flex items-end justify-between gap-4">
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                          {card.phone && (
                            <div className={`flex items-center gap-2 ${t.text} opacity-80`}>
                              <Phone size={10} className="shrink-0 opacity-70" />
                              <span className="text-[10px] font-bold truncate">{card.phone}</span>
                            </div>
                          )}
                          {card.email && (
                            <div className={`flex items-center gap-2 ${t.text} opacity-80`}>
                              <Mail size={10} className="shrink-0 opacity-70" />
                              <span className="text-[10px] font-bold truncate">{card.email}</span>
                            </div>
                          )}
                          {card.address && (
                            <div className={`flex items-center gap-2 ${t.text} opacity-80`}>
                              <MapPin size={10} className="shrink-0 opacity-70" />
                              <span className="text-[10px] font-bold truncate">{card.address}</span>
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 bg-white rounded-lg p-1.5 shadow-lg">
                          <QRCodeSVG
                            value={qrValue}
                            size={56}
                            level="M"
                            bgColor="white"
                            fgColor={theme === "minimal" ? "#1e293b" : "#0f172a"}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="back"
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: -90, opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                      className={`absolute inset-0 bg-gradient-to-br ${t.bg} p-6 sm:p-8 flex flex-col items-center justify-center`}
                    >
                      <div className="text-center relative z-20">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-lg font-black">
                          {card.companyName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <p className={`text-lg font-black ${t.text} tracking-tight`}>{card.companyName}</p>
                        <div className="w-12 h-[1.5px] bg-gradient-to-r from-transparent via-current to-transparent mx-auto my-3 opacity-40" />
                        <p className={`text-[10px] font-bold ${t.accent} tracking-wide mb-4`}>{card.title}</p>
                        <div className="bg-white rounded-2xl p-3 shadow-xl inline-block">
                          <QRCodeSVG value={qrValue} size={96} level="H" bgColor="white" fgColor="#0f172a" />
                        </div>
                        <p className={`text-[9px] font-bold ${t.text} opacity-50 mt-3 tracking-wider`}>
                          {isRtl ? "امسح لل.goto الموقع" : "SCANNER POUR VISITER LE SITE"}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardTilt>

            {/* Card controls */}
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setFlipped(!flipped)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <RotateCcw size={13} />
                {isRtl ? (flipped ? "الوجه الأمامي" : "الوجه الخلفي") : (flipped ? "Face Avant" : "Face Arrière")}
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black transition-all cursor-pointer ${
                  isEditing
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Pencil size={13} />
                {isRtl ? "تعديل البيانات" : "Modifier"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <Download size={13} />
                {isRtl ? "تحميل" : "Télécharger"}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <Share2 size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ========= RIGHT: Customizer Sidebar ========= */}
        <div className="lg:col-span-5 space-y-5">

          {/* Theme Selector */}
          <div className="premium-glass p-5 rounded-[2rem] border border-white/60 dark:border-slate-800 shadow-xl">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Palette size={13} className="text-indigo-500" />
              {isRtl ? "اختر نمط البطاقة :" : "Choisir un thème :"}
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(THEMES) as CardTheme[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition-all ${
                    theme === key
                      ? "border-indigo-500 shadow-md shadow-indigo-500/20 scale-105"
                      : "border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className={`w-9 h-6 rounded-lg bg-gradient-to-br ${THEMES[key].bg} shadow-inner border border-white/10`} />
                  <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 text-center leading-tight">
                    {isRtl ? THEMES[key].labelAr : THEMES[key].label}
                  </span>
                  {theme === key && (
                    <motion.div layoutId="theme-check" className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Editable Fields */}
          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="premium-glass p-5 rounded-[2rem] border border-white/60 dark:border-slate-800 shadow-xl space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Pencil size={13} className="text-indigo-500" />
                    {isRtl ? "تعديل معلومات البطاقة :" : "Modifier les informations :"}
                  </h3>

                  <EditableField
                    value={card.name}
                    onChange={(v) => update("name", v)}
                    icon={User}
                    label="Full Name"
                    labelAr="الاسم الكامل"
                    isRtl={isRtl}
                  />
                  <EditableField
                    value={card.title}
                    onChange={(v) => update("title", v)}
                    icon={Building2}
                    label="Job Title"
                    labelAr="المسمى الوظيفي"
                    isRtl={isRtl}
                  />
                  <EditableField
                    value={card.companyName}
                    onChange={(v) => update("companyName", v)}
                    icon={Building2}
                    label="Company"
                    labelAr="اسم الشركة"
                    isRtl={isRtl}
                  />
                  <EditableField
                    value={card.phone}
                    onChange={(v) => update("phone", v)}
                    icon={Phone}
                    label="Phone"
                    labelAr="رقم الهاتف"
                    isRtl={isRtl}
                  />
                  <EditableField
                    value={card.email}
                    onChange={(v) => update("email", v)}
                    icon={Mail}
                    label="Email"
                    labelAr="البريد الإلكتروني"
                    isRtl={isRtl}
                  />
                  <EditableField
                    value={card.address}
                    onChange={(v) => update("address", v)}
                    icon={MapPin}
                    label="Address"
                    labelAr="العنوان"
                    isRtl={isRtl}
                    multiline
                  />
                  <EditableField
                    value={card.website}
                    onChange={(v) => update("website", v)}
                    icon={Globe}
                    label="Website URL"
                    labelAr="رابط الموقع الإلكتروني"
                    isRtl={isRtl}
                  />

                  {/* Reset to defaults */}
                  <button
                    onClick={() => { setCard(DEFAULT_CARD); toast.info(isRtl ? "تمت إعادة البيانات الافتراضية" : "Données réinitialisées"); }}
                    className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-[10px] font-black text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    {isRtl ? "إعادة البيانات الافتراضية" : "Réinitialiser les données"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* QR Code Preview (large) */}
          <div className="premium-glass p-5 rounded-[2rem] border border-white/60 dark:border-slate-800 shadow-xl text-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
              <QrCode size={13} className="text-indigo-500" />
              {isRtl ? "كود QR لموقعك :" : "QR Code vers votre site :"}
            </h3>
            <div className="bg-white rounded-2xl p-4 mx-auto inline-block shadow-inner border border-slate-100">
              <QRCodeSVG value={qrValue} size={128} level="H" bgColor="white" fgColor="#0f172a" />
            </div>
            <p className="text-[9px] font-bold text-slate-400 mt-3 truncate max-w-[200px] mx-auto">{websiteUrl}</p>
          </div>

          {/* Print specs info */}
          <div className="px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-bold text-slate-400 leading-relaxed">
              {isRtl
                ? "📐 المقاس القياسي: 85.6 × 53.98 مم ((Void 1) — ورق كوشيه 350غ مع طبقة لامعة أو مطفأ — جاهزة للطباعة_offset مباشرة."
                : "📐 Format standard : 85,6 × 53,98 mm (ISO/IEC 7810 ID-1) — Papier couché 350g avec finition brillante ou mate — Prêt pour impression offset."}
            </p>
          </div>

        </div>
      </div>

      {/* Holographic keyframes */}
      <style>{`
        @keyframes holographic-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
