-- ============================================================
-- TechXStudio v2 — Google sign-in & emailed verification codes
-- Run this in Supabase SQL Editor (fifth), before deploying the
-- API version with /api/auth/google and /api/auth/login/verify
-- ============================================================

-- ============================================================
-- 1. Google accounts
-- Users who sign up with Google have no password. google_sub is
-- Google's stable account id ("sub" claim of the ID token).
-- ============================================================
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT UNIQUE;

-- ============================================================
-- 2. Login challenges (two-step sign-in)
-- A correct password creates a challenge and emails a 6-digit
-- code; the token is only issued once the code is verified.
-- code_hash is an HMAC of the code keyed by the API secret —
-- the code itself is never stored.
-- ============================================================
CREATE TABLE IF NOT EXISTS login_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  sends INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_challenges_user ON login_challenges(user_id, created_at);

-- No policies on purpose: only the API (service role) may read codes.
ALTER TABLE login_challenges ENABLE ROW LEVEL SECURITY;

-- Let PostgREST see the new column and table right away.
NOTIFY pgrst, 'reload schema';
