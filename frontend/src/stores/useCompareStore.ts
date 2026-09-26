'use client';

import { create } from 'zustand';
import type { Product } from '@/types';

const MAX_COMPARE = 3;

interface CompareState {
  items: Product[];
  isOpen: boolean;
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  toggleCompare: (product: Product) => void;
  isInCompare: (productId: string) => boolean;
  clearCompare: () => void;
  togglePanel: () => void;
  closePanel: () => void;
}

const useCompareStore = create<CompareState>()((set, get) => ({
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
