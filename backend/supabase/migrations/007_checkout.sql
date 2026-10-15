-- ============================================================
-- TechXStudio v2 — Server-priced cart & checkout
-- Apply with `supabase db push` (after 006), before deploying the
-- API version with PUT /api/cart
-- ============================================================

-- ============================================================
-- 1. Cart lines
-- One row per product/option/color, where '' means the product
-- has no options (or no colors). Existing duplicates are merged
-- into the oldest row; quantities are capped at 99.
-- ============================================================
UPDATE cart_items
SET option_label = COALESCE(option_label, ''),
    color_name   = COALESCE(color_name, '')
WHERE option_label IS NULL OR color_name IS NULL;

WITH lines AS (
  SELECT id,
         row_number() OVER (line ORDER BY created_at, id) AS row_no,
         LEAST(sum(quantity) OVER line, 99) AS quantity
  FROM cart_items
  WINDOW line AS (PARTITION BY user_id, product_id, option_label, color_name)
), merged AS (
  UPDATE cart_items c SET quantity = l.quantity
  FROM lines l
  WHERE c.id = l.id AND l.row_no = 1 AND c.quantity <> l.quantity
)
DELETE FROM cart_items c
USING lines l
WHERE c.id = l.id AND l.row_no > 1;

ALTER TABLE cart_items
  ALTER COLUMN option_label SET DEFAULT '',
  ALTER COLUMN option_label SET NOT NULL,
  ALTER COLUMN color_name   SET DEFAULT '',
  ALTER COLUMN color_name   SET NOT NULL;

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_quantity_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_check CHECK (quantity BETWEEN 1 AND 99);

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_line_key;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_line_key UNIQUE (user_id, product_id, option_label, color_name);

-- ============================================================
-- 2. Order rules
-- NOT VALID: orders placed before this migration aren't checked
-- (old test orders may break these rules), but new orders and
-- every update of an order are. To list old rows that break one:
--   ALTER TABLE orders VALIDATE CONSTRAINT orders_total_amount_check;
-- ============================================================
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_total_amount_check;
ALTER TABLE orders ADD CONSTRAINT orders_total_amount_check
  CHECK (total_amount >= 0) NOT VALID;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_discount_amount_check;
ALTER TABLE orders ADD CONSTRAINT orders_discount_amount_check
  CHECK (discount_amount >= 0) NOT VALID;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('credit_card', 'bank_transfer', 'cod')) NOT VALID;

-- ============================================================
-- 3. cart_line_price
-- The one place that decides whether a line can be bought and
-- what it costs; every function below uses it. One row when the
-- product is active and option_label / color_name name one of its
-- options / colors ('' when it has none), no row otherwise.
-- unit_price is the option's price (original_price without
-- options) less sale_percent, rounded to whole baht: the same as
-- calcDiscountedPrice in frontend/src/lib/utils.ts.
-- ============================================================
CREATE OR REPLACE FUNCTION cart_line_price(p_product_id UUID, p_option_label TEXT, p_color_name TEXT)
RETURNS TABLE (unit_price DECIMAL, name TEXT, slug TEXT, image_url TEXT)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_base    DECIMAL;
  v_image   TEXT;
BEGIN
  SELECT * INTO v_product FROM products p WHERE p.id = p_product_id AND p.is_active;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM product_options o WHERE o.product_id = p_product_id) THEN
    SELECT o.price INTO v_base FROM product_options o
    WHERE o.product_id = p_product_id AND o.label = p_option_label
    ORDER BY o.sort_order LIMIT 1;
  ELSIF p_option_label = '' THEN
    v_base := v_product.original_price;
  END IF;
  IF v_base IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM product_colors c WHERE c.product_id = p_product_id) THEN
    SELECT c.image_url INTO v_image FROM product_colors c
    WHERE c.product_id = p_product_id AND c.name = p_color_name
    ORDER BY c.sort_order LIMIT 1;
    IF NOT FOUND THEN
      RETURN;
    END IF;
  ELSIF p_color_name IS DISTINCT FROM '' THEN
    RETURN;
  END IF;

  unit_price := CASE WHEN v_product.sale_percent > 0
                     THEN round(v_base * (100 - v_product.sale_percent) / 100)
                     ELSE v_base END;
  name := v_product.name;
  slug := v_product.slug;
  image_url := v_image;
  RETURN NEXT;
END;
$$;

