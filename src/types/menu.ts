export type MenuCategory = 
  | 'Appetizer & Starters'
  | 'Signature Steaks & Mains'
  | 'Pasta & Risotto'
  | 'Artisan Desserts'
  | 'Craft Cocktails & Wine'
  | 'Artisan Coffee & Tea'
  | string;

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number; // in IDR
  description: string;
  imageUrl: string;
  isAvailable: boolean; // Real-time stock availability toggle
  isChefSpecial: boolean; // Chef's recommendation badge
  originalPrice?: number; // Original price before promo/discount in IDR
  discountPercent?: number; // Discount percentage (e.g. 20 for 20%)
  isSeasonalPromo?: boolean; // Flag indicating if item is part of limited seasonal promotion
  promoBadge?: string; // Optional badge label like 'Diskon 25%', 'Special Season', etc.
  prepTimeMinutes?: number;
  calories?: number;
  dietaryTags?: string[]; // e.g. ['Halal', 'Chef Signature', 'Gluten Free', 'Vegetarian']
  orderCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategoryMeta {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
}
