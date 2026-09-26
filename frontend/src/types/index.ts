/**
 * Shared data shapes returned by the Go API (backend/).
 * Keep in sync with backend/internal/models.
 */

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

export type ProductCategory = 'phone' | 'tablet' | 'accessory';

export interface Product {
  id: string;
  name: string;
  slug: string;
  category?: string;
  description?: string | null;
  badge: string | null;
  sale_percent: number;
  original_price: number;
  rating: number;
  reviews_count?: number;
  is_active?: boolean;
  curated_lists?: string[];
  created_at?: string;
  updated_at?: string;
  product_colors?: ProductColor[];
  product_options?: ProductOption[];
  product_specs?: ProductSpec[];
}

export interface Review {
  id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  users?: { full_name: string | null; avatar_url?: string | null } | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone?: string | null;
  avatar_url: string | null;
  created_at: string;
}

/** Cart line as stored client-side in the cart store. */
export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  option_label: string;
  color_name: string;
  quantity: number;
  price: number;
  image_url: string;
  slug: string;
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
  payment_method: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface CouponSummary {
  code: string;
  discount_percent: number;
  discount_amount: number;
  min_purchase: number;
  max_discount: number | null;
}

/** Coupon applied in the cart page (validation result + computed discount). */
export interface AppliedCoupon extends CouponSummary {
  discount: number;
}

export interface CouponValidation {
  valid: boolean;
  coupon: CouponSummary;
  calculated_discount: number;
}

/** Every error response from the API has this shape. */
export interface ApiError {
  error: string;
}

/** fetch() wrapper that attaches the JWT; provided by AuthContext. */
export type AuthFetch = (url: string, options?: RequestInit) => Promise<Response>;
