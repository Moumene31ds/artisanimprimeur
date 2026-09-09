"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/store";
import { B2BQuote, B2BQuoteItem } from "@/lib/b2b-types";
import { 
  FileText, Download, Plus, Trash2, X, CheckCircle, 
  Building2, Calendar, ShieldCheck, Printer, HelpCircle 
} from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { triggerHapticFeedback } from "@/lib/utils";

interface DevisGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientName?: string;
  defaultCompany?: string;
}

export default function DevisGeneratorModal({
  isOpen,
  onClose,
  defaultClientName = "",
  defaultCompany = "",
}: DevisGeneratorModalProps) {
  const { language } = useAppStore();
  const isRtl = language === "ar";

  const [companyName, setCompanyName] = useState(defaultCompany);
  const [clientName, setClientName] = useState(defaultClientName);
  const [clientAddress, setClientAddress] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [clientNis, setClientNis] = useState("");
  const [clientRc, setClientRc] = useState("");
  const [clientArticle, setClientArticle] = useState("");
  const [isTvaExempt, setIsTvaExempt] = useState(false);

  const [items, setItems] = useState<B2BQuoteItem[]>([
    {
      description: "Cartes de Visite Premium 350g (Pelliculage Mat Recto/Verso)",
      quantity: 1000,
      unitPriceHt: 9.5,
      totalHt: 9500,
    },
    {
      description: "Flyers A5 Couché Brillant 135g (Quadri Recto/Verso)",
      quantity: 2500,
      unitPriceHt: 6.8,
      totalHt: 17000,
    },
  ]);

  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemQty, setNewItemQty] = useState(500);
  const [newItemPrice, setNewItemPrice] = useState(15);

  const subtotalHt = items.reduce((sum, item) => sum + item.totalHt, 0);
  const tvaRate = isTvaExempt ? 0 : 0.19;
  const tvaAmount = Math.round(subtotalHt * tvaRate);
  const totalTtc = subtotalHt + tvaAmount;

  if (!isOpen) return null;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc.trim()) return;
    const totalHt = Math.round(newItemQty * newItemPrice);
    setItems((prev) => [
      ...prev,
      {
        description: newItemDesc.trim(),
        quantity: newItemQty,
        unitPriceHt: newItemPrice,
        totalHt,
      },
    ]);
    setNewItemDesc("");
    setNewItemQty(500);
    setNewItemPrice(10);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePdf = () => {
    try {
      triggerHapticFeedback("medium");
    } catch {}

    try {
      const doc = new jsPDF();
      const quoteNum = `DEV-B2B-${Date.now().toString().slice(-6)}`;
      const dateStr = new Date().toLocaleDateString("fr-FR");
      const validUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR");

      // Dark Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 36, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("L'ARTISAN IMPRIMEUR", 14, 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Atelier Numérique & Offset B2B — Oran, Algérie", 14, 25);
      doc.text("NIF: 002131019284756 | RC: 31/00-098234B21 | NIS: 1982345000", 14, 31);

      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text(`DEVIS OFFICIEL`, 140, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`N° : ${quoteNum}`, 140, 25);
      doc.text(`Date : ${dateStr}`, 140, 31);

      // Client Box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 44, 182, 34, 3, 3, "FD");

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DOIT / DESTINATAIRE :", 20, 52);
      doc.setFont("helvetica", "normal");
      doc.text(`${companyName || clientName || "Client Professionnel"}`, 20, 59);
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Adresse : ${clientAddress || "Algérie"} | Contact : ${clientName || "Responsable Achat"}`, 20, 65);
      doc.text(
        `NIF: ${clientNif || "—"} | NIS: ${clientNis || "—"} | RC: ${clientRc || "—"} | Art: ${clientArticle || "—"}`,
        20,
        71
      );

      // Items Table Header
      let y = 88;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 8, "F");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("DÉSIGNATION DE LA PRESTATION", 18, y + 5.5);
      doc.text("QTÉ", 125, y + 5.5);
      doc.text("P.U HT", 145, y + 5.5);
      doc.text("TOTAL HT", 172, y + 5.5);

      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);

      items.forEach((item, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y - 4, 182, 7, "F");
        }
        doc.text(item.description.slice(0, 55), 18, y);
        doc.text(item.quantity.toString(), 125, y);
        doc.text(`${item.unitPriceHt.toLocaleString()} DA`, 145, y);
        doc.text(`${item.totalHt.toLocaleString()} DA`, 172, y);
        y += 7;
      });

      // Totals Box
      y = Math.max(y + 6, 170);
      const totalBoxX = 120;
      doc.setDrawColor(226, 232, 240);
      doc.rect(totalBoxX, y, 76, 32);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Sous-total HT :", totalBoxX + 4, y + 7);
      doc.setFont("helvetica", "normal");
      doc.text(`${subtotalHt.toLocaleString()} DA`, totalBoxX + 45, y + 7);

      doc.setFont("helvetica", "bold");
      doc.text(isTvaExempt ? "TVA (Exonérée) :" : "TVA (19%) :", totalBoxX + 4, y + 14);
      doc.setFont("helvetica", "normal");
      doc.text(`${tvaAmount.toLocaleString()} DA`, totalBoxX + 45, y + 14);

      doc.setFillColor(15, 23, 42);
      doc.rect(totalBoxX, y + 19, 76, 13, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL TTC :", totalBoxX + 4, y + 27);
      doc.text(`${totalTtc.toLocaleString()} DA`, totalBoxX + 42, y + 27);

      // Notice & Stamp
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Conditions de règlement : Acompte 50% à la validation du BAT, solde à la livraison.`, 14, y + 8);
      doc.text(`Ce devis est valable jusqu'au ${validUntil}. Bon pour accord et signature obligatoire.`, 14, y + 14);
      doc.text(`Virement bancaire BNA Oran: 001 00823 0300 001234 45`, 14, y + 20);

      // Stamp area
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, y + 28, 65, 30, 2, 2);
      doc.text("Cachet & Signature Client :", 18, y + 36);

      doc.save(`Devis_${quoteNum}_${(companyName || "Client").replace(/\s+/g, "_")}.pdf`);
      toast.success(
        isRtl ? "تم تحميل عرض السعر الرسمي (PDF) بنجاح!" : "Devis officiel téléchargé avec succès !"
      );
      onClose();
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? "فشل إنشاء ملف الـ PDF" : "Erreur lors de la génération du PDF");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {isRtl ? "مولّد عروض الأسعار الرسمية (Devis B2B)" : "Générateur de Devis Officiel B2B"}
              </h3>
              <p className="text-xs text-slate-400">
                {isRtl ? "توليد فوري لملف PDF معتمد بختم وبيانات شركتك الجبائية" : "Format conforme avec NIF, NIS, RC et TVA"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Client Legal Info */}
        <div className="space-y-4">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
            {isRtl ? "1. البيانات الجبائية والشركات" : "1. Informations Légales de l'Entreprise"}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                {isRtl ? "اسم المؤسسة / الشركة" : "Raison Sociale / Société"}
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="SARL Tech Solutions"
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                {isRtl ? "اسم المسؤول / جهة الاتصال" : "Nom du Contact / Demandeur"}
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Karim Bensalem"
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                {isRtl ? "العنوان التجاري" : "Adresse Complète"}
              </label>
              <input
                type="text"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Oran, Algérie"
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">NIF (الرقم الجبائي)</label>
              <input
                type="text"
                value={clientNif}
                onChange={(e) => setClientNif(e.target.value)}
                placeholder="001234567890123"
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">NIS (الإحصائي)</label>
              <input
                type="text"
                value={clientNis}
                onChange={(e) => setClientNis(e.target.value)}
                placeholder="1982345000"
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">RC (السجل التجاري)</label>
              <input
                type="text"
                value={clientRc}
                onChange={(e) => setClientRc(e.target.value)}
                placeholder="31/00-123456"
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isTvaExempt}
              onChange={(e) => setIsTvaExempt(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 accent-blue-600"
            />
            <span>{isRtl ? "مؤسسة معفاة من الرسم على القيمة المضافة (Exonération TVA 0%)" : "Entreprise exonérée de TVA (Régime 0%)"}</span>
          </label>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
            {isRtl ? "2. بنود المطبوعات والكميات" : "2. Lignes de Prestations"}
          </span>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex-1">
                  <span className="font-bold text-slate-900 dark:text-white block">{item.description}</span>
                  <span className="text-slate-400 text-[11px]">
                    {item.quantity} unités × {item.unitPriceHt} DA
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    {item.totalHt.toLocaleString()} DA
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add item inline form */}
          <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-2 pt-2">
            <input
              type="text"
              placeholder={isRtl ? "وصف البند الجديد (مثال: أظرفة مراسلات A4)" : "Désignation (ex: Enveloppes A4)"}
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              className="flex-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Qté"
                min="1"
                value={newItemQty}
                onChange={(e) => setNewItemQty(Number(e.target.value))}
                className="w-20 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none text-center"
              />
              <input
                type="number"
                placeholder="P.U"
                min="0"
                step="0.1"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(Number(e.target.value))}
                className="w-24 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none text-center"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs flex items-center gap-1 shrink-0"
              >
                <Plus size={14} />
                {isRtl ? "إضافة" : "Ajouter"}
              </button>
            </div>
          </form>
        </div>

        {/* Totals Summary */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-xs space-y-1">
            <div className="text-slate-500">
              {isRtl ? "المجموع دون الرسوم (HT): " : "Sous-total HT : "}
              <span className="font-bold text-slate-800 dark:text-slate-200">{subtotalHt.toLocaleString()} DA</span>
            </div>
            <div className="text-slate-500">
              {isRtl ? "الرسم على القيمة المضافة (TVA 19%): " : "TVA (19%) : "}
              <span className="font-bold text-slate-800 dark:text-slate-200">{tvaAmount.toLocaleString()} DA</span>
            </div>
          </div>

          <div className="text-start sm:text-end">
            <span className="text-xs text-slate-400 font-bold block">{isRtl ? "المجموع الكلي مع الرسوم" : "Total TTC"}</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {totalTtc.toLocaleString()} <span className="text-sm">DA</span>
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleGeneratePdf}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
        >
          <Download size={18} />
          {isRtl ? "توليد وتنزيل ملف عرض السعر الرسمي (PDF)" : "Générer & Télécharger le Devis Officiel (PDF)"}
        </button>
      </div>
    </div>
  );
}
