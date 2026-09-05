'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import useWishlistStore from '@/stores/useWishlistStore';
import useCompareStore from '@/stores/useCompareStore';
import { formatPrice, calcDiscountedPrice } from '@/lib/utils';
import { useTranslation } from '@/context/LanguageContext';
import { toast } from 'sonner';

export default function ProductCard({ product, index = 0, onQuickView }) {
  const { isFavorite, toggleFavorite } = useWishlistStore();
  const { isInCompare, toggleCompare } = useCompareStore();
  const { t } = useTranslation();
  const liked = isFavorite(product.id);

  const firstColor = product.product_colors?.[0];
  const firstOption = product.product_options?.[0];
  const displayPrice = firstOption?.price || product.original_price;
  const salePrice = calcDiscountedPrice(displayPrice, product.sale_percent);

  const handleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
    toast(liked ? t('product.removedFromWishlist') : t('product.addedToWishlist'));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Link href={`/product/${product.id}`}>
        <div className="group relative glass-card cursor-pointer overflow-hidden h-full">

          {/* Badge — top left */}
          {product.sale_percent > 0 && (
            <div className="absolute top-0 left-0 z-10 px-2.5 py-1 gradient-sale
              text-[10px] font-bold text-white uppercase tracking-wider">
              -{product.sale_percent}%
            </div>
          )}

          {product.badge && !product.sale_percent && (
            <div className={`absolute top-0 left-0 z-10 px-2.5 py-1
              text-[10px] font-bold text-white uppercase tracking-wider
              ${product.badge === 'HOT' ? 'bg-badge-hot' : product.badge === 'NEW' ? 'bg-badge-new' : 'gradient-primary'}`}>
              {product.badge}
            </div>
          )}

          {/* Wishlist — top right */}
          <motion.button
            whileTap={{ scale: 0.7 }}
            onClick={handleFavorite}
            className="absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center
              bg-white/80 dark:bg-surface-800/80 hover:bg-white dark:hover:bg-surface-700
              transition-colors"
            aria-label={t('nav.wishlist')}
          >
            <Heart className={`w-4 h-4 transition-all duration-200
              ${liked ? 'fill-red-500 text-red-500' : 'text-surface-400 hover:text-red-400'}`}
            />
          </motion.button>

          {/* Product image */}
          <div className="relative bg-surface-50 dark:bg-surface-800 overflow-hidden"
            style={{ aspectRatio: '1/1' }}>
            {firstColor?.image_url ? (
              <img
                src={firstColor.image_url}
                alt={product.name}
                className="w-full h-full object-contain p-6
                  group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-14 h-14 bg-surface-200 dark:bg-surface-700" />
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="p-4 border-t border-surface-100 dark:border-surface-700">
            <h3 className="font-medium text-sm text-surface-800 dark:text-surface-200
              line-clamp-2 leading-snug mb-2">
              {product.name}
            </h3>

            {/* Price — left aligned, consistent */}
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-base text-primary-600 dark:text-primary-400">
                {formatPrice(salePrice)}
              </span>
              {product.sale_percent > 0 && (
                <span className="text-xs text-surface-400 line-through">
                  {formatPrice(displayPrice)}
                </span>
              )}
            </div>

            {/* Color options */}
            {product.product_colors?.length > 1 && (
              <div className="flex items-center gap-1.5 mt-2.5">
                {product.product_colors.slice(0, 5).map((color) => (
                  <div
                    key={color.id}
                    className="w-3 h-3 border border-surface-200 dark:border-surface-600"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
                {product.product_colors.length > 5 && (
                  <span className="text-[10px] text-surface-400 ml-0.5">+{product.product_colors.length - 5}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
