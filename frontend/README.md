# TechXStudio Storefront

The customer-facing store (Next.js, port 3000). Setup for the whole project is in the [main README](../README.md).

```bash
npm install
npm run dev          # http://localhost:3000 (the Go API must be running on :8080)
npm run typecheck
```

- Every `/api/*` request is proxied to the Go API ([`../backend`](../backend)); set `API_URL` if it isn't on `http://localhost:8080`.
- Pages live in `src/app/`, components by area in `src/components/`, and Thai/English strings in `src/lib/i18n/translations.ts`.
- Colors, type and components come from the design tokens in `src/app/globals.css`; the admin panel reuses the same tokens.
