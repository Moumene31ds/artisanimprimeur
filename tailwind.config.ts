import type { Config } from "tailwindcss";

const config: Config = {
  // تفعيل الوضع الليلي بناءً على وجود كلاس "dark" في عنصر الـ html
  darkMode: "class",
  
  // تحديد الملفات التي سيقوم Tailwind بالبحث فيها عن الكلاسات المستخدمة
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  
  theme: {
    extend: {
      // تعريف الخطوط المخصصة (Cairo تم تعريفه في layout.tsx)
      fontFamily: {
        sans: ["var(--font-main)", "ui-sans-serif", "system-ui"],
      },
      
      // تعريف ألوان الهوية البصرية للموقع
      colors: {
        brand: {
          DEFAULT: "#0f172a", // اللون الأساسي (Slate 900)
          dark: "#1e293b",
        },
        accent: {
          DEFAULT: "#3b82f6", // اللون التفاعلي (Blue 500)
          hover: "#2563eb",
          light: "#dbeafe",
        },
      },
      
      // إعدادات الحركات المخصصة (Custom Animations)
      animation: {
        "bounce-slow": "bounce 3s infinite",
        "spin-slow": "spin 3s linear infinite",
        "pulse-glow": "pulseGlow 2s infinite",
        "fadeIn": "fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slideUp": "slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "marquee": "marquee 15s linear infinite",
        "blob": "blob 7s infinite",
      },
      
      // تعريف سلوك الحركات (Keyframes)
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { 
            boxShadow: "0 0 15px rgba(59, 130, 246, 0.5)",
            transform: "scale(1)"
          },
          "50%": { 
            boxShadow: "0 0 25px rgba(59, 130, 246, 0.8)",
            transform: "scale(1.02)"
          },
        },
        marquee: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
      },
      
      // إعدادات الخلفية الزجاجية (Glassmorphism)
      backdropBlur: {
        xs: "2px",
      },
      
      // إعدادات المسافات الآمنة للهواتف (Safe Areas)
      spacing: {
        safe: "env(safe-area-inset-bottom)",
      },
    },
  },
  
  // إضافة الإضافات (Plugins) إذا لزم الأمر
  plugins: [
    // يمكنك إضافة @tailwindcss/typography أو @tailwindcss/forms هنا لاحقاً
  ],
};

export default config;

