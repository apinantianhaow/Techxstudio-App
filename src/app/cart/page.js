'use client';

import { useState } from 'react';
import { ShoppingBag, Trash2, ArrowRight, PackageOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import CartItem from '@/components/cart/CartItem';
import CouponInput from '@/components/cart/CouponInput';
import useCartStore, { useCartItems, useCartTotalPrice } from '@/stores/useCartStore';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

export default function CartPage() {
  const items = useCartItems();
  const totalPrice = useCartTotalPrice();
  const clearCart = useCartStore((s) => s.clearCart);
  const { isLoggedIn, authFetch } = useAuth();
  const { t } = useTranslation();
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [ordering, setOrdering] = useState(false);

  const discount = appliedCoupon?.discount || 0;
  const finalPrice = Math.max(0, totalPrice - discount);

  const handleCheckout = async () => {
    if (!isLoggedIn) { toast.error(t('errors.loginRequired')); return; }
    setOrdering(true);
    try {
      const res = await authFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ shipping_address: 'Bangkok', payment_method: 'credit_card', coupon_code: appliedCoupon?.code || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      clearCart();
      setAppliedCoupon(null);
      toast.success(t('orders.orderSuccess'));
    } catch (err) { toast.error(err.message || t('orders.orderFailed')); }
    finally { setOrdering(false); }
  };

  if (items.length === 0) {
    return (
      <div className="px-4 md:px-8 lg:px-12 py-4 md:py-6 max-w-6xl mx-auto space-y-4">
        <Breadcrumbs items={[{ label: t('nav.cart') }]} />
        <div className="text-center py-20 space-y-4">
          <PackageOpen className="w-20 h-20 mx-auto text-surface-300 dark:text-surface-600" />
          <h2 className="text-xl font-bold text-surface-700 dark:text-surface-300">{t('cart.empty')}</h2>
          <p className="text-sm text-surface-400">{t('cart.emptyDesc')}</p>
          <Link href="/">
            <motion.button whileTap={{ scale: 0.95 }} className="gradient-primary text-white px-6 py-3 rounded-xl font-semibold mt-2">
              {t('cart.shopNow')}
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-12 py-4 md:py-6 max-w-6xl mx-auto space-y-4">
      <Breadcrumbs items={[{ label: t('nav.cart') }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold section-title text-surface-800 dark:text-surface-200">
          {t('cart.title')} ({items.length})
        </h1>
        <button onClick={() => { clearCart(); toast(t('cart.cleared')); }}
          className="text-xs text-surface-400 hover:text-error flex items-center gap-1 transition-colors">
          <Trash2 className="w-3 h-3" /> {t('common.clearAll')}
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {items.map((item, i) => <CartItem key={item.id} item={item} index={i} />)}
        </AnimatePresence>
      </div>

      <CouponInput cartTotal={totalPrice} onApply={setAppliedCoupon} onRemove={() => setAppliedCoupon(null)} appliedCoupon={appliedCoupon} />

      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-surface-500">{t('cart.subtotal')}</span>
          <span className="font-medium text-surface-700 dark:text-surface-300">{formatPrice(totalPrice)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-success">{t('cart.couponDiscount')}</span>
            <span className="font-medium text-success">-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-surface-500">{t('cart.shipping')}</span>
          <span className="font-medium text-success">{t('common.free')}</span>
        </div>
        <div className="border-t border-surface-200 dark:border-surface-700 pt-3 flex justify-between">
          <span className="font-bold text-surface-800 dark:text-surface-200">{t('cart.total')}</span>
          <span className="text-xl font-bold gradient-text">{formatPrice(finalPrice)}</span>
        </div>

        <motion.button whileTap={{ scale: 0.97 }} onClick={handleCheckout} disabled={ordering}
          className="w-full gradient-primary text-white py-3.5 rounded-xl font-bold text-base
            flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 btn-ripple transition-shadow">
          {ordering ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ShoppingBag className="w-5 h-5" />
              {t('cart.checkout')}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
