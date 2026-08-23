'use client';

import Link from 'next/link';
import { Heart, Eye, GitCompareArrows } from 'lucide-react';
import { motion } from 'framer-motion';
import StarRating from '@/components/ui/StarRating';
import useWishlistStore from '@/stores/useWishlistStore';
import useCompareStore from '@/stores/useCompareStore';
import { formatPrice, calcDiscountedPrice } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProductCard({ product, index = 0, onQuickView }) {
  const { isFavorite, toggleFavorite } = useWishlistStore();
  const { isInCompare, toggleCompare } = useCompareStore();
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
    toast(liked ? 'ลบออกจาก Wishlist แล้ว' : 'เพิ่มลง Wishlist แล้ว ❤️');
  };

  const handleCompare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(product);
    if (!compared) {
      toast('เพิ่มในรายการเปรียบเทียบ');
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
        <div className="group relative glass-card overflow-hidden hover:shadow-card-hover
          transform hover:-translate-y-1.5 hover:scale-[1.01] transition-all duration-300 cursor-pointer">
          {/* Badge */}
          {product.badge && (
            <div className={`absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold text-white
              ${product.badge === 'HOT' ? 'bg-badge-hot animate-pulse-glow' :
                product.badge === 'NEW' ? 'bg-badge-new' :
                product.badge === 'SALE' ? 'gradient-sale animate-pulse-glow' : 'bg-primary-600'}`}
            >
              {product.badge}
            </div>
          )}

          {/* Sale percent */}
          {product.sale_percent > 0 && (
            <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-full gradient-sale text-[10px] font-bold text-white">
              -{product.sale_percent}%
            </div>
          )}

          {/* Image */}
          <div className="relative aspect-square bg-gradient-to-br from-surface-50 to-surface-100
            dark:from-surface-800 dark:to-surface-900 overflow-hidden">
            {firstColor?.image_url ? (
              <img
                src={firstColor.image_url}
                alt={product.name}
                className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-24 h-24 rounded-2xl gradient-primary opacity-10" />
              </div>
            )}

            {/* Hover actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5
              transition-colors duration-300 flex items-end justify-center pb-3 gap-2
              opacity-0 group-hover:opacity-100">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleQuickView}
                className="w-9 h-9 rounded-full bg-white/90 dark:bg-surface-800/90 backdrop-blur-sm
                  flex items-center justify-center shadow-md hover:shadow-lg transition-all"
                aria-label="ดูด่วน"
              >
                <Eye className="w-4 h-4 text-surface-700 dark:text-surface-200" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleCompare}
                className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center shadow-md transition-all
                  ${compared ? 'bg-primary-600 text-white' : 'bg-white/90 dark:bg-surface-800/90'}`}
                aria-label="เปรียบเทียบ"
              >
                <GitCompareArrows className={`w-4 h-4 ${compared ? '' : 'text-surface-700 dark:text-surface-200'}`} />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm text-surface-800 dark:text-surface-200 leading-tight line-clamp-2">
                {product.name}
              </h3>
              <motion.button
                whileTap={{ scale: 0.7 }}
                onClick={handleFavorite}
                className="flex-shrink-0 mt-0.5"
                aria-label="ถูกใจ"
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
            <div className="flex items-center gap-2">
              <span className="font-bold text-base gradient-text">
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
              <div className="flex items-center gap-1 pt-1">
                {product.product_colors.slice(0, 4).map((color) => (
                  <div
                    key={color.id}
                    className="w-3.5 h-3.5 rounded-full border border-surface-200 dark:border-surface-600"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
                {product.product_colors.length > 4 && (
                  <span className="text-[10px] text-surface-400">
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
