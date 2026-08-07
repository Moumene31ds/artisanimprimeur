"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import {
  Gauge, RefreshCw, Loader2, BatteryCharging, BatteryMedium, Wifi,
  MemoryStick, Smartphone, Tablet, Monitor, Zap, ShieldCheck, Activity,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import {
  detectDevice, getDeviceFacts, getBatteryInfo, describeDevice, getConfidenceInfo,
} from "@/lib/device";
import type { DeviceSignals, DeviceFacts, BatteryInfo, DeviceTier } from "@/lib/device";

const TIER_UI: Record<DeviceTier, { hex: string; bg: string; ring: string; glow: string }> = {
  weak:     { hex: "#ef4444", bg: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400",     ring: "from-red-500 to-orange-500",   glow: "shadow-red-500/20" },
  medium:   { hex: "#f59e0b", bg: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400", ring: "from-amber-400 to-orange-500", glow: "shadow-amber-500/20" },
  powerful: { hex: "#10b981", bg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400", ring: "from-emerald-400 to-teal-500", glow: "shadow-emerald-500/20" },
};

function useCountUp(target: number, duration = 1.2) {
  const mv = useMotionValue(0);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(mv, target, { duration, ease: "easeOut" });
    const unsub = mv.on("change", (v) => setValue(Math.round(v)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [mv, target, duration]);
  return value;
}

function ScoreRing({ score, tier }: { score: number; tier: DeviceTier }) {
  const animated = useCountUp(score);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animated / 100);
  const color = TIER_UI[tier];
  return (
    <div className="relative w-40 h-40 sm:w-48 sm:h-48">
      <div className={`absolute -inset-4 rounded-full bg-gradient-to-br ${color.ring} opacity-20 blur-2xl`} />
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90 relative">
        <defs>
          <linearGradient id="deviceGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color.hex} />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="12" className="stroke-slate-200/70 dark:stroke-slate-800" />
        <circle
          cx="70" cy="70" r={radius} fill="none" strokeWidth="12" strokeLinecap="round"
          stroke="url(#deviceGaugeGrad)" strokeDasharray={circumference} strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white leading-none tabular-nums">
          {animated}
        </span>
        <span className="text-[10px] font-black text-slate-400 mt-1 tracking-widest">/ 100</span>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, sub, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 border border-white/40 dark:border-slate-800/60 rounded-2xl p-3.5 backdrop-blur">
      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${accent ?? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">{label}</p>
        <p className="text-sm font-black text-slate-800 dark:text-white truncate">{value}</p>
        {sub && <p className="text-[9px] font-bold text-slate-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

export default function DeviceDashboardWidget() {
  const language = useAppStore((s) => s.language);
  const deviceScore = useAppStore((s) => s.deviceScore);
  const deviceTier = useAppStore((s) => s.deviceTier);
  const deviceDetectedAt = useAppStore((s) => s.deviceDetectedAt);
  const deviceDetail = useAppStore((s) => s.deviceDetail);
  const setDeviceInfo = useAppStore((s) => s.setDeviceInfo);

  const [mounted, setMounted] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [facts, setFacts] = useState<DeviceFacts | null>(null);
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const isRtl = language === "ar";
  const t = TRANSLATIONS[language];

  const tier: DeviceTier =
    deviceTier ?? (deviceScore != null ? (deviceScore < 45 ? "weak" : deviceScore <= 70 ? "medium" : "powerful") : "medium");
  const score = deviceScore ?? 0;
  const confidence = deviceDetail?.confidence ?? null;
  const confidenceInfo = confidence != null ? getConfidenceInfo(confidence) : null;

  useEffect(() => {
    setMounted(true);
    setFacts(getDeviceFacts());
    getBatteryInfo().then(setBattery);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("getBattery" in navigator)) return;
    let batteryObj: any = null;
    const handler = () => {
      setBattery({ level: batteryObj?.level ?? 0, charging: !!batteryObj?.charging });
    };
    (navigator as any).getBattery()
      .then((b: any) => {
        batteryObj = b;
        handler();
        b.addEventListener?.("levelchange", handler);
        b.addEventListener?.("chargingchange", handler);
      })
      .catch(() => {});
    return () => {
      batteryObj?.removeEventListener?.("levelchange", handler);
      batteryObj?.removeEventListener?.("chargingchange", handler);
    };
  }, []);

  useEffect(() => {
    const conn = (navigator as any).connection;
    const refresh = () => {
      setFacts(getDeviceFacts());
      getBatteryInfo().then(setBattery);
    };
    conn?.addEventListener?.("change", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    const onFocus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      conn?.removeEventListener?.("change", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!mounted || deviceScore != null) return;
    detectDevice({ full: false })
      .then((signals: DeviceSignals) => setDeviceInfo(signals.score, signals.tier, signals))
      .catch(() => {});
  }, [mounted, deviceScore, setDeviceInfo]);

  const handleAnalyze = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const signals = await detectDevice({ full: true, prev: deviceDetail ?? undefined });
      setDeviceInfo(signals.score, signals.tier, signals);
      setFacts(getDeviceFacts());
      getBatteryInfo().then(setBattery);
    } catch {
      /* ignore */
    } finally {
      setAnalyzing(false);
    }
  };

  if (!mounted) return null;

  const tierLabel = () =>
    tier === "weak" ? t.tierWeak : tier === "medium" ? t.tierMedium : t.tierPowerful;

  const fmtAgo = (ts: number | null) => {
    if (!ts) return "—";
    const seconds = Math.floor((now - ts) / 1000);
    if (seconds < 60) return t.justNow;
    return t.minutesAgo.replace("{n}", String(Math.floor(seconds / 60)));
  };

  const levelPct =
    battery?.level != null
      ? Math.round(battery.level * 100)
      : deviceDetail?.batteryLevel != null
        ? Math.round(deviceDetail.batteryLevel * 100)
        : null;
  const charging = battery?.charging ?? deviceDetail?.charging ?? null;

  const networkLabel = facts?.network ? facts.network.toUpperCase() : "—";
  const downlink = deviceDetail?.downlink ?? facts?.downlink;
  const netValue = downlink != null ? `${downlink.toFixed(1)} Mb/s` : networkLabel;
  const netSub = downlink != null ? networkLabel + (facts?.saveData ? ` · ${t.deviceSaveData}` : "") : undefined;

  const latencyValue = deviceDetail?.latencyMs ?? facts?.rtt ?? null;
  const latencyText = latencyValue != null ? `${Math.round(latencyValue)} ms` : "—";

  const deviceClass = facts?.isTablet ? t.deviceTablet : facts?.isMobile ? t.deviceMobile : t.deviceDesktop;
  const deviceIcon = facts?.isTablet ? <Tablet size={18} /> : facts?.isMobile ? <Smartphone size={18} /> : <Monitor size={18} />;

  const batteryAccent =
    levelPct != null
      ? levelPct > 50
        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        : levelPct > 20
          ? "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
          : "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
      : "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="w-full relative mt-4"
    >
      <div className="absolute -top-12 start-1/4 w-72 h-72 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative premium-glass p-6 md:p-8 rounded-[2.5rem] border border-white/60 dark:border-slate-800/60 shadow-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-accent flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Gauge size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{t.deviceDashboardTitle}</h2>
              <p className="text-[11px] font-bold text-slate-400">{t.deviceDashboardDesc}</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-900">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {t.deviceLive}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-center">
          <div className="flex flex-col items-center gap-4">
            <ScoreRing score={score} tier={tier} />
            <div className="flex flex-col items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black ${TIER_UI[tier].bg}`}>
                {tierLabel()}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 text-center max-w-[230px] leading-relaxed">
                {describeDevice(tier)[isRtl ? "ar" : "fr"]}
              </span>
              {confidenceInfo && (
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${
                  confidenceInfo.level === "high" ? "text-emerald-500" : confidenceInfo.level === "medium" ? "text-amber-500" : "text-slate-400"
                }`}>
                  <ShieldCheck size={12} />
                  {confidenceInfo[isRtl ? "ar" : "fr"]}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <StatTile
              icon={charging ? <BatteryCharging size={18} /> : <BatteryMedium size={18} />}
              label={t.deviceBattery}
              value={levelPct != null ? `${levelPct}%` : "—"}
              sub={charging != null ? (charging ? t.batteryCharging : t.batteryOn) : undefined}
              accent={batteryAccent}
            />
            <StatTile
              icon={<Wifi size={18} />}
              label={t.deviceNetwork}
              value={netValue}
              sub={netSub}
            />
            <StatTile
              icon={<MemoryStick size={18} />}
              label={t.deviceMemory}
              value={facts?.memory ? `${facts.memory} GB` : "—"}
              sub={`${t.deviceCores}: ${facts?.cores ?? "—"}`}
            />
            <StatTile
              icon={deviceIcon}
              label={t.deviceClass}
              value={deviceClass}
              sub={`${deviceDetail?.screenWidth ?? (typeof window !== "undefined" ? window.innerWidth : "—")} px · ${facts?.dpr ? `${facts.dpr}x` : "—"}`}
            />
            <StatTile
              icon={<Zap size={18} />}
              label={t.deviceLatency}
              value={latencyText}
              sub={deviceDetail?.latencyMs != null ? t.measured : t.estimated}
            />
            <StatTile
              icon={<ShieldCheck size={18} />}
              label={t.confidence}
              value={confidence != null ? `${confidence}%` : "—"}
              sub={t.measured}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-5 border-t border-slate-200/70 dark:border-slate-800/60">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
            <Activity size={12} className="text-accent" />
            {t.lastDetected}: {fmtAgo(deviceDetectedAt)}
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-accent text-white font-black text-xs shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-60 disabled:hover:scale-100 cursor-pointer"
          >
            {analyzing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {analyzing ? t.analyzing : t.detectAgain}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
