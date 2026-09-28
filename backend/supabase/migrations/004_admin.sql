-- ============================================================
-- TechXStudio v2 — Admin roles & product management
-- Run this in Supabase SQL Editor (fourth), before deploying the
-- API version that serves /api/admin/*
-- ============================================================

-- ============================================================
-- 1. User roles
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer'
  CHECK (role IN ('customer', 'admin'));

-- Promote the first admin (sign up in the store first, then run):
-- UPDATE users SET role = 'admin' WHERE email = 'you@example.com';

-- ============================================================
-- 2. admin_save_product
-- Creates (p_id = NULL) or updates a product and replaces its
-- colors, options and specs in one transaction, so a failed save
-- never leaves a product half-written.
-- sort_order follows the order of each JSON array.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_save_product(
  p_id      UUID,
  p_product JSONB,
  p_colors  JSONB DEFAULT '[]',
  p_options JSONB DEFAULT '[]',
  p_specs   JSONB DEFAULT '[]'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID := p_id;
BEGIN
  IF v_id IS NULL THEN
    INSERT INTO products (name, slug, category, description, badge, sale_percent,
                          original_price, is_active, curated_lists)
    VALUES (
      p_product->>'name',
      p_product->>'slug',
      p_product->>'category',
      p_product->>'description',
      p_product->>'badge',
      (p_product->>'sale_percent')::INTEGER,
      (p_product->>'original_price')::DECIMAL,
      (p_product->>'is_active')::BOOLEAN,
      ARRAY(SELECT jsonb_array_elements_text(p_product->'curated_lists'))
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE products SET
      name           = p_product->>'name',
      slug           = p_product->>'slug',
      category       = p_product->>'category',
      description    = p_product->>'description',
      badge          = p_product->>'badge',
      sale_percent   = (p_product->>'sale_percent')::INTEGER,
      original_price = (p_product->>'original_price')::DECIMAL,
      is_active      = (p_product->>'is_active')::BOOLEAN,
      curated_lists  = ARRAY(SELECT jsonb_array_elements_text(p_product->'curated_lists'))
    WHERE id = v_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_id USING ERRCODE = 'P0002';
    END IF;

    DELETE FROM product_colors  WHERE product_id = v_id;
    DELETE FROM product_options WHERE product_id = v_id;
    DELETE FROM product_specs   WHERE product_id = v_id;
  END IF;

  INSERT INTO product_colors (product_id, name, hex, image_url, sort_order)
  SELECT v_id, c.value->>'name', c.value->>'hex', c.value->>'image_url', c.ord
  FROM jsonb_array_elements(p_colors) WITH ORDINALITY AS c(value, ord);

  INSERT INTO product_options (product_id, label, price, sort_order)
  SELECT v_id, o.value->>'label', (o.value->>'price')::DECIMAL, o.ord
  FROM jsonb_array_elements(p_options) WITH ORDINALITY AS o(value, ord);

  INSERT INTO product_specs (product_id, spec_key, spec_value, sort_order)
  SELECT v_id, s.value->>'spec_key', s.value->>'spec_value', s.ord
  FROM jsonb_array_elements(p_specs) WITH ORDINALITY AS s(value, ord);

  RETURN v_id;
END;
$$;

-- Only the API (service role) may call it — never the public anon key.
REVOKE EXECUTE ON FUNCTION admin_save_product(UUID, JSONB, JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_save_product(UUID, JSONB, JSONB, JSONB, JSONB) TO service_role;

-- Let PostgREST see the new column and function right away.
NOTIFY pgrst, 'reload schema';
