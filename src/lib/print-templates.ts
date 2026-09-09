// src/lib/print-templates.ts
// Curated Professional Print Templates for Algerian Businesses & Clinics

export interface PrintTemplate {
  id: string;
  category: "medical" | "legal" | "food" | "corporate" | "artisan";
  categoryName: string;
  categoryNameAr: string;
  name: string;
  nameAr: string;
  previewColor: string;
  textColor: string;
  accentColor: string;
  front: {
    title: string;
    titleAr: string;
    subtitle: string;
    subtitleAr: string;
    contact1: string;
    contact2: string;
    address: string;
    addressAr: string;
  };
  back: {
    headline: string;
    headlineAr: string;
    workingHours: string;
    workingHoursAr: string;
    note: string;
    noteAr: string;
  };
}

export const PRINT_TEMPLATES: PrintTemplate[] = [
  {
    id: "med-dr-bensalem",
    category: "medical",
    categoryName: "Santé & Médecins",
    categoryNameAr: "أطباء وعيادات",
    name: "Dr. Cabinet Médical Élite",
    nameAr: "طبيب عام / أخصائي",
    previewColor: "#0284c7", // Sky blue
    textColor: "#0f172a",
    accentColor: "#0284c7",
    front: {
      title: "Dr. Karim BENSALEM",
      titleAr: "د. كريم بن سالم",
      subtitle: "Médecin Spécialiste — Cardiologie & Médecine Interne",
      subtitleAr: "طبيب أخصائي في أمراض القلب والطب الداخلي",
      contact1: "Tél : +213 (0) 550 12 34 56",
      contact2: "Urgences : +213 (0) 770 98 76 54",
      address: "Cité Akid Lotfi, Immeuble Les Palmiers, 2ème étage, Oran",
      addressAr: "حي العقيد لطفي، عمارة النخيل، الطابق الثاني، وهران",
    },
    back: {
      headline: "CONSULTATIONS SUR RENDEZ-VOUS",
      headlineAr: "الفحص والاستشارات بموعد مسبق",
      workingHours: "Samedi - Jeudi : 08h30 - 16h30",
      workingHoursAr: "السبت - الخميس : 08:30 إلى 16:30",
      note: "Conventionné CNAS & CASNOS",
      noteAr: "متعاقد مع الضمان الاجتماعي CNAS & CASNOS",
    },
  },
  {
    id: "legal-avocat",
    category: "legal",
    categoryName: "Avocats & Notaires",
    categoryNameAr: "محامون ومستشارون قانونيون",
    name: "Maître Cabinet Juridique",
    nameAr: "محامٍ لدى المجلس / موثق",
    previewColor: "#78350f", // Rich warm amber / bronze
    textColor: "#0f172a",
    accentColor: "#b45309",
    front: {
      title: "Maître Amine HADJ-ALI",
      titleAr: "الأستاذ أمين حاج علي",
      subtitle: "Avocat à la Cour — Conseil Juridique & Affaires",
      subtitleAr: "محامٍ معتمد لدى مجلس قضاء وهران والمحكمة العليا",
      contact1: "Cabinet : +213 (0) 41 40 10 20",
      contact2: "Mobile : +213 (0) 661 22 33 44",
      address: "Boulevard de la Soummam, Oran",
      addressAr: "شارع الصومام، وسط مدينة وهران",
    },
    back: {
      headline: "DROIT DES AFFAIRES, COMMERCIAL & IMMOBILIER",
      headlineAr: "قانون الأعمال، التجاري، والنزاعات العقارية",
      workingHours: "Dimanche - Jeudi : 09h00 - 17h00",
      workingHoursAr: "الأحد - الخميس : 09:00 إلى 17:00",
      note: "Barreau d'Oran - Membre de l'Union Nationale des Avocats",
      noteAr: "نقابة المحامين لمنظمة وهران",
    },
  },
  {
    id: "food-resto",
    category: "food",
    categoryName: "Restaurants & Fast-Food",
    categoryNameAr: "مطاعم ومقاهي",
    name: "Gourmet Burger & Lounge",
    nameAr: "مطعم وبرجر فاخر",
    previewColor: "#dc2626", // Red / warm
    textColor: "#18181b",
    accentColor: "#f59e0b",
    front: {
      title: "LE GOURMET ORANAIS",
      titleAr: "مطعم الذواقة الوهراني",
      subtitle: "Burgers Artisanaux • Grillades au Feu de Bois",
      subtitleAr: "برجر مشوي على الحطب • وجبات عائلية",
      contact1: "Livraison & Commandes : +213 (0) 555 90 90 90",
      contact2: "Instagram : @legourmet_oran",
      address: "Front de Mer, Oran",
      addressAr: "شارع جبهة البحر، وهران",
    },
    back: {
      headline: "SERVICE DE LIVRAISON EXPRESS À DOMICILE",
      headlineAr: "خدمة التوصيل السريع للمنازل والمكاتب",
      workingHours: "7j/7 : 11h30 - 00h30",
      workingHoursAr: "طيلة أيام الأسبوع : 11:30 صباحاً إلى 00:30 ليلاً",
      note: "Viandes fraîches 100% locales certifiées",
      noteAr: "لحوم طازجة محلية 100%",
    },
  },
  {
    id: "corp-startup",
    category: "corporate",
    categoryName: "Startups & PME",
    categoryNameAr: "شركات ناشئة ومؤسسات",
    name: "TechDz Digital Solutions",
    nameAr: "شركة تقنية وحلول رقمية",
    previewColor: "#2563eb", // Deep tech blue
    textColor: "#0f172a",
    accentColor: "#3b82f6",
    front: {
      title: "Yassine CHERIF",
      titleAr: "ياسين شريف",
      subtitle: "Directeur Général • Chief Technology Officer",
      subtitleAr: "المدير العام والتنفيذي للحلول السحابية",
      contact1: "Email : yassine@techdz-solutions.com",
      contact2: "Tél : +213 (0) 560 77 88 99",
      address: "Cyberparc Sidi Abdellah / Agence Oran",
      addressAr: "الحظيرة التكنولوجية سيدي عبد الله / فرع وهران",
    },
    back: {
      headline: "CLOUD SOLUTIONS, AI & ENTERPRISE ERP",
      headlineAr: "حلول الحوسبة السحابية، الذكاء الاصطناعي وأنظمة المؤسسات",
      workingHours: "Support 24/7 pour les professionnels",
      workingHoursAr: "دعم فني واستشارات للمؤسسات 24/7",
      note: "Labelisé Startup Ministère de l'Économie de la Connaissance",
      noteAr: "حائز على علامة مؤسسة ناشئة معتمدة",
    },
  },
];
