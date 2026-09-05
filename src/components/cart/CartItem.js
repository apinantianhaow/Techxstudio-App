'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import useCartStore from '@/stores/useCartStore';
import { formatPrice } from '@/lib/utils';

export default function CartItem({ item, index = 0 }) {
  const { updateQuantity, removeFromCart } = useCartStore();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      layout
      className="glass-card p-3 "
    >
      <div className="flex gap-3">
        {/* Image */}
        <div className="w-20 h-20  bg-surface-100 dark:bg-surface-800 flex-shrink-0 overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-1" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-10 h-10  gradient-primary opacity-10" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-surface-800 dark:text-surface-200 truncate">
            {item.name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            {item.color_name && (
              <span className="text-[10px] px-2 py-0.5  bg-surface-100 dark:bg-surface-700 text-surface-500">
                {item.color_name}
              </span>
            )}
            {item.option_label && (
              <span className="text-[10px] px-2 py-0.5  bg-surface-100 dark:bg-surface-700 text-surface-500">
                {item.option_label}
              </span>
            )}
          </div>

          {/* Price + Actions */}
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-sm gradient-text">
              {formatPrice(item.price * item.quantity)}
            </span>

            <div className="flex items-center gap-1.5">
              {/* Quantity controls */}
              <div className="flex items-center gap-0 bg-surface-100 dark:bg-surface-800  overflow-hidden">
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="w-7 h-7 flex items-center justify-center text-surface-500
                    hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-30 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </motion.button>
                <span className="w-7 text-center text-xs font-bold text-surface-700 dark:text-surface-300">
                  {item.quantity}
                </span>
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-7 h-7 flex items-center justify-center text-surface-500
                    hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </motion.button>
              </div>

              {/* Delete */}
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={() => removeFromCart(item.id)}
                className="w-7 h-7 flex items-center justify-center 
                  bg-error/10 text-error hover:bg-error/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
