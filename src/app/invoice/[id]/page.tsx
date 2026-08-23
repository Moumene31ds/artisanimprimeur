"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, Printer, ArrowLeft, CheckCircle, MessageCircle, AlertCircle, Share2, FileDown } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { toast } from "sonner";
import { nativeShare } from "@/lib/native";
import { canShareFiles, shareFile, canSaveToFileSystem, saveBlobToFile } from "@/lib/capabilities";

interface OrderItem {
  name: { fr?: string } | string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  status: string;
  customerName: string;
  phone: string;
  wilaya: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  createdAt?: any;
}

// معلومات المؤسسة القابلة للتحكم من لوحة الأدمن (settings/ui) مع قيم احتياطية
interface CompanyInfo {
  shopPhone: string;
  shopAddress: string;
  companyEmail: string;
  legalRc: string;
  legalNif: string;
  legalRib: string;
  bankName: string;
}

const DEFAULT_COMPANY: CompanyInfo = {
  shopPhone: "+213 549 17 90 00",
  shopAddress: "Quartier Akid Lotfi, Oran, Algérie 31000",
  companyEmail: "contact@lartisan.dz",
  legalRc: "31/00-1234567A20",
  legalNif: "0000 987654321 00",
  legalRib: "005 00000 123456789 00",
  bankName: "BDL — Agence Akid Lotfi",
};

const MAX_VISIBLE_ITEMS = 14;

