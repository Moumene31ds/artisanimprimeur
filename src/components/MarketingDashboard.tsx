'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Sparkles, Target, TrendingUp, Users, Zap, Mail, MessageSquare, Send, CheckCircle2, ShieldAlert, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { auth } from '@/lib/firebase';

interface DashboardData {
  totalCampaigns: number;
  activeCampaigns: number;
  totalCustomers: number;
  averageEngagementScore: number;
  churnRisk: number;
  roi: number;
}

export const MarketingDashboard: React.FC = () => {
  const language = useAppStore((state) => state.language);
  const isRtl = language === 'ar';

  const [data, setData] = useState<DashboardData>({
    totalCampaigns: 12,
    activeCampaigns: 5,
    totalCustomers: 1420,
    averageEngagementScore: 78.4,
    churnRisk: 4.2,
    roi: 320.5,
  });
  const [loading, setLoading] = useState(false);

  const [targetSegment, setTargetSegment] = useState<'all' | 'premium' | 'inactive' | 'new'>('premium');
  const [campaignChannel, setCampaignChannel] = useState<'email' | 'sms' | 'push'>('email');
  const [generating, setGenerating] = useState(false);
  const [generatedCampaign, setGeneratedCampaign] = useState<{ title: string; subject: string; body: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [lastSend, setLastSend] = useState<{ total: number; sent: number; skipped: number; failed: number } | null>(null);
  const [recipientStats, setRecipientStats] = useState<{ matched: number; totalBase: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // معاينة عدد المستلمين للقطاع المحدد (تحديث مباشر عند تغيير القطاع)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatsLoading(true);
      try {
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : null;
        if (!token) return;
        const res = await fetch(`/api/marketing/recipients?segment=${targetSegment}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setRecipientStats({ matched: data.matched, totalBase: data.totalBase });
        }
      } catch {
        /* تجاهل أخطاء المعاينة */
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [targetSegment]);

  const handleSendCampaign = async () => {
    if (!generatedCampaign) return;
    if (recipientStats && recipientStats.matched === 0) {
      toast.warning(t('لا يوجد مستلمون في هذا القطاع', 'Aucun destinataire dans ce segment'));
      return;
    }
    setSending(true);
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      if (!token) {
        toast.error(t('تحتاج لتسجيل الدخول كمشرف', 'Connectez-vous en tant qu\'admin'));
        return;
      }
      const res = await fetch('/api/marketing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          segment: targetSegment,
          channel: campaignChannel,
          subject: generatedCampaign.subject,
          body: generatedCampaign.body,
          title: generatedCampaign.title,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastSend(data.summary);
        toast.success(
          t(`تم الإرسال: ${data.summary.sent} من ${data.summary.total}`, `Envoyé : ${data.summary.sent} / ${data.summary.total}`)
        );
      } else {
        toast.error(data.error || t('فشل الإرسال', 'Échec de l\'envoi'));
      }
    } catch {
      toast.error(t('فشل الإرسال', 'Échec de l\'envoi'));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/marketing/customers?analytics=true');
        if (response.ok) {
          const analytics = await response.json();
          setData(analytics);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const handleGenerateCampaign = async () => {
    setGenerating(true);
    setGeneratedCampaign(null);

    try {
      const segmentMap: Record<string, string> = {
        premium: isRtl ? 'العملاء المميزين' : 'clients premium',
        inactive: isRtl ? 'العملاء غير النشطين' : 'clients inactifs',
        new: isRtl ? 'العملاء الجدد' : 'nouveaux clients',
        all: isRtl ? 'جميع العملاء' : 'tous les clients',
      };

      const channelMap: Record<string, string> = {
        email: isRtl ? 'البريد الإلكتروني' : 'email',
        sms: isRtl ? 'الرسائل النصية' : 'SMS',
        push: isRtl ? 'الإشعارات' : 'push',
      };

      const prompt = isRtl
        ? `أنت خبير تسويق لمطبعة "الحرفي للطباعة" في الجزائر. أنشئ حملة تسويقية مخصصة للقطاع "${segmentMap[targetSegment]}" عبر قناة "${channelMap[campaignChannel]}".
           المطلوب: عنوان للحملة، موضوع قصير جذاب (سطر واحد)، ومحتوى رسالة تسويقية مقنعة (2-3 جمل).
           أعد النتيجة بصيغة JSON:
           { "title": "عنوان الحملة", "subject": "الموضوع", "body": "محتوى الرسالة" }`
        : `Tu es un expert marketing pour l'imprimerie "L'Artisan Imprimeur" en Algérie. Crée une campagne marketing pour le segment "${segmentMap[targetSegment]}" via "${channelMap[campaignChannel]}".
           Retourne: titre de campagne, sujet accrocheur (1 ligne), corps du message (2-3 phrases).
           Format JSON:
           { "title": "titre campagne", "subject": "sujet", "body": "corps du message" }`;

      const res = await fetch('/api/marketing/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, language }),
      });

      if (res.ok) {
        const data = await res.json();
        try {
          const jsonMatch = data.insight.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setGeneratedCampaign({
              title: parsed.title || (isRtl ? 'حملة تسويقية' : 'Campagne marketing'),
              subject: parsed.subject || (isRtl ? 'عرض خاص' : 'Offre spéciale'),
              body: parsed.body || (isRtl ? 'نص تلقائي' : 'Texte par défaut'),
            });
            toast.success(isRtl ? 'تم توليد الحملة بواسطة الذكاء الاصطناعي!' : 'Campagne générée par IA !');
          } else {
            setGeneratedCampaign({
              title: isRtl ? 'حملة تسويقية' : 'Campagne',
              subject: isRtl ? 'عرض حصري' : 'Offre exclusive',
              body: data.insight.slice(0, 500),
            });
            toast.success(isRtl ? 'تم توليد الحملة!' : 'Campagne générée !');
          }
        } catch {
          setGeneratedCampaign({
            title: isRtl ? 'حملة تسويقية' : 'Campagne',
            subject: isRtl ? 'اقتراح ذكي' : 'Suggestion IA',
            body: data.insight?.slice(0, 500) || '',
          });
        }
      } else {
        throw new Error('API error');
      }
    } catch {
      const fallback = isRtl ? {
        premium: { title: 'حملة العملاء المميزين - خصم VIP 20%', subject: 'عرض حصري لنادي الحرفي VIP : خصم 20% على طلبك القادم!', body: 'عزيزنا العميل المتميز، تقديراً لوفائك لمنصة الحرفي للطباعة، يسعدنا تقديم كود الخصم الحصري VIP20 لطباعة بطاقات أعمالك ومطوياتك بأعلى جودة.' },
        inactive: { title: 'حملة إعادة تنشيط العملاء الغائبين', subject: 'اشتقنا إليك! 500 دج هدية في حسابك لطباعتك القادمة', body: 'عد إلينا اليوم واكتشف آخر المنتجات والطباعة ثلاثية الأبعاد. استخدم الكود COMEBACK500 عند إتمام الطلب.' },
        new: { title: 'حملة الترحيب بالعملاء الجدد', subject: 'أهلاً بك في منصة الحرفي - خصم 10% على أول طلب طباعة', body: 'مرحباً بك معنا! جرب طباعة بطاقاتك أو ملصقاتك اليوم بأعلى جودة في الجزائر مع كود الخصم WELCOME10.' },
      } : {
        premium: { title: 'Campagne Clients Premium - 20% VIP', subject: 'Offre exclusive Club VIP L\'Artisan : -20% sur votre prochaine commande !', body: 'Cher client premium, en reconnaissance de votre fidélité, voici le code VIP20 pour vos cartes et flyers en haute qualité.' },
        inactive: { title: 'Campagne Réactivation', subject: 'Vous nous avez manqué ! 500 DA offerts', body: 'Revenez découvrir nos nouveaux produits et impressions 3D. Utilisez le code COMEBACK500.' },
        new: { title: 'Campagne Bienvenue', subject: 'Bienvenue chez L\'Artisan - 10% sur votre première commande', body: 'Essayez nos impressions premium avec le code WELCOME10.' },
      };
      const fallbackKey = targetSegment === 'all' ? 'new' : (targetSegment as keyof typeof fallback);
      setGeneratedCampaign(fallback[fallbackKey]);
      toast.success(isRtl ? 'تم توليد الحملة محلياً!' : 'Campagne générée localement !');
    } finally {
      setGenerating(false);
    }
  };

  const t = (ar: string, fr: string) => isRtl ? ar : fr;

  const campaignDistribution = [
    { name: t('نشطة', 'Actives'), value: data.activeCampaigns, color: '#10b981' },
    { name: t('مجدولة', 'Planifiées'), value: 3, color: '#3b82f6' },
    { name: t('مسودات', 'Brouillons'), value: Math.max(1, data.totalCampaigns - data.activeCampaigns - 3), color: '#9ca3af' },
  ];

  const engagementData = [
    { name: t('الأحد', 'Dim'), engagement: 65, opens: 320, clicks: 140 },
    { name: t('الإثنين', 'Lun'), engagement: 72, opens: 410, clicks: 190 },
    { name: t('الثلاثاء', 'Mar'), engagement: 88, opens: 580, clicks: 260 },
    { name: t('الأربعاء', 'Mer'), engagement: 95, opens: 640, clicks: 310 },
    { name: t('الخميس', 'Jeu'), engagement: 81, opens: 510, clicks: 220 },
  ];

  if (loading) {
    return <div className="text-center py-12 font-bold text-slate-500">{t('جاري تحميل البيانات...', 'Chargement...')}</div>;
  }

  return (
    <div className={`w-full rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-6 md:p-8 shadow-2xl space-y-8`} dir={isRtl ? 'rtl' : 'ltr'}>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200/80 dark:border-slate-800 pb-6">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">Marketing Intelligence Hub</span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{t('لوحة تحكم التسويق الذكي والحملات', 'Tableau de bord marketing et campagnes')}</h1>
        </div>
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 shadow-sm">
          <Sparkles size={18} className="animate-pulse text-emerald-500" />
          <span>{t('محرك الذكاء الاصطناعي نشط', 'Moteur IA actif')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('إجمالي الحملات', 'Total campagnes')}</p>
          <p className="mt-2 text-3xl font-black text-blue-600 dark:text-blue-400">{data.totalCampaigns}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('حملات نشطة', 'Campagnes actives')}</p>
          <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">{data.activeCampaigns}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('قاعدة العملاء', 'Base clients')}</p>
          <p className="mt-2 text-3xl font-black text-purple-600 dark:text-purple-400">{data.totalCustomers}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('معدل التفاعل', 'Taux engagement')}</p>
          <p className="mt-2 text-3xl font-black text-amber-500">{data.averageEngagementScore.toFixed(1)}%</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('مخاطر المغادرة', 'Risque départ')}</p>
          <p className="mt-2 text-3xl font-black text-rose-500">{data.churnRisk}%</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200/70 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('العائد ROI', 'ROI')}</p>
          <p className="mt-2 text-3xl font-black text-indigo-600 dark:text-indigo-400">+{data.roi.toFixed(1)}%</p>
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 border border-white/10 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{t('مولّد الحملات التسويقية بالذكاء الاصطناعي', 'Générateur de campagnes IA')}</h2>
              <p className="text-xs text-slate-400">{t('إنشاء نصوص حملات مخصصة بنقرة واحدة', 'Créez des campagnes personnalisées en un clic')}</p>
            </div>
          </div>
          <button
            onClick={handleGenerateCampaign}
            disabled={generating}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-2 transition-transform hover:scale-105 disabled:opacity-50 cursor-pointer"
          >
            {generating ? t('جاري التوليد...', 'Génération...') : t('توليد الحملة ✨', 'Générer campagne ✨')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">{t('القطاع المستهدف:', 'Segment cible:')}</label>
            <div className="flex gap-2">
              {[
                { id: 'all', label: t('جميع العملاء', 'Tous les clients') },
                { id: 'premium', label: t('العملاء المميزين', 'VIP Premium') },
                { id: 'new', label: t('العملاء الجدد', 'Nouveaux') },
                { id: 'inactive', label: t('غير النشطين', 'Inactifs') },
              ].map(seg => (
                <button
                  key={seg.id}
                  onClick={() => setTargetSegment(seg.id as any)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all border ${targetSegment === seg.id ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                >
                  {seg.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">{t('قناة الإرسال:', 'Canal:')}</label>
            <div className="flex gap-2">
              {[
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'sms', label: 'SMS', icon: MessageSquare },
              ].map(ch => (
                <button
                  key={ch.id}
                  onClick={() => setCampaignChannel(ch.id as any)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border ${campaignChannel === ch.id ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
                >
                  <ch.icon size={14} />
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {generatedCampaign && (
          <div className="bg-white/10 rounded-2xl p-5 border border-white/15 space-y-3 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> {generatedCampaign.title}
              </span>
              <button
                onClick={handleSendCampaign}
                disabled={sending || (recipientStats !== null && recipientStats.matched === 0)}
                className="px-4 py-1.5 bg-emerald-500 text-slate-950 rounded-lg text-xs font-black hover:bg-emerald-400 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {sending ? (
                  t('جاري الإرسال...', 'Envoi...')
                ) : (
                  <><Send size={13} /> {t('إرسال الحملة', 'Envoyer la campagne')}</>
                )}
              </button>
            </div>
            {statsLoading ? (
              <div className="text-[11px] font-bold text-slate-400 pt-2">
                {t('جاري حساب المستلمين...', 'Calcul des destinataires...')}
              </div>
            ) : recipientStats ? (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-[11px] font-black">
                  {t('المستلمون', 'Destinataires')}: {recipientStats.matched}
                  <span className="opacity-70"> / {recipientStats.totalBase}</span>
                </span>
                {recipientStats.matched === 0 && (
                  <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[11px] font-black">
                    {t('لا يوجد مستلمون — اختر قطاعاً آخر', 'Aucun destinataire — choisissez un autre segment')}
                  </span>
                )}
              </div>
            ) : null}
            {lastSend && (
              <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-black">
                <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300">
                  {t('تم الإرسال', 'Envoyés')}: {lastSend.sent}
                </span>
                <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300">
                  {t('تخطي', 'Ignorés')}: {lastSend.skipped}
                </span>
                <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300">
                  {t('فشل', 'Échecs')}: {lastSend.failed}
                </span>
                <span className="px-2 py-1 rounded-lg bg-slate-500/20 text-slate-300">
                  {t('الإجمالي', 'Total')}: {lastSend.total}
                </span>
              </div>
            )}
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black">{t('الموضوع:', 'Sujet:')}</span>
              <p className="text-sm font-bold text-white mt-0.5">{generatedCampaign.subject}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black">{t('المحتوى:', 'Contenu:')}</span>
              <p className="text-xs text-slate-300 leading-relaxed mt-0.5">{generatedCampaign.body}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200/70 dark:border-slate-800 shadow-sm">
          <h2 className="mb-4 text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers size={18} className="text-indigo-500" />
            {t('توزيع الحملات', 'Distribution campagnes')}
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={campaignDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={90} dataKey="value">
                {campaignDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200/70 dark:border-slate-800 shadow-sm">
          <h2 className="mb-4 text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" />
            {t('معدلات التفاعل الأسبوعية', 'Taux d\'engagement hebdo')}
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" stroke="#888888" />
              <YAxis stroke="#888888" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="opens" name={t('الفتحات', 'Ouvertures')} stroke="#10b981" strokeWidth={3} />
              <Line type="monotone" dataKey="clicks" name={t('النقرات', 'Clics')} stroke="#3b82f6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200/70 dark:border-slate-800 shadow-sm">
          <h2 className="mb-4 text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Zap size={18} className="text-amber-500" />
            {t('أداء القنوات', 'Performance canaux')}
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" stroke="#888888" />
              <YAxis stroke="#888888" />
              <Tooltip />
              <Legend />
              <Bar dataKey="opens" name="Email" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="clicks" name="SMS" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200/70 dark:border-slate-800 shadow-sm">
          <h2 className="mb-4 text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Target size={18} className="text-rose-500" />
            {t('توصيات الذكاء الاصطناعي', 'Recommandations IA')}
          </h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/30 p-3.5 border-s-4 border-s-blue-500">
              <p className="flex items-center gap-2 font-bold text-xs text-blue-900 dark:text-blue-300"><Target size={14} /> {t('أفضل وقت للإرسال', 'Meilleur moment d\'envoi')}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">{t('الأربعاء 10:00-12:00 صباحاً يحقق أعلى نسبة فتح.', 'Mercredi 10h-12h donne le meilleur taux d\'ouverture.')}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 p-3.5 border-s-4 border-s-amber-500">
              <p className="flex items-center gap-2 font-bold text-xs text-amber-900 dark:text-amber-300"><ShieldAlert size={14} /> {t('تنبيه العملاء غير النشطين', 'Alerte clients inactifs')}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">{t('كود خصم 500 دج للعملاء الغائبين 30 يوماً.', 'Code promo 500 DA pour clients inactifs 30 jours.')}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 border-s-4 border-s-emerald-500">
              <p className="flex items-center gap-2 font-bold text-xs text-emerald-900 dark:text-emerald-300"><Zap size={14} /> {t('فرصة نمو عالية', 'Opportunité croissance')}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">{t('باقة VIP 350g للشركات الجديدة ترفع متوسط السلة 40%.', 'Pack cartes visite premium +40% panier moyen.')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
