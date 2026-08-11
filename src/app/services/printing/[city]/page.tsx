import { Metadata } from "next";
import { getCatalogProducts, CatalogProduct } from "@/lib/catalog";
import { localBusinessCityJsonLd, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight, Printer, MapPin, ShieldCheck, Truck } from "lucide-react";

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

  // LocalBusiness structured schema markup for SEO
  const jsonLdMarkup = [
    localBusinessCityJsonLd(cityKey, cityName.fr, cityName.ar, cityName.geo),
    breadcrumbJsonLd([
      { name: "Services", url: `${SITE_URL}/services` },
      { name: `Impression ${cityName.fr}` },
    ]),
  ];

  return (
    <>
      {/* Schema Markup Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdMarkup) }}
      />

      <div className="pb-24 max-w-7xl mx-auto px-4 space-y-16 mt-8">
        {/* Glassmorphic Localized Hero Banner */}
        <section className="relative overflow-hidden premium-glass p-8 md:p-12 rounded-[3.5rem] border border-white/60 dark:border-white/5 shadow-2xl flex flex-col md:flex-row items-center gap-10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/15 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

          <div className="flex-1 space-y-6 text-center md:text-left relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-black uppercase tracking-wider">
              <MapPin size={12} />
              Partenaire Local : {cityName.fr} / {cityName.ar}
            </span>
            
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">
              Imprimerie en ligne <br />
              <span className="text-accent">Premium à {cityName.fr}</span>
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm max-w-2xl leading-relaxed">
              L'Artisan Imprimeur dessert {cityName.fr} avec des services d'impressions de haute précision. Profitez d'une tarification dégressive transparente, d'un contrôle automatique de fichiers par IA et d'un retrait à l'atelier d'Oran. La livraison arrive bientôt.
            </p>

            {/* Quick Benefits Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs font-black text-slate-700 dark:text-slate-350">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <ShieldCheck className="text-emerald-500" size={18} />
                <span>Qualité Haute Définition</span>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Truck className="text-blue-500" size={18} />
                <span>Retrait à Oran (Livraison bientôt)</span>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Printer className="text-purple-500" size={18} />
                <span>Format Numérique & Offset</span>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Services Catalog Section */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              Nos Supports Publicitaires Disponibles
            </h2>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              sélectionnez votre produit pour commencer la configuration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.length === 0 ? (
              <div className="col-span-1 md:col-span-3 text-center py-20 premium-glass rounded-[2rem] text-slate-400 text-sm font-black">
                Aucun produit d'impression configuré pour le moment.
              </div>
            ) : (
              products.map((product: CatalogProduct) => (
                <div 
                  key={product.id}
                  className="premium-glass p-5 rounded-[2.5rem] border border-white/60 dark:border-white/10 flex flex-col justify-between hover:shadow-2xl hover:scale-101 transition-all group"
                >
                  <div className="space-y-4">
                    {/* Product Image */}
                    <div className="w-full h-48 rounded-3xl bg-slate-100 dark:bg-slate-900 overflow-hidden relative border border-slate-200/40 dark:border-slate-800">
                      <img 
                        src={product.image} 
                        alt={`${product.name} à ${cityName.fr}`} 
                        loading="lazy" decoding="async"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                      />
                    </div>
                    {/* Product Info */}
                    <div className="px-1 text-left">
                      <span className="text-[10px] font-black text-accent uppercase tracking-widest">
                        {product.category}
                      </span>
                      <h3 className="font-black text-slate-800 dark:text-white text-lg mt-1 truncate">
                        {product.name}
                      </h3>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold mt-1">
                        Retrait à l'atelier d'Oran — Livraison bientôt
                      </p>
                    </div>
                  </div>

                  {/* Pricing and Action Button */}
                  <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 block uppercase">À partir de</span>
                      <span className="text-xl font-black text-slate-900 dark:text-white">
                        {Number(product.price).toLocaleString()} <span className="text-xs">DA</span>
                      </span>
                    </div>
                    
                    <Link 
                      href={`/services?item=${product.id}`}
                      className="p-3 bg-slate-900 dark:bg-accent text-white rounded-2xl flex items-center justify-center hover:bg-slate-850 dark:hover:bg-blue-650 transition-colors"
                    >
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
