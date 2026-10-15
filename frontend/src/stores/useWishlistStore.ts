'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthFetch, Product } from '@/types';

interface WishlistState {
  favorites: string[];
  /** The signed-in user these favorites belong to; null for a guest's. */
  owner: string | null;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  clearFavorites: () => void;
  /** Links the wishlist to the user's account: loads it, adding a guest's favorites. */
  attachUser: (userId: string, authFetch: AuthFetch) => Promise<void>;
  /** Stops saving to the account; with clear, also empties the list (sign-out). */
  detachUser: (options: { clear: boolean }) => void;
}

interface WishlistResponse {
  items?: { id: string; created_at: string; products: Product | null }[];
}

// Sync bookkeeping, outside the store because the page doesn't render it.
let remote: { userId: string; fetch: AuthFetch } | null = null;
let attaching: { userId: string; promise: Promise<void> } | null = null;
let epoch = 0; // bumped on attach/detach so late answers for an old session are dropped
let revision = 0; // bumped on every local change

async function fetchFavorites(authFetch: AuthFetch): Promise<string[]> {
  const res = await authFetch('/api/wishlist');
  if (!res.ok) throw new Error(`GET /api/wishlist: ${res.status}`);
  const data: WishlistResponse = await res.json();
  return data.items?.map((item) => item.products?.id).filter((id): id is string => Boolean(id)) ?? [];
}

/** Saves one like/unlike to the account; true when the account has it. */
async function send(authFetch: AuthFetch, productId: string, liked: boolean): Promise<boolean> {
  try {
    const res = liked
      ? await authFetch('/api/wishlist', { method: 'POST', body: JSON.stringify({ product_id: productId }) })
      : await authFetch(`/api/wishlist?product_id=${encodeURIComponent(productId)}`, { method: 'DELETE' });
    return res.ok || (liked && res.status === 409); // 409: it was already there
  } catch {
    return false;
  }
}

/** Saves a local change; if the account refuses it, shows the account's list again. */
async function save(productId: string, liked: boolean) {
  const target = remote;
  if (!target || (await send(target.fetch, productId, liked))) return;
  console.error('Wishlist sync error:', productId);
  try {
    const favorites = await fetchFavorites(target.fetch);
    if (remote === target) useWishlistStore.setState({ favorites });
  } catch (err) {
    console.error('Wishlist sync error:', err);
  }
}

function changed(productId: string, liked: boolean) {
  revision++;
  if (remote) void save(productId, liked);
}

/**
 * Resolves once the wishlist has been read back from localStorage, or at once
 * when there is no storage (zustand then leaves out the persist API).
 */
function hydrated(): Promise<void> {
  const { persist: storage } = useWishlistStore;
  if (!storage || storage.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = storage.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      favorites: [],
      owner: null,

      isFavorite: (productId) => {
        return get().favorites.includes(productId);
      },

      toggleFavorite: (productId) => {
        const liked = !get().favorites.includes(productId);
        set((state) => ({
          favorites: liked ? [...state.favorites, productId] : state.favorites.filter((id) => id !== productId),
        }));
        changed(productId, liked);
      },

      addFavorite: (productId) => {
        if (get().favorites.includes(productId)) return;
        set((state) => ({ favorites: [...state.favorites, productId] }));
        changed(productId, true);
      },

      removeFavorite: (productId) => {
        if (!get().favorites.includes(productId)) return;
        set((state) => ({ favorites: state.favorites.filter((id) => id !== productId) }));
        changed(productId, false);
      },

      clearFavorites: () => {
        const removed = get().favorites;
        set({ favorites: [] });
        removed.forEach((id) => changed(id, false));
      },

      attachUser: (userId, authFetch) => {
        if (attaching?.userId === userId) return attaching.promise; // e.g. React StrictMode's second effect run
        if (remote?.userId === userId) {
          remote = { userId, fetch: authFetch }; // a new token for the same account
          return Promise.resolve();
        }

        const session = ++epoch;
        remote = null;
        const job = { userId, promise: Promise.resolve() };
        job.promise = (async () => {
          await hydrated();
          const owner = get().owner ?? null;
          const before = get().favorites;
          const startRevision = revision;
          try {
            const server = await fetchFavorites(authFetch);
            if (session !== epoch) return;

            // The account's list wins over this device's copy of it; a guest's
            // favorites and changes made while loading are added. Another
            // user's list is dropped.
            const mine = owner === null || owner === userId;
            const now = mine && revision !== startRevision ? get().favorites : before;
            const wanted = new Set(server);
            if (owner === null) before.forEach((id) => wanted.add(id));
            if (mine) {
              now.filter((id) => !before.includes(id)).forEach((id) => wanted.add(id));
              before.filter((id) => !now.includes(id)).forEach((id) => wanted.delete(id));
            }

            const toAdd = [...wanted].filter((id) => !server.includes(id));
            const toRemove = server.filter((id) => !wanted.has(id));
            const added = await Promise.all(toAdd.map((id) => send(authFetch, id, true)));
            await Promise.all(toRemove.map((id) => send(authFetch, id, false)));
            if (session !== epoch) return;

            set({
              favorites: [...server.filter((id) => wanted.has(id)), ...toAdd.filter((_, i) => added[i])],
              owner: userId,
            });
            remote = { userId, fetch: authFetch };
          } catch (err) {
            // Keep what's on this device; the next sign-in or page load tries again.
            console.error('Wishlist sync error:', err);
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
        if (clear) set({ favorites: [], owner: null });
      },
    }),
    {
      name: 'techx-wishlist',
      partialize: (state) => ({ favorites: state.favorites, owner: state.owner }),
    }
  )
);

export const useFavorites = () => useWishlistStore((s) => s.favorites);
export const useFavoritesCount = () => useWishlistStore((s) => s.favorites.length);

export default useWishlistStore;
