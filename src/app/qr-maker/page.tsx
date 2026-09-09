"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import { 
  QrCode, Download, Link as LinkIcon, RefreshCw, Palette, 
  Image as ImageIcon, Sparkles, Check, Copy, ShieldCheck, FileCode 
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { triggerHapticFeedback } from "@/lib/utils";

const COLOR_PRESETS = [
  { label: "Noir Classique", labelAr: "أسود كلاسيكي", fg: "#0f172a", bg: "#ffffff" },
  { label: "Bleu Océan", labelAr: "أزرق ملكي", fg: "#2563eb", bg: "#ffffff" },
  { label: "Émeraude Pro", labelAr: "أخضر زمردي", fg: "#059669", bg: "#ffffff" },
  { label: "Violet Luxe", labelAr: "بنفسجي فاخر", fg: "#7c3aed", bg: "#ffffff" },
  { label: "Or Sombre", labelAr: "ذهبي راقٍ", fg: "#92400e", bg: "#fffbeb" },
];

export default function QRMakerPage() {
  const { language } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState("https://artisan-imprimeur.dz");
  const [fgColor, setFgColor] = useState("#0f172a");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [errorLevel, setErrorLevel] = useState<"L" | "M" | "Q" | "H">("H");
  const [includeMargin, setIncludeMargin] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isRtl = language === "ar";

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(isRtl ? "حجم الصورة كبير جداً (أقصى حد 2 ميغابايت)" : "Image trop volumineuse (max 2 Mo)");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setLogoUrl(reader.result as string);
        setErrorLevel("H"); // Auto elevate to High for logo readability
        toast.success(isRtl ? "تم إدراج الشعار في وسط الـ QR" : "Logo inséré avec succès !");
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadPNG = () => {
    try {
      triggerHapticFeedback("medium");
    } catch {}

    const svgElement = qrRef.current?.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // 300 DPI Export scale (1200x1200px)
    const exportSize = 1200;
    canvas.width = exportSize;
    canvas.height = exportSize;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, exportSize, exportSize);
        ctx.drawImage(img, 0, 0, exportSize, exportSize);

        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `LArtisan_QR_300DPI_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(isRtl ? "تم تنزيل الصورة بدقة 300 DPI للطباعة!" : "QR Code 300 DPI téléchargé !");
      }
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  const downloadSVG = () => {
    try {
      triggerHapticFeedback("medium");
    } catch {}

    const svgElement = qrRef.current?.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LArtisan_QR_Vector_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(isRtl ? "تم تنزيل ملف SVG المتجهي للمطبعة!" : "Fichier SVG Vectoriel téléchargé !");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(isRtl ? "تم نسخ الرابط" : "Lien copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`animate-fadeIn pb-24 max-w-5xl mx-auto px-4 ${isRtl ? "text-right" : "text-left"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-10 pt-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-5 border border-emerald-500/20 shadow-inner">
          <QrCode size={40} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-2">
          {isRtl ? "صانع رموز الـ QR المطبعي الذكي" : "Générateur QR Code Haute Résolution"}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-lg">
          {isRtl
            ? "أنشئ رمز QR مخصصاً مع شعارك وألوانك وحمّله بدقة 300 DPI أو بصيغة SVG متجهة صالحة للطباعة على الكروت واللافتات."
            : "Générez un QR code sur-mesure avec votre logo et téléchargez-le en SVG vectoriel ou PNG 300 DPI pour vos impressions."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Controls Form */}
        <div className="lg:col-span-7 ios-glass rounded-[2.5rem] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-xl space-y-6">
          {/* Text/URL Input */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <LinkIcon size={15} className="text-emerald-500" />
              {isRtl ? "الرابط أو النص المشفر (URL / Text)" : "Lien cible ou Texte"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="https://instagram.com/votre_marque"
                className="w-full p-4 pl-4 pr-12 bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm sm:text-base font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all dir-ltr"
                dir="ltr"
              />
              <button
                type="button"
                onClick={copyLink}
                className={`absolute ${isRtl ? "left-3" : "right-3"} top-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors`}
                title={isRtl ? "نسخ" : "Copier"}
              >
                {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          {/* Color Presets */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Palette size={15} className="text-emerald-500" />
              {isRtl ? "التنسيق اللوني السريع" : "Palette de Couleurs"}
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setFgColor(preset.fg);
                    setBgColor(preset.bg);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:scale-105 transition-all"
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: preset.fg }}
                  />
                  <span>{isRtl ? preset.labelAr : preset.label}</span>
                </button>
              ))}
            </div>

            {/* Custom hex colors */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{isRtl ? "لون الكود" : "Couleur QR"}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{isRtl ? "لون الخلفية" : "Arrière-plan"}</span>
              </div>
            </div>
          </div>

          {/* Logo Upload & Options */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <ImageIcon size={15} className="text-emerald-500" />
              {isRtl ? "إدراج شعار في المنتصف (اختياري)" : "Intégrer votre Logo (Optionnel)"}
            </label>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all border border-emerald-500/20"
              >
                <ImageIcon size={15} />
                {logoUrl ? (isRtl ? "تغيير الشعار" : "Changer de logo") : (isRtl ? "رفع شعارك" : "Téléverser logo")}
              </button>

              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl(null)}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  {isRtl ? "إزالة الشعار" : "Supprimer"}
                </button>
              )}
            </div>
          </div>

          {/* Advanced Print Options */}
          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-wrap gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMargin}
                onChange={(e) => setIncludeMargin(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 accent-emerald-500"
              />
              <span>{isRtl ? "هامش أمان مطبعي (Margin)" : "Marge de sécurité"}</span>
            </label>

            <div className="flex items-center gap-2">
              <span>{isRtl ? "مستوى التصحيح:" : "Correction d'erreur :"}</span>
              <select
                value={errorLevel}
                onChange={(e) => setErrorLevel(e.target.value as any)}
                className="bg-white/60 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 outline-none text-xs"
              >
                <option value="L">L (7%)</option>
                <option value="M">M (15%)</option>
                <option value="Q">Q (25%)</option>
                <option value="H">H (30% - Recommandé)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Col: Live Vector Preview & Download */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
          <div className="text-center">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
              {isRtl ? "معاينة حية فورية" : "Aperçu Vectoriel HD"}
            </span>
            <span className="text-xs text-slate-400">
              {isRtl ? "جاهز تماماً للطباعة دون تشويش" : "100% vectoriel, prêt pour l'offset"}
            </span>
          </div>

          {/* QR Code Container */}
          <div
            ref={qrRef}
            className="p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 flex items-center justify-center transition-all"
            style={{ backgroundColor: bgColor }}
          >
            <QRCodeSVG
              value={text || "https://artisan-imprimeur.dz"}
              size={240}
              fgColor={fgColor}
              bgColor={bgColor}
              level={errorLevel}
              includeMargin={includeMargin}
              imageSettings={
                logoUrl
                  ? {
                      src: logoUrl,
                      x: undefined,
                      y: undefined,
                      height: 48,
                      width: 48,
                      excavate: true,
                    }
                  : undefined
              }
            />
          </div>

          {/* Download Action Buttons */}
          <div className="w-full space-y-3 pt-2">
            <button
              type="button"
              onClick={downloadPNG}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download size={18} />
              {isRtl ? "تحميل عالي الدقة (PNG 300 DPI)" : "Télécharger PNG (300 DPI Imprimable)"}
            </button>

            <button
              type="button"
              onClick={downloadSVG}
              className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <FileCode size={16} />
              {isRtl ? "تحميل ملف متجهي (SVG للمطبعة)" : "Télécharger SVG Vectoriel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
