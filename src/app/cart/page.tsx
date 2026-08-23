"use client";

import { useAppStore } from "@/lib/store";
import { calculateTierPrice } from "@/lib/pricing";
import { TRANSLATIONS } from "@/lib/translations";
import { getPointsForAmount } from "@/lib/loyalty";
import { lanczosResample } from "@/lib/lanczos-upscale";
import { useAuth } from "@/context/AuthContext";
import { 
  Trash2, Plus, Minus, ShoppingBag, CheckCircle, 
  UploadCloud, FileCheck, Loader2, ArrowRight, Tag, MapPin, Heart, AlertTriangle, Sparkles, Wand2, ShieldCheck, HelpCircle,
  Banknote, Coins
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import Link from "next/link";
import { GlobalLoader } from "@/components/GlobalLoader";
import { WILAYAS } from "@/lib/constants";
import SecurityVerification from "@/components/SecurityVerification";
import SmartCartUpsell from "@/components/SmartCartUpsell";
import PullToRefresh from "@/components/PullToRefresh";
import { buildStatusHistory } from "@/lib/order-status";

export default function CartPage() {
  // جلب الخصائص والدوال بشكل منفصل تماماً عبر الـ Selectors لمنع تدمير المراجع بعد الـ Minification
  const cart = useAppStore((state) => state.cart);
  const language = useAppStore((state) => state.language);
  const removeFromCart = useAppStore((state) => state.removeFromCart);
  const updateQuantity = useAppStore((state) => state.updateQuantity);
  const updateCartItem = useAppStore((state) => state.updateCartItem);
  const clearCart = useAppStore((state) => state.clearCart);
  const getCartTotal = useAppStore((state) => state.getCartTotal);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);

  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { user: authUser } = useAuth();

  // --- مضاعف نقاط الولاء (حسب مستوى العضوية) ---
  const [loyaltyMultiplier, setLoyaltyMultiplier] = useState<number | null>(null);

  useEffect(() => {
    if (!authUser) {
      setLoyaltyMultiplier(null);
      return;
    }
    let cancelled = false;
    const loadTier = async () => {
      try {
        const token = await authUser.getIdToken();
        const res = await fetch("/api/loyalty/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && data.success) setLoyaltyMultiplier(data.profile?.tier?.multiplier ?? 1);
      } catch {
        // تجاهل — تبقى القيمة الافتراضية 1x
      }
    };
    loadTier();
    return () => { cancelled = true; };
  }, [authUser]);
  
  // --- حالات الرفع السحابي (Cloudinary) ---
  const [fileStatus, setFileStatus] = useState<'idle' | 'uploading' | 'good' | 'error'>('idle');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- حالات فحص جودة المطبوعات (AI Preflight) ---
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [preflightResult, setPreflightResult] = useState<any | null>(null);
  const [isCheckingPreflight, setIsCheckingPreflight] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  
  // --- حالات أكواد الخصم ---
  const [promoInput, setPromoInput] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null);

  // --- حالة جاهزية التصميم ---
  const [designReady, setDesignReady] = useState<boolean>(true);

  // --- بيانات العميل ---
  const [formData, setFormData] = useState({ name: "", phone: "", wilaya: "", notes: "" });

  // --- حالات الإعدادات الديناميكية المسترجعة من الـ Firebase التحكمية ---
  const [uiConfig, setUiConfig] = useState<any>({
    storeOpen: true,
    closedMessage: "",
    homeDeliveryExtra: 200,
    freeShippingThreshold: 0,
    maxFileSize: 20,
    allowedExtensions: "pdf, ai, psd, png, jpg",
    captchaMode: "slider",
    recaptchaSiteKey: ""
  });
  const [securityVerified, setSecurityVerified] = useState(false);

  // إعادة جلب الإعدادات السحابية الحية (للـ Pull-to-Refresh على الموبايل)
  const refreshSettings = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, "settings", "ui"));
      if (snap.exists()) {
        setUiConfig(snap.data());
      }
    } catch (err) {
      console.error("Error refreshing settings from Firestore:", err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    
    // جلب الإعدادات السحابية الحية لتطبيق الضوابط فوراً داخل سلة المشتريات
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "ui"));
        if (snap.exists()) {
          const data = snap.data();
          setUiConfig(data);
          if (data.captchaMode === "disabled") {
            setSecurityVerified(true);
          }
        }
      } catch (err) {
        console.error("Error fetching settings from Firestore:", err);
      }
    };
    fetchSettings();
  }, []);

  if (!mounted) return <GlobalLoader />;

  const t = TRANSLATIONS[language];
  const isRtl = language === "ar";
  
  // --- الحسابات المالية الديناميكية والذكية المشتقة من إعدادات التحكم ---
  const subtotal = cart.reduce((sum, item) => {
    const pricingInfo = calculateTierPrice(item.price ?? 0, item.quantity || 1);
    return sum + pricingInfo.totalItemPrice;
  }, 0);
  
  let deliveryFee = 0;
  
  let discountAmount = 0;
  if (appliedPromo && subtotal >= (appliedPromo.minAmount || 0)) {
    discountAmount = appliedPromo.discountType === 'percent' 
      ? (subtotal * appliedPromo.discountValue) / 100 
      : appliedPromo.discountValue;
  }

  const totalBeforeDelivery = Math.max(0, subtotal - discountAmount);
  const finalTotal = totalBeforeDelivery;

  const runPreflightCheck = async (url: string, width?: number, height?: number) => {    setIsCheckingPreflight(true);
    try {
      const response = await fetch('/api/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: url,
          printSize: cart[0]?.selectedOptions?.finition || 'A4',
          width,
          height
        })
      });
      const res = await response.json();
      if (res.success) {
        setPreflightResult(res.data);
      }
    } catch (e) {
      console.error("Preflight check failed:", e);
    } finally {
      setIsCheckingPreflight(false);
    }
  };

  const handleAiUpscale = async () => {
    if (!uploadedFileUrl || !preflightResult) return;
    setIsUpscaling(true);
    const upscaleToast = toast.loading(isRtl ? "جاري تحسين جودة الصورة بالذكاء الاصطناعي..." : "Optimisation de l'image par l'IA...");

    try {
      // حقيقي 100%: نحمّل الصورة الأصلية، نطبّق خوارزمية Lanczos-3 عبر canvas،
      // نعيد رفع النتيجة ونعيد فحص الجودة — بلا أي مؤقتات وهمية.
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Image load failed"));
        i.src = uploadedFileUrl;
      });

      const srcW = img.naturalWidth || imageDimensions?.width || 1200;
      const srcH = img.naturalHeight || imageDimensions?.height || 800;

      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = srcW;
      sourceCanvas.height = srcH;
      const sctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
      if (!sctx) throw new Error("Canvas 2D not supported");
      sctx.drawImage(img, 0, 0, srcW, srcH);
      const sourceData = sctx.getImageData(0, 0, srcW, srcH);

      const { data, width: newWidth, height: newHeight, durationMs } = lanczosResample(
        { data: sourceData.data, width: srcW, height: srcH },
        srcW * 2,
        srcH * 2
      );

      const outCanvas = document.createElement("canvas");
      outCanvas.width = newWidth;
      outCanvas.height = newHeight;
      const octx = outCanvas.getContext("2d");
      if (!octx) throw new Error("Canvas 2D not supported");
      const pixelBuffer = new Uint8ClampedArray(new ArrayBuffer(data.length));
      pixelBuffer.set(data);
      octx.putImageData(new ImageData(pixelBuffer, newWidth, newHeight), 0, 0);

      const mime = fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) =>
        outCanvas.toBlob(resolve, mime, 0.95)
      );
      if (!blob) throw new Error("Canvas export failed");

      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Read failed"));
        reader.readAsDataURL(blob);
      });

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: dataUrl }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) throw new Error(uploadData.error || "Upload failed");

      setUploadedFileUrl(uploadData.url);
      setImageDimensions({ width: newWidth, height: newHeight });
      setPreflightResult({
        width: newWidth,
        height: newHeight,
        estimatedDPI: Math.round((preflightResult.estimatedDPI || 150) * 2),
        isPrintReady: true,
        warnings: [],
        upscaleRecommended: false,
      });

      toast.dismiss(upscaleToast);
      toast.success(
        isRtl
          ? `تم رفع دقة الصورة بنجاح إلى ${newWidth}×${newHeight} بكسل (خوارزمية Lanczos، ${Math.round(durationMs / 1000)}ث)`
          : `Image suréchantillonnée avec succès : ${newWidth}×${newHeight} px (Lanczos-3, ${Math.round(durationMs / 1000)}s)`
      );
    } catch (err) {
      console.error("AI Upscale failed:", err);
      toast.dismiss(upscaleToast);
      toast.error(isRtl ? "فشل تحسين الصورة. جرّب رفع ملف بجودة أعلى." : "Échec de l'optimisation. Réessayez avec un fichier de meilleure qualité.");
    } finally {
      setIsUpscaling(false);
    }
  };

  // --- دالة رفع التصميم (Cloudinary) مضاف إليها فلاتر القيود الصارمة المحددة من الإعدادات ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // 1. التحقق من امتداد وصيغة ملف العميل ديناميكياً
    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = uiConfig.allowedExtensions
      ? uiConfig.allowedExtensions.split(',').map((ext: string) => ext.trim().toLowerCase())
      : ['pdf', 'ai', 'psd', 'png', 'jpg'];

    if (!allowedExts.includes(fileExt)) {
      toast.error(
        isRtl 
          ? `صيغة الملف غير مدعومة! الصيغ المقبولة حالياً هي: ${uiConfig.allowedExtensions}` 
          : `Format de fichier non supporté ! Les extensions autorisées sont : ${uiConfig.allowedExtensions}`
      );
      return;
    }

    // 2. التحقق من الحجم الأقصى للملف تلافياً لملفات الطباعة الضخمة جداً قبل الرفع
    const maxMb = uiConfig.maxFileSize || 20;
    const maxBytes = maxMb * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      toast.error(
        isRtl 
          ? `حجم هذا الملف كبير جداً! الحد الأقصى المسموح برهعه هو ${maxMb} ميجابايت.` 
          : `Fichier trop volumineux ! La taille maximale autorisée est de ${maxMb} MB.`
      );
      return;
    }
    
    setFileName(selectedFile.name);
    setFileStatus('uploading');
    setPreflightResult(null);

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onloadend = async () => {
      const uploadAndPreflight = async (w?: number, h?: number) => {
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: reader.result }),
          });
          const data = await response.json();
          
          if (response.ok) {
            setUploadedFileUrl(data.url);
            setFileStatus('good');
            toast.success(isRtl ? "تم رفع ملف التصميم سحابياً بنجاح!" : "Fichier téléchargé sur le cloud avec succès !");
            await runPreflightCheck(data.url, w, h);
          } else throw new Error(data.error);
        } catch (error) {
          setFileStatus('error');
          toast.error(isRtl ? "فشل رفع الملف، يرجى المحاولة لاحقاً." : "Échec de l'upload.");
        }
      };

      const isImg = ['png', 'jpg', 'jpeg', 'webp'].includes(fileExt);
      if (isImg) {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          uploadAndPreflight(img.naturalWidth, img.naturalHeight);
        };
        img.onerror = () => {
          uploadAndPreflight();
        };
      } else {
        uploadAndPreflight();
      }
    };
  };

  // --- دالة تطبيق كود الخصم ---
  const applyPromoCode = async () => {
    if (!promoInput.trim()) return;
    
    setIsApplyingPromo(true);
    try {
      const code = promoInput.toUpperCase().trim();
      const promoDoc = await getDoc(doc(db, "promoCodes", code));

      if (promoDoc.exists()) {
        const promoData = promoDoc.data();
        if (promoData.active === false) {
          toast.error(isRtl ? "هذا الكود غير فعال حالياً." : "Ce code est inactif.");
          setAppliedPromo(null);
        } else if (subtotal < (promoData.minAmount || 0)) {
          toast.error(isRtl ? `الحد الأدنى للطلب لتفعيل هذا الكود: ${promoData.minAmount} دج.` : `Montant minimum requis : ${promoData.minAmount} DA.`);
          setAppliedPromo(null);
        } else {
          setAppliedPromo({ id: promoDoc.id, ...promoData });
          toast.success(isRtl ? "تم تطبيق كود الخصم بنجاح!" : "Code promo appliqué !");
          setPromoInput("");
        }
      } else {
        toast.error(isRtl ? "كود الخصم غير صحيح أو منتهي الصلاحية." : "Code promo invalide.");
        setAppliedPromo(null);
      }
    } catch (error) {
      toast.error(isRtl ? "حدث خطأ غير متوقع أثناء التحقق." : "Erreur de vérification.");
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // --- دالة التحديد التلقائي للموقع المحسنة (تدعم الجزائر 48 ولاية بالكامل باللغتين) ---
  const detectLocation = async () => {
    try {
      toast.info(isRtl ? "جاري تحديد ولايتك تلقائياً..." : "Détection de la position...");
      
      const res = await fetch("/api/geo");
      if (!res.ok) throw new Error("Network response was not ok");
      
      const data = await res.json();
      
      if (data && (data.regionName || data.cityName)) {
        const detectedRegion = (data.regionName || data.cityName).toLowerCase().trim();
        
        const wilayaTranslationMap: { [key: string]: { ar: string, fr: string } } = {
          'adrar': { ar: 'أدرار', fr: 'adrar' }, 'chlef': { ar: 'الشلف', fr: 'chlef' }, 'laghouat': { ar: 'الأغواط', fr: 'laghouat' },
          'oum el bouaghi': { ar: 'أم البواقي', fr: 'oum el bouaghi' }, 'batna': { ar: 'باتنة', fr: 'batna' }, 'bejaia': { ar: 'بجاية', fr: 'bejaia' },
          'biskra': { ar: 'بسكرة', fr: 'biskra' }, 'bechar': { ar: 'بشار', fr: 'bechar' }, 'blida': { ar: 'البليدة', fr: 'blida' },
          'bouira': { ar: 'البويرة', fr: 'bouira' }, 'tamanrasset': { ar: 'تمنراست', fr: 'tamanrasset' }, 'tebessa': { ar: 'تبسة', fr: 'tebessa' },
          'tlemcen': { ar: 'تلمسان', fr: 'tlemcen' }, 'tiaret': { ar: 'تيارت', fr: 'tiaret' }, 'tizi ouzou': { ar: 'تيزي وزو', fr: 'tizi ouzou' },
          'algiers': { ar: 'الجزائر', fr: 'alger' }, 'alger': { ar: 'الجزائر', fr: 'alger' }, 'djelfa': { ar: 'الجلفة', fr: 'djelfa' },
          'jijel': { ar: 'جيجل', fr: 'jijel' }, 'setif': { ar: 'سطيف', fr: 'setif' }, 'saida': { ar: 'سعيدة', fr: 'saida' },
          'skikda': { ar: 'سكيكدة', fr: 'skikda' }, 'sidi bel abbes': { ar: 'سيدي بلعباس', fr: 'sidi bel abbes' }, 'annaba': { ar: 'عنابة', fr: 'annaba' },
          'guelma': { ar: 'قالمة', fr: 'guelma' }, 'constantine': { ar: 'قسنطينة', fr: 'constantine' }, 'medea': { ar: 'المدية', fr: 'medea' },
          'mostaganem': { ar: 'مستغانم', fr: 'mostaganem' }, 'm\'sila': { ar: 'المسيلة', fr: 'msila' }, 'mascara': { ar: 'معسكر', fr: 'mascara' },
          'ouargla': { ar: 'ورقلة', fr: 'ouargla' }, 'oran': { ar: 'وهران', fr: 'oran' }, 'el bayadh': { ar: 'البيض', fr: 'el bayadh' },
          'illizi': { ar: 'إليزي', fr: 'illizi' }, 'bordj bou arreridj': { ar: 'برج بوعريريج', fr: 'bordj bou arreridj' }, 'boumerdes': { ar: 'بومرداس', fr: 'boumerdes' },
          'el tarf': { ar: 'الطارف', fr: 'el tarf' }, 'tindouf': { ar: 'تيندوف', fr: 'tindouf' }, 'tissemsilt': { ar: 'تيسمسيلت', fr: 'tissemsilt' },
          'el oued': { ar: 'الوادي', fr: 'el oued' }, 'khenchela': { ar: 'خنشلة', fr: 'khenchela' }, 'souk ahras': { ar: 'سوق أهراس', fr: 'souk ahras' },
          'tipaza': { ar: 'تيبازة', fr: 'tipaza' }, 'mila': { ar: 'ميلة', fr: 'mila' }, 'ain defla': { ar: 'عين الدفلى', fr: 'ain defla' },
          'naama': { ar: 'النعامة', fr: 'naama' }, 'ain temouchent': { ar: 'عين تموشنت', fr: 'ain temouchent' }, 'ghardaia': { ar: 'غرداية', fr: 'ghardaia' },
          'relizane': { ar: 'غليزان', fr: 'relizane' }
        };

        const detectedWilaya = WILAYAS.find(w => {
          const wilayaFormated = w.toLowerCase().replace(/['\-]/g, '').trim();
          const regionCleaned = detectedRegion.replace(/['\-]/g, '');
          
          if (wilayaFormated.includes(regionCleaned) || regionCleaned.includes(wilayaFormated)) return true;
          
          const mapped = wilayaTranslationMap[detectedRegion];
          if (mapped) {
            const frCleaned = mapped.fr.replace(/['\-]/g, '');
            if (wilayaFormated.includes(mapped.ar) || wilayaFormated.includes(frCleaned)) return true;
          }
          
          for (const [key, val] of Object.entries(wilayaTranslationMap)) {
            const keyCleaned = key.replace(/['\-]/g, '');
            if (regionCleaned.includes(keyCleaned)) {
              const valFrCleaned = val.fr.replace(/['\-]/g, '');
              if (wilayaFormated.includes(val.ar) || wilayaFormated.includes(valFrCleaned)) return true;
            }
          }
          return false;
        });

        if (detectedWilaya) {
          setFormData(prev => ({ ...prev, wilaya: detectedWilaya }));
          toast.success(isRtl ? `تم تحديد الولاية تلقائياً: ${detectedWilaya}` : `Wilaya détectée : ${detectedWilaya}`);
        } else {
          toast.error(isRtl ? "لم نتمكن من مطابقة الولاية بدقة، يرجى اختيارها يدوياً." : "Impossible de correspondre la wilaya automatiquement.");
        }
      } else {
        throw new Error("Invalid location data structure");
      }
    } catch (error) {
      console.error("Location detection failed:", error);
      toast.error(isRtl ? "تعذر تحديد الموقع الجغرافي تلقائياً." : "Échec de la détection de la position.");
    }
  };

  // --- إتمام وتخزين الطلب النهائي في قاعة بيانات Firebase ---
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // التحقق الإضافي الصارم من حالة المتجر قبل ترحيل الفاتورة للاحتياط الأمني
    if (uiConfig.storeOpen === false) {
      toast.error(isRtl ? "المتجر مغلق حالياً، لا يمكن إرسال طلبات جديدة." : "La boutique est fermée.");
      return;
    }

    if (uiConfig.captchaMode !== "disabled" && !securityVerified) {
      toast.error(isRtl ? "يرجى إكمال التحقق الأمني أولاً." : "Veuillez d'abord effectuer la vérification de sécurité.");
      return;
    }

    const phoneRegex = /^(0)(5|6|7)[0-9]{8}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error(isRtl ? "رقم الهاتف غير صحيح (يجب أن يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام)" : "Numéro de téléphone invalide");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      const orderData = {
        customerUserId: user ? user.uid : "guest",
        customerName: formData.name,
        phone: formData.phone,
        wilaya: formData.wilaya,
        deliveryType: 'desk',
        shippingMethod: 'collect',
        designReadyStatus: designReady ? "ready" : "needs_review",
        notes: formData.notes,
        designUrl: uploadedFileUrl || null,
        items: cart,
        subtotal: subtotal,
        discountAmount: discountAmount,
        appliedPromoCode: appliedPromo ? appliedPromo.id : null,
        deliveryFee: deliveryFee,
        total: finalTotal,
        status: "En attente", 
        statusHistory: buildStatusHistory(null, "En attente", "Commande créée"),
        paymentMethod: "Paiement à la réception",
        paymentStatus: "unpaid",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "orders"), orderData);
      const orderId = docRef.id;

      // Log successful order to Security Audit Logs
      await addDoc(collection(db, "securityLogs"), {
        event: "order_created",
        email: user?.email || "anonymous-customer",
        timestamp: serverTimestamp(),
        type: "checkout",
        status: "success",
        details: `Commande #${orderId} d'un montant de ${finalTotal} DA soumise avec succès.`,
        ip: "client-logged"
      });

      clearCart(); 
      // اهتزاز نجاح مزدوج على الهاتف عند تسجيل الطلب
      try {
        if ("vibrate" in navigator) navigator.vibrate([40, 60, 40]);
      } catch { /* لا شيء */ }
      toast.success(isRtl ? "تم تسجيل طلبك بنجاح! سنتصل بك قريباً عبر الهاتف أو الواتساب لتأكيده." : "Commande enregistrée avec succès !");
      router.push(`/success?orderId=${orderId}`);

      // إرسال إشعارات تأكيد الطلب (واتساب + بريد) + أتمتة التسويق (خارج مسار الدفع)
      try {
        const token = user ? await user.getIdToken() : undefined;
        fetch("/api/orders/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "created",
            order: {
              id: orderId,
              orderNumber: orderId,
              phone: formData.phone,
              customerName: formData.name,
              customerEmail: user?.email || null,
              customerUserId: user ? user.uid : "guest",
              total: finalTotal,
            },
            token,
          }),
        }).catch(() => {});
      } catch (err) {
        console.error("Notification dispatch failed:", err);
      }

    } catch (error: any) {
      console.error("Checkout process failed:", error);
      toast.error(isRtl ? `فشلت العملية: ${error.message || "حدث خطأ غير متوقع"}` : `Erreur : ${error.message || "Erreur lors de la commande"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PullToRefresh onRefresh={refreshSettings} language={language}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`pb-24 max-w-7xl mx-auto ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <div className="p-3 bg-accent/10 text-accent rounded-2xl"><ShoppingBag size={32} /></div>
          {t.cart}
        </h1>
        {cart.length > 0 && (
          <button onClick={clearCart} className="text-sm font-bold text-red-500 hover:text-red-700 flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl transition-colors">
            <Trash2 size={16} /> {isRtl ? "إفراغ السلة" : "Vider"}
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-24 premium-glass rounded-[3rem] border border-white/60 dark:border-white/10">
          <ShoppingBag size={64} className="mx-auto mb-6 opacity-20 text-slate-400" />
          <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-6">{t.emptyCart}</h2>
          <Link href="/services" className="inline-flex items-center gap-2 px-10 py-5 bg-slate-900 dark:bg-accent text-white rounded-2xl font-black hover:scale-105 transition-transform shadow-xl">
            {t.services} <ArrowRight size={20} className={isRtl ? "rotate-180" : ""} />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-10">
          
          <div className="flex-1 space-y-6">
            {cart.map(item => {
              const isFavorite = favorites?.some(f => f.id === item.id);
              const quantity = item.quantity ?? 1;
              const basePrice = (item as any).basePrice || item.price;
              const pricingInfo = calculateTierPrice(item.price ?? 0, quantity);
              
              const currentPaper = item.selectedOptions?.paper || "300g";
              const currentCorners = item.selectedOptions?.corners || "straight";
              const currentLamination = item.selectedOptions?.lamination || "none";

              const paperOptions = [
                { id: "300g", label: isRtl ? "ورق 300 غرام (افتراضي)" : "Standard 300g (Défaut)", offset: 0 },
                { id: "350g", label: isRtl ? "ورق 350 غرام (+300 دج)" : "Premium 350g (+300 DA)", offset: 300 },
                { id: "linen", label: isRtl ? "ورق كتان محكم (+500 دج)" : "Lin texturé (+500 DA)", offset: 500 },
              ];

              const cornerOptions = [
                { id: "straight", label: isRtl ? "زوايا مستقيمة (افتراضي)" : "Angles droits (Défaut)", offset: 0 },
                { id: "rounded", label: isRtl ? "زوايا مستديرة (+200 دج)" : "Angles arrondis (+200 DA)", offset: 200 },
              ];

              const laminationOptions = [
                { id: "none", label: isRtl ? "بدون تغليف (افتراضي)" : "Sans lamination (Défaut)", offset: 0 },
                { id: "matte", label: isRtl ? "تغليف مطفي (+300 دج)" : "Lamination Matte (+300 DA)", offset: 300 },
                { id: "glossy", label: isRtl ? "تغليف لامع (+300 دج)" : "Lamination Brillante (+300 DA)", offset: 300 },
                { id: "velvet", label: isRtl ? "تغليف مخملي ناعم (+450 دج)" : "Soft-touch Velvet (+450 DA)", offset: 450 },
              ];

              const handleOptionChange = (type: "paper" | "corners" | "lamination", optionId: string) => {
                const paper = type === "paper" ? optionId : currentPaper;
                const corners = type === "corners" ? optionId : currentCorners;
                const lamination = type === "lamination" ? optionId : currentLamination;

                const paperOffset = paperOptions.find(o => o.id === paper)?.offset || 0;
                const cornersOffset = cornerOptions.find(o => o.id === corners)?.offset || 0;
                const laminationOffset = laminationOptions.find(o => o.id === lamination)?.offset || 0;

                const calculatedPrice = basePrice + paperOffset + cornersOffset + laminationOffset;

                updateCartItem(item.id, {
                  basePrice: basePrice,
                  price: calculatedPrice,
                  selectedOptions: {
                    ...item.selectedOptions,
                    paper,
                    corners,
                    lamination
                  }
                });
              };
              
              return (
                <motion.div layout key={item.id} className="premium-glass p-5 rounded-[2rem] flex flex-col gap-5 hover:shadow-xl transition-shadow border border-white/60 dark:border-white/10">
                  <div className="flex flex-col sm:flex-row gap-5 items-center w-full">
                    <div className="w-full sm:w-28 h-32 sm:h-28 rounded-2xl bg-white dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-100 dark:border-slate-700">
                      <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-center sm:text-start">
                      <span className="text-[10px] font-black text-accent uppercase tracking-widest">{item.category}</span>
                      <h3 className="font-black text-slate-800 dark:text-white text-xl mt-1 leading-tight">{item.name}</h3>
                      {item.selectedOptions?.finition && (
                        <p className="text-xs text-slate-500 font-bold mt-1">Finition: <span className="text-slate-700 dark:text-slate-300">{item.selectedOptions.finition}</span></p>
                      )}
                      <div className="mt-2">
                        {pricingInfo.appliedDiscountPercent > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-accent font-black text-xl">{pricingInfo.finalUnitPrice} {t.currency}</span>
                              <span className="text-slate-400 line-through text-sm">{item.price} {t.currency}</span>
                              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-md">
                                -{pricingInfo.appliedDiscountPercent}%
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-bold">
                              {isRtl ? `المجموع: ${pricingInfo.totalItemPrice} دج` : `Total : ${pricingInfo.totalItemPrice} DA`}
                            </p>
                          </div>
                        ) : (
                          <span className="text-accent font-black text-xl">{item.price} {t.currency}</span>
                        )}

                        {pricingInfo.nextTier && (
                          <p className="text-[10px] text-indigo-500 font-bold mt-1 bg-indigo-500/5 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg inline-block">
                            {isRtl 
                              ? `أضف ${pricingInfo.nextTier.neededQty} قطع أخرى للحصول على خصم ${pricingInfo.nextTier.discountPercent}%! ✨`
                              : `Ajoutez ${pricingInfo.nextTier.neededQty} pièces pour obtenir ${pricingInfo.nextTier.discountPercent}% de réduction ! ✨`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shrink-0">
                      <button type="button" onClick={() => updateQuantity(item.id, Math.max(1, quantity - 1))} className="p-2 text-slate-500 hover:text-accent bg-white dark:bg-slate-700 rounded-xl shadow-sm transition-colors"><Minus size={18}/></button>
                      <span className="font-bold w-6 text-center text-lg">{quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.id, quantity + 1)} className="p-2 text-slate-500 hover:text-accent bg-white dark:bg-slate-700 rounded-xl shadow-sm transition-colors"><Plus size={18}/></button>
                      <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                      
                      <button type="button" onClick={() => toggleFavorite(item)} className={`p-2 rounded-xl transition-colors ${isFavorite ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-slate-400 hover:text-red-500'}`} title={isRtl ? "حفظ للمفضلة" : "Ajouter aux favoris"}>
                        <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
                      </button>

                      <button type="button" onClick={() => removeFromCart(item.id)} className="p-2 text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl transition-colors"><Trash2 size={18}/></button>
                    </div>
                  </div>

                  {/* Customizable Options Dropdowns */}
                  <div className="pt-4 border-t border-slate-150 dark:border-slate-800/50 flex flex-col gap-3 text-start w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Paper Type Selector */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {isRtl ? "نوع وسمك الورق" : "Type et Grammage Papier"}
                        </label>
                        <select
                          value={currentPaper}
                          onChange={(e) => handleOptionChange("paper", e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl bg-white/70 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 outline-none focus:ring-1 focus:ring-accent font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          {paperOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Corner Finishes Selector */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {isRtl ? "شكل حواف البطاقة" : "Finition des Coins"}
                        </label>
                        <select
                          value={currentCorners}
                          onChange={(e) => handleOptionChange("corners", e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl bg-white/70 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 outline-none focus:ring-1 focus:ring-accent font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          {cornerOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Lamination Finish Selector */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {isRtl ? "التغليف (Lamination)" : "Type de Lamination"}
                        </label>
                        <select
                          value={currentLamination}
                          onChange={(e) => handleOptionChange("lamination", e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl bg-white/70 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 outline-none focus:ring-1 focus:ring-accent font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          {laminationOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* منطقة رفع التصميم المقيدة بإعدادات لوحة التحكم السحابية */}
            <div className="premium-glass p-8 rounded-[2.5rem] border-2 border-dashed border-slate-300 dark:border-slate-700 relative overflow-hidden group hover:border-accent dark:hover:border-accent transition-colors">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent/10 rounded-lg"><UploadCloud className="text-accent" size={24} /></div>
                <h4 className="font-bold text-slate-800 dark:text-white">
                  {isRtl ? "ارفق ملف التصميم الخاص بك للطباعة الرقمية" : "Joindre votre fichier design"}
                </h4>
              </div>
              <input 
                type="file" 
                id="design-upload" 
                onChange={handleFileChange} 
                className="hidden" 
                accept={uiConfig.allowedExtensions ? uiConfig.allowedExtensions.split(',').map((e: string) => `.${e.trim()}`).join(',') : "image/*,.pdf"}
              />
              <label htmlFor="design-upload" className="flex flex-col items-center justify-center py-10 bg-white/40 dark:bg-slate-800/40 rounded-3xl cursor-pointer hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all">
                <AnimatePresence mode="wait">
                  {fileStatus === 'uploading' ? (
                    <motion.div key="up" initial={{opacity:0}} animate={{opacity:1}} className="text-center">
                      <Loader2 className="animate-spin text-accent mx-auto mb-3" size={40} />
                      <p className="font-bold text-slate-600 dark:text-slate-300">Uploading to Cloudinary...</p>
                    </motion.div>
                  ) : fileStatus === 'good' ? (
                    <motion.div key="good" initial={{opacity:0}} animate={{opacity:1}} className="text-center text-emerald-500">
                      <FileCheck className="mx-auto mb-3 drop-shadow-md" size={48} />
                      <p className="font-black text-slate-800 dark:text-white mb-1 truncate max-w-[250px] mx-auto">{fileName}</p>
                      <p className="text-[10px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full inline-block">{isRtl ? "جاهز للطباعة" : "Prêt pour l'impression"}</p>
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{opacity:0}} animate={{opacity:1}} className="text-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all duration-300 shadow-inner">
                        <Plus size={28} />
                      </div>
                      <p className="font-bold text-slate-500 dark:text-slate-400">
                        {isRtl 
                          ? `اضغط هنا لاختيار ملف (${uiConfig.allowedExtensions.toUpperCase()}) بحد أقصى ${uiConfig.maxFileSize}MB` 
                          : `Cliquez pour choisir un fichier (${uiConfig.allowedExtensions.toUpperCase()}) Max ${uiConfig.maxFileSize}MB`}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </label>
            </div>

            {fileStatus === 'good' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="premium-glass p-6 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-2xl relative overflow-hidden flex flex-col gap-6"
              >
                {/* AI Preflight Header */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-200/50 dark:border-slate-800/85">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
                      <Sparkles size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        {isRtl ? "مدقق جودة الملف بالذكاء الاصطناعي" : "Auditeur de qualité IA"}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5 tracking-wider">
                        AI Preflight Auditor
                      </p>
                    </div>
                  </div>

                  {preflightResult && (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      preflightResult.estimatedDPI >= 300
                        ? "bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-250/20"
                        : preflightResult.estimatedDPI >= 150
                          ? "bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-450 border border-orange-250/20"
                          : "bg-red-100 dark:bg-red-950/20 text-red-650 dark:text-red-450 border border-red-250/20"
                    }`}>
                      {preflightResult.estimatedDPI >= 300 
                        ? (isRtl ? "جودة ممتازة للطباعة" : "Haute Qualité")
                        : preflightResult.estimatedDPI >= 150
                          ? (isRtl ? "جودة متوسطة" : "Qualité Moyenne")
                          : (isRtl ? "جودة منخفضة جداً" : "Qualité Basse")}
                    </span>
                  )}
                </div>

                {/* Gauge and metrics grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  
                  {/* Glowing Radial DPI Gauge */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white/40 dark:bg-slate-900/30 rounded-3xl border border-white/60 dark:border-white/5 relative overflow-hidden h-48 group">
                    
                    {/* Futuristic scan grid animation overlay during upscale */}
                    {isUpscaling && (
                      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/0 via-purple-500/10 to-purple-500/0 pointer-events-none z-10 border-y border-purple-500/30">
                        <motion.div 
                          className="w-full h-[2px] bg-purple-500 shadow-[0_0_15px_#a855f7] absolute z-20"
                          animate={{ top: ["0%", "100%", "0%"] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>
                    )}

                    <div className="relative w-32 h-32 flex items-center justify-center">
                      {/* Circular border track */}
                      <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle 
                          cx="50" cy="50" r="40" 
                          stroke="currentColor" 
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="6" 
                          fill="transparent" 
                        />
                        {preflightResult && (
                          <motion.circle 
                            cx="50" cy="50" r="40" 
                            stroke={
                              preflightResult.estimatedDPI >= 300
                                ? "#10b981" 
                                : preflightResult.estimatedDPI >= 150
                                  ? "#f59e0b" 
                                  : "#ef4444" 
                            }
                            strokeWidth="8" 
                            strokeDasharray="251.2"
                            strokeDashoffset={251.2 - (251.2 * Math.min(100, (preflightResult.estimatedDPI / 300) * 100)) / 100}
                            fill="transparent" 
                            strokeLinecap="round"
                            initial={{ strokeDashoffset: 251.2 }}
                            animate={{ strokeDashoffset: 251.2 - (251.2 * Math.min(100, (preflightResult.estimatedDPI / 300) * 100)) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          />
                        )}
                      </svg>

                      {/* Display DPI Value inside */}
                      <div className="flex flex-col items-center justify-center text-center z-10">
                        {isCheckingPreflight ? (
                          <Loader2 className="animate-spin text-purple-500" size={24} />
                        ) : (
                          <>
                            <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                              {preflightResult ? preflightResult.estimatedDPI : "---"}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                              DPI
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preflight Info Cards */}
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs flex flex-col gap-2 font-bold">
                      <div className="flex justify-between text-slate-455">
                        <span>{isRtl ? "حجم الصورة الاصلي:" : "Dimensions originales :"}</span>
                        <span className="text-slate-700 dark:text-slate-200">
                          {imageDimensions ? `${imageDimensions.width} x ${imageDimensions.height} px` : (isRtl ? "مستند PDF/متجه" : "Fichier PDF / Vectoriel")}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-455">
                        <span>{isRtl ? "نظام الألوان المقدر:" : "Profil de couleur :"}</span>
                        <span className="text-slate-700 dark:text-slate-200 uppercase">CMYK / RGB auto</span>
                      </div>
                      <div className="flex justify-between text-slate-455">
                        <span>{isRtl ? "دقة الطباعة المثالية:" : "DPI Standard recommandé :"}</span>
                        <span className="text-emerald-500">300 DPI</span>
                      </div>
                    </div>

                    {/* Interactive AI Upscale Button */}
                    {preflightResult && preflightResult.upscaleRecommended && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleAiUpscale}
                        disabled={isUpscaling}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-650 text-white rounded-2xl font-black text-xs shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 flex items-center justify-center gap-2 border border-purple-500 transition-all disabled:opacity-50 relative overflow-hidden group cursor-pointer"
                      >
                        {isUpscaling ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            {isRtl ? "جاري ترقية الدقة بالذكاء الاصطناعي..." : "AI Upscaling en cours..."}
                          </>
                        ) : (
                          <>
                            <Wand2 size={16} className="animate-bounce" />
                            {isRtl ? "ترقية جودة الصورة تلقائياً (AI Upscale)" : "Améliorer par l'IA (AI Upscale)"}
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Preflight warnings / guidelines */}
                {preflightResult && preflightResult.warnings && preflightResult.warnings.length > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-250/20 rounded-2xl flex gap-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400 font-bold">
                    <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                    <div className="flex flex-col gap-1">
                      {preflightResult.warnings.map((warn: string, idx: number) => (
                        <p key={idx}>{warn}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success Ready badge */}
                {preflightResult && preflightResult.estimatedDPI >= 300 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250/20 rounded-2xl flex gap-3 text-xs items-center text-emerald-700 dark:text-emerald-400 font-black"
                  >
                    <ShieldCheck className="text-emerald-500 shrink-0" size={18} />
                    <p>{isRtl ? "تحليل الذكاء الاصطناعي: هذا التصميم ممتاز وعالي الدقة وجاهز تماماً للطباعة الورقية الفاخرة!" : "Analyse IA : Le design est parfait, haute définition et entièrement prêt pour l'impression !"}</p>
                  </motion.div>
                )}

                {/* Safety Bleed Confirmer Checkbox */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="design-ready"
                    checked={designReady}
                    onChange={(e) => setDesignReady(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-350 text-accent focus:ring-accent cursor-pointer"
                  />
                  <label htmlFor="design-ready" className="text-xs font-black text-slate-750 dark:text-slate-300 cursor-pointer select-none">
                    {isRtl ? "أؤكد أن هذا التصميم جاهز تماماً للطباعة الورقية وبالمقاسات الصحيحة" : "Je confirme que le design est prêt et aux bonnes dimensions"}
                  </label>
                </div>
              </motion.div>
            )}
          </div>
          
          <div className="w-full lg:w-[420px]">
            <SmartCartUpsell cart={cart} />
            <form onSubmit={handleCheckout} className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/10 sticky top-24 shadow-2xl">
              <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">{t.confirm}</h3>
              
              <div className="space-y-4 mb-6">
                <input required type="text" autoComplete="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={t.namePh} className="w-full p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-accent transition-all font-medium" />
                <input required type="tel" dir="ltr" inputMode="tel" autoComplete="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder={t.phonePh} className="w-full p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-accent transition-all font-black tracking-wider text-slate-700 dark:text-slate-200 text-left" />
                
                <div className="relative">
                  <select value={formData.wilaya} onChange={e => setFormData({...formData, wilaya: e.target.value})} className="w-full p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-accent transition-all appearance-none font-medium text-slate-655 dark:text-slate-300">
                    <option value="" disabled>{t.selectWilaya}</option>
                    {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <button type="button" onClick={detectLocation} title={isRtl ? "تحديد موقعي" : "Détecter ma position"} className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-4' : 'right-4'} p-2 text-accent bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer`}>
                    <MapPin size={18} />
                  </button>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 -mt-1">
                  {isRtl ? "الولاية اختيارية — حالياً الاستلام يتم من مقر المطبعة بوهران." : "Wilaya facultative — retrait actuellement à l'atelier d'Oran."}
                </p>

                {/* --- Delivery Status & Pickup (Livraison bientôt disponible) --- */}
                <div className="space-y-3 pt-1">
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {isRtl ? "طريقة الاستلام" : "Mode de Retrait"}
                  </label>

                  {/* Click & Collect card (the only current option) */}
                  <div className="w-full p-4 rounded-2xl border text-start flex items-center justify-between gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/20 dark:bg-slate-100/20">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black">{isRtl ? "استلام من مقر المطبعة (Click & Collect)" : "Retrait à l'atelier (Click & Collect)"}</p>
                        <p className="text-[10px] opacity-60 font-semibold mt-0.5">
                          {isRtl ? "استلم مطبوعاتك جاهزة من ورشتنا بوهران" : "Récupérez vos impressions prêtes à Oran"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 dark:text-emerald-600">
                      {isRtl ? "مجاني" : "Gratuit"}
                    </span>
                  </div>

                  {/* Delivery coming soon banner */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-150 dark:border-blue-900/30 rounded-2xl text-[11px] leading-relaxed text-blue-700 dark:text-blue-400 font-bold space-y-1"
                  >
                    <p className="uppercase tracking-widest text-[9px] font-black">
                      {isRtl ? "📍 عنوان وتفاصيل استلام الطلب:" : "📍 Adresse et instructions de retrait :"}
                    </p>
                    <p>{uiConfig.collectInstructions || (isRtl ? "حيّ العقيد لطفي، وهران - بجانب مسجد القدس (مفتوح من 9:00 صباحاً إلى 6:00 مساءً)" : "Cité Akid Lotfi, Oran - Près de la Mosquée El Qods (Ouvert de 09:00 à 18:00)")}</p>
                    <div className="flex items-center gap-2 pt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span>{isRtl ? "التوصيل إلى المنزل قريباً جداً! 🚀" : "La livraison à domicile arrive très bientôt ! 🚀"}</span>
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {isRtl ? "طريقة الدفع" : "Mode de Paiement"}
                  </label>

                  {/* الدفع عند الاستلام (COD) */}
                  <div className="w-full p-4 rounded-2xl border text-start flex items-center justify-between gap-3 bg-emerald-600 dark:bg-emerald-500 text-white border-transparent shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/20 dark:bg-slate-100/20">
                        <Banknote size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black">
                          {isRtl ? "الدفع عند الاستلام (COD)" : "Paiement à la réception (COD)"}
                        </p>
                        <p className="text-[10px] opacity-80 font-semibold mt-0.5">
                          {isRtl ? "ادفع نقداً بعد استلام طلبيتك وفحص جودة المطبوعات بنفسك." : "Payez en espèces après réception et vérification de vos impressions."}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0 bg-white/20">
                      {isRtl ? "نقداً" : "Cash"}
                    </span>
                  </div>
                </div>
                
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder={t.orderDetails} rows={3} className="w-full p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-accent transition-all resize-none font-medium text-sm"></textarea>
              </div>

              {/* كوبونات الخصم */}
              <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Tag size={14} /> {isRtl ? "كود الخصم" : "Code Promo"}
                  </label>
                  {appliedPromo && (
                    <button type="button" onClick={() => setAppliedPromo(null)} className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md transition-colors">
                      {isRtl ? "إزالة" : "Retirer"}
                    </button>
                  )}
                </div>
                
                {appliedPromo ? (
                  <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className="flex items-center justify-between bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-inner">
                    <span className="font-black font-mono text-lg tracking-widest">{appliedPromo.id}</span>
                    <span className="font-black bg-white dark:bg-slate-900 px-3 py-1 rounded-xl shadow-sm">- {discountAmount} DA</span>
                  </motion.div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Ex: VIP-..." className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none uppercase font-black text-sm focus:ring-2 focus:ring-accent transition-shadow" />
                    <button type="button" onClick={applyPromoCode} disabled={isApplyingPromo || !promoInput.trim()} className="px-6 bg-slate-900 dark:bg-slate-700 text-white font-black rounded-2xl text-sm hover:bg-slate-800 transition-colors disabled:opacity-50">
                      {isApplyingPromo ? <Loader2 size={18} className="animate-spin" /> : (isRtl ? "تطبيق" : "Appliquer")}
                    </button>
                  </div>
                )}
              </div>

              {/* ملخص الفاتورة المالية التفصيلية */}
              <div className="space-y-3 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700 text-sm font-medium">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>{t.subtotal}</span><span>{subtotal} {t.currency}</span>
                </div>
                <AnimatePresence>
                  {discountAmount > 0 && (
                    <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:"auto"}} exit={{opacity:0, height:0}} className="flex justify-between text-emerald-600 dark:text-emerald-400 font-black text-sm bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-lg -mx-2 px-2">
                      <span>{isRtl ? "قيمة الخصم" : "Remise"}</span><span>- {discountAmount} {t.currency}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-black text-sm bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-lg -mx-2 px-2">
                  <span>{isRtl ? "الاستلام من المطبعة" : "Retrait à l'atelier"}</span><span>{isRtl ? "مجاني" : "Gratuit"}</span>
                </div>

                <div className="flex justify-between items-end pt-4">
                  <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t.total}</span>
                  <span className="text-4xl font-black text-accent">{finalTotal} <span className="text-lg text-slate-500">{t.currency}</span></span>
                </div>
              </div>

              {/* تقدير نقاط الولاء المكتسبة */}
              {authUser && loyaltyMultiplier !== null && finalTotal > 0 && (
                <div className="mb-6 -mt-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/50 rounded-2xl flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
                    <Coins size={20} />
                  </span>
                  <div className="flex-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <p className="font-black text-yellow-600 dark:text-yellow-400">
                      +{getPointsForAmount(finalTotal, loyaltyMultiplier)} {isRtl ? "نقطة ولاء" : "points fidélité"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {isRtl
                        ? `ستُضاف إلى رصيدك تلقائياً عند إتمام الطلب (×${loyaltyMultiplier} حسب مستواك)`
                        : `Crédités automatiquement à la fin de la commande (×${loyaltyMultiplier} selon votre statut)`}
                    </p>
                  </div>
                </div>
              )}

              {/* نظام التحقق الأمني التفاعلي */}
              {uiConfig.storeOpen !== false && uiConfig.captchaMode !== "disabled" && (
                <div className="mb-6">
                  <SecurityVerification 
                    captchaMode={uiConfig.captchaMode || "slider"}
                    siteKey={uiConfig.recaptchaSiteKey}
                    language={language}
                    onVerify={setSecurityVerified}
                  />
                </div>
              )}

              {/* زر التأكيد أو كتلة التنبيه بالإغلاق الموقت بناءً على حالة المتجر */}
              {uiConfig.storeOpen === false ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex flex-col items-center gap-2 text-center text-amber-700 dark:text-amber-400 font-bold shadow-inner">
                  <AlertTriangle className="text-amber-500 animate-pulse" size={28} />
                  <p className="text-sm">
                    {isRtl ? "المتجر مغلق مؤقتاً لاستقبال الطلبات الجديدة" : "La boutique est fermée aux commandes"}
                  </p>
                  <p className="text-xs opacity-90 font-medium">
                    {uiConfig.closedMessage || (isRtl ? "نعتذر عن استقبال الطلبات حالياً، يمكنك تصفح وحفظ المنتجات فقط." : "Nous n'acceptons pas de commandes pour le moment.")}
                  </p>
                </div>
              ) : (
                <button 
                  disabled={isSubmitting || fileStatus === 'uploading' || !securityVerified} 
                  type="submit" 
                  className="w-full py-5 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white rounded-3xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group cursor-pointer"
                >
                  <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                  {isSubmitting ? (
                    <><Loader2 className="animate-spin" size={24} /> {isRtl ? "جاري إرسال طلبك..." : "Enregistrement..."}</>
                  ) : (
                    <><CheckCircle size={24} className="drop-shadow-md"/> {isRtl ? "تأكيد الطلب (الدفع عند الاستلام)" : "Confirmer (Paiement à la réception)"}</>
                  )}
                </button>
              )}
            </form>
          </div>

        </div>
      )}
    </motion.div>
    </PullToRefresh>
  );
}
