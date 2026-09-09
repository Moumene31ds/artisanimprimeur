"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles, TrendingUp, Cpu, Layers, Phone, MessageSquare,
  DollarSign, Briefcase, Award, FileText, Printer,
  Smartphone, Globe, Lock, CheckCircle2
} from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function AcquisitionPage() {
  const { language } = useAppStore();
  const isRtl = language === "ar";
  const dailyOrdersId = useId();
  const avgBasketId = useId();

  // ROI Calculator States
  const [dailyOrders, setDailyOrders] = useState<number>(35);
  const [avgBasket, setAvgBasket] = useState<number>(5500); // 5,500 DA

  // Monthly GMV = dailyOrders * 30 * avgBasket
  const monthlyRevenue = dailyOrders * 30 * avgBasket;
  // Printing typical gross margin: ~65%
  const monthlyGrossProfit = Math.round(monthlyRevenue * 0.65);
  const annualNetProfit = monthlyGrossProfit * 12;

  const handleWhatsAppContact = () => {
    const text = isRtl
      ? `مرحباً، أنا مهتم بصفقة الاستحواذ وشراء منصة L'Artisan Imprimeur بالكامل. أود مناقشة التفاصيل وعرض الشراء المالي.`
      : `Bonjour, je suis intéressé par l'acquisition complète de la plateforme SaaS L'Artisan Imprimeur. Je souhaite discuter des modalités de rachat.`;
    const url = `https://wa.me/213549179000?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500/30 selection:text-amber-200 pb-24 overflow-hidden relative font-sans" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Background Atmosphere Gradients & Light Beams */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] bg-gradient-to-b from-amber-500/15 via-emerald-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-80 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-96 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36">

        {/* 1. TOP INVESTMENT BADGE */}
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-400/40 backdrop-blur-xl shadow-[0_0_25px_rgba(245,158,11,0.2)]"
          >
            <Sparkles size={16} className="text-amber-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-amber-300">
              {isRtl ? "💎 عرض استثماري حصري — المنصة معروضة للاستحواذ والبيع الكامل" : "💎 EXCLUSIVE ACQUISITION OFFER — PLATFORM FOR TURNKEY SALE"}
            </span>
          </motion.div>
        </div>

        {/* 2. HERO HEADLINE */}
        <div className="text-center max-w-4xl mx-auto space-y-6 mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15]"
          >
            {isRtl ? (
              <>
                امتلك أول وأقوى منصة{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-300">
                  طباعة رقمية وصناعية ذكية SaaS
                </span>{" "}
                جاهزة للتشغيل الفوري في الجزائر
              </>
            ) : (
              <>
                Acquire Algeria's #1{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-300">
                  Industrial Web-to-Print SaaS
                </span>{" "}
                Turnkey Platform
              </>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-lg text-slate-350 max-w-3xl mx-auto leading-relaxed"
          >
            {isRtl
              ? "مشروع تقني وتجاري متكامل 100% لا يحتاج أي تطوير إضافي. يجمع بين استوديو الطباعة السريعة، محاكي 3D بالواقع المعزز، محرك الفرز الصناعي SRA3 للمطابع، وأتمتة بريدي موب بالذكاء الاصطناعي مع توفير كامل لرسوم بوابات الدفع."
              : "A 100% turnkey digital enterprise asset ready for immediate deployment. Combines fast Web-to-Print studio, 3D WebGL luxury card simulator, industrial SRA3 imposition prepress engine, and zero-fee BaridiMob AI vision verification."}
          </motion.p>

          {/* Direct CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button
              onClick={handleWhatsAppContact}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-[0_10px_35px_rgba(245,158,11,0.3)] hover:scale-105 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <MessageSquare size={18} />
              <span>{isRtl ? "محادثة VIP ومناقشة عرض الشراء" : "Direct VIP Deal Room (WhatsApp)"}</span>
            </button>
            <a
              href="tel:+213549179000"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-sm sm:text-base rounded-2xl border border-slate-700/80 shadow-lg hover:border-slate-500 transition-all flex items-center justify-center gap-2"
            >
              <Phone size={18} className="text-emerald-400" />
              <span>+213 549 17 90 00</span>
            </a>
          </motion.div>
        </div>

        {/* 3. KEY ASSET METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-20">
          {[
            {
              title: isRtl ? "عمولات دفع وسيطة" : "Payment Gateway Fees",
              value: "0.0%",
              sub: isRtl ? "أتمتة بريدي موب بالذكاء الاصطناعي" : "AI Vision BaridiMob Automation",
              color: "from-emerald-500/20 to-emerald-500/5",
              border: "border-emerald-500/30",
              text: "text-emerald-400",
            },
            {
              title: isRtl ? "هامش الربح التشغيلي" : "Gross Profit Margin",
              value: "~65%",
              sub: isRtl ? "قطاع الطباعة الرقمية عالي العائد" : "High-margin digital print products",
              color: "from-amber-500/20 to-amber-500/5",
              border: "border-amber-500/30",
              text: "text-amber-400",
            },
            {
              title: isRtl ? "جاهزية التشغيل الفوري" : "Turnkey Readiness",
              value: "100%",
              sub: isRtl ? "كود، قواعد بيانات، قوالب، ولوحة تحكم" : "Code, DB, templates & admin ready",
              color: "from-blue-500/20 to-blue-500/5",
              border: "border-blue-500/30",
              text: "text-blue-400",
            },
            {
              title: isRtl ? "نطاق التغطية والسوق" : "Market Coverage",
              value: "58 ولاية",
              sub: isRtl ? "تكامل حساب أسعار الشحن الوطني" : "National delivery coverage in Algeria",
              color: "from-purple-500/20 to-purple-500/5",
              border: "border-purple-500/30",
              text: "text-purple-400",
            },
          ].map((m, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`p-6 rounded-3xl bg-gradient-to-b ${m.color} border ${m.border} backdrop-blur-md relative overflow-hidden`}
            >
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{m.title}</p>
              <h3 className={`text-3xl sm:text-4xl font-black ${m.text} tracking-tight mb-1`}>{m.value}</h3>
              <p className="text-[11px] text-slate-400 leading-snug">{m.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* 4. INTERACTIVE ROI & VALUATION CALCULATOR */}
        <div className="mb-24">
          <div className="p-8 sm:p-12 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              
              <div className="flex items-center gap-3 mb-4">
                <span className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <TrendingUp size={22} />
                </span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {isRtl ? "محاكي العائد المالي والاستثماري للمنصة (Interactive Valuation & ROI)" : "Platform ROI & Financial Projections"}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {isRtl
                      ? "حرّك المؤشرات لاكتشاف الإيرادات والأرباح الصافية المتوقعة بناءً على حجم التشغيل المستهدف:"
                      : "Adjust sliders to project your monthly GMV and annual profits based on your target scale:"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
                
                {/* Sliders Block */}
                <div className="lg:col-span-6 space-y-6">
                  
                  {/* Daily Orders Slider */}
                  <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <label htmlFor={dailyOrdersId} className="font-bold text-slate-300">
                        {isRtl ? "عدد الطلبات اليومية المتوقعة" : "Projected Daily Orders"}:
                      </label>
                      <span className="font-mono font-black text-amber-400 text-lg">{dailyOrders} {isRtl ? "طلب/يوم" : "orders/day"}</span>
                    </div>
                    <input
                      id={dailyOrdersId}
                      aria-label={isRtl ? "عدد الطلبات اليومية المتوقعة" : "Projected Daily Orders"}
                      type="range"
                      min={10}
                      max={150}
                      step={5}
                      value={dailyOrders}
                      onChange={(e) => setDailyOrders(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>10 {isRtl ? "طلبات" : "orders"}</span>
                      <span>75 {isRtl ? "طلب" : "orders"}</span>
                      <span>150+ {isRtl ? "طلب" : "orders"}</span>
                    </div>
                  </div>

                  {/* Avg Basket Value Slider */}
                  <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <label htmlFor={avgBasketId} className="font-bold text-slate-300">
                        {isRtl ? "متوسط قيمة السلة (Average Order Value)" : "Average Order Value (AOV)"}:
                      </label>
                      <span className="font-mono font-black text-emerald-400 text-lg">{avgBasket.toLocaleString()} DA</span>
                    </div>
                    <input
                      id={avgBasketId}
                      aria-label={isRtl ? "متوسط قيمة السلة (Average Order Value)" : "Average Order Value (AOV)"}
                      type="range"
                      min={2500}
                      max={20000}
                      step={500}
                      value={avgBasket}
                      onChange={(e) => setAvgBasket(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>2,500 DA (Cartes)</span>
                      <span>10,000 DA (Packaging)</span>
                      <span>20,000+ DA (B2B Signage)</span>
                    </div>
                  </div>

                </div>

                {/* Calculation Output Card */}
                <div className="lg:col-span-6">
                  <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-950 to-slate-900 border border-amber-500/40 shadow-2xl space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {isRtl ? "رقم الأعمال الشهري المتوقع" : "Projected Monthly Revenue"}
                      </span>
                      <span className="font-mono font-black text-2xl sm:text-3xl text-white">
                        {monthlyRevenue.toLocaleString()} <span className="text-xs text-amber-400 font-sans">DA</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {isRtl ? "الربح الإجمالي الشهري (~65%)" : "Gross Monthly Profit (~65%)"}
                      </span>
                      <span className="font-mono font-black text-2xl sm:text-3xl text-emerald-400">
                        {monthlyGrossProfit.toLocaleString()} <span className="text-xs text-emerald-300 font-sans">DA</span>
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                          {isRtl ? "صافي الأرباح السنوية التقديرية" : "Estimated Annual Net Operating Profit"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {isRtl ? "استرداد قيمة الاستحواذ بالكامل في أول 3-6 أشهر" : "Full payback period expected within 3-6 months"}
                        </span>
                      </div>
                      <span className="font-mono font-black text-2xl sm:text-4xl text-amber-300">
                        {annualNetProfit.toLocaleString()} <span className="text-xs font-sans">DA</span>
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>

        {/* 5. THE 8 EXCLUSIVE ADVANTAGES (THE MOAT) */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              {isRtl ? "ركائز القوة التنافسية الـ 8 التي تجعل المنصة ذات قيمة خرافية" : "8 Unfair Competitive Moats Built Into The Platform"}
            </h2>
            <p className="text-sm text-slate-400">
              {isRtl
                ? "تم بناء المنصة بأحدث المعايير البرمجية لتمنح المشتري احتكاراً تقنياً وتوفيراً هائلاً في تكاليف الإنتاج والتسويق:"
                : "Engineered from the ground up to eliminate operational bottlenecks and maximize digital print margins:"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Printer size={22} className="text-blue-400" />,
                title: isRtl ? "محرك الفرز الصناعي SRA3" : "SRA3 Imposition Engine",
                desc: isRtl
                  ? "توليد تلقائي لألواح الطباعة الصناعية 320×450 مم مع علامات القص وشريط المعايرة CMYK لتوفير ساعات من عمل عمال المطبقة يومياً."
                  : "Automatic print imposition on 320x450mm SRA3 sheets with trim marks and CMYK control strips ready for digital presses.",
              },
              {
                icon: <Layers size={22} className="text-amber-400" />,
                title: isRtl ? "محاكي التشطيبات الفاخرة 3D" : "3D Luxury WebGL Simulator",
                desc: isRtl
                  ? "محاكاة ثلاثية الأبعاد لورق الذهب، الفضة، الورنيش الموضعي Spot UV مع تتبع حركة جيروسكوب الهاتف الحقيقية مما يرفع قيمة بيع البطاقة."
                  : "Interactive Three.js simulator for gold foil, spot UV, and rose gold with mobile gyroscope tilt interaction.",
              },
              {
                icon: <Cpu size={22} className="text-emerald-400" />,
                title: isRtl ? "أتمتة بريدي موب بالذكاء الاصطناعي" : "AI Vision Payment Verification",
                desc: isRtl
                  ? "قراءة وصولات بريدي موب واعتماد حالة الدفع آلياً دون دفع أي اشتراكات شهرية أو عمولات لبوابات دفع وسيطة."
                  : "OCR vision pipeline auto-approves BaridiMob receipts without monthly subscriptions or 3rd-party fees.",
              },
              {
                icon: <Briefcase size={22} className="text-purple-400" />,
                title: isRtl ? "بوابة الشركات B2B وعروض الأسعار" : "Corporate B2B & Proforma Engine",
                desc: isRtl
                  ? "نظام الحسابات المؤسسية، ميزانيات الفروع، ومولد عروض أسعار وفواتير شكلية رسمية Devis PDF بالمعرفات الجبائية الجزائرية."
                  : "Multi-branch accounts, credit allowances, and instant vector PDF Proforma quotes with Algerian tax IDs.",
              },
              {
                icon: <DollarSign size={22} className="text-cyan-400" />,
                title: isRtl ? "حاسبة المقاسات الكبيرة واللافتات" : "Large Format Calculator",
                desc: isRtl
                  ? "تسعير ديناميكي بالمتر المربع لمختلف الخامات (Bâche, Vinyle, Forex, Canvas) مع خيارات الحلقات والقص الليزري."
                  : "Real-time per-sqm dynamic estimator for banners, vinyl, and CNC rigid boards with instant Devis download.",
              },
              {
                icon: <FileText size={22} className="text-rose-400" />,
                title: isRtl ? "استوديو Web-to-Print السريع" : "Web-to-Print Template Studio",
                desc: isRtl
                  ? "قوالب قطاعية جاهزة للأطباء، المحامين، والمطاعم مع تصدير فوري لملف الطباعة بدقة 300 DPI وهوامش الأمان."
                  : "Sector templates with live double-sided preview and instant 300 DPI press-ready vector PDF generation.",
              },
              {
                icon: <Award size={22} className="text-amber-300" />,
                title: isRtl ? "سوق المصممين المستقلين" : "Designers Marketplace",
                desc: isRtl
                  ? "منصة مجتمعية تسمح للمصممين بنشر قوالبهم مع احتساب حقوقهم آلياً وتوفير مئات التصاميم الجاهزة لعملائك دون كلفة إضافية."
                  : "Community marketplace where designers publish templates with automated royalty calculation on orders.",
              },
              {
                icon: <Smartphone size={22} className="text-teal-400" />,
                title: isRtl ? "تطبيق PWA وتوافق كامل مع الهواتف" : "Native PWA & Mobile Engine",
                desc: isRtl
                  ? "تجربة تطبيق هاتف متكاملة مع منع التكبير التلقائي في آيفون، دعم النوتش وهوامش الأمان، وسرعة تحميل فائقة."
                  : "Progressive Web App with safe area insets, iOS auto-zoom elimination, and lightning-fast Turbopack performance.",
              },
            ].map((adv, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3 relative group hover:-translate-y-1"
              >
                <div className="p-3 bg-slate-950 rounded-2xl w-fit border border-slate-800">
                  {adv.icon}
                </div>
                <h3 className="font-black text-base text-white">{adv.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{adv.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 6. WHAT IS INCLUDED IN THE ACQUISITION PACKAGE */}
        <div className="mb-24">
          <div className="p-8 sm:p-12 rounded-[2.5rem] bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 relative">
            <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-10">
              {isRtl ? "ما الذي يشمله عقد الاستحواذ والتسليم التجاري؟" : "What Is Included In The Acquisition Handover?"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: isRtl ? "الملكية الفكرية الكاملة 100%" : "Full IP & 100% Clean Codebase",
                  items: [
                    isRtl ? "كود مصدري نظيف وموثق بالكامل" : "Clean documented Next.js 16 source code",
                    isRtl ? "حقوق تجارية كاملة بدون أي قيود" : "100% intellectual property rights",
                    isRtl ? "بنية TypeScript صارمة وخالية من الأخطاء" : "Strict zero-error TypeScript codebase",
                  ],
                },
                {
                  title: isRtl ? "المحركات الصناعية وأصول الـ 3D" : "Industrial Engines & 3D Assets",
                  items: [
                    isRtl ? "محرك الفرز SRA3 للمطابع" : "SRA3 imposition sheet engine",
                    isRtl ? "نماذج Three.js وخامات التشطيب الفاخر" : "Three.js WebGL 3D luxury shaders",
                    isRtl ? "مكتبة القوالب القطاعية 300 DPI" : "High-resolution 300 DPI templates",
                  ],
                },
                {
                  title: isRtl ? "لوحة الإدارة والإنتاج المتكاملة" : "Admin & Factory Operations Suite",
                  items: [
                    isRtl ? "لوحة تحكم إدارية شاملة للطلبات" : "Comprehensive order management panel",
                    isRtl ? "نظام اعتماد وتدقيق الـ BAT والواتساب" : "BAT proof workflow with WhatsApp dispatch",
                    isRtl ? "إدارة الكتالوج، المنتجات، والخصومات" : "Full catalog & coupon codes control",
                  ],
                },
                {
                  title: isRtl ? "قواعد البيانات والبنية السحابية" : "Cloud & Database Architecture",
                  items: [
                    isRtl ? "إعدادات Firebase Firestore & Storage" : "Configured Firebase backend & storage",
                    isRtl ? "تجهيزات الاستضافة السحابية Vercel" : "Turnkey Vercel cloud deployment",
                    isRtl ? "محرك PWA للتشغيل بدون إنترنت" : "Offline caching and PWA service worker",
                  ],
                },
                {
                  title: isRtl ? "الاستقلالية المالية الكاملة" : "Zero Gateway Dependency",
                  items: [
                    isRtl ? "أتمتة بريدي موب بالذكاء الاصطناعي" : "Autonomous BaridiMob AI vision engine",
                    isRtl ? "لا اشتراكات شهرية لبوابات خارجية" : "No recurring fees to payment aggregators",
                    isRtl ? "تحويل الأرباح مباشرة إلى حسابك البنكي" : "Direct payout routing to your bank RIB",
                  ],
                },
                {
                  title: isRtl ? "تشغيل ذاتي 100% وتسليم فوري للمفاتيح" : "100% Plug & Play Turnkey Handover",
                  items: [
                    isRtl ? "نظام إدارة بصري متكامل لا يتطلب أي مبرمج أو فريق تقني" : "Intuitive visual dashboard requiring zero developers or technical staff",
                    isRtl ? "تسليم فوري لحسابات السحابة، النطاق، والمشروع" : "Instant transfer of cloud accounts, domain & repository",
                    isRtl ? "دليل تشغيلي إداري مصور وشامل خطوة بخطوة" : "Comprehensive visual step-by-step operations manual",
                  ],
                },
              ].map((pack, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    <h3 className="font-bold text-sm text-white">{pack.title}</h3>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {pack.items.map((it, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7. DEAL ROOM & DIRECT CONTACT MODAL/BLOCK */}
        <div className="text-center max-w-2xl mx-auto space-y-6 p-10 rounded-[2.5rem] bg-gradient-to-tr from-amber-500/10 via-slate-900 to-emerald-500/10 border border-amber-500/40 shadow-2xl relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase">
            <Lock size={12} />
            <span>{isRtl ? "سرية الصفقات تامة (NDA Guaranteed)" : "Confidential Acquisition Inquiries"}</span>
          </div>
          
          <h2 className="text-3xl font-black text-white">
            {isRtl ? "ابدأ المفاوضات وقدم عرض الشراء المالي" : "Initiate Acquisition Discussions & Submit Offer"}
          </h2>
          <p className="text-sm text-slate-350 leading-relaxed">
            {isRtl
              ? "نرحب بالتواصل المباشر مع المستثمرين الجادين، أصحاب المطابع وشركات الدعاية والإعلان الراغبة في التوسع الرقمي الفوري عبر الاستحواذ الكامل."
              : "Direct line for serious investors, printing house executives, and digital conglomerates looking to acquire the platform."}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleWhatsAppContact}
              className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm rounded-2xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageSquare size={18} />
              <span>{isRtl ? "تواصل مباشر عبر واتساب VIP" : "WhatsApp VIP Deal Line"}</span>
            </button>
            <a
              href="mailto:contact@lartisan.dz?subject=Acquisition%20Inquiry%20-%20L'Artisan%20Imprimeur"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm rounded-2xl border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <Globe size={18} className="text-amber-400" />
              <span>contact@lartisan.dz</span>
            </a>
          </div>

          <p className="text-[11px] text-slate-500 pt-2">
            {isRtl
              ? "يتم توقيع اتفاقية عدم إفصاح (NDA) ونقل ملكية الأصول والحسابات الرقمية بالكامل فور إتمام الاتفاق المالي."
              : "Direct digital asset handover and NDA execution upon acquisition agreement."}
          </p>
        </div>

      </div>
    </div>
  );
}
