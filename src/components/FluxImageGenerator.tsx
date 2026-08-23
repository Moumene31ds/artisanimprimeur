"use client";

// src/components/FluxImageGenerator.tsx
// Standalone Pollinations.ai / FLUX.1 image generator.
// Pure client-side: builds the Pollinations URL, streams the image, and offers
// download. No backend required — falls back to the site's provider chain via
// /api/generate-image only when Cloudinary persistence is desired.

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Download, ImageOff, Wand2, RefreshCw } from "lucide-react";
import { useAppStore } from "@/lib/store";

type Aspect = { label: string; labelAr: string; width: number; height: number };

const ASPECTS: Aspect[] = [
  { label: "Carré 1:1", labelAr: "مربع 1:1", width: 1024, height: 1024 },
  { label: "Paysage 16:9", labelAr: "أفقي 16:9", width: 1280, height: 720 },
  { label: "Portrait 9:16", labelAr: "عمودي 9:16", width: 720, height: 1280 },
];

const QUICK_PROMPTS = [
  { fr: "Cartes de visite premium noir et or, minimaliste", ar: "بطاقات زيارة فاخرة بالأسود والذهبي، مينيمالية" },
  { fr: "Flyer publicitaire moderne pour un café", ar: "منشور دعائي عصري لمقهى" },
  { fr: "Logo de marque géométrique élégant", ar: "شعار علامة تجارية هندسي أنيق" },
  { fr: "Menu de restaurant luxueux", ar: "قائمة مطعم فاخرة" },
];

export default function FluxImageGenerator() {
  const language = useAppStore((state) => state.language);
  const isRtl = language === "ar";

  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<Aspect>(ASPECTS[0]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = (fr: string, ar: string) => (isRtl ? ar : fr);

const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.error(t("Veuillez écrire une description de votre design.", "يرجى كتابة وصف لتصميمك."));
      return;
    }
    setIsGenerating(true);
    setError(null);
    setImageUrl(null);

    try {
      // Build the Pollinations.ai / FLUX.1 URL (no API key required).
      const params = new URLSearchParams({
        model: "flux",
        width: String(aspect.width),
        height: String(aspect.height),
        seed: String(Math.floor(Math.random() * 1_000_000)),
        nologo: "true",
        private: "true",
      });
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(trimmed)}?${params.toString()}`;

      // Directly set the URL — the browser will load the image.
      // Pollinations.ai generates on first GET; we rely on the <img> onLoad/onError.
      setIsImageLoading(true);
      setImageUrl(url);
    } catch (err) {
      console.error("Flux generation failed:", err);
      setError(
        t(
          "La génération a échoué. Vérifiez votre connexion puis réessayez.",
          "فشل التوليد. تحقق من اتصالك وحاول مجدداً."
        )
      );
      toast.error(
        t(
          "Échec de la génération. Réessayez dans quelques secondes.",
          "فشل التوليد. حاول مجدداً بعد لحظات."
        )
      );
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, aspect, t]);

  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `lartisan-flux-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast.success(t("Image téléchargée.", "تم تحميل الصورة."));
    } catch {
      toast.error(t("Échec du téléchargement.", "فشل التحميل."));
    }
  }, [imageUrl, t]);

  const handleRetry = () => handleGenerate();

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Prompt input */}
      <div className="premium-glass rounded-3xl p-5 md:p-6 space-y-4 border border-white/60 dark:border-white/5 shadow-xl">
        <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
          <Wand2 size={16} className="text-accent" />
          {t("Décrivez votre design", "صف تصميمك")}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t(
            "Ex: Carte de visite premium dorée, minimaliste, sur fond noir mat…",
            "مثال: بطاقة زيارة فاخرة ذهبية، مينيمالية، على خلفية سوداء غير لامعة…"
          )}
          rows={3}
          className="w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-accent/40 transition"
          maxLength={500}
        />

        {/* Quick prompt chips */}
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.fr}
              type="button"
              onClick={() => setPrompt(isRtl ? p.ar : p.fr)}
              className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer"
            >
              {isRtl ? p.ar : p.fr}
            </button>
          ))}
        </div>

        {/* Aspect ratio selector */}
        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
            {t("Format / Ratio", "المقاس / النسبة")}
          </span>
          <div className="flex flex-wrap gap-2">
            {ASPECTS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => setAspect(a)}
                className={`px-4 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  aspect.width === a.width && aspect.height === a.height
                    ? "bg-accent text-white border-accent shadow-lg shadow-accent/25"
                    : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-accent/50"
                }`}
              >
                {isRtl ? a.labelAr : a.label}
                <span className="block text-[9px] opacity-70 font-bold mt-0.5">
                  {a.width}×{a.height}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-slate-900 via-slate-800 to-accent dark:from-accent dark:via-accent dark:to-purple-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-accent/30 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              {t("Génération en cours…", "جاري التوليد…")}
            </>
          ) : (
            <>
              <Sparkles size={18} />
              {t("Générer l'image", "توليد الصورة")}
            </>
          )}
        </button>
      </div>

      {/* Result area */}
      <div className="relative rounded-3xl overflow-hidden border border-white/60 dark:border-white/5 shadow-2xl bg-slate-100 dark:bg-slate-900 aspect-[4/3]">
        <AnimatePresence mode="wait">
          {isGenerating || isImageLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent/20 to-purple-500/20 animate-pulse flex items-center justify-center">
                <Loader2 size={32} className="text-accent animate-spin" />
              </div>
              <p className="text-xs font-bold text-slate-400 animate-pulse">
                {t("FLUX.1 génère votre design…", "FLUX.1 يولد تصميمك…")}
              </p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
            >
              <ImageOff size={40} className="text-red-400" />
              <p className="text-sm font-bold text-red-500">{error}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-1 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-xs font-black flex items-center gap-2 hover:bg-red-500/20 transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
                {t("Réessayer", "إعادة المحاولة")}
              </button>
            </motion.div>
          ) : imageUrl ? (
            <motion.div
              key="image"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={prompt || "Generated design"}
                className="w-full h-full object-contain bg-white dark:bg-slate-950"
                loading="eager"
                decoding="async"
                onLoad={() => {
                  setIsImageLoading(false);
                }}
                onError={() => {
                  setIsImageLoading(false);
                  setError(
                    t(
                      "Impossible de charger l'image. Réessayez.",
                      "تعذر تحميل الصورة. حاول مجدداً."
                    )
                  );
                  toast.error(
                    t(
                      "Échec du chargement de l'image.",
                      "فشل تحميل الصورة."
                    )
                  );
                }}
              />
              <button
                type="button"
                onClick={handleDownload}
                className="absolute bottom-3 right-3 px-4 py-2.5 rounded-xl bg-slate-900/85 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-black flex items-center gap-2 hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-colors shadow-xl cursor-pointer"
              >
                <Download size={15} />
                {t("Télécharger", "تحميل")}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400"
            >
              <Sparkles size={44} className="text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold">
                {t("Votre image s'affichera ici", "ستظهر صورتك هنا")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
