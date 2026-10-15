'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { generateId } from '@/lib/utils';
import { translate } from '@/context/LanguageContext';
import type { AuthFetch, CartItem, CartLineInput } from '@/types';

export type AddToCartInput = Pick<CartItem, 'product_id' | 'name' | 'price'> &
  Partial<Pick<CartItem, 'id' | 'option_label' | 'color_name' | 'quantity' | 'image_url' | 'slug'>>;

/** The most of one product/option/color a cart line can hold (the API's limit). */
export const MAX_LINE_QUANTITY = 99;

/** How long after the last change the cart is saved to the account. */
const SYNC_DELAY_MS = 400;

interface CartState {
  items: CartItem[];
  /** The signed-in user this cart belongs to; null for a guest's cart. */
  owner: string | null;
  addToCart: (product: AddToCartInput) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  /** Links the cart to the user's account: loads it, merging in a guest cart. */
  attachUser: (userId: string, authFetch: AuthFetch) => Promise<void>;
  /** Stops saving to the account; with clear, also empties the cart (sign-out). */
  detachUser: (options: { clear: boolean }) => void;
  /** Saves a change that is still waiting; resolves once the account has it. */
  flush: () => Promise<void>;
  /** Saves the cart now and shows what the shop still sells. */
  refresh: () => Promise<void>;
}

// Sync bookkeeping. It isn't state the page renders, so it lives outside the store.
let remote: { userId: string; fetch: AuthFetch } | null = null;
let attaching: { userId: string; promise: Promise<void> } | null = null;
let epoch = 0; // bumped on attach/detach so late answers for an old session are dropped
let revision = 0; // bumped on every local change
let timer: ReturnType<typeof setTimeout> | null = null;
let saving: Promise<void> | null = null;

type LineKey = Pick<CartLineInput, 'product_id' | 'option_label' | 'color_name'>;
const sameLine = (a: LineKey, b: LineKey) =>
  a.product_id === b.product_id && a.option_label === b.option_label && a.color_name === b.color_name;
const toInput = ({ product_id, option_label, color_name, quantity }: CartLineInput): CartLineInput =>
  ({ product_id, option_label, color_name, quantity });
const clampQuantity = (quantity: number) => Math.min(Math.max(Math.floor(quantity), 1), MAX_LINE_QUANTITY);

async function fetchCart(authFetch: AuthFetch): Promise<CartItem[]> {
  const res = await authFetch('/api/cart');
  if (!res.ok) throw new Error(`GET /api/cart: ${res.status}`);
  const data: { items?: CartItem[] } = await res.json();
  return data.items ?? [];
}

async function putCart(authFetch: AuthFetch, lines: CartLineInput[]): Promise<CartItem[]> {
  const res = await authFetch('/api/cart', { method: 'PUT', body: JSON.stringify({ items: lines.map(toInput) }) });
  if (!res.ok) throw new Error(`PUT /api/cart: ${res.status}`);
  const data: { items?: CartItem[]; skipped?: number } = await res.json();
  if (data.skipped) toast(translate('cart.unavailableRemoved'));
  return data.items ?? [];
}

/**
 * Applies the quantity changes made between `before` and `now` to `lines`, so
 * that a change made while the cart was loading or saving isn't lost.
 */
function replayChanges<T extends CartLineInput>(lines: T[], before: T[], now: T[]): T[] {
  const result = lines.map((line) => ({ ...line }));
  const done: LineKey[] = [];
  for (const line of [...before, ...now]) {
    if (done.some((key) => sameLine(key, line))) continue;
    done.push(line);
    const was = before.find((l) => sameLine(l, line))?.quantity ?? 0;
    const current = now.find((l) => sameLine(l, line));
    const is = current?.quantity ?? 0;
    if (was === is) continue;
    const index = result.findIndex((l) => sameLine(l, line));
    if (!current) {
      if (index >= 0) result.splice(index, 1);
    } else if (index >= 0) {
      result[index].quantity = clampQuantity(result[index].quantity + is - was);
    } else {
      result.push({ ...current });
    }
  }
  return result;
}

