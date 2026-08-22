"use client";
// src/components/RecentlyViewed.tsx
// شريط "شاهدته مؤخراً" — يعيد إشراك الزائر بمنتجات فتحها سابقاً (تسويق مجاني).
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAppStore } from "@/lib/store";
import { getRecentlyViewed, RecentItem } from "@/lib/recently-viewed";
import { Clock } from "lucide-react";

export default function RecentlyViewed() {
  const language = useAppStore((s) => s.language);
  const isRtl = language === "ar";
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed());
    // تحديث عند رجوع التبويب (بعد تصفح منتجات أخرى)
    const onVisible = () => document.visibilityState === "visible" && setItems(getRecentlyViewed());
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (!items.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-8" aria-labelledby="recently-viewed-title">
      <h2
        id="recently-viewed-title"
        className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white mb-4"
      >
        <Clock size={18} className="text-indigo-500" />
        {isRtl ? "شاهدته مؤخراً" : "Vus récemment"}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/services?product=${encodeURIComponent(item.id)}`}
            className="snap-start shrink-0 w-32 sm:w-36 group"
          >
            <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-1.5 transition group-hover:ring-2 group-hover:ring-indigo-500">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  width={144}
                  height={144}
                  className="w-full h-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  {isRtl ? "بدون صورة" : "Sans image"}
                </div>
              )}
            </div>
            <p className="text-xs font-bold line-clamp-1 text-slate-800 dark:text-slate-200">{item.name}</p>
            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
              {item.price?.toLocaleString()} DA
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
