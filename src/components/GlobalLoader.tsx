"use client";

// src/components/GlobalLoader.tsx
// ============================================================
// L'Atelier d'Impression — شاشة تحميل سينمائية متقدمة v2
// ورشة طباعة حيّة: تجميع الطابعة، انزلاق رأس الطباعة فوق سكّته،
// خروج الورقة وهي تُطبع سطراً بعد سطر، خزانات أحبار CMYK تتعبأ،
// ونسبة تقدم حيّة مع رسائل حالة متناوبة بالعربية/الفرنسية.
// تحترم prefers-reduced-motion ووضع الأداء عبر نسخة ثابتة أنيقة.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useAppStore } from "@/lib/store";

// ---------- لوحة أحبار الطباعة ----------
const INKS = [
  { letter: "C", hex: "#22d3ee" },
  { letter: "M", hex: "#f472b6" },
  { letter: "Y", hex: "#facc15" },
  { letter: "K", hex: "#94a3b8" },
] as const;

// ---------- توقيتات المراحل السينمائية ----------
const BOOT_MS = 550;
const ASSEMBLE_MS = 1150; // تنتهي عند 1700
const PRINT_MS = 2900; // تنتهي عند 4600
const REVEAL_MS = 1300; // تنتهي عند 5900

type Phase = "boot" | "assemble" | "print" | "reveal" | "done";

// ---------- رسائل الحالة (حسب نسبة التقدم) ----------
const STATUS_AR = [
  "تشغيل ورشة الطباعة…",
  "تسخين رأس الطباعة…",
  "خلط أحبار CMYK…",
  "معايرة الألوان…",
  "طباعة التحفة الفنية…",
  "اللمسات الأخيرة…",
];
const STATUS_FR = [
  "Initialisation de l'atelier…",
  "Chauffe de la tête d'impression…",
  "Mélange des encres CMJN…",
  "Calibration des couleurs…",
  "Impression du chef-d'œuvre…",
  "Touche finale…",
];

function statusFor(progress: number, isRtl: boolean): string {
  const list = isRtl ? STATUS_AR : STATUS_FR;
  const idx = Math.min(list.length - 1, Math.floor((progress / 100) * list.length));
  return list[idx];
}

// ============================================================
// Hooks
// ============================================================

/** عدّاد تقدم مُخفَّف بـ rAF — يصل إلى cap بدقة في نهاية المدة. */
function usePrintProgress(active: boolean, durationMs: number, cap = 100): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * cap));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, durationMs, cap]);
  return progress;
}

/** وضع ثابت لمن يفضّل تقليل الحركة أو على الأجهزة الضعيفة (data-perf). */
function useStaticMode(): boolean {
  const performanceMode = useAppStore((s) => s.performanceMode);
  const animationsEnabled = useAppStore((s) => s.animationsEnabled);
  const [staticMode, setStaticMode] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () =>
      setStaticMode(mq.matches || performanceMode || !animationsEnabled);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [performanceMode, animationsEnabled]);
  return staticMode;
}

/** فهرس رسالة يدور بمؤقّت (للنسخة المصغّرة). */
function useCycledIndex(length: number, intervalMs: number): number {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % length), intervalMs);
    return () => clearInterval(id);
  }, [length, intervalMs]);
  return index;
}

// ============================================================
// عناصر المشهد
// ============================================================

/** خلفية المسرح: تدرج عميق + نقاط هالفون + هالات + أرضية شبكية + فينييت. */
function Backdrop() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(150deg,#04060e 0%,#0a1128 45%,#05070f 100%)",
        }}
      />
      {/* نقاط هالفون بطابع الطباعة */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle,#22d3ee 1px,transparent 1px),radial-gradient(circle,#f472b6 1px,transparent 1px)",
          backgroundSize: "26px 26px,40px 40px",
          backgroundPosition: "0 0,13px 13px",
        }}
      />
      {/* هالات ضوئية متنفسة */}
      <motion.div
        className="absolute -top-36 left-[10%] w-[420px] h-[420px] rounded-full blur-[130px]"
        style={{ backgroundColor: "#22d3ee", opacity: 0.12 }}
        animate={{ x: [0, 60, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-10%] right-[6%] w-[380px] h-[380px] rounded-full blur-[120px]"
        style={{ backgroundColor: "#f472b6", opacity: 0.1 }}
        animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1.1, 1, 1.1] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[38%] left-[42%] w-[300px] h-[300px] rounded-full blur-[110px]"
        style={{ backgroundColor: "#facc15", opacity: 0.06 }}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* أرضية شبكية منظورية */}
      <div className="absolute inset-x-0 bottom-0 h-[34vh] overflow-hidden">
        <div
          className="absolute inset-x-[-30%] top-0 bottom-[-40%]"
          style={{
            transform: "perspective(480px) rotateX(62deg)",
            transformOrigin: "top center",
            backgroundImage:
              "linear-gradient(rgba(34,211,238,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(244,114,182,.12) 1px,transparent 1px)",
            backgroundSize: "46px 46px",
            WebkitMaskImage:
              "linear-gradient(to bottom,transparent 0%,black 55%)",
            maskImage:
              "linear-gradient(to bottom,transparent 0%,black 55%)",
          }}
        />
      </div>
      {/* فينييت */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center,transparent 42%,rgba(0,0,0,.62) 100%)",
        }}
      />
    </>
  );
}

