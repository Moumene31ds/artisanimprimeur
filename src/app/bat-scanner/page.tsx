"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { 
  Upload, Sparkles, AlertTriangle, CheckCircle2, ShieldAlert,
  Sliders, Download, RefreshCw, ZoomIn, Eye, FileText, ArrowLeftRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { useAppStore } from "@/lib/store";

import confetti from "canvas-confetti";

interface PrintFormat {
  id: string;
  name: string;
  nameAr: string;
  widthMm: number;
  heightMm: number;
  description: string;
  descriptionAr: string;
}

const PRINT_FORMATS: PrintFormat[] = [
  { id: "carte", name: "Carte de Visite", nameAr: "بطاقة عمل", widthMm: 90, heightMm: 55, description: "Format standard 90x55mm", descriptionAr: "المقاس القياسي 90×55 مم" },
  { id: "a5", name: "Flyer A5", nameAr: "منشور A5", widthMm: 148, heightMm: 210, description: "Format A5 148x210mm", descriptionAr: "مقاس A5 148×210 مم" },
  { id: "a4", name: "Poster A4", nameAr: "ملصق A4", widthMm: 210, heightMm: 297, description: "Format A4 210x297mm", descriptionAr: "مقاس A4 210×297 مم" },
  { id: "a3", name: "Poster A3", nameAr: "ملصق A3", widthMm: 297, heightMm: 420, description: "Format A3 297x420mm", descriptionAr: "مقاس A3 297×420 مم" },
];