export default function InvoicePage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [company, setCompany] = useState<CompanyInfo>(DEFAULT_COMPANY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    // الحصول على الرابط الحالي لاستخدامه في الـ QR Code
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }

    const fetchOrder = async () => {
      try {
        // جلب بيانات المؤسسة من إعدادات الأدمن (قراءة عامة مسموحة)
        try {
          const settingsSnap = await getDoc(doc(db, "settings", "ui"));
          if (settingsSnap.exists()) {
            const s = settingsSnap.data();
            setCompany((prev) => ({
              ...prev,
              ...(s.shopPhone ? { shopPhone: s.shopPhone } : {}),
              ...(s.invoiceAddress || s.shopAddress ? { shopAddress: s.invoiceAddress || s.shopAddress } : {}),
              ...(s.companyEmail ? { companyEmail: s.companyEmail } : {}),
              ...(s.legalRc ? { legalRc: s.legalRc } : {}),
              ...(s.legalNif ? { legalNif: s.legalNif } : {}),
              ...(s.legalRib ? { legalRib: s.legalRib } : {}),
              ...(s.bankName ? { bankName: s.bankName } : {}),
            }));
          }
        } catch {
          /* الإعدادات اختيارية — نستخدم القيم الافتراضية */
        }

        const docRef = doc(db, "orders", id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        } else {
          setError(true);
        }
      } catch (error) {
        console.error("Error fetching invoice:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading)
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-slate-500 font-medium animate-pulse">Génération de la facture...</p>
      </div>
    );

  if (error || !order)
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-slate-50 gap-4">
        <AlertCircle className="text-red-500" size={64} />
        <h2 className="text-2xl font-bold text-slate-800">Facture Introuvable</h2>
        <p className="text-slate-500">الفاتورة التي تبحث عنها غير موجودة أو تم حذفها.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    );

  const handlePrint = () => window.print();

  /** توليد الفاتورة كملف PDF (تحميل كسول للمكتبات لتخفيف الحزمة). */
  const buildInvoicePdf = async (): Promise<Blob | null> => {
    const paper = document.querySelector(".invoice-paper");
    if (!paper) return null;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(paper as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
    return pdf.output("blob");
  };

  const [pdfBusy, setPdfBusy] = useState(false);

  /** حفظ PDF في ملف يختاره المستخدم (File System Access API) مع تنزيل احتياطي. */
  const handleSavePdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      toast.info("جارٍ تجهيز ملف الـ PDF… / Préparation du PDF…", { duration: 2500 });
      const blob = await buildInvoicePdf();
      if (!blob) throw new Error("no paper");
      const filename = `facture-${invoiceNumber}.pdf`;
      if (canSaveToFileSystem()) {
        const name = await saveBlobToFile(blob, filename);
        toast.success(`تم حفظ الفاتورة (${name}) ✓`);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast.success("تم تنزيل الفاتورة ✓");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("تعذّر إنشاء الـ PDF — استخدم زر الطباعة كبديل.");
    } finally {
      setPdfBusy(false);
    }
  };

  const handleWhatsAppShare = () => {
    const message = `Bonjour ${order.customerName},\n\nVoici le résumé de votre commande chez L'Artisan :\n- Facture N°: ${order.id.slice(-8).toUpperCase()}\n- Montant Total: ${order.total.toLocaleString()} DA\n- Statut: ${order.status}\n\nLien de la facture: ${currentUrl}\n\nMerci pour votre confiance !`;
    const whatsappUrl = `https://wa.me/${order.phone.replace(/^0/, "+213")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleNativeShare = async () => {
    // 1) محاولة مشاركة ملف PDF حقيقي (Web Share Level 2).
    if (canShareFiles()) {
      try {
        const blob = await buildInvoicePdf();
        if (blob) {
          const result = await shareFile(blob, `facture-${invoiceNumber}.pdf`, `Facture ${invoiceNumber}`);
          if (result === "shared") {
            toast.success("تمت مشاركة الفاتورة ✓");
            return;
          }
        }
      } catch {
        /* نُكمل بالمشاركة النصية أدناه */
      }
    }
    // 2) المشاركة النظامية للرابط.
    const ok = await nativeShare({
      title: `Facture ${invoiceNumber}`,
      text: `Facture ${invoiceNumber} — ${order.customerName} — ${order.total.toLocaleString()} DA`,
      url: currentUrl,
    });
    if (!ok) {
      try {
        await navigator.clipboard.writeText(currentUrl);
        toast.success("Lien de la facture copié !");
      } catch {
        toast.error("Impossible de partager la facture");
      }
    }
  };

  const isPaid = order.status.toLowerCase() === "livré" || order.status.toLowerCase() === "payé";

  const invoiceDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 15);

  const invoiceNumber = `INV-${new Date().getFullYear()}-${order.id.slice(-6).toUpperCase()}`;

  // تحسين بيانات الـ QR لتشمل رابط الفاتورة المباشر للمسح السريع
  const qrData = currentUrl || `https://lartisan.dz/invoice/${order.id}`;

  // ===== كثافة تكيفية: تضمن أن الفاتورة تبقى دائماً في ورقة A4 واحدة =====
  const itemCount = order.items?.length || 0;
  const hiddenCount = Math.max(0, itemCount - MAX_VISIBLE_ITEMS);
  const visibleItems = order.items?.slice(0, MAX_VISIBLE_ITEMS) || [];
  // كلما زاد عدد المواد قلّصنا المساحات تلقائياً
  const dense = itemCount > 5;
  const veryDense = itemCount > 10;
  const rowPad = veryDense ? "py-1 px-3" : dense ? "py-2 px-3" : "py-3 px-4";

  return (
    <div className="min-h-dvh bg-slate-200 py-8 px-4 font-sans text-slate-800 print:p-0 print:bg-white" dir="ltr">

      {/* أزرار التحكم (تختفي عند الطباعة) */}
      <div className="max-w-[210mm] mx-auto mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all font-medium border border-slate-200"
        >
          <ArrowLeft size={18} /> Retour
        </button>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={handleNativeShare}
            className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:bg-blue-700 transition-all font-medium"
          >
            <Share2 size={18} /> Partager
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl shadow-md hover:bg-[#1ebd5c] transition-all font-medium"
          >
            <MessageCircle size={18} /> WhatsApp
          </button>
          <button
            onClick={handleSavePdf}
            disabled={pdfBusy}
            className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:bg-emerald-700 transition-all font-medium disabled:opacity-60"
          >
            {pdfBusy ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />} PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl shadow-md hover:bg-slate-800 transition-all font-medium"
          >
            <Printer size={18} /> Imprimer / PDF (A4)
          </button>
        </div>
      </div>

      {/* ورقة الفاتورة (A4) — ارتفاع ثابت لضمان ورقة واحدة فقط عند التصدير PDF */}
      <div className="invoice-paper relative max-w-[210mm] h-[296mm] mx-auto bg-white shadow-2xl overflow-hidden flex flex-col print:shadow-none print:max-w-full">

        {/* شريط علوي ملون */}
        <div className="h-2 w-full bg-slate-900 shrink-0 print:bg-slate-900"></div>

        {/* ختم الدفع */}
        {isPaid && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
            <div className={`transform -rotate-45 border-[8px] border-emerald-500/10 text-emerald-500/10 rounded-3xl px-12 py-4 ${veryDense ? "text-[80px]" : "text-[100px]"}`}>
              <h1 className="font-black tracking-widest uppercase m-0 leading-none">PAYÉ</h1>
            </div>
          </div>
        )}

        <div className={`relative z-10 flex-grow min-h-0 flex flex-col overflow-hidden p-8`}> 

          {/* Header */}
          <div className={`flex justify-between items-start ${dense ? "pb-3 mb-3" : "pb-4 mb-4"} border-b-2 border-slate-100 shrink-0`}>
            <div className="flex gap-3 items-center">
              <div className={`${dense ? "w-11 h-11 text-lg" : "w-14 h-14 text-xl"} bg-slate-900 rounded-xl flex items-center justify-center text-white font-black shadow-sm shrink-0 print:bg-slate-900 print:text-white`}>
                LA
              </div>
              <div>
                <h1 className={`${dense ? "text-2xl" : "text-3xl"} font-black text-slate-900 tracking-tight leading-none`}>L'Artisan</h1>
                <p className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mt-0.5">Impression Pro</p>
                <div className="text-[10px] text-slate-500 mt-1 leading-snug">
                  <p>{company.shopAddress}</p>
                  <p className="font-mono" dir="ltr">{company.shopPhone}</p>
                </div>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <h2 className={`${dense ? "text-3xl" : "text-4xl"} font-black text-slate-200 tracking-tighter uppercase mb-0.5 leading-none`}>Facture</h2>
              {/* الباركود الخطي */}
              <div className={`${dense ? "mb-0 scale-75" : "mb-1 scale-90"} origin-right opacity-80`}>
                <Barcode 
                  value={invoiceNumber.replace('INV-', '')} 
                  height={26} 
                  width={1.5} 
                  displayValue={false} 
                  margin={0} 
                  background="transparent" 
                  lineColor="#0f172a"
                />
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg print:bg-slate-100">
                  {invoiceNumber}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Date : <span className="text-slate-800">{invoiceDate.toLocaleDateString('fr-FR')}</span>
                  {" · "}Échéance : <span className="text-slate-800">{dueDate.toLocaleDateString('fr-FR')}</span>
                </span>
              </div>
            </div>
          </div>

          {/* معلومات العميل والشركة */}
          <div className={`grid grid-cols-2 gap-6 ${dense ? "mb-2" : "mb-4"} shrink-0`}>
            {/* من */}
            <div>
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Émetteur</h3>
              <div className="text-[11px] text-slate-600 space-y-0.5 leading-relaxed">
                <p className="font-black text-slate-900 text-sm">L'Artisan Imprimeur</p>
                <p>{company.shopAddress}</p>
                <p>Email : {company.companyEmail}</p>
                <p className="font-mono" dir="ltr">Tél : {company.shopPhone}</p>
              </div>
            </div>

            {/* إلى */}
            <div>
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Facturé à</h3>
              <div className={`${dense ? "p-2.5" : "p-3"} bg-slate-50/50 rounded-xl border border-slate-100 print:bg-slate-50 print:border-slate-200`}>
                <p className={`${dense ? "text-sm" : "text-base"} font-black text-slate-900 mb-0.5 truncate`}>{order.customerName}</p>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p className="flex justify-between">
                    <span className="text-slate-400">Téléphone</span>
                    <span className="font-mono font-semibold text-slate-800" dir="ltr">{order.phone}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">Wilaya</span>
                    <span className="font-semibold text-slate-800">{order.wilaya}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* جدول المنتجات */}
          <div className="flex-grow min-h-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[9px] uppercase tracking-wider print:bg-slate-900 print:text-white">
                  <th className={`${rowPad} font-bold rounded-l-lg w-1/2`}>Description de l'article</th>
                  <th className={`${rowPad} font-bold text-center`}>Qté</th>
                  <th className={`${rowPad} font-bold text-right`}>P.U.</th>
                  <th className={`${rowPad} font-bold text-right rounded-r-lg`}>Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item, i) => {
                  const itemName = typeof item.name === 'object' ? item.name.fr : item.name;
                  return (
                    <tr key={i} className="page-break-avoid group hover:bg-slate-50/50 transition-colors">
                      <td className={`${rowPad} ${veryDense ? "text-[11px]" : "text-xs"} font-medium text-slate-800 truncate max-w-[320px]`}>{itemName}</td>
                      <td className={`${rowPad} ${veryDense ? "text-[11px]" : "text-xs"} text-center font-bold text-slate-600 bg-slate-50/30 group-hover:bg-transparent`}>{item.quantity}</td>
                      <td className={`${rowPad} ${veryDense ? "text-[11px]" : "text-xs"} text-right text-slate-600 font-mono`}>{item.price.toLocaleString()}</td>
                      <td className={`${rowPad} ${veryDense ? "text-[11px]" : "text-xs"} text-right font-black text-slate-900 font-mono bg-slate-50/30 group-hover:bg-transparent`}>
                        {(item.price * item.quantity).toLocaleString()} DA
                      </td>
                    </tr>
                  );
                })}
                {hiddenCount > 0 && (
                  <tr className="page-break-avoid">
                    <td colSpan={4} className={`${rowPad} text-[11px] italic text-slate-500 bg-slate-50 text-center`}>
                      + {hiddenCount} autre(s) article(s) — inclus dans le total ci-dessous
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* القسم السفلي: المجاميع والـ QR */}
          <div className={`flex justify-between items-end gap-8 mt-auto pt-3 shrink-0`}>

            {/* QR و الشروط */}
            <div className="w-1/2 space-y-2">
              <div className="flex gap-3 items-center">
                <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm shrink-0 print:border-slate-300">
                  <QRCodeSVG value={qrData} size={dense ? 60 : 72} level="H" />
                </div>
                <div className="text-[8px] text-slate-500 uppercase tracking-widest space-y-0.5 font-medium">
                  <p className="font-bold text-slate-700">Scan Vérification</p>
                  <p>Document Officiel</p>
                  <p>Lien direct vers la facture</p>
                </div>
              </div>

              <div className="text-[9px] text-slate-500 leading-relaxed pr-4 border-t border-slate-100 pt-1.5">
                <p className="font-bold text-slate-700 uppercase mb-0.5">Conditions de paiement</p>
                <p>En cas de paiement différé, l'échéance est fixée au <span className="font-bold">{dueDate.toLocaleDateString('fr-FR')}</span>. Veuillez mentionner le N° de facture lors du règlement.</p>
              </div>
            </div>

            {/* الحسابات */}
            <div className="w-1/2">
              <div className={`${dense ? "space-y-1" : "space-y-2"} text-xs p-3.5 rounded-xl bg-slate-50 border border-slate-100 print:bg-slate-50 print:border-slate-200`}>
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total ({itemCount})</span>
                  <span className="font-mono">{order.subtotal.toLocaleString()} DA</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Remise</span>
                    <span className="font-mono">- {order.discount.toLocaleString()} DA</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Livraison</span>
                  <span className="font-mono">{Number(order.deliveryFee) > 0 ? `${Number(order.deliveryFee).toLocaleString()} DA` : "Gratuit"}</span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200/80">
                  <span className="text-sm font-bold text-slate-900 uppercase">Total Net</span>
                  <div className="flex items-center gap-1.5">
                    {isPaid && <CheckCircle size={15} className="text-emerald-500 print:text-emerald-600" />}
                    <span className="text-lg font-black font-mono text-slate-900">{order.total.toLocaleString()} DA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* الفوتر القانوني */}
        <div className="bg-slate-900 text-slate-400 px-6 py-2.5 text-[8px] shrink-0 print:bg-white print:text-slate-500 print:border-t-2 print:border-slate-900">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-bold text-white print:text-slate-800 uppercase">Immatriculation</p>
              <p>RC : {company.legalRc}</p>
              <p>NIF : {company.legalNif}</p>
            </div>
            <div>
              <p className="font-bold text-white print:text-slate-800 uppercase">Contact</p>
              <p dir="ltr">{company.shopPhone}</p>
              <p>{company.companyEmail}</p>
            </div>
            <div>
              <p className="font-bold text-white print:text-slate-800 uppercase">Banque</p>
              <p>{company.bankName}</p>
              <p>RIB : <span dir="ltr">{company.legalRib}</span></p>
            </div>
          </div>
        </div>

      </div>

      <InvoicePrintStyles />
    </div>
  );
}

function InvoicePrintStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: INVOICE_PRINT_CSS }} />
  );
}

const INVOICE_PRINT_CSS = `
@media print {
  @page {
    size: A4;
    margin: 0;
  }

  body * { visibility: hidden !important; }
  .invoice-paper, .invoice-paper * { visibility: visible !important; }

  html, body, main {
    position: static !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 210mm !important;
    height: auto !important;
    overflow: visible !important;
    box-shadow: none !important;
    background-color: white !important;
  }

  .invoice-paper {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 210mm !important;
    /* ارتفاع أقل قليلاً من 297mm لتفادي انزلاق صفحة فارغة ثانية بسبب التقريب */
    height: 296mm !important;
    min-height: unset !important;
    max-height: 296mm !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: hidden !important;
    border: none !important;
    box-shadow: none !important;
    background: white !important;
    page-break-after: avoid !important;
    break-after: avoid-page !important;
  }

  .print\\:hidden {
    display: none !important;
    visibility: hidden !important;
  }

  .page-break-avoid {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  /* منع أي انقسام للصفوف بين الصفحات */
  table, tr, td, th, tbody, thead {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  ::-webkit-scrollbar { display: none; }
}
`;