/** Saves the current cart to the account, one request at a time. */
function save(): Promise<void> {
  const run = async () => {
    const target = remote;
    if (!target) return;
    const sentRevision = revision;
    try {
      const items = await putCart(target.fetch, useCartStore.getState().items.map(toInput));
      // Keep newer local changes: another save is already on its way for them.
      if (remote === target && revision === sentRevision) useCartStore.setState({ items });
    } catch (err) {
      console.error('Cart sync error:', err);
    }
  };
  const next = (saving ?? Promise.resolve()).then(run);
  saving = next;
  void next.finally(() => {
    if (saving === next) saving = null;
  });
  return next;
}

/** Records a local change and saves it to the account shortly. */
function changed() {
  revision++;
  if (!remote) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void save();
  }, SYNC_DELAY_MS);
}

function cancelPendingSave() {
  if (timer) clearTimeout(timer);
  timer = null;
}

/**
 * Resolves once the cart has been read back from localStorage, or at once
 * when there is no storage (zustand then leaves out the persist API).
 */
function hydrated(): Promise<void> {
  const { persist: storage } = useCartStore;
  if (!storage || storage.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = storage.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      owner: null,

      addToCart: (product) => {
        const quantity = clampQuantity(product.quantity || 1);
        set((state) => {
          const existing = state.items.find((item) =>
            sameLine(item, { product_id: product.product_id, option_label: product.option_label || '', color_name: product.color_name || '' })
          );
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === existing.id ? { ...item, quantity: clampQuantity(item.quantity + quantity) } : item
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                id: product.id || generateId(),
                product_id: product.product_id,
                name: product.name,
                option_label: product.option_label || '',
                color_name: product.color_name || '',
                quantity,
                price: product.price,
                image_url: product.image_url || '',
                slug: product.slug || '',
              },
            ],
          };
        });
        changed();
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, quantity: clampQuantity(quantity) } : item)),
        }));
        changed();
      },

      removeFromCart: (id) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
        changed();
      },

      clearCart: () => {
        set({ items: [] });
        changed();
      },

      attachUser: (userId, authFetch) => {
        if (attaching?.userId === userId) return attaching.promise; // e.g. React StrictMode's second effect run
        if (remote?.userId === userId) {
          remote = { userId, fetch: authFetch }; // a new token for the same account
          return Promise.resolve();
        }

        const session = ++epoch;
        remote = null;
        cancelPendingSave();
        const job = { userId, promise: Promise.resolve() };
        job.promise = (async () => {
          await hydrated();
          const owner = get().owner ?? null;
          const before = get().items;
          const startRevision = revision;
          try {
            const server = await fetchCart(authFetch);
            if (session !== epoch) return;

            // The account's cart wins over this device's copy of it, and a guest
            // cart is added to it; another user's cart is dropped. Changes made
            // while this runs are applied on top.
            let items = server;
            let unsaved = false;
            if (owner === null && before.length > 0) {
              items = replayChanges(items, [], before);
              unsaved = true;
            }
            if ((owner === null || owner === userId) && revision !== startRevision) {
              items = replayChanges(items, before, get().items);
              unsaved = true;
            }
            if (unsaved) {
              const sent = get().items;
              const sentRevision = revision;
              items = await putCart(authFetch, items);
              if (session !== epoch) return;
              unsaved = revision !== sentRevision;
              if (unsaved) items = replayChanges(items, sent, get().items);
            }

            set({ items, owner: userId });
            remote = { userId, fetch: authFetch };
            if (unsaved) changed();
          } catch (err) {
            // Keep what's on this device; the next sign-in or page load tries again.
            console.error('Cart sync error:', err);
          } finally {
            if (attaching === job) attaching = null;
          }
        })();
        attaching = job;
        return job.promise;
      },

      detachUser: ({ clear }) => {
        epoch++;
        remote = null;
        attaching = null;
        cancelPendingSave();
        if (clear) set({ items: [], owner: null });
      },

      flush: async () => {
        if (timer) {
          cancelPendingSave();
          await save();
        } else if (saving) {
          await saving;
        }
      },

      refresh: async () => {
        cancelPendingSave();
        await save();
      },
    }),
    {
      name: 'techx-cart',
      partialize: (state) => ({ items: state.items, owner: state.owner }),
    }
  )
);

// Selector helpers
export const useCartItems = () => useCartStore((s) => s.items);
export const useCartTotalItems = () => useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));
export const useCartTotalPrice = () => useCartStore((s) => s.items.reduce((sum, item) => sum + item.price * item.quantity, 0));

export default useCartStore;
