"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { 
  FileCheck, Upload, AlertCircle, ShieldCheck, CheckCircle2,
  ChevronDown, Scan, ArrowRight, Loader2, Sparkles, PhoneCall,
  Check, X, RefreshCw, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import confetti from "canvas-confetti";

export default function PaymentVerifyPage() {
  const { user, loading: authLoading, isLoggedIn } = useAuth();
  const { language } = useAppStore();
  const isRtl = language === "ar";
  
  // --- States ---
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [txId, setTxId] = useState<string>("");
  const [ripSender, setRipSender] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uiConfig, setUiConfig] = useState<any>(null);
  
  // Scanning states
  const [scanning, setScanning] = useState(false);
  const [scanSteps, setScanSteps] = useState<string[]>([]);
  const [activeStepIdx, setActiveStepIdx] = useState(-1);
  const [success, setSuccess] = useState(false);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [dbChecking, setDbChecking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Calculate required amount based on deposit policy
  const requiredAmount = selectedOrder ? (() => {
    if (!uiConfig) return selectedOrder.total;
    const depType = uiConfig.baridimobMinDepositType || 'none';
    const depVal = Number(uiConfig.baridimobMinDepositValue) || 0;
    if (depType === 'percentage' && depVal > 0) {
      return (selectedOrder.total * depVal) / 100;
    } else if (depType === 'fixed' && depVal > 0) {
      return Math.min(selectedOrder.total, depVal);
    }
    return selectedOrder.total;
  })() : 0;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "ui"));
        if (snap.exists()) {
          setUiConfig(snap.data());
        }
      } catch (err) {
        console.error("Error loading uiConfig in payment verify:", err);
      }
    };
    fetchSettings();
  }, []);

  // Fetch pending orders
  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !user) {
      setLoadingOrders(false);
      return;
    }

    const fetchPendingOrders = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("customerUserId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          // Include orders in status: "En attente" or manual payments not yet verified
          .filter((o: any) => o.status !== "Annulé" && o.status !== "Prêt" && o.paymentStatus !== "Payé");
        
        setOrders(list);
        if (list.length > 0) {
          setSelectedOrderId(list[0].id);
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        toast.error(isRtl ? "حدث خطأ أثناء جلب طلباتك" : "Erreur de chargement des commandes.");
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchPendingOrders();
  }, [user, authLoading, isLoggedIn]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error(isRtl ? "الرجاء اختيار ملف صورة فقط" : "Veuillez choisir une image.");
        return;
      }
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
      // Reset AI report on new file upload
      setAiReport(null);
      setSuccess(false);
    }
  };

  // Web Audio Beeps
  const playBeep = (freq: number, duration: number, delay: number = 0) => {
    setTimeout(() => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch (e) {
        console.debug("Web Audio blocked");
      }
    }, delay);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const startScanningProcess = async () => {
    if (!selectedOrderId) {
      toast.error(isRtl ? "يرجى اختيار الطلب أولاً" : "Sélectionnez une commande.");
      return;
    }
    if (!receiptFile) {
      toast.error(isRtl ? "يرجى تحميل صورة وصل الدفع" : "Veuillez charger le reçu.");
      return;
    }
    if (!txId.trim()) {
      toast.error(isRtl ? "يرجى كتابة رقم العملية" : "Entrez l'ID de transaction.");
      return;
    }

    setScanning(true);
    setSuccess(false);
    setAiReport(null);
    setScanSteps([]);
    setActiveStepIdx(-1);

    const steps = isRtl ? [
      "رفع صورة الوصل وتأمين البيانات...",
      "جاري تحليل البيانات الوصفية وهيكل الصورة...",
      "تشغيل محرك الذكاء الاصطناعي لاستخراج النصوص (OCR)...",
      "التحقق من صحة وقيمة العملية المسجلة...",
      "مراجعة قاعدة البيانات لضمان عدم تكرار الاستخدام...",
      "تحليل مؤشر الثقة وإصدار التقرير النهائي..."
    ] : [
      "Téléversement du reçu sur le cloud sécurisé...",
      "Analyse de la structure de l'image...",
      "Lancement de l'extraction par IA (OCR)...",
      "Vérification de la transaction et du montant...",
      "Analyse anti-fraude et double usage...",
      "Calcul de l'indice de confiance et verdict..."
    ];

    setScanSteps(steps);

    // Step-by-step visual animation helper
    const advanceVisualSteps = async () => {
      for (let i = 0; i < steps.length; i++) {
        setActiveStepIdx(i);
        playBeep(400 + i * 70, 0.1);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    };

    try {
      // Start steps animation
      const stepsPromise = advanceVisualSteps();

      // 1. Upload to Cloudinary
      const base64Image = await fileToBase64(receiptFile);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64Image }),
      });
      
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "Cloudinary upload failed");
      }
      const paymentProofUrl = uploadData.url;

      // 2. Call AI Verification API
      const verifyRes = await fetch("/api/payments/verify-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          orderId: selectedOrderId,
          txId: txId.trim(),
          orderTotal: selectedOrder?.total || 0,
          ripSender: ripSender.trim()
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "AI Verification API failed");
      }

      // Wait for visual steps to finish if API responds faster
      await stepsPromise;

      const report = verifyData.report;
      setAiReport(report);
      setScanning(false);

      if (report.verdict === "approved") {
        setSuccess(true);
        playBeep(587.33, 0.15);
        playBeep(880, 0.25, 100);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

        // Update order in Firestore
        const orderRef = doc(db, "orders", selectedOrderId);
        await updateDoc(orderRef, {
          paymentStatus: "Envoyé", 
          status: "Conception", // Proceed to conception
          baridimobTxId: txId.trim(),
          baridimobRipSender: ripSender.trim(),
          paymentProofUrl: paymentProofUrl,
          aiVerification: report,
          paidAmount: Number(report.extractedAmount) || 0,
          updatedAt: serverTimestamp()
        });

        // Award bonus points
        await addDoc(collection(db, "pointTransactions"), {
          userId: user?.uid,
          points: 50,
          type: "won",
          title: `Bonus points for AI Verified BaridiMob payment #${selectedOrderId.substring(0, 6)}`,
          titleAr: `نقاط إضافية للتحقق الذكي للطلب #${selectedOrderId.substring(0, 6)}`,
          createdAt: serverTimestamp()
        });

        toast.success(isRtl ? "تم التحقق من الوصل وتحديث الطلب بنجاح!" : "Reçu validé et commande mise à jour !");
      } else if (report.verdict === "needs_manual_review") {
        // Needs review but we still save proof to database so admins can inspect it
        const orderRef = doc(db, "orders", selectedOrderId);
        await updateDoc(orderRef, {
          paymentStatus: "Envoyé", // Submitted
          baridimobTxId: txId.trim(),
          baridimobRipSender: ripSender.trim(),
          paymentProofUrl: paymentProofUrl,
          aiVerification: report,
          paidAmount: Number(report.extractedAmount) || 0,
          updatedAt: serverTimestamp()
        });
        toast.warning(isRtl ? "الدفع يتطلب مراجعة يدوية من قبل الإدارة" : "Paiement en attente de revue manuelle.");
      } else {
        toast.error(isRtl ? "فشل التحقق التلقائي. يرجى التأكد من صحة الصورة والبيانات." : "Échec de validation automatique.");
      }

    } catch (err: any) {
      console.error(err);
      toast.error(isRtl ? `حدث خطأ: ${err.message || "فشل النظام"}` : `Erreur: ${err.message || "Échec"}`);
      setScanning(false);
    }
  };

  const formatStep = (stepText: string, index: number) => {
    const isCompleted = index < activeStepIdx;
    const isActive = index === activeStepIdx;
    
    return (
      <div key={index} className={`flex items-center gap-3 text-xs font-bold transition-opacity duration-300 ${isCompleted ? 'text-emerald-500' : isActive ? 'text-indigo-500 animate-pulse' : 'text-slate-400 opacity-60'}`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${isCompleted ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : isActive ? 'bg-indigo-500/20 border-indigo-500 text-indigo-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`}>
          {isCompleted ? "✓" : index + 1}
        </div>
        <span>{stepText}</span>
      </div>
    );
  };

  if (authLoading || loadingOrders) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
      <p className="text-slate-500 font-bold animate-pulse">{isRtl ? "جاري تحميل الطلبات..." : "Chargement des commandes..."}</p>
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 animate-fadeIn">
      <FileCheck size={64} className="mx-auto mb-6 opacity-20 text-slate-400" />
      <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-4">
        {isRtl ? "سجل الدخول لتأكيد دفع طلبيتك" : "Veuillez vous connecter"}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
        {isRtl ? "تحتاج لتسجيل الدخول للوصول إلى طلباتك المعلقة ورفع وصل الدفع." : "Veuillez vous connecter pour accéder à vos commandes et valider le paiement."}
      </p>
      <Link href="/login" className="px-8 py-4 bg-accent text-white rounded-2xl font-bold shadow-xl hover:scale-105 transition-transform">
        {isRtl ? "تسجيل الدخول" : "Se connecter"}
      </Link>
    </div>
  );

  return (
    <div className={`max-w-6xl mx-auto pb-24 px-4 ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>
      
      <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-black uppercase tracking-wider mb-2.5 inline-block border border-indigo-500/20">
            <Sparkles size={12} className="inline mr-1" /> {isRtl ? "نظام التحقق الذكي بالذكاء الاصطناعي" : "Vérification intelligente par IA"}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {isRtl ? "بوابة تأكيد وصولات بريدي موب الذكية" : "BaridiMob Receipt Verification"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-1">
            {isRtl 
              ? "ارفع لقطة شاشة لوصل الدفع وسيقوم الحارس الذكي بمطابقته ببيانات طلبك لتسريع البدء في الطباعة."
              : "Scannez votre reçu de virement pour accélérer le traitement et la livraison de votre commande."}
          </p>
        </div>
        <Link href="/profile" className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-black transition-transform">
          {isRtl ? "عودة للملف الشخصي" : "Mon Profil"}
        </Link>
      </header>

      {orders.length === 0 ? (
        <div className="text-center py-20 premium-glass rounded-[3rem] border border-white/60 dark:border-white/10 shadow-lg">
          <CheckCircle2 size={64} className="mx-auto mb-4 text-emerald-500 animate-pulse" />
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{isRtl ? "لا توجد طلبات معلقة بالدفع" : "Aucune commande en attente"}</h3>
          <p className="text-slate-400 text-xs font-bold max-w-xs mx-auto leading-relaxed mb-6">
            {isRtl ? "كل طلبياتك تم دفعها أو شحنها بالفعل! شكراً لثقتكم بمطبعتنا." : "Toutes vos commandes sont réglées ou livrées. Merci pour votre fidélité !"}
          </p>
          <Link href="/services" className="px-8 py-4 bg-slate-900 dark:bg-accent text-white rounded-2xl font-black text-xs shadow-lg inline-block">
            {isRtl ? "تصفح الخدمات واطلب الآن" : "Commander à nouveau"}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Form Side */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="premium-glass p-6 md:p-8 rounded-[2.5rem] border border-white/60 dark:border-slate-850 shadow-lg space-y-6">
              
              {/* Order Select */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5">
                  {isRtl ? "1. اختر الطلب المعلق بمستحقات الدفع :" : "1. Sélectionner la commande :"}
                </label>
                <div className="relative">
                  <select
                    value={selectedOrderId}
                    onChange={(e) => {
                      setSelectedOrderId(e.target.value);
                      setAiReport(null);
                      setSuccess(false);
                    }}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold appearance-none cursor-pointer"
                  >
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        Order #{o.id.slice(-6).toUpperCase()} - {o.total} DA ({o.status})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-4.5 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              {/* Deposit Required Info */}
              {selectedOrder && requiredAmount > 0 && (
                <div className="bg-amber-550/10 border border-amber-500/20 p-4.5 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h5 className="font-black text-xs text-amber-800 dark:text-amber-400">
                      {isRtl ? "الحد الأدنى لدفعة العربون (Versement) المطلوبة :" : "Versement / Acompte minimum exigé :"}
                    </h5>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      {requiredAmount} DA
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {isRtl 
                        ? `طلبك يتطلب دفع عربون لا يقل عن ${requiredAmount} دج للبدء في التصميم والطباعة. يمكنك دفع المبلغ كاملاً أو قيمة العربون فقط.`
                        : `Pour démarrer la production, un acompte de ${requiredAmount} DA minimum est requis. Vous pouvez payer le total ou l'acompte.`}
                    </p>
                  </div>
                </div>
              )}

              {/* RIP Sender & Transaction details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    {isRtl ? "رقم RIP المرسل (اختياري) :" : "RIP Expéditeur (Optionnel) :"}
                  </label>
                  <input
                    type="text"
                    value={ripSender}
                    onChange={(e) => setRipSender(e.target.value.replace(/\D/g, ""))}
                    placeholder="00799999..."
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    {isRtl ? "رقم العملية (Transaction ID) * :" : "ID Transaction (Obligatoire) * :"}
                  </label>
                  <input
                    type="text"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    placeholder="E.g. 84729184918"
                    required
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none text-xs font-bold focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* File Uploader */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5">
                  {isRtl ? "2. ارفع صورة لقطة الشاشة أو الوصل الورقي :" : "2. Importer le reçu de versement :"}
                </label>
                
                {!receiptPreview ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-3 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 p-8 rounded-2xl text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all flex flex-col items-center justify-center group"
                  >
                    <Upload className="text-slate-400 group-hover:scale-110 transition-transform mb-3" size={28} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{isRtl ? "انقر لاختيار صورة الوصل" : "Sélectionner le reçu"}</span>
                    <span className="text-[10px] text-slate-450 mt-1 font-semibold">PNG, JPG, JPEG</span>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-64 bg-slate-100 dark:bg-slate-900 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={receiptPreview} alt="Receipt proof" className="object-contain max-h-64 w-full" />
                    <button 
                      onClick={() => { setReceiptFile(null); setReceiptPreview(null); setAiReport(null); setSuccess(false); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:scale-105 transition-transform"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Verify Button */}
              <button
                onClick={startScanningProcess}
                disabled={scanning || !receiptFile || !txId}
                className="w-full py-4 bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-700 text-white rounded-2xl font-black text-xs shadow-xl shadow-indigo-500/15 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {scanning ? <Loader2 size={16} className="animate-spin" /> : <Scan size={16} />}
                {isRtl ? "بدء فحص ومطابقة الوصل بالذكاء الاصطناعي" : "Vérifier avec l'IA"}
              </button>

            </div>

          </div>

          {/* Verification Progress Screen / Scanner Overlay */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="premium-glass p-6 md:p-8 rounded-[2.5rem] border border-white/60 dark:border-slate-800 shadow-xl min-h-[380px] flex flex-col justify-between relative overflow-hidden">
              
              {/* Laser Scanning Screen effect */}
              {scanning && (
                <div className="absolute inset-0 z-40 bg-indigo-500/5 pointer-events-none">
                  {/* Glowing line animation */}
                  <motion.div 
                    initial={{ y: "-100%" }}
                    animate={{ y: "100%" }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-full h-1 bg-indigo-400 shadow-[0_0_15px_#6366f1] absolute"
                  />
                </div>
              )}

              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 uppercase flex items-center gap-2">
                  <ShieldCheck size={18} className="text-indigo-500" />
                  {isRtl ? "مراقب التدقيق والذكاء الاصطناعي" : "Auditeur Intelligent"}
                </h3>

                {scanning ? (
                  <div className="space-y-3.5">
                    {scanSteps.map((step, idx) => formatStep(step, idx))}
                  </div>
                ) : aiReport ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    
                    {/* Verdict Badge */}
                    <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
                      aiReport.verdict === "approved" 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                        : aiReport.verdict === "needs_manual_review"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "bg-red-500/10 border-red-500/20 text-red-500"
                    }`}>
                      {aiReport.verdict === "approved" ? (
                        <CheckCircle2 size={24} className="shrink-0" />
                      ) : aiReport.verdict === "needs_manual_review" ? (
                        <AlertTriangle size={24} className="shrink-0" />
                      ) : (
                        <X size={24} className="shrink-0" />
                      )}
                      <div>
                        <h4 className="font-black text-xs uppercase tracking-wide">
                          {aiReport.verdict === "approved" && (isRtl ? "تمت مطابقة الوصل تلقائياً!" : "Validé automatiquement")}
                          {aiReport.verdict === "needs_manual_review" && (isRtl ? "بانتظار تأكيد الإدارة" : "Revue manuelle requise")}
                          {aiReport.verdict === "suspicious" && (isRtl ? "وصل مشبوه أو غير مطابق" : "Reçu suspect ou non conforme")}
                          {aiReport.verdict === "invalid" && (isRtl ? "الصورة لا تمثل وصلاً صالحاً" : "Image invalide / non reconnue")}
                        </h4>
                        <p className="text-[10px] font-bold opacity-80 mt-0.5 leading-relaxed">
                          {aiReport.verdict === "approved" && (isRtl 
                            ? (aiReport.extractedAmount < (selectedOrder?.total || 0) 
                              ? "تم قبول دفعة العربون (Versement) بنجاح وتحويل طلبك للتصنيع." 
                              : "تطابق المبلغ بنسبة 100% وتم تحويل طلبك لقسم التصنيع.") 
                            : (aiReport.extractedAmount < (selectedOrder?.total || 0)
                              ? "Acompte (Versement) validé avec succès, lancement de l'impression."
                              : "Le montant concorde parfaitement, lancement de l'impression."))}
                          {aiReport.verdict === "needs_manual_review" && (isRtl ? "تم إرسال الوصل للمشرفين لمراجعته يدوياً خلال دقائق." : "Le reçu a été transmis aux administrateurs pour validation.")}
                          {aiReport.verdict === "suspicious" && (isRtl ? "فشل التحقق الأمني. يرجى مراجعة الدعم أو رفع وصل آخر." : "Échec du contrôle de sécurité. Veuillez soumettre à nouveau.")}
                          {aiReport.verdict === "invalid" && (isRtl ? "الرجاء رفع صورة واضحة ومباشرة لوصل المعاملة." : "Veuillez charger une capture lisible du virement.")}
                        </p>
                      </div>
                    </div>

                    {/* Comparison Block */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border text-xs font-bold text-slate-650 dark:text-slate-350 space-y-3">
                      
                      {/* Amount Match */}
                      <div className="flex justify-between items-center">
                        <span>{isRtl ? "مبلغ المعاملة :" : "Montant :"}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono">{aiReport.extractedAmount} DA</span>
                          {aiReport.extractedAmount >= requiredAmount ? (
                            <div className="flex items-center gap-1">
                              <Check size={14} className="text-emerald-500" />
                              {aiReport.extractedAmount < (selectedOrder?.total || 0) && (
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1 py-0.5 rounded">
                                  {isRtl ? "عربون مقبول" : "Acompte OK"}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <X size={14} className="text-red-500" />
                              <span className="text-[9px] bg-red-500/10 text-red-500 px-1 py-0.5 rounded font-black">
                                {isRtl ? `أقل من الحد الأدنى (${requiredAmount} دج)` : `Min ${requiredAmount} DA requis`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Transaction ID Match */}
                      <div className="flex justify-between items-center">
                        <span>{isRtl ? "رقم العملية :" : "ID Transaction :"}</span>
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-[10px]">{aiReport.extractedTxId || "Non détecté"}</span>
                          {aiReport.extractedTxId && aiReport.extractedTxId.trim() !== txId.trim() && (
                            <button 
                              onClick={() => setTxId(aiReport.extractedTxId)}
                              className="text-[9px] text-indigo-500 hover:underline mt-0.5"
                            >
                              {isRtl ? "تصحيح للرقم المستخرج" : "Autocorriger l'ID"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* RIP Sender */}
                      {aiReport.extractedSenderRip && (
                        <div className="flex justify-between">
                          <span>{isRtl ? "رقم حساب المرسل :" : "RIP Expéditeur :"}</span>
                          <span className="font-mono">{aiReport.extractedSenderRip}</span>
                        </div>
                      )}

                      {/* Fraud score/Alteration status */}
                      <div className="flex justify-between">
                        <span>{isRtl ? "مؤشر تعديل الصور :" : "Risque de retouche :"}</span>
                        <span className={aiReport.isAltered ? "text-red-500 font-black" : "text-emerald-500 font-bold"}>
                          {aiReport.isAltered ? (isRtl ? "مرتفع جداً (تعديل رقمي)" : "Élevé (Photoshop)") : (isRtl ? "لا يوجد (آمن)" : "Aucun (Image originale)")}
                        </span>
                      </div>

                      {/* Trust index */}
                      <div className="flex justify-between items-center">
                        <span>{isRtl ? "مستوى الثقة :" : "Indice de confiance :"}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          aiReport.confidenceScore > 80 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                        }`}>
                          {aiReport.confidenceScore}%
                        </span>
                      </div>

                    </div>

                    {/* Fraud assessment description */}
                    {aiReport.fraudAssessment && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-[10px] text-slate-500 leading-relaxed font-bold">
                        <strong>AI Note:</strong> {aiReport.fraudAssessment}
                      </div>
                    )}

                    {success && (
                      <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center justify-between text-[11px] font-bold">
                        <span>{isRtl ? "ربحت +50 نقطة مكافأة VIP" : "+50 Points VIP gagnés"}</span>
                        <Link href="/profile" className="text-emerald-600 dark:text-emerald-400 underline">{isRtl ? "عرض محفظتي" : "Voir portefeuille"}</Link>
                      </div>
                    )}

                  </motion.div>
                ) : (
                  <div className="py-14 text-center text-slate-400 space-y-4">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center mx-auto opacity-40">
                      <Scan size={20} />
                    </div>
                    <p className="text-xs font-bold max-w-[200px] mx-auto leading-relaxed">
                      {isRtl 
                        ? "قم بتعبئة بيانات الدفع ورفع وصل بريدي موب على اليسار لتشغيل الماسح الضوئي." 
                        : "Uploadez votre reçu et renseignez l'ID de transaction pour lancer le scan."}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer disclaimer */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 text-[10px] text-slate-400 font-bold leading-relaxed flex items-start gap-2">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                <span>
                  {isRtl 
                    ? "يقوم النظام بمراجعة فورية ومطابقة المبلغ بالذكاء الاصطناعي. أي تلاعب بالوصل يعرض حسابك للحظر النهائي والمساءلة." 
                    : "Toute fausse déclaration ou falsification de reçu entraîne le rejet immédiat et le blocage permanent du compte."}
                </span>
              </div>

            </div>

            {/* Help Card */}
            <div className="bg-gradient-to-tr from-slate-900 to-slate-950 dark:from-slate-900 dark:to-slate-950 p-6 rounded-[2rem] border border-white/10 text-white shadow-lg flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-black text-sm">{isRtl ? "بحاجة لمساعدة في الدفع؟" : "Besoin d'aide ?"}</h4>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                  {isRtl ? "تواصل مع خدمة العملاء لتسهيل الدفع والتوصيل" : "Contactez notre support pour finaliser votre commande."}
                </p>
              </div>
              <a href="tel:+213549179000" className="p-3 bg-emerald-500 text-white rounded-2xl hover:scale-105 active:scale-95 transition-transform shadow-md shrink-0">
                <PhoneCall size={16} />
              </a>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