/** حلقات هولوغرام دوّارة خلف الآلة. */
function HoloRings({ base = 340 }: { base?: number }) {
  const rings = [
    { size: base, dur: 16, color: "#22d3ee", alpha: "44", cw: true },
    { size: base * 0.72, dur: 11, color: "#f472b6", alpha: "3a", cw: false },
    { size: base * 0.46, dur: 7, color: "#facc15", alpha: "33", cw: true },
  ];
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      aria-hidden
    >
      {rings.map((r, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{
            opacity: 0.9,
            scale: 1,
            rotate: r.cw ? 360 : -360,
          }}
          transition={{
            opacity: { duration: 0.8 },
            scale: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
            rotate: { duration: r.dur, repeat: Infinity, ease: "linear" },
          }}
          style={{
            width: r.size,
            height: r.size,
            background: `conic-gradient(from 0deg, transparent 0deg, ${r.color}${r.alpha} 70deg, transparent 150deg, ${r.color}${r.alpha} 230deg, transparent 310deg)`,
            WebkitMaskImage:
              "radial-gradient(circle, transparent 66%, #000 68%, #000 71%, transparent 73%)",
            maskImage:
              "radial-gradient(circle, transparent 66%, #000 68%, #000 71%, transparent 73%)",
          }}
        />
      ))}
    </div>
  );
}

/** شعار العلامة (نفس الهوية الهندسية للمطبعة). */
function BrandMark({ size = 54 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} fill="none" aria-hidden>
      <circle cx="60" cy="60" r="54" stroke="#e2e8f0" strokeWidth="3" />
      <polygon points="60,20 92,76 28,76" fill="#22d3ee" opacity="0.9" />
      <polygon points="60,100 28,46 92,46" fill="#f472b6" opacity="0.7" />
      <rect x="40" y="42" width="40" height="40" rx="4" fill="#facc15" opacity="0.45" />
      <circle cx="60" cy="60" r="14" fill="#0b1226" />
      <circle cx="60" cy="60" r="6" fill="#f8fafc" />
    </svg>
  );
}

