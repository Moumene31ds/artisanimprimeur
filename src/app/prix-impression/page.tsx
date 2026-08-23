import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, organizationJsonLd } from "@/lib/seo";
import { getCatalogProducts } from "@/lib/catalog";
import PricingContent from "./PricingContent";

export const metadata: Metadata = {
  title: "Prix Impression en Algérie — Tarifs Cartes de Visite, Flyers, Affiches",
  description:
    "Tarifs d'impression en Algérie : cartes de visite dès 2500 DA, flyers dès 4500 DA, stickers dès 1200 DA, affiches A3 dès 3000 DA. Tarification dégressive et devis en ligne gratuit. Prix à Alger, Oran, Constantine et plus.",
  alternates: {
    canonical: `${SITE_URL}/prix-impression`,
    languages: { fr: `${SITE_URL}/prix-impression`, ar: `${SITE_URL}/prix-impression` },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/prix-impression`,
    siteName: SITE_NAME,
    title: "Prix Impression en Algérie — Tarifs 2026",
    description: SITE_DESCRIPTION,
    images: [
      { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "Prix impression Algérie — L'Artisan Imprimeur" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prix Impression en Algérie",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default async function PrixImpressionPage() {
  const products = await getCatalogProducts();
  const sorted = [...products].sort((a, b) => Number(a.price) - Number(b.price));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationJsonLd(),
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/prix-impression/#page`,
        url: `${SITE_URL}/prix-impression`,
        name: "Prix Impression en Algérie — Tarifs 2026",
        inLanguage: ["fr", "ar"],
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Prix impression", item: `${SITE_URL}/prix-impression` },
          ],
        },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: sorted.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: p.name,
              offers: {
                "@type": "Offer",
                price: Number(p.price),
                priceCurrency: "DZD",
                availability: "https://schema.org/InStock",
              },
            },
          })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            q: "Combien coûte l'impression de cartes de visite en Algérie ?",
            a: "Chez L'Artisan Imprimeur, les cartes de visite premium commencent à 2500 DA. Le prix baisse avec les quantités grâce à notre tarification dégressive transparente.",
          },
          {
            q: "Quel est le prix des flyers publicitaires ?",
            a: "Les flyers publicitaires démarrent à 4500 DA. Nous acceptons les fichiers PDF, PNG et JPEG en 300 DPI CMYK pour un rendu haute définition.",
          },
          {
            q: "Les prix incluent-ils le design ?",
            a: "Le design de base est gratuit via notre AI Studio. Vous pouvez aussi téléverser votre propre fichier imprimable (PDF, PNG, JPEG).",
          },
          {
            q: "Comment obtenir un devis pour une grande quantité ?",
            a: "Contactez-nous au +213 549 17 90 00 ou passez commande en ligne : la tarification dégressive s'applique automatiquement selon les quantités.",
          },
        ].map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PricingContent products={sorted} />
    </>
  );
}
