// ---------------------------------------------------------------------------
// changelog.ts — الإصدار البشري + ميزات كل إصدار (تُعرض في شاشة التحديث).
// ارفع APP_VERSION مع كل إصدار يحمل ميزات جديدة، وأضف سطراً جديداً في
// CHANGELOG يعرض الميزات للعملاء بالعربية والفرنسية.
// ---------------------------------------------------------------------------

export const APP_VERSION = 'v5.1';

export interface ChangelogEntry {
  version: string;
  features: { ar: string[]; fr: string[] };
}

export const CHANGELOG: ChangelogEntry[] = [
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
