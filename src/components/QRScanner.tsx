"use client";

import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export default function QRScanner({ onScanSuccess }: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. إعدادات الماسح الضوئي
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 }, 
        aspectRatio: 1.0,
        // إضافة إعداد لمنع عرض رسائل الخطأ في الكونسول باستمرار
        showTorchButtonIfSupported: true,
      },
      /* verbose= */ false
    );

    // 2. تشغيل عملية المسح
    scanner.render(
      (decodedText) => {
        // عند نجاح المسح
        if (typeof onScanSuccess === 'function') {
          // إيقاف مؤقت لمنع المسح المتكرر في نفس اللحظة
          try {
            scanner.pause(true);
          } catch (e) {
            console.warn("Scanner pause failed", e);
          }
          onScanSuccess(decodedText);
        }
      },
      (error) => {
        // نتركها فارغة لتجاهل أخطاء "عدم وجود كود أمام الكاميرا" المستمرة
      }
    );

    // 3. دالة التنظيف (Cleanup Function) - هنا كان يحدث الخطأ
    return () => {
      if (scanner) {
        // نتحقق من أن الدالة موجودة فعلاً قبل استدعائها (تجنب TypeError)
        const checkAndClear = async () => {
          try {
            // نتحقق من الحالة الداخلية للمكتبة قبل المحاولة
            if (typeof scanner.clear === 'function') {
              await scanner.clear();
            }
          } catch (err) {
            // نتجاهل الخطأ إذا كان المكون قد تم حذفه بالفعل من الـ DOM
            console.warn("Successfully handled scanner cleanup: ", err);
          }
        };
        
        checkAndClear();
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-3xl border-4 border-slate-800 dark:border-slate-700 shadow-2xl bg-black">
      {/* حاوية الكاميرا - يجب أن يكون الـ ID مطابقاً لما تم تمريره للـ Scanner */}
      <div id="reader" ref={scannerRef} className="w-full"></div>
      
      {/* طبقة واجهة المستخدم الإضافية (ليزر المسح) */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
         <div className="w-[250px] h-[250px] border-2 border-accent/50 rounded-xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-accent shadow-[0_0_15px_#3b82f6] animate-scan"></div>
         </div>
      </div>

      {/* تعليمات للمستخدم */}
      <div className="absolute bottom-4 left-0 right-0 text-center z-20">
        <p className="text-white/70 text-xs font-medium bg-black/40 backdrop-blur-md inline-block px-4 py-1 rounded-full">
          ضع رمز QR داخل المربع للمسح
        </p>
      </div>

      <style jsx global>{`
        /* تنسيق أزرار المكتبة لتناسب تصميمك */
        #reader button {
          background-color: #3b82f6 !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 12px !important;
          font-weight: bold !important;
          margin-top: 10px !important;
          cursor: pointer !important;
        }
        #reader img {
          display: none !important; /* إخفاء أيقونة الكاميرا الافتراضية إذا أردت */
        }
        @keyframes scan {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
