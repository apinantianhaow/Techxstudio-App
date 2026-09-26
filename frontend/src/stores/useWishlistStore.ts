'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthFetch, Product } from '@/types';

interface WishlistState {
  favorites: string[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  clearFavorites: () => void;
  syncWithServer: (authFetch: AuthFetch) => Promise<void>;
}

interface WishlistResponse {
  items?: { id: string; created_at: string; products: Product | null }[];
}

const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      favorites: [],

      isFavorite: (productId) => {
        return get().favorites.includes(productId);
      },

      toggleFavorite: (productId) => {
        set((state) => {
          if (state.favorites.includes(productId)) {
            return { favorites: state.favorites.filter((id) => id !== productId) };
          }
          return { favorites: [...state.favorites, productId] };
        });
      },

      addFavorite: (productId) => {
        set((state) => {
          if (state.favorites.includes(productId)) return state;
          return { favorites: [...state.favorites, productId] };
        });
      },

      removeFavorite: (productId) => {
        set((state) => ({
          favorites: state.favorites.filter((id) => id !== productId),
        }));
      },

      clearFavorites: () => set({ favorites: [] }),

      // Sync with server
      syncWithServer: async (authFetch) => {
        try {
          const res = await authFetch('/api/wishlist');
          if (res.ok) {
            const data: WishlistResponse = await res.json();
            const productIds =
              data.items?.map((item) => item.products?.id).filter((id): id is string => Boolean(id)) || [];
            set({ favorites: productIds });
          }
        } catch (err) {
          console.error('Wishlist sync error:', err);
        }
      },
    }),
    {
      name: 'techx-wishlist',
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
);

export const useFavorites = () => useWishlistStore((s) => s.favorites);
export const useFavoritesCount = () => useWishlistStore((s) => s.favorites.length);

export default useWishlistStore;
