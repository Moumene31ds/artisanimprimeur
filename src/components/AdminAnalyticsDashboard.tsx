'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  TrendingUp, DollarSign, ShoppingCart, Package,
  Activity, AlertCircle, Loader2, PieChart as PieChartIcon,
  UserPlus, ShoppingBag
} from 'lucide-react';

const STAT_COLORS = {
  prêt: '#10b981',
  enAttente: '#f59e0b',
  conception: '#3b82f6',
  livré: '#6366f1',
  annulé: '#ef4444',
};

const STATUS_LABELS: Record<string, [string, string]> = {
  'Prêt': ['جاهز', 'Prêt'],
  'En attente': ['قيد الانتظار', 'En attente'],
  'Conception': ['قيد التصميم', 'Conception'],
  'Livré': ['تم التسليم', 'Livré'],
  'Annulé': ['ملغي', 'Annulé'],
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toDate(ts: any): Date {
  if (!ts) return new Date();
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
}

export default function AdminAnalyticsDashboard() {
  const language = useAppStore((state) => state.language);
  const isRtl = language === 'ar';

  const t = (ar: string, fr: string) => (isRtl ? ar : fr);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOrders(fetched);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Analytics Firestore error:', err);
        setError(t('فشل تحميل البيانات', 'Échec du chargement des données'));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    conversionRate,
    revenueByDate,
    statusBreakdown,
    popularProducts,
    customerGrowth,
  } = useMemo(() => {
    if (orders.length === 0) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        conversionRate: 0,
        revenueByDate: [] as { date: string; revenue: number }[],
        statusBreakdown: [] as { name: string; value: number; color: string }[],
        popularProducts: [] as { name: string; quantity: number }[],
        customerGrowth: [] as { period: string; customers: number }[],
      };
    }

    const valid = orders.filter((o) => o.status !== 'Annulé');
    const totalRev = valid.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalOrd = orders.length;
    const avgVal = valid.length > 0 ? Math.round(totalRev / valid.length) : 0;
    const convRate = orders.length > 0 ? Math.round((valid.length / orders.length) * 100) : 0;

    const revenueMap: Record<string, number> = {};
    const statusCount: Record<string, number> = {};
    const productMap: Record<string, number> = {};
    const customerPeriodMap: Record<string, Set<string>> = {};

    for (const o of orders) {
      const d = toDate(o.createdAt);
      const dateKey = formatDate(d);
      const monthKey = d.toISOString().slice(0, 7);

      if (o.status !== 'Annulé' && o.total) {
        revenueMap[dateKey] = (revenueMap[dateKey] || 0) + (Number(o.total) || 0);
      }

      const status = o.status || 'En attente';
      statusCount[status] = (statusCount[status] || 0) + 1;

      const custKey = `${o.customerName || ''}-${o.phone || ''}`;
      if (custKey !== '-') {
        if (!customerPeriodMap[monthKey]) customerPeriodMap[monthKey] = new Set();
        customerPeriodMap[monthKey].add(custKey);
      }

      if (o.items && Array.isArray(o.items)) {
        for (const item of o.items) {
          const name = item.name || t('منتج بدون اسم', 'Produit sans nom');
          const qty = Number(item.quantity) || 1;
          productMap[name] = (productMap[name] || 0) + qty;
        }
      }
    }

    const revDates = Object.entries(revenueMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));

    const statusData = Object.entries(statusCount)
      .filter(([name]) => name)
      .map(([name, value]) => {
        const key = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const color =
          key.includes('ret') || key.includes('pr') || key.includes('pret')
            ? STAT_COLORS.prêt
            : key.includes('en') || key.includes('atten') || key.includes('attente')
            ? STAT_COLORS.enAttente
            : key.includes('conception')
            ? STAT_COLORS.conception
            : key.includes('livr') || key.includes('livre')
            ? STAT_COLORS.livré
            : key.includes('annul')
            ? STAT_COLORS.annulé
            : '#94a3b8';
        return { name, value, color };
      });

    const topProducts = Object.entries(productMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, quantity]) => ({ name, quantity }));

    const sortedMonths = Object.keys(customerPeriodMap).sort();
    let cumulativeCount = 0;
    const growthData = sortedMonths.map((period) => {
      cumulativeCount += customerPeriodMap[period].size;
      return { period, customers: cumulativeCount };
    });

    return {
      totalRevenue: totalRev,
      totalOrders: totalOrd,
      avgOrderValue: avgVal,
      conversionRate: convRate,
      revenueByDate: revDates,
      statusBreakdown: statusData,
      popularProducts: topProducts,
      customerGrowth: growthData,
    };
  }, [orders, language]);

  const chartDefaultProps = {
    stroke: '#64748b',
    fontSize: 11,
    tickLine: false,
    axisLine: false,
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="premium-glass rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4"
      >
        <Loader2 size={32} className="animate-spin text-accent" />
        <p className="text-sm font-bold text-slate-400">
          {t('جاري تحميل التحليلات...', 'Chargement des analyses...')}
        </p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-glass rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 border border-red-200 dark:border-red-900"
      >
        <AlertCircle size={32} className="text-red-500" />
        <p className="text-sm font-bold text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors"
        >
          {t('إعادة المحاولة', 'Réessayer')}
        </button>
      </motion.div>
    );
  }

  if (orders.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="premium-glass rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4"
      >
        <ShoppingBag size={40} className="text-slate-300 dark:text-slate-600" />
        <p className="text-base font-black text-slate-400">
          {t('لا توجد طلبات بعد', 'Aucune commande pour le moment')}
        </p>
        <p className="text-xs text-slate-400">
          {t('ستظهر التحليلات هنا عند توفر الطلبات', 'Les analyses apparaîtront ici une fois les commandes disponibles')}
        </p>
      </motion.div>
    );
  }

  const metrics = [
    {
      label: t('إجمالي الإيرادات', 'Revenu total'),
      value: `${totalRevenue.toLocaleString()} DA`,
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    },
    {
      label: t('إجمالي الطلبات', 'Total commandes'),
      value: totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      label: t('متوسط قيمة الطلب', 'Panier moyen'),
      value: `${avgOrderValue.toLocaleString()} DA`,
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      label: t('معدل الإتمام', 'Taux conversion'),
      value: `${conversionRate}%`,
      icon: Activity,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/20',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <motion.div
        variants={itemVariants}
        className="premium-glass rounded-[2.5rem] p-6 md:p-8 border border-white/60 dark:border-white/5"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">
              {t('تحليلات الأداء', 'Analytiques de performance')}
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {t('لوحة تحليلات المتجر', 'Tableau de bord analytique')}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {t('بيانات حية', 'Données en temps réel')}
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="premium-glass rounded-[2rem] p-5 border border-white/60 dark:border-white/5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {m.label}
                </span>
                <div className={`p-2 rounded-xl ${m.bg}`}>
                  <Icon size={15} className={m.color} />
                </div>
              </div>
              <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
            </div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          variants={itemVariants}
          className="premium-glass rounded-[2.5rem] p-6 border border-white/60 dark:border-white/5"
        >
          <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <TrendingUp size={15} className="text-emerald-500" />
            {t('الإيرادات اليومية', 'Revenus quotidiens')}
          </h3>
          {revenueByDate.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-xs font-bold text-slate-400">
              {t('لا توجد بيانات إيرادات', 'Aucune donnée de revenu')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueByDate}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" {...chartDefaultProps} tickFormatter={(v) => v.slice(5)} />
                <YAxis {...chartDefaultProps} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.9)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} DA`, t('الإيرادات', 'Revenu')]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="premium-glass rounded-[2.5rem] p-6 border border-white/60 dark:border-white/5"
        >
          <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <PieChartIcon size={15} className="text-indigo-500" />
            {t('حالات الطلبات', 'Statuts des commandes')}
          </h3>
          {statusBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-xs font-bold text-slate-400">
              {t('لا توجد طلبات', 'Aucune commande')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => {
                    const labels = STATUS_LABELS[name || ''] || [name || '', name || ''];
                    return `${isRtl ? labels[0] : labels[1]} (${value})`;
                  }}
                  labelLine={false}
                >
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.9)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                  formatter={(value: any, name: any) => {
                    const labels = STATUS_LABELS[name || ''] || [name || '', name || ''];
                    return [value, isRtl ? labels[0] : labels[1]];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="premium-glass rounded-[2.5rem] p-6 border border-white/60 dark:border-white/5"
        >
          <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Package size={15} className="text-amber-500" />
            {t('المنتجات الأكثر طلباً', 'Produits les plus commandés')}
          </h3>
          {popularProducts.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-xs font-bold text-slate-400">
              {t('لا توجد منتجات', 'Aucun produit')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={popularProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" {...chartDefaultProps} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  {...chartDefaultProps}
                  tickFormatter={(v) => (v.length > 14 ? `${v.slice(0, 14)}...` : v)}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.9)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                />
                <Bar dataKey="quantity" radius={[0, 8, 8, 0]} maxBarSize={20}>
                  {popularProducts.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="premium-glass rounded-[2.5rem] p-6 border border-white/60 dark:border-white/5"
        >
          <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <UserPlus size={15} className="text-blue-500" />
            {t('نمو العملاء', 'Croissance clients')}
          </h3>
          {customerGrowth.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-xs font-bold text-slate-400">
              {t('لا توجد بيانات عملاء', 'Aucune donnée client')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="period" {...chartDefaultProps} />
                <YAxis {...chartDefaultProps} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.9)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="customers"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  fill="url(#customerGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
