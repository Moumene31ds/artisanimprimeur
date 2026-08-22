// src/lib/recently-viewed.ts
// سجل "شوهد مؤخراً" — تخزين محلي مجاني، بحد أقصى 8 منتجات.
export interface RecentItem {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  image?: string;
  viewedAt: number;
}

const KEY = "artisan_recently_viewed";
const MAX_ITEMS = 8;

export function getRecentlyViewed(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list: RecentItem[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function trackProductView(item: Omit<RecentItem, "viewedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const list = getRecentlyViewed().filter((i) => i.id !== item.id);
    list.unshift({ ...item, viewedAt: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    // تجاهل (وضع التصفح الخفي المقيّد مثلاً)
  }
}

export function clearRecentlyViewed(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
