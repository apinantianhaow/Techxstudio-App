'use client';

import { useState } from 'react';
import { X, ShoppingBag, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StarRating from '@/components/ui/StarRating';
import useCartStore from '@/stores/useCartStore';
import useWishlistStore from '@/stores/useWishlistStore';
import { formatPrice, calcDiscountedPrice } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProductQuickView({ product, isOpen, onClose }) {
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedOption, setSelectedOption] = useState(0);
  const addToCart = useCartStore((s) => s.addToCart);
  const { isFavorite, toggleFavorite } = useWishlistStore();

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
    toast.success('เพิ่มลงตะกร้าแล้ว 🛒');
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
            className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
              md:w-[500px] md:max-h-[85vh] z-[var(--z-modal)] glass-modal rounded-2xl overflow-y-auto"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-surface-100/80 dark:bg-surface-800/80
                flex items-center justify-center backdrop-blur-sm"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Image */}
            <div className="aspect-square bg-gradient-to-br from-surface-50 to-surface-100
              dark:from-surface-800 dark:to-surface-900 p-6">
              {currentColor?.image_url ? (
                <img src={currentColor.image_url} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-32 h-32 rounded-3xl gradient-primary opacity-10" />
                </div>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Name & Rating */}
              <div>
                <h3 className="font-bold text-lg text-surface-900 dark:text-surface-100">{product.name}</h3>
                <StarRating rating={product.rating} reviews={product.reviews_count} size="sm" />
              </div>

              {/* Price */}
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold gradient-text">{formatPrice(salePrice)}</span>
                {product.sale_percent > 0 && (
                  <span className="text-sm text-surface-400 line-through">{formatPrice(price)}</span>
                )}
              </div>

              {/* Colors */}
              {colors.length > 1 && (
                <div>
                  <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
                    สี: {currentColor?.name}
                  </p>
                  <div className="flex gap-2">
                    {colors.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedColor(i)}
                        className={`w-8 h-8 rounded-full border-2 transition-all
                          ${i === selectedColor
                            ? 'border-primary-600 scale-110 shadow-md'
                            : 'border-surface-200 dark:border-surface-600'}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Options */}
              {options.length > 1 && (
                <div>
                  <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">ตัวเลือก</p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt, i) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedOption(i)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${i === selectedOption
                            ? 'gradient-primary text-white shadow-md'
                            : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddToCart}
                  className="flex-1 gradient-primary text-white py-3 rounded-xl font-semibold
                    flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-shadow btn-ripple"
                >
                  <ShoppingBag className="w-5 h-5" />
                  เพิ่มลงตะกร้า
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={() => {
                    toggleFavorite(product.id);
                    toast(liked ? 'ลบออกจาก Wishlist' : 'เพิ่มลง Wishlist ❤️');
                  }}
                  className="w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-700
                    flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : 'text-surface-400'}`} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
