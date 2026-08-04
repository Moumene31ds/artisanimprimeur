"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[page error]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="premium-glass rounded-[2.5rem] p-10 md:p-14 max-w-lg w-full text-center border border-white/60 dark:border-white/5 shadow-2xl">
        <div className="text-7xl mb-6">⚙️</div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-3">
          Oups, une erreur est survenue
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
          Un problème inattendu s&apos;est produit. Réessayez ou revenez à l&apos;accueil.
        </p>
        <p className="text-slate-400 dark:text-slate-500 mb-10">
          حدث خطأ غير متوقع، حاول مرة أخرى أو عد إلى الصفحة الرئيسية
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-8 py-4 rounded-2xl bg-accent text-white font-black shadow-xl hover:scale-105 active:scale-95 transition-transform"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="px-8 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black hover:scale-105 active:scale-95 transition-transform"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
