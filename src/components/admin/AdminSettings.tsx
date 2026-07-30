import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc, getDocs, where, addDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, AlertTriangle, Megaphone, Truck, CreditCard, Globe, 
  ShoppingBag, Clock, Box, FileWarning, MessageSquare, ShieldCheck, Key, ShieldX, Terminal, Trash2, Download, Loader2, Send, Bell
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface AdminSettingsProps {
  uiConfig: any;
  setUiConfig: (val: any) => void;
  saveUiConfig: (updatedFields: any) => Promise<void>;
}

export default function AdminSettings({
  uiConfig,
  setUiConfig,
  saveUiConfig
}: AdminSettingsProps) {
  // --- Security Audit Logs States ---
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // --- States for Admin Notification Dispatcher ---
  const [notifTitleAr, setNotifTitleAr] = useState("");
  const [notifTitleFr, setNotifTitleFr] = useState("");
  const [notifMsgAr, setNotifMsgAr] = useState("");
  const [notifMsgFr, setNotifMsgFr] = useState("");
  const [notifCategory, setNotifCategory] = useState("system");
  const [notifType, setNotifType] = useState("general");
  const [notifTarget, setNotifTarget] = useState("broadcast"); // "broadcast" | "single"
  const [notifEmail, setNotifEmail] = useState("");
  const [notifLink, setNotifLink] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitleAr.trim() || !notifTitleFr.trim() || !notifMsgAr.trim() || !notifMsgFr.trim()) {
      toast.error("Veuillez remplir tous les champs de titre et message (arabe et français).");
      return;
    }

    if (notifTarget === "single" && !notifEmail.trim()) {
      toast.error("Veuillez saisir l'adresse email de l'utilisateur destinataire.");
      return;
    }

    setSendingNotif(true);
    try {
      const payload = {
        title: { ar: notifTitleAr.trim(), fr: notifTitleFr.trim() },
        message: { ar: notifMsgAr.trim(), fr: notifMsgFr.trim() },
        category: notifCategory,
        type: notifType,
        read: false,
        link: notifLink.trim() || null,
        date: serverTimestamp()
      };

      if (notifTarget === "single") {
        const q = query(collection(db, "users"), where("email", "==", notifEmail.trim().toLowerCase()));
        const querySnap = await getDocs(q);
        if (querySnap.empty) {
          toast.error("Aucun utilisateur trouvé avec cette adresse email.");
          setSendingNotif(false);
          return;
        }
        
        const targetUserId = querySnap.docs[0].id;
        await addDoc(collection(db, `users/${targetUserId}/notifications`), payload);
        toast.success("Notification envoyée avec succès à l'utilisateur !");
      } else {
        // Broadcast
        const usersSnap = await getDocs(collection(db, "users"));
        if (usersSnap.empty) {
          toast.error("Aucun utilisateur inscrit dans la base de données pour diffuser.");
          setSendingNotif(false);
          return;
        }

        const batch = writeBatch(db);
        usersSnap.docs.forEach(userDoc => {
          const notifRef = doc(collection(db, `users/${userDoc.id}/notifications`));
          batch.set(notifRef, payload);
        });
        await batch.commit();
        toast.success(`Notification diffusée avec succès à ${usersSnap.size} utilisateurs !`);
      }

      // Reset form
      setNotifTitleAr("");
      setNotifTitleFr("");
      setNotifMsgAr("");
      setNotifMsgFr("");
      setNotifEmail("");
      setNotifLink("");
    } catch (err: any) {
      console.error("Error sending notification:", err);
      toast.error(`Erreur: ${err.message || "Impossible d'envoyer"}`);
    } finally {
      setSendingNotif(false);
    }
  };

  // Fetch security logs in real-time
  useEffect(() => {
    const q = query(collection(db, "securityLogs"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snap) => {
      setSecurityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingLogs(false);
    }, (err) => {
      console.error("Error loading security logs:", err);
      setLoadingLogs(false);
    });
    return () => unsubscribe();
  }, []);

  const exportSecurityLogs = () => {
    try {
      const logsToExport = securityLogs.map((log) => ({
        ID: log.id,
        Evenement: log.event,
        Email: log.email || "Anonyme",
        Date: log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : "Récemment",
        Type: log.type || "System",
        Statut: log.status || "N/A",
        Details: log.details || ""
      }));
      const ws = XLSX.utils.json_to_sheet(logsToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Security Logs");
      XLSX.writeFile(wb, "ArtisanImprimeur_Security_Logs.xlsx");
      toast.success("Sujets de sécurité exportés avec succès !");
    } catch (e) {
      toast.error("Erreur lors de l'exportation");
    }
  };

  const clearSecurityLogs = async () => {
    if (confirm("Voulez-vous vraiment vider tout le journal d'audit de sécurité ? Cette action est irréversible.")) {
      try {
        const q = query(collection(db, "securityLogs"));
        const snap = await getDocs(q);
        const promises = snap.docs.map(docSnap => deleteDoc(doc(db, "securityLogs", docSnap.id)));
        await Promise.all(promises);
        toast.success("Journal de sécurité entièrement vidé !");
      } catch (e) {
        toast.error("Erreur lors de la suppression des logs");
      }
    }
  };
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="max-w-2xl mx-auto space-y-6"
    >
      
      {/* 🛡️ 1. الحماية ووضعية الصيانة */}
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-2xl space-y-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <ShieldAlert size={28} className="text-red-500"/> Sécurité & Maintenance
        </h3>
        
        {/* Mode Maintenance */}
        <div className="flex items-center justify-between bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-colors">
          <div>
            <h4 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
              <AlertTriangle className={uiConfig.maintenanceMode ? "text-red-500 animate-pulse" : "text-slate-400"} size={20} />
              Mode Maintenance
            </h4>
            <p className="text-xs text-slate-500 mt-1">Activer pour restreindre l'accès au site complet aux visiteurs.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={uiConfig.maintenanceMode || false} 
              onChange={(e) => {
                saveUiConfig({ maintenanceMode: e.target.checked });
                toast.success(e.target.checked ? "Mode maintenance ACTIVÉ" : "Mode maintenance DÉSACTIVÉ");
              }}
              className="sr-only peer" 
            />
            <div className="w-14 h-7 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500 shadow-inner"></div>
          </label>
        </div>

        {/* Separator */}
        <div className="h-px bg-slate-200 dark:bg-slate-700/80 my-4" />

        {/* Captcha settings */}
        <div className="space-y-4">
          <h4 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            🛡️ Sécurité des Formulaires (CAPTCHA)
          </h4>
          <p className="text-xs text-slate-500">
            Sécurisez les pages de connexion et de validation du panier contre le spam et les attaques automatisées.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">
                Type de Protection
              </label>
              <select
                value={uiConfig.captchaMode || "slider"}
                onChange={(e) => {
                  saveUiConfig({ captchaMode: e.target.value });
                  toast.success(`Mode CAPTCHA mis à jour : ${e.target.value}`);
                }}
                className="w-full p-3 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <option value="disabled">Désactivé (Aucune protection) / غير مفعّل</option>
                <option value="slider">Visual Slider CAPTCHA (Recommandé) / السحب التفاعلي</option>
                <option value="recaptcha">Google reCAPTCHA v2 / ريكابتشا v2</option>
                <option value="recaptcha_v3">Google reCAPTCHA v3 (Invisible) / ريكابتشا v3 غير المرئية</option>
              </select>
            </div>

            {(uiConfig.captchaMode === "recaptcha" || uiConfig.captchaMode === "recaptcha_v3") && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"
              >
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">
                    Clé du Site Google reCAPTCHA
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ex: 6Ld..."
                    value={uiConfig.recaptchaSiteKey || ''} 
                    onChange={(e)=>setUiConfig({...uiConfig, recaptchaSiteKey: e.target.value})}
                    onBlur={()=> {
                      saveUiConfig({ recaptchaSiteKey: uiConfig.recaptchaSiteKey });
                      toast.success("Clé du site enregistrée !");
                    }}
                    className="w-full p-3 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors text-xs font-mono text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">
                    Clé Secrète Google reCAPTCHA
                  </label>
                  <input 
                    type="password" 
                    placeholder="••••••••••••••••"
                    value={uiConfig.recaptchaSecretKey || ''} 
                    onChange={(e)=>setUiConfig({...uiConfig, recaptchaSecretKey: e.target.value})}
                    onBlur={()=> {
                      saveUiConfig({ recaptchaSecretKey: uiConfig.recaptchaSecretKey });
                      toast.success("Clé secrète enregistrée !");
                    }}
                    className="w-full p-3 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors text-xs font-mono text-slate-800 dark:text-slate-100"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* 📢 2. شريط الإعلانات العلوي */}
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
          <h4 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <Megaphone className="text-blue-500" size={20} /> Bannière d'Annonce
          </h4>
          <label className="relative inline-flex items-center cursor-pointer">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-3">Afficher</span>
            <input 
              type="checkbox" 
              checked={uiConfig.showAnnouncement || false} 
              onChange={(e) => {
                saveUiConfig({ showAnnouncement: e.target.checked });
                toast.success(e.target.checked ? "Bannière affichée" : "Bannière masquée");
              }}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500 shadow-inner"></div>
          </label>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Message (Arabe)</label>
            <input 
              type="text" 
              placeholder="رسالة الإعلان بالعربية"
              value={uiConfig.announcementAr || ''} 
              onChange={(e)=>setUiConfig({...uiConfig, announcementAr: e.target.value})}
              onBlur={()=> {
                saveUiConfig({ announcementAr: uiConfig.announcementAr });
                toast.success("Annonce Arabe enregistrée !");
              }}
              className="w-full p-3 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors text-slate-800 dark:text-slate-100"
              dir="rtl"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Message (Français)</label>
            <input 
              type="text" 
              placeholder="Message d'annonce en Français"
              value={uiConfig.announcementFr || ''} 
              onChange={(e)=>setUiConfig({...uiConfig, announcementFr: e.target.value})}
              onBlur={()=> {
                saveUiConfig({ announcementFr: uiConfig.announcementFr });
                toast.success("Annonce Française enregistrée !");
              }}
              className="w-full p-3 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* 🚚 3. أسعار التوصيل المرجعية (أورون/الوطني/المحلي) */}
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-2xl space-y-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <Truck size={28} className="text-orange-500"/> Tarifs de Livraison (Yalidine & Local Moto)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Tarif Yalidine Oran (DA)</label>
            <input 
              type="number" 
              value={uiConfig.shippingOran || 400} 
              onChange={(e)=>setUiConfig({...uiConfig, shippingOran: Number(e.target.value)})}
              onBlur={()=> {
                saveUiConfig({ shippingOran: uiConfig.shippingOran });
                toast.success("Tarif de livraison Oran mis à jour !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Tarif Yalidine National (DA)</label>
            <input 
              type="number" 
              value={uiConfig.shippingNational || 600} 
              onChange={(e)=>setUiConfig({...uiConfig, shippingNational: Number(e.target.value)})}
              onBlur={()=> {
                saveUiConfig({ shippingNational: uiConfig.shippingNational });
                toast.success("Tarif de livraison National mis à jour !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Tarif Moto - Oran Centre (DA)</label>
            <input 
              type="number" 
              value={uiConfig.shippingLocalOran || 150} 
              onChange={(e)=>setUiConfig({...uiConfig, shippingLocalOran: Number(e.target.value)})}
              onBlur={()=> {
                saveUiConfig({ shippingLocalOran: uiConfig.shippingLocalOran });
                toast.success("Tarif Moto Oran Centre mis à jour !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Tarif Moto - Oran Périphérie (DA)</label>
            <input 
              type="number" 
              value={uiConfig.shippingLocalBordering || 350} 
              onChange={(e)=>setUiConfig({...uiConfig, shippingLocalBordering: Number(e.target.value)})}
              onBlur={()=> {
                saveUiConfig({ shippingLocalBordering: uiConfig.shippingLocalBordering });
                toast.success("Tarif Moto Oran Périphérie mis à jour !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* 💳 4. إعدادات حساب Baridimob والدفع الإلكتروني */}
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-2xl space-y-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <CreditCard size={28} className="text-yellow-500"/> Informations Baridimob
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Nom du Titulaire (صاحب الحساب)</label>
            <input 
              type="text" 
              placeholder="Ex: BENMOHAMED AMINE"
              value={uiConfig.baridimobName || ''} 
              onChange={(e)=>setUiConfig({...uiConfig, baridimobName: e.target.value})}
              onBlur={()=> {
                saveUiConfig({ baridimobName: uiConfig.baridimobName });
                toast.success("Nom du titulaire enregistré !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold uppercase text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Numéro RIP (رقم الحساب)</label>
            <input 
              type="text" 
              placeholder="007999990023XXXXXXXX"
              value={uiConfig.baridimobRip || ''} 
              onChange={(e)=>setUiConfig({...uiConfig, baridimobRip: e.target.value})}
              onBlur={()=> {
                saveUiConfig({ baridimobRip: uiConfig.baridimobRip });
                toast.success("RIP Baridimob enregistré !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-mono font-bold text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="md:col-span-2 h-px bg-slate-200 dark:bg-slate-700/80 my-2" />
          
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Type d'acompte (Versement)</label>
            <select
              value={uiConfig.baridimobMinDepositType || "none"}
              onChange={(e) => {
                saveUiConfig({ baridimobMinDepositType: e.target.value });
                toast.success(`Type de versement mis à jour : ${e.target.value}`);
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="none">Pas d'acompte (Paiement total exigé) / دفع كامل المبلغ</option>
              <option value="percentage">Pourcentage du total (%) / نسبة مئوية من الطلب</option>
              <option value="fixed">Montant fixe (DA) / قيمة ثابتة بالدينار</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Valeur de l'acompte (Versement)</label>
            <input 
              type="number" 
              placeholder="Ex: 50 ou 1000"
              value={uiConfig.baridimobMinDepositValue || 0} 
              disabled={uiConfig.baridimobMinDepositType === "none" || !uiConfig.baridimobMinDepositType}
              onChange={(e)=>setUiConfig({...uiConfig, baridimobMinDepositValue: Number(e.target.value)})}
              onBlur={()=> {
                saveUiConfig({ baridimobMinDepositValue: uiConfig.baridimobMinDepositValue });
                toast.success("Valeur du versement sauvegardée !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-850 border border-slate-205 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-slate-800 dark:text-slate-100 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* 📞 5. معلومات الاتصال وحسابات السوشيال ميديا */}
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-2xl space-y-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <Globe size={28} className="text-blue-500"/> Contact & Réseaux Sociaux
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Numéro de Téléphone</label>
            <input 
              type="text" 
              placeholder="0555xxXXxx"
              value={uiConfig.shopPhone || ''} 
              onChange={(e)=>setUiConfig({...uiConfig, shopPhone: e.target.value})}
              onBlur={()=> {
                saveUiConfig({ shopPhone: uiConfig.shopPhone });
                toast.success("Numéro de téléphone enregistré !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Adresse Physique de l'Atelier</label>
            <input 
              type="text" 
              placeholder="Ex: Cité Akid Lotfi, Oran"
              value={uiConfig.shopAddress || ''} 
              onChange={(e)=>setUiConfig({...uiConfig, shopAddress: e.target.value})}
              onBlur={()=> {
                saveUiConfig({ shopAddress: uiConfig.shopAddress });
                toast.success("Adresse de l'atelier enregistrée !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Lien Page Facebook</label>
            <input 
              type="text" 
              placeholder="https://facebook.com/votrepage"
              value={uiConfig.facebookUrl || ''} 
              onChange={(e)=>setUiConfig({...uiConfig, facebookUrl: e.target.value})}
              onBlur={()=> {
                saveUiConfig({ facebookUrl: uiConfig.facebookUrl });
                toast.success("Lien Facebook mis à jour !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors text-xs text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Lien Page Instagram</label>
            <input 
              type="text" 
              placeholder="https://instagram.com/votrecompte"
              value={uiConfig.instagramUrl || ''} 
              onChange={(e)=>setUiConfig({...uiConfig, instagramUrl: e.target.value})}
              onBlur={()=> {
                saveUiConfig({ instagramUrl: uiConfig.instagramUrl });
                toast.success("Lien Instagram mis à jour !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors text-xs text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* 🛒 6. قيود وشروط سلة المشتريات */}
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-2xl space-y-4">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <ShoppingBag size={28} className="text-purple-500"/> Restrictions du Panier
        </h3>
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Montant Minimum pour Commander (DA)</label>
          <input 
            type="number" 
            placeholder="Ex: 1000"
            value={uiConfig.minOrderAmount || 0} 
            onChange={(e)=>setUiConfig({...uiConfig, minOrderAmount: Number(e.target.value)})}
            onBlur={()=> {
              saveUiConfig({ minOrderAmount: uiConfig.minOrderAmount });
              toast.success("Montant minimum sauvegardé !");
            }}
            className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* ⏱️ 7. ساعات العمل وحالة المتجر */}
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Clock size={28} className="text-indigo-500"/> Ouverture & Fermeture
          </h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-3">Accepter les commandes</span>
            <input 
              type="checkbox" 
              checked={uiConfig.storeOpen ?? true} 
              onChange={(e) => {
                saveUiConfig({ storeOpen: e.target.checked });
                toast.success(e.target.checked ? "Boutique OUVERTE aux commandes" : "Boutique FERMÉE (Consultation uniquement)");
              }}
              className="sr-only peer" 
            />
            <div className="w-14 h-7 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-500 shadow-inner"></div>
          </label>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Message de fermeture (affiché au panier)</label>
          <input 
            type="text" 
            placeholder="Ex: Nous sommes fermés pour le week-end."
            value={uiConfig.closedMessage || ''} 
            onChange={(e)=>setUiConfig({...uiConfig, closedMessage: e.target.value})}
            onBlur={()=> {
              saveUiConfig({ closedMessage: uiConfig.closedMessage });
              toast.success("Message de fermeture sauvegardé !");
            }}
            className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* 📦 8. إعدادات التوصيل المتقدمة و Click-and-Collect */}
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-2xl space-y-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <Box size={28} className="text-amber-600"/> Options de Livraison & Click-and-Collect
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-amber-50/50 dark:bg-amber-950/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex flex-col justify-center">
            <p className="text-sm font-black text-amber-800 dark:text-amber-400">التوصيل متوفر للمنزل & الاستلام من المستودع</p>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              تم إيقاف خيار مكاتب الشحن. الحساب يتم ديناميكياً لكل ولاية من الولايات الـ 58. يمكن للزبون اختيار الدفع عند الاستلام عبر التوصيل السريع Moto في وهران أو المجيء للمقر (Click & Collect).
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Livraison Gratuite à partir de (DA)</label>
            <input 
              type="number" 
              placeholder="Ex: 15000"
              value={uiConfig.freeShippingThreshold || 0} 
              onChange={(e)=>setUiConfig({...uiConfig, freeShippingThreshold: Number(e.target.value)})}
              onBlur={()=> {
                saveUiConfig({ freeShippingThreshold: uiConfig.freeShippingThreshold });
                toast.success("Seuil de livraison gratuite mis à jour !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-emerald-600"
            />
            <p className="text-[10px] text-slate-400 mt-1 font-bold">Mettre 0 pour désactiver la gratuité.</p>
          </div>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Instructions de Retrait (Click & Collect - المقر ومواعيد العمل)</label>
          <input 
            type="text" 
            placeholder="Ex: Cité Akid Lotfi, Oran - Près de la Mosquée El Qods (Ouvert de 09:00 à 18:00)"
            value={uiConfig.collectInstructions || ''} 
            onChange={(e)=>setUiConfig({...uiConfig, collectInstructions: e.target.value})}
            onBlur={()=> {
              saveUiConfig({ collectInstructions: uiConfig.collectInstructions });
              toast.success("Instructions de retrait enregistrées !");
            }}
            className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors text-slate-800 dark:text-slate-100 font-bold"
          />
        </div>
      </div>

      {/* 📁 9. ضوابط رفع ملفات التصميم */}
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-2xl space-y-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <FileWarning size={28} className="text-rose-500"/> Fichiers de Conception
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Taille Max par fichier (MB)</label>
            <input 
              type="number" 
              placeholder="Ex: 50"
              value={uiConfig.maxFileSize || 20} 
              onChange={(e)=>setUiConfig({...uiConfig, maxFileSize: Number(e.target.value)})}
              onBlur={()=> {
                saveUiConfig({ maxFileSize: uiConfig.maxFileSize });
                toast.success("Taille max autorisée mise à jour !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-bold text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Extensions Autorisées</label>
            <input 
              type="text" 
              placeholder="pdf, ai, psd, png, jpg"
              value={uiConfig.allowedExtensions || 'pdf, ai, psd, png, jpg'} 
              onChange={(e)=>setUiConfig({...uiConfig, allowedExtensions: e.target.value})}
              onBlur={()=> {
                saveUiConfig({ allowedExtensions: uiConfig.allowedExtensions });
                toast.success("Extensions mises à jour !");
              }}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-mono text-sm text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* 💬 10. قوالب رسائل الواتساب */}
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-2xl space-y-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <MessageSquare size={28} className="text-teal-500"/> Modèles de Messages (WhatsApp)
        </h3>
        <p className="text-xs text-slate-500 font-bold mb-4">Ces messages seront utilisés comme modèles rapides lors du contact client.</p>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Message: Commande Prête</label>
            </div>
            <textarea 
              rows={2}
              value={uiConfig.msgOrderReady || "Bonjour ! Votre commande chez L'Artisan Imprimeur est prête. Merci de nous contacter pour la livraison."} 
              onChange={(e)=>setUiConfig({...uiConfig, msgOrderReady: e.target.value})}
              onBlur={()=> { saveUiConfig({ msgOrderReady: uiConfig.msgOrderReady }); }}
              className="w-full p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors text-sm text-slate-800 dark:text-slate-100"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-end mb-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Message: Validation BAT (Bon à tirer)</label>
            </div>
            <textarea 
              rows={2}
              value={uiConfig.msgValidationBAT || "Bonjour, veuillez trouver ci-joint le Bon à Tirer (BAT) de votre design. Merci de confirmer pour lancer l'impression."} 
              onChange={(e)=>setUiConfig({...uiConfig, msgValidationBAT: e.target.value})}
              onBlur={()=> { saveUiConfig({ msgValidationBAT: uiConfig.msgValidationBAT }); }}
              className="w-full p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors text-sm text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* 📢 لوحة إرسال الإشعارات المباشرة */}
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
            <Megaphone size={28} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              Direct Notification Dispatcher
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Envoyez ou diffusez des notifications bilingues en temps réel à vos clients inscrits.
            </p>
          </div>
        </div>

        <form onSubmit={handleSendNotification} className="space-y-4">
          {/* Target Selector */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setNotifTarget("broadcast")}
              className={`py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${notifTarget === 'broadcast' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              🚀 Diffusion Générale (Tous)
            </button>
            <button
              type="button"
              onClick={() => setNotifTarget("single")}
              className={`py-3 rounded-xl text-xs font-black transition-all cursor-pointer ${notifTarget === 'single' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              👤 Destinataire Unique (Email)
            </button>
          </div>

          <AnimatePresence>
            {notifTarget === "single" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 overflow-hidden"
              >
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Email de l'utilisateur</label>
                <input
                  type="email"
                  required
                  placeholder="nom@exemple.com"
                  value={notifEmail}
                  onChange={(e) => setNotifEmail(e.target.value)}
                  className="w-full p-3.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent text-sm text-slate-800 dark:text-slate-100"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bilingual Titles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Titre (Français)</label>
              <input
                type="text"
                required
                placeholder="Votre commande est expédiée !"
                value={notifTitleFr}
                onChange={(e) => setNotifTitleFr(e.target.value)}
                className="w-full p-3.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent text-sm text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1 text-right" dir="rtl">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-2">العنوان (بالعربية)</label>
              <input
                type="text"
                required
                placeholder="تم شحن طلبيتك بنجاح !"
                value={notifTitleAr}
                onChange={(e) => setNotifTitleAr(e.target.value)}
                className="w-full p-3.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent text-sm text-slate-800 dark:text-slate-100 text-right"
              />
            </div>
          </div>

          {/* Bilingual Messages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Message (Français)</label>
              <textarea
                rows={3}
                required
                placeholder="Votre colis est en route. Suivez la livraison..."
                value={notifMsgFr}
                onChange={(e) => setNotifMsgFr(e.target.value)}
                className="w-full p-3.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent text-sm text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1 text-right" dir="rtl">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-2">النص (بالعربية)</label>
              <textarea
                rows={3}
                required
                placeholder="طريدك في الطريق إليك الآن. يمكنك تتبعه..."
                value={notifMsgAr}
                onChange={(e) => setNotifMsgAr(e.target.value)}
                className="w-full p-3.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent text-sm text-slate-800 dark:text-slate-100 text-right"
              />
            </div>
          </div>

          {/* Category & Type & Link */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Catégorie</label>
              <select
                value={notifCategory}
                onChange={(e) => setNotifCategory(e.target.value)}
                className="w-full p-3.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent text-sm text-slate-800 dark:text-slate-100"
              >
                <option value="system">Système / Promo</option>
                <option value="orders">Commandes</option>
                <option value="billing">Facturation</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Type d'icône</label>
              <select
                value={notifType}
                onChange={(e) => setNotifType(e.target.value)}
                className="w-full p-3.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent text-sm text-slate-800 dark:text-slate-100"
              >
                <option value="general">Général (Bell)</option>
                <option value="shipping">Livraison (Truck)</option>
                <option value="promo">Promo / Cadeau (Sparkles)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Lien d'action (Optionnel)</label>
              <input
                type="text"
                placeholder="/rewards"
                value={notifLink}
                onChange={(e) => setNotifLink(e.target.value)}
                className="w-full p-3.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent text-sm text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={sendingNotif}
              className="px-6 py-3.5 bg-accent hover:bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              {sendingNotif ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Diffuser la notification
            </button>
          </div>
        </form>
      </div>

      {/* 🛡️ لوحة التدقيق الأمني وسجل العمليات الحية */}
      <div className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <Terminal size={28} className="text-indigo-500 animate-pulse"/> Journal d'Audit de Sécurité
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Surveillance en temps réel des tentatives de connexion, blocages de sécurité et activités sensibles.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={exportSecurityLogs}
              className="p-2.5 bg-indigo-500 hover:bg-indigo-650 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
            >
              <Download size={14} /> Exporter en Excel
            </button>
            <button
              onClick={clearSecurityLogs}
              className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-black transition-all flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
            >
              <Trash2 size={14} /> Vider
            </button>
          </div>
        </div>

        {loadingLogs ? (
          <div className="flex items-center justify-center py-12 gap-2 text-sm text-slate-500 font-bold">
            <Loader2 className="animate-spin text-indigo-500" size={20} />
            <span>Chargement des logs de sécurité...</span>
          </div>
        ) : securityLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
            🛡️ Aucun événement de sécurité enregistré pour le moment.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            <AnimatePresence mode="popLayout">
              {securityLogs.map((log) => {
                const isSuccess = log.status === "success";
                const isLockout = log.event === "brute_force_lockout";
                const isFailed = log.status === "failed";
                
                let badgeColor = "bg-blue-500/10 text-blue-500 border-blue-500/20";
                let icon = <ShieldCheck size={14} />;
                if (isLockout) {
                  badgeColor = "bg-red-950/30 text-red-400 border-red-500/30 animate-pulse";
                  icon = <ShieldAlert size={14} />;
                } else if (isFailed) {
                  badgeColor = "bg-red-500/10 text-red-500 border-red-500/20";
                  icon = <ShieldX size={14} />;
                } else if (isSuccess) {
                  badgeColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                }

                const dateStr = log.timestamp?.seconds 
                  ? new Date(log.timestamp.seconds * 1000).toLocaleString() 
                  : "Récemment";

                return (
                  <motion.div
                    key={log.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div className="space-y-1.5 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border flex items-center gap-1 ${badgeColor}`}>
                          {icon}
                          {log.event.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {dateStr}
                        </span>
                      </div>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {log.email || "Utilisateur anonyme"}
                      </p>
                      {log.details && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {log.details}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 shrink-0">
                      {log.type || "System"}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

    </motion.div>
  );
}
