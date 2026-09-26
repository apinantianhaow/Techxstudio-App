-- ============================================================
-- TechXStudio v2 — Row Level Security Policies
-- Run this in Supabase SQL Editor (third)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Products (public read)
-- ============================================================
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Product colors are viewable by everyone"
  ON product_colors FOR SELECT USING (TRUE);

CREATE POLICY "Product options are viewable by everyone"
  ON product_options FOR SELECT USING (TRUE);

CREATE POLICY "Product specs are viewable by everyone"
  ON product_specs FOR SELECT USING (TRUE);

-- ============================================================
-- Reviews (public read, auth write)
-- ============================================================
CREATE POLICY "Reviews are viewable by everyone"
  ON product_reviews FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert their own reviews"
  ON product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON product_reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON product_reviews FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Cart (owner only)
-- ============================================================
CREATE POLICY "Users can view their own cart"
  ON cart_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own cart"
  ON cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart"
  ON cart_items FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own cart"
  ON cart_items FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Wishlist (owner only)
-- ============================================================
CREATE POLICY "Users can view their own wishlist"
  ON wishlist_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own wishlist"
  ON wishlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own wishlist"
  ON wishlist_items FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Coupons (public read active only)
-- ============================================================
CREATE POLICY "Active coupons are viewable"
  ON coupons FOR SELECT USING (is_active = TRUE);

-- ============================================================
-- Orders (owner only)
-- ============================================================
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Order Items (owner via order)
-- ============================================================
CREATE POLICY "Users can view their own order items"
  ON order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

CREATE POLICY "Users can insert their own order items"
  ON order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- ============================================================
-- Users (self only)
-- ============================================================
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE USING (auth.uid() = id);
