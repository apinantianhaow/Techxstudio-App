'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import useWishlistStore from '@/stores/useWishlistStore';
import { formatPrice, calcDiscountedPrice } from '@/lib/utils';
import { useTranslation } from '@/context/LanguageContext';
import { toast } from 'sonner';

export default function ProductCard({ product, index = 0, onQuickView }) {
  const { isFavorite, toggleFavorite } = useWishlistStore();
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Link href={`/product/${product.id}`}>
        <div className="group cursor-pointer glass-card overflow-hidden">

          {/* Image */}
          <div className="relative bg-white dark:bg-surface-800 overflow-hidden"
            style={{ aspectRatio: '1/1' }}>

            {product.sale_percent > 0 && (
              <span className="absolute top-2 left-2 z-10 px-2 py-0.5
                gradient-sale text-white text-[10px] font-bold">
                -{product.sale_percent}%
              </span>
            )}

            {product.badge && !product.sale_percent && (
              <span className={`absolute top-2 left-2 z-10 px-2 py-0.5
                text-white text-[10px] font-bold
                ${product.badge === 'HOT' ? 'bg-badge-hot' : 'gradient-primary'}`}>
                {product.badge}
              </span>
            )}

            <motion.button
              whileTap={{ scale: 0.7 }}
              onClick={handleFavorite}
              className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Wishlist"
            >
              <Heart className={`w-4 h-4
                ${liked ? 'fill-red-500 text-red-500' : 'text-surface-400'}`}
              />
            </motion.button>

            {firstColor?.image_url ? (
              <img
                src={firstColor.image_url}
                alt={product.name}
                className="w-full h-full object-contain p-6
                  group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 bg-surface-200 dark:bg-surface-700" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 border-t border-surface-100 dark:border-surface-700">
            {product.product_colors?.length > 1 && (
              <div className="flex items-center gap-1.5 mb-2">
                {product.product_colors.slice(0, 5).map((color) => (
                  <div
                    key={color.id}
                    className="w-2.5 h-2.5 border border-surface-300"
                    style={{ backgroundColor: color.hex, borderRadius: '50%' }}
                    title={color.name}
                  />
                ))}
              </div>
            )}

            <h3 className="font-medium text-sm text-surface-800 dark:text-surface-200
              line-clamp-2 leading-snug text-center">
              {product.name}
            </h3>

            <div className="mt-1.5 text-center">
              <span className="font-bold text-sm gradient-text">
                {formatPrice(salePrice)}
              </span>
              {product.sale_percent > 0 && (
                <span className="text-xs text-surface-400 line-through ml-1.5">
                  {formatPrice(displayPrice)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
