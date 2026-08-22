"use client";

import { useAppStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import { QrCode, Download, Link as LinkIcon, RefreshCw } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useRef, useState } from "react";

export default function QRMakerPage() {
  const { language } = useAppStore();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState("");
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[language];
  const isRtl = language === "ar";

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      setSubmitted(text.trim());
    }
  };

  // تنزيل مباشر من الـ canvas المحلي — بدون أي طلب شبكة أو مشاركة بيانات
  const downloadQr = () => {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    try {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `LArtisan_QRCode_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading QR code", error);
    }
  };

  return (
    <div className={`animate-fadeIn pb-24 max-w-4xl mx-auto ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col items-center text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-emerald-50 text-emerald-600 mb-6 border border-emerald-100 shadow-inner transform rotate-3">
          <QrCode size={40} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-3">
          {isRtl ? 'صانع QR الذكي' : 'Créateur de QR Code'}
        </h1>
        <p className="text-slate-500 max-w-md mx-auto">
          {isRtl
            ? 'قم بإنشاء كود QR احترافي لروابطك، حساباتك الاجتماعية، أو نصوصك وحمله مجاناً لاستخدامه في مطبوعاتك.'
            : 'Créez un QR Code professionnel pour vos liens ou textes et téléchargez-le gratuitement pour vos impressions.'}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
          {isRtl ? "يعمل بدون إنترنت — بياناتك لا تغادر جهازك" : "100% hors ligne — vos données restent sur votre appareil"}
        </span>
      </div>

      <div className="ios-glass rounded-[2.5rem] p-8 md:p-12 shadow-lg border border-white/60 flex flex-col md:flex-row gap-12 items-center">

        {/* نموذج الإدخال */}
        <div className="flex-1 w-full">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <LinkIcon size={18} className="text-emerald-500" />
                {isRtl ? 'الرابط أو النص (URL / Text)' : 'Lien ou Texte (URL / Text)'}
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={512}
                placeholder="https://www.instagram.com/lartisan..."
                className="w-full p-5 bg-white/70 border border-slate-200 rounded-2xl text-base outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner dir-ltr font-medium"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={!text.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-emerald-500/30 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={20} />
              {isRtl ? 'توليد الكود' : 'Générer le Code'}
            </button>
          </form>
        </div>

        {/* عرض النتيجة */}
        <div className="w-full md:w-auto flex flex-col items-center justify-center shrink-0">
          <div className="w-64 h-64 bg-white rounded-3xl shadow-inner border-2 border-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
            {submitted ? (
              <div ref={canvasWrapRef} className="animate-fadeIn">
                {/* مولّد محلي بالكامل — لا يُرسل النص لأي خادم */}
                <QRCodeCanvas value={submitted} size={224} level="M" includeMargin={false} />
              </div>
            ) : (
              <div className="text-center text-slate-300 flex flex-col items-center">
                <QrCode size={64} className="mb-2 opacity-50" />
                <span className="text-sm font-bold">QR Code</span>
              </div>
            )}
          </div>

          {submitted && (
            <button
              onClick={downloadQr}
              className="mt-6 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 w-full animate-slideUp"
            >
              <Download size={18} />
              {isRtl ? 'تحميل بصيغة PNG' : 'Télécharger en PNG'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
