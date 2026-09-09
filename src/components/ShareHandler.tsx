"use client";

// ---------------------------------------------------------------------------
// ShareHandler — وجهة المشاركة ومعالج الملفات في الـ PWA
// ---------------------------------------------------------------------------
// - Share Target: يستقبل النص/الروابط/الصور المشاركة من تطبيقات أخرى
//   (params: title/text/url) عبر /share.
// - File Handling API: يستقبل الصور المفتوحة بالتطبيق عبر window.launchQueue.
// - الإجراءات: إرسال للواتساب، نسخ، فتح الرابط، أو تمرير الصورة إلى المصمم
//   (المخصص) لبدء التخصيص مباشرة.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Share2, Copy, ExternalLink, ImageIcon, Wand2, MessageCircle,
  ArrowRight, FileImage, Link2,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

/** مفتاح التخزين المؤقت لتمرير صورة مشتركة إلى المصمّم. */
export const SHARED_IMAGE_KEY = "pwa-shared-image";

interface LaunchParamsWithFiles {
  files?: File[];
}

export default function ShareHandler() {
  const router = useRouter();
  const language = useAppStore((s) => s.language);
  const isRtl = language === "ar";

  const [sharedText, setSharedText] = useState("");
  const [sharedUrl, setSharedUrl] = useState("");
  const [sharedTitle, setSharedTitle] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    // 1) معاملات Share Target (GET) + معالج البروتوكول web+print://
    const params = new URLSearchParams(window.location.search);
    setSharedTitle(params.get("title") || "");
    const text = params.get("text") || "";
    let url = params.get("url") || "";
    // web+print://<محتوى> → يصل هنا كـ ?print=<محتوى>
    const proto = params.get("print");
    if (proto && !url && !text) {
      if (/^https?:\/\//i.test(proto)) url = proto;
      else setSharedText(proto);
    } else if (proto) {
      setSharedText((prev) => prev || proto);
    }
    setSharedText((prev) => prev || text);

    // 2) ملفات File Handling API (فتح صورة بالتطبيق).
    if ("launchQueue" in window) {
      (window as any).launchQueue.setConsumer(
        async (launchParams: LaunchParamsWithFiles) => {
          if (!launchParams.files?.length) return;
          const file = launchParams.files[0];
          if (!file.type.startsWith("image/")) return;
          try {
            const dataUrl = await readFileAsDataUrl(file);
            setFilePreview(dataUrl);
            setFileName(file.name);
          } catch {
            toast.error(isRtl ? "تعذّر قراءة الصورة" : "Impossible de lire l'image");
          }
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** هل الرابط يشير إلى صورة مباشرة؟ */
  const isImageUrl = (url: string): boolean =>
    /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(url);

  const hasContent = !!(sharedText || sharedUrl || filePreview);
  const urlIsImage = sharedUrl ? isImageUrl(sharedUrl) : false;

  /** تمرير الصورة إلى المصمّم. */
  const sendToCustomizer = (dataUrl: string) => {
    try {
      sessionStorage.setItem(SHARED_IMAGE_KEY, dataUrl);
      router.push("/customizer");
    } catch {
      toast.error(
        isRtl
          ? "الصورة كبيرة جداً للتخزين المؤقت — جرّب صورة أصغر"
          : "Image trop volumineuse — essayez une image plus petite"
      );
    }
  };

  const copyContent = async () => {
    const text = sharedUrl || sharedText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(isRtl ? "تم النسخ ✓" : "Copié ✓");
    } catch {
      toast.error(isRtl ? "تعذّر النسخ" : "Copie impossible");
    }
  };

  const shareViaWhatsApp = () => {
    const text = [sharedTitle, sharedText, sharedUrl].filter(Boolean).join(" ");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const openLink = () => {
    if (!sharedUrl) return;
    const target = /^https?:\/\//i.test(sharedUrl) ? sharedUrl : `https://${sharedUrl}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  if (!hasContent) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-20 h-20 rounded-[1.7rem] bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
          <Share2 size={34} className="text-white" />
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          {isRtl ? "شارك أي شيء مع التطبيق" : "Partagez vers l'application"}
        </h1>
        <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          {isRtl
            ? "من أي تطبيق آخر، اضغط « مشاركة » واختر « L'Artisan Imprimeur » لتمرير الصور والروابط والنصوص مباشرة إلى أدواتنا."
            : "Depuis n'importe quelle app, appuyez sur « Partager » et choisissez « L'Artisan Imprimeur » pour envoyer images, liens et textes vers nos outils."}
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-2 flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm active:scale-[0.98] transition-transform"
        >
          <ArrowRight size={16} className={isRtl ? "" : "rotate-180"} />
          {isRtl ? "العودة للرئيسية" : "Retour à l'accueil"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-8 space-y-5">
      {/* الترويسة */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
          <Share2 size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
            {isRtl ? "محتوى مشارَك" : "Contenu partagé"}
          </h1>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {isRtl
              ? "اختر ما تريد فعله بهذا المحتوى"
              : "Choisissez quoi faire avec ce contenu"}
          </p>
        </div>
      </div>

      {/* معاينة الصورة المستلمة (ملف مفتوح بالتطبيق) */}
      {filePreview && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm"
        >
          <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={filePreview} alt={fileName} className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <FileImage size={15} className="text-blue-500 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
              {fileName}
            </span>
          </div>
        </motion.div>
      )}

      {/* نص/رابط مشارَك */}
      {(sharedTitle || sharedText || sharedUrl) && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-sm space-y-2"
        >
          {sharedTitle && (
            <p className="text-sm font-black text-slate-900 dark:text-white">{sharedTitle}</p>
          )}
          {sharedText && (
            <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300 break-words">
              {sharedText}
            </p>
          )}
          {sharedUrl && (
            <a
              href={/^https?:\/\//i.test(sharedUrl) ? sharedUrl : `https://${sharedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-black text-blue-600 dark:text-blue-400 break-all"
            >
              <Link2 size={13} className="shrink-0" />
              {sharedUrl}
            </a>
          )}
        </motion.div>
      )}

      {/* الإجراءات */}
      <div className="grid grid-cols-2 gap-2.5">
        {(filePreview || urlIsImage) && (
          <ActionCard
            icon={<Wand2 size={20} />}
            label={isRtl ? "خصّصه في المصمّم" : "Personnaliser"}
            desc={isRtl ? "ابدأ التخصيص فوراً" : "Lancer la personnalisation"}
            primary
            onClick={() => {
              const image = filePreview || sharedUrl;
              if (image) sendToCustomizer(image);
            }}
          />
        )}
        <ActionCard
          icon={<MessageCircle size={20} />}
          label="WhatsApp"
          desc={isRtl ? "أرسل عبر واتساب" : "Envoyer via WhatsApp"}
          onClick={shareViaWhatsApp}
        />
        <ActionCard
          icon={<Copy size={20} />}
          label={isRtl ? "نسخ المحتوى" : "Copier"}
          desc={isRtl ? "احفظ في الحافظة" : "Enregistrer dans le presse-papiers"}
          onClick={copyContent}
        />
        {sharedUrl && !urlIsImage && (
          <ActionCard
            icon={<ExternalLink size={20} />}
            label={isRtl ? "فتح الرابط" : "Ouvrir le lien"}
            desc={isRtl ? "في متصفح جديد" : "Dans un nouvel onglet"}
            onClick={openLink}
          />
        )}
        {!filePreview && !urlIsImage && (
          <ActionCard
            icon={<ImageIcon size={20} />}
            label={isRtl ? "استوديو الذكاء الاصطناعي" : "AI Studio"}
            desc={isRtl ? "أنشئ تصميماً مشابهاً" : "Créer un design similaire"}
            onClick={() => {
              if (sharedText || sharedUrl) {
                sessionStorage.setItem("ai-studio-seed", sharedText || sharedUrl);
              }
              router.push("/ai-studio");
            }}
          />
        )}
      </div>

      <button
        onClick={() => router.push("/")}
        className="w-full min-h-[46px] rounded-2xl text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        {isRtl ? "تجاهل والعودة للرئيسية" : "Ignorer et retourner à l'accueil"}
      </button>
    </div>
  );
}

function ActionCard({
  icon,
  label,
  desc,
  onClick,
  primary = false,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex flex-col items-start gap-1.5 p-4 rounded-2xl border text-start transition-colors ${
        primary
          ? "bg-gradient-to-br from-blue-600 to-indigo-600 border-transparent text-white shadow-lg shadow-blue-500/25"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700"
      }`}
    >
      <span
        className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
          primary
            ? "bg-white/20 text-white"
            : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
        }`}
      >
        {icon}
      </span>
      <span className={`text-[13px] font-black ${primary ? "text-white" : "text-slate-900 dark:text-white"}`}>
        {label}
      </span>
      <span className={`text-[10px] font-bold ${primary ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
        {desc}
      </span>
    </motion.button>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