/** شريط رسائل الحالة المتبدّل بسلاسة. */
function StatusTicker({ text }: { text: string }) {
  return (
    <div className="h-5 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={text}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="text-[11px] sm:text-xs tracking-[0.18em] font-bold text-white/50 uppercase text-center"
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/** واجهة التقدم: نسبة كبيرة + شريط CMYK لامع + رسالة الحالة. */
function ProgressHud({
  progress,
  status,
}: {
  progress: number;
  status: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 w-[min(88vw,360px)]">
      {/* النسبة الكبيرة */}
      <div className="flex items-end gap-1">
        <span
          className="font-mono font-bold text-white tabular-nums leading-none"
          style={{ fontSize: "2.4rem", textShadow: "0 0 24px rgba(34,211,238,.45)" }}
        >
          {progress}
        </span>
        <span className="text-base text-white/40 mb-[3px] font-mono">%</span>
      </div>

      {/* شريط التقدم CMYK مع لمعة */}
      <div className="relative h-[5px] w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg,${INKS[0].hex},${INKS[1].hex},${INKS[2].hex})`,
            transition: "width .12s linear",
          }}
        >
          <motion.div
            className="absolute inset-y-0 w-16"
            style={{
              background:
                "linear-gradient(90deg,transparent,rgba(255,255,255,.65),transparent)",
            }}
            animate={{ x: ["-100%", "340%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      <StatusTicker text={status} />
    </div>
  );
}

/** خزانات أحبار CMYK تتعبأ تباعاً. */
function InkTanks({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-2.5" dir="ltr">
      {INKS.map((ink, i) => (
        <div key={ink.letter} className="flex flex-col items-center gap-1.5">
          <div className="relative w-5 sm:w-6 h-14 sm:h-16 rounded-lg border border-white/15 bg-white/[0.04] overflow-hidden backdrop-blur-sm">
            {/* تعبئة الحبر */}
            <motion.div
              className="absolute inset-x-0 bottom-0 origin-bottom"
              style={{
                height: "100%",
                background: `linear-gradient(to top, ${ink.hex}, ${ink.hex}99)`,
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: active ? 1 : 0 }}
              transition={{
                duration: 1.5,
                delay: active ? i * 0.28 : 0,
                ease: "easeInOut",
              }}
            />
            {/* لمعان الزجاج */}
            <div className="absolute top-1.5 left-1 w-[3px] h-1/2 rounded-full bg-white/20 blur-[1px]" />
          </div>
          <span className="text-[9px] font-mono font-bold text-white/35">
            {ink.letter}
          </span>
        </div>
      ))}
    </div>
  );
}

/** رأس الطباعة المنزلق فوق سكّته مع شعاع ضوئي. */
function CarriageRail({ sweeping }: { sweeping: boolean }) {
  return (
    <div className="relative h-7 mx-5">
      {/* السكة */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {/* الرأس المنزلق */}
      <motion.div
        className="absolute top-1/2 -mt-3"
        initial={{ left: "8%" }}
        animate={{ left: sweeping ? ["8%", "76%"] : "42%" }}
        transition={
          sweeping
            ? { duration: 1.15, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
            : { duration: 0.4 }
        }
      >
        {/* ذيل توهج خلفي */}
        <div className="absolute top-1/2 -translate-y-1/2 right-full w-14 h-3 bg-gradient-to-l from-cyan-400/50 to-transparent blur-[3px]" />
        {/* جسم الرأس */}
        <div className="relative w-11 h-7 rounded-md bg-slate-700 border border-white/25 shadow-[0_0_18px_rgba(34,211,238,.35)] flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,.9)]" />
        </div>
        {/* شعاع الطباعة للأسفل */}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-[2px] h-10 bg-gradient-to-b from-cyan-300/80 to-transparent blur-[0.5px]" />
      </motion.div>
    </div>
  );
}

/** الورقة تخرج من الفتحة وهي تُطبع (سينمائية). */
function PaperSheetCinematic({
  progress,
  reveal,
  isRtl,
}: {
  progress: number;
  reveal: boolean;
  isRtl: boolean;
}) {
  // صفوف المحتوى المطبوع (ثابتة لتفادي اختلاف hydration)
  const ROWS = [86, 64, 92, 58, 74, 42];
  return (
    <div className="relative z-0 h-[140px] sm:h-[160px] w-[230px] sm:w-[260px] pointer-events-none">
      <motion.div
        className="absolute left-1/2 top-0 rounded-b-xl shadow-2xl overflow-hidden"
        style={{
          width: "86%",
          height: "150px",
          background: "linear-gradient(180deg,#ffffff 0%,#eef2f7 100%)",
        }}
        animate={{
          x: "-50%",
          y: `${progress - 100}%`,
          rotate: reveal ? (isRtl ? -2 : 2) : 0,
          scale: reveal ? 1.14 : 1,
        }}
        transition={{
          y: { ease: "linear", duration: 0.12 },
          scale: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
          rotate: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
        }}
      >
        {/* المحتوى المطبوع يُكشف مع التقدم */}
        <motion.div
          className="absolute inset-0 p-3.5 flex flex-col gap-[7px]"
          animate={{ clipPath: `inset(0% ${100 - progress}% 0% 0%)` }}
          transition={{ duration: 0.1, ease: "linear" }}
        >
          <div className="flex justify-center mb-1">
            <BrandMark size={44} />
          </div>
          {ROWS.map((w, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="h-[5px] rounded-full bg-slate-300"
                style={{ width: `${w}%` }}
              />
              <div className="h-[5px] w-2 rounded-full bg-slate-200" />
            </div>
          ))}
          {/* شريط اختبار الألوان */}
          <div className="flex gap-1 mt-auto pt-1" dir="ltr">
            {INKS.map((ink) => (
              <div key={ink.letter} className="h-2 flex-1 rounded-sm" style={{ backgroundColor: ink.hex }} />
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* انفجار توهج عند الكشف */}
      {reveal && (
        <motion.div
          className="absolute left-1/2 top-1/2 -mt-[75px] rounded-full pointer-events-none"
          style={{
            width: 220,
            height: 220,
            x: "-50%",
            y: "-50%",
            border: "2px solid rgba(34,211,238,.6)",
          }}
          initial={{ opacity: 0.8, scale: 0.55 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      )}
    </div>
  );
}

/** جسم الطابعة يتجمّع من أجزائه. */
function PrinterAssembly({ assembled, sweeping }: { assembled: boolean; sweeping: boolean }) {
  return (
    <div className="relative z-10 flex flex-col items-center">
      {/* الجسم الرئيسي */}
      <motion.div
        className="relative w-[240px] sm:w-[280px] rounded-2xl border border-white/15 overflow-hidden"
        style={{
          background: "linear-gradient(165deg,#141d33 0%,#0c1426 60%,#101a30 100%)",
          boxShadow:
            "0 24px 70px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)",
        }}
        initial={{ opacity: 0, y: -70, scale: 0.92 }}
        animate={assembled ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ type: "spring", stiffness: 120, damping: 15 }}
      >
        {/* فتحة الخروج المتوهجة */}
        <div className="relative h-9 flex items-center justify-center">
          <motion.div
            className="h-[6px] w-[78%] rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(34,211,238,.85), rgba(244,114,182,.7), transparent)",
            }}
            animate={{ opacity: sweeping ? [0.6, 1, 0.6] : 0.35 }}
            transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        {/* السكة ورأس الطباعة */}
        <CarriageRail sweeping={sweeping} />
        {/* لوحة التحكم */}
        <div className="flex items-center justify-between px-5 pb-3 pt-1" dir="ltr">
          <span
            className="text-[8px] tracking-[0.3em] font-black text-white/40 uppercase"
            style={{ fontFamily: "Georgia, serif" }}
          >
            L&apos;Artisan Imprimeur
          </span>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: INKS[i].hex }}
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* الدرج ينزلق من الأسفل */}
      <motion.div
        className="w-[180px] sm:w-[210px] h-2.5 rounded-b-xl border border-t-0 border-white/10"
        style={{
          background: "linear-gradient(180deg,#0e1626,#131f38)",
        }}
        initial={{ opacity: 0, y: -26 }}
        animate={assembled ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.28, type: "spring", stiffness: 130, damping: 14 }}
      />
    </div>
  );
}

// ============================================================
// المشهدان
// ============================================================

/** المشهد السينمائي الكامل (التحميل الأول). */
function CinematicScene({ phase }: { phase: Phase }) {
  const language = useAppStore((s) => s.language);
  const isRtl = language === "ar";
  const printing = phase === "print" || phase === "reveal";
  const progress = usePrintProgress(printing, PRINT_MS + REVEAL_MS);

  return (
    <div className="fixed inset-0 z-[99999] overflow-hidden">
      <Backdrop />
      <HoloRings base={phase === "boot" ? 250 : 400} />

      {/* علامات القص الطباعية في الزوايا */}
      {["top-5 left-5", "top-5 right-5", "bottom-5 left-5", "bottom-5 right-5"].map(
        (pos, i) => (
          <motion.div
            key={pos}
            className={`absolute ${pos} w-5 h-5 pointer-events-none`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ delay: 0.4 + i * 0.08 }}
          >
            <div className="absolute top-1/2 w-full h-px bg-white/60" />
            <div className="absolute left-1/2 h-full w-px bg-white/60" />
          </motion.div>
        )
      )}

      <div className="relative h-full flex flex-col items-center justify-center gap-5 px-6">
        <PrinterAssembly
          assembled={phase !== "boot"}
          sweeping={printing}
        />

        {(phase === "print" || phase === "reveal") && (
          <PaperSheetCinematic
            progress={progress}
            reveal={phase === "reveal"}
            isRtl={isRtl}
          />
        )}

        {(phase === "print" || phase === "reveal") && (
          <InkTanks active />
        )}

        <ProgressHud
          progress={progress}
          status={statusFor(progress, isRtl)}
        />
      </div>
    </div>
  );
}

/** المشهد المصغّر لتنقّلات الصفحات. */
function MiniScene() {
  const language = useAppStore((s) => s.language);
  const isRtl = language === "ar";
  const messages = isRtl ? STATUS_AR : STATUS_FR;
  const msgIdx = useCycledIndex(messages.length, 1700);
  const progress = usePrintProgress(true, 9000, 96);

  return (
    <div className="fixed inset-0 z-[99999] overflow-hidden">
      <Backdrop />
      <HoloRings base={230} />
      <div className="relative h-full flex flex-col items-center justify-center gap-4 px-6">
        {/* طابعة مصغّرة */}
        <PrinterAssembly assembled sweeping />
        {/* شريط ورقي قصير */}
        <div className="relative h-10 w-[150px] -mt-1 z-0">
          <motion.div
            className="absolute left-1/2 top-0 rounded-b-lg overflow-hidden shadow-lg"
            style={{
              x: "-50%",
              width: "84%",
              height: "40px",
              background: "linear-gradient(180deg,#fff,#eef2f7)",
            }}
            animate={{ y: ["-92%", "0%", "0%", "-92%"] }}
            transition={{ duration: 2.8, times: [0, 0.45, 0.8, 1], repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="p-2 flex flex-col gap-1">
              {[70, 48, 62].map((w, i) => (
                <div key={i} className="h-[3px] rounded-full bg-slate-300" style={{ width: `${w}%` }} />
              ))}
            </div>
          </motion.div>
        </div>
        <InkTanks active />
        <ProgressHud progress={progress} status={messages[msgIdx]} />
      </div>
    </div>
  );
}

/** نسخة ثابتة أنيقة بدون حركات (تقليل الحركة / وضع الأداء). */
function StaticLoader() {
  const language = useAppStore((s) => s.language);
  const isRtl = language === "ar";
  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-5"
      dir={isRtl ? "rtl" : "ltr"}
      style={{ background: "linear-gradient(150deg,#04060e,#0a1128 45%,#05070f)" }}
    >
      <BrandMark size={64} />
      <p
        className="text-sm font-bold tracking-[0.14em]"
        style={{ color: "#e2e8f0", fontFamily: "Georgia, serif" }}
      >
        L&apos;Artisan Imprimeur
      </p>
      <div className="flex gap-1.5" dir="ltr">
        {INKS.map((ink) => (
          <div key={ink.letter} className="w-2 h-2 rounded-full" style={{ backgroundColor: ink.hex }} />
        ))}
      </div>
      <p className="text-xs font-bold text-white/45">
        {isRtl ? "جارٍ التحميل…" : "Chargement…"}
      </p>
    </div>
  );
}

// ============================================================
// الواجهات العامة (نفس الأسماء السابقة — كل مواقع الاستخدام ترقى تلقائياً)
// ============================================================

/** محمِّل المسارات (loading.tsx). */
export function MiniPrintLoader() {
  const staticMode = useStaticMode();
  if (staticMode) return <StaticLoader />;
  return <MiniScene />;
}

/**
 * المحمِّل السينمائي: يعمل مرة واحدة عند أول إقلاع للتطبيق (أثناء تهيئة
 * الجلسة)، ثم تنتقل الشاشة للنسخة المصغّرة في التحميلات اللاحقة.
 */
export function GlobalLoader() {
  const { loading } = useAuth();
  const staticMode = useStaticMode();

  const isInitialLoad = useRef(true);
  const skipRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("boot");

  // تسلسل المراحل السينمائية
  useEffect(() => {
    if (!isInitialLoad.current || staticMode) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const step = (next: Phase, at: number) =>
      timers.push(setTimeout(() => { if (!skipRef.current) setPhase(next); }, at));
    step("assemble", BOOT_MS);
    step("print", BOOT_MS + ASSEMBLE_MS);
    step("reveal", BOOT_MS + ASSEMBLE_MS + PRINT_MS);
    step("done", BOOT_MS + ASSEMBLE_MS + PRINT_MS + REVEAL_MS);
    return () => timers.forEach(clearTimeout);
  }, [staticMode]);

  // إن جهزت الجلسة مبكراً: نتخطى إلى كشف الورقة فوراً بدل انتظار التسلسل
  useEffect(() => {
    if (loading || !isInitialLoad.current || staticMode || skipRef.current) return;
    skipRef.current = true;
    setPhase((p) => (p === "done" ? p : "reveal"));
    const t = setTimeout(() => setPhase("done"), REVEAL_MS);
    return () => clearTimeout(t);
  }, [loading, staticMode]);

  useEffect(() => {
    if (phase === "done") isInitialLoad.current = false;
  }, [phase]);

  const showCinematic = isInitialLoad.current && (loading || phase !== "done");
  const showMini = !isInitialLoad.current && loading;

  if (showCinematic || showMini) {
    return (
      <AnimatePresence mode="wait">
        {staticMode ? (
          <StaticLoader key="loader-static" />
        ) : showCinematic ? (
          <motion.div key="loader-cinematic" exit={{ opacity: 0 }} transition={{ duration: 0.45 }}>
            <CinematicScene phase={phase} />
          </motion.div>
        ) : (
          <motion.div key="loader-mini" exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <MiniScene />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  return null;
}
