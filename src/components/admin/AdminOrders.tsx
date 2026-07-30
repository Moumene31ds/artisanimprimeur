"use client";

import { motion } from "framer-motion";
import { 
  ShoppingBag, Search, CreditCard, Truck, Image as ImageIcon, FileImage, 
  Printer, Trash2, MessageCircle, Loader2
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

interface AdminOrdersProps {
  orders: any[];
  isRtl: boolean;
  orderSearch: string;
  setOrderSearch: (val: string) => void;
  orderStatusFilter: string;
  setOrderStatusFilter: (val: string) => void;
  updateOrderProof: (id: string, proofUrl: string) => void;
  updateOrderStatus: (id: string, status: string) => void;
  deleteOrder: (id: string) => void;
}

export default function AdminOrders({
  orders,
  isRtl,
  orderSearch,
  setOrderSearch,
  orderStatusFilter,
  setOrderStatusFilter,
  updateOrderProof,
  updateOrderStatus,
  deleteOrder
}: AdminOrdersProps) {
  const [sendingWA, setSendingWA] = useState<Record<string, boolean>>({});

  const handleSendWANotification = async (order: any, type: string) => {
    setSendingWA(prev => ({ ...prev, [`${order.id}-${type}`]: true }));
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          phone: order.phone,
          data: {
            customerName: order.customerName,
            orderId: order.id,
            total: order.total,
            newStatus: order.status,
            batUrl: order.printProofUrl,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? 'تم إرسال الإشعار' : 'Notification envoyée');
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSendingWA(prev => ({ ...prev, [`${order.id}-${type}`]: false }));
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = (o.customerName?.toLowerCase() || '').includes(orderSearch.toLowerCase()) || 
                          (o.id.toLowerCase().includes(orderSearch.toLowerCase())) ||
                          (o.phone || '').includes(orderSearch);
    const matchesStatus = orderStatusFilter === "Tous" || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-4"
    >
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {["Tous", "En attente", "Conception", "Impression", "Découpage", "Façonnage", "Contrôle qualité", "Prêt", "Annulé"].map((statusOpt) => (
          <button
            key={statusOpt}
            onClick={() => setOrderStatusFilter(statusOpt)}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
              orderStatusFilter === statusOpt 
                ? "bg-slate-900 dark:bg-accent text-white shadow" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {statusOpt === "Tous" ? (isRtl ? "الكل" : "Tous") : statusOpt}
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
        <input 
          placeholder="Rechercher un client (Nom, Tel, ou ID)..." 
          value={orderSearch} 
          onChange={e => setOrderSearch(e.target.value)}
          className="w-full p-4 pl-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-accent shadow-sm text-slate-800 dark:text-slate-100"
        />
      </div>
      
      {filteredOrders.length > 0 ? filteredOrders.map(order => (
        <div 
          key={order.id} 
          className="premium-glass p-6 rounded-3xl border border-white/60 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:shadow-lg transition-all"
        >
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-black text-lg text-slate-900 dark:text-white">{order.customerName}</h4>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-mono text-slate-600 dark:text-slate-300">
                #{order.id.slice(-6).toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-bold mb-3">📞 <span dir="ltr">{order.phone}</span> | 📍 {order.wilaya}</p>
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 border ${
                order.paymentMethod === 'Baridimob' 
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400' 
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`}>
                <CreditCard size={12}/> {order.paymentMethod || 'Paiement à la livraison'}
              </span>
              {order.paymentMethod === 'Baridimob' && (
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg border flex items-center gap-1 ${
                  order.paymentStatus === 'Payé'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                    : order.paymentStatus === 'Refusé'
                    ? 'bg-red-50 text-red-650 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900'
                    : order.paymentStatus === 'Envoyé'
                    ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-450 dark:border-amber-900 animate-pulse'
                    : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}>
                  {order.paymentStatus === 'Payé' ? (isRtl ? 'تم التحقق' : 'Reçu Vérifié') :
                   order.paymentStatus === 'Refusé' ? (isRtl ? 'مرفوض' : 'Reçu Rejeté') :
                   order.paymentStatus === 'Envoyé' ? (isRtl ? 'وصل جديد' : 'Reçu à Valider') :
                   (isRtl ? 'بانتظار الوصل' : 'Attente Reçu')}
                  {order.paidAmount !== undefined && ` (${order.paidAmount} DA)`}
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 flex items-center gap-1">
                 <Truck size={12}/> {order.deliveryType === 'desk' ? 'Stop Desk' : 'À domicile'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {order.items?.map((it: any, i: number) => (
                <span 
                  key={i} 
                  className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg font-bold border border-blue-100 dark:border-blue-800/50"
                >
                  {it.quantity}x {it.name} {it.selectedOptions?.finition ? `(${it.selectedOptions.finition})` : ''}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3">
              {order.designUrl && (
                <a 
                  href={order.designUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md"
                >
                  <ImageIcon size={14} /> Design Client
                </a>
              )}
              {order.printProofUrl ? (
                <a 
                  href={order.printProofUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-purple-500 hover:text-purple-600 font-bold flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md"
                >
                  <FileImage size={14} /> Bon à tirer (BAT)
                </a>
              ) : (
                <div className="flex items-center gap-1">
                  <input 
                    type="text" 
                    placeholder="Lien BAT..." 
                    className="text-[10px] p-1.5 border rounded-md dark:bg-slate-800 dark:border-slate-700 w-32 outline-none"
                    onBlur={(e) => updateOrderProof(order.id, e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-200 dark:border-slate-700">
            <div className="text-right px-4 hidden sm:block">
              <span className="text-xl font-black text-blue-600 dark:text-blue-400">{order.total} DA</span>
            </div>
            <select 
              value={order.status}
              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-accent cursor-pointer text-slate-800 dark:text-slate-100"
            >
              <option value="En attente">En attente</option>
              <option value="Conception">Conception</option>
              <option value="Impression">Impression</option>
              <option value="Découpage">Découpage</option>
              <option value="Façonnage">Façonnage</option>
              <option value="Contrôle qualité">Contrôle qualité</option>
              <option value="Prêt">Prêt</option>
              <option value="Annulé">Annulé</option>
            </select>
            <Link 
              href={`/invoice/${order.id}`} 
              target="_blank" 
              className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" 
              title="Facture PDF"
            >
              <Printer size={20} className="text-slate-600 dark:text-slate-300"/>
            </Link>
            <button
              onClick={() => handleSendWANotification(order, 'order_status')}
              disabled={sendingWA[`${order.id}-order_status`]}
              className="p-3 bg-emerald-100 dark:bg-emerald-900/20 hover:bg-emerald-200 dark:hover:bg-emerald-900/40 rounded-xl transition-colors disabled:opacity-50"
              title="WhatsApp Notification"
            >
              {sendingWA[`${order.id}-order_status`] ? (
                <Loader2 size={20} className="animate-spin text-emerald-600" />
              ) : (
                <MessageCircle size={20} className="text-emerald-600" />
              )}
            </button>
            <button 
              onClick={() => deleteOrder(order.id)} 
              className="p-3 text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl transition-colors"
            >
              <Trash2 size={20}/>
            </button>
          </div>
        </div>
      )) : (
        <div className="text-center py-20 premium-glass rounded-3xl">
          <p className="text-slate-400 font-bold">Aucune commande trouvée.</p>
        </div>
      )}
    </motion.div>
  );
}
