import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="premium-glass rounded-[2.5rem] p-10 md:p-14 max-w-lg w-full text-center border border-white/60 dark:border-white/5 shadow-2xl">
        <div className="text-7xl mb-6">🔍</div>
        <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-3">404</h1>
        <p className="text-xl font-bold text-accent mb-2">Page introuvable</p>
        <p className="text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
          Oups ! Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <p className="text-slate-400 dark:text-slate-500 mb-10">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-8 py-4 rounded-2xl bg-accent text-white font-black shadow-xl hover:scale-105 active:scale-95 transition-transform"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/services"
            className="px-8 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black hover:scale-105 active:scale-95 transition-transform"
          >
            Nos services
          </Link>
        </div>
      </div>
    </div>
  );
}
