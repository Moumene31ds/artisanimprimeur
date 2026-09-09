"use client";

import React, { useState, useRef, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { PRINT_TEMPLATES, PrintTemplate } from "@/lib/print-templates";
import { 
  Sparkles, Layers, Eye, Download, ShoppingCart, 
  Check, RefreshCw, Sliders, Type, Palette, ShieldAlert, ArrowLeftRight 
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { triggerHapticFeedback } from "@/lib/utils";

export default function WebToPrintStudio() {
  const { language, addToCart } = useAppStore();
  const isRtl = language === "ar";

  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate>(PRINT_TEMPLATES[0]);
  const [currentSide, setCurrentSide] = useState<"front" | "back">("front");
  const [showGuides, setShowGuides] = useState(true);

  // Editable front fields
  const [title, setTitle] = useState(isRtl ? selectedTemplate.front.titleAr : selectedTemplate.front.title);
  const [subtitle, setSubtitle] = useState(isRtl ? selectedTemplate.front.subtitleAr : selectedTemplate.front.subtitle);
  const [contact1, setContact1] = useState(selectedTemplate.front.contact1);
  const [contact2, setContact2] = useState(selectedTemplate.front.contact2);
  const [address, setAddress] = useState(isRtl ? selectedTemplate.front.addressAr : selectedTemplate.front.address);

  // Editable back fields
  const [backHeadline, setBackHeadline] = useState(isRtl ? selectedTemplate.back.headlineAr : selectedTemplate.back.headline);
  const [backHours, setBackHours] = useState(isRtl ? selectedTemplate.back.workingHoursAr : selectedTemplate.back.workingHours);
  const [backNote, setBackNote] = useState(isRtl ? selectedTemplate.back.noteAr : selectedTemplate.back.note);

  // Styling
  const [bgColor, setBgColor] = useState("#ffffff");
  const [accentColor, setAccentColor] = useState(selectedTemplate.previewColor);
  const [quantity, setQuantity] = useState<number>(500);

  const cardRef = useRef<HTMLDivElement>(null);

  const handleSelectTemplate = (tpl: PrintTemplate) => {
    try {
      triggerHapticFeedback("light");
    } catch {}
    setSelectedTemplate(tpl);
    setAccentColor(tpl.previewColor);
    setTitle(isRtl ? tpl.front.titleAr : tpl.front.title);
    setSubtitle(isRtl ? tpl.front.subtitleAr : tpl.front.subtitle);
    setContact1(tpl.front.contact1);
    setContact2(tpl.front.contact2);
    setAddress(isRtl ? tpl.front.addressAr : tpl.front.address);
    setBackHeadline(isRtl ? tpl.back.headlineAr : tpl.back.headline);
    setBackHours(isRtl ? tpl.back.workingHoursAr : tpl.back.workingHours);
    setBackNote(isRtl ? tpl.back.noteAr : tpl.back.note);
    toast.success(isRtl ? `تم تحميل قالب: ${tpl.nameAr}` : `Modèle chargé : ${tpl.name}`);
  };

  const handleExportPrintPDF = () => {
    try {
      triggerHapticFeedback("medium");
    } catch {}

    try {
      // Standard Business card: 85mm x 55mm + 2mm bleed = 89mm x 59mm
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [59, 89],
      });

      // --- PAGE 1: RECTO (FRONT) ---
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 89, 59, "F");

      // Accent top line
      doc.setFillColor(accentColor);
      doc.rect(2, 2, 85, 4, "F");

      // Text elements
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, 44.5, 20, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(subtitle.slice(0, 48), 44.5, 26, { align: "center" });

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 32, 74, 32);

      // Contact & Address
      doc.setFontSize(6.5);
      doc.text(contact1, 44.5, 38, { align: "center" });
      doc.text(contact2, 44.5, 42, { align: "center" });
      doc.text(address.slice(0, 52), 44.5, 48, { align: "center" });

      // Corner Crop Marks (Traits de coupe)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      // Top-left
      doc.line(0, 2, 2, 2);
      doc.line(2, 0, 2, 2);
      // Top-right
      doc.line(87, 2, 89, 2);
      doc.line(87, 0, 87, 2);
      // Bottom-left
      doc.line(0, 57, 2, 57);
      doc.line(2, 57, 2, 59);
      // Bottom-right
      doc.line(87, 57, 89, 57);
      doc.line(87, 57, 87, 59);

      // --- PAGE 2: VERSO (BACK) ---
      doc.addPage([59, 89], "landscape");
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 89, 59, "F");

      doc.setFillColor(accentColor);
      doc.rect(2, 53, 85, 4, "F");

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(backHeadline.slice(0, 45), 44.5, 22, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(backHours, 44.5, 30, { align: "center" });
      doc.text(backNote, 44.5, 36, { align: "center" });

      doc.save(`Carte_Visite_300DPI_Prepress_${Date.now()}.pdf`);
      toast.success(
        isRtl ? "تم تنزيل ملف الـ PDF الجاهز للمطبعة (300 DPI مع علامات القطع)!" : "Fichier PDF Imprimeur 300 DPI généré !"
      );
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? "تعذر إنشاء ملف الـ PDF" : "Erreur de génération PDF");
    }
  };

  const handleAddToCart = () => {
    try {
      triggerHapticFeedback("medium");
    } catch {}

    const unitPrice = 13; // 6,500 DA for 500 cards Recto/Verso luxe
    const totalPrice = quantity * unitPrice;

    addToCart({
      id: `w2p-card-${Date.now()}`,
      name: isRtl
        ? `بطاقات عمل مخصصة استوديو (${quantity} قطعة)`
        : `Cartes de Visite Studio Pro (${quantity} pcs)`,
      price: totalPrice,
      quantity: 1,
      category: "Cartes",
      image: "/products/cartes-premium.jpg",
      selectedOptions: {
        template: selectedTemplate.name,
        rectoTitle: title,
        versoHeadline: backHeadline,
        side: "Recto / Verso (وجهين)",
        finition: "Pelliculage Mat Soft-Touch 350g",
        readyToPrint: "Oui (Fichier Studio Validé)",
      },
    });

    toast.success(
      isRtl ? "تمت إضافة تصميمك المطبوع إلى السلة بنجاح!" : "Design ajouté à votre panier avec succès !"
    );
  };

  return (
    <div className="ios-glass rounded-[2.5rem] p-6 sm:p-10 border border-white/60 dark:border-white/10 shadow-2xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles size={14} />
            {isRtl ? "استوديو الطباعة الذكي (Web-to-Print)" : "Studio Web-to-Print Pro"}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isRtl ? "خصص بطاقتك بنقرة زر مع قوالب جاهزة" : "Personnalisation Recto / Verso"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRtl
              ? "اختر قالب مجالك المهني، عدل نصوصك، وعاين هوامش الأمان المطبعية وقم بتنزيل ملف PDF 300 DPI جاهز للماكينة."
              : "Modèles sectoriels certifiés, prévisualisation des traits de coupe et export PDF 300 DPI."}
          </p>
        </div>

        {/* Recto / Verso Switcher */}
        <div className="flex bg-slate-200/70 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-300/50 dark:border-slate-700/50 shrink-0">
          <button
            type="button"
            onClick={() => setCurrentSide("front")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              currentSide === "front"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {isRtl ? "الوجه (Recto)" : "Recto (Face)"}
          </button>
          <button
            type="button"
            onClick={() => setCurrentSide("back")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              currentSide === "back"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {isRtl ? "الظهر (Verso)" : "Verso (Dos)"}
          </button>
        </div>
      </div>

      {/* Templates Carousel */}
      <div className="space-y-3">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
          {isRtl ? "قوالب مصممة خصيصاً لقطاعات الأعمال" : "Modèles Sectoriels Prêts à l'Emploi"}
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRINT_TEMPLATES.map((tpl) => {
            const isSelected = tpl.id === selectedTemplate.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl)}
                className={`p-3.5 rounded-2xl text-start transition-all border flex flex-col justify-between ${
                  isSelected
                    ? "bg-purple-500/10 border-purple-500 shadow-md shadow-purple-500/10"
                    : "bg-white/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 hover:bg-white/80"
                }`}
              >
                <div>
                  <span
                    className="w-4 h-4 rounded-full block mb-2"
                    style={{ backgroundColor: tpl.previewColor }}
                  />
                  <span className="font-bold text-xs text-slate-900 dark:text-white block line-clamp-1">
                    {isRtl ? tpl.nameAr : tpl.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {isRtl ? tpl.categoryNameAr : tpl.categoryName}
                  </span>
                </div>
                {isSelected && (
                  <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 mt-2 block">
                    ✓ {isRtl ? "مُحدد" : "Sélectionné"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Visual Live Card Canvas */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-4">
          <div className="flex justify-between items-center w-full max-w-md px-1 text-xs">
            <span className="text-slate-400 font-bold">
              {currentSide === "front" ? (isRtl ? "معاينة الوجه" : "Aperçu Recto") : (isRtl ? "معاينة الظهر" : "Aperçu Verso")} (85×55 mm)
            </span>
            <button
              type="button"
              onClick={() => setShowGuides(!showGuides)}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
            >
              {showGuides ? (isRtl ? "إخفاء هوامش الأمان" : "Masquer repères") : (isRtl ? "إظهار هوامش الأمان" : "Afficher repères")}
            </button>
          </div>

          {/* Business Card Container (Aspect Ratio 85:55) */}
          <div
            ref={cardRef}
            className="w-full max-w-md aspect-[85/55] bg-white rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all border border-slate-200 dark:border-slate-800"
            style={{ backgroundColor: bgColor }}
          >
            {/* Top Accent Strip */}
            <div
              className="absolute top-0 left-0 right-0 h-2.5 transition-colors"
              style={{ backgroundColor: accentColor }}
            />

            {/* Print Guides Overlay */}
            {showGuides && (
              <div className="absolute inset-2 pointer-events-none border border-dashed border-emerald-500/40 rounded-xl flex items-center justify-center">
                <span className="absolute top-1 right-2 text-[8px] font-mono text-emerald-600/60 uppercase">
                  Zone de Sécurité (3mm)
                </span>
              </div>
            )}

            {currentSide === "front" ? (
              <div className="h-full flex flex-col justify-between py-2 relative z-10 text-center">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {title || "Votre Nom / Titre"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    {subtitle || "Spécialité & Fonction"}
                  </p>
                </div>

                <div className="w-16 h-0.5 mx-auto bg-slate-200" />

                <div className="space-y-0.5 text-[11px] font-medium text-slate-600">
                  <p>{contact1}</p>
                  <p>{contact2}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{address}</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between py-2 relative z-10 text-center">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    {backHeadline || "Horaires & Informations"}
                  </h4>
                  <p className="text-xs font-semibold text-slate-600">{backHours}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 font-bold">
                  {backNote}
                </div>

                <span className="text-[10px] text-slate-400">
                  L'Artisan Imprimeur • Akid Lotfi, Oran
                </span>
              </div>
            )}
          </div>

          <span className="text-[11px] text-slate-400 text-center max-w-sm">
            {isRtl
              ? "ملاحظة: الإطار الأخضر المنقط يوضح مسافة الأمان لضمان عدم قص النصوص أثناء التقطيع."
              : "Le tracé vert indique la zone de sécurité pour garantir la découpe sans perte de texte."}
          </span>
        </div>

        {/* Edit Form & Live Options */}
        <div className="lg:col-span-5 space-y-5">
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
              {currentSide === "front" ? (isRtl ? "تعديل نصوص الوجه" : "Textes du Recto") : (isRtl ? "تعديل نصوص الظهر" : "Textes du Verso")}
            </span>

            {currentSide === "front" ? (
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isRtl ? "الاسم أو العنوان الرئيسي" : "Nom complet ou Enseigne"}
                  className="w-full p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder={isRtl ? "التخصص أو النشاط التجاري" : "Activité / Spécialité"}
                  className="w-full p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={contact1}
                  onChange={(e) => setContact1(e.target.value)}
                  placeholder="Téléphone 1"
                  className="w-full p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={contact2}
                  onChange={(e) => setContact2(e.target.value)}
                  placeholder="Téléphone 2 ou Email"
                  className="w-full p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={isRtl ? "العنوان التجاري" : "Adresse"}
                  className="w-full p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            ) : (
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={backHeadline}
                  onChange={(e) => setBackHeadline(e.target.value)}
                  placeholder={isRtl ? "عنوان الظهر الرئيسي" : "Titre verso"}
                  className="w-full p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={backHours}
                  onChange={(e) => setBackHours(e.target.value)}
                  placeholder={isRtl ? "ساعات العمل والاستقبال" : "Horaires de réception"}
                  className="w-full p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={backNote}
                  onChange={(e) => setBackNote(e.target.value)}
                  placeholder={isRtl ? "ملاحظة أو تخصص إضافي" : "Mention supplémentaire"}
                  className="w-full p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>

          {/* Color accent */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
              {isRtl ? "لون الشريط المميز" : "Couleur d'accent"}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">{accentColor}</span>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between bg-white/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isRtl ? "الكمية المطلوبة:" : "Quantité :"}
            </span>
            <div className="flex gap-2">
              {[250, 500, 1000].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    quantity === q
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-purple-600/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShoppingCart size={18} />
              {isRtl ? `طلب وطباعة التصميم (${(quantity * 13).toLocaleString()} DA)` : `Commander l'Impression (${(quantity * 13).toLocaleString()} DA)`}
            </button>

            <button
              type="button"
              onClick={handleExportPrintPDF}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {isRtl ? "تنزيل ملف PDF 300 DPI للمطبعة" : "Télécharger PDF Prepress (300 DPI)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