export default function BatScannerPage() {
  const { language } = useAppStore();
  const isRtl = language === "ar";

  // --- States ---
  const [selectedFormat, setSelectedFormat] = useState<PrintFormat>(PRINT_FORMATS[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);
  
  // Customizer inputs
  const [zoom, setZoom] = useState<number>(100);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [cmykSplit, setCmykSplit] = useState<number>(50); // slider percent

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [report, setReport] = useState<any | null>(null);
  const [approved, setApproved] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingOffset, setIsDraggingOffset] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Reset states when changing format or file
  const handleReset = () => {
    setSelectedFile(null);
    setImageUrl(null);
    setImageMeta(null);
    setZoom(100);
    setOffsetX(0);
    setOffsetY(0);
    setReport(null);
    setApproved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle file drop/upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(isRtl ? "يرجى تحميل صورة فقط (PNG, JPEG)" : "Veuillez charger uniquement une image.");
      return;
    }
    setAnalyzing(true);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    // Get image dimensions
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setImageMeta({ width: img.width, height: img.height });
      runQualityCheck(img.width, img.height, file.size);
    };
  };

  // Run simulated/actual analysis
  const runQualityCheck = (widthPx: number, heightPx: number, sizeBytes: number) => {
    setTimeout(() => {
      // DPI calculations
      const widthIn = selectedFormat.widthMm / 25.4;
      const heightIn = selectedFormat.heightMm / 25.4;
      
      const dpiX = Math.round(widthPx / widthIn);
      const dpiY = Math.round(heightPx / heightIn);
      const avgDpi = Math.round((dpiX + dpiY) / 2);

      // Check aspect ratios
      const targetRatio = selectedFormat.widthMm / selectedFormat.heightMm;
      const imgRatio = widthPx / heightPx;
      const ratioDiff = Math.abs(targetRatio - imgRatio);
      const ratioMatches = ratioDiff < 0.15;

      // Grade calculation
      let score = 100;
      let issues: string[] = [];
      let issuesAr: string[] = [];

      // DPI deductions
      if (avgDpi < 150) {
        score -= 40;
        issues.push("Résolution extrêmement basse. L'impression sera pixelisée.");
        issuesAr.push("دقة منخفضة جداً. ستكون الطباعة مشوشة وغير واضحة.");
      } else if (avgDpi < 300) {
        score -= 15;
        issues.push("Résolution moyenne. Acceptable mais non optimale.");
        issuesAr.push("دقة متوسطة. مقبولة ولكن ليست ممتازة.");
      }

      // Aspect ratio deductions
      if (!ratioMatches) {
        score -= 15;
        issues.push("Le ratio d'aspect de l'image ne correspond pas au format. Risque de rognage.");
        issuesAr.push("نسبة أبعاد الصورة لا تطابق مقاس الطباعة المختار. قد يتم قص أجزاء منها.");
      }

      // File size suggestions
      if (sizeBytes < 500 * 1024) {
        score -= 5;
        issues.push("Taille de fichier faible, compresse possible.");
        issuesAr.push("حجم الملف صغير جداً، قد يكون مضغوطاً ويفقد التفاصيل.");
      }

      const finalScore = Math.max(10, score);
      let grade = "A";
      if (finalScore < 50) grade = "D";
      else if (finalScore < 70) grade = "C";
      else if (finalScore < 85) grade = "B";

      setReport({
        dpi: avgDpi,
        score: finalScore,
        grade,
        issues,
        issuesAr,
        fileSizeMb: (sizeBytes / (1024 * 1024)).toFixed(2),
        dimensions: `${widthPx} x ${heightPx} px`
      });
      setAnalyzing(false);
    }, 1500);
  };

  // Re-run checking when format changes and file is already loaded
  useEffect(() => {
    if (imageUrl && imageMeta && selectedFile) {
      setAnalyzing(true);
      runQualityCheck(imageMeta.width, imageMeta.height, selectedFile.size);
    }
  }, [selectedFormat]);

  // Drag logic to position texture inside frame
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingOffset(true);
    dragStart.current = { x: e.clientX - offsetX, y: e.clientY - offsetY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingOffset) return;
    setOffsetX(e.clientX - dragStart.current.x);
    setOffsetY(e.clientY - dragStart.current.y);
  };

  const handleMouseUp = () => {
    setIsDraggingOffset(false);
  };

  // Touch handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDraggingOffset(true);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX - offsetX, y: touch.clientY - offsetY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingOffset) return;
    const touch = e.touches[0];
    setOffsetX(touch.clientX - dragStart.current.x);
    setOffsetY(touch.clientY - dragStart.current.y);
  };

  // Export to PDF Bon à Tirer — jsPDF يُحمَّل عند الطلب فقط
  const handleExportPDF = async () => {
    if (!report || !imageUrl) return;

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: selectedFormat.widthMm > selectedFormat.heightMm ? "l" : "p",
        unit: "mm",
        format: [selectedFormat.widthMm + 20, selectedFormat.heightMm + 60] // Bleeds + text info margins
      });

      const w = selectedFormat.widthMm;
      const h = selectedFormat.heightMm;

      // Draw background
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');

      // Title header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("L'ARTISAN IMPRIMEUR - BON A TIRER (BAT)", 10, 15);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Format: ${selectedFormat.name} (${w}x${h}mm) | Resolution: ${report.dpi} DPI`, 10, 20);
      doc.text(`Date: ${new Date().toLocaleString()} | Score AI: ${report.score}% (Grade ${report.grade})`, 10, 24);

      // Render actual design onto PDF page
      // Subtract margins
      const printX = 10;
      const printY = 30;
      doc.rect(printX - 1, printY - 1, w + 2, h + 2, 'S'); // Outline format border
      
      // Safe zone guide lines
      doc.setDrawColor(239, 68, 68); // Red bleed
      doc.setLineDashPattern([1, 1], 0);
      doc.rect(printX + 3, printY + 3, w - 6, h - 6, 'S');
      
      // Image
      doc.addImage(imageUrl, 'JPEG', printX, printY, w, h);

      // Footer
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(226, 232, 240);
      doc.line(10, printY + h + 10, doc.internal.pageSize.getWidth() - 10, printY + h + 10);
      
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("Document certifie conforme - Valide numeriquement comme BAT pour lancement en impression.", 10, printY + h + 15);
      doc.text("Artisan Imprimeur Algiers. Tel: +213 549 17 90 00", 10, printY + h + 19);

      // Save file
      doc.save(`BAT_${selectedFormat.id}_${Date.now()}.pdf`);
      toast.success(isRtl ? "تم تحميل وثيقة الـ BAT بنجاح!" : "Document BAT exporté avec succès !");

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setApproved(true);
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? "حدث خطأ أثناء تصدير الملف" : "Erreur lors de la génération du PDF.");
    }
  };

  return (
    <div className={`max-w-6xl mx-auto pb-24 ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Dynamic SVG Filter for CMYK Simulation */}
      <svg className="hidden">
        <defs>
          <filter id="cmyk-simulation">
            {/* CMYK color ink mapping (reduces fluorescence of RGB greens and cyans, slight contrast bump) */}
            <feColorMatrix type="matrix" values="
              0.88  0.05  0.02  0.00  0.02
              0.03  0.84  0.05  0.00  0.03
              0.02  0.10  0.78  0.00  0.04
              0.00  0.00  0.00  1.00  0.00
            " />
            <feComponentTransfer>
              {/* Desaturate bright tones */}
              <feFuncR type="linear" slope="0.95" />
              <feFuncG type="linear" slope="0.92" />
              <feFuncB type="linear" slope="0.88" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <header className="mb-10 text-center md:text-start flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider mb-2.5 inline-block border border-indigo-200 dark:border-indigo-900">
            <Sparkles size={12} className="inline mr-1" /> {isRtl ? "معاينة ما قبل الطباعة بالذكاء الاصطناعي" : "Vérificateur Pré-presse AI"}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {isRtl ? "استوديو فحص وحساب دقة المطبوعات (BAT)" : "AI Printability & Resolution Checker"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-1">
            {isRtl 
              ? "افحص ملفات تصميمك بدقة وتفادى عيوب الهوامش واختلاف ألوان الـ RGB والـ CMYK قبل تأكيد الطلبية."
              : "Vérifiez vos fichiers, ajustez les marges de sécurité et visualisez le rendu CMYK avant impression."}
          </p>
        </div>
        <Link href="/" className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-black transition-transform">
          {isRtl ? "العودة للرئيسية" : "Retour"}
        </Link>
      </header>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Upload & Customizer Canvas */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Format Selector Grid */}
          <div className="premium-glass p-5 rounded-[2rem] border border-white/60 dark:border-slate-800 shadow-md">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
              {isRtl ? "1. اختر مقاس الطباعة المستهدف :" : "1. Format ciblé d'impression :"}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PRINT_FORMATS.map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt)}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center transition-all ${
                    selectedFormat.id === fmt.id
                      ? "bg-slate-900 dark:bg-accent border-transparent text-white shadow-lg scale-[1.02]"
                      : "bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-850 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="text-sm font-black">{isRtl ? fmt.nameAr : fmt.name}</span>
                  <span className="text-[10px] mt-1 opacity-70 font-semibold">{fmt.widthMm} x {fmt.heightMm} mm</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Screen Wrapper */}
          <div className="premium-glass p-6 md:p-8 rounded-[2.5rem] border border-white/60 dark:border-slate-800 shadow-lg flex flex-col items-center min-h-[450px] justify-center relative overflow-hidden">
            
            {!imageUrl ? (
              // Drag and drop Uploader view
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-lg border-3 border-dashed border-slate-350 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 p-10 md:p-14 rounded-[2rem] text-center cursor-pointer bg-slate-50/20 dark:bg-slate-900/10 hover:bg-white/30 dark:hover:bg-slate-900/30 transition-all flex flex-col items-center justify-center group"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <h4 className="text-lg font-black text-slate-800 dark:text-white mb-2">
                  {isRtl ? "ارفع لقطة تصميمك هنا" : "Uploader votre maquette de design"}
                </h4>
                <p className="text-xs text-slate-400 font-bold max-w-xs leading-relaxed">
                  {isRtl 
                    ? "اسحب وأفلت الملف أو انقر للتصفح. يدعم صيغ PNG, JPG, JPEG بجودة عالية."
                    : "Glissez-déposez le fichier ou cliquez. Formats PNG, JPG supportés."}
                </p>
                <span className="mt-4 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded-lg">
                  {isRtl ? "فحص فوري للـ CMYK والهوامش" : "Scanneur de conformité instantané"}
                </span>
              </div>
            ) : (
              // Active Previewer & Split CMYK slider
              <div className="w-full flex flex-col items-center gap-6">
                
                {/* Control Tooltips */}
                <div className="flex flex-wrap gap-4 w-full justify-between items-center text-xs font-bold text-slate-500 bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <ZoomIn size={14} className="text-indigo-500" />
                    <span>{isRtl ? `التكبير: ${zoom}%` : `Zoom: ${zoom}%`}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block"></span> {isRtl ? "هوامش القص (Bleed)" : "Bleed Marge"}</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block"></span> {isRtl ? "المنطقة الآمنة للخطوط" : "Zone texte sûre"}</span>
                  </div>
                </div>

                {/* Simulated Canvas Frame */}
                <div 
                  ref={containerRef}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                  className="relative overflow-hidden border-2 border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-900 flex items-center justify-center select-none shadow-inner rounded-2xl cursor-move touch-none"
                  style={{
                    // Scale frame based on format ratio
                    width: "100%",
                    maxWidth: "480px",
                    aspectRatio: `${selectedFormat.widthMm} / ${selectedFormat.heightMm}`,
                  }}
                >
                  
                  {/* RGB original side */}
                  <div 
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                      transform: `scale(${zoom / 100}) translate(${offsetX}px, ${offsetY}px)`,
                      transformOrigin: "center",
                      backgroundImage: `url(${imageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                  />

                  {/* CMYK simulation side (Clip Path based on slider percentage) */}
                  <div 
                    className="absolute inset-0 z-20 pointer-events-none"
                    style={{
                      transform: `scale(${zoom / 100}) translate(${offsetX}px, ${offsetY}px)`,
                      transformOrigin: "center",
                      backgroundImage: `url(${imageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "url(#cmyk-simulation)",
                      clipPath: `inset(0 0 0 ${cmykSplit}%)`, // reveal CMYK on right
                    }}
                  />

                  {/* Split visual line */}
                  <div 
                    className="absolute top-0 bottom-0 z-30 w-1 bg-white shadow-2xl flex items-center justify-center pointer-events-none"
                    style={{ left: `${cmykSplit}%` }}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] shadow-lg border-2 border-white">
                      <ArrowLeftRight size={10} className="rotate-90" />
                    </div>
                  </div>

                  {/* Guides Layer (Red bleed area, blue safe zone margins) */}
                  <div className="absolute inset-0 z-40 border-[4px] border-red-500/80 pointer-events-none border-dashed">
                    {/* Inner Safe Zone Border (e.g. 5mm margin inside) */}
                    <div 
                      className="absolute inset-3 border-2 border-blue-500/60 border-dashed"
                      title="Safe text boundary"
                    />
                  </div>
                </div>

                {/* Adjustments Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4">
                  {/* Zoom Adjust */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wide">
                      🎨 {isRtl ? "التكبير والموضع :" : "Taille du design :"}
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range"
                        min="50"
                        max="200"
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 accent-indigo-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <button 
                        onClick={() => { setZoom(100); setOffsetX(0); setOffsetY(0); }}
                        className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                        title={isRtl ? "إعادة تعيين" : "Reset"}
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  {/* CMYK Slider */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                    <div className="flex justify-between text-xs font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                      <span>🖥️ RGB (المعروض على الشاشة)</span>
                      <span>🖨️ CMYK (ألوان الحبر المقدرة)</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={cmykSplit}
                      onChange={(e) => setCmykSplit(Number(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Reset button */}
                <button 
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-red-500/10 text-red-500 border border-red-500/25 hover:bg-red-500/20 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  {isRtl ? "حذف الملف ورفع تصميم آخر" : "Changer de design"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: AI Analytics Report Card */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="premium-glass p-6 md:p-8 rounded-[2.5rem] border border-white/60 dark:border-slate-800 shadow-xl">
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Eye size={20} className="text-indigo-500" />
              {isRtl ? "تقرير فحص الجودة" : "Rapport de conformité"}
            </h2>

            {analyzing ? (
              <div className="py-14 text-center space-y-3 flex flex-col items-center">
                <RefreshCw size={36} className="animate-spin text-indigo-500 mb-2" />
                <h4 className="font-black text-slate-800 dark:text-white text-sm">{isRtl ? "جاري قياس الدقة والألوان..." : "Analyse du fichier..."}</h4>
                <p className="text-xs text-slate-400">{isRtl ? "نحلل أبعاد الصورة والبكسل" : "Calcul du DPI et aspect ratio..."}</p>
              </div>
            ) : !report ? (
              <div className="py-20 text-center text-slate-400">
                <FileText size={48} className="mx-auto opacity-20 mb-3" />
                <p className="text-xs font-bold leading-relaxed">
                  {isRtl 
                    ? "ارفع تصميمك للحصول على تقرير جودة فوري ومراجعة البكسل والمقاسات." 
                    : "Uploadez une image pour générer le rapport de qualité."}
                </p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                {/* Score & Grade Display */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-inner">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">{isRtl ? "درجة التقييم" : "Grade de Qualité"}</span>
                    <span className={`text-4xl font-black ${
                      report.grade === 'A' ? 'text-emerald-500' : report.grade === 'B' ? 'text-blue-500' : report.grade === 'C' ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {report.grade}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">{isRtl ? "النسبة التقريبية" : "Score de Printability"}</span>
                    <span className="text-2xl font-black text-slate-850 dark:text-slate-200">{report.score}%</span>
                  </div>
                </div>

                {/* Specs List */}
                <div className="space-y-2 text-xs font-bold text-slate-650 dark:text-slate-350">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                    <span>{isRtl ? "دقة البكسل :" : "Résolution Pixel :"}</span>
                    <span className="text-slate-800 dark:text-white">{report.dimensions}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                    <span>{isRtl ? "درجة الوضوح المقدرة :" : "DPI Estimé :"}</span>
                    <span className={`px-2 py-0.5 rounded-md ${
                      report.dpi >= 300 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20' : report.dpi >= 150 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950/20' : 'bg-red-100 text-red-600 dark:bg-red-950/20'
                    }`}>
                      {report.dpi} DPI
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                    <span>{isRtl ? "حجم الملف :" : "Taille du Fichier :"}</span>
                    <span className="text-slate-800 dark:text-white">{report.fileSizeMb} MB</span>
                  </div>
                </div>

                {/* Dynamic Issues & Warnings */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? "التوصيات والتحذيرات :" : "Alertes et Recommandations :"}</h4>
                  {report.issues.length === 0 ? (
                    <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-2xl text-xs border border-emerald-150 dark:border-emerald-900/50">
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-black mb-0.5">{isRtl ? "الملف جاهز ومطابق 100%" : "Fichier parfait !"}</h5>
                        <p className="opacity-90 leading-relaxed font-semibold">{isRtl ? "التصميم يلبي كل معايير الجودة والقص وحساب الألوان." : "Votre image respecte toutes les spécifications techniques de la presse."}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {report.issues.map((issue: string, idx: number) => {
                        const isSevere = report.dpi < 150 && idx === 0;
                        return (
                          <div 
                            key={idx} 
                            className={`flex items-start gap-2.5 p-3 rounded-2xl text-xs ${
                              isSevere 
                                ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-150 dark:border-red-900/40' 
                                : 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 border border-yellow-150 dark:border-yellow-900/40'
                            }`}
                          >
                            {isSevere ? <ShieldAlert size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                            <span className="leading-relaxed font-semibold">{isRtl ? report.issuesAr[idx] : issue}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Call to Action Actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <button
                    onClick={handleExportPDF}
                    className="w-full py-4 bg-gradient-to-tr from-slate-900 to-indigo-950 dark:from-accent dark:to-indigo-600 text-white rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer btn-shine relative overflow-hidden"
                  >
                    <Download size={14} />
                    {isRtl ? "تحميل وثيقة BAT والموافقة" : "Valider & Télécharger le BAT (PDF)"}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center leading-relaxed font-bold">
                    {isRtl 
                      ? "الموافقة على الـ BAT تعني أنك تقر بسلامة الألوان والنصوص وهوامش القص المعروضة." 
                      : "La validation du BAT engage votre responsabilité sur le placement des textes et des couleurs."}
                  </p>
                </div>

              </motion.div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
