'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useWishlistStore = create(
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
            const data = await res.json();
            const productIds = data.items?.map((item) => item.products?.id).filter(Boolean) || [];
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
