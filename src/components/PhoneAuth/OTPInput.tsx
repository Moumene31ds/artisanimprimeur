// src/components/PhoneAuth/OTPInput.tsx
"use client";

import {
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ClipboardEvent,
  type FocusEvent,
} from "react";
import { listenForWebOTP } from "@/lib/phoneAuth";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  /** تفعيل WebOTP API لملء الرمز تلقائيًا من الرسائل النصية */
  webOTP?: boolean;
  className?: string;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
  webOTP = true,
  className = "",
}: OTPInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const focusIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, length - 1));
    requestAnimationFrame(() => {
      inputRefs.current[clamped]?.focus();
      inputRefs.current[clamped]?.select();
    });
  }, [length]);

  // Auto-focus عند أول ظهور للحقل
  useEffect(() => {
    const timer = window.setTimeout(() => focusIndex(0), 250);
    return () => window.clearTimeout(timer);
  }, [focusIndex]);

  // WebOTP API: التقاط الرمز تلقائيًا من الرسائل النصية
  useEffect(() => {
    if (!webOTP || typeof window === "undefined" || !("OTPCredential" in window)) {
      return;
    }

    return listenForWebOTP((code) => {
      const digits = code.replace(/\D/g, "").slice(0, length);
      if (!digits) return;
      onChange(digits);
      focusIndex(digits.length - 1);
      if (digits.length >= length) onComplete?.(digits);
    });
  }, [webOTP, length, onChange, onComplete, focusIndex]);

  const chars = Array.from({ length }, (_, i) => value[i] ?? "\u00A0");

  const handleChange = (index: number, raw: string) => {
    if (disabled) return;
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;

    // مصفوفة ثابتة الطول تمنع مشكلة الخانات الفارغة (sparse array)
    const arr = Array.from({ length }, (_, i) => value[i] ?? "");
    for (let j = 0; j < digits.length && index + j < length; j++) {
      arr[index + j] = digits[j];
    }

    const joined = arr.join("");
    onChange(joined);

    const target = Math.min(index + digits.length, length - 1);
    focusIndex(target);
    if (joined.length >= length) onComplete?.(joined);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Enter") {
      if (value.length >= length) {
        e.preventDefault();
        onComplete?.(value);
      }
    } else if (e.key === "Backspace") {
      e.preventDefault();
      const next = value.split("");
      if (next[index]) {
        next[index] = "";
        onChange(next.join(""));
      } else if (index > 0) {
        focusIndex(index - 1);
      }
    } else if (e.key === "Delete") {
      e.preventDefault();
      const next = value.split("");
      next[index] = "";
      onChange(next.join(""));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusIndex(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusIndex(index + 1);
    } else if (/^\d$/.test(e.key) && value[index]) {
      // استبدال الرقم الموجود فورًا والانتقال للتالي
      e.preventDefault();
      const next = value.split("");
      next[index] = e.key;
      const joined = next.join("");
      onChange(joined);
      focusIndex(index + 1);
      if (joined.length >= length) onComplete?.(joined);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    focusIndex(Math.min(pasted.length, length - 1));
    if (pasted.length >= length) onComplete?.(pasted);
  };

  const handleFocus = (index: number, e: FocusEvent<HTMLInputElement>) => {
    if (index === 0) {
      e.target.select();
      return;
    }
    // نقل التركيز تلقائيًا لأول خانة فارغة (سلوك رسائل واتساب)
    if (value.length < length && index > value.length) {
      focusIndex(value.length);
      return;
    }
    e.target.select();
  };

  return (
    <div
      dir="ltr"
      className={`flex items-center justify-center gap-2 sm:gap-3 ${className}`}
      onPaste={handlePaste}
      role="group"
      aria-label="OTP input"
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={2}
          value={chars[i]}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => handleFocus(i, e)}
          aria-label={`Digit ${i + 1}`}
          className={`w-11 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl text-center text-xl sm:text-2xl font-bold outline-none transition-all duration-200
            bg-white/70 dark:bg-white/5 backdrop-blur-xl border-2
            ${
              error
                ? "border-rose-400/80 shadow-[0_0_0_4px_rgba(244,63,94,0.15)]"
                : chars[i] !== "\u00A0"
                ? "border-accent/70 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]"
                : "border-white/50 dark:border-white/15"
            }
            text-slate-800 dark:text-slate-100
            focus:border-accent focus:shadow-[0_0_0_4px_rgba(59,130,246,0.2)]
            hover:border-accent/40
            disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
}