-- Reads the lines the API sends, in order:
-- [{ product_id, option_label, color_name, quantity }]
CREATE OR REPLACE FUNCTION cart_input(p_items JSONB)
RETURNS TABLE (product_id UUID, option_label TEXT, color_name TEXT, quantity INTEGER, ord BIGINT)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT (i.value->>'product_id')::UUID,
         COALESCE(i.value->>'option_label', ''),
         COALESCE(i.value->>'color_name', ''),
         COALESCE((i.value->>'quantity')::INTEGER, 1),
         i.ord
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS i(value, ord);
END;
$$;

-- ============================================================
-- 4. get_cart
-- The user's cart as the storefront's CartItem objects, oldest
-- first. Lines that can't be bought any more are left out.
-- ============================================================
CREATE OR REPLACE FUNCTION get_cart(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'id',           c.id,
             'product_id',   c.product_id,
             'name',         l.name,
             'slug',         l.slug,
             'option_label', c.option_label,
             'color_name',   c.color_name,
             'quantity',     c.quantity,
             'price',        l.unit_price,
             'image_url',    COALESCE(l.image_url, '')
           ) ORDER BY c.created_at, c.id), '[]')
    FROM cart_items c
    CROSS JOIN LATERAL cart_line_price(c.product_id, c.option_label, c.color_name) l
    WHERE c.user_id = p_user_id
  );
END;
$$;

-- ============================================================
-- 5. replace_cart
-- Makes the user's cart exactly p_items (the storefront's cart).
-- Repeated lines are merged (quantity capped at 99) and lines that
-- can't be bought are skipped. Lines already in the cart keep
-- their id and place; new ones go after them, in the order given.
-- Returns { items: get_cart(), skipped: <input lines dropped> }.
-- ============================================================
CREATE OR REPLACE FUNCTION replace_cart(p_user_id UUID, p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_lines   JSONB;  -- the lines to keep, merged and priced, in input order
  v_skipped INTEGER;
  v_now     TIMESTAMPTZ := clock_timestamp();
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'product_id',   m.product_id,
           'option_label', m.option_label,
           'color_name',   m.color_name,
           'quantity',     m.quantity,
           'price',        l.unit_price,
           'image_url',    l.image_url,
           'ord',          m.ord
         ) ORDER BY m.ord) FILTER (WHERE l.unit_price IS NOT NULL), '[]'),
         COALESCE(sum(m.input_lines) FILTER (WHERE l.unit_price IS NULL), 0)
  INTO v_lines, v_skipped
  FROM (
    SELECT i.product_id, i.option_label, i.color_name,
           LEAST(sum(i.quantity), 99) AS quantity, min(i.ord) AS ord, count(*) AS input_lines
    FROM cart_input(p_items) i
    GROUP BY i.product_id, i.option_label, i.color_name
  ) m
  LEFT JOIN LATERAL cart_line_price(m.product_id, m.option_label, m.color_name) l ON TRUE;

  DELETE FROM cart_items c
  WHERE c.user_id = p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset(v_lines) AS l(product_id UUID, option_label TEXT, color_name TEXT)
      WHERE (l.product_id, l.option_label, l.color_name) = (c.product_id, c.option_label, c.color_name)
    );

  -- created_at = this moment plus the line's position, so new lines
  -- sort after the ones that stay and in the order given.
  INSERT INTO cart_items AS c (user_id, product_id, option_label, color_name, quantity, price, image_url, created_at)
  SELECT p_user_id, l.product_id, l.option_label, l.color_name, l.quantity, l.price, l.image_url,
         v_now + l.ord * INTERVAL '1 microsecond'
  FROM jsonb_to_recordset(v_lines) AS l(product_id UUID, option_label TEXT, color_name TEXT,
                                        quantity INTEGER, price DECIMAL, image_url TEXT, ord BIGINT)
  ON CONFLICT (user_id, product_id, option_label, color_name) DO UPDATE
  SET quantity = EXCLUDED.quantity, price = EXCLUDED.price, image_url = EXCLUDED.image_url
  WHERE (c.quantity, c.price, c.image_url) IS DISTINCT FROM (EXCLUDED.quantity, EXCLUDED.price, EXCLUDED.image_url);

  RETURN jsonb_build_object('items', get_cart(p_user_id), 'skipped', v_skipped);
END;
$$;

