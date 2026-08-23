'use client';

import { useState, useEffect, use } from 'react';
import { ShoppingBag, Heart, Share2, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import StarRating from '@/components/ui/StarRating';
import ProductReviews from '@/components/product/ProductReviews';
import ProductRecommendations from '@/components/product/ProductRecommendations';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import useCartStore from '@/stores/useCartStore';
import useWishlistStore from '@/stores/useWishlistStore';
import { formatPrice, calcDiscountedPrice } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProductPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedOption, setSelectedOption] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const addToCart = useCartStore((s) => s.addToCart);
  const { isFavorite, toggleFavorite } = useWishlistStore();

  useEffect(() => {
    async function fetchProduct() {
      try {
        const [pRes, rRes] = await Promise.all([
          fetch(`/api/products/${id}`),
          fetch(`/api/products/${id}/reviews`),
        ]);
        const pData = await pRes.json();
        const rData = await rRes.json();

        if (pData.product) {
          setProduct(pData.product);
          setReviews(rData.reviews || []);
        }
      } catch (err) {
        console.error('Product fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  if (loading) return <LoadingSkeleton type="detail" />;
  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-surface-400 text-lg">ไม่พบสินค้า</p>
        <button onClick={() => router.push('/')} className="mt-4 text-primary-600 font-medium">กลับหน้าหลัก</button>
      </div>
    );
  }

  const colors = product.product_colors || [];
  const options = product.product_options || [];
  const specs = product.product_specs || [];
  const currentColor = colors[selectedColor];
  const currentOption = options[selectedOption];
  const price = currentOption?.price || product.original_price;
  const salePrice = calcDiscountedPrice(price, product.sale_percent);
  const liked = isFavorite(product.id);

  const catLabel = { phone: 'iPhone', tablet: 'iPad', accessory: 'อุปกรณ์เสริม' }[product.category] || product.category;

  const handleAddToCart = () => {
    addToCart({
      product_id: product.id,
      name: product.name,
      option_label: currentOption?.label || '',
      color_name: currentColor?.name || '',
      quantity,
      price: salePrice,
      image_url: currentColor?.image_url || '',
      slug: product.slug,
    });
    toast.success('เพิ่มลงตะกร้าแล้ว 🛒');
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast('คัดลอกลิงก์แล้ว');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
      {/* Back + Breadcrumbs */}
      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <Breadcrumbs items={[
          { label: catLabel, href: `/category/${product.category}` },
          { label: product.name },
        ]} />
      </div>

      {/* Product Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative aspect-square max-w-md mx-auto rounded-2xl overflow-hidden
          bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-800 dark:to-surface-900"
      >
        {/* Badge */}
        {product.badge && (
          <div className={`absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-xs font-bold text-white
            ${product.badge === 'HOT' ? 'bg-badge-hot' : product.badge === 'NEW' ? 'bg-badge-new' : 'gradient-sale'}`}>
            {product.badge}
          </div>
        )}

        {currentColor?.image_url ? (
          <img src={currentColor.image_url} alt={product.name} className="w-full h-full object-contain p-8" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-40 h-40 rounded-3xl gradient-primary opacity-10" />
          </div>
        )}
      </motion.div>

      {/* Product Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">{product.name}</h1>
            <StarRating rating={product.rating} reviews={product.reviews_count} size="sm" />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <motion.button whileTap={{ scale: 0.8 }} onClick={handleShare}
              className="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-surface-500" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.8 }} onClick={() => { toggleFavorite(product.id); toast(liked ? 'ลบจาก Wishlist' : 'เพิ่มลง Wishlist ❤️'); }}
              className="w-10 h-10 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
              <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : 'text-surface-500'}`} />
            </motion.button>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold gradient-text">{formatPrice(salePrice)}</span>
          {product.sale_percent > 0 && (
            <>
              <span className="text-lg text-surface-400 line-through">{formatPrice(price)}</span>
              <span className="px-2 py-0.5 rounded-full gradient-sale text-xs font-bold text-white">
                -{product.sale_percent}%
              </span>
            </>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Color picker */}
        {colors.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
              สี: <span className="font-normal text-surface-500">{currentColor?.name}</span>
            </p>
            <div className="flex gap-2.5">
              {colors.map((c, i) => (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setSelectedColor(i)}
                  className={`w-10 h-10 rounded-full border-2 transition-all duration-200
                    ${i === selectedColor
                      ? 'border-primary-600 scale-110 shadow-lg ring-4 ring-primary-500/20'
                      : 'border-surface-200 dark:border-surface-600 hover:scale-105'}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        {options.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">ตัวเลือก</p>
            <div className="flex flex-wrap gap-2">
              {options.map((opt, i) => (
                <motion.button
                  key={opt.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedOption(i)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${i === selectedOption
                      ? 'gradient-primary text-white shadow-lg'
                      : 'glass-card hover:shadow-md text-surface-600 dark:text-surface-300'}`}
                >
                  {opt.label} — {formatPrice(calcDiscountedPrice(opt.price, product.sale_percent))}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity + Add to cart */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex items-center bg-surface-100 dark:bg-surface-800 rounded-xl overflow-hidden">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 flex items-center justify-center text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 text-lg font-medium">
              −
            </button>
            <span className="w-10 text-center font-bold text-surface-800 dark:text-surface-200">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 flex items-center justify-center text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 text-lg font-medium">
              +
            </button>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAddToCart}
            className="flex-1 gradient-primary text-white py-3.5 rounded-xl font-bold text-base
              flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-shadow btn-ripple"
          >
            <ShoppingBag className="w-5 h-5" />
            เพิ่มลงตะกร้า
          </motion.button>
        </div>

        {/* Specs */}
        {specs.length > 0 && (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-surface-200 dark:border-surface-700">
              <h3 className="font-bold text-surface-800 dark:text-surface-200">สเปค</h3>
            </div>
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {specs.map((spec) => (
                <div key={spec.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-surface-500 dark:text-surface-400">{spec.spec_key}</span>
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{spec.spec_value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Reviews */}
      <ProductReviews productId={product.id} reviews={reviews} />

      {/* Recommendations */}
      <ProductRecommendations category={product.category} currentProductId={product.id} />
    </div>
  );
}
