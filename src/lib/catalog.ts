// src/lib/catalog.ts
// Single source of truth for the product catalog.
// The home page, the city printing pages, and the admin panel all draw from here.

import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";

export interface CatalogProduct {
  id: string | number;
  name: string;
  price: number;
  image: string;
  category: string;
  active?: boolean;
  createdAt?: any;
}

// Featured products shown on the home page
export const FEATURED_PRODUCTS: CatalogProduct[] = [
  {
    id: "p1",
    name: "Cartes de Visite Premium",
    price: 2500,
    image: "https://img.magnific.com/psd-gratuit/modele-conception-carte-visite-professionnelle_47987-19617.jpg?semt=ais_hybrid&w=740&q=80",
    category: "Cartes",
  },
  {
    id: "p2",
    name: "Flyers Publicitaires (A5)",
    price: 4500,
    image: "https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&q=80&w=800",
    category: "Flyers",
  },
  {
    id: "p3",
    name: "Stickers Personnalisés",
    price: 1200,
    image: "https://lesgommettesfrancaises.com/wp-content/uploads/2024/01/GF506-stickers-joyeux-anniversaire-personnalise-gommettes-francaises.jpg",
    category: "Goodies",
  },
  {
    id: "p4",
    name: "Affiches de Luxe (A3)",
    price: 3000,
    image: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&q=80&w=800",
    category: "Impression",
  },
];

// Extended catalog used as a fallback whenever the database is empty
export const FALLBACK_PRODUCTS: CatalogProduct[] = [
  ...FEATURED_PRODUCTS,
  {
    id: "p5",
    name: "Invitations Mariage",
    price: 5000,
    image: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800",
    category: "Cartes",
  },
];

// Category filter used across the home page and admin panels
export const PRODUCT_CATEGORIES = ["Cartes", "Flyers", "Goodies", "Impression"];

const toMillis = (value: any): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

/**
 * Fetches the live catalog from the Firestore `products` collection.
 * Filters out deactivated products (legacy docs without an `active` field are kept)
 * and falls back to the static catalog when the database is empty or unreachable.
 */
export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  try {
    const snap = await getDocs(query(collection(db, "products")));
    const products = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) } as CatalogProduct))
      .filter((p) => p.active !== false && !!p.name && p.price != null)
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

    return products.length > 0 ? products : FALLBACK_PRODUCTS;
  } catch (err) {
    console.error("Error fetching catalog from Firestore:", err);
    return FALLBACK_PRODUCTS;
  }
}
