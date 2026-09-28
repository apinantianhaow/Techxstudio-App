/**
 * Data shapes of the admin API (/api/admin/*) served by the Go backend in
 * backend/ of this repo. Keep in sync with internal/models and the
 * input structs in internal/api/admin_*.go.
 */

export type ProductCategory = 'phone' | 'tablet' | 'accessory';
export type ProductBadge = 'NEW' | 'HOT' | 'SALE';
export type CuratedList = 'flash_sale' | 'popular' | 'accessories';

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  image_url: string | null;
  sort_order: number;
}

export interface ProductOption {
  id: string;
  label: string;
  price: number;
  sort_order: number;
}

export interface ProductSpec {
  id: string;
  spec_key: string;
  spec_value: string;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  description: string | null;
  badge: ProductBadge | null;
  sale_percent: number;
  original_price: number;
  rating: number;
  reviews_count: number;
  is_active: boolean;
  curated_lists: CuratedList[];
  created_at: string;
  updated_at: string;
  product_colors?: ProductColor[];
  product_options?: ProductOption[];
  product_specs?: ProductSpec[];
}

/** Body of POST /api/admin/products and PUT /api/admin/products/{id}. PUT replaces everything. */
export interface ProductInput {
  name: string;
  slug: string;
  category: ProductCategory;
  description: string;
  badge: ProductBadge | null;
  sale_percent: number | null;
  original_price: number | null;
  is_active: boolean;
  curated_lists: CuratedList[];
  product_colors: { name: string; hex: string; image_url: string }[];
  product_options: { label: string; price: number | null }[];
  product_specs: { spec_key: string; spec_value: string }[];
}

export interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  discount_amount: number;
  min_purchase: number;
  max_discount: number | null;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

/** Body of POST /api/admin/coupons and PUT /api/admin/coupons/{id}. */
export interface CouponInput {
  code: string;
  discount_percent: number | null;
  discount_amount: number | null;
  min_purchase: number | null;
  max_discount: number | null;
  max_uses: number | null;
  expires_at: string | null;
  is_active: boolean;
}

export type OrderStatus = 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  product_name: string;
  option_label: string | null;
  color_name: string | null;
  quantity: number;
  price: number;
  image_url: string | null;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  discount_amount: number;
  coupon_code: string | null;
  shipping_address: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  users: { email: string; username: string; full_name: string | null } | null;
}

/** Password sign-in step 1: a code was emailed; verify it to get the token. */
export interface OtpChallenge {
  otp_required: true;
  challenge_id: string;
  /** Masked address, e.g. "a•••@gmail.com" */
  email: string;
  expires_in: number;
  resend_in: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}
