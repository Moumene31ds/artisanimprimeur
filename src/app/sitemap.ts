import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

const CITIES: Record<string, { fr: string; ar: string }> = {
  alger: { fr: 'Alger', ar: 'الجزائر' },
  oran: { fr: 'Oran', ar: 'وهران' },
  constantine: { fr: 'Constantine', ar: 'قسنطينة' },
  annaba: { fr: 'Annaba', ar: 'عنابة' },
  tlemcen: { fr: 'Tlemcen', ar: 'تلمسان' },
  setif: { fr: 'Sétif', ar: 'سطيف' },
  blida: { fr: 'Blida', ar: 'البليدة' },
  batna: { fr: 'Batna', ar: 'باتنة' },
  bejaia: { fr: 'Béjaïa', ar: 'بجاية' },
  chlef: { fr: 'Chlef', ar: 'الشلف' },
};

const PRODUCT_IMAGES = [
  `${SITE_URL}/products/cartes-premium.jpg`,
  `${SITE_URL}/products/flyers.jpg`,
  `${SITE_URL}/products/stickers.jpg`,
  `${SITE_URL}/products/affiches.jpg`,
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
      alternates: {
        languages: { fr: SITE_URL, ar: SITE_URL },
      },
      images: PRODUCT_IMAGES,
    },
    {
      url: `${SITE_URL}/services`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: {
        languages: { fr: `${SITE_URL}/services`, ar: `${SITE_URL}/services` },
      },
    },
    { url: `${SITE_URL}/landing`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/ai-studio`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/customizer`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/showroom`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/qr-maker`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/bat-scanner`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/rewards`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/cart`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/profile`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/orders`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/favorites`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/notifications`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/payment-verify`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/success`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/forgot-password`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const cities: MetadataRoute.Sitemap = Object.entries(CITIES).map(([key, info]) => ({
    url: `${SITE_URL}/services/printing/${key}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
    alternates: {
      languages: {
        fr: `${SITE_URL}/services/printing/${key}`,
        ar: `${SITE_URL}/services/printing/${key}`,
      },
    },
    images: PRODUCT_IMAGES,
  }));

  return [...core, ...cities];
}
