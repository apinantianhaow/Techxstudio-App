'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '@/lib/utils';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      // Computed
      get totalItems() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      get totalPrice() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      // Actions
      addToCart: (product) => {
        set((state) => {
          const existing = state.items.find(
            (item) =>
              item.product_id === product.product_id &&
              item.option_label === product.option_label &&
              item.color_name === product.color_name
          );

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === existing.id
                  ? { ...item, quantity: item.quantity + (product.quantity || 1) }
                  : item
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
                quantity: product.quantity || 1,
                price: product.price,
                image_url: product.image_url || '',
                slug: product.slug || '',
              },
            ],
          };
        });
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }));
      },

      removeFromCart: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      clearCart: () => set({ items: [] }),

      // Sync with server
      syncWithServer: async (authFetch) => {
        try {
          set({ isLoading: true });
          const res = await authFetch('/api/cart');
          if (res.ok) {
            const data = await res.json();
            set({ items: data.items || [] });
          }
        } catch (err) {
          console.error('Cart sync error:', err);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'techx-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// Selector helpers
export const useCartItems = () => useCartStore((s) => s.items);
export const useCartTotalItems = () => useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));
export const useCartTotalPrice = () => useCartStore((s) => s.items.reduce((sum, item) => sum + item.price * item.quantity, 0));

export default useCartStore;
