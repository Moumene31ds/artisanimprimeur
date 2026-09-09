"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { B2BOrganization, B2BBranch, B2BOrderApproval } from "@/lib/b2b-types";
import CorporateOrderApproval from "@/components/b2b/CorporateOrderApproval";
import DevisGeneratorModal from "@/components/b2b/DevisGeneratorModal";
import { 
  Building2, Users, FileText, Wallet, Plus, ShieldCheck, 
  CheckCircle2, ArrowRight, Download, HandCoins, Sparkles, 
  Briefcase, Landmark, RefreshCw 
} from "lucide-react";
import { toast } from "sonner";
import { triggerHapticFeedback } from "@/lib/utils";

export default function B2BPortalPage() {
  const { language } = useAppStore();
  const { user, isLoggedIn } = useAuth();
  const isRtl = language === "ar";

  const [activeTab, setActiveTab] = useState<"approvals" | "branches" | "quotes" | "credit">("approvals");
  const [isDevisModalOpen, setIsDevisModalOpen] = useState(false);

  // Mock corporate organization data (connectable to Firestore)
  const [organization, setOrganization] = useState<B2BOrganization>({
    id: "org-1",
    name: "Groupe El-Djazair Corporate",
    tradeName: "El-Djazair Tech & Retail",
    legalForm: "SPA",
    rc: "31/00-098234B21",
    nif: "002131019284756",
    nis: "1982345000",
    article: "31201948271",
    address: "Zone Industrielle Es-Sénia, Oran",
    wilaya: "Oran",
    contactName: "Directeur des Achats",
    contactEmail: "achats@eldjazair-group.dz",
    contactPhone: "+213 550 12 34 56",
    isTvaExempt: false,
    creditLimit: 500000,
    currentCreditBalance: 320000,
    status: "active",
    createdAt: null,
    updatedAt: null,
  });

  const [branches, setBranches] = useState<B2BBranch[]>([
    {
      id: "b-oran",
      orgId: "org-1",
      name: "Direction Régionale Ouest (Oran)",
      city: "Oran",
      address: "Akid Lotfi",
      phone: "+213 551 00 11 22",
      managerUserId: "u1",
      managerName: "Amine K.",
      managerEmail: "oran@eldjazair-group.dz",
      monthlyBudget: 80000,
      spentThisMonth: 42000,
      active: true,
      createdAt: null,
    },
    {
      id: "b-alger",
      orgId: "org-1",
      name: "Agence Centrale Bab Ezzouar (Alger)",
      city: "Alger",
      address: "Centre d'Affaires Bab Ezzouar",
      phone: "+213 552 33 44 55",
      managerUserId: "u2",
      managerName: "Sofiane M.",
      managerEmail: "alger@eldjazair-group.dz",
      monthlyBudget: 120000,
      spentThisMonth: 95000,
      active: true,
      createdAt: null,
    },
    {
      id: "b-constantine",
      orgId: "org-1",
      name: "Succursale Est (Constantine)",
      city: "Constantine",
      address: "Cité Zouaghi",
      phone: "+213 553 66 77 88",
      managerUserId: "u3",
      managerName: "Yacine B.",
      managerEmail: "constantine@eldjazair-group.dz",
      monthlyBudget: 60000,
      spentThisMonth: 15000,
      active: true,
      createdAt: null,
    },
  ]);

  const [approvals, setApprovals] = useState<B2BOrderApproval[]>([
    {
      orderId: "B2B-ORD-8921",
      orgId: "org-1",
      branchId: "b-alger",
      branchName: "Agence Alger (Bab Ezzouar)",
      requestedByUserId: "u2",
      requestedByName: "Sofiane M.",
      total: 28500,
      itemsCount: 3,
      itemsSummary: "500 Cartes de Visite + 1000 Dépliants A4 + 50 Badges PVC",
      status: "pending_approval",
      createdAt: null,
    },
    {
      orderId: "B2B-ORD-8919",
      orgId: "org-1",
      branchId: "b-oran",
      branchName: "Direction Oran",
      requestedByUserId: "u1",
      requestedByName: "Amine K.",
      total: 14000,
      itemsCount: 1,
      itemsSummary: "2 Banderoles Bâche PVC 510g (300×100 cm)",
      status: "pending_approval",
      createdAt: null,
    },
  ]);

  const handleApproveOrder = async (orderId: string) => {
    setApprovals((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status: "approved" } : o))
    );
  };

  const handleRejectOrder = async (orderId: string, reason: string) => {
    setApprovals((prev) =>
      prev.map((o) =>
        o.orderId === orderId ? { ...o, status: "rejected", rejectionReason: reason } : o
      )
    );
  };

  return (
    <div
      className={`animate-fadeIn pb-24 max-w-7xl mx-auto px-4 ${isRtl ? "text-right" : "text-left"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden premium-glass rounded-[2.5rem] p-6 sm:p-10 border border-white/60 dark:border-white/10 shadow-2xl mb-8 mt-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black uppercase tracking-wider">
              <Briefcase size={14} />
              {isRtl ? "بوابة حسابات الشركات والمؤسسات" : "Espace B2B & Comptes Entreprises"}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {organization.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              RC: <span className="font-mono">{organization.rc}</span> • NIF: <span className="font-mono">{organization.nif}</span> • {isRtl ? "الشكل القانوني:" : "Forme :"} {organization.legalForm}
            </p>
          </div>

          {/* Credit balance box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 text-start md:text-end w-full md:w-auto">
            <span className="text-xs text-slate-400 font-bold block mb-1">
              {isRtl ? "الرصيد المتاح للطلبات B2B" : "Solde de Crédit Disponible"}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {organization.currentCreditBalance.toLocaleString()} <span className="text-sm">DA</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              {isRtl ? "الحد الأقصى المعتمد: " : "Plafond : "} {organization.creditLimit.toLocaleString()} DA
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsDevisModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 hover:scale-105"
          >
            <FileText size={16} />
            {isRtl ? "إنشاء عرض سعر رسمي فوري (Devis PDF)" : "Créer un Devis Officiel (PDF)"}
          </button>
        </div>
      </div>

      {/* Portal Tabs */}
      <div className="flex bg-slate-200/60 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-300/50 dark:border-slate-700/50 mb-8 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab("approvals")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
            activeTab === "approvals"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <ShieldCheck size={16} />
          {isRtl ? "موافقات الفروع المعلقة" : "Approbations en Attente"}
          {approvals.filter((a) => a.status === "pending_approval").length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
              {approvals.filter((a) => a.status === "pending_approval").length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("branches")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
            activeTab === "branches"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Building2 size={16} />
          {isRtl ? "إدارة الفروع والميزانيات" : "Succursales & Budgets"}
        </button>

        <button
          onClick={() => setActiveTab("credit")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
            activeTab === "credit"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Landmark size={16} />
          {isRtl ? "الرصيد المسبق والتحويلات البنكية" : "Crédit & Virements B2B"}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "approvals" && (
        <div className="ios-glass rounded-[2.5rem] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-xl">
          <CorporateOrderApproval
            orders={approvals}
            onApprove={handleApproveOrder}
            onReject={handleRejectOrder}
            isRtl={isRtl}
          />
        </div>
      )}

      {activeTab === "branches" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {isRtl ? "فروع الشركة وسقوف الإنفاق الشهري" : "Succursales & Plafonds Mensuels"}
            </h3>
            <button
              onClick={() => toast.info(isRtl ? "إضافة فرع جديد متاحة لمشرف الشركة" : "Contactez l'administrateur pour ajouter une succursale.")}
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus size={14} />
              {isRtl ? "ربط فرع جديد" : "Ajouter Succursale"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {branches.map((branch) => {
              const usagePercent = Math.round((branch.spentThisMonth / branch.monthlyBudget) * 100);
              return (
                <div
                  key={branch.id}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 block">
                        {branch.city}
                      </span>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">{branch.name}</h4>
                      <span className="text-xs text-slate-400">{branch.managerName}</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">{isRtl ? "المستهلك هذا الشهر" : "Consommé ce mois"}</span>
                      <span className="text-slate-900 dark:text-white">
                        {branch.spentThisMonth.toLocaleString()} / {branch.monthlyBudget.toLocaleString()} DA
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usagePercent > 85 ? "bg-red-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${Math.min(100, usagePercent)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block text-end">{usagePercent}% {isRtl ? "من الميزانية" : "du budget"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "credit" && (
        <div className="ios-glass rounded-[2.5rem] p-6 sm:p-10 border border-white/60 dark:border-white/10 shadow-xl space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {isRtl ? "شحن رصيد الشركات B2B والتحويلات البنكية" : "Rechargement du Crédit Entreprise"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isRtl
                ? "يمكن لشركتكم إيداع أرصدة مالية مسبقة عبر تحويل بنكي رسمي أو شيك معتمد للاستفادة من خصومات العقود السنوية وتفادي الدفع عند كل طلب."
                : "Effectuez un virement bancaire pour approvisionner votre compte entreprise et payer vos commandes automatiquement."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                {isRtl ? "الحساب البنكي الرسمي للمطبعة (RIB)" : "RIB Bancaire Officiel"}
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Banque :</span>
                  <span className="font-bold text-slate-900 dark:text-white">Banque Nationale d'Algérie (BNA)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Agence :</span>
                  <span className="font-bold text-slate-900 dark:text-white">Oran Akid Lotfi (00823)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">RIB / Numéro de compte :</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">001 00823 0300 001234 45</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Bénéficiaire :</span>
                  <span className="font-bold text-slate-900 dark:text-white">SARL L'Artisan Imprimeur</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/30 flex flex-col justify-between">
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300">
                  {isRtl ? "رفع إشعار تحويل بنكي جديد" : "Déposer un bordereau de virement"}
                </h4>
                <p className="text-xs text-blue-700/80 dark:text-blue-400">
                  {isRtl
                    ? "بمجرد إتمام التحويل، ارفع صورة وصل التحويل أو الشيك ليتم شحن رصيدك فوراً في لوحة التحكم."
                    : "Téléversez votre avis de virement pour créditer votre compte entreprise."}
                </p>
              </div>

              <button
                onClick={() => toast.success(isRtl ? "يرجى مراسلتنا بوصل التحويل عبر بريد الشركات B2B" : "Contactez b2b@artisan-imprimeur.dz avec votre reçu.")}
                className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                {isRtl ? "إرسال وصل التحويل للتحقق" : "Notifier un nouveau virement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Devis Generator Modal */}
      <DevisGeneratorModal
        isOpen={isDevisModalOpen}
        onClose={() => setIsDevisModalOpen(false)}
        defaultCompany={organization.name}
        defaultClientName={organization.contactName}
      />
    </div>
  );
}
