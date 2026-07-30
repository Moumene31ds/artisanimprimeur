"use client";

import { motion } from "framer-motion";
import {
  TrendingUp, DollarSign, ShoppingBag, Percent, Map, BarChart3, Package2, Ticket, Sparkles, Clock3
} from "lucide-react";

interface AdminDashboardProps {
  orders: any[];
  products: any[];
  promoCodes: any[];
  isRtl: boolean;
}

export default function AdminDashboard({ orders, products, promoCodes, isRtl }: AdminDashboardProps) {
  const validOrders = orders.filter((o: any) => o.status !== 'Annulé');
  const totalRevenue = validOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
  const averageOrderValue = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;
  const cancellationRate = orders.length > 0 ? Math.round((orders.filter((o: any) => o.status === 'Annulé').length / orders.length) * 100) : 0;
  const pendingOrders = orders.filter((o: any) => o.status === 'En attente').length;
  const activeProducts = (products || []).filter((p: any) => p.active !== false).length;
  const activePromo = (promoCodes || []).filter((p: any) => p.active !== false).length;
  const completionRate = orders.length > 0 ? Math.round((validOrders.length / orders.length) * 100) : 0;

  const wilayaStats = orders.reduce((acc: Record<string, number>, curr: any) => {
    acc[curr.wilaya || 'Non spécifiée'] = (acc[curr.wilaya || 'Non spécifiée'] || 0) + 1;
    return acc;
  }, {});
  const sortedWilayas = Object.entries(wilayaStats).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
  const recentOrders = orders.slice(0, 5);

  const stats = [
    { label: isRtl ? 'إجمالي الإيرادات' : 'Revenue totale', value: `${totalRevenue.toLocaleString()} DA`, icon: TrendingUp, tone: 'bg-slate-900 text-white' },
    { label: isRtl ? 'متوسط الطلب' : 'Panier moyen', value: `${averageOrderValue.toLocaleString()} DA`, icon: DollarSign, tone: 'bg-white/80 dark:bg-slate-800/80' },
    { label: isRtl ? 'طلبات معلقة' : 'En attente', value: `${pendingOrders}`, icon: Clock3, tone: 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400' },
    { label: isRtl ? 'المنتجات النشطة' : 'Produits actifs', value: `${activeProducts}`, icon: Package2, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="rounded-[2.5rem] border border-slate-200/70 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-slate-400">
              <Sparkles size={14} /> {isRtl ? 'لوحة التحكم الذكية' : 'Tableau de bord premium'}
            </p>
            <h2 className="text-2xl font-black sm:text-3xl">{isRtl ? 'أداء متجرك يتقدم يوميًا' : 'Votre activité tourne à plein régime'}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              {isRtl ? 'تابع الطلبات، التقدم، والمنتجات من مكان واحد مع نظرة سريعة على أهم المؤشرات.' : 'Suivez les commandes, les promotions et la santé globale de votre boutique depuis un seul espace.'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{isRtl ? 'إكمال العمليات' : 'Taux d’achèvement'}</p>
            <p className="text-2xl font-black text-emerald-400">{completionRate}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-[1.8rem] p-5 shadow-sm border ${stat.tone}`}>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-70">{stat.label}</p>
                <div className="rounded-2xl bg-white/60 p-2 dark:bg-slate-700/60">
                  <Icon size={16} />
                </div>
              </div>
              <p className="text-2xl font-black">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="premium-glass rounded-[2.5rem] p-8">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">{isRtl ? 'آخر الطلبات' : 'Dernières commandes'}</p>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black text-emerald-600">{recentOrders.length}</span>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div>
                  <p className="font-black text-slate-900 dark:text-white">{order.customerName || 'Client'}</p>
                  <p className="text-xs text-slate-500">{order.wilaya || 'Wilaya'}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 dark:text-white">{Number(order.total || 0).toLocaleString()} DA</p>
                  <p className="text-xs text-slate-500">{order.status || 'En attente'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="premium-glass rounded-[2.5rem] p-8">
            <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-slate-500"><Ticket size={14} /> {isRtl ? 'الخصومات النشطة' : 'Promos actives'}</p>
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <p className="text-3xl font-black">{activePromo}</p>
              <p className="mt-1 text-sm text-slate-400">{isRtl ? 'أكواد خصم جاهزة للتشغيل' : 'Codes promo prêts à être utilisés'}</p>
            </div>
          </div>

          <div className="premium-glass rounded-[2.5rem] p-8">
            <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-slate-500"><Map size={14} /> Top 5 Wilayas</p>
            <div className="space-y-3">
              {sortedWilayas.map(([name, count]: any) => (
                <div key={name} className="flex justify-between items-center rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/50">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{name}</span>
                  <span className="rounded-lg bg-blue-100 px-2 py-1 text-[10px] font-black text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">{count} commandes</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="premium-glass rounded-[2.5rem] p-8">
        <p className="mb-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-slate-500"><BarChart3 size={14} /> {isRtl ? 'توزيع الحالات' : 'Répartition des statuts'}</p>
        <div className="flex h-36 items-end gap-2">
          {['En attente', 'Conception', 'Prêt', 'Annulé'].map((status) => {
            const count = orders.filter((o: any) => o.status === status).length;
            const height = (count / (orders.length || 1)) * 100 || 5;
            return (
              <div key={status} className="flex-1 rounded-t-xl bg-gradient-to-t from-slate-700 to-slate-400" style={{ height: `${Math.max(height, 8)}%` }}>
                <div className="-top-8 left-1/2 -translate-x-1/2 text-center text-[10px] font-black opacity-90 dark:text-white">{count}</div>
                <div className="mt-2 text-center text-[9px] font-bold text-slate-500">{status}</div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
