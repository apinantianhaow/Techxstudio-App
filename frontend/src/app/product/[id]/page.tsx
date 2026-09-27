'use client';

import { useState, useEffect, use } from 'react';
import { Heart, Share, Minus, Plus, Truck, RotateCcw, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import StarRating from '@/components/ui/StarRating';
import ProductVisual from '@/components/product/ProductVisual';
import ProductReviews from '@/components/product/ProductReviews';
import ProductRecommendations from '@/components/product/ProductRecommendations';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import useCartStore from '@/stores/useCartStore';
import useWishlistStore from '@/stores/useWishlistStore';
import { formatPrice, calcDiscountedPrice } from '@/lib/utils';
import { useTranslation } from '@/context/LanguageContext';
import { toast } from 'sonner';
import { toastIcons } from '@/components/ui/toastIcons';
import type { Product, Review } from '@/types';

export default function ProductPage({ params }: PageProps<'/product/[id]'>) {
  const { id } = use(params);
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
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
      <div className="page-width py-32 text-center">
        <p className="t-title text-ink">{t('errors.productNotFound')}</p>
        <button onClick={() => router.push('/')} className="btn btn-primary mt-8">{t('common.backToHome')}</button>
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
  const catLabel = t(`category.${product.category}`) || product.category || '';
  const eyebrow = product.sale_percent > 0
    ? `${t('product.save')} ${product.sale_percent}%`
    : product.badge ? t(`product.badges.${product.badge}`, product.badge) : null;

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
    toast.success(t('product.addedToCart'), { icon: toastIcons.cart });
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast(t('common.linkCopied'));
    }
  };

  const perks = (['freeShipping', 'returns', 'authentic'] as const).map((key, i) => ({
    Icon: [Truck, RotateCcw, ShieldCheck][i],
    ...t<{ title: string; desc: string }>(`home.features.${key}`),
  }));

  return (
    <div className="pb-20">
      <div className="page-width">
        <Breadcrumbs items={[
          ...(product.category ? [{ label: catLabel, href: `/category/${product.category}` }] : []),
          { label: product.name },
        ]} />
      </div>

      <div className="page-width grid gap-10 pt-4 md:grid-cols-[1.15fr_1fr] md:gap-14 lg:gap-20">
        {/* ── Visual ── */}
        <div className="md:sticky md:top-20 md:self-start">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-card bg-canvas-alt">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedColor}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.28, 0.11, 0.32, 1] }}
                className="h-full w-full p-12 md:p-16"
              >
                <ProductVisual product={product} color={currentColor} className="h-full w-full" />
              </motion.div>
            </AnimatePresence>
          </div>
          {currentColor && (
            <p className="mt-3 text-center text-[14px] text-ink-2">{currentColor.name}</p>
          )}
        </div>

        {/* ── Buy panel ── */}
        <div>
          {eyebrow && <p className="t-eyebrow text-[14px]">{eyebrow}</p>}
          <h1 className="t-title mt-1 text-ink">{product.name}</h1>

          <div className="mt-3 flex items-center gap-3">
            <StarRating rating={product.rating} reviews={product.reviews_count} size="sm" />
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-[24px] font-semibold tracking-tight text-ink">{formatPrice(salePrice)}</span>
            {product.sale_percent > 0 && (
              <span className="text-[17px] text-ink-3 line-through">{formatPrice(price)}</span>
            )}
          </div>

          {product.description && (
            <p className="mt-4 text-[17px] leading-relaxed text-ink-2">{product.description}</p>
          )}

          {/* Color */}
          {colors.length > 0 && (
            <section className="mt-8 border-t border-line pt-6">
              <h2 className="text-[19px] font-semibold text-ink">
                {t('product.color')}{locale === 'en' && '.'} <span className="text-ink-2">{t('product.colorPrompt')}</span>
              </h2>
              <p className="mt-3 text-[14px] text-ink-2">{currentColor?.name}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {colors.map((c, i) => (
                  <button key={c.id} onClick={() => setSelectedColor(i)} title={c.name}
                    aria-label={c.name} aria-pressed={i === selectedColor}
                    className={`h-9 w-9 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] ring-offset-2 ring-offset-canvas transition
                      ${i === selectedColor ? 'ring-2 ring-accent' : 'hover:ring-2 hover:ring-line'}`}
                    style={{ backgroundColor: c.hex }} />
                ))}
              </div>
            </section>
          )}

          {/* Options */}
          {options.length > 0 && (
            <section className="mt-8 border-t border-line pt-6">
              <h2 className="text-[19px] font-semibold text-ink">
                {t('product.options')}{locale === 'en' && '.'} <span className="text-ink-2">{t('product.optionsPrompt')}</span>
              </h2>
              <div className="mt-4 grid gap-3">
                {options.map((opt, i) => (
                  <button key={opt.id} onClick={() => setSelectedOption(i)}
                    aria-pressed={i === selectedOption}
                    className="choice flex items-center justify-between px-5 py-4 text-left">
                    <span className="text-[17px] font-semibold">{opt.label}</span>
                    <span className="text-[14px] text-ink-2">
                      {formatPrice(calcDiscountedPrice(opt.price, product.sale_percent))}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Quantity + Add to bag */}
          <section className="mt-8 border-t border-line pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-semibold text-ink">{t('product.quantity')}</span>
              <div className="flex items-center gap-1 rounded-full bg-fill p-1">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}
                  aria-label="−" className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-card disabled:opacity-30">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-[17px] font-semibold tabular-nums text-ink">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}
                  aria-label="+" className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-card">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <motion.button whileTap={{ scale: 0.98 }} onClick={handleAddToCart} className="btn btn-primary btn-block mt-6">
              {t('common.addToCart')}
            </motion.button>

            <div className="mt-4 flex justify-center gap-8 text-[14px]">
              <button
                onClick={() => { toggleFavorite(product.id); toast(liked ? t('product.removedFromWishlist') : t('product.addedToWishlist'), { icon: liked ? undefined : toastIcons.wishlist }); }}
                aria-pressed={liked}
                className="link inline-flex items-center gap-1.5">
                <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /> {t('nav.wishlist')}
              </button>
              <button onClick={handleShare} className="link inline-flex items-center gap-1.5">
                <Share className="h-4 w-4" /> {t('common.share')}
              </button>
            </div>
          </section>

          {/* Perks */}
          <ul className="mt-8 space-y-4 rounded-card bg-canvas-alt p-6 dark:bg-card">
            {perks.map(({ Icon, title, desc }) => (
              <li key={title} className="flex gap-4">
                <Icon className="mt-0.5 h-6 w-6 flex-shrink-0 text-ink" strokeWidth={1.5} />
                <span>
                  <span className="block text-[14px] font-semibold text-ink">{title}</span>
                  <span className="block text-[14px] text-ink-2">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Tech specs ── */}
      {specs.length > 0 && (
        <section className="page-width mt-20">
          <h2 className="t-title border-b border-line pb-5 text-ink">{t('product.specs')}</h2>
          <dl className="grid md:grid-cols-2 md:gap-x-14">
            {specs.map((spec) => (
              <div key={spec.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 border-b border-line py-4">
                <dt className="text-[14px] font-semibold text-ink">{spec.spec_key}</dt>
                <dd className="text-[14px] text-ink-2">{spec.spec_value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="page-width mt-20">
        <ProductReviews productId={product.id} reviews={reviews} />
      </div>

      <ProductRecommendations category={product.category} currentProductId={product.id} />
    </div>
  );
}
