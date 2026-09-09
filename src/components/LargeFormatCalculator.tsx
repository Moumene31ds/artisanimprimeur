"use client";

import React, { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { 
  Maximize2, Ruler, Layers, ShieldCheck, Download, 
  ShoppingCart, Sparkles, Check, FileText, Info 
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { triggerHapticFeedback } from "@/lib/utils";

interface MaterialOption {
  id: string;
  name: string;
  nameAr: string;
  pricePerSqm: number;
  description: string;
  descriptionAr: string;
  popular?: boolean;
}

const MATERIALS: MaterialOption[] = [
  {
    id: "bache-440",
    name: "Bâche PVC Standard 440g",
    nameAr: "قماش مشمع (باش) 440غ",
    pricePerSqm: 1800,
    description: "Idéal pour banderoles extérieures, chantiers et promos.",
    descriptionAr: "ممتاز للافتات الخارجية، عروض الإعلانات والواجهات المؤقتة.",
    popular: true,
  },
  {
    id: "bache-510",
    name: "Bâche PVC Renforcée 510g",
    nameAr: "قماش مشمع مقوى 510غ",
    pricePerSqm: 2400,
    description: "Très haute résistance au vent et intempéries.",
    descriptionAr: "مقاومة عالية جداً للرياح والأمطار والظروف القاسية.",
  },
  {
    id: "vinyle-adhesif",
    name: "Vinyle Adhésif HD (Mat / Brillant)",
    nameAr: "ملصق فينيل عالي الدقة (مط أو لامع)",
    pricePerSqm: 2200,
    description: "Pour vitrines, panneaux, véhicules et stickers géants.",
    descriptionAr: "للواجهات الزجاجية، لوحات المحلات، وتغليف السيارات.",
    popular: true,
  },
  {
    id: "one-way",
    name: "Vinyle Micro-perforé (One-Way)",
    nameAr: "ملصق واجهات مخرم (وان واي فيجن)",
    pricePerSqm: 2900,
    description: "Vision unidirectionnelle pour vitrines et vitres arrières.",
    descriptionAr: "رؤية من اتجاه واحد لواجهات المحلات وزجاج السيارات.",
  },
  {
    id: "forex-3mm",
    name: "Panneau Forex Rigide 3mm",
    nameAr: "لوح بلاستيكي صلب (فوركس 3مم)",
    pricePerSqm: 4200,
    description: "Panneau rigide léger pour signalétique intérieure et extérieure.",
    descriptionAr: "لوح صلب خفيف لإشارات الدلالة واللوحات الجدارية والمحلات.",
  },
  {
    id: "forex-5mm",
    name: "Panneau Forex Renforcé 5mm",
    nameAr: "لوح بلاستيكي صلب معزز (فوركس 5مم)",
    pricePerSqm: 5500,
    description: "Excellente rigidité pour enseignes et panneaux durables.",
    descriptionAr: "صلابة ممتازة للافتات الدائمة واللوحات الفاخرة.",
  },
  {
    id: "canvas",
    name: "Toile Canvas Artistique",
    nameAr: "قماش كانفاس فني",
    pricePerSqm: 4500,
    description: "Texture tissu haut de gamme pour tableaux déco et photos.",
    descriptionAr: "ملمس قماشي فني فاخر للوحات الديكور والصور الجدارية.",
  },
];

export default function LargeFormatCalculator() {
  const { language, addToCart } = useAppStore();
  const isRtl = language === "ar";

  // Dimensions in centimeters
  const [widthCm, setWidthCm] = useState<number>(200);
  const [heightCm, setHeightCm] = useState<number>(100);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("bache-440");
  const [quantity, setQuantity] = useState<number>(1);

  // Finishing options
  const [lamination, setLamination] = useState<boolean>(false);
  const [eyelets, setEyelets] = useState<boolean>(true);
  const [reinforcedHem, setReinforcedHem] = useState<boolean>(true);
  const [customCutting, setCustomCutting] = useState<boolean>(false);

  const selectedMaterial = useMemo(
    () => MATERIALS.find((m) => m.id === selectedMaterialId) || MATERIALS[0],
    [selectedMaterialId]
  );

  // Surface calculation in square meters (minimum billed is 0.5 m²)
  const surfaceSqm = useMemo(() => {
    const calculated = (widthCm * heightCm) / 10000;
    return Math.max(0.5, Math.round(calculated * 100) / 100);
  }, [widthCm, heightCm]);

  // Linear perimeter calculation in meters
  const perimeterMeters = useMemo(() => {
    return (2 * (widthCm + heightCm)) / 100;
  }, [widthCm, heightCm]);

  // Number of eyelets (every 50cm around perimeter)
  const eyeletsCount = useMemo(() => {
    if (!eyelets) return 0;
    return Math.max(4, Math.ceil(perimeterMeters / 0.5));
  }, [eyelets, perimeterMeters]);

  // Unit pricing breakdown
  const pricingBreakdown = useMemo(() => {
    const basePrice = surfaceSqm * selectedMaterial.pricePerSqm;
    const laminationPrice = lamination ? surfaceSqm * 500 : 0;
    const eyeletsPrice = eyelets ? eyeletsCount * 50 : 0;
    const hemPrice = reinforcedHem ? perimeterMeters * 150 : 0;
    const cuttingPrice = customCutting ? surfaceSqm * 400 : 0;

    const unitTotal = Math.round(
      basePrice + laminationPrice + eyeletsPrice + hemPrice + cuttingPrice
    );
    const grandTotal = unitTotal * quantity;

    return {
      basePrice,
      laminationPrice,
      eyeletsPrice,
      hemPrice,
      cuttingPrice,
      unitTotal,
      grandTotal,
    };
  }, [
    surfaceSqm,
    selectedMaterial,
    lamination,
    eyelets,
    eyeletsCount,
    reinforcedHem,
    perimeterMeters,
    customCutting,
    quantity,
  ]);

  const handleAddToCart = () => {
    try {
      triggerHapticFeedback("medium");
    } catch {}

    const customId = `large-format-${Date.now()}`;
    const title = isRtl
      ? `${selectedMaterial.nameAr} (${widthCm}×${heightCm} سم)`
      : `${selectedMaterial.name} (${widthCm}x${heightCm} cm)`;

    addToCart({
      id: customId,
      name: title,
      price: pricingBreakdown.unitTotal,
      quantity,
      category: "Impression",
      image: "/products/affiches.jpg",
      selectedOptions: {
        dimensions: `${widthCm}x${heightCm} cm (${surfaceSqm} m²)`,
        material: selectedMaterial.name,
        lamination: lamination ? (isRtl ? "نعم" : "Oui") : (isRtl ? "لا" : "Non"),
        eyelets: eyelets ? `${eyeletsCount} ${isRtl ? "حلقات" : "œillets"}` : (isRtl ? "بدون" : "Sans"),
        hem: reinforcedHem ? (isRtl ? "حواف مقواة" : "Ourlet soudé") : (isRtl ? "عادي" : "Standard"),
        cutting: customCutting ? (isRtl ? "قص مخصص" : "Découpe forme") : (isRtl ? "مستطيل" : "Recto standard"),
      },
    });

    toast.success(
      isRtl ? "تمت إضافة المطبوعات الكبيرة إلى السلة بنجاح!" : "Signalétique ajoutée au panier !"
    );
  };

  const handleDownloadDevis = () => {
    try {
      const doc = new jsPDF();
      const devisNum = `DEV-${Date.now().toString().slice(-6)}`;
      const dateStr = new Date().toLocaleDateString("fr-FR");

      // Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 32, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("L'ARTISAN IMPRIMEUR", 14, 18);
      doc.setFontSize(9);
      doc.text("Solutions d'Impression & Signalétique Grand Format", 14, 25);

      doc.setFontSize(14);
      doc.text(`DEVIS N° ${devisNum}`, 140, 18);
      doc.setFontSize(9);
      doc.text(`Date : ${dateStr} | Valable 15 jours`, 140, 25);

      // Body Info
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(11);
      doc.text("Détails de la Spécification Technique :", 14, 45);

      const items = [
        ["Produit / Matière", selectedMaterial.name],
        ["Dimensions", `${widthCm} cm x ${heightCm} cm`],
        ["Surface Totale", `${surfaceSqm} m²`],
        ["Périmètre Linéaire", `${perimeterMeters} m`],
        ["Finition Lamination", lamination ? "Pelliculage Anti-UV (+500 DA/m²)" : "Aucune"],
        ["Œillets de Fixation", eyelets ? `${eyeletsCount} œillets répartis` : "Sans œillets"],
        ["Ourlet de Renfort", reinforcedHem ? "Ourlet périphérique soudé" : "Coupe brute"],
        ["Découpe Spéciale", customCutting ? "Découpe numérique à la forme" : "Coupe rectiligne"],
        ["Quantité", `${quantity} unité(s)`],
        ["Prix Unitaire HT", `${pricingBreakdown.unitTotal.toLocaleString()} DA`],
        ["Montant Total Estimé", `${pricingBreakdown.grandTotal.toLocaleString()} DA`],
      ];

      let currentY = 55;
      doc.setFontSize(10);
      items.forEach(([label, value]) => {
        doc.setFillColor(currentY % 16 === 0 ? 248 : 255, 250, 252);
        doc.rect(14, currentY - 5, 182, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.text(label, 16, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(value, 100, currentY);
        currentY += 8;
      });

      // Stamp & Notice
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Atelier L'Artisan Imprimeur — Cité Akid Lotfi, Oran, Algérie", 14, 185);
      doc.text("Tél : +213 (0) 550 00 00 00 | Email : contact@artisan-imprimeur.dz", 14, 192);
      doc.text("Paiement par virement bancaire / BaridiMob ou bon de commande officiel.", 14, 199);

      // Cachet box
      doc.setDrawColor(203, 213, 225);
      doc.rect(130, 215, 66, 35);
      doc.text("Cachet & Signature :", 134, 223);

      doc.save(`Devis_${devisNum}_Artisan_Imprimeur.pdf`);
      toast.success(
        isRtl ? "تم تحميل عرض السعر الرسمي بصيغة PDF بنجاح!" : "Devis officiel téléchargé avec succès !"
      );
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? "تعذر إنشاء ملف الـ PDF" : "Erreur lors de la génération du PDF");
    }
  };

  return (
    <div className="ios-glass rounded-[2.5rem] p-6 sm:p-10 border border-white/60 dark:border-white/10 shadow-xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black">
            <Maximize2 size={13} />
            {isRtl ? "حاسبة الطباعة الكبيرة واللافتات" : "Signalétique & Grand Format Pro"}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isRtl ? "تسعير فوري بالمقاس الحر" : "Calculateur Sur-Mesure"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isRtl
              ? "حدد أبعاد اللافتة بالسنتيمتر، واختر الخامة والإضافات للحصول على السعر وعرض السعر فوراً."
              : "Calculez instantanément le coût au m² pour vos bâches, vinyles et panneaux rigides."}
          </p>
        </div>

        <div className="text-start md:text-end shrink-0">
          <span className="text-xs text-slate-400 font-bold block">{isRtl ? "المساحة المحسوبة" : "Surface estimée"}</span>
          <span className="text-2xl font-black text-accent">{surfaceSqm} m²</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Dimensions & Materials */}
        <div className="lg:col-span-7 space-y-6">
          {/* Dimension Controls */}
          <div className="space-y-4">
            <label className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Ruler size={16} className="text-accent" />
              {isRtl ? "1. الأبعاد بالسنتيمتر (cm)" : "1. Dimensions en centimètres (cm)"}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500">{isRtl ? "العرض (Largeur)" : "Largeur"}</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">{widthCm} cm</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="5"
                  value={widthCm}
                  onChange={(e) => setWidthCm(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>20 cm</span>
                  <span>500 cm</span>
                  <span>1000 cm</span>
                </div>
              </div>

              <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500">{isRtl ? "الارتفاع (Hauteur)" : "Hauteur"}</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">{heightCm} cm</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="5"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>20 cm</span>
                  <span>250 cm</span>
                  <span>500 cm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Material Selection */}
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Layers size={16} className="text-accent" />
              {isRtl ? "2. نوع الخامة ومادة الطباعة" : "2. Sélection du Support / Matière"}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {MATERIALS.map((mat) => {
                const isSelected = mat.id === selectedMaterialId;
                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => setSelectedMaterialId(mat.id)}
                    className={`p-4 rounded-2xl text-start transition-all border flex flex-col justify-between ${
                      isSelected
                        ? "bg-accent/10 border-accent shadow-md shadow-accent/10"
                        : "bg-white/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 hover:bg-white/80"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {isRtl ? mat.nameAr : mat.name}
                        </span>
                        {mat.popular && (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[10px] font-black rounded-full">
                            ★ {isRtl ? "الأكثر طلباً" : "Top"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {isRtl ? mat.descriptionAr : mat.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center text-xs">
                      <span className="text-slate-400">{isRtl ? "السعر للمتر²" : "Prix au m²"}</span>
                      <span className="font-black text-accent">{mat.pricePerSqm.toLocaleString()} DA</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Finishing Options */}
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck size={16} className="text-accent" />
              {isRtl ? "3. اللمسات الفنية والتجهيز" : "3. Finitions & Accessoires"}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Lamination */}
              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lamination}
                  onChange={(e) => setLamination(e.target.checked)}
                  className="w-5 h-5 rounded-lg text-accent accent-accent"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {isRtl ? "سلوفان حماية UV" : "Pelliculage Anti-UV"}
                  </span>
                  <span className="text-slate-400 text-[10px]">+500 DA / m²</span>
                </div>
              </label>

              {/* Eyelets */}
              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eyelets}
                  onChange={(e) => setEyelets(e.target.checked)}
                  className="w-5 h-5 rounded-lg text-accent accent-accent"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {isRtl ? `حلقات تثبيت (${eyeletsCount} حلقة)` : `Œillets Métal (${eyeletsCount})`}
                  </span>
                  <span className="text-slate-400 text-[10px]">50 DA / œillet</span>
                </div>
              </label>

              {/* Reinforced Hem */}
              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reinforcedHem}
                  onChange={(e) => setReinforcedHem(e.target.checked)}
                  className="w-5 h-5 rounded-lg text-accent accent-accent"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {isRtl ? "خياطة حواف مقواة" : "Ourlet de Renfort"}
                  </span>
                  <span className="text-slate-400 text-[10px]">+150 DA / m lin.</span>
                </div>
              </label>

              {/* Custom Cutting */}
              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customCutting}
                  onChange={(e) => setCustomCutting(e.target.checked)}
                  className="w-5 h-5 rounded-lg text-accent accent-accent"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {isRtl ? "قص حر بالـ CNC" : "Découpe Numérique"}
                  </span>
                  <span className="text-slate-400 text-[10px]">+400 DA / m²</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Col: Live Summary & Actions */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isRtl ? "ملخص التسعير الفوري" : "Récapitulatif Financier"}
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-black rounded-lg">
                {isRtl ? "جاهز للطلب" : "Disponible"}
              </span>
            </div>

            {/* Spec preview */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">{isRtl ? "الخامة المختارة" : "Support"}</span>
                <span className="font-bold">{isRtl ? selectedMaterial.nameAr : selectedMaterial.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">{isRtl ? "المقاس" : "Dimensions"}</span>
                <span className="font-bold">{widthCm} × {heightCm} cm ({surfaceSqm} m²)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">{isRtl ? "محيط الحواف" : "Périmètre"}</span>
                <span className="font-bold">{perimeterMeters} m</span>
              </div>
              {eyelets && (
                <div className="flex justify-between py-1 border-b border-white/5 text-emerald-300">
                  <span>{isRtl ? "حلقات التثبيت" : "Œillets"}</span>
                  <span>{eyeletsCount} ({pricingBreakdown.eyeletsPrice} DA)</span>
                </div>
              )}
              {lamination && (
                <div className="flex justify-between py-1 border-b border-white/5 text-emerald-300">
                  <span>{isRtl ? "سلوفان الحماية" : "Lamination"}</span>
                  <span>{pricingBreakdown.laminationPrice} DA</span>
                </div>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between bg-white/10 p-3 rounded-2xl">
              <span className="text-xs font-bold text-slate-300">{isRtl ? "الكمية المطلوبة" : "Quantité"}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="font-black text-sm w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Display */}
            <div className="pt-4 border-t border-white/10 text-center">
              <span className="text-xs text-slate-400 font-bold block mb-1">
                {isRtl ? "المجموع الكلي التقديري" : "Montant Total TTC Estimé"}
              </span>
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {pricingBreakdown.grandTotal.toLocaleString()} <span className="text-accent text-xl">DA</span>
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">
                ({pricingBreakdown.unitTotal.toLocaleString()} DA {isRtl ? "للقطعة الواحدة" : "/ unité"})
              </span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 pt-6 relative z-10">
            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full py-4 bg-accent hover:bg-accent-hover text-white rounded-2xl font-black text-sm shadow-xl shadow-accent/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShoppingCart size={18} />
              {isRtl ? "إضافة إلى سلة المشتريات" : "Ajouter au Panier"}
            </button>

            <button
              type="button"
              onClick={handleDownloadDevis}
              className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs border border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {isRtl ? "تنزيل عرض سعر رسمي (Devis PDF)" : "Télécharger le Devis Officiel (PDF)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
