'use client';

import Link from 'next/link';
import { Heart, Eye, GitCompareArrows } from 'lucide-react';
import { motion } from 'framer-motion';
import StarRating from '@/components/ui/StarRating';
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
  const compared = isInCompare(product.id);

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

  const handleCompare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(product);
    if (!compared) toast(t('product.addedToCompare'));
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(product);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Link href={`/product/${product.id}`}>
        <div className="group relative glass-card overflow-hidden cursor-pointer">
          {/* Badge — top left */}
          {product.badge && (
            <div className={`absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold text-white
              shadow-sm tracking-wide
              ${product.badge === 'HOT' ? 'bg-badge-hot' :
                product.badge === 'NEW' ? 'bg-badge-new' :
                product.badge === 'SALE' ? 'gradient-sale' : 'bg-primary-600'}`}
            >
              {product.badge}
            </div>
          )}

          {/* Sale percent — top right */}
          {product.sale_percent > 0 && (
            <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full gradient-sale text-[10px] font-bold text-white shadow-sm">
              -{product.sale_percent}%
            </div>
          )}

          {/* Image area */}
          <div className="relative aspect-square bg-gradient-to-b from-surface-50/50 to-surface-100/50
            dark:from-surface-800/30 dark:to-surface-900/30 overflow-hidden rounded-t-[var(--radius-lg)]">
            {firstColor?.image_url ? (
              <img
                src={firstColor.image_url}
                alt={product.name}
                className="w-full h-full object-contain p-5 md:p-6
                  group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-20 h-20 rounded-2xl gradient-primary opacity-10" />
              </div>
            )}

            {/* Hover action buttons */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent
              opacity-0 group-hover:opacity-100 transition-opacity duration-300
              flex items-end justify-center pb-4 gap-2">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleQuickView}
                className="w-10 h-10 rounded-full bg-white/90 dark:bg-surface-800/90 backdrop-blur-sm
                  flex items-center justify-center shadow-lg hover:shadow-xl
                  transition-all duration-200 hover:scale-105"
                aria-label={t('product.quickView')}
              >
                <Eye className="w-4 h-4 text-surface-700 dark:text-surface-200" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleCompare}
                className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center shadow-lg
                  transition-all duration-200 hover:scale-105
                  ${compared ? 'gradient-primary text-white' : 'bg-white/90 dark:bg-surface-800/90'}`}
                aria-label={t('product.compare')}
              >
                <GitCompareArrows className={`w-4 h-4 ${compared ? 'text-white' : 'text-surface-700 dark:text-surface-200'}`} />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-[13px] md:text-sm text-surface-800 dark:text-surface-200 leading-snug line-clamp-2 tracking-tight">
                {product.name}
              </h3>
              <motion.button
                whileTap={{ scale: 0.7 }}
                onClick={handleFavorite}
                className="flex-shrink-0 mt-0.5"
                aria-label={t('nav.wishlist')}
              >
                <Heart
                  className={`w-[18px] h-[18px] transition-all duration-300 ${
                    liked
                      ? 'fill-red-500 text-red-500 scale-110'
                      : 'text-surface-300 dark:text-surface-600 hover:text-red-400'
                  }`}
                />
              </motion.button>
            </div>

            <StarRating rating={product.rating} reviews={product.reviews_count} size="xs" />

            {/* Price */}
            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="font-bold text-base md:text-lg gradient-text">
                {formatPrice(salePrice)}
              </span>
              {product.sale_percent > 0 && (
                <span className="text-xs text-surface-400 line-through">
                  {formatPrice(displayPrice)}
                </span>
              )}
            </div>

            {/* Color dots */}
            {product.product_colors?.length > 1 && (
              <div className="flex items-center gap-1.5 pt-1">
                {product.product_colors.slice(0, 4).map((color) => (
                  <div
                    key={color.id}
                    className="w-3.5 h-3.5 rounded-full border-2 border-white dark:border-surface-700
                      shadow-sm transition-transform hover:scale-125"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
                {product.product_colors.length > 4 && (
                  <span className="text-[10px] text-surface-400 ml-0.5">
                    +{product.product_colors.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
