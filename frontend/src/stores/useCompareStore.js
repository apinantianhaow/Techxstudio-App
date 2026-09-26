'use client';

import { create } from 'zustand';

const MAX_COMPARE = 3;

const useCompareStore = create((set, get) => ({
  items: [],
  isOpen: false,

  addToCompare: (product) => {
    set((state) => {
      if (state.items.length >= MAX_COMPARE) return state;
      if (state.items.find((p) => p.id === product.id)) return state;
      return { items: [...state.items, product], isOpen: true };
    });
  },

  removeFromCompare: (productId) => {
    set((state) => {
      const newItems = state.items.filter((p) => p.id !== productId);
      return { items: newItems, isOpen: newItems.length > 0 };
    });
  },

  toggleCompare: (product) => {
    const exists = get().items.find((p) => p.id === product.id);
    if (exists) {
      get().removeFromCompare(product.id);
    } else {
      get().addToCompare(product);
    }
  },

  isInCompare: (productId) => {
    return get().items.some((p) => p.id === productId);
  },

  clearCompare: () => set({ items: [], isOpen: false }),

  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),

  closePanel: () => set({ isOpen: false }),
}));

export default useCompareStore;
