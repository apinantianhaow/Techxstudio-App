-- ============================================================
-- TechXStudio v2 — Usernames (with change history) & profile photos
-- Apply with `supabase db push` (after 005)
-- ============================================================

-- ============================================================
-- 1. Usernames
-- Shown as typed ("APXNAN") but unique regardless of case, via
-- username_key. Keep the reserved list in sync with
-- reservedUsernames in internal/api/profile.go.
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_key TEXT
  GENERATED ALWAYS AS (lower(username)) STORED;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_key ON users(username_key);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_format;
ALTER TABLE users ADD CONSTRAINT users_username_format
  CHECK (username ~ '^[A-Za-z0-9][A-Za-z0-9_.]{2,29}$');

-- A free username derived from an email: "aphinan.thia@gmail.com" →
-- "aphinan.thia", or "aphinan.thia4821" when that's taken.
CREATE OR REPLACE FUNCTION generate_username(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base TEXT := left(regexp_replace(split_part(p_email, '@', 1), '[^A-Za-z0-9_.]', '', 'g'), 24);
  candidate TEXT;
BEGIN
  base := regexp_replace(base, '^[_.]+', '');
  IF length(base) < 3 THEN
    base := 'user' || base;
  END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM users WHERE username_key = lower(candidate))
     OR lower(candidate) = ANY (ARRAY['admin', 'administrator', 'root', 'support', 'help', 'staff',
                                     'moderator', 'system', 'official', 'techx', 'techxstudio', 'apple'])
  LOOP
    candidate := base || (1000 + floor(random() * 9000))::INT;
  END LOOP;
  RETURN candidate;
END;
$$;

-- New accounts (password or Google sign-up) get a username automatically.
CREATE OR REPLACE FUNCTION set_default_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NULL THEN
    NEW.username := generate_username(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_default_username ON users;
CREATE TRIGGER set_default_username
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION set_default_username();

-- Existing accounts: one row at a time so each sees the names given before it.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, email FROM users WHERE username IS NULL ORDER BY created_at LOOP
    UPDATE users SET username = generate_username(r.email) WHERE id = r.id;
  END LOOP;
END;
$$;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- ============================================================
-- 2. Username history
-- Every rename is recorded by a trigger, so the log can't be
-- skipped: "aphinan.thia" → "APXNAN" stays traceable to the same
-- user. Rows go with the account when it's deleted (PDPA).
-- ============================================================
CREATE TABLE IF NOT EXISTS username_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_username TEXT NOT NULL,
  new_username TEXT NOT NULL,
  old_key TEXT GENERATED ALWAYS AS (lower(old_username)) STORED,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_username_history_user ON username_history(user_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_username_history_old_key ON username_history(old_key, changed_at DESC);

-- No policies: only the API (service role) reads it.
ALTER TABLE username_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION log_username_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO username_history (user_id, old_username, new_username)
  VALUES (NEW.id, OLD.username, NEW.username);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_username_change ON users;
CREATE TRIGGER log_username_change
  AFTER UPDATE OF username ON users
  FOR EACH ROW
  WHEN (OLD.username IS NOT NULL AND OLD.username IS DISTINCT FROM NEW.username)
  EXECUTE FUNCTION log_username_change();

-- ============================================================
-- 3. Profile photos
-- Public bucket (anyone can view a photo by its URL); uploads and
-- deletes only happen through the API with the service role.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
