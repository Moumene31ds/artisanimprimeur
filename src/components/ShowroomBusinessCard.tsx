"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import {
  Phone, MapPin, Globe, Mail, User, Building2, Pencil, Download,
  RotateCcw, Check, X, Share2, QrCode, CreditCard, Loader2
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
  address: "Oran, Algérie",
  website: "https://artisanimprimeur.vercel.app",
  companyName: "L'Artisan Imprimeur",
};

type CardTheme = "noir" | "royal" | "emerald" | "minimal" | "holographic";

const THEMES: Record<CardTheme, { bg: string; text: string; accent: string; label: string; labelAr: string; bgHex: string[]; textHex: string; accentHex: string }> = {
  noir: {
    bg: "from-[#0a0a0a] via-[#1a1a2e] to-[#16213e]",
    text: "text-white",
    accent: "text-amber-400",
    label: "Noir Elite",
    labelAr: "كلاسيكي فاخر",
    bgHex: ["#0a0a0a", "#1a1a2e", "#16213e"],
    textHex: "#ffffff",
    accentHex: "#fbbf24",
  },
  royal: {
    bg: "from-[#1e1b4b] via-[#312e81] to-[#4338ca]",
    text: "text-white",
    accent: "text-blue-200",
    label: "Royal Blue",
    labelAr: "أزرق ملكي",
    bgHex: ["#1e1b4b", "#312e81", "#4338ca"],
    textHex: "#ffffff",
    accentHex: "#bfdbfe",
  },
  emerald: {
    bg: "from-[#022c22] via-[#064e3b] to-[#065f46]",
    text: "text-white",
    accent: "text-emerald-200",
    label: "Emerald",
    labelAr: "زمردي",
    bgHex: ["#022c22", "#064e3b", "#065f46"],
    textHex: "#ffffff",
    accentHex: "#a7f3d0",
  },
  minimal: {
    bg: "from-white via-slate-50 to-slate-100",
    text: "text-slate-900",
    accent: "text-slate-500",
    label: "Minimal White",
    labelAr: "أبيض بسيط",
    bgHex: ["#ffffff", "#f8fafc", "#f1f5f9"],
    textHex: "#0f172a",
    accentHex: "#64748b",
  },
  holographic: {
    bg: "from-[#0f0c29] via-[#302b63] to-[#24243e]",
    text: "text-white",
    accent: "text-pink-300",
    label: "Holographic",
    labelAr: "هولوغرام",
    bgHex: ["#0f0c29", "#302b63", "#24243e"],
    textHex: "#ffffff",
    accentHex: "#f9a8d4",
  },
};

// ============================================================
// Offscreen HTML clone — pixel-perfect export via html2canvas
// ============================================================

