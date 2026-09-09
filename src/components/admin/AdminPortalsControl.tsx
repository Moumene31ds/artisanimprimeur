"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, query, orderBy, onSnapshot, doc, updateDoc, 
  deleteDoc 
} from "firebase/firestore";
import { 
  Briefcase, Palette, Power, CheckCircle2, Clock, 
  MessageSquare, Phone, Trash2, Download, ExternalLink, 
  Building2, Users, HandCoins, ShieldCheck, Filter, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { exportCsv } from "@/lib/csv-export";
import { triggerHapticFeedback } from "@/lib/utils";

interface AdminPortalsControlProps {
  uiConfig: any;
  saveUiConfig: (updatedFields: any) => Promise<void>;
  isRtl?: boolean;
}

export default function AdminPortalsControl({
  uiConfig,
  saveUiConfig,
  isRtl = true,
}: AdminPortalsControlProps) {
  const [activeSubTab, setActiveSubTab] = useState<"b2b" | "designers">("b2b");
  
  // Leads state
  const [b2bLeads, setB2bLeads] = useState<any[]>([]);
  const [designerLeads, setDesignerLeads] = useState<any[]>([]);
  const [loadingB2b, setLoadingB2b] = useState(true);
  const [loadingDesigners, setLoadingDesigners] = useState(true);

  // Settings form states
  const [b2bDiscount, setB2bDiscount] = useState<number>(uiConfig.b2bCorporateDiscount ?? 15);
  const [b2bMinOrder, setB2bMinOrder] = useState<number>(uiConfig.b2bMinOrderAmount ?? 25000);
  const [b2bCreditLimit, setB2bCreditLimit] = useState<number>(uiConfig.b2bDefaultCreditLimit ?? 250000);
  const [designerCommission, setDesignerCommission] = useState<number>(uiConfig.designerCommissionRate ?? 20);

  // Subscribe to B2B Leads
  useEffect(() => {
    const q = query(collection(db, "b2b_leads"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setB2bLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingB2b(false);
    }, (err) => {
      console.warn("b2b_leads fetch error:", err);
      setLoadingB2b(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to Designer Leads
  useEffect(() => {
    const q = query(collection(db, "designer_leads"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setDesignerLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingDesigners(false);
    }, (err) => {
      console.warn("designer_leads fetch error:", err);
      setLoadingDesigners(false);
    });
    return () => unsub();
  }, []);

  // Toggle Portal Status
  const handleToggleB2B = async () => {
    const nextStatus = !(uiConfig.b2bEnabled === true);
    await saveUiConfig({ b2bEnabled: nextStatus });
    toast.success(
      nextStatus 
        ? (isRtl ? "تم تفعيل بوابة الشركات B2B مباشرة للجمهور!" : "Portail B2B activé pour le public !")
        : (isRtl ? "تم تحويل بوابة الشركات إلى وضع (قريباً - Coming Soon)" : "Portail B2B passé en mode 'Bientôt'")
    );
  };

  const handleToggleDesigners = async () => {
    const nextStatus = !(uiConfig.designersEnabled === true);
    await saveUiConfig({ designersEnabled: nextStatus });
    toast.success(
      nextStatus 
        ? (isRtl ? "تم تفعيل سوق المصممين مباشرة للجمهور!" : "Marketplace Designers activée pour le public !")
        : (isRtl ? "تم تحويل سوق المصممين إلى وضع (قريباً - Coming Soon)" : "Marketplace Designers passée en mode 'Bientôt'")
    );
  };

  // Save Portal Parameters
  const handleSaveParameters = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveUiConfig({
      b2bCorporateDiscount: Number(b2bDiscount),
      b2bMinOrderAmount: Number(b2bMinOrder),
      b2bDefaultCreditLimit: Number(b2bCreditLimit),
      designerCommissionRate: Number(designerCommission),
    });
    toast.success(isRtl ? "تم حفظ معايير البوابات بنجاح!" : "Paramètres sauvegardés avec succès !");
  };

  // Update Lead Status
  const handleUpdateLeadStatus = async (col: "b2b_leads" | "designer_leads", id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, col, id), { status: newStatus });
      toast.success(isRtl ? "تم تحديث حالة الطلب" : "Statut mis à jour");
    } catch {
      toast.error("Erreur de mise à jour");
    }
  };

  // Delete Lead
  const handleDeleteLead = async (col: "b2b_leads" | "designer_leads", id: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من حذف هذا الطلب نهائياً؟" : "Supprimer définitivement cette demande ?")) return;
    try {
      await deleteDoc(doc(db, col, id));
      toast.success(isRtl ? "تم حذف الطلب" : "Demande supprimée");
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  // Export B2B Leads to CSV
  const exportB2BToCSV = () => {
    const data = b2bLeads.map((l) => ({
      Entreprise: l.companyName,
      RC: l.rcNumber || "N/A",
      Wilaya: l.wilaya,
      Contact: l.contactName,
      Poste: l.contactRole || "N/A",
      Telephone: l.phone,
      Email: l.email || "N/A",
      VolumeEstime: l.monthlyVolume || "N/A",
      Status: l.status,
      Date: l.createdAt?.toDate ? l.createdAt.toDate().toLocaleDateString("fr-CA") : "N/A",
    }));
    exportCsv(`LArtisan_B2B_Leads_${new Date().toISOString().slice(0, 10)}`, data);
    toast.success("Export B2B Excel généré !");
  };

  // Export Designer Leads to CSV
  const exportDesignersToCSV = () => {
    const data = designerLeads.map((l) => ({
      Designer: l.designerName,
      Portfolio: l.portfolioUrl,
      Specialite: l.specialty,
      Wilaya: l.wilaya,
      Telephone: l.phone,
      Email: l.email || "N/A",
      Status: l.status,
      Date: l.createdAt?.toDate ? l.createdAt.toDate().toLocaleDateString("fr-CA") : "N/A",
    }));
    exportCsv(`LArtisan_Designers_Leads_${new Date().toISOString().slice(0, 10)}`, data);
    toast.success("Export Designers Excel généré !");
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Master Activation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. B2B Corporate Portal Control Card */}
        <div className={`p-6 sm:p-8 rounded-[2rem] border transition-all shadow-xl ${
          uiConfig.b2bEnabled === true 
            ? "bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border-blue-500/40 shadow-blue-500/10"
            : "bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
        }`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shadow-inner">
                <Briefcase size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {isRtl ? "بوابة الشركات B2B" : "Espace Entreprises B2B"}
                </h3>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {uiConfig.b2bEnabled === true 
                    ? (isRtl ? "الحالة: مفعلة ومتاحة للجمهور ✓" : "Statut : ACTIF EN LIGNE ✓")
                    : (isRtl ? "الحالة: وضع (قريباً - Coming Soon) ⏳" : "Statut : MODE 'BIENTÔT' ⏳")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleB2B}
              className={`px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                uiConfig.b2bEnabled === true
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-amber-500 text-slate-950 hover:bg-amber-600"
              }`}
            >
              <Power size={14} />
              {uiConfig.b2bEnabled === true
                ? (isRtl ? "تحويل إلى (قريباً)" : "Passer en Bientôt")
                : (isRtl ? "تفعيل البوابة مباشرة" : "Activer en Ligne")}
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {isRtl 
              ? "عند ضبطها على (قريباً)، تظهر صفحة تشويقية فاخرة للشركات مع استمارة حجز مسبق (Waitlist). عند تفعيلها، تصبح منصة الفوترة وإدارة الفروع متاحة فوراً."
              : "En mode 'Bientôt', une page teaser VIP s'affiche avec formulaire de pré-inscription. Une fois activée, le portail B2B complet devient accessible."}
          </p>

          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400">{isRtl ? "طلبات الانضمام المسجلة:" : "Demandes reçues :"}</span>
            <span className="font-black text-blue-500 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
              {b2bLeads.length} {isRtl ? "مؤسسة" : "entreprises"}
            </span>
          </div>
        </div>

        {/* 2. Designers Marketplace Control Card */}
        <div className={`p-6 sm:p-8 rounded-[2rem] border transition-all shadow-xl ${
          uiConfig.designersEnabled === true 
            ? "bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40 shadow-amber-500/10"
            : "bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
        }`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
                <Palette size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {isRtl ? "سوق المصممين المستقلين" : "Marketplace Designers"}
                </h3>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {uiConfig.designersEnabled === true 
                    ? (isRtl ? "الحالة: مفعل ومتاح للجمهور ✓" : "Statut : ACTIF EN LIGNE ✓")
                    : (isRtl ? "الحالة: وضع (قريباً - Coming Soon) ⏳" : "Statut : MODE 'BIENTÔT' ⏳")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleDesigners}
              className={`px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                uiConfig.designersEnabled === true
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-600"
                  : "bg-amber-500 text-slate-950 hover:bg-amber-600"
              }`}
            >
              <Power size={14} />
              {uiConfig.designersEnabled === true
                ? (isRtl ? "تحويل إلى (قريباً)" : "Passer en Bientôt")
                : (isRtl ? "تفعيل السوق مباشرة" : "Activer en Ligne")}
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {isRtl 
              ? "عند ضبطه على (قريباً)، تظهر واجهة مخصصة لاستقطاب المصممين الشركاء وحساب العمولات. عند تفعيله، يتمكن العملاء من شراء القوالب ودفع العمولات."
              : "En mode 'Bientôt', une vitrine d'inscription créateurs s'affiche. En mode actif, le catalogue de modèles devient achetable directement."}
          </p>

          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400">{isRtl ? "المصممون المسجلون في الانتظار:" : "Créateurs inscrits :"}</span>
            <span className="font-black text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
              {designerLeads.length} {isRtl ? "مصمم" : "designers"}
            </span>
          </div>
        </div>

      </div>

      {/* Global Parameters Adjustment Form */}
      <form onSubmit={handleSaveParameters} className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
          {isRtl ? "إعدادات ومعايير التشغيل للبوابتين" : "Paramètres Opérationnels des Portails"}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              {isRtl ? "نسبة خصم الشركات B2B (%)" : "Remise B2B (%)"}
            </label>
            <input
              type="number"
              min={0}
              max={50}
              value={b2bDiscount}
              onChange={(e) => setB2bDiscount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              {isRtl ? "الحد الأدنى لطلب الشركات (DA)" : "Minimum Commande B2B (DA)"}
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={b2bMinOrder}
              onChange={(e) => setB2bMinOrder(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              {isRtl ? "سقف الائتمان الافتراضي للفواتير (DA)" : "Plafond Crédit Facture (DA)"}
            </label>
            <input
              type="number"
              min={0}
              step={10000}
              value={b2bCreditLimit}
              onChange={(e) => setB2bCreditLimit(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              {isRtl ? "عمولة المنصة على تصاميم الماركت (%)" : "Com. Plateforme Designers (%)"}
            </label>
            <input
              type="number"
              min={5}
              max={50}
              value={designerCommission}
              onChange={(e) => setDesignerCommission(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black hover:opacity-90 transition-all cursor-pointer shadow-md"
          >
            {isRtl ? "حفظ التعديلات" : "Enregistrer les paramètres"}
          </button>
        </div>
      </form>

      {/* Tabs for Leads Tables */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSubTab("b2b")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === "b2b"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Briefcase size={14} />
              {isRtl ? "طلبات انضمام الشركات (B2B Leads)" : "Demandes Entreprises (B2B)"}
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-mono">{b2bLeads.length}</span>
            </button>

            <button
              onClick={() => setActiveSubTab("designers")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === "designers"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300"
              }`}
            >
              <Palette size={14} />
              {isRtl ? "طلبات المصممين الشركاء (Creator Leads)" : "Candidatures Designers"}
              <span className="bg-black/10 dark:bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-mono">{designerLeads.length}</span>
            </button>
          </div>

          <button
            onClick={activeSubTab === "b2b" ? exportB2BToCSV : exportDesignersToCSV}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            <Download size={14} />
            {isRtl ? "تصدير إلى Excel" : "Exporter en CSV"}
          </button>
        </div>

        {/* 1. B2B Leads Table */}
        {activeSubTab === "b2b" && (
          <div className="bg-white/60 dark:bg-slate-900/60 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            {b2bLeads.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-bold">
                {loadingB2b ? "جاري تحميل البيانات..." : "لا توجد طلبات انضمام للشركات مسجلة حتى الآن."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-black border-b border-slate-200/60 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">{isRtl ? "المؤسسة" : "Entreprise"}</th>
                      <th className="p-3.5">{isRtl ? "المسؤول / الوظيفة" : "Contact / Poste"}</th>
                      <th className="p-3.5">{isRtl ? "الهاتف / الولاية" : "Tél / Wilaya"}</th>
                      <th className="p-3.5">{isRtl ? "الحجم التقديري" : "Volume Estimé"}</th>
                      <th className="p-3.5">{isRtl ? "الحالة" : "Statut"}</th>
                      <th className="p-3.5 text-end">{isRtl ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 font-bold">
                    {b2bLeads.map((lead) => {
                      const waText = encodeURIComponent(
                        isRtl
                          ? `مرحباً ${lead.contactName}، معكم إدارة منصة L'Artisan Imprimeur بخصوص طلب اعتماد مؤسستكم (${lead.companyName}) في بوابة الشركات B2B.`
                          : `Bonjour M/Mme ${lead.contactName}, nous vous contactons concernant votre demande B2B chez L'Artisan Imprimeur pour ${lead.companyName}.`
                      );
                      const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
                      const intlPhone = cleanPhone.startsWith("0") ? "213" + cleanPhone.slice(1) : cleanPhone;

                      return (
                        <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5">
                            <span className="font-black text-slate-900 dark:text-white block">{lead.companyName}</span>
                            {lead.rcNumber && (
                              <span className="text-[10px] font-mono text-slate-400 block">RC: {lead.rcNumber}</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="text-slate-800 dark:text-slate-200 block">{lead.contactName}</span>
                            <span className="text-[10px] text-slate-400 block">{lead.contactRole || "—"}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono text-blue-500 block">{lead.phone}</span>
                            <span className="text-[10px] text-slate-400 block">{lead.wilaya}</span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                            {lead.monthlyVolume || "—"}
                          </td>
                          <td className="p-3.5">
                            <select
                              value={lead.status || "pending"}
                              onChange={(e) => handleUpdateLeadStatus("b2b_leads", lead.id, e.target.value)}
                              className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${
                                lead.status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : lead.status === "contacted"
                                  ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                  : lead.status === "rejected"
                                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              }`}
                            >
                              <option value="pending">{isRtl ? "جديد (في الانتظار)" : "Nouveau"}</option>
                              <option value="contacted">{isRtl ? "تم التواصل" : "Contacté"}</option>
                              <option value="approved">{isRtl ? "معتمد كحساب B2B" : "Approuvé"}</option>
                              <option value="rejected">{isRtl ? "مرفوض" : "Refusé"}</option>
                            </select>
                          </td>
                          <td className="p-3.5 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={`https://wa.me/${intlPhone}?text=${waText}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all"
                                title="WhatsApp"
                              >
                                <MessageSquare size={14} />
                              </a>
                              <a
                                href={`tel:${lead.phone}`}
                                className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all"
                                title="Appel"
                              >
                                <Phone size={14} />
                              </a>
                              <button
                                onClick={() => handleDeleteLead("b2b_leads", lead.id)}
                                className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. Designer Leads Table */}
        {activeSubTab === "designers" && (
          <div className="bg-white/60 dark:bg-slate-900/60 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
            {designerLeads.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-bold">
                {loadingDesigners ? "جاري تحميل البيانات..." : "لا توجد طلبات مصممين مسجلة حتى الآن."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-black border-b border-slate-200/60 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">{isRtl ? "المصمم / الاستوديو" : "Designer / Studio"}</th>
                      <th className="p-3.5">{isRtl ? "معرض الأعمال" : "Portfolio"}</th>
                      <th className="p-3.5">{isRtl ? "التخصص / الولاية" : "Spécialité / Wilaya"}</th>
                      <th className="p-3.5">{isRtl ? "الهاتف" : "Téléphone"}</th>
                      <th className="p-3.5">{isRtl ? "الحالة" : "Statut"}</th>
                      <th className="p-3.5 text-end">{isRtl ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 font-bold">
                    {designerLeads.map((lead) => {
                      const waText = encodeURIComponent(
                        isRtl
                          ? `مرحباً ${lead.designerName}، معكم إدارة L'Artisan Imprimeur بخصوص انضمامكم كشريك تصميم في سوق المصممين.`
                          : `Bonjour ${lead.designerName}, nous vous contactons concernant votre candidature à la Marketplace Créateurs L'Artisan Imprimeur.`
                      );
                      const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
                      const intlPhone = cleanPhone.startsWith("0") ? "213" + cleanPhone.slice(1) : cleanPhone;

                      return (
                        <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 font-black text-slate-900 dark:text-white">
                            {lead.designerName}
                          </td>
                          <td className="p-3.5">
                            <a
                              href={lead.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-500 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                            >
                              Portfolio <ExternalLink size={12} />
                            </a>
                          </td>
                          <td className="p-3.5">
                            <span className="text-slate-800 dark:text-slate-200 block">{lead.specialty}</span>
                            <span className="text-[10px] text-slate-400 block">{lead.wilaya}</span>
                          </td>
                          <td className="p-3.5 font-mono text-blue-500">
                            {lead.phone}
                          </td>
                          <td className="p-3.5">
                            <select
                              value={lead.status || "pending"}
                              onChange={(e) => handleUpdateLeadStatus("designer_leads", lead.id, e.target.value)}
                              className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${
                                lead.status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : lead.status === "contacted"
                                  ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                  : lead.status === "rejected"
                                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              }`}
                            >
                              <option value="pending">{isRtl ? "جديد (في الانتظار)" : "Nouveau"}</option>
                              <option value="contacted">{isRtl ? "تم التواصل" : "Contacté"}</option>
                              <option value="approved">{isRtl ? "مصمم معتمد" : "Créateur Approuvé"}</option>
                              <option value="rejected">{isRtl ? "مرفوض" : "Refusé"}</option>
                            </select>
                          </td>
                          <td className="p-3.5 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={`https://wa.me/${intlPhone}?text=${waText}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all"
                                title="WhatsApp"
                              >
                                <MessageSquare size={14} />
                              </a>
                              <a
                                href={`tel:${lead.phone}`}
                                className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all"
                                title="Appel"
                              >
                                <Phone size={14} />
                              </a>
                              <button
                                onClick={() => handleDeleteLead("designer_leads", lead.id)}
                                className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
