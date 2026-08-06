// ---------------------------------------------------------------------------
// changelog.ts — الإصدار البشري + ميزات كل إصدار (تُعرض في شاشة التحديث).
// ارفع APP_VERSION مع كل إصدار يحمل ميزات جديدة، وأضف سطراً جديداً في
// CHANGELOG يعرض الميزات للعملاء بالعربية والفرنسية.
// ---------------------------------------------------------------------------

export const APP_VERSION = 'v6.0';

export interface ChangelogEntry {
  version: string;
  features: { ar: string[]; fr: string[] };
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v6.0',
    features: {
      ar: [
        '🎖️ برنامج الولاء والنقاط: اربح نقاطاً مع كل طلب مكتمل',
        '🏅 مستويات العضوية: برونز، فضي، ذهبي، بلاتيني، ألماس مع مضاعفات نقاط ×1 إلى ×3',
        '🎰 عجلة الحظ: العب بجائزة يومياً (خصم، نقاط، قسائم)',
        '📅 تسجيل يومي + هدية عيد ميلاد سنوية',
        '🎁 استبدال النقاط بكوبونات خصم فورية (VIP...)',
        '✍️ مكافأة نقاط على المراجعات الموثقة',
        '💌 برنامج دعوة الأصدقاء (كود إحالة خاص بك)',
        '🛡️ لوحة أدمن متكاملة لإدارة النقاط والمستويات',
        '🪙 شارة النقاط في الشريط العلوي وتقدير في السلة',
      ],
      fr: [
        '🎖️ Programme de fidélité : gagnez des points à chaque commande terminée',
        '🏅 Statuts membres : Bronze, Argent, Or, Platine, Diamant (multiplicateurs ×1 à ×3)',
        '🎰 Roue de la fortune : jouez chaque jour (remise, points, bons)',
        '📅 Check-in quotidien + bonus d\u2019anniversaire annuel',
        '🎁 Échangez vos points contre des codes promo immédiats (VIP...)',
        '✍️ Points bonus pour les avis vérifiés',
        '💌 Parrainage : invitez vos amis avec votre code de référence',
        '🛡️ Tableau de bord admin complet pour la gestion des points',
        '🪙 Badge de points dans la barre + estimation dans le panier',
      ],
    },
  },
  {
    version: 'v5.1',
    features: {
      ar: [
        'شاشة تحديث ذكية تظهر فقط عند وجود تحديث حقيقي',
        'عرض الميزات الجديدة لكل إصدار',
        'تحديث تلقائي عند العودة للتطبيق',
        'أداء أسرع وثبات أعلى',
      ],
      fr: [
        'Écran de mise à jour intelligent (uniquement en cas de vraie mise à jour)',
        "Liste des nouveautés de chaque version",
        "Mise à jour automatique au retour sur l'application",
        'Performances et stabilité améliorées',
      ],
    },
  },
  {
    version: 'v5.0',
    features: {
      ar: [
        'تجربة شراء أسرع وأفضل',
        'واجهات محسّنة للأندرويد والآيفون',
        'استلام من مقر المطبعة بوهران',
      ],
      fr: [
        "Expérience d'achat plus rapide",
        'Interfaces optimisées Android & iOS',
        'Retrait à l\'atelier à Oran',
      ],
    },
  },
];

export function getChangelog(version?: string | null): { ar: string[]; fr: string[] } {
  const entry = CHANGELOG.find((e) => e.version === version);
  if (entry) return entry.features;
  return {
    ar: [
      'أداء محسّن وميزات جديدة',
      'إصلاحات وتحسينات عامة',
      'تجربة أفضل وأسرع',
    ],
    fr: [
      'Performances améliorées et nouveautés',
      'Corrections et améliorations générales',
      'Meilleure expérience, plus rapide',
    ],
  };
}
