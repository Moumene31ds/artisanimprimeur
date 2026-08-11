"use client";

import Hero from "@/components/Hero";
import ProductCard from "@/components/ProductCard";
import MagneticCard from "@/components/MagneticCard";
import DeviceDashboardWidget from "@/components/DeviceDashboardWidget";
import { useAppStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Star, StarHalf, MapPin, Truck, Loader2, Phone, Globe, Gift, X, Copy, Check } from "lucide-react";
import { WILAYAS } from "@/lib/constants";
import { FEATURED_PRODUCTS } from "@/lib/catalog";
import { organizationJsonLd } from "@/lib/seo";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { useSwipe } from "@/hooks/useSwipe";

const TESTIMONIALS = [
  { name: "Moumene A.", role: "CEO, TechDz", text: "Meilleure qualité d'impression. Rapide et très professionnel !", rating: 5 },
  { name: "Mohamed B.", role: "Designer", text: "Le service client est exceptionnel et les couleurs des cartes sont parfaites.", rating: 4.5 },
  { name: "Karim A.", role: "Commerçant", text: "Retrait rapide à l'atelier. L'interface du site est très facile à utiliser.", rating: 4.5 },
];

const WELCOME_PRIZES = [
  { text: "10% OFF", textAr: "خصم 10%", value: 10, type: "percent", codePrefix: "WELCOME10" },
  { text: "700 DA OFF", textAr: "خصم 700 دج", value: 700, type: "fixed", codePrefix: "WELCOME700" },
  { text: "5% OFF", textAr: "خصم 5%", value: 5, type: "percent", codePrefix: "WELCOME5" },
  { text: "500 DA OFF", textAr: "خصم 500 دج", value: 500, type: "fixed", codePrefix: "WELCOME500" },
  { text: "15% OFF", textAr: "خصم 15%", value: 15, type: "percent", codePrefix: "WELCOME15" },
  { text: "200 DA OFF", textAr: "خصم 200 دج", value: 200, type: "fixed", codePrefix: "WELCOME200" },
];

interface FaqItemProps {
  question: string;
  answer: string;
}

