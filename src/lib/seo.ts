// src/lib/seo.ts
// Central SEO configuration + JSON-LD structured-data builders.
// Every page that emits schema.org markup should source it from here so the
// brand details (phone, domain, ratings, opening hours…) stay in one place.

export const SITE_URL = "https://artisanimprimeur.vercel.app";
export const SITE_NAME = "L'Artisan Imprimeur";
export const SITE_NAME_AR = "الحرفي للطباعة";
export const SITE_DESCRIPTION =
  "L'Artisan Imprimeur : Votre partenaire premium pour l'impression et le design en Algérie. Cartes de visite, flyers, et solutions publicitaires. تواصل معنا: +213549179000";

export const SITE_PHONE = "+213549179000";
export const SITE_PHONE_INTL = "+213549179000";
export const SITE_EMAIL = "contact@artisanimprimeur.dz";

// Brand-wide aggregate rating (used across LocalBusiness / Product schema).
export const SITE_RATING = { ratingValue: "4.9", reviewCount: "184" };

// Standard opening hours for the Oran workshop (Mon–Sat, 09:00–18:00).
export const SITE_OPENING_HOURS = {
  "@type": "OpeningHoursSpecification",
  dayOfWeek: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  opens: "09:00",
  closes: "18:00",
};

export const SITE_GEO = {
  "@type": "GeoCoordinates",
  latitude: 35.6969,
  longitude: -0.6331,
};

/** Safely serialise an object into an inline JSON-LD string (XSS-safe). */
export function jsonLd(obj: Record<string, unknown>): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\\'/g, "\\u0027");
}

/** Brand-wide Organization + LocalBusiness node (rich results source of truth). */
export function organizationJsonLd(extra?: Record<string, unknown>) {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "PrintingService"],
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: SITE_NAME_AR,
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon.svg`,
    image: `${SITE_URL}/opengraph-image`,
    telephone: SITE_PHONE,
    email: SITE_EMAIL,
    priceRange: "DA",
    foundingDate: "2015",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Atelier d'impression, Zone des arts graphiques",
      addressLocality: "Oran",
      addressRegion: "Oran",
      postalCode: "31000",
      addressCountry: "DZ",
    },
    geo: SITE_GEO,
    openingHoursSpecification: SITE_OPENING_HOURS,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: SITE_RATING.ratingValue,
      reviewCount: SITE_RATING.reviewCount,
      bestRating: "5",
      worstRating: "1",
    },
    sameAs: [
      "https://www.facebook.com/artisanimprimeur",
      "https://www.instagram.com/artisanimprimeur",
      "https://www.tiktok.com/@artisanimprimeur",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE_PHONE,
      contactType: "customer service",
      areaServed: "DZ",
      availableLanguage: ["fr", "ar"],
    },
    ...extra,
  };
}

/** WebSite node with Sitelinks SearchBox action (helps Google surface a search box). */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: ["fr", "ar"],
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/services?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** BreadcrumbList for a given page path (no trailing slash). */
export function breadcrumbJsonLd(
  items: { name: string; url?: string }[],
  locale: "fr" | "ar" = "fr"
) {
  const label = locale === "ar" ? "الرئيسية" : "Accueil";
  const crumbs = [
    { name: label, url: SITE_URL },
    ...items,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

/** LocalBusiness node scoped to one Algerian city (city printing pages). */
export function localBusinessCityJsonLd(
  cityKey: string,
  cityFr: string,
  cityAr: string,
  geo?: { latitude: number; longitude: number }
) {
  const url = `${SITE_URL}/services/printing/${cityKey}`;
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "PrintingService"],
    "@id": `${url}/#business`,
    name: `${SITE_NAME} ${cityFr}`,
    alternateName: `${SITE_NAME_AR} ${cityAr}`,
    url,
    image: `${SITE_URL}/opengraph-image`,
    telephone: SITE_PHONE,
    priceRange: "DA",
    address: {
      "@type": "PostalAddress",
      addressLocality: cityFr,
      addressCountry: "DZ",
    },
    ...(geo ? { geo: { "@type": "GeoCoordinates", latitude: geo.latitude, longitude: geo.longitude } } : {}),
    openingHoursSpecification: SITE_OPENING_HOURS,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: SITE_RATING.ratingValue,
      reviewCount: SITE_RATING.reviewCount,
      bestRating: "5",
      worstRating: "1",
    },
    parentOrganization: {
      "@id": `${SITE_URL}/#organization`,
    },
    description: `Services d'impression numérique et offset premium pour professionnels et particuliers à ${cityFr} (${cityAr}).`,
  };
}

/** ItemList of products (used on home/services pages). */
export function productListJsonLd(
  products: { name: string; price: number; image?: string; category?: string; url?: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE_NAME} — Produits d'impression`,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: product.name,
        image: product.image ? (product.image.startsWith("http") ? product.image : `${SITE_URL}${product.image}`) : undefined,
        category: product.category,
        ...(product.url ? { url: product.url } : {}),
        offers: {
          "@type": "Offer",
          price: product.price,
          priceCurrency: "DZD",
          availability: "https://schema.org/InStock",
          url: product.url ?? SITE_URL,
        },
      },
    })),
  };
}

/** FAQPage node for frequently asked questions. */
export function faqJsonLd(questions: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: {
        "@type": "Answer",
        text: a,
      },
    })),
  };
}

/** Service node for the /services overview page. */
export function serviceJsonLd(services: { name: string; description?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/services/#service`,
    name: `${SITE_NAME} — Services d'impression`,
    serviceType: "Impression et design graphique",
    provider: {
      "@id": `${SITE_URL}/#organization`,
    },
    areaServed: { "@type": "Country", name: "Algérie" },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services d'impression",
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service.name,
          ...(service.description ? { description: service.description } : {}),
        },
      })),
    },
  };
}
