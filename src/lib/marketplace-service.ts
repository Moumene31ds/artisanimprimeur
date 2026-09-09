// src/lib/marketplace-service.ts
// Marketplace service for freelance graphic designers to monetize templates

export interface DesignerTemplate {
  id: string;
  designerUserId: string;
  designerName: string;
  designerAvatar?: string;
  title: string;
  titleAr: string;
  category: "cartes" | "flyers" | "stickers" | "packaging" | "affiches";
  previewImageUrl: string;
  royaltyFeeDZD: number; // e.g. 300 - 1000 DA
  totalSalesCount: number;
  rating: number;
  approved: boolean;
  createdAt: any;
}

export const SHOWCASE_TEMPLATES: DesignerTemplate[] = [
  {
    id: "tpl-dz-vintage",
    designerUserId: "des-amine",
    designerName: "Amine K. (Oran)",
    designerAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
    title: "Carte de Visite Kraft & Minimaliste Vintage",
    titleAr: "بطاقة عمل ورق كرافت بتصميم فينتاج أصيل",
    category: "cartes",
    previewImageUrl: "/products/cartes-premium.jpg",
    royaltyFeeDZD: 400,
    totalSalesCount: 142,
    rating: 4.9,
    approved: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-gourmet-menu",
    designerUserId: "des-sarah",
    designerName: "Sarah D. (Alger)",
    designerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    title: "Dépliant Menu 3 Volets Restaurant Italien",
    titleAr: "مطوية منيو مطعم فاخر بثلاث طيات",
    category: "flyers",
    previewImageUrl: "/products/flyers.jpg",
    royaltyFeeDZD: 600,
    totalSalesCount: 89,
    rating: 4.8,
    approved: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-cosmetic-label",
    designerUserId: "des-mehdi",
    designerName: "Mehdi B. (Constantine)",
    designerAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200",
    title: "Sticker Flacon & Bougie Artisanale Doré",
    titleAr: "ملصق دائري فاخر لمنتجات التجميل والشموع",
    category: "stickers",
    previewImageUrl: "/products/stickers.jpg",
    royaltyFeeDZD: 350,
    totalSalesCount: 215,
    rating: 5.0,
    approved: true,
    createdAt: new Date().toISOString(),
  },
];
