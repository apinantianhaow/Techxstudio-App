'use client';

import { useState } from 'react';
import { X, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StarRating from '@/components/ui/StarRating';
import ProductVisual from '@/components/product/ProductVisual';
import useCartStore from '@/stores/useCartStore';
import useWishlistStore from '@/stores/useWishlistStore';
import { formatPrice, calcDiscountedPrice } from '@/lib/utils';
import { useTranslation } from '@/context/LanguageContext';
import { toast } from 'sonner';
import { toastIcons } from '@/components/ui/toastIcons';
import type { Product } from '@/types';

interface ProductQuickViewProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductQuickView({ product, isOpen, onClose }: ProductQuickViewProps) {
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedOption, setSelectedOption] = useState(0);
  const addToCart = useCartStore((s) => s.addToCart);
  const { isFavorite, toggleFavorite } = useWishlistStore();
  const { t } = useTranslation();

  if (!product) return null;

  const colors = product.product_colors || [];
  const options = product.product_options || [];
  const currentColor = colors[selectedColor];
  const currentOption = options[selectedOption];
  const price = currentOption?.price || product.original_price;
  const salePrice = calcDiscountedPrice(price, product.sale_percent);
  const liked = isFavorite(product.id);

  const handleAddToCart = () => {
    addToCart({
      product_id: product.id,
      name: product.name,
      option_label: currentOption?.label || '',
      color_name: currentColor?.name || '',
      price: salePrice,
      image_url: currentColor?.image_url || '',
      slug: product.slug,
    });
    toast.success(t('product.addedToCart'), { icon: toastIcons.cart });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[var(--z-overlay)] bg-black/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.3, ease: [0.28, 0.11, 0.32, 1] }}
            className="sheet fixed inset-4 z-[var(--z-modal)] overflow-y-auto rounded-[22px]
              md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[85vh] md:w-[520px] md:-translate-x-1/2 md:-translate-y-1/2"
          >
            <button onClick={onClose} className="icon-btn absolute right-4 top-4 z-10" aria-label={t('common.close')}>
              <X className="h-4 w-4" />
            </button>

            <div className="aspect-square bg-canvas-alt p-12">
              <ProductVisual product={product} color={currentColor} className="h-full w-full" />
            </div>

            <div className="space-y-5 p-6">
              <div>
                <h3 className="t-title text-ink">{product.name}</h3>
                <div className="mt-2">
                  <StarRating rating={product.rating} reviews={product.reviews_count} size="sm" />
                </div>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-[21px] font-semibold text-ink">{formatPrice(salePrice)}</span>
                {product.sale_percent > 0 && (
                  <span className="text-[15px] text-ink-3 line-through">{formatPrice(price)}</span>
                )}
              </div>

              {colors.length > 1 && (
                <div>
                  <p className="mb-2 text-[14px] text-ink-2">{t('product.color')}: {currentColor?.name}</p>
                  <div className="flex gap-3">
                    {colors.map((c, i) => (
                      <button key={c.id} onClick={() => setSelectedColor(i)} title={c.name}
                        aria-label={c.name} aria-pressed={i === selectedColor}
                        className={`h-8 w-8 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] ring-offset-2 ring-offset-card transition
                          ${i === selectedColor ? 'ring-2 ring-accent' : ''}`}
                        style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                </div>
              )}

              {options.length > 1 && (
                <div>
                  <p className="mb-2 text-[14px] text-ink-2">{t('product.options')}</p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt, i) => (
                      <button key={opt.id} onClick={() => setSelectedOption(i)}
                        aria-pressed={i === selectedOption} className="choice px-4 py-2 text-[14px]">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={handleAddToCart} className="btn btn-primary btn-block flex-1">
                  {t('common.addToCart')}
                </button>
                <button
                  onClick={() => {
                    toggleFavorite(product.id);
                    toast(liked ? t('product.removedFromWishlist') : t('product.addedToWishlist'), { icon: liked ? undefined : toastIcons.wishlist });
                  }}
                  aria-label={t('nav.wishlist')}
                  aria-pressed={liked}
                  className="flex w-[52px] flex-shrink-0 items-center justify-center rounded-control bg-fill transition-colors hover:bg-fill-strong"
                >
                  <Heart className={`h-5 w-5 ${liked ? 'fill-danger text-danger' : 'text-ink-2'}`} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
