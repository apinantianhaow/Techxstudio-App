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
    if (!compared) {
      toast(t('product.addedToCompare'));
    }
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(product);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link href={`/product/${product.id}`}>
        <div className="group relative glass-card overflow-hidden
          hover:shadow-card-hover transition-all duration-300 cursor-pointer">
          {/* Badge */}
          {product.badge && (
            <div className={`absolute top-0 left-0 z-10 px-3 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider
              ${product.badge === 'HOT' ? 'bg-badge-hot' :
                product.badge === 'NEW' ? 'bg-badge-new' :
                product.badge === 'SALE' ? 'gradient-sale' : 'bg-primary-600'}`}
            >
              {product.badge}
            </div>
          )}

          {/* Sale percent */}
          {product.sale_percent > 0 && (
            <div className="absolute top-0 right-0 z-10 px-3 py-1.5 gradient-sale text-[10px] font-bold text-white">
              -{product.sale_percent}%
            </div>
          )}

          {/* Image */}
          <div className="relative aspect-square bg-surface-50 dark:bg-surface-900 overflow-hidden">
            {firstColor?.image_url ? (
              <img
                src={firstColor.image_url}
                alt={product.name}
                className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-24 h-24 gradient-primary opacity-10" />
              </div>
            )}

            {/* Hover actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5
              transition-colors duration-300 flex items-end justify-center pb-4 gap-2
              opacity-0 group-hover:opacity-100">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleQuickView}
                className="w-10 h-10 bg-white dark:bg-surface-800 shadow-md
                  flex items-center justify-center hover:shadow-lg transition-all"
                aria-label={t('product.quickView')}
              >
                <Eye className="w-4 h-4 text-surface-700 dark:text-surface-200" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleCompare}
                className={`w-10 h-10 shadow-md flex items-center justify-center transition-all
                  ${compared ? 'bg-primary-600 text-white' : 'bg-white dark:bg-surface-800'}`}
                aria-label={t('product.compare')}
              >
                <GitCompareArrows className={`w-4 h-4 ${compared ? '' : 'text-surface-700 dark:text-surface-200'}`} />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-sm md:text-base text-surface-800 dark:text-surface-200 leading-snug line-clamp-2 tracking-tight">
                {product.name}
              </h3>
              <motion.button
                whileTap={{ scale: 0.7 }}
                onClick={handleFavorite}
                className="flex-shrink-0 mt-0.5"
                aria-label={t('nav.wishlist')}
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    liked ? 'fill-red-500 text-red-500' : 'text-surface-300 dark:text-surface-600 hover:text-red-400'
                  }`}
                />
              </motion.button>
            </div>

            <StarRating rating={product.rating} reviews={product.reviews_count} size="xs" />

            {/* Price */}
            <div className="flex items-baseline gap-2 pt-1">
              <span className="font-bold text-lg gradient-text">
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
                    className="w-4 h-4 border border-surface-200 dark:border-surface-600"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
                {product.product_colors.length > 4 && (
                  <span className="text-[10px] text-surface-400 ml-1">
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
