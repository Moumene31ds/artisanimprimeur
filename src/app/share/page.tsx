import type { Metadata } from "next";
import { Suspense } from "react";
import ShareHandler from "@/components/ShareHandler";

export const metadata: Metadata = {
  title: "مشاركة إلى التطبيق | Partage vers l'application",
  robots: { index: false, follow: false },
};

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <span className="animate-pulse text-sm font-bold text-slate-400">…</span>
        </div>
      }
    >
      <ShareHandler />
    </Suspense>
  );
}
