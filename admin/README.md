# TechXStudio Admin

Back-office app for the TechXStudio store. Use it to manage **products**, **coupons** and **orders**.
Setup for the whole project is in the [main README](../README.md).

It has no database access of its own. Every `/api/*` request is proxied to the Go API in [`../backend`](../backend),
which checks on every request that the caller is an admin.

| Area     | Create | Read | Update | Delete |
|----------|:------:|:----:|:------:|:------:|
| Products | ✅ with colors, options and specs | ✅ including hidden ones | ✅ full edit, plus a Visible switch | ✅ permanent |
| Coupons  | ✅ | ✅ including inactive and expired ones | ✅ full edit, plus an On switch | ✅ |
| Orders   | placed by customers at checkout | ✅ every customer's orders | ✅ status | — (cancel instead; orders are financial records) |

## Running it

With the API running (see the [main README](../README.md#getting-started)):

```bash
cp .env.example .env.local   # adjust API_URL / NEXT_PUBLIC_STORE_URL if needed
npm install
npm run dev                  # http://localhost:3001
```

To sign in, your account needs `role = 'admin'`. Sign up in the store, then run in the Supabase SQL Editor:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

## Signing in

- **Password + emailed code.** After the password, a 6-digit code is emailed to the admin, and the session only starts
  once the code is entered. Codes expire after 10 minutes and allow 5 guesses; a new code can be requested after 60 seconds.
  Set `SMTP_*` in `backend/.env` to send real emails. Without it, the code is printed in the Go API's log.
- **Google.** Shown when `GOOGLE_CLIENT_ID` is set in `backend/.env`. It only signs in existing admin accounts
  (matched by Google account or email); it never creates accounts. Add `http://localhost:3001` to the OAuth client's
  Authorized JavaScript origins.

## Things to know

- **Hide vs delete.** Turning off *Visible* removes a product from lists, search and its product page, but keeps all its
  data. *Delete* is permanent: colors, options, specs and reviews go with it, and so do cart and wishlist entries.
  Past orders keep their own copy of the name and price.
- **Saving a product replaces it.** The form always sends the whole product, so colors, options and specs are saved in
  the order shown (`sort_order` 1, 2, 3…).
- **Option prices are before the sale.** The store applies `sale_percent` to the selected option's price (or to the
  base price when there are no options). The form previews what customers will pay.
- **Images.** `image_url` values such as `/images/x.png` are files in the storefront's `public/` folder. The admin
  loads its previews from `NEXT_PUBLIC_STORE_URL`.

## Admin API

All routes except the three login routes need `Authorization: Bearer <token>` from a user with `role = 'admin'`.
Without it they return `401 Unauthorized` (missing or invalid token) or `403 Admin access required`.

| Method | Path | Body / notes |
|--------|------|--------------|
| POST   | `/api/admin/login` | `{ email, password }` → `{ otp_required, challenge_id, email }` and emails a code; 403 for non-admins |
| POST   | `/api/admin/login/verify` | `{ challenge_id, code }` → `{ user, token }` |
| POST   | `/api/admin/login/google` | `{ credential }` (Google ID token) → `{ user, token }` |
| POST   | `/api/auth/login/resend` | `{ challenge_id }` → a new code (60-second cooldown) |
| GET    | `/api/admin/me` | current admin |
| GET    | `/api/admin/products` | all products, including hidden ones |
| POST   | `/api/admin/products` | product with `product_colors`, `product_options`, `product_specs` arrays → 201 |
| GET    | `/api/admin/products/{id}` | one product with specs |
| PUT    | `/api/admin/products/{id}` | same body as POST; replaces everything (409 if the slug is taken) |
| PATCH  | `/api/admin/products/{id}` | `{ is_active }` only |
| DELETE | `/api/admin/products/{id}` | permanent |
| GET    | `/api/admin/coupons` | all coupons |
| POST   | `/api/admin/coupons` | `{ code, discount_percent \| discount_amount, min_purchase, max_discount, max_uses, expires_at, is_active }` |
| PUT    | `/api/admin/coupons/{id}` | same body as POST |
| DELETE | `/api/admin/coupons/{id}` | |
| GET    | `/api/admin/orders` | all orders with items and customer |
| PATCH  | `/api/admin/orders/{id}` | `{ status }`: `confirmed`, `processing`, `shipped`, `delivered` or `cancelled` |

Validation rules live in `backend/internal/api/admin_products.go` and `admin_coupons.go`. Types for the admin
app are in `src/types/index.ts`.
