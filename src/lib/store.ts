// @/lib/store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

// 1. تعريف بنية المنتج (Product Interface)
export interface Product {
  id: string | number;
  name: string;
  price: number;
  image: string;
  category?: string;
  quantity?: number; // جعلناها اختيارية لتجنب أخطاء تجميع المنتجات المعروضة
  basePrice?: number; // السعر الأساسي للمنتج لتسهيل الحسابات عند تغيير الخيارات
  selectedOptions?: {
    finition?: string;
    [key: string]: any;
  };
}

// 2. تعريف بنية الحالة للمتجر (Store State Interface)
interface AppState {
  // حالة اللغة
  language: "ar" | "fr";
  setLanguage: (lang: "ar" | "fr") => void;

  // حالة سلة التسوق
  cart: Product[];
  addToCart: (product: Omit<Product, "quantity"> & { quantity?: number }) => void;
  updateQuantity: (productId: string | number, quantity: number) => void;
  updateCartItem: (productId: string | number, updatedFields: Partial<Product>) => void;
  removeFromCart: (productId: string | number) => void;
  clearCart: () => void;
  getCartTotal: () => number;

  // حالة المنتجات المفضلة
  favorites: Product[];
  toggleFavorite: (product: any) => void;
  isFavorite: (productId: string | number) => boolean;
  clearFavorites: () => void; // دالة تفريغ المفضلة بالكامل
}

// 3. إنشاء المتجر باستخدام Zustand مع الحفظ التلقائي والمزامنة المتقدمة
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // حالة التحكم في اللغة
      language: "ar",
      setLanguage: (lang) => set({ language: lang }),

      // حالة وإجراءات سلة التسوق (Cart Actions)
      cart: [],
      addToCart: (product) =>
        set((state) => {
          const existingItem = state.cart.find((item) => item.id === product.id);
          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: (item.quantity || 1) + (product.quantity || 1) }
                  : item
              ),
            };
          }
          return {
            cart: [...state.cart, { ...product, quantity: product.quantity || 1 }],
          };
        }),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        })),

      updateCartItem: (productId, updatedFields) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === productId ? { ...item, ...updatedFields } : item
          ),
        })),

      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== productId),
        })),

      clearCart: () => set({ cart: [] }),

      // الدالة المسؤولة عن حساب إجمالي السلة بدقة وحل مشكلة عدم التعرف على الدالة
      getCartTotal: () => {
        const cart = get().cart;
        if (!cart || !Array.isArray(cart)) return 0;
        return cart.reduce((total, item) => {
          const price = Number(item.price) || 0;
          const qty = Number(item.quantity) || 1;
          return total + price * qty;
        }, 0);
      },

      // حالة وإجراءات المنتجات المفضلة (Favorites Actions)
      favorites: [],
      toggleFavorite: (product) =>
        set((state) => {
          const isFav = state.favorites.some((p) => p.id === product.id);
          return {
            favorites: isFav
              ? state.favorites.filter((p) => p.id !== product.id)
              : [...state.favorites, product],
          };
        }),

      isFavorite: (productId) => {
        const favorites = get().favorites;
        if (!favorites || !Array.isArray(favorites)) return false;
        return favorites.some((p) => p.id === productId);
      },

      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: "artisan-imprimeur-storage", // الاسم التعريفي الموحد للتخزين والمزامنة
    }
  )
);

// 🛠️ ميزة المزامنة اللحظية الشاملة (Cross-tab State Sync)
// تقوم بتحديث السلة، اللغة، والمفضلة فوراً في جميع التبويبات المفتوحة للموقع بمجرد تغييرها في أي نافذة
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "artisan-imprimeur-storage") {
      useAppStore.persist.rehydrate();
    }
  });
}
