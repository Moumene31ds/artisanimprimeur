import { Metadata } from "next";
import { getCatalogProducts, CatalogProduct } from "@/lib/catalog";
import { localBusinessCityJsonLd, breadcrumbJsonLd, faqJsonLd, organizationJsonLd, SITE_URL } from "@/lib/seo";
import CityPrintingContent from "./CityPrintingContent";

// List of top Algerian cities to pre-render statically for fast load times and SEO indexing
const CITIES_MAP: Record<string, { fr: string; ar: string; geo: { latitude: number; longitude: number } }> = {
  alger: { fr: "Alger", ar: "الجزائر", geo: { latitude: 36.7538, longitude: 3.0588 } },
  oran: { fr: "Oran", ar: "وهران", geo: { latitude: 35.6969, longitude: -0.6331 } },
  constantine: { fr: "Constantine", ar: "قسنطينة", geo: { latitude: 36.365, longitude: 6.6147 } },
  annaba: { fr: "Annaba", ar: "عنابة", geo: { latitude: 36.9, longitude: 7.7667 } },
  tlemcen: { fr: "Tlemcen", ar: "تلمسان", geo: { latitude: 34.8828, longitude: -1.3167 } },
  setif: { fr: "Sétif", ar: "سطيف", geo: { latitude: 36.1911, longitude: 5.4137 } },
  blida: { fr: "Blida", ar: "البليدة", geo: { latitude: 36.4703, longitude: 2.8277 } },
  batna: { fr: "Batna", ar: "باتنة", geo: { latitude: 35.5553, longitude: 6.1741 } },
  bejaia: { fr: "Béjaïa", ar: "بجاية", geo: { latitude: 36.7509, longitude: 5.0567 } },
  chlef: { fr: "Chlef", ar: "الشلف", geo: { latitude: 36.1652, longitude: 1.3345 } },
};

interface PageProps {
  params: Promise<{
    city: string;
  }>;
}

// Generate static routes for predefined cities
export async function generateStaticParams() {
  return Object.keys(CITIES_MAP).map((city) => ({
    city,
  }));
}

// Dynamic SEO metadata based on city parameter
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const cityKey = city.toLowerCase();
  const cityInfo = CITIES_MAP[cityKey] || { fr: city, ar: city };
  
  const title = `Impression Professionnelle & Matériel Publicitaire à ${cityInfo.fr} | L'Artisan Imprimeur`;
  const description = `Besoin d'impression de cartes de visite, flyers ou étiquettes à ${cityInfo.fr} (${cityInfo.ar}) ? L'Artisan Imprimeur assure une qualité premium, devis en ligne et retrait à Oran. Livraison bientôt disponible.`;
  const url = `${SITE_URL}/services/printing/${cityKey}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        fr: url,
        ar: url,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "L'Artisan Imprimeur",
      images: [
        {
          url: `${SITE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}

export default async function CityPrintingPage({ params }: PageProps) {
  const { city } = await params;
  const cityKey = city.toLowerCase();
  const cityName = CITIES_MAP[cityKey] || { fr: city, ar: city, geo: undefined };

  // Fetch the unified catalog (live Firestore data with static fallback)
  const products = await getCatalogProducts();

  const cityFaqs = [
    {
      q: `Où retirer mes impressions à ${cityName.fr} ?`,
      a: `Le retrait de vos commandes d'impression à ${cityName.fr} (${cityName.ar}) se fait actuellement à l'atelier principal de L'Artisan Imprimeur à Oran, cité Akid Lotfi, ouvert de 09h à 18h du lundi au samedi. La livraison à domicile à ${cityName.fr} arrive très bientôt.`,
    },
    {
      q: `Quels délais pour l'impression à ${cityName.fr} ?`,
      a: `Nous assurons un service rapide 24h/48h pour la plupart des supports (cartes de visite, flyers, affiches). Chaque commande passe par un contrôle automatique de fichiers par IA avant impression pour garantir une qualité irréprochable.`,
    },
    {
      q: `Quels produits puis-je commander à ${cityName.fr} ?`,
      a: `Cartes de visite premium, flyers publicitaires, stickers personnalisés, affiches de luxe, invitations et goodies — le tout en impression numérique et offset haute définition avec tarification dégressive transparente.`,
    },
    {
      q: `Comment payer une commande à ${cityName.fr} ?`,
      a: `Paiement à la réception en espèces lors du retrait, ou par virement BaridiMob avec envoi du reçu pour vérification rapide. La tarification dégressive vous garantit le meilleur prix selon les quantités.`,
    },
  ];

  // LocalBusiness + FAQ structured schema markup for SEO
  const jsonLdMarkup = [
    organizationJsonLd(),
    localBusinessCityJsonLd(cityKey, cityName.fr, cityName.ar, cityName.geo),
    breadcrumbJsonLd([
      { name: "Services", url: `${SITE_URL}/services` },
      { name: `Impression ${cityName.fr}` },
    ]),
    faqJsonLd(cityFaqs.map((f) => ({ q: f.q, a: f.a }))),
  ];

  const otherCities = Object.entries(CITIES_MAP).filter(([key]) => key !== cityKey);

  return (
    <>
      {/* Schema Markup Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdMarkup) }}
      />

      <CityPrintingContent
        cityName={cityName}
        products={products}
        otherCities={otherCities}
      />
    </>
  );
}
