type DateInput = string | number | Date | null | undefined;

/** Storefront origin, for "View in store" links and image previews. */
export const STORE_URL = (process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** Format price in Thai Baht (฿). Unlike the storefront, satang are shown when present. */
export function formatPrice(price: number | null | undefined): string {
  if (price == null) return '฿0';
  const digits = Number.isInteger(Number(price)) ? 0 : 2;
  return `฿${Number(price).toLocaleString('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** "1 color", "3 colors" */
export function plural(count: number, word: string): string {
  return `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`;
}

export function formatDateTime(date: DateInput): string {
  if (!date) return '';
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(date: DateInput): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Same rounding the storefront uses for the price after sale_percent. */
export function calcDiscountedPrice(price: number, salePercent?: number | null): number {
  if (!salePercent) return price;
  return Math.round(price * (1 - salePercent / 100));
}

/** "iPhone 17 Pro" → "iphone-17-pro" (matches the API's slug rule). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Image paths like /images/x.png live in the storefront's public/ folder. */
export function storeAsset(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? STORE_URL + url : url;
}

/** Form text → number for the API; blank becomes null so the API can report it. */
export function toNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : Number(trimmed);
}

/** Message of a caught error (catch variables are `unknown` in TS). */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

let keySeq = 0;
/** Stable React key for rows that don't have an id yet. */
export function newKey(): string {
  keySeq += 1;
  return `row-${keySeq}`;
}
