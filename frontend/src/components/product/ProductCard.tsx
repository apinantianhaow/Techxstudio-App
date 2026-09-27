'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import ProductVisual from '@/components/product/ProductVisual';
import useWishlistStore from '@/stores/useWishlistStore';
import { formatPrice, calcDiscountedPrice } from '@/lib/utils';
import { useTranslation } from '@/context/LanguageContext';
import { toast } from 'sonner';
import { toastIcons } from '@/components/ui/toastIcons';
import type { MouseEvent } from 'react';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  index?: number;
  onQuickView?: (product: Product) => void;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { isFavorite, toggleFavorite } = useWishlistStore();
  const { t } = useTranslation();
  const liked = isFavorite(product.id);

  const colors = product.product_colors ?? [];
  const firstOption = product.product_options?.[0];
  const displayPrice = firstOption?.price || product.original_price;
  const salePrice = calcDiscountedPrice(displayPrice, product.sale_percent);

  const eyebrow = product.sale_percent > 0
    ? `${t('product.save')} ${product.sale_percent}%`
    : product.badge ? t(`product.badges.${product.badge}`, product.badge) : null;

  const handleFavorite = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
    toast(liked ? t('product.removedFromWishlist') : t('product.addedToWishlist'), { icon: liked ? undefined : toastIcons.wishlist });
  };

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.28, 0.11, 0.32, 1] }}
    >
      <Link href={`/product/${product.id}`}
        className="group card card-hover flex h-full flex-col p-5 md:p-6">

        {/* Image */}
        <div className="relative aspect-square">
          {/* Absolute so tall art can't stretch the square */}
          <ProductVisual product={product}
            className="absolute inset-0 h-full w-full p-5 transition-transform duration-500 ease-apple group-hover:scale-[1.04]" />

          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleFavorite}
            className={`absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full
              transition-opacity hover:bg-fill
              ${liked ? 'opacity-100' : 'md:opacity-0 md:group-hover:opacity-100'}`}
            aria-label={liked ? t('product.removedFromWishlist') : t('nav.wishlist')}
            aria-pressed={liked}
          >
            <Heart className={`h-[18px] w-[18px] ${liked ? 'fill-danger text-danger' : 'text-ink-2'}`} />
          </motion.button>
        </div>

        {/* Info */}
        <div className="mt-4 flex flex-1 flex-col">
          {colors.length > 1 && (
            <div className="mb-3 flex items-center gap-1.5">
              {colors.slice(0, 6).map((color) => (
                <span
                  key={color.id}
                  className="h-3 w-3 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          )}

          {eyebrow && <p className="t-eyebrow mb-1">{eyebrow}</p>}

          <h3 className="line-clamp-2 text-[19px] font-semibold leading-[1.21] tracking-[0.012em] text-ink">
            {product.name}
          </h3>

          <div className="mt-auto pt-3 text-[15px] leading-tight">
            <span className="text-ink">{formatPrice(salePrice)}</span>
            {product.sale_percent > 0 && (
              <span className="ml-2 text-ink-3 line-through">{formatPrice(displayPrice)}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
