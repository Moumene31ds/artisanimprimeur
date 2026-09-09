"use client";

import { useEffect, useState } from "react";

export interface KeyboardState {
  /** هل لوحة المفاتيح الافتراضية ظاهرة حالياً؟ */
  open: boolean;
  /** ارتفاع لوحة المفاتيح بالبكسل (0 عند الإغلاق). */
  height: number;
}

/**
 * useKeyboard — كشف لوحة المفاتيح الافتراضية على الهواتف عبر VisualViewport API.
 *
 * يعتمد على الفرق بين ارتفاع النافذة وارتفاع منطقة العرض المرئية:
 * عندما تفتح الكيبورد ينكمش visualViewport بينما يبقى window.innerHeight
 * (أو يتغير أقل) — فرق > 120px = كيبورد مفتوحة.
 *
 * آثار جانبية مفيدة (تُطبَّق على <html> لأجل CSS):
 *  - data-keyboard="open" | "closed"
 *  - المتغير --kb-offset بارتفاع الكيبورد (للاستخدام في padding/margin)
 *
 * يستخدم rAF لتجميع أحداث resize/scroll المتكررة أثناء انزلاق الكيبورد.
 */
export function useKeyboard(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({ open: false, height: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;

    const update = () => {
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      const height = Math.max(0, Math.round(diff));
      // عتبة 120px لتفادي الإنذارات الخاطئة (أشرطة أدوات المتصفح المتحركة).
      const open = height > 120;

      setState((prev) =>
        prev.open === open && prev.height === height ? prev : { open, height }
      );

      const root = document.documentElement;
      root.style.setProperty("--kb-offset", `${height}px`);
      root.dataset.keyboard = open ? "open" : "closed";
    };

    const onEvent = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    vv.addEventListener("resize", onEvent);
    vv.addEventListener("scroll", onEvent);

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", onEvent);
      vv.removeEventListener("scroll", onEvent);
      // تنظيف الآثار حتى لا تبقى العناصر مخفية بعد إلغاء التركيب.
      delete document.documentElement.dataset.keyboard;
      document.documentElement.style.removeProperty("--kb-offset");
    };
  }, []);

  return state;
}