-- ============================================================
-- 6. add_cart_item
-- Adds a line to the user's cart, or adds to the quantity of the
-- same product/option/color (capped at 99). A line that can't be
-- bought raises a message for the shopper (P0001).
-- Returns { item: <the line as get_cart shows it>, created }.
-- ============================================================
CREATE OR REPLACE FUNCTION add_cart_item(
  p_user_id      UUID,
  p_product_id   UUID,
  p_option_label TEXT,
  p_color_name   TEXT,
  p_quantity     INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_line    RECORD;
  v_id      UUID;
  v_created BOOLEAN;
BEGIN
  SELECT * INTO v_line FROM cart_line_price(p_product_id, p_option_label, p_color_name);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This item is no longer available' USING ERRCODE = 'P0001';
  END IF;

  -- Update the line if it's there, else insert it; loop if another
  -- request inserts or deletes the same line in between.
  LOOP
    UPDATE cart_items c
    SET quantity = LEAST(c.quantity + p_quantity, 99), price = v_line.unit_price, image_url = v_line.image_url
    WHERE c.user_id = p_user_id AND c.product_id = p_product_id
      AND c.option_label = p_option_label AND c.color_name = p_color_name
    RETURNING c.id INTO v_id;
    v_created := NOT FOUND;
    EXIT WHEN NOT v_created;

    INSERT INTO cart_items (user_id, product_id, option_label, color_name, quantity, price, image_url)
    VALUES (p_user_id, p_product_id, p_option_label, p_color_name, p_quantity, v_line.unit_price, v_line.image_url)
    ON CONFLICT (user_id, product_id, option_label, color_name) DO NOTHING
    RETURNING id INTO v_id;
    EXIT WHEN FOUND;
  END LOOP;

  RETURN jsonb_build_object(
    'item', (SELECT e.value FROM jsonb_array_elements(get_cart(p_user_id)) AS e WHERE e.value->>'id' = v_id::TEXT),
    'created', v_created
  );
END;
$$;

-- ============================================================
-- 7. create_order
-- Checkout in one transaction: prices p_items (as replace_cart
-- reads them) from the database, applies the coupon, records the
-- order and its items, counts the coupon use and empties the
-- user's cart. No payment is taken; the order starts 'confirmed'.
-- Messages for the shopper are raised as P0001. A subtotal under
-- the coupon's min_purchase raises TXMIN with the minimum in
-- DETAIL, so the API words it (minimumPurchaseMessage).
-- ============================================================
CREATE OR REPLACE FUNCTION create_order(
  p_user_id          UUID,
  p_items            JSONB,
  p_coupon_code      TEXT,
  p_shipping_address TEXT,
  p_payment_method   TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_lines    JSONB;  -- the order items, priced, in input order
  v_invalid  INTEGER;
  v_subtotal DECIMAL;
  v_discount DECIMAL := 0;
  v_code     TEXT := NULLIF(upper(btrim(p_coupon_code)), '');
  v_coupon   coupons%ROWTYPE;  -- all NULL without a coupon
  v_order_id UUID;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
           'product_id',   i.product_id,
           'product_name', l.name,
           'option_label', NULLIF(i.option_label, ''),
           'color_name',   NULLIF(i.color_name, ''),
           'quantity',     i.quantity,
           'price',        l.unit_price,
           'image_url',    l.image_url
         ) ORDER BY i.ord),
         count(*) FILTER (WHERE l.unit_price IS NULL),
         COALESCE(sum(l.unit_price * i.quantity), 0)
  INTO v_lines, v_invalid, v_subtotal
  FROM cart_input(p_items) i
  LEFT JOIN LATERAL cart_line_price(i.product_id, i.option_label, i.color_name) l ON TRUE;

  IF v_lines IS NULL THEN
    RAISE EXCEPTION 'Cart is empty' USING ERRCODE = 'P0001';
  END IF;
  IF v_invalid > 0 THEN
    RAISE EXCEPTION 'Some items are no longer available. Please review your cart.' USING ERRCODE = 'P0001';
  END IF;

  IF v_code IS NOT NULL THEN
    -- FOR UPDATE makes concurrent checkouts with this coupon take
    -- turns, so max_uses can't be exceeded.
    SELECT * INTO v_coupon FROM coupons c WHERE c.code = v_code AND c.is_active FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid coupon code' USING ERRCODE = 'P0001';
    END IF;
    IF v_coupon.expires_at < now()
       OR (v_coupon.max_uses > 0 AND COALESCE(v_coupon.current_uses, 0) >= v_coupon.max_uses) THEN
      RAISE EXCEPTION 'Coupon has expired' USING ERRCODE = 'P0001';
    END IF;
    IF v_coupon.min_purchase > 0 AND v_subtotal < v_coupon.min_purchase THEN
      RAISE EXCEPTION 'Subtotal is below the coupon minimum'
        USING ERRCODE = 'TXMIN', DETAIL = v_coupon.min_purchase::TEXT;
    END IF;

    -- Same rules as couponDiscount in internal/api/coupons.go.
    IF v_coupon.discount_percent > 0 THEN
      v_discount := round(v_subtotal * v_coupon.discount_percent / 100);
      IF v_coupon.max_discount > 0 THEN
        v_discount := LEAST(v_discount, v_coupon.max_discount);
      END IF;
    ELSIF v_coupon.discount_amount > 0 THEN
      v_discount := v_coupon.discount_amount;
    END IF;
    v_discount := LEAST(v_discount, v_subtotal);

    UPDATE coupons SET current_uses = COALESCE(current_uses, 0) + 1 WHERE id = v_coupon.id;
  END IF;

  INSERT INTO orders (user_id, total_amount, discount_amount, coupon_code, shipping_address, payment_method)
  VALUES (p_user_id, v_subtotal - v_discount, v_discount, v_coupon.code,
          btrim(p_shipping_address), COALESCE(p_payment_method, 'credit_card'))
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, product_name, option_label, color_name, quantity, price, image_url)
  SELECT v_order_id, l.product_id, l.product_name, l.option_label, l.color_name, l.quantity, l.price, l.image_url
  FROM jsonb_to_recordset(v_lines) AS l(product_id UUID, product_name TEXT, option_label TEXT, color_name TEXT,
                                        quantity INTEGER, price DECIMAL, image_url TEXT);

  DELETE FROM cart_items WHERE user_id = p_user_id;

  RETURN v_order_id;
