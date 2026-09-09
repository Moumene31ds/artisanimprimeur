"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, ArrowRight, X } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function AcquisitionBanner() {
  const { language } = useAppStore();
  const isRtl = language === "ar";
  const [closed, setClosed] = useState(false);

  if (closed) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-600 via-emerald-600 to-amber-600 bg-[length:200%_auto] animate-[gradient_8s_linear_infinite] text-slate-950 font-sans shadow-md relative z-40">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-xs">
        
        <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start">
          <span className="p-1 rounded-full bg-slate-950/20 text-amber-200">
            <Sparkles size={13} className="animate-pulse" />
          </span>
          <span className="font-black tracking-wide text-white drop-shadow-sm text-[11px] sm:text-xs text-center">
            {isRtl
              ? "💎 هذا المشروع والمنصة معروضة للاستحواذ والبيع التجاري الكامل (Turnkey SaaS)"
              : "💎 Platform Available for Turnkey Acquisition & Commercial Sale"}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/acquisition"
            className="px-3 py-1 bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-200 rounded-full font-black text-[10px] sm:text-xs shadow transition-all flex items-center gap-1 hover:scale-105"
          >
            <span>{isRtl ? "اكتشف العرض المالي والشراء" : "View Investment Deck"}</span>
            {isRtl ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
          </Link>
          <button
            onClick={() => setClosed(true)}
            className="p-1 text-white/70 hover:text-white transition-colors"
            title="Fermer"
          >
            <X size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
