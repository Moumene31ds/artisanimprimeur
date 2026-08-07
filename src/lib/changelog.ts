// ---------------------------------------------------------------------------
// changelog.ts — الإصدار البشري + ميزات كل إصدار (تُعرض في شاشة التحديث).
// ارفع APP_VERSION مع كل إصدار يحمل ميزات جديدة، وأضف سطراً جديداً في
// CHANGELOG يعرض الميزات للعملاء بالعربية والفرنسية.
// ---------------------------------------------------------------------------

export const APP_VERSION = 'v6.4.1';

export interface ChangelogEntry {
  version: string;
  features: { ar: string[]; fr: string[] };
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v6.4.1',
    features: {
      ar: [
        '⚡ التحقق من التحديثات يعرض واجهة التحديث فوراً عند وجود نسخة جديدة',
        '🛠️ إصلاحات وتحسينات عامة في الاستقرار',
      ],
      fr: [
        '⚡ La vérification des mises à jour affiche immédiatement l\u2019écran de mise à jour',
        '🛠️ Corrections et améliorations de stabilité',
      ],
    },
  },
  {
    version: 'v6.4',
    features: {
      ar: [
        '🚀 نظام كشف متقدم جداً: قياس حقيقي لسرعة المعالجة + سلاسة العرض + زمن الشبكة',
        '📊 نقاط أداء موثقة عبر 6 عوامل مرجّحة مع تفصيل كامل لكل عامل',
        '✅ مؤشر موثوقية التحليل (مقاس مباشرة / مُقدَّر)',
        '⚡ نتائج معيارية مؤكدة بوسيط عينات متعددة',
      ],
      fr: [
        '🚀 Détection ultra-avancée : mesure réelle du CPU, de la fluidité d\u2019affichage et de la latence',
        '📊 Score documenté via 6 facteurs pondérés avec détail complet',
        '✅ Indice de fiabilité de l\u2019analyse (mesuré / estimé)',
        '⚡ Résultats de benchmark confirmés par la médiane de plusieurs échantillons',
      ],
    },
  },
  {
    version: 'v6.3',
    features: {
      ar: [
        '🎨 شعار رسمي جديد للتطبيق والأيقونات بجميع المقاسات',
        '📊 إعادة الفحص التلقائي للجهاز عند تغيّر الشبكة وكل 5 دقائق',
        '🔋 عرض حالة البطارية وتوفيرها مع توصيات مخصصة لجهازك',
        '💡 اقتراح ذكي لتفعيل وضع الأداء عند الحاجة',
        '⏱️ عرض آخر موعد لتحليل الجهاز',
      ],
      fr: [
        '🎨 Nouveau logo officiel et icônes à toutes les tailles',
        '📊 Re-détection automatique de l\u2019appareil au changement de réseau et toutes les 5 min',
        '🔋 Affichage de la batterie et des économies avec recommandations personnalisées',
        '💡 Suggestion intelligente pour activer le mode performance',
        '⏱️ Horodatage de la dernière analyse de l\u2019appareil',
      ],
    },
  },
  {
    version: 'v6.2',
    features: {
      ar: [
        '🎨 غلاف مشاركة فاخر (Open Graph) بتصميم زجاجي عند مشاركة الرابط',
        '✨ إعدادات جديدة: إيقاف تأثيرات الخلفية الزخرفية',
        '💠 تقليل الشفافية والتمويه للأجهزة القديمة',
        '🌙 إبقاء الشاشة مضاءة أثناء الاستخدام',
        '💾 قسم التخزين: حجم البيانات المستخدمة + مسح الذاكرة المؤقتة',
        '⚡ تحسينات في الأداء والاستقرار',
      ],
      fr: [
        '🎨 Couverture de partage premium (Open Graph) au design verre dépoli',
        '✨ Nouveaux réglages : désactivation des effets d\u2019arrière-plan',
        '💠 Réduction de la transparence et du flou pour les vieux téléphones',
        '🌙 Garder l\u2019écran allumé pendant l\u2019utilisation',
        '💾 Section Stockage : espace utilisé + vidage du cache',
        '⚡ Améliorations de performance et de stabilité',
      ],
    },
  },
  {
    version: 'v6.1',
    features: {
      ar: [
        '⚙️ صفحة الإعدادات الشاملة: اللغة، المظهر، الأداء وحجم النص',
        '📱 كشف ذكي للجهاز: تحليل المعالج والذاكرة والشبكة مع نقاط أداء',
        '🚀 وضع الأداء للهواتف الضعيفة + تعطيل الحركات للحصول على سلاسة قصوى',
        '⚡ تحسين تلقائي ذكي يفعّل الوضع الأمثل لجهازك',
        '📶 التحقق من التحديثات يدوياً وعرض الميزات الجديدة',
        '🔔 إعدادات الإشعارات الفورية والاهتزازات',
        '📏 ثلاثة أحجام للخط لراحة أفضل للقراءة',
      ],
      fr: [
        '⚙️ Page Paramètres complète : langue, apparence, performance et taille du texte',
        '📱 Détection intelligente de l\u2019appareil : CPU, RAM, réseau avec score de performance',
        '🚀 Mode performance pour les téléphones modestes + désactivation des animations',
        '⚡ Optimisation automatique qui active le meilleur réglage pour votre appareil',
        '📶 Vérification manuelle des mises à jour et liste des nouveautés',
        '🔔 Réglages des notifications push et des vibrations',
        '📏 Trois tailles de texte pour un meilleur confort de lecture',
      ],
    },
  },
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
