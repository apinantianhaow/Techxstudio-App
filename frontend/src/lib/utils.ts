type DateInput = string | number | Date | null | undefined;

/**
 * Format price in Thai Baht (฿)
 */
export function formatPrice(price: number | string | null | undefined): string {
  if (price == null) return '฿0';
  return `฿${Number(price).toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Format date to Thai locale
 */
export function formatDate(date: DateInput): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date: DateInput): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate discounted price
 */
export function calcDiscountedPrice(price: number, salePercent?: number | null): number {
  if (!salePercent) return price;
  return Math.round(price * (1 - salePercent / 100));
}

/**
 * Truncate text with ellipsis
 */
export function truncate<T extends string | null | undefined>(text: T, maxLength = 100): T | string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Generate a simple unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Debounce function
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, delay = 300): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Message of a caught error (catch variables are `unknown` in TS)
 */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '';
}

/**
 * Slugify text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
