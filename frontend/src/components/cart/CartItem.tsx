'use client';

import { Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProductImage, deviceKindFor } from '@/components/product/ProductVisual';
import useCartStore from '@/stores/useCartStore';
import { useTranslation } from '@/context/LanguageContext';
import { formatPrice } from '@/lib/utils';
import type { CartItem as CartItemData } from '@/types';

export default function CartItem({ item, index = 0 }: { item: CartItemData; index?: number }) {
  const { updateQuantity, removeFromCart } = useCartStore();
  const { t } = useTranslation();
  const details = [item.color_name, item.option_label].filter(Boolean).join(' · ');

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      layout
      className="overflow-hidden border-b border-line"
    >
      <div className="flex gap-5 py-6 md:gap-8 md:py-8">
        <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-control bg-canvas-alt p-3 md:h-32 md:w-32 md:p-4">
          <ProductImage src={item.image_url} alt={item.name} kind={deviceKindFor(item)} className="h-full w-full" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-6">
            <div className="min-w-0">
              <h3 className="text-[19px] font-semibold leading-tight text-ink md:text-[21px]">{item.name}</h3>
              {details && <p className="mt-1 text-[14px] text-ink-2">{details}</p>}
            </div>
            <p className="text-[17px] font-semibold text-ink md:text-right">
              {formatPrice(item.price * item.quantity)}
            </p>
          </div>

          <div className="mt-auto flex items-center justify-between pt-4">
            <div className="flex items-center gap-1 rounded-full bg-fill p-1">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                aria-label="−"
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink hover:bg-card disabled:opacity-30"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-7 text-center text-[15px] font-semibold tabular-nums text-ink">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                aria-label="+"
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink hover:bg-card"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <button onClick={() => removeFromCart(item.id)} className="link text-[14px]">
              {t('cart.remove')}
            </button>
          </div>
        </div>
      </div>
    </motion.li>
  );
}
