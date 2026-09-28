import type { CuratedList, OrderStatus, ProductBadge, ProductCategory } from '@/types';

// Allowed values mirror the checks in the Go API and the database schema.

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  phone: 'Phone',
  tablet: 'Tablet',
  accessory: 'Accessory',
};

export const BADGES: ProductBadge[] = ['NEW', 'HOT', 'SALE'];

/** Home-page shelves (products.curated_lists). */
export const CURATED_LISTS: { value: CuratedList; label: string; description: string }[] = [
  { value: 'flash_sale', label: 'Flash sale', description: 'Flash-sale shelf with the countdown' },
  { value: 'popular', label: 'Popular', description: '"Popular right now" shelf' },
  { value: 'accessories', label: 'Accessories', description: 'Accessories shelf' },
];

/** In fulfilment order; `dot` colors the status marker. */
export const ORDER_STATUSES: { value: OrderStatus; label: string; dot: string }[] = [
  { value: 'confirmed', label: 'Confirmed', dot: 'bg-ink-3' },
  { value: 'processing', label: 'Processing', dot: 'bg-warning' },
  { value: 'shipped', label: 'Shipped', dot: 'bg-accent' },
  { value: 'delivered', label: 'Delivered', dot: 'bg-success' },
  { value: 'cancelled', label: 'Cancelled', dot: 'bg-danger' },
];

export const PAYMENT_METHODS: Record<string, string> = {
  credit_card: 'Credit card',
  bank_transfer: 'Bank transfer',
  cod: 'Cash on delivery',
};
