// src/components/GlobalLoader.tsx
// Advanced full-screen printing press loader for L'Artisan Imprimeur
//
// Animation sequence (for initial auth load):
//   1. Printer slit appears
//   2. Paper slides out with spring physics
//   3. CMYK ink sweep reveals brand text & geometric sticker
//   4. Laser cut line sweeps across paper top
//   5. Paper falls toward viewer → content revealed
//
// When used inline (loading prop = true but auth already resolved),
// it shows a simplified branded spinner.

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

// ─── Animation timing (seconds) ─────────────────────────────────────────────
const SLIT_DELAY = 0.3;
const PAPER_DELAY = 0.9;
const INK_DELAY = 2.0;
const LASER_DELAY = 3.6;
const FALL_DELAY = 4.4;

// ─── Slit variants ──────────────────────────────────────────────────────────
const slitVariants: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// ─── Paper variants (spring physics for realistic weight) ───────────────────
const paperVariants: Variants = {
  hidden: { y: "-110%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 55,
      damping: 16,
      mass: 1.5,
      restDelta: 0.5,
    },
  },
  fall: {
    scale: 2.8,
    opacity: 0,
    y: "12%",
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

// ─── Ink sweep: reveals the printed content ─────────────────────────────────
const inkSweepVariants: Variants = {
  hidden: { clipPath: "inset(0 100% 0 0)" },
  visible: {
    clipPath: "inset(0 0% 0 0)",
    transition: { duration: 1.2, ease: [0.4, 0, 0.2, 1] },
  },
};

// ─── Individual CMYK ink band ───────────────────────────────────────────────
const cmykBandVariants: Variants = {
  hidden: { x: "-100%" },
  visible: (i: number) => ({
    x: "105%",
    transition: {
      duration: 0.7,
      delay: i * 0.12,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
};

// ─── Laser cut line ─────────────────────────────────────────────────────────
const laserVariants: Variants = {
  hidden: { x: "-110%", opacity: 1 },
  visible: {
    x: "110%",
    opacity: 1,
    transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
  },
};

// ─── CMYK color set ─────────────────────────────────────────────────────────
const CMYK = [
  { name: "Cyan",    hex: "#00BCD4" },
  { name: "Magenta", hex: "#E91E63" },
  { name: "Yellow",  hex: "#FFC107" },
  { name: "Key",     hex: "#212121" },
] as const;

// ─── Geometric sticker (SVG, CMYK-themed) ───────────────────────────────────
function GeometricSticker() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer ring */}
      <circle cx="60" cy="60" r="54" stroke="#212121" strokeWidth="2.5" />
      {/* CMYK overlapping shapes */}
      <polygon points="60,18 90,72 30,72" fill="#00BCD4" opacity="0.85" />
      <polygon points="60,102 30,48 90,48" fill="#E91E63" opacity="0.65" />
      <rect x="38" y="38" width="44" height="44" rx="4" fill="#FFC107" opacity="0.45" />
      <circle cx="60" cy="60" r="14" fill="#212121" />
      <circle cx="60" cy="60" r="6" fill="#fefefe" />
      {/* Registration crop marks */}
      <line x1="10" y1="10" x2="22" y2="10" stroke="#212121" strokeWidth="1" />
      <line x1="10" y1="10" x2="10" y2="22" stroke="#212121" strokeWidth="1" />
      <line x1="110" y1="10" x2="98" y2="10" stroke="#212121" strokeWidth="1" />
      <line x1="110" y1="10" x2="110" y2="22" stroke="#212121" strokeWidth="1" />
      <line x1="10" y1="110" x2="22" y2="110" stroke="#212121" strokeWidth="1" />
      <line x1="10" y1="110" x2="10" y2="98" stroke="#212121" strokeWidth="1" />
      <line x1="110" y1="110" x2="98" y2="110" stroke="#212121" strokeWidth="1" />
      <line x1="110" y1="110" x2="110" y2="98" stroke="#212121" strokeWidth="1" />
    </svg>
  );
}

// ─── CMYK colour dots (registration marks) ──────────────────────────────────
function CMYKDots() {
  return (
    <div className="flex items-center gap-2">
      {CMYK.map((c) => (
        <div
          key={c.name}
          className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-gray-300/60"
          style={{ backgroundColor: c.hex }}
        />
      ))}
    </div>
  );
}

// ─── Mini loader for page-level reuse ───────────────────────────────────────
function MiniPrintLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm"
    >
      {/* Animated CMYK bars */}
      <div className="relative w-10 h-10">
        {CMYK.map((c, i) => (
          <motion.div
            key={c.name}
            className="absolute left-1/2 top-1/2 w-8 h-[3px] rounded-full origin-left"
            style={{
              backgroundColor: c.hex,
              rotate: `${i * 90}deg`,
              x: "-50%",
              y: "-50%",
            }}
            animate={{
              scaleX: [0.3, 1, 0.3],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <p className="text-xs tracking-[0.2em] uppercase text-slate-400 dark:text-slate-500 font-medium">
        Chargement…
      </p>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN LOADER
// ═══════════════════════════════════════════════════════════════════════════════

type Phase = "slit" | "paper" | "ink" | "laser" | "fall" | "done";

export function GlobalLoader() {
  const { loading } = useAuth();

  // Track whether this is the very first auth load (full cinematic sequence)
  // vs. a subsequent page-level loading state (simplified mini loader).
  const isInitialLoad = useRef(true);
  const [phase, setPhase] = useState<Phase>("slit");

  // Phase state machine driven by timers
  const advancePhases = useCallback(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];
    ids.push(
      setTimeout(() => setPhase("paper"), SLIT_DELAY * 1000),
      setTimeout(() => setPhase("ink"), INK_DELAY * 1000),
      setTimeout(() => setPhase("laser"), LASER_DELAY * 1000),
      setTimeout(() => setPhase("fall"), FALL_DELAY * 1000),
      setTimeout(() => setPhase("done"), (FALL_DELAY + 0.85) * 1000),
    );
    return () => ids.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (loading && isInitialLoad.current) {
      setPhase("slit");
      return advancePhases();
    }
    if (!loading && isInitialLoad.current) {
      // Auth resolved; mark initial as consumed
      isInitialLoad.current = false;
    }
  }, [loading, advancePhases]);

  // Show cinematic loader while auth initialises (first visit)
  const showCinematic = isInitialLoad.current && (loading || phase !== "done");

  // Show mini loader when component renders after initial load
  // (e.g. admin page data loading). The component is rendered
  // conditionally by the consuming page, so if it mounts at all
  // post-initial-load, we show the mini version.
  const showMini = !isInitialLoad.current && loading;

  // Mark initial load as done once cinematic completes
  useEffect(() => {
    if (phase === "done") {
      isInitialLoad.current = false;
    }
  }, [phase]);

  return (
    <AnimatePresence mode="wait">
      {/* ── Full cinematic sequence ──────────────────────────────────────── */}
      {showCinematic && (
        <motion.div
          key="artisan-cinematic-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: "easeInOut" } }}
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
          style={{
            background:
              "linear-gradient(145deg, #070a14 0%, #0f1629 40%, #0a0f1e 100%)",
          }}
        >
          {/* ── Subtle dot-grid texture ───────────────────────────────────── */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #ffffff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* ── Ambient glow orbs ─────────────────────────────────────────── */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px]"
            style={{ backgroundColor: "rgba(0, 188, 212, 0.06)" }}
          />
          <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[420px] rounded-full blur-[140px]"
            style={{ backgroundColor: "rgba(233, 30, 99, 0.05)" }}
          />

          {/* ────── STAGE 1 · PRINTER SLIT ────────────────────────────────── */}
          <motion.div
            variants={slitVariants}
            initial="hidden"
            animate="visible"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ originX: 0.5 }}
          >
            <div className="relative w-[320px] sm:w-[400px] h-[6px]">
              {/* Slit glow halo */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent blur-md rounded-full" />
              {/* Slit metallic body */}
              <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-500 to-gray-700 rounded-full shadow-[0_0_24px_rgba(0,188,212,0.25)]" />
              {/* Centre highlight */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            </div>
          </motion.div>

          {/* ────── STAGES 2-5 · PAPER + INK + LASER + FALL ───────────────── */}
          {(phase === "paper" ||
            phase === "ink" ||
            phase === "laser" ||
            phase === "fall") && (
            <motion.div
              variants={paperVariants}
              initial="hidden"
              animate={phase === "fall" ? "fall" : "visible"}
              className="absolute flex items-center justify-center"
              style={{ perspective: 1200 }}
            >
              {/* Paper body – heavy 250g stock simulation */}
              <div
                className="relative w-[280px] sm:w-[370px] h-[190px] sm:h-[235px] rounded-[3px] overflow-hidden"
                style={{
                  background:
                    "linear-gradient(176deg, #fefefe 0%, #faf9f6 25%, #f5f3ee 65%, #efece4 100%)",
                  boxShadow: `
                    0 1px 3px rgba(0,0,0,0.05),
                    0 6px 20px rgba(0,0,0,0.09),
                    0 18px 55px rgba(0,0,0,0.13),
                    inset 0 1px 0 rgba(255,255,255,0.95),
                    inset 0 -1px 3px rgba(0,0,0,0.03)
                  `,
                }}
              >
                {/* Paper fibre/grain texture */}
                <div
                  className="absolute inset-0 opacity-[0.025] pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23d4c8b8'/%3E%3Crect width='1' height='1' fill='%23c9bda8'/%3E%3C/svg%3E")`,
                    backgroundSize: "4px 4px",
                  }}
                />

                {/* Subtle left/right edge shadows (paper thickness) */}
                <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/[0.035] to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-black/[0.035] to-transparent pointer-events-none" />

                {/* ── STAGE 3 · CMYK INK SWEEP ────────────────────────────── */}
                {(phase === "ink" || phase === "laser" || phase === "fall") && (
                  <>
                    {/* Colour bands sweeping left-to-right */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      {CMYK.map((c, i) => (
                        <motion.div
                          key={c.name}
                          custom={i}
                          variants={cmykBandVariants}
                          initial="hidden"
                          animate="visible"
                          className="absolute h-full"
                          style={{
                            width: "55%",
                            top: 0,
                            left: "-55%",
                            background: `linear-gradient(90deg, transparent 0%, ${c.hex}35 25%, ${c.hex}28 55%, ${c.hex}12 85%, transparent 100%)`,
                            mixBlendMode: "multiply",
                          }}
                        />
                      ))}
                    </div>

                    {/* Printed content revealed via clip-path wipe */}
                    <motion.div
                      variants={inkSweepVariants}
                      initial="hidden"
                      animate="visible"
                      className="absolute inset-0"
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 sm:gap-3 px-6">
                        <GeometricSticker />

                        <div className="text-center">
                          <h1
                            className="text-lg sm:text-[1.4rem] font-bold tracking-[0.13em]"
                            style={{
                              color: "#1a1a2e",
                              fontFamily:
                                "Georgia, 'Times New Roman', serif",
                            }}
                          >
                            L&apos;Artisan Imprimeur
                          </h1>
                          <div className="mt-1 h-[1.5px] w-16 sm:w-20 mx-auto bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
                          <p
                            className="mt-1.5 text-[9px] sm:text-[11px] tracking-[0.3em] uppercase font-medium"
                            style={{ color: "#7b8294" }}
                          >
                            Impression &amp; Design
                          </p>
                        </div>

                        <div className="mt-1.5">
                          <CMYKDots />
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}

                {/* ── STAGE 4 · LASER CUT LINE ────────────────────────────── */}
                {(phase === "laser" || phase === "fall") && (
                  <motion.div
                    variants={laserVariants}
                    initial="hidden"
                    animate="visible"
                    className="absolute top-0 left-0 w-full h-[2px] z-20 pointer-events-none"
                  >
                    <div className="relative w-full h-full">
                      {/* Main beam */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
                      {/* Outer glow */}
                      <div className="absolute -top-1 inset-x-0 h-[4px] bg-gradient-to-r from-transparent via-red-400/70 to-transparent blur-[2px]" />
                      {/* White-hot core */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/90 to-transparent" />
                      {/* Downward spark glow */}
                      <div className="absolute top-full inset-x-0 h-3 bg-gradient-to-b from-red-500/25 to-transparent blur-sm" />
                    </div>
                  </motion.div>
                )}

                {/* Scorch mark left by the laser */}
                {phase === "fall" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-amber-900/20 via-amber-800/35 to-amber-900/20 z-10 pointer-events-none"
                  />
                )}
              </div>

              {/* Paper drop shadow on the dark BG */}
              <div
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-[82%] h-6 rounded-full blur-xl pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse, rgba(0,0,0,0.22) 0%, transparent 70%)",
                }}
              />
            </motion.div>
          )}

          {/* ── Bottom: animated progress dots + status text ──────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: PAPER_DELAY, duration: 0.5 }}
            className="absolute bottom-10 sm:bottom-14 flex flex-col items-center gap-3"
          >
            {/* CMYK dot pulses */}
            <div className="flex gap-1.5">
              {CMYK.map((c, i) => (
                <motion.div
                  key={c.name}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: c.hex }}
                  animate={{
                    scale: [1, 1.8, 1],
                    opacity: [0.35, 1, 0.35],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            <motion.p
              className="text-[10px] sm:text-[11px] tracking-[0.25em] uppercase font-light"
              style={{ color: "rgba(255,255,255,0.3)" }}
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              Impression en cours…
            </motion.p>
          </motion.div>
        </motion.div>
      )}

      {/* ── Simplified mini loader for page-level reuse ───────────────────── */}
      {showMini && <MiniPrintLoader key="artisan-mini-loader" />}
    </AnimatePresence>
  );
}