END;
$$;

-- Only the API (service role) may call these — never the public anon key.
REVOKE EXECUTE ON FUNCTION cart_line_price(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION cart_line_price(UUID, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION cart_input(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION cart_input(JSONB) TO service_role;
REVOKE EXECUTE ON FUNCTION get_cart(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_cart(UUID) TO service_role;
REVOKE EXECUTE ON FUNCTION replace_cart(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION replace_cart(UUID, JSONB) TO service_role;
REVOKE EXECUTE ON FUNCTION add_cart_item(UUID, UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION add_cart_item(UUID, UUID, TEXT, TEXT, INTEGER) TO service_role;
REVOKE EXECUTE ON FUNCTION create_order(UUID, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_order(UUID, JSONB, TEXT, TEXT, TEXT) TO service_role;

-- ============================================================
-- 8. Sample coupons
-- Keep the seeded coupons usable through 2027, unless an admin
-- has already changed their expiry.
-- ============================================================
UPDATE coupons c
SET expires_at = '2027-12-31 23:59:59+07'
FROM (VALUES
  ('TECHX10',  TIMESTAMPTZ '2026-12-31 23:59:59+07'),
  ('FIRST20',  TIMESTAMPTZ '2026-12-31 23:59:59+07'),
  ('FLASH500', TIMESTAMPTZ '2026-09-30 23:59:59+07')
) AS seed(code, expires_at)
WHERE c.code = seed.code AND c.expires_at = seed.expires_at;

-- ============================================================
-- 9. Emails
-- The API stores and looks up addresses in lower case, so
-- "Ann@Example.com" and "ann@example.com" are one account.
-- Existing addresses are lower-cased unless that would clash with
-- another account. Such addresses keep their case, and the CHECK
-- (NOT VALID) rejects updates to those rows until the duplicate
-- account is removed. Find them with:
--   SELECT id, email FROM users WHERE email <> lower(email);
-- ============================================================
UPDATE users u
SET email = lower(btrim(u.email))
WHERE u.email <> lower(btrim(u.email))
  AND NOT EXISTS (
    SELECT 1 FROM users other
    WHERE other.id <> u.id AND lower(btrim(other.email)) = lower(btrim(u.email))
  );

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_lowercase;
ALTER TABLE users ADD CONSTRAINT users_email_lowercase CHECK (email = lower(email)) NOT VALID;

-- Let PostgREST see the new functions right away.
NOTIFY pgrst, 'reload schema';
