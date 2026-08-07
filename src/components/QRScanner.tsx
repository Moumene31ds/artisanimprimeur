"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, Loader2, RefreshCw, Zap } from "lucide-react";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

const MIN_BOX = 160;
const MAX_BOX = 250;
const BOX_RATIO = 0.68;

export default function QRScanner({ onScanSuccess }: QRScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const readerIdRef = useRef<string>(`qr-reader-${Math.random().toString(36).slice(2, 8)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const destroyedRef = useRef(false);

  const onScanRef = useRef(onScanSuccess);
  onScanRef.current = onScanSuccess;

  const [starting, setStarting] = useState(true);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [boxSize, setBoxSize] = useState(230);
  const [boxPct, setBoxPct] = useState(68);

  const computeBox = useCallback((containerWidth: number) => {
    return Math.min(Math.max(containerWidth * BOX_RATIO, MIN_BOX), MAX_BOX);
  }, []);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner && startedRef.current) {
      try {
        await scanner.stop();
      } catch (e) {
        // تجاهل أخطاء الإيقاف أثناء التدمير
      }
    }
    startedRef.current = false;
    setStarted(false);
    setTorchOn(false);
  }, []);

  const startScanner = useCallback(async () => {
    const el = document.getElementById(readerIdRef.current);
    if (!el || destroyedRef.current) return;

    setStarting(true);
    setError(null);

    const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
    const box = computeBox(containerWidth);
    setBoxSize(box);
    setBoxPct(Math.round((box / Math.max(containerWidth, 1)) * 100));

    // إنشاء أو إعادة استخدام كائن الماسح
    let scanner = scannerRef.current;
    if (!scanner) {
      scanner = new Html5Qrcode(readerIdRef.current);
      scannerRef.current = scanner;
    }

    try {
      // إيقاف أي تشغيل سابق أولاً
      if (startedRef.current) {
        try {
          await scanner.stop();
        } catch (e) {
          // تجاهل
        }
      }

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const base = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.min(Math.max(base * BOX_RATIO, MIN_BOX), MAX_BOX);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
          disableFlip: true,
        },
        (decodedText: string) => {
          try {
            scanner?.pause(true);
          } catch (e) {
            // تجاهل
          }
          onScanRef.current(decodedText);
        },
        () => {
          // نتجاهل أخطاء "لا يوجد رمز أمام الكاميرا" المستمرة
        }
      );

      startedRef.current = true;
      setStarted(true);

      // التحقق من دعم المصباح (Torch)
      try {
        const capabilities = (scanner.getRunningTrackCapabilities() as any);
        setTorchSupported(!!capabilities?.advanced?.some((c: any) => c.torch));
      } catch (e) {
        setTorchSupported(false);
      }
    } catch (e: any) {
      if (!destroyedRef.current) {
        setError("camera");
      }
    } finally {
      setStarting(false);
    }
  }, [computeBox]);

  // بدء/إيقاف الماسح
  useEffect(() => {
    if (typeof window === "undefined") return;

    const delay = window.setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      window.clearTimeout(delay);
      destroyedRef.current = true;
      try {
        scannerRef.current?.clear();
      } catch (e) {
        // تجاهل
      }
    };
  }, [startScanner]);

  // إعادة تشغيل تلقائية عند تغيير الحجم/الاستدارة (Resize + Orientation)
  useEffect(() => {
    if (typeof window === "undefined" || !startedRef.current) return;

    let timeout: number | undefined;
    let lastWidth = containerRef.current?.clientWidth ?? 0;

    const handleResize = () => {
      const width = containerRef.current?.clientWidth ?? 0;
      // تجاهل التغييرات الطفيفة/الأولى لتجنب إعادة تشغيل مفرطة
      if (Math.abs(width - lastWidth) < 40) return;
      lastWidth = width;
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        startScanner();
      }, 350);
    };

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      if (timeout) window.clearTimeout(timeout);
      observer.disconnect();
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [started, startScanner]);

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner || !startedRef.current) return;
    try {
      const next = !torchOn;
      await scanner.applyVideoConstraints({ advanced: [{ torch: next }] as any });
      setTorchOn(next);
    } catch (e) {
      // بعض الأجهزة لا تدعم التبديل الفوري
    }
  };

  const handleRetry = async () => {
    destroyedRef.current = false;
    try {
      scannerRef.current?.clear();
    } catch (e) {
      // تجاهل
    }
    scannerRef.current = null;
    startedRef.current = false;
    setStarted(false);
    setTorchSupported(false);
    await startScanner();
  };

  return (
    <div className="relative w-full mx-auto" dir="ltr">
      {/* حاوية الكاميرا بنسبة عرض: ارتفاع مربعة لتناسب جميع الشاشات */}
      <div
        ref={containerRef}
        className="relative w-full aspect-square overflow-hidden rounded-[2rem] bg-black"
      >
        {/* حاوية الماسح - يجب أن يحمل الـ ID المطابق */}
        <div id={readerIdRef.current} className="absolute inset-0" />

        {/* طبقة التعتيم حول منطقة المسح */}
        {!error && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: boxSize, height: boxSize }}
            >
              {/* أربع زوايا مضيئة */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-xl"></div>

              {/* شريط المسح المتحرك */}
              <div className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_16px_#3b82f6] animate-scan-line"></div>

              {/* زجاج خفيف حول منطقة المسح */}
              <div className="absolute -inset-2 rounded-2xl border border-white/10 pointer-events-none"></div>
            </div>
          </div>
        )}

        {/* حالة التحميل */}
        {starting && !error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/50 text-white">
            <Loader2 size={32} className="animate-spin text-blue-400" />
            <span className="text-xs font-bold">جارٍ تشغيل الكاميرا...</span>
          </div>
        )}

        {/* خطأ الكاميرا */}
        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-center px-6 bg-slate-950">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <Camera size={28} className="text-slate-300" />
            </div>
            <p className="text-white/80 text-sm font-bold">تعذر الوصول إلى الكاميرا</p>
            <p className="text-white/50 text-[10px] font-medium leading-relaxed max-w-[220px]">
              تحقق من منح إذن الكاميرا للمتصفح أو استخدم متصفحاً حديثاً
            </p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
            >
              <RefreshCw size={14} /> إعادة المحاولة
            </button>
          </div>
        )}

        {/* زر المصباح */}
        {started && torchSupported && (
          <button
            onClick={toggleTorch}
            className={`absolute top-4 right-4 z-30 p-3 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
              torchOn ? "bg-amber-400 text-slate-900" : "bg-black/40 text-white"
            }`}
            aria-label="Toggle torch"
          >
            <Zap size={18} fill={torchOn ? "currentColor" : "none"} />
          </button>
        )}

        {/* شارة القاع */}
        {started && !error && (
          <div className="absolute bottom-4 left-0 right-0 z-20 text-center pointer-events-none">
            <span className="inline-block text-[11px] font-bold text-white/85 bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full">
              ضع رمز QR داخل المربع للمسح
            </span>
          </div>
        )}
      </div>

      <style jsx global>{`
        /* تنسيق الكاميرا الداخلية للمكتبة لتغطية الحاوية بالكامل */
        #${readerIdRef.current} {
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        #${readerIdRef.current} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #${readerIdRef.current} img.qr-code {
          display: none !important;
        }
        /* إخفاء أي عناصر إضافية تضيفها المكتبة */
        #${readerIdRef.current} div,
        #${readerIdRef.current} [data-testid] {
          background: transparent !important;
        }
        @keyframes scan-line-move {
          0% { top: 6%; opacity: 0.6; }
          50% { opacity: 1; }
          100% { top: 92%; opacity: 0.6; }
        }
        .animate-scan-line {
          top: 6%;
          animation: scan-line-move 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
