"use client";

import { useAppStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import { Sparkles, ImageIcon, Wand2, Sliders, CheckCircle, X, Trash2, Type, Palette, Plus, Loader2, Box } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
const ThreeDPreview = dynamic(() => import("@/components/ThreeDPreview"), { ssr: false });
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { loadOptionalFonts } from "@/lib/fonts";

export default function AIStudioPage() {
  const { language, addToCart } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isThreeDPreviewOpen, setIsThreeDPreviewOpen] = useState(false);
  const [threeDModelType, setThreeDModelType] = useState<'mug' | 'tshirt' | 'box' | 'poster'>('mug');
  const [selectedStyle, setSelectedStyle] = useState('pro');
  const [errorMsg, setErrorMsg] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedProvider, setGeneratedProvider] = useState<string | null>(null);

  interface DesignHistoryItem {
    id: string;
    prompt: string;
    imageUrl: string;
    timestamp: number;
  }

  interface TextLayer {
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    fontFamily: string;
    fontWeight: string;
    rotation?: number;
    textShadowColor?: string;
    textShadowBlur?: number;
    backgroundColor?: string;
  }

  // --- States for Customizer ---
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [showPreflight, setShowPreflight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [designHistory, setDesignHistory] = useState<DesignHistoryItem[]>([]);

  // --- Advanced Image Filters ---
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [grayscale, setGrayscale] = useState(0);
  const [blur, setBlur] = useState(0);

  // --- Logo Overlay States ---
  const [logoOverlay, setLogoOverlay] = useState<string | null>(null);
  const [logoX, setLogoX] = useState(50); // percentage x
  const [logoY, setLogoY] = useState(50); // percentage y
  const [logoScale, setLogoScale] = useState(25); // percentage scale
  const [logoRotation, setLogoRotation] = useState(0);
  const [selectedOverlayType, setSelectedOverlayType] = useState<'text' | 'logo' | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // --- 3D Model Base Color ---
  const [modelColor, setModelColor] = useState("#ffffff");

  // --- Sidebar Tab ---
  const [customizerTab, setCustomizerTab] = useState<'text' | 'logo' | 'filters' | 'product'>('text');

  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: `layer-${Date.now()}`,
      text: isRtl ? "نص جديد" : "Nouveau texte",
      x: 50,
      y: 50,
      fontSize: 24,
      color: "#ffffff",
      fontFamily: "Cairo",
      fontWeight: "900",
      rotation: 0,
      textShadowColor: "#000000",
      textShadowBlur: 4,
      backgroundColor: "transparent",
    };
    setTextLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setSelectedOverlayType('text');
  };

  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent, layerId: string) => {
    e.preventDefault();
    setSelectedLayerId(layerId);
    setSelectedOverlayType('text');
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      let relativeX = ((currentX - rect.left) / rect.width) * 100;
      let relativeY = ((currentY - rect.top) / rect.height) * 100;
      
      relativeX = Math.max(0, Math.min(100, relativeX));
      relativeY = Math.max(0, Math.min(100, relativeY));
      
      setTextLayers(prev => prev.map(layer => 
        layer.id === layerId ? { ...layer, x: relativeX, y: relativeY } : layer
      ));
    };
    
    const handleEnd = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
  };

  const handleStartDragLogo = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setSelectedLayerId(null);
    setSelectedOverlayType('logo');
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      let relativeX = ((currentX - rect.left) / rect.width) * 100;
      let relativeY = ((currentY - rect.top) / rect.height) * 100;
      
      relativeX = Math.max(0, Math.min(100, relativeX));
      relativeY = Math.max(0, Math.min(100, relativeY));
      
      setLogoX(relativeX);
      setLogoY(relativeY);
    };
    
    const handleEnd = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoOverlay(event.target.result as string);
        setSelectedOverlayType('logo');
        setSelectedLayerId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustomizedImage = async () => {
    const element = containerRef.current;
    if (!element) return;
    
    setIsSavingCustom(true);
    try {
      const canvas = await (await import("html2canvas")).default(element, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2,
      });
      
      const dataUrl = canvas.toDataURL("image/png");
      
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: dataUrl }),
      });
      
      const data = await res.json();
      if (data.success && data.url) {
        toast.success(isRtl ? "تم حفظ تصميمك المخصص!" : "Design personnalisé sauvegardé !");
        
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        
        const customProduct = {
          id: `ai-custom-${Date.now()}`,
          name: isRtl ? `تصميم مخصص: ${prompt.substring(0, 15)}...` : `Design Custom: ${prompt.substring(0, 15)}...`,
          price: 3000,
          image: data.url,
          category: "AI Customizer",
          quantity: 1,
          selectedOptions: { 
            type: "AI Customized", 
            prompt, 
            layersCount: textLayers.length, 
            hasLogo: !!logoOverlay,
            modelColor 
          }
        };
        
        addToCart(customProduct);
        setIsCustomizerOpen(false);
        router.push("/cart");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(isRtl ? "فشل حفظ وتصدير التصميم" : "Échec de l'exportation du design");
    } finally {
      setIsSavingCustom(false);
    }
  };

  const selectedLayer = textLayers.find(l => l.id === selectedLayerId);

  useEffect(() => {
    setMounted(true);
    loadOptionalFonts();
    try {
      const saved = localStorage.getItem('ai-studio-history');
      if (saved) {
        const parsed: DesignHistoryItem[] = JSON.parse(saved);
        setDesignHistory(parsed.slice(0, 5));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (designHistory.length > 0) {
      localStorage.setItem('ai-studio-history', JSON.stringify(designHistory.slice(0, 5)));
    }
  }, [designHistory]);

  const deleteHistoryItem = (id: string) => {
    setDesignHistory(prev => prev.filter(item => item.id !== id));
    if (designHistory.length <= 1) {
      localStorage.removeItem('ai-studio-history');
    }
  };

  if (!mounted) return null;

  const t = TRANSLATIONS[language];
  const isRtl = language === "ar";

  const promptTemplates = isRtl ? [
    {
      title: "💳 بطاقة عمل فاخرة",
      prompt: "بطاقة عمل لمهندس معماري، باللونين الأسود الكربوني والذهبي المطفي، تصميم ناعم وبسيط وشعار هندسي أنيق، دقة 8k"
    },
    {
      title: "🍔 قائمة طعام مطعم",
      prompt: "قائمة طعام لمطعم برجر عصري، خلفية خشبية داكنة، خطوط نيون برتقالية وبيضاء، مظهر شهي وراقٍ، جودة تصوير عالية"
    },
    {
      title: "🏷️ ملصق منتج فاخر",
      prompt: "تصميم ملصق لزجاجة عطر، أسلوب مينيوماليست فرنسي، لمسات من أوراق الشجر الخضراء والخطوط الذهبية الرفيعة"
    },
    {
      title: "📣 فلاير إعلاني",
      prompt: "منشور إعلاني لافتتاح صالون حلاقة رجالي كلاسيكي، ألوان أحمر وأزرق داكن، أسلوب ريترو عتيق مع أيقونات مقصات وشفرات"
    }
  ] : [
    {
      title: "💳 Carte de Visite Luxe",
      prompt: "Carte de visite pour architecte, couleurs noir carbone et or mat, design minimaliste fluide, logo géométrique élégant, 8k"
    },
    {
      title: "🍔 Menu Restaurant",
      prompt: "Menu pour restaurant de burgers moderne, fond bois sombre, écritures néon orange et blanc, look gourmet et premium"
    },
    {
      title: "🏷️ Étiquette Produit",
      prompt: "Design d'étiquette pour bouteille de parfum, style minimaliste français, touches de feuilles vertes et lignes fines dorées"
    },
    {
      title: "📣 Flyer Publicitaire",
      prompt: "Flyer pour ouverture d'un barber shop rétro classique, couleurs rouge et bleu marine, style vintage avec icônes de ciseaux"
    }
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setGeneratedImage(null);
    setErrorMsg("");
    setGeneratedProvider(null);
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style: selectedStyle }),
      });

      if (!response.ok) {
        const text = await response.text();
        let message = text || `HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) message = parsed.error;
        } catch {
          // plain-text error (rate limit / CSRF) — keep raw text
        }
        if (response.status === 429) {
          throw new Error(isRtl
            ? "طلبات كثيرة جداً. انتظر قليلاً ثم أعد المحاولة."
            : "Trop de requêtes. Attendez un instant puis réessayez.");
        }
        throw new Error(message);
      }

      const data = await response.json();
      
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setGeneratedProvider(data.providerLabel || null);
        if (data.fallback && data.provider === 'pollinations') {
          setErrorMsg(isRtl
            ? "تم التوليد عبر مزوّد مجاني (Pollinations). أضف TOGETHER_API_KEY لتوليد FLUX.1 بجودة أعلى."
            : "Généré via le fournisseur gratuit (Pollinations). Ajoutez TOGETHER_API_KEY pour une qualité FLUX.1 supérieure.");
        }
        const newItem: DesignHistoryItem = {
          id: `design-${Date.now()}`,
          prompt,
          imageUrl: data.imageUrl,
          timestamp: Date.now(),
        };
        setDesignHistory(prev => [newItem, ...prev].slice(0, 5));
        toast.success(isRtl ? "تم توليد التصميم بنجاح!" : "Design généré avec succès !");
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(isRtl ? "حدث خطأ أثناء التوليد. يرجى المحاولة لاحقاً." : "Erreur lors de la génération. Veuillez réessayer.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/marketing/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Améliore et détaille cette description de design pour une agence d'impression professionnelle. Ajoute des détails sur les couleurs, la typographie, la mise en page et le style. Réponds uniquement avec la description améliorée en français:\n\n${prompt}`
        }),
      });
      const data = await res.json();
      if (data.insight) {
        setPrompt(data.insight.replace(/^["']|["']$/g, ''));
        toast.success(isRtl ? 'تم تحسين الوصف بنجاح!' : 'Description améliorée avec succès !');
      } else {
        throw new Error(data.error || 'No insight returned');
      }
    } catch {
      toast.error(isRtl ? 'فشل تحسين الوصف. حاول مرة أخرى.' : 'Échec de l\'amélioration. Réessayez.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const copyPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success(isRtl ? 'تم نسخ الوصف!' : 'Description copiée !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(isRtl ? 'فشل النسخ' : 'Échec de la copie');
    }
  };

  const handleApplyToCart = () => {
    if (!generatedImage) return;
    
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      const customProduct = {
        id: `ai-${Date.now()}`,
        name: isRtl ? `تصميم ذكي: ${prompt.substring(0, 15)}...` : `Design IA: ${prompt.substring(0, 15)}...`,
        price: 2500,
        image: generatedImage,
        category: "AI Custom",
        quantity: 1,
        selectedOptions: { type: "AI Generated", prompt: prompt, style: selectedStyle, modelColor }
      };
      
      addToCart(customProduct);
      router.push("/cart");
    }, 800);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const premiumColors = [
    { name: isRtl ? "أبيض ناصع" : "Blanc", hex: "#ffffff" },
    { name: isRtl ? "أسود مطفي" : "Noir Mat", hex: "#1e1e1e" },
    { name: isRtl ? "أزرق ملكي" : "Bleu Royal", hex: "#1e40af" },
    { name: isRtl ? "أحمر روبي" : "Rouge", hex: "#b91c1c" },
    { name: isRtl ? "أخضر غابات" : "Vert", hex: "#065f46" },
    { name: isRtl ? "ذهبي معدني" : "Or", hex: "#d97706" }
  ];

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className={`pb-24 max-w-6xl mx-auto ${isRtl ? 'text-right' : 'text-left'}`} 
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <motion.div variants={itemVariants} className="flex flex-col items-center text-center mb-10">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 text-white mb-4 shadow-xl shadow-blue-500/30"
        >
          <Sparkles size={32} />
        </motion.div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">
          {isRtl ? 'المولد الذكي للتصميمات' : 'Studio de Génération IA'}
        </h1>
        <p className="text-slate-500 max-w-lg font-medium">
          {isRtl 
            ? 'صف فكرتك وسيقوم الذكاء الاصطناعي بتحويلها إلى تصميم احترافي جاهز للطباعة فوراً.' 
            : 'Décrivez votre idée et l\'IA la transformera en un design professionnel prêt à imprimer.'}
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8 items-stretch h-full">
        {/* Input Controls */}
        <motion.div variants={itemVariants} className="flex-1 premium-glass p-8 rounded-[2.5rem] shadow-xl border border-white/40 dark:border-slate-800">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                {isRtl ? '💡 أفكار سريعة للإلهام (انقر للاستخدام)' : '💡 Inspirations rapides (cliquez pour insérer)'}
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {promptTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(template.prompt)}
                    className="px-3 py-2 rounded-xl text-[10px] font-bold bg-white/70 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-500 hover:text-purple-500 whitespace-nowrap transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer"
                  >
                    {template.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
                {isRtl ? 'وصف التصميم (Prompt)' : 'Description (Prompt)'}
              </label>
              <textarea 
                value={prompt} 
                onChange={(e)=>setPrompt(e.target.value)} 
                placeholder={isRtl ? "مثال: بطاقة عمل لشركة عقارات باللونين الأزرق والذهبي مع شعار عصري..." : "Ex: Carte de visite pour agence immobilière en bleu et or..."}
                rows={4} 
                className="w-full p-4 bg-white/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-purple-500 transition shadow-inner resize-none font-medium placeholder:text-slate-400 text-slate-800 dark:text-white"
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                {isRtl ? '🎨 أنماط سريعة (انقر للإضافة)' : '🎨 Styles rapides (cliquez pour ajouter)'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: isRtl ? 'أنيق وبسيط' : 'Minimaliste élégant', color: '#e2e8f0', desc: isRtl ? 'تصميم أنيق وبسيط بألوان هادئة وخطوط نظيفة ومساحة بيضاء واسعة' : 'Design minimaliste élégant aux couleurs douces, typographie sobre et grand espace négatif' },
                  { label: isRtl ? 'حديث ملون' : 'Moderne coloré', color: '#8b5cf6', desc: isRtl ? 'تصميم حديث بألوان جريئة ونابضة بالحياة مع تدرجات وتأثيرات زاهية' : 'Design moderne aux couleurs vives et audacieuses avec dégradés et effets dynamiques' },
                  { label: isRtl ? 'فاخر وذهبي' : 'Luxe et doré', color: '#d97706', desc: isRtl ? 'تصميم فاخر بلمسات ذهبية معدنية وألوان داكنة وأنيقة مع خطوط زخرفية' : 'Design luxueux aux accents dorés métalliques, tons foncés élégants et ornements raffinés' },
                  { label: isRtl ? 'مهني جاد' : 'Professionnel sobre', color: '#1e293b', desc: isRtl ? 'تصميم مهني جاد بألوان محايدة وخطوط مرتبة تناسب الشركات والمؤسسات' : 'Design professionnel sobre aux tons neutres, mise en page structurée pour entreprises' },
                ].map((card, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(prev => (prev ? `${prev}. ${card.desc}` : card.desc))}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/70 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 hover:border-purple-500 hover:shadow-md transition-all active:scale-95 cursor-pointer group"
                  >
                    <span className="w-6 h-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: card.color }} />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-purple-600 text-center leading-tight">
                      {card.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-2">
                <Sliders size={16} className="text-purple-500" />
                {isRtl ? 'النمط الفني' : 'Style Artistique'}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {id: 'pro', label: isRtl ? 'احترافي' : 'Pro'}, 
                  {id: 'creative', label: isRtl ? 'إبداعي' : 'Créatif'}, 
                  {id: 'minimal', label: isRtl ? 'بسيط' : 'Minimal'}
                ].map(style => (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={style.id} 
                    type="button" 
                    onClick={() => setSelectedStyle(style.id)}
                    className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                      selectedStyle === style.id 
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md' 
                        : 'bg-white/50 dark:bg-slate-800 text-slate-655 dark:text-slate-350 border-slate-200 dark:border-slate-700 hover:bg-white/80 dark:hover:bg-slate-700'
                    }`}
                  >
                    {style.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={!prompt.trim() || isGenerating} 
                className="flex-1 bg-slate-900/90 dark:bg-accent text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 transition flex justify-center items-center gap-3 disabled:opacity-50"
              >
                {isGenerating ? (
                  <><Loader2 className="animate-spin" size={20}/> {isRtl ? 'جاري صنع السحر...' : 'Génération en cours...'}</>
                ) : (
                  <><Wand2 size={20}/> {isRtl ? 'توليد التصميم' : 'Générer le Design'}</>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleEnhancePrompt}
                disabled={!prompt.trim() || isEnhancing}
                className="flex-[0.45] bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-purple-500/20 transition flex justify-center items-center gap-2 disabled:opacity-50 border border-white/10"
              >
                {isEnhancing ? (
                  <><Loader2 className="animate-spin" size={18}/> {isRtl ? 'تحسين...' : 'Amélioration...'}</>
                ) : (
                  <><Sparkles size={18}/> {isRtl ? 'تحسين الوصف' : 'Améliorer le Prompt'}</>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Results Presentation */}
        <motion.div variants={itemVariants} className="flex-1 bg-slate-900 rounded-[2.5rem] relative flex items-center justify-center p-8 overflow-hidden min-h-[400px] border border-slate-800 shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-[128px] opacity-30 pointer-events-none"></div>
          
          {errorMsg && (
            <div className="absolute top-4 left-4 right-4 bg-orange-500/85 backdrop-blur text-white text-xs font-bold p-3 rounded-xl z-20 text-center">
              {errorMsg}
            </div>
          )}

          <AnimatePresence mode="wait">
            {generatedImage ? (
              <motion.div 
                key="image"
                initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full flex flex-col items-center gap-6"
              >
                <div className="relative group w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 bg-black">
                  <motion.img 
                    src={generatedImage} 
                    alt="AI Generated" 
                    className="w-full h-full object-cover"
                    transition={{ duration: 0.4 }}
                  />
                  {/* Hover controls on large screens */}
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center p-6 gap-4">
                    <div className="flex gap-4">
                      <button 
                        onClick={handleApplyToCart} 
                        className="bg-emerald-600/90 backdrop-blur-md hover:bg-emerald-650 text-white px-5 py-3 rounded-xl font-black text-xs shadow-lg flex items-center gap-1.5 border border-emerald-450 active:scale-95 transition-all"
                      >
                        <CheckCircle size={14}/> {isRtl ? 'طلب طباعة مباشر' : 'Commander direct'}
                      </button>
                      <button 
                        onClick={() => {
                          setTextLayers([]);
                          setLogoOverlay(null);
                          setBrightness(100);
                          setContrast(100);
                          setSaturation(100);
                          setGrayscale(0);
                          setBlur(0);
                          setIsCustomizerOpen(true);
                        }} 
                        className="bg-purple-600/90 backdrop-blur-md hover:bg-purple-650 text-white px-5 py-3 rounded-xl font-black text-xs shadow-lg flex items-center gap-1.5 border border-purple-450 active:scale-95 transition-all"
                      >
                        <Sparkles size={14}/> {isRtl ? 'تخصيص متقدم' : 'Personnaliser'}
                      </button>
                      <button 
                        onClick={copyPromptToClipboard} 
                        className={`backdrop-blur-md text-white px-5 py-3 rounded-xl font-black text-xs shadow-lg flex items-center gap-1.5 border active:scale-95 transition-all ${
                          copied 
                            ? 'bg-emerald-500/90 border-emerald-400' 
                            : 'bg-slate-600/80 hover:bg-slate-500/80 border-slate-500'
                        }`}
                      >
                        {copied ? <><CheckCircle size={14}/> {isRtl ? 'تم النسخ!' : 'Copié !'}</> : <><Type size={14}/> {isRtl ? 'نسخ الوصف' : 'Copier le prompt'}</>}
                      </button>
                    </div>
                    <button 
                      onClick={() => setIsThreeDPreviewOpen(true)} 
                      className="w-[80%] max-w-[280px] bg-blue-600/90 backdrop-blur-md hover:bg-blue-650 text-white py-3 rounded-xl font-black text-xs shadow-lg flex items-center justify-center gap-1.5 border border-blue-450 active:scale-95 transition-all"
                    >
                      <Box size={14}/> {isRtl ? 'معاينة ثلاثية الأبعاد تفاعلية' : 'Aperçu 3D interactif'}
                    </button>
                  </div>
                </div>

                {/* Always visible mobile-friendly controls */}
                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center md:hidden">
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={handleApplyToCart} 
                      className="flex-1 bg-emerald-600 text-white py-3.5 px-4 rounded-xl font-black text-xs flex justify-center items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <CheckCircle size={14}/> {isRtl ? 'طلب طباعة' : 'Commander'}
                    </button>
                    <button 
                      onClick={() => {
                        setTextLayers([]);
                        setLogoOverlay(null);
                        setBrightness(100);
                        setContrast(100);
                        setSaturation(100);
                        setGrayscale(0);
                        setBlur(0);
                        setIsCustomizerOpen(true);
                      }} 
                      className="flex-1 bg-purple-600 text-white py-3.5 px-4 rounded-xl font-black text-xs flex justify-center items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Sparkles size={14}/> {isRtl ? 'تخصيص' : 'Personnaliser'}
                    </button>
                    <button 
                      onClick={copyPromptToClipboard} 
                      className={`flex-1 text-white py-3.5 px-4 rounded-xl font-black text-xs flex justify-center items-center gap-1.5 active:scale-95 transition-all ${
                        copied ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    >
                      {copied ? <><CheckCircle size={14}/> {isRtl ? 'تم النسخ' : 'Copié'}</> : <><Type size={14}/> {isRtl ? 'نسخ' : 'Copier'}</>}
                    </button>
                  </div>
                  <button 
                    onClick={() => setIsThreeDPreviewOpen(true)} 
                    className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-xl font-black text-xs flex justify-center items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Box size={14}/> {isRtl ? 'معاينة ثلاثية الأبعاد' : 'Aperçu 3D'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center text-slate-400 relative z-10"
              >
                <motion.div 
                  animate={isGenerating ? { scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner backdrop-blur-sm"
                >
                  {isGenerating ? <Wand2 size={40} className="text-purple-400 animate-pulse"/> : <ImageIcon size={40} className="opacity-55 text-purple-300"/>}
                </motion.div>
                <p className="font-bold text-sm text-slate-300">
                  {isGenerating 
                    ? (isRtl ? 'الذكاء الاصطناعي يصنع سحر التصميم...' : 'L\'IA dessine maintenant...') 
                    : (isRtl ? 'النتيجة ستظهر هنا' : 'Le résultat apparaîtra ici')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* 📁 Design History */}
      {designHistory.length > 0 && (
        <motion.div variants={itemVariants} className="mt-10 premium-glass p-6 rounded-[2.5rem] shadow-xl border border-white/40 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ImageIcon size={18} className="text-purple-500" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isRtl ? 'تصاميمي' : 'Mes Créations'}
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {designHistory.length}/5
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setDesignHistory([]);
                localStorage.removeItem('ai-studio-history');
                toast.success(isRtl ? 'تم مسح السجل' : 'Historique effacé');
              }}
              className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} />
              {isRtl ? 'مسح الكل' : 'Tout effacer'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {designHistory.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"
              >
                <button
                  type="button"
                  onClick={() => {
                    setPrompt(item.prompt);
                    setGeneratedImage(item.imageUrl);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full aspect-[4/3] overflow-hidden block"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-[9px] font-bold text-white truncate w-full">
                      {item.prompt.substring(0, 40)}...
                    </span>
                  </div>
                </button>
                <div className="flex items-center justify-between px-2 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <span className="text-[9px] text-slate-400 font-medium">
                    {new Date(item.timestamp).toLocaleDateString(isRtl ? 'ar' : 'fr', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDesignHistory(prev => prev.filter(h => h.id !== item.id));
                      if (designHistory.length <= 1) localStorage.removeItem('ai-studio-history');
                    }}
                    className="text-red-400 hover:text-red-600 transition-colors p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 🎨 Customizer Overlay */}
      <AnimatePresence>
        {isCustomizerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-2 md:p-8 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col my-auto max-h-[95vh]"
            >
              {/* Customizer Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="text-purple-500" size={20}/>
                    {isRtl ? "محرر التخصيص والمؤثرات المتقدم" : "Éditeur de Personnalisation Avancé"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isRtl ? "أضف نصوصاً وشعارات، عدل ألوان المنتج ومؤثرات الصورة بدقة" : "Ajoutez du texte, des logos, ajustez les filtres et couleurs du produit"}
                  </p>
                </div>
                <button 
                  onClick={() => setIsCustomizerOpen(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                >
                  <X size={20}/>
                </button>
              </div>

              {/* Customizer Body */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                {/* Canvas Workspace Area */}
                <div className="flex-[3] bg-slate-100 dark:bg-slate-950 p-6 flex items-center justify-center overflow-auto min-h-[320px] relative">
                  
                  {/* Floating Preflight controls */}
                  <div className="absolute top-4 left-4 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-lg flex items-center gap-3">
                     <span className="text-xs font-black text-slate-850 dark:text-slate-200">
                       {isRtl ? "أبعاد الطباعة الآمنة والقص :" : "Marges de sécurité :"}
                     </span>
                     <button
                       type="button"
                       onClick={() => setShowPreflight(!showPreflight)}
                       className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                         showPreflight 
                           ? "bg-purple-600 text-white shadow-md shadow-purple-500/30" 
                           : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                       }`}
                     >
                       {showPreflight ? (isRtl ? "مفعّل" : "Actif") : (isRtl ? "معطل" : "Inactif")}
                     </button>
                     
                     {/* Educational Helper Icon */}
                     <div className="relative group">
                       <button 
                         type="button" 
                         className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                         title="طريقة عمل أبعاد الطباعة"
                       >
                         ?
                       </button>
                       <div className="absolute top-8 left-1/2 -translate-x-1/2 w-64 p-4 rounded-xl bg-slate-950 text-white text-[10px] leading-relaxed border border-slate-800 shadow-2xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all z-40">
                         <div className="font-black text-purple-400 uppercase tracking-wider mb-1.5">{isRtl ? "دليل أبعاد الطباعة الاحترافية :" : "Guide des marges de sécurité :"}</div>
                         <ul className="space-y-1.5 text-slate-300 list-none p-0">
                           <li className="flex gap-1.5"><span className="text-red-500">🔴</span> {isRtl ? "الخط الأحمر (Bleed): مدّ خلفية تصميمك هنا لتجنب حواف بيضاء غير مرغوبة بعد القطع." : "Ligne Rouge (Bleed): Étendez le fond de votre design ici pour éviter des contours blancs."}</li>
                           <li className="flex gap-1.5"><span className="text-blue-500">🔵</span> {isRtl ? "الخط الأزرق (Trim): خط القطع الفعلي حيث تقوم المقصلة بقص الورقة." : "Ligne Bleue (Trim): La ligne de coupe finale par la guillotine industrielle."}</li>
                           <li className="flex gap-1.5"><span className="text-emerald-500">🟢</span> {isRtl ? "الخط الأخضر (Safe): ضع جميع النصوص والرموز الهامة داخله لكي لا تتعرض للقطع العرضي." : "Ligne Verte (Safe): Gardez textes et logos importants à l'intérieur pour éviter la coupe."}</li>
                         </ul>
                       </div>
                     </div>
                   </div>

                  <div 
                    ref={containerRef}
                    className="relative w-full max-w-[480px] aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-350 dark:border-slate-800 select-none"
                  >
                    {generatedProvider && (
                      <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur rounded-full text-[10px] font-black text-white border border-white/20">
                        <Sparkles size={10} className="text-purple-400" />
                        {generatedProvider}
                      </div>
                    )}

                    {generatedImage && (
                      <img 
                        src={generatedImage} 
                        alt="Canvas BG" 
                        loading="lazy" decoding="async"
                        className="w-full h-full object-cover pointer-events-none select-none"
                        style={{
                          filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) blur(${blur}px)`
                        }}
                        crossOrigin="anonymous"
                      />
                    )}

                    {/* Logo Overlay Layer */}
                    {logoOverlay && (
                      <div
                        onMouseDown={handleStartDragLogo}
                        onTouchStart={handleStartDragLogo}
                        style={{
                          position: 'absolute',
                          left: `${logoX}%`,
                          top: `${logoY}%`,
                          width: `${logoScale}%`,
                          transform: `translate(-50%, -50%) rotate(${logoRotation}deg)`,
                          cursor: 'move',
                          userSelect: 'none',
                          border: selectedOverlayType === 'logo' ? '2px dashed #a855f7' : '1px dashed transparent',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        className={selectedOverlayType === 'logo' ? 'bg-purple-500/10' : ''}
                      >
                        <img 
                          src={logoOverlay} 
                          alt="Logo Overlay" 
                          loading="lazy" decoding="async"
                          className="w-full h-auto pointer-events-none select-none object-contain"
                        />
                      </div>
                    )}
                    
                    {/* Text layers */}
                    {textLayers.map((layer) => (
                      <div
                        key={layer.id}
                        onMouseDown={(e) => handleStartDrag(e, layer.id)}
                        onTouchStart={(e) => handleStartDrag(e, layer.id)}
                        style={{
                          position: 'absolute',
                          left: `${layer.x}%`,
                          top: `${layer.y}%`,
                          fontSize: `${layer.fontSize}px`,
                          color: layer.color,
                          fontFamily: layer.fontFamily,
                          fontWeight: layer.fontWeight,
                          transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
                          cursor: 'move',
                          userSelect: 'none',
                          whiteSpace: 'nowrap',
                          border: selectedLayerId === layer.id ? '2px dashed #a855f7' : '1px dashed transparent',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: layer.backgroundColor || 'transparent',
                          textShadow: layer.textShadowColor ? `0 0 ${layer.textShadowBlur || 4}px ${layer.textShadowColor}` : 'none',
                        }}
                        className={`absolute select-none font-bold ${
                          selectedLayerId === layer.id ? 'bg-black/20 backdrop-blur-[2px]' : ''
                        }`}
                      >
                        {layer.text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sidebar controls (Tabbed menu) */}
                <div className="flex-[2] border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 p-6 flex flex-col overflow-y-auto min-h-0 bg-slate-50 dark:bg-slate-900/40">
                  
                  {/* Category Tabs */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 gap-1.5 overflow-x-auto scrollbar-none">
                    {[
                      { id: 'text', label: isRtl ? "النصوص" : "Textes", icon: <Type size={14}/> },
                      { id: 'logo', label: isRtl ? "الشعار" : "Logos", icon: <ImageIcon size={14}/> },
                      { id: 'filters', label: isRtl ? "الفلاتر" : "Filtres", icon: <Sliders size={14}/> },
                      { id: 'product', label: isRtl ? "المنتج" : "Produit", icon: <Box size={14}/> }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setCustomizerTab(tab.id as any)}
                        className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition-all ${
                          customizerTab === tab.id 
                            ? 'bg-purple-600 text-white shadow-md' 
                            : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 space-y-6">
                    {/* TEXT TAB CONTROLS */}
                    {customizerTab === 'text' && (
                      <div className="space-y-6">
                        <button
                          onClick={addTextLayer}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                          <Plus size={16}/> {isRtl ? "إضافة نص جديد" : "Ajouter du texte"}
                        </button>

                        {selectedLayer ? (
                          <div className="space-y-5 animate-fadeIn">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-850">
                              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{isRtl ? "تخصيص النص المحدد" : "Propriétés du texte"}</span>
                              <button 
                                onClick={() => {
                                  setTextLayers(prev => prev.filter(l => l.id !== selectedLayerId));
                                  setSelectedLayerId(null);
                                }}
                                className="text-red-500 hover:text-red-600 text-xs font-bold flex items-center gap-1 bg-red-100/50 dark:bg-red-950/20 px-2.5 py-1.5 rounded-lg transition-colors"
                              >
                                <Trash2 size={14}/> {isRtl ? "حذف" : "Supprimer"}
                              </button>
                            </div>

                            {/* Text content input */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500">{isRtl ? "محتوى النص" : "Contenu"}</label>
                              <input
                                type="text"
                                value={selectedLayer.text}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTextLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, text: val } : l));
                                }}
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 text-sm font-bold text-slate-800 dark:text-white"
                              />
                            </div>

                            {/* Font Size slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500">{isRtl ? "حجم الخط" : "Taille"}</label>
                                <span className="text-xs font-black text-purple-600">{selectedLayer.fontSize}px</span>
                              </div>
                              <input
                                type="range"
                                min="12"
                                max="80"
                                value={selectedLayer.fontSize}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setTextLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, fontSize: val } : l));
                                }}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                              />
                            </div>

                            {/* Text Rotation slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500">{isRtl ? "زاوية الدوران" : "Délai de Rotation"}</label>
                                <span className="text-xs font-black text-purple-600">{selectedLayer.rotation || 0}°</span>
                              </div>
                              <input
                                type="range"
                                min="-180"
                                max="180"
                                value={selectedLayer.rotation || 0}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setTextLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, rotation: val } : l));
                                }}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                              />
                            </div>

                            {/* Font family selection */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500">{isRtl ? "نوع الخط المتميز" : "Style de police"}</label>
                              <select
                                value={selectedLayer.fontFamily}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTextLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, fontFamily: val } : l));
                                }}
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 text-sm font-bold text-slate-800 dark:text-white"
                              >
                                <option value="Cairo">Cairo (عربي احترافي)</option>
                                <option value="Tajawal">Tajawal (عربي عصري)</option>
                                <option value="Amiri">Amiri (عربي كلاسيكي فخم)</option>
                                <option value="Outfit">Outfit (Moderne)</option>
                                <option value="Inter">Inter (Minimaliste)</option>
                                <option value="Montserrat">Montserrat (Gros Titres)</option>
                                <option value="Playfair Display">Playfair (Luxe)</option>
                              </select>
                            </div>

                            {/* Font Weight */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500">{isRtl ? "وزن الخط" : "Graisse de Police"}</label>
                              <div className="grid grid-cols-3 gap-2">
                                {['400', '700', '900'].map(weight => (
                                  <button
                                    key={weight}
                                    type="button"
                                    onClick={() => {
                                      setTextLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, fontWeight: weight } : l));
                                    }}
                                    className={`py-2 rounded-xl text-[10px] font-bold border transition-colors ${
                                      selectedLayer.fontWeight === weight 
                                        ? 'bg-purple-600 text-white border-purple-500' 
                                        : 'bg-white dark:bg-slate-800 text-slate-650 border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {weight === '400' ? (isRtl ? 'عادي' : 'Normal') : weight === '700' ? (isRtl ? 'عريض' : 'Gras') : (isRtl ? 'ضخم' : 'Super Black')}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Colors and Highlight background */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                  <Palette size={12}/> {isRtl ? "لون النص" : "Couleur"}
                                </label>
                                <input
                                  type="color"
                                  value={selectedLayer.color}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTextLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, color: val } : l));
                                  }}
                                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer overflow-hidden p-0 bg-transparent"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                  <Palette size={12}/> {isRtl ? "لون الخلفية" : "Surlignage"}
                                </label>
                                <input
                                  type="color"
                                  value={selectedLayer.backgroundColor === 'transparent' ? '#ffffff' : selectedLayer.backgroundColor}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTextLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, backgroundColor: val } : l));
                                  }}
                                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer overflow-hidden p-0 bg-transparent"
                                />
                                <button 
                                  onClick={() => {
                                    setTextLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, backgroundColor: 'transparent' } : l));
                                  }}
                                  className="text-[10px] font-bold text-slate-400 hover:text-red-500 block text-center"
                                >
                                  {isRtl ? "إلغاء الخلفية" : "Transparente"}
                                </button>
                              </div>
                            </div>

                            {/* Text Shadow */}
                            <div className="space-y-2 pt-2">
                              <label className="text-xs font-bold text-slate-500">{isRtl ? "تأثير الظل للنص" : "Effet d'Ombre"}</label>
                              <div className="flex gap-3 items-center">
                                <input
                                  type="color"
                                  value={selectedLayer.textShadowColor || '#000000'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTextLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, textShadowColor: val } : l));
                                  }}
                                  className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0 bg-transparent shrink-0"
                                />
                                <div className="flex-1 space-y-1">
                                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                    <span>{isRtl ? "حجم التمويه للظل" : "Flou d'ombre"}</span>
                                    <span>{selectedLayer.textShadowBlur || 4}px</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="20"
                                    value={selectedLayer.textShadowBlur || 4}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setTextLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, textShadowBlur: val } : l));
                                    }}
                                    className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none accent-purple-600"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-slate-400 dark:text-slate-550 flex flex-col items-center">
                            <Type size={32} className="mb-2 opacity-50 text-purple-400 animate-pulse"/>
                            <p className="text-xs font-bold max-w-[220px] leading-relaxed">
                              {isRtl ? "انقر على أي نص موجود في الصورة لتعديل خصائصه أو أضف نصاً جديداً للبدء" : "Sélectionnez un texte sur l'image pour modifier ses options ou créez-en un."}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* LOGO TAB CONTROLS */}
                    {customizerTab === 'logo' && (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                            {isRtl ? "رفع شعارك بصيغة PNG أو JPG" : "Importer un logo / Watermark"}
                          </label>
                          <input 
                            type="file" 
                            ref={logoInputRef}
                            onChange={handleLogoUpload}
                            accept="image/*"
                            className="hidden" 
                          />
                          <button
                            onClick={() => logoInputRef.current?.click()}
                            className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 py-6 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all active:scale-95 shadow-sm"
                          >
                            <Plus size={24} className="text-purple-500"/>
                            {isRtl ? "اختر ملف الشعار من جهازك" : "Sélectionner un fichier"}
                          </button>
                        </div>

                        {logoOverlay ? (
                          <div className="space-y-5 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                              <span className="text-xs font-black text-slate-500">{isRtl ? "تعديل الشعار" : "Options du Logo"}</span>
                              <button 
                                onClick={() => {
                                  setLogoOverlay(null);
                                  setSelectedOverlayType(null);
                                }}
                                className="text-red-500 hover:text-red-600 text-xs font-bold flex items-center gap-1"
                              >
                                <Trash2 size={14}/> {isRtl ? "حذف" : "Retirer"}
                              </button>
                            </div>

                            {/* Preview inside controls */}
                            <div className="flex justify-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <img src={logoOverlay} alt="Logo preview" loading="lazy" decoding="async" className="max-h-20 object-contain rounded" />
                            </div>

                            {/* Logo Scale slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-650 dark:text-slate-350">{isRtl ? "حجم الشعار" : "Taille du Logo"}</label>
                                <span className="text-xs font-black text-purple-600">{logoScale}%</span>
                              </div>
                              <input
                                type="range"
                                min="10"
                                max="90"
                                value={logoScale}
                                onChange={(e) => setLogoScale(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                              />
                            </div>

                            {/* Logo Rotation slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-650 dark:text-slate-350">{isRtl ? "زاوية الدوران" : "Rotation"}</label>
                                <span className="text-xs font-black text-purple-600">{logoRotation}°</span>
                              </div>
                              <input
                                type="range"
                                min="-180"
                                max="180"
                                value={logoRotation}
                                onChange={(e) => setLogoRotation(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                              />
                            </div>

                            <p className="text-[10px] text-slate-400 font-bold text-center leading-relaxed">
                              {isRtl ? "💡 اسحب الشعار مباشرة على لوحة العمل لتغيير مكانه" : "💡 Glissez directement le logo sur l'image pour le positionner."}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center py-10 text-slate-400 dark:text-slate-550 flex flex-col items-center">
                            <ImageIcon size={32} className="mb-2 opacity-50 text-purple-400"/>
                            <p className="text-xs font-bold max-w-[200px] leading-relaxed">
                              {isRtl ? "لم يتم رفع أي شعار بعد. ارفع شعارك بصيغة PNG شفافة للحصول على أفضل مظهر." : "Aucun logo importé. Chargez un logo PNG pour l'appliquer sur le design."}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* IMAGE FILTERS TAB CONTROLS */}
                    {customizerTab === 'filters' && (
                      <div className="space-y-5 animate-fadeIn">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                          {isRtl ? "فلاتر وتحسين الصورة الرقمية" : "Filtres d'image avancés"}
                        </span>

                        {/* Brightness slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
                            <span>{isRtl ? "السطوع" : "Luminosité"}</span>
                            <span className="text-purple-600 font-black">{brightness}%</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="180"
                            value={brightness}
                            onChange={(e) => setBrightness(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Contrast slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
                            <span>{isRtl ? "التباين" : "Contraste"}</span>
                            <span className="text-purple-600 font-black">{contrast}%</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="180"
                            value={contrast}
                            onChange={(e) => setContrast(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Saturation slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
                            <span>{isRtl ? "تشبع الألوان" : "Saturation"}</span>
                            <span className="text-purple-600 font-black">{saturation}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="200"
                            value={saturation}
                            onChange={(e) => setSaturation(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Grayscale slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
                            <span>{isRtl ? "أبيض وأسود" : "Niveaux de gris"}</span>
                            <span className="text-purple-600 font-black">{grayscale}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={grayscale}
                            onChange={(e) => setGrayscale(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Blur slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
                            <span>{isRtl ? "تمويه وضبابية" : "Flou de l'image"}</span>
                            <span className="text-purple-600 font-black">{blur}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={blur}
                            onChange={(e) => setBlur(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Reset button */}
                        <button
                          type="button"
                          onClick={() => {
                            setBrightness(100);
                            setContrast(100);
                            setSaturation(100);
                            setGrayscale(0);
                            setBlur(0);
                          }}
                          className="w-full text-center text-xs font-black text-purple-600 hover:text-purple-700 pt-4"
                        >
                          {isRtl ? "إعادة تعيين الفلاتر الافتراضية" : "Réinitialiser les filtres"}
                        </button>
                      </div>
                    )}

                    {/* PRODUCT STYLE TAB CONTROLS */}
                    {customizerTab === 'product' && (
                      <div className="space-y-5 animate-fadeIn">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-2">
                          {isRtl ? "تخصيص لون ونوع المنتج" : "Modèle et Couleurs 3D"}
                        </span>

                        {/* Model Type tabs */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-650 dark:text-slate-350 block">{isRtl ? "نوع مجسم المعاينة" : "Type de Produit"}</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'mug', label: isRtl ? 'كوب قهوة ☕' : 'Mug' },
                              { id: 'tshirt', label: isRtl ? 'تيشيرت 👕' : 'T-Shirt' },
                              { id: 'box', label: isRtl ? 'علبة كرتون 📦' : 'Boîte' },
                              { id: 'poster', label: isRtl ? 'ملصق حائط 🖼️' : 'Poster' }
                            ].map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setThreeDModelType(item.id as any)}
                                className={`py-2.5 rounded-xl text-xs font-black transition-all border ${
                                  threeDModelType === item.id 
                                    ? 'bg-purple-600 text-white border-purple-500 shadow-md' 
                                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Model Color Customizer */}
                        <div className="space-y-3 pt-2">
                          <label className="text-xs font-bold text-slate-650 dark:text-slate-350 block">{isRtl ? "لون المنتج ثلاثي الأبعاد" : "Couleur du Produit"}</label>
                          <div className="grid grid-cols-3 gap-2">
                            {premiumColors.map((color) => (
                              <button
                                key={color.hex}
                                type="button"
                                onClick={() => setModelColor(color.hex)}
                                className={`py-2 rounded-xl text-[10px] font-black border flex items-center justify-center gap-1.5 transition-colors ${
                                  modelColor === color.hex 
                                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20 text-purple-600' 
                                    : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <span 
                                  className="w-3.5 h-3.5 rounded-full border border-black/10" 
                                  style={{ backgroundColor: color.hex }}
                                />
                                {color.name}
                              </button>
                            ))}
                          </div>

                          {/* Custom Hex Color input */}
                          <div className="space-y-1.5 pt-2">
                            <label className="text-[10px] font-bold text-slate-400 block">{isRtl ? "لون مخصص (Hex)" : "Couleur Hexadécimale"}</label>
                            <div className="flex gap-2 items-center">
                              <input 
                                type="color" 
                                value={modelColor}
                                onChange={(e) => setModelColor(e.target.value)}
                                className="w-10 h-10 rounded-lg cursor-pointer overflow-hidden p-0 border border-slate-200 bg-transparent shrink-0"
                              />
                              <input 
                                type="text"
                                value={modelColor}
                                onChange={(e) => {
                                  if (e.target.value.startsWith('#') && e.target.value.length <= 7) {
                                    setModelColor(e.target.value);
                                  }
                                }}
                                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold w-full uppercase text-slate-850 dark:text-white outline-none focus:border-purple-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Save and Close Actions */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-850 mt-6 space-y-3">
                    <button
                      onClick={handleSaveCustomizedImage}
                      disabled={isSavingCustom}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-emerald-600/10 border border-emerald-500"
                    >
                      {isSavingCustom ? (
                        <><Loader2 className="animate-spin" size={16}/> {isRtl ? "جاري تصدير ورفع التصميم..." : "Exportation en cours..."}</>
                      ) : (
                        <><CheckCircle size={16}/> {isRtl ? "تأكيد التصميم وإضافته للسلة" : "Sauvegarder et Commander"}</>
                      )}
                    </button>
                    <button
                      onClick={() => setIsCustomizerOpen(false)}
                      className="w-full bg-slate-150 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 py-3 rounded-2xl font-bold text-sm transition-all"
                    >
                      {isRtl ? "إلغاء التعديل" : "Annuler"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== 3D LIVE PREVIEW MODAL ==================== */}
      <AnimatePresence>
        {isThreeDPreviewOpen && generatedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] border border-white/10 shadow-2xl p-6 relative overflow-hidden flex flex-col gap-6"
            >
              {/* 3D Header */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                     <Sparkles size={20} className="text-purple-500 animate-pulse" />
                     {isRtl ? "المعاينة ثلاثية الأبعاد الحية" : "Simulation 3D Interactive"}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">
                    {isRtl ? "تفاعل مع المنتج ثلاثي الأبعاد وغير لونه بالكامل" : "Faites tourner et inspectez votre design sur nos produits."}
                  </p>
                </div>
                <button 
                  onClick={() => setIsThreeDPreviewOpen(false)}
                  className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 3D Product Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
                {[
                  { id: 'mug', label: isRtl ? 'كوب قهوة ☕' : 'Mug ☕' },
                  { id: 'tshirt', label: isRtl ? 'قميص 👕' : 'T-Shirt 👕' },
                  { id: 'box', label: isRtl ? 'علبة شحن 📦' : 'Boîte 📦' },
                  { id: 'poster', label: isRtl ? 'ملصق حائط 🖼️' : 'Poster 🖼️' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setThreeDModelType(item.id as any)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                      threeDModelType === item.id 
                        ? 'bg-purple-600 text-white shadow-lg' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* 3D Model Base Color picker */}
              <div className="flex items-center gap-3 justify-center py-2 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                <span className="text-xs font-bold text-slate-500">{isRtl ? "اختر لون المنتج للمعاينة:" : "Couleur du produit :"}</span>
                <div className="flex gap-1.5">
                  {premiumColors.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => setModelColor(color.hex)}
                      className={`w-6 h-6 rounded-full border border-slate-350 transition-transform ${
                        modelColor === color.hex ? 'scale-125 ring-2 ring-purple-500' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={modelColor}
                    onChange={(e) => setModelColor(e.target.value)}
                    className="w-6 h-6 rounded-full cursor-pointer p-0 bg-transparent border border-slate-350"
                  />
                </div>
              </div>

              {/* 3D Canvas Area */}
              <div className="flex-1 min-h-[300px]">
                <ThreeDPreview modelType={threeDModelType} designUrl={generatedImage} modelColor={modelColor} />
              </div>

              {/* 3D Modal Footer */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsThreeDPreviewOpen(false)}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  {isRtl ? "إغلاق" : "Fermer"}
                </button>
                <button
                  onClick={() => {
                    setIsThreeDPreviewOpen(false);
                    handleApplyToCart();
                  }}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-lg"
                >
                  {isRtl ? "طلب هذا المنتج" : "Commander ce produit"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