function FaqItem({ question, answer }: FaqItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 dark:border-slate-800/50 py-4 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between font-bold text-sm text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-accent transition-colors py-2 text-start cursor-pointer"
      >
        <span>{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-slate-400 dark:text-slate-500 text-xs ml-4"
        >
          ▼
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed pt-2 pb-4">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Internal linking hub — city printing pages (SEO)
const CITIES_LINKS = [
  { key: "alger", label: "Alger", href: "/services/printing/alger" },
  { key: "oran", label: "Oran", href: "/services/printing/oran" },
  { key: "constantine", label: "Constantine", href: "/services/printing/constantine" },
  { key: "annaba", label: "Annaba", href: "/services/printing/annaba" },
  { key: "tlemcen", label: "Tlemcen", href: "/services/printing/tlemcen" },
  { key: "setif", label: "Sétif", href: "/services/printing/setif" },
  { key: "blida", label: "Blida", href: "/services/printing/blida" },
  { key: "batna", label: "Batna", href: "/services/printing/batna" },
  { key: "bejaia", label: "Béjaïa", href: "/services/printing/bejaia" },
  { key: "chlef", label: "Chlef", href: "/services/printing/chlef" },
];

export default function Home() {
  const language = useAppStore((state) => state.language);
  const [mounted, setMounted] = useState(false);
  const [userWilaya, setUserWilaya] = useState<string | null>(null);
  const [islandState, setIslandState] = useState<"idle" | "detecting" | "success">("idle");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const carouselRef = useRef<HTMLDivElement>(null);
  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe({
    onSwipeLeft: () => {
      if (!carouselRef.current) return;
      carouselRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    },
    onSwipeRight: () => {
      if (!carouselRef.current) return;
      carouselRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    },
  });

  // --- Welcome Wheel of Fortune States ---
  const [showWheelModal, setShowWheelModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [wonPrize, setWonPrize] = useState<any | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);

  const t = TRANSLATIONS[language];
  const isRtl = language === "ar";

  const categories = useMemo(() => isRtl ? [
    { id: "all", label: "الكل" },
    { id: "Cartes", label: "بطاقات أعمال" },
    { id: "Flyers", label: "منشورات إعلانية" },
    { id: "Goodies", label: "ملصقات وهدايا" },
    { id: "Impression", label: "لافتات وبوسترات" }
  ] : [
    { id: "all", label: "Tous" },
    { id: "Cartes", label: "Cartes de Visite" },
    { id: "Flyers", label: "Flyers" },
    { id: "Goodies", label: "Stickers & Goodies" },
    { id: "Impression", label: "Affiches & Posters" }
  ], [isRtl]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return FEATURED_PRODUCTS;
    return FEATURED_PRODUCTS.filter(p => p.category === activeCategory);
  }, [activeCategory]);

  const faqs = useMemo(() => isRtl ? [
    {
      question: "كيف أستلم طلبي حالياً؟",
      answer: "حالياً الاستلام يتم من مقر المطبعة بحيّ العقيد لطفي، وهران (مفتوح من 9:00 صباحاً إلى 6:00 مساءً) مجاناً ودون أي تكاليف إضافية. خدمة التوصيل إلى المنزل ستكون متاحة قريباً جداً."
    },
    {
      question: "ما هي صيغ الملفات المقبولة لرفع التصاميم؟",
      answer: "نقبل ملفات PDF و PNG و JPEG عالية الدقة. نوصي بأن تكون دقة الألوان بصيغة CMYK وبجودة لا تقل عن 300 DPI لضمان طباعة ممتازة وألوان مطابقة للتصميم."
    },
    {
      question: "كيف يمكنني الدفع؟",
      answer: "الدفع عند الاستلام (نقداً عند استلام طلبك من المطبعة)، أو عبر تحويل المبلغ عبر بريدي موب ورفع وصل الدفع في صفحة تأكيد الدفع ليتحقق فريقنا منه بسرعة. الدفع الإلكتروني (الذهبية / CIB) غير متاح حالياً على الموقع."
    },
    {
      question: "ماذا لو لم يكن لدي تصميم جاهز للطباعة؟",
      answer: "يمكنك الدخول إلى المولد الذكي (AI Studio) في موقعنا ووصف فكرتك ليقوم الذكاء الاصطناعي برسمها لك مجاناً، أو يمكنك طلب المساعدة من مستشارك الذكي Antigravity AI."
    }
  ] : [
    {
      question: "Comment récupérer ma commande ?",
      answer: "Le retrait se fait actuellement à l'atelier, Cité Akid Lotfi, Oran (ouvert de 09h à 18h), gratuitement et sans frais supplémentaires. La livraison à domicile sera disponible très prochainement."
    },
    {
      question: "Quels formats de fichiers sont acceptés ?",
      answer: "Nous acceptons les fichiers PDF, PNG et JPEG haute définition. Nous recommandons un profil de couleur CMYK et une résolution minimale de 300 DPI."
    },
    {
      question: "Comment puis-je payer ?",
      answer: "Paiement à la réception (en espèces lors du retrait à l'atelier), ou par virement BaridiMob puis en téléversant votre reçu sur la page de confirmation de paiement pour une vérification rapide par notre équipe. Le paiement électronique (Edahabia / CIB) n'est pas disponible actuellement."
    },
    {
      question: "Comment faire si je n'ai pas de design prêt ?",
      answer: "Vous pouvez vous rendre dans notre 'AI Studio' pour décrire votre idée et laisser notre IA générer votre design gratuitement, ou demander de l'aide à Antigravity AI."
    }
  ], [isRtl]);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const spun = localStorage.getItem("welcome_wheel_spun");
      if (spun === "true") {
        setHasSpun(true);
      }
    }
    const timer = setTimeout(() => autoDetectLocation(), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSpin = async () => {
    if (isSpinning || hasSpun) return;

    setIsSpinning(true);
    const prizeIdx = Math.floor(Math.random() * WELCOME_PRIZES.length);
    const prize = WELCOME_PRIZES[prizeIdx];

    // Align prize wedge with 12 o'clock pointer
    const newDegrees = 360 * 5 - (prizeIdx * 60) - 30;
    setRotationDegree(newDegrees);

    setTimeout(async () => {
      setIsSpinning(false);
      setHasSpun(true);
      setWonPrize(prize);
      localStorage.setItem("welcome_wheel_spun", "true");

      // Generate a promo code in Firestore dynamically
      const code = `${prize.codePrefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setPromoCode(code);

      try {
        await setDoc(doc(db, "promoCodes", code), {
          code: code,
          discountType: prize.type === "shipping" ? "percent" : prize.type,
          discountValue: prize.value,
          description: language === "ar" ? `خصم الترحيب: ${prize.textAr}` : `Promo de bienvenue : ${prize.text}`,
          active: true,
          oneTimeUse: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // expires in 7 days
          isWelcomeCode: true,
          createdAt: serverTimestamp(),
        });
        toast.success(language === "ar" ? "تهانينا! تم توليد كود الخصم." : "Félicitations ! Code promo créé.");
      } catch (err) {
        console.error("Error creating welcome promo code:", err);
      }
    }, 5200);
  };

  const autoDetectLocation = async () => {
    if (islandState === "detecting") return;
    setIslandState("detecting");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    try {
      const res = await fetch("/api/geo", {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); 
      
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      
      if (data && (data.regionName || data.cityName)) {
        const detectedRegion = (data.regionName || data.cityName).toLowerCase().trim();
        
        const matchedWilaya = WILAYAS.find(w => {
          const wilayaFormated = w.toLowerCase().replace(/['\-]/g, '').trim();
          const regionCleaned = detectedRegion.replace(/['\-]/g, '');
          return wilayaFormated.includes(regionCleaned) || regionCleaned.includes(wilayaFormated) || 
                 (regionCleaned === 'oran' && wilayaFormated.includes('وهران')); 
        });

        if (matchedWilaya || detectedRegion.includes('oran')) {
          const finalWilaya = matchedWilaya || (isRtl ? 'وهران' : 'Oran');
          setUserWilaya(finalWilaya);
          setIslandState("success");
          setTimeout(() => setIslandState("idle"), 4000);
        } else {
          setIslandState("idle");
        }
      }
    } catch (err) {
      setIslandState("idle");
      console.debug("Location detection skipped (Network/Adblocker)."); // إخفاء الخطأ برفق
    }
  };

  const safeJsonLd = useMemo(() => {
    const cleanLocation = userWilaya ? userWilaya.replace(/[<>"/\\;]/g, '') : "Oran";
    const baseLd = {
      ...organizationJsonLd({
        address: {
          "@type": "PostalAddress",
          addressLocality: cleanLocation,
          addressCountry: "DZ",
        },
      }),
      "@context": "https://schema.org",
    };

    const websiteLd = {
      "@type": "WebSite",
      "@id": "https://artisanimprimeur.vercel.app/#website",
      url: "https://artisanimprimeur.vercel.app",
      name: "L'Artisan Imprimeur",
      inLanguage: ["fr", "ar"],
      publisher: { "@id": "https://artisanimprimeur.vercel.app/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://artisanimprimeur.vercel.app/services?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    };

    const productListLd = {
      "@type": "ItemList",
      name: "L'Artisan Imprimeur — Produits d'impression",
      numberOfItems: FEATURED_PRODUCTS.length,
      itemListElement: FEATURED_PRODUCTS.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.name,
          image: `https://artisanimprimeur.vercel.app${product.image}`,
          category: product.category,
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: "DZD",
            availability: "https://schema.org/InStock",
            url: "https://artisanimprimeur.vercel.app/services",
          },
        },
      })),
    };

    const breadcrumbLd = {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://artisanimprimeur.vercel.app" },
        { "@type": "ListItem", position: 2, name: "Services", item: "https://artisanimprimeur.vercel.app/services" },
      ],
    };

    const faqLd = {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Quels produits d'impression proposez-vous en Algérie ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Cartes de visite premium, flyers publicitaires, stickers personnalisés, affiches de luxe et invitations — tous imprimés en haute définition.",
          },
        },
        {
          "@type": "Question",
          name: "Comment passer une commande d'impression en ligne ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sélectionnez votre produit, personnalisez-le dans notre studio en ligne, payez en toute sécurité et récupérez votre commande à l'atelier d'Oran. La livraison arrive bientôt.",
          },
        },
        {
          "@type": "Question",
          name: "Livrez-vous dans d'autres villes d'Algérie ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nous desservons Alger, Oran, Constantine, Annaba, Tlemcen, Sétif, Blida, Batna, Béjaïa et Chlef. Le retrait se fait actuellement à Oran, la livraison à domicile arrive bientôt.",
          },
        },
      ],
    };

    const graphs = [baseLd, websiteLd, productListLd, breadcrumbLd, faqLd].map((node) => ({
      "@context": "https://schema.org",
      ...node,
    }));

    return JSON.stringify(graphs)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
  }, [userWilaya]);

  if (!mounted) return null;

  return (
    <div className={`flex flex-col gap-16 animate-fadeIn ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>
      
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd }}
      />

      <div className="fixed top-24 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <AnimatePresence>
          {islandState !== "idle" && (
            <motion.div
              initial={{ y: -50, scale: 0.8, opacity: 0, filter: "blur(10px)" }}
              animate={{ y: 0, scale: 1, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: -20, scale: 0.9, opacity: 0, filter: "blur(5px)" }}
              transition={{ type: "spring", damping: 20, stiffness: 300, filter: { duration: 0.3, ease: "easeOut" } }}
              className="bg-black/85 dark:bg-white/90 backdrop-blur-xl text-white dark:text-black px-5 py-3 rounded-full shadow-2xl border border-white/10 flex items-center gap-3 pointer-events-auto cursor-pointer"
              onClick={() => setIslandState("idle")}
            >
              {islandState === "detecting" ? (
                <>
                  <Loader2 size={18} className="animate-spin text-accent" />
                  <span className="text-sm font-semibold">{isRtl ? "جاري تحديد موقعك لتخصيص العروض..." : "Détection de votre position..."}</span>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <MapPin size={14} className="text-emerald-400 dark:text-emerald-600" />
                  </div>
                  <span className="text-sm font-bold">
                    {isRtl ? `مرحباً بك زائرنا من ${userWilaya} ✨` : `Bienvenue, visiteur de ${userWilaya} ✨`}
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Hero />

      <motion.section 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="premium-glass p-8 rounded-[2.5rem] relative group mt-4"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-accent/20 transition-colors"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-start">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold mb-3 border border-blue-200 dark:border-blue-800">
              <Sparkles size={14} /> 
              {userWilaya ? (isRtl ? `عرض خاص بـ ${userWilaya}` : `Offre spéciale ${userWilaya}`) : (isRtl ? "عرض محدود" : "Offre Limitée")}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {isRtl ? "خصم 10% على أول طلب طباعة ورقية!" : "10% de réduction sur votre premier achat !"}
            </h2>
            
            <div className="mt-4 flex items-center justify-center md:justify-start gap-2 text-slate-700 dark:text-slate-300 font-medium bg-white/40 dark:bg-black/20 p-3 rounded-2xl w-fit mx-auto md:mx-0 border border-white/20">
              <Truck size={18} className="text-accent" />
              <span>{isRtl ? "الاستلام من مقر المطبعة بوهران — التوصيل قريباً 🚀" : "Retrait à l'atelier d'Oran — Livraison bientôt 🚀"}</span>
            </div>
          </div>
          <Link href="/services" className="px-8 py-4 bg-slate-900 dark:bg-accent text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform active:scale-95 whitespace-nowrap btn-shine relative overflow-hidden">
            <span className="relative z-10">{isRtl ? "ابدأ طلبك الآن" : "Commander maintenant"}</span>
          </Link>
        </div>
      </motion.section>

      <DeviceDashboardWidget />

      {/* --- Advanced 3D Customizer & Web-AR Showcase Section --- */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="premium-glass p-8 md:p-12 rounded-[2.5rem] border border-emerald-500/20 dark:border-emerald-500/10 relative overflow-hidden mt-6 bg-gradient-to-br from-emerald-500/5 via-transparent to-indigo-500/5"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="flex-1 space-y-6 text-center lg:text-start">
            <div className="flex flex-wrap justify-center lg:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-150 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-900">
                <Sparkles size={12} className="animate-pulse" />
                {isRtl ? "جديد وحصري" : "Nouveau & Exclusif"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-150 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-200 dark:border-indigo-900">
                <Globe size={12} />
                {isRtl ? "واقع معزز بالكاميرا" : "Web-AR Simulator"}
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {isRtl 
                ? "صمّم مطبوعاتك في أبعاد ثلاثية وعاينها في بيئتك الحقيقية! 🖨️✨"
                : "Concevez en 3D & visualisez en Réalité Augmentée ! 🖨️✨"}
            </h2>
            
            <p className="text-slate-600 dark:text-slate-300 font-medium text-sm leading-relaxed max-w-2xl">
              {isRtl 
                ? "ادخل استوديو التخصيص ثلاثي الأبعاد المتقدم لتصميم علب التغليف، الأكواب، القمصان، وبطاقات العمل بنفسك. أضف نصوصاً بأجمل الخطوط العربية، ارفع شعاراتك، وعاين منتجك يدور بزاوية 360 درجة، بل وشغّل كاميرا الهاتف لترى النتيجة النهائية فوق مكتبك الحقيقي قبل الطلب!"
                : "Entrez dans notre studio de personnalisation 3D de pointe pour concevoir vos emballages, mugs, t-shirts et cartes de visite. Ajoutez du texte, uploadez votre logo, observez votre création pivoter à 360°, et activez la caméra de votre smartphone pour projeter en réalité augmentée votre futur produit directement sur votre bureau !"}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {[
                { title: isRtl ? "تخصيص ثنائي الأبعاد مرن" : "Éditeur Graphique 2D", desc: isRtl ? "تحكم كامل بالنصوص والرموز" : "Textes, logos et textures", icon: "🎨" },
                { title: isRtl ? "إسقاط 3D لحظي 360°" : "Projection Live 3D", desc: isRtl ? "معاينة المجسم من كل الزوايا" : "Rendu instantané à 360°", icon: "🔄" },
                { title: isRtl ? "واقع معزز Web-AR" : "Caméra Réalité Augmentée", desc: isRtl ? "مشاهدة المنتج في غرفتك لايف" : "Visualisez sur votre table", icon: "📷" },
              ].map((feat, idx) => (
                <div key={idx} className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-white/20 dark:border-slate-800/40 text-center sm:text-start">
                  <div className="text-2xl mb-1">{feat.icon}</div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">{feat.title}</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-auto shrink-0 flex flex-col items-center justify-center gap-3">
            <Link 
              href="/customizer" 
              className="px-8 py-5 bg-gradient-to-tr from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all text-center w-full sm:w-auto flex items-center justify-center gap-2.5"
            >
              <Sparkles size={20} className="animate-spin-slow" />
              <span>{isRtl ? "ابدأ استوديو التصميم 3D" : "Lancer le Studio Customiseur 3D"}</span>
            </Link>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {isRtl ? "مجاني وسهل الاستخدام 100%" : "100% Gratuit & Facile d'utilisation"}
            </span>
          </div>
        </div>
      </motion.section>

      <section id="products" className="scroll-mt-24">
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
          <div className="flex flex-col items-center md:items-start">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {t.services}
            </h2>
            <div className="h-1.5 w-24 bg-accent mt-2 rounded-full"></div>
          </div>
          
          <Link 
            href="/services" 
            className="group flex items-center gap-2 px-6 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all font-bold text-slate-600 dark:text-slate-300"
          >
            {isRtl ? "عرض كل التصنيفات" : "Toutes les catégories"}
            <ArrowRight size={18} className={`transition-transform ${isRtl ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
          </Link>
        </div>

        <div className="flex overflow-x-auto gap-2 pb-4 mb-8 scrollbar-none border-b border-slate-100 dark:border-slate-800/40">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`relative px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? "text-white" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-indigo-950 dark:from-accent dark:to-indigo-600 rounded-xl -z-10 shadow-md shadow-indigo-500/25"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {cat.label}
              </button>
            );
          })}
        </div>

        <motion.div
          ref={carouselRef}
          layout
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-6 pb-6 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible"
        >
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, index) => (
              <motion.div 
                key={product.id} 
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="h-full min-w-[72vw] sm:min-w-[42vw] md:min-w-0 snap-center shrink-0"
              >
                <MagneticCard>
                  <ProductCard product={product as any} priority={index === 0} />
                </MagneticCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      <section className="my-2">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
            {isRtl ? "ماذا يقول عملاؤنا" : "Ce que disent nos clients"}
          </h2>
          <div className="h-1.5 w-20 bg-accent mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testi, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }} 
              whileInView={{ opacity: 1, scale: 1 }} 
              transition={{ delay: i * 0.1, type: "spring" }}
              viewport={{ once: true }}
              className="premium-glass p-8 rounded-[2rem] relative hover:-translate-y-2 transition-transform duration-300"
            >
              <div className={`absolute -top-4 ${isRtl ? '-right-4' : '-left-4'} text-6xl text-accent/20 font-serif`}>
                "
              </div>
              
              <div className="flex gap-1 mb-4 text-yellow-400">
                {[...Array(5)].map((_, idx) => {
                  const rating = testi.rating;
                  const fullStars = Math.floor(rating);
                  const hasHalfStar = rating % 1 !== 0;

                  if (idx < fullStars) {
                    return <Star key={idx} size={16} fill="currentColor" />;
                  } else if (idx === fullStars && hasHalfStar) {
                    return <StarHalf key={idx} size={16} fill="currentColor" />;
                  } else {
                    return <Star key={idx} size={16} className="text-slate-300 dark:text-slate-700" />;
                  }
                })}
              </div>

              <p className="text-slate-600 dark:text-slate-300 font-medium mb-6 relative z-10">
                "{testi.text}"
              </p>
              <div className="flex items-center gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-accent dark:to-blue-400 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  {testi.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{testi.name}</h4>
                  <p className="text-[10px] uppercase font-bold text-slate-400">{testi.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

            {/* --- Delivery Status (Livraison bientôt disponible) --- */}
      <section className="max-w-5xl mx-auto w-full my-12 scroll-mt-24 bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white border border-white/10 p-8 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-start">
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-amber-300 text-xs font-black uppercase tracking-wider border border-white/10 mb-4">
              <Truck size={14} className="animate-pulse" />
              {isRtl ? "التوصيل إلى المنزل قريباً 🚀" : "Livraison à domicile bientôt 🚀"}
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              {isRtl ? "التوصيل متاح قريباً — استلم الآن من المطبعة" : "La livraison arrive bientôt — Retrait immédiat à l'atelier"}
            </h2>
            <p className="mt-3 text-sm text-slate-300 font-semibold leading-relaxed max-w-2xl">
              {isRtl
                ? "حالياً يمكنك استلام طلباتك من مقر المطبعة بحيّ العقيد لطفي، وهران (مفتوح من 9:00 صباحاً إلى 6:00 مساءً). خدمة التوصيل إلى جميع الولايات ستصبح متاحة قريباً جداً — تابعنا!"
                : "Pour le moment, retirez vos commandes à l'atelier, Cité Akid Lotfi, Oran (ouvert de 09h à 18h). La livraison dans toutes les wilayas sera disponible très prochainement !"}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-4">
            <div className="px-6 py-4 bg-white/10 backdrop-blur rounded-2xl border border-white/10 text-center">
              <span className="block text-[9px] font-black uppercase tracking-widest text-slate-300">{isRtl ? "الاستلام من المطبعة" : "Retrait à l'atelier"}</span>
              <span className="block text-2xl font-black text-emerald-400 mt-1">{isRtl ? "مجاني" : "Gratuit"}</span>
            </div>
            <Link href="/cart" className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
              {isRtl ? "اطلب الآن" : "Commander"}
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto w-full my-6 scroll-mt-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
            {isRtl ? "الأسئلة الشائعة" : "Questions Fréquentes"}
          </h2>
          <div className="h-1.5 w-16 bg-accent mx-auto mt-4 rounded-full"></div>
        </div>
        <div className="premium-glass p-8 rounded-[2rem] border border-white/60 dark:border-slate-800/80 shadow-md">
          {faqs.map((faq, idx) => (
            <FaqItem key={idx} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </section>

      {/* Cities Served — internal linking hub for SEO */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-black uppercase tracking-wider">
            <MapPin size={12} />
            {isRtl ? "نغطي أكبر المدن الجزائرية" : "Nous couvrons les grandes villes d'Algérie"}
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
            {isRtl ? "خدمة الطباعة في مدينتك" : "Imprimerie en ligne près de chez vous"}
          </h2>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {isRtl ? "استلم طلبك من وهران — التوصيل قريباً" : "Retrait à Oran — Livraison bientôt disponible"}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {CITIES_LINKS.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full glass-spotlight text-xs font-black text-slate-700 dark:text-slate-300 hover:text-accent hover:scale-105 transition-all"
            >
              <MapPin size={12} />
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      <motion.footer 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-10 border-t border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white/40 to-slate-50/80 dark:from-slate-900/40 dark:to-slate-950/80 backdrop-blur-xl rounded-t-[3rem] -mx-4 px-6 pt-12 pb-28 md:pb-8 sm:-mx-8 sm:px-12 relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 items-start text-center md:text-start relative z-10">
          
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
              <span className="text-xl font-black bg-gradient-to-r from-slate-900 via-slate-800 to-accent dark:from-white dark:via-slate-200 dark:to-accent bg-clip-text text-transparent tracking-tight">
                L'Artisan Imprimeur
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs font-medium leading-relaxed">
              {isRtl 
                ? "شريكك الإعلاني المتميز لتجربة طباعة استثنائية وحلول تصميم مبتكرة تلبي طموحاتك في الجزائر."
                : "Votre partenaire de confiance pour une impression d'élite et des designs uniques adaptés à vos ambitions en Algérie."}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-semibold">
            <span className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold mb-1">
              {isRtl ? "اتصل بنا" : "Contact"}
            </span>
            <a href="tel:+213549179000" className="hover:text-accent transition-colors flex items-center gap-2 group bg-white/50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60 w-fit">
              <Phone size={14} className="text-accent group-hover:scale-110 transition-transform" />
              <span dir="ltr">+213 549 17 90 00</span>
            </a>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Globe size={12} />
              <span>{isRtl ? "الاستلام من وهران — التوصيل قريباً" : "Retrait à Oran — Livraison bientôt"}</span>
            </div>
          </div>

            <div className="flex flex-col items-center md:items-end gap-3">
              <span className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold mb-1">
                {isRtl ? "تصفح مريح" : "Navigation"}
              </span>
              <div className="flex gap-4 font-bold text-xs flex-wrap justify-center md:justify-end">
                <a href="#products" className="text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900">
                  {t.services}
                </a>
                <Link href="/services" className="text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900">
                  {isRtl ? "كل الخدمات" : "Tous les services"}
                </Link>
                <Link href="/prix-impression" className="text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900">
                  {isRtl ? "أسعار الطباعة" : "Prix impression"}
                </Link>
              </div>
            </div>

        </div>

        <div className="mt-12 pt-6 border-t border-slate-200/60 dark:border-slate-800/50 text-center relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} L'Artisan Imprimeur — All Rights Reserved
          </p>
        </div>
      </motion.footer>

      {/* Floating Welcome Gift Button */}
      {!hasSpun && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-24 md:bottom-6 left-6 z-40"
        >
          <button
            onClick={() => setShowWheelModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 via-purple-650 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-full font-black text-xs shadow-2xl shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          >
            <Gift className="w-5 h-5 animate-bounce group-hover:scale-110 transition-transform" />
            <span>{isRtl ? "هدية ترحيبية!" : "Cadeau de Bienvenue !"}</span>
          </button>
        </motion.div>
      )}

      {/* Welcome Wheel of Fortune Modal */}
      <AnimatePresence>
        {showWheelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSpinning) setShowWheelModal(false);
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden z-10 text-center space-y-6"
            >
              {/* Close Button */}
              {!isSpinning && (
                <button
                  onClick={() => setShowWheelModal(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              )}

              {/* Title Header */}
              <div className="space-y-1">
                <h3 className="text-xl font-black bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent">
                  {isRtl ? "عجلة الحظ الترحيبية 🎁" : "Roue de la Fortune 🎁"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  {isRtl 
                    ? "أدر العجلة واربح خصماً فورياً على أول طلب مطبوعات لك!" 
                    : "Tournez la roue et gagnez une remise immédiate sur votre 1ère commande !"}
                </p>
              </div>

              {/* The Wheel */}
              <div className="py-4">
                <div className="relative w-60 h-60 mx-auto rounded-full border-4 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: rotationDegree }}
                    transition={isSpinning ? { duration: 5, ease: [0.25, 0.8, 0.25, 1] } : { duration: 0 }}
                    className="w-full h-full rounded-full relative"
                    style={{
                      background: `conic-gradient(from 0deg, 
                        #6366f1 0deg 60deg, 
                        #4f46e5 60deg 120deg, 
                        #818cf8 120deg 180deg, 
                        #3730a3 180deg 240deg, 
                        #4338ca 240deg 300deg, 
                        #4f46e5 300deg 360deg)`
                    }}
                  >
                    {WELCOME_PRIZES.map((prize, idx) => {
                      const angle = idx * 60 + 30; // Center of wedge
                      return (
                        <div
                          key={idx}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-black text-[9px] tracking-wider select-none"
                          style={{
                            transform: `rotate(${angle}deg) translate(0, -75px)`
                          }}
                        >
                          {isRtl ? prize.textAr : prize.text}
                        </div>
                      );
                    })}
                  </motion.div>
                  
                  {/* Center Pin */}
                  <div className="absolute w-10 h-10 rounded-full bg-slate-950 border-4 border-white dark:border-slate-800 shadow-lg flex items-center justify-center z-10">
                    <Sparkles size={14} className="text-yellow-400 animate-pulse" />
                  </div>

                  {/* Top Pointer Indicator */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[16px] border-t-red-500 z-20 drop-shadow-md" />
                </div>
              </div>

              {/* Action / Results */}
              <div className="space-y-4">
                {wonPrize ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl"
                  >
                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider block">
                      🎉 {isRtl ? "مبروك! لقد فزت بـ" : "Félicitations ! Vous avez gagné"}
                    </span>
                    <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">
                      {isRtl ? wonPrize.textAr : wonPrize.text}
                    </h4>

                    {/* Copy Promo Code input */}
                    {promoCode && (
                      <div className="flex gap-2 items-center bg-white dark:bg-slate-950 p-2 rounded-xl border">
                        <span className="flex-1 font-mono font-black text-sm text-indigo-500 tracking-widest text-center select-all">
                          {promoCode}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(promoCode);
                            setCopiedCode(true);
                            toast.success(isRtl ? "تم نسخ كود الخصم!" : "Code promo copié !");
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-slate-650 rounded-lg cursor-pointer"
                        >
                          {copiedCode ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 font-bold leading-normal mt-2">
                      {isRtl 
                        ? "* هذا الكود صالح لمدة 7 أيام وصالح للاستخدام مرة واحدة فقط عند إتمام الطلب."
                        : "* Code à usage unique, valable pendant 7 jours lors de votre commande."}
                    </p>
                  </motion.div>
                ) : (
                  <button
                    onClick={handleSpin}
                    disabled={isSpinning}
                    className="w-full py-4 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-transform cursor-pointer"
                  >
                    {isSpinning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isRtl ? "جاري تدوير العجلة..." : "Rotation..."}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{isRtl ? "العب الآن مجاناً!" : "Lancer le Spin !"}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
