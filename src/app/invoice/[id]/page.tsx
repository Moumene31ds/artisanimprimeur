"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, Printer, ArrowLeft, CheckCircle, MessageCircle, AlertCircle, Share2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode"; // المكتبة الجديدة للباركود
import { toast } from "sonner";
import { nativeShare } from "@/lib/native";

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

export default function InvoicePage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
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

  const handleWhatsAppShare = () => {
    const message = `Bonjour ${order.customerName},\n\nVoici le résumé de votre commande chez L'Artisan :\n- Facture N°: ${order.id.slice(-8).toUpperCase()}\n- Montant Total: ${order.total.toLocaleString()} DA\n- Statut: ${order.status}\n\nLien de la facture: ${currentUrl}\n\nMerci pour votre confiance !`;
    const whatsappUrl = `https://wa.me/${order.phone.replace(/^0/, "+213")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleNativeShare = async () => {
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
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl shadow-md hover:bg-slate-800 transition-all font-medium"
          >
            <Printer size={18} /> Imprimer / PDF
          </button>
        </div>
      </div>

      {/* ورقة الفاتورة (A4 Format) */}
      <div className="invoice-paper relative max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl overflow-hidden flex flex-col print:shadow-none print:max-w-full">
        
        {/* شريط علوي ملون */}
        <div className="h-3 w-full bg-slate-900 absolute top-0 left-0 print:bg-slate-900"></div>

        {/* ختم الدفع */}
        {isPaid && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
            <div className="transform -rotate-45 border-[8px] border-emerald-500/10 text-emerald-500/10 rounded-3xl px-12 py-4">
              <h1 className="text-[120px] font-black tracking-widest uppercase m-0 leading-none">PAYÉ</h1>
            </div>
          </div>
        )}

        <div className="relative z-10 p-10 sm:p-14 flex-grow flex flex-col">
          
          {/* Header */}
          <div className="flex justify-between items-start pb-6 mb-6 border-b-2 border-slate-100">
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-sm print:bg-slate-900 print:text-white">
                LA
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">L'Artisan</h1>
                <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mt-1">Impression Pro</p>
              </div>
            </div>
            
            <div className="text-right flex flex-col items-end">
              <h2 className="text-4xl font-black text-slate-200 tracking-tighter uppercase mb-2">Facture</h2>
              {/* الباركود الخطي الجديد هنا */}
              <div className="mb-2 scale-90 origin-right opacity-80">
                <Barcode 
                  value={invoiceNumber.replace('INV-', '')} 
                  height={30} 
                  width={1.5} 
                  displayValue={false} 
                  margin={0} 
                  background="transparent" 
                  lineColor="#0f172a"
                />
              </div>
              <div className="flex flex-col items-end gap-1.5 text-sm">
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg print:bg-slate-100">
                  {invoiceNumber}
                </span>
                <span className="text-slate-500 font-medium">Date : <span className="text-slate-800">{invoiceDate.toLocaleDateString('fr-FR')}</span></span>
              </div>
            </div>
          </div>

          {/* معلومات العميل والشركة */}
          <div className="grid grid-cols-2 gap-10 mb-8">
            {/* من */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Émetteur</h3>
              <div className="text-sm text-slate-600 space-y-1.5 leading-relaxed">
                <p className="font-bold text-slate-900 text-base">L'Artisan Imprimeur</p>
                <p>Quartier Akid Lotfi</p>
                <p>Oran, Algérie 31000</p>
                <p className="pt-2 text-slate-500">Email : contact@lartisan.dz</p>
                <p className="font-mono text-slate-500">Tél : +213 549 17 90 00</p>
              </div>
            </div>

            {/* إلى */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Facturé à</h3>
              <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 print:bg-slate-50 print:border-slate-200">
                <p className="font-black text-lg text-slate-900 mb-2">{order.customerName}</p>
                <div className="text-sm text-slate-600 space-y-2">
                  <p className="flex justify-between">
                    <span className="text-slate-400">Téléphone</span>
                    <span className="font-mono font-medium text-slate-800">{order.phone}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">Wilaya</span>
                    <span className="font-medium text-slate-800">{order.wilaya}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* جدول المنتجات */}
          <div className="mb-8 flex-grow">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider print:bg-slate-900 print:text-white">
                  <th className="py-3 px-4 font-bold rounded-l-lg w-1/2">Description de l'article</th>
                  <th className="py-3 px-4 font-bold text-center">Qté</th>
                  <th className="py-3 px-4 font-bold text-right">Prix Unitaire</th>
                  <th className="py-3 px-4 font-bold text-right rounded-r-lg">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {order.items?.map((item, i) => {
                  const itemName = typeof item.name === 'object' ? item.name.fr : item.name;
                  return (
                    <tr key={i} className="page-break-avoid group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-medium text-slate-800">{itemName}</td>
                      <td className="py-4 px-4 text-center font-bold text-slate-600 bg-slate-50/30 group-hover:bg-transparent">{item.quantity}</td>
                      <td className="py-4 px-4 text-right text-slate-600 font-mono">{item.price.toLocaleString()} DA</td>
                      <td className="py-4 px-4 text-right font-black text-slate-900 font-mono bg-slate-50/30 group-hover:bg-transparent">
                        {(item.price * item.quantity).toLocaleString()} DA
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          {/* القسم السفلي: المجاميع والـ QR */}
          <div className="flex justify-between items-end gap-8 mt-auto pt-6">
            
            {/* QR و الشروط */}
            <div className="w-1/2 space-y-6">
              <div className="flex gap-4 items-center">
                <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm print:border-slate-300">
                  <QRCodeSVG value={qrData} size={80} level="H" />
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest space-y-1.5 font-medium">
                  <p className="font-bold text-slate-700">Scan Vérification</p>
                  <p>Document Officiel</p>
                  <p>Lien direct vers la facture</p>
                </div>
              </div>
              
              <div className="text-[11px] text-slate-500 leading-relaxed pr-8 border-t border-slate-100 pt-4">
                <p className="font-bold text-slate-700 uppercase mb-1">Conditions de paiement</p>
                <p>En cas de paiement différé, l'échéance est fixée au <span className="font-bold">{dueDate.toLocaleDateString('fr-FR')}</span>. Veuillez mentionner le N° de facture lors du règlement.</p>
              </div>
            </div>

            {/* الحسابات */}
            <div className="w-1/2">
              <div className="space-y-3 text-sm p-5 rounded-2xl bg-slate-50 border border-slate-100 print:bg-slate-50 print:border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total</span>
                  <span className="font-mono">{order.subtotal.toLocaleString()} DA</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Remise</span>
                    <span className="font-mono">- {order.discount.toLocaleString()} DA</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Livraison (retrait atelier)</span>
                  <span className="font-mono">{Number(order.deliveryFee) > 0 ? `${Number(order.deliveryFee).toLocaleString()} DA` : "Gratuit"}</span>
                </div>
                <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-200/80">
                  <span className="text-base font-bold text-slate-900 uppercase">Total Net</span>
                  <div className="flex items-center gap-2">
                    {isPaid && <CheckCircle size={18} className="text-emerald-500 print:text-emerald-600" />}
                    <span className="text-xl font-black font-mono text-slate-900">{order.total.toLocaleString()} DA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* الفوتر القانوني */}
        <div className="bg-slate-900 text-slate-400 p-6 text-[10px] print:bg-white print:text-slate-500 print:border-t-2 print:border-slate-900 mt-auto">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-bold text-white print:text-slate-800 mb-1 uppercase">Immatriculation</p>
              <p>RC : 31/00-1234567A20</p>
              <p>NIF : 0000 987654321 00</p>
            </div>
            <div>
              <p className="font-bold text-white print:text-slate-800 mb-1 uppercase">Contact</p>
              <p>+213 549 17 90 00</p>
              <p>contact@lartisan.dz</p>
            </div>
            <div>
              <p className="font-bold text-white print:text-slate-800 mb-1 uppercase">Banque (BDL)</p>
              <p>Agence Akid Lotfi</p>
              <p>RIB : 005 00000 123456789 00</p>
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
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
            width: 100% !important;
            height: auto !important;
            box-shadow: none !important;
            background-color: white !important;
          }
          
          .invoice-paper {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          
          .print\\:hidden { 
            display: none !important; 
            visibility: hidden !important;
          }
          
          .page-break-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
          }
          
          ::-webkit-scrollbar { display: none; }
        }
      `}} />
    </div>
  );
}