function buildCardHTML(data: BusinessCardData, theme: CardTheme, showFront: boolean): string {
  const tc = THEMES[theme];
  const [bg0, bg1, bg2] = tc.bgHex;
  const textColor = tc.textHex;
  const accentColor = tc.accentHex;
  const qrFg = theme === "minimal" ? "#1e293b" : "#0f172a";
  const initials = data.companyName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const holoOverlay = theme === "holographic"
    ? `<div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,255,255,0.08),rgba(128,0,255,0.06) 25%,rgba(255,0,128,0.08) 50%,rgba(0,255,255,0.06) 75%,rgba(128,0,255,0.08));pointer-events:none;z-index:1"></div>`
    : "";

  const noirAccent = theme === "noir"
    ? `<div style="position:absolute;top:0;right:0;width:96px;height:96px;pointer-events:none;z-index:1">
        <div style="position:absolute;top:0;right:0;width:100%;height:100%;background:linear-gradient(to bottom left,rgba(251,191,36,0.3),transparent)"></div>
        <div style="position:absolute;top:12px;right:12px;width:32px;height:1px;background:rgba(251,191,36,0.5)"></div>
        <div style="position:absolute;top:12px;right:12px;width:1px;height:32px;background:rgba(251,191,36,0.5)"></div>
       </div>`
    : "";

  if (showFront) {
    return `
      <div style="width:1020px;height:648px;background:linear-gradient(135deg,${bg0},${bg1},${bg2});position:relative;overflow:hidden;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;padding:48px;display:flex;flex-direction:column;justify-content:space-between">
        ${holoOverlay}
        ${noirAccent}
        <!-- Top: Company + Badge -->
        <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <p style="margin:0;font-size:13px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:${accentColor}">${data.companyName}</p>
            <div style="width:40px;height:2px;background:linear-gradient(to right,${accentColor},transparent);opacity:0.4;margin-top:4px;border-radius:999px"></div>
          </div>
          <div style="width:52px;height:52px;border-radius:12px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:rgba(255,255,255,0.8)">${initials}</div>
        </div>

        <!-- Middle: Name + Title -->
        <div style="position:relative;z-index:2;flex:1;display:flex;flex-direction:column;justify-content:center">
          <h3 style="margin:0;font-size:36px;font-weight:900;color:${textColor};line-height:1.15;letter-spacing:-0.5px">${data.name}</h3>
          <p style="margin:6px 0 0;font-size:15px;font-weight:700;color:${accentColor};letter-spacing:0.5px">${data.title}</p>
        </div>

        <!-- Bottom: Contact + QR -->
        <div style="position:relative;z-index:2;display:flex;align-items:flex-end;justify-content:space-between;gap:24px">
          <div style="display:flex;flex-direction:column;gap:8px;min-width:0;flex:1">
            ${data.phone ? `<div style="display:flex;align-items:center;gap:10px;color:${textColor};opacity:0.8"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.7"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg><span style="font-size:13px;font-weight:700">${data.phone}</span></div>` : ""}
            ${data.email ? `<div style="display:flex;align-items:center;gap:10px;color:${textColor};opacity:0.8"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.7"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg><span style="font-size:13px;font-weight:700">${data.email}</span></div>` : ""}
            ${data.address ? `<div style="display:flex;align-items:center;gap:10px;color:${textColor};opacity:0.8"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.7"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg><span style="font-size:13px;font-weight:700">${data.address}</span></div>` : ""}
          </div>
          <div id="qr-export" data-qr-url="${data.website || DEFAULT_CARD.website}?ref=card&amp;q=${encodeURIComponent(data.name)}" data-qr-fg="${qrFg}" style="width:80px;height:80px;flex-shrink:0;background:#fff;border-radius:8px;padding:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15)"></div>
        </div>
      </div>`;
  }

  // Back face
  return `
    <div style="width:1020px;height:648px;background:linear-gradient(135deg,${bg0},${bg1},${bg2});position:relative;overflow:hidden;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center">
      ${holoOverlay}
      <div style="text-align:center;position:relative;z-index:2">
        <div style="width:80px;height:80px;margin:0 auto 20px;border-radius:18px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:rgba(255,255,255,0.8)">${initials}</div>
        <p style="margin:0 0 8px;font-size:26px;font-weight:900;color:${textColor};letter-spacing:-0.5px">${data.companyName}</p>
        <div style="width:48px;height:1.5px;background:linear-gradient(to right,transparent,${accentColor},transparent);margin:0 auto 12px;opacity:0.4"></div>
        <p style="margin:0 0 28px;font-size:14px;font-weight:700;color:${accentColor};letter-spacing:1px;text-transform:uppercase">${data.title}</p>
        <div id="qr-export-back" data-qr-url="${data.website || DEFAULT_CARD.website}?ref=card&amp;q=${encodeURIComponent(data.name)}" data-qr-fg="${qrFg}" style="width:120px;height:120px;margin:0 auto;background:#fff;border-radius:16px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,0.15)"></div>
        <p style="margin:14px 0 0;font-size:11px;font-weight:700;color:${textColor};opacity:0.5;letter-spacing:2px">SCANNER POUR VISITER LE SITE</p>
      </div>
    </div>`;
}

async function captureExportCard(
  data: BusinessCardData,
  theme: CardTheme,
  showFront: boolean,
): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");

  // Create offscreen container
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;overflow:hidden;";
  document.body.appendChild(container);

  // Inject HTML
  container.innerHTML = buildCardHTML(data, theme, showFront);

  // Render QR codes into the placeholder divs using QRCodeCanvas
  const qrDivs = container.querySelectorAll("[id^='qr-export']");
  for (const qrDiv of qrDivs) {
    const qrUrl = qrDiv.getAttribute("data-qr-url") || "";
    const qrFg = qrDiv.getAttribute("data-qr-fg") || "#0f172a";
    const isBack = qrDiv.id.includes("back");

    const qrHolder = document.createElement("div");
    qrHolder.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%;";
    qrDiv.appendChild(qrHolder);

    // Render QRCodeCanvas via a temporary React root
    try {
      const { createRoot } = await import("react-dom/client");
      const { QRCodeCanvas: QRCC } = await import("qrcode.react");
      const root = createRoot(qrHolder);
      root.render(React.createElement(QRCC, {
        value: qrUrl,
        size: isBack ? 100 : 68,
        level: "M",
        bgColor: "#ffffff",
        fgColor: qrFg,
        includeMargin: false,
      }));
      // Wait for React render + paint
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      root.unmount();
    } catch {
      // Fallback: empty white square
      const img = document.createElement("div");
      img.style.cssText = "width:100%;height:100%;background:#fff;";
      qrHolder.appendChild(img);
    }
  }

  // Small delay for rendering
  await new Promise((r) => setTimeout(r, 150));

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      backgroundColor: null,
      scale: 3,
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 5000,
    });
    return canvas;
  } finally {
    document.body.removeChild(container);
  }
}

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
  const [isDownloading, setIsDownloading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const t = THEMES[theme];

  const websiteUrl = card.website || DEFAULT_CARD.website;
  const qrValue = `${websiteUrl}?ref=card&q=${encodeURIComponent(card.name)}`;

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    const toastId = toast.loading(isRtl ? "جاري تجهيز البطاقة..." : "Préparation de la carte...", { duration: 30000 });

    try {
      const canvas = await captureExportCard(card, theme, !flipped);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            toast.error(isRtl ? "فشل إنشاء الصورة" : "Échec de création", { id: toastId });
            setIsDownloading(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `carte-visite-${card.name.replace(/\s+/g, "-").toLowerCase()}-${theme}-${Date.now()}.png`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          toast.success(
            isRtl
              ? `تم التحميل بنجاح — ${canvas.width}×${canvas.height}px (${(blob.size / 1024).toFixed(0)} KB)`
              : `Téléchargé — ${canvas.width}×${canvas.height}px (${(blob.size / 1024).toFixed(0)} Ko)`,
            { id: toastId },
          );
          setIsDownloading(false);
        },
        "image/png",
        1.0,
      );
    } catch (err) {
      console.error("Download failed:", err);
      toast.error(
        isRtl ? "حدث خطأ أثناء التحميل. حاول مرة أخرى." : "Erreur lors du téléchargement.",
        { id: toastId },
      );
      setIsDownloading(false);
    }
  }, [card, theme, flipped, isDownloading, isRtl]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${card.name} — ${card.companyName}`,
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
                      {theme === "noir" && (
                        <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none z-10">
                          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-amber-400/30 to-transparent" />
                          <div className="absolute top-3 right-3 w-8 h-[1px] bg-amber-400/50" />
                          <div className="absolute top-3 right-3 w-[1px] h-8 bg-amber-400/50" />
                        </div>
                      )}
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
                      <div className="relative z-20 flex-1 flex flex-col justify-center">
                        <h3 className={`text-xl sm:text-2xl font-black ${t.text} leading-tight tracking-tight`}>
                          {card.name}
                        </h3>
                        <p className={`text-xs font-bold ${t.accent} mt-1 tracking-wide`}>
                          {card.title}
                        </p>
                      </div>
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
                          <QRCodeSVG value={qrValue} size={56} level="M" bgColor="white" fgColor={theme === "minimal" ? "#1e293b" : "#0f172a"} />
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
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isDownloading ? (
                  <><Loader2 size={13} className="animate-spin" /> {isRtl ? "جاري..." : "Export..."}</>
                ) : (
                  <><Download size={13} /> {isRtl ? "تحميل JPEG عالي الجودة" : "Télécharger HD"}</>
                )}
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
              <span className="text-indigo-500">🎨</span>
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
                  <EditableField value={card.name} onChange={(v) => update("name", v)} icon={User} label="Full Name" labelAr="الاسم الكامل" isRtl={isRtl} />
                  <EditableField value={card.title} onChange={(v) => update("title", v)} icon={Building2} label="Job Title" labelAr="المسمى الوظيفي" isRtl={isRtl} />
                  <EditableField value={card.companyName} onChange={(v) => update("companyName", v)} icon={Building2} label="Company" labelAr="اسم الشركة" isRtl={isRtl} />
                  <EditableField value={card.phone} onChange={(v) => update("phone", v)} icon={Phone} label="Phone" labelAr="رقم الهاتف" isRtl={isRtl} />
                  <EditableField value={card.email} onChange={(v) => update("email", v)} icon={Mail} label="Email" labelAr="البريد الإلكتروني" isRtl={isRtl} />
                  <EditableField value={card.address} onChange={(v) => update("address", v)} icon={MapPin} label="Address" labelAr="العنوان" isRtl={isRtl} multiline />
                  <EditableField value={card.website} onChange={(v) => update("website", v)} icon={Globe} label="Website URL" labelAr="رابط الموقع الإلكتروني" isRtl={isRtl} />
                  <button
                    onClick={() => { setCard(DEFAULT_CARD); toast.info(isRtl ? "تمت إعادة البيانات الافتراضية" : "Données réinitialisées"); }}
                    className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-[10px] font-black text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    {isRtl ? "إعادة البيانات الافتراضية" : "Réinitialiser"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* QR Code Preview */}
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

          {/* Print specs */}
          <div className="px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-bold text-slate-400 leading-relaxed">
              {isRtl
                ? "📐 المقاس: 85.6 × 53.98 مم (ISO/IEC 7810 ID-1) — جودة 3x (3072 × 1944 px) — PNG lossless — جاهزة للطباعة offset."
                : "📐 Format : 85,6 × 53,98 mm (ISO/IEC 7810 ID-1) — Qualité 3x (3072 × 1944 px) — PNG lossless — Prête pour impression."}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes holographic-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
