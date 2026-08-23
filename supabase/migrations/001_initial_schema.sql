-- ============================================================
-- TechXStudio v2 — Initial Schema
-- Run this in Supabase SQL Editor (first)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- 2. Products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('phone', 'tablet', 'accessory')),
  description TEXT,
  badge TEXT,
  sale_percent INTEGER DEFAULT 0,
  original_price DECIMAL(12,2) NOT NULL,
  rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  reviews_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  curated_lists TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_curated ON products USING GIN(curated_lists);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_name_search ON products USING GIN(to_tsvector('simple', name));

-- ============================================================
-- 3. Product Colors
-- ============================================================
CREATE TABLE IF NOT EXISTS product_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex TEXT NOT NULL,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_product_colors_product ON product_colors(product_id);

-- ============================================================
-- 4. Product Options
-- ============================================================
CREATE TABLE IF NOT EXISTS product_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_product_options_product ON product_options(product_id);

-- ============================================================
-- 5. Product Specs
-- ============================================================
CREATE TABLE IF NOT EXISTS product_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  spec_key TEXT NOT NULL,
  spec_value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_product_specs_product ON product_specs(product_id);

-- ============================================================
-- 6. Product Reviews (NEW in v2)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_user ON product_reviews(user_id);

-- ============================================================
-- 7. Cart Items
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_label TEXT,
  color_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price DECIMAL(12,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cart_items_user ON cart_items(user_id);

-- ============================================================
-- 8. Wishlist Items
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlist_items_user ON wishlist_items(user_id);

-- ============================================================
-- 9. Coupons (NEW in v2)
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  min_purchase DECIMAL(12,2) DEFAULT 0,
  max_discount DECIMAL(12,2),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);

-- ============================================================
-- 10. Orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  total_amount DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  coupon_code TEXT,
  shipping_address TEXT,
  payment_method TEXT DEFAULT 'credit_card',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ============================================================
-- 11. Order Items
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  option_label TEXT,
  color_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(12,2) NOT NULL,
  image_url TEXT
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- Auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
