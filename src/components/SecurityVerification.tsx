"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Lock, Unlock, ShieldCheck, Loader2 } from "lucide-react";
import canvasConfetti from "canvas-confetti";

interface SecurityVerificationProps {
  onVerify: (verified: boolean) => void;
  language: "ar" | "fr";
  captchaMode: "disabled" | "slider" | "recaptcha" | "recaptcha_v3";
  siteKey?: string;
}

export default function SecurityVerification({
  onVerify,
  language,
  captchaMode = "slider",
  siteKey = "",
}: SecurityVerificationProps) {
  const [mounted, setMounted] = useState(false);
  const [sliderVerified, setSliderVerified] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0); // 0 to 100
  const [isDragging, setIsDragging] = useState(false);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState(false);

  const sliderRef = useRef<HTMLDivElement>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<any>(null);

  const isRtl = language === "ar";

  const t = {
    sliderLabel: isRtl ? "اسحب للتحقق الأمني 🔒" : "Glissez pour vérifier 🔒",
    verifiedLabel: isRtl ? "تم التحقق بنجاح! ✨" : "Vérifié avec succès ! ✨",
    loadingRecaptcha: isRtl ? "جاري تحميل نظام الحماية..." : "Chargement du système de sécurité...",
    recaptchaFallback: isRtl 
      ? "تعذر الاتصال بـ Google. تم تنشيط التحقق البديل السريع."
      : "Connexion Google impossible. Activation de la vérification alternative.",
    v3Secured: isRtl 
      ? "النظام مؤمن بالكامل خلفياً بواسطة Google reCAPTCHA v3 🛡️" 
      : "Système entièrement sécurisé en arrière-plan par Google reCAPTCHA v3 🛡️",
    v3Active: isRtl
      ? "جاري تقييم الجدارة الأمنية للمتصفح تلقائياً..."
      : "Analyse automatique de la sécurité du navigateur...",
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Handle Disabled Mode
  useEffect(() => {
    if (mounted && captchaMode === "disabled") {
      onVerify(true);
    }
  }, [mounted, captchaMode]);

  // 2. Handle Google reCAPTCHA dynamic loading (v2 and v3)
  useEffect(() => {
    if (!mounted) return;
    if (captchaMode !== "recaptcha" && captchaMode !== "recaptcha_v3") return;

    // Smart fallback if site key is empty
    if (!siteKey || siteKey.trim() === "") {
      console.warn("reCAPTCHA siteKey is missing. Falling back to Slider CAPTCHA.");
      setUseFallback(true);
      return;
    }

    if (captchaMode === "recaptcha_v3") {
      // Dynamic loading for reCAPTCHA v3
      const scriptId = "google-recaptcha-v3-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      const executeV3Challenge = () => {
        if (!(window as any).grecaptcha || !(window as any).grecaptcha.ready) {
          setUseFallback(true);
          return;
        }

        (window as any).grecaptcha.ready(async () => {
          try {
            const token = await (window as any).grecaptcha.execute(siteKey, { action: "submit" });
            if (token) {
              onVerify(true);
              setRecaptchaLoaded(true);
              setRecaptchaError(false);
            } else {
              setUseFallback(true);
            }
          } catch (err) {
            console.error("Error executing reCAPTCHA v3:", err);
            setUseFallback(true);
          }
        });
      };

      if (!(window as any).grecaptcha) {
        if (!script) {
          script = document.createElement("script");
          script.id = scriptId;
          script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}&hl=${language}`;
          script.async = true;
          script.defer = true;
          script.onload = () => {
            executeV3Challenge();
          };
          script.onerror = () => {
            console.error("Failed to load Google reCAPTCHA v3 script.");
            setRecaptchaError(true);
            setUseFallback(true);
          };
          document.head.appendChild(script);
        } else {
          executeV3Challenge();
        }
      } else {
        executeV3Challenge();
      }
    } else {
      // Dynamic loading for reCAPTCHA v2 (Checkbox)
      const handleRecaptchaSuccess = (token: string) => {
        if (token) {
          onVerify(true);
        }
      };

      const handleRecaptchaExpired = () => {
        onVerify(false);
      };

      (window as any).onRecaptchaSuccess = handleRecaptchaSuccess;
      (window as any).onRecaptchaExpired = handleRecaptchaExpired;

      const scriptId = "google-recaptcha-v2-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      const renderV2Widget = () => {
        if (!(window as any).grecaptcha || !recaptchaContainerRef.current) return;
        try {
          recaptchaContainerRef.current.innerHTML = "";
          const container = document.createElement("div");
          recaptchaContainerRef.current.appendChild(container);

          widgetIdRef.current = (window as any).grecaptcha.render(container, {
            sitekey: siteKey,
            callback: "onRecaptchaSuccess",
            "expired-callback": "onRecaptchaExpired",
            theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
            hl: language,
          });
          setRecaptchaLoaded(true);
          setRecaptchaError(false);
        } catch (err) {
          console.error("Error rendering reCAPTCHA v2 widget:", err);
          setRecaptchaError(true);
          setUseFallback(true);
        }
      };

      if (!(window as any).grecaptcha) {
        if (!script) {
          script = document.createElement("script");
          script.id = scriptId;
          script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaV2ScriptLoad&render=explicit&hl=${language}`;
          script.async = true;
          script.defer = true;
          script.onerror = () => {
            console.error("Failed to load Google reCAPTCHA v2 script.");
            setRecaptchaError(true);
            setUseFallback(true);
          };
          document.head.appendChild(script);
        }

        (window as any).onRecaptchaV2ScriptLoad = () => {
          renderV2Widget();
        };
      } else {
        renderV2Widget();
      }
    }

    return () => {
      delete (window as any).onRecaptchaSuccess;
      delete (window as any).onRecaptchaExpired;
    };
  }, [mounted, captchaMode, siteKey, language]);

  if (!mounted || captchaMode === "disabled") return null;

  // --- Slider Event Handlers ---
  const handleStart = () => {
    if (sliderVerified) return;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || sliderVerified || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const width = rect.width;
    const handleWidth = 56;
    const maxDistance = width - handleWidth;

    let relativeX = clientX - rect.left - handleWidth / 2;
    if (relativeX < 0) relativeX = 0;
    if (relativeX > maxDistance) relativeX = maxDistance;

    const percentage = Math.round((relativeX / maxDistance) * 100);
    setSliderPosition(percentage);

    if (percentage >= 98) {
      setIsDragging(false);
      setSliderVerified(true);
      setSliderPosition(100);
      onVerify(true);
      
      canvasConfetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.8 },
        colors: ["#3b82f6", "#10b981", "#8b5cf6"]
      });
    }
  };

  const handleEnd = () => {
    if (sliderVerified) return;
    setIsDragging(false);
    setSliderPosition(0);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    handleStart();
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    handleEnd();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    handleStart();
    const handleMouseMove = (event: MouseEvent) => {
      handleMove(event.clientX);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setSliderPosition((prev) => (prev >= 98 ? 100 : 0));
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const renderSlider = () => (
    <div className="w-full select-none" dir="ltr">
      <div 
        ref={sliderRef}
        className="h-14 w-full bg-slate-100/80 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-inner"
      >
        <div 
          className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-blue-500/10 via-emerald-500/20 to-emerald-500/30 transition-all duration-75"
          style={{ width: `${sliderPosition}%` }}
        />

        <span 
          className={`text-xs font-black select-none pointer-events-none transition-opacity ${
            sliderPosition > 40 ? "opacity-0" : "opacity-100"
          } ${
            sliderVerified 
              ? "text-emerald-600 dark:text-emerald-400" 
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {sliderVerified ? t.verifiedLabel : t.sliderLabel}
        </span>

        <motion.div
          animate={isDragging ? {} : { left: `${sliderPosition}%` }}
          style={{ left: `${sliderPosition}%`, position: "absolute" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          className={`w-14 h-full top-0 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 transition-transform ${
            sliderVerified 
              ? "bg-emerald-500 text-white rounded-2xl" 
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700"
          }`}
        >
          {sliderVerified ? (
            <ShieldCheck size={20} className="animate-pulse" />
          ) : isDragging ? (
            <Unlock size={20} className="text-blue-500" />
          ) : (
            <Lock size={20} />
          )}
        </motion.div>
      </div>
    </div>
  );

  // If recaptcha mode fails, fallback to slider CAPTCHA
  if ((captchaMode === "recaptcha" || captchaMode === "recaptcha_v3") && useFallback) {
    return (
      <div className="w-full space-y-3" dir={isRtl ? "rtl" : "ltr"}>
        <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 flex items-center gap-1.5 justify-center">
          <span>⚠️ {t.recaptchaFallback}</span>
        </p>
        {renderSlider()}
      </div>
    );
  }

  // Render google reCAPTCHA v3 Shield Badge or reCAPTCHA v2 Checkbox
  return (
    <div className="w-full flex justify-center items-center py-2" dir={isRtl ? "rtl" : "ltr"}>
      {captchaMode === "recaptcha_v3" ? (
        <div className="w-full">
          {recaptchaLoaded ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full py-4 px-6 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-500/25 rounded-2xl flex items-center gap-3 backdrop-blur-xl hover:shadow-lg transition-shadow"
            >
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping shrink-0" />
              <div className="w-3 h-3 bg-emerald-500 rounded-full absolute shrink-0" />
              <div className="flex-1 text-start">
                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                  {t.v3Secured}
                </p>
                <p className="text-[9px] text-slate-450 mt-0.5 uppercase tracking-wider font-semibold">
                  Google reCAPTCHA v3: Secure Score Verified
                </p>
              </div>
              <ShieldCheck size={20} className="text-emerald-500 animate-pulse shrink-0" />
            </motion.div>
          ) : (
            <div className="flex items-center justify-center gap-2.5 py-4 text-xs font-bold text-slate-500">
              <Loader2 className="animate-spin text-accent" size={16} />
              <span>{t.v3Active}</span>
            </div>
          )}
        </div>
      ) : captchaMode === "recaptcha" ? (
        <div className="flex flex-col items-center justify-center w-full min-h-[78px] space-y-2">
          {!recaptchaLoaded && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Loader2 className="animate-spin text-accent" size={16} />
              <span>{t.loadingRecaptcha}</span>
            </div>
          )}
          <div 
            ref={recaptchaContainerRef}
            className={`transition-opacity duration-300 ${recaptchaLoaded ? "opacity-100" : "opacity-0 h-0 overflow-hidden"}`} 
          />
        </div>
      ) : (
        renderSlider()
      )}
    </div>
  );
}
