'use client';

import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import CartItem from '@/components/cart/CartItem';
import CouponInput from '@/components/cart/CouponInput';
import useCartStore, { useCartItems, useCartTotalPrice } from '@/stores/useCartStore';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { formatPrice, errorMessage } from '@/lib/utils';
import type { AppliedCoupon } from '@/types';
import { toast } from 'sonner';
import { toastIcons } from '@/components/ui/toastIcons';

export default function CartPage() {
  const items = useCartItems();
  const totalPrice = useCartTotalPrice();
  const clearCart = useCartStore((s) => s.clearCart);
  const { isLoggedIn, authFetch } = useAuth();
  const { t } = useTranslation();
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  const discount = appliedCoupon?.discount || 0;
  const finalPrice = Math.max(0, totalPrice - discount);

  const handleCheckout = async () => {
    if (!isLoggedIn) { toast.error(t('errors.loginRequired')); return; }
    setOrdering(true);
    try {
      const res = await authFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          shipping_address: shippingAddress.trim(),
          payment_method: paymentMethod,
          coupon_code: appliedCoupon?.code || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      clearCart();
      setAppliedCoupon(null);
      toast.success(t('orders.orderSuccess'), { icon: toastIcons.celebrate });
    } catch (err) { toast.error(errorMessage(err) || t('orders.orderFailed')); }
    finally { setOrdering(false); }
  };

  if (items.length === 0) {
    return (
      <div className="page-width py-24 text-center md:py-32">
        <ShoppingBag className="mx-auto h-14 w-14 text-ink-3" strokeWidth={1.25} />
        <h1 className="t-headline mt-6 text-ink">{t('cart.empty')}</h1>
        <p className="mt-3 text-[17px] text-ink-2">{t('cart.emptyDesc')}</p>
        <Link href="/" className="btn btn-primary mt-8">{t('cart.shopNow')}</Link>
      </div>
    );
  }

  const paymentMethods = [
    { value: 'credit_card', label: t('cart.creditCard') },
    { value: 'bank_transfer', label: t('cart.bankTransfer') },
    { value: 'cod', label: t('cart.cod') },
  ];

  return (
    <div className="page-width pb-24">
      <div className="mx-auto max-w-[1080px]">
        {/* Headline */}
        <header className="border-b border-line py-12 text-center md:py-16">
          <h1 className="t-headline text-ink">
            {t('cart.bagTotal')} {formatPrice(finalPrice)}
          </h1>
          <p className="mt-3 text-[17px] text-ink-2">{t('cart.freeDeliveryReturns')}</p>
        </header>

        <div className="grid gap-12 pt-4 lg:grid-cols-[1fr_380px]">
          {/* Items */}
          <section aria-label={t('cart.title')}>
            <div className="flex items-center justify-between py-4">
              <p className="text-[14px] text-ink-2">{items.length} {t('common.items')}</p>
              <button onClick={() => { clearCart(); toast(t('cart.cleared')); }} className="link text-[14px]">
                {t('common.clearAll')}
              </button>
            </div>
            <ul className="border-t border-line">
              <AnimatePresence initial={false}>
                {items.map((item, i) => <CartItem key={item.id} item={item} index={i} />)}
              </AnimatePresence>
            </ul>
          </section>

          {/* Summary + checkout */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-card bg-canvas-alt p-6 dark:bg-card">
              <h2 className="text-[21px] font-semibold text-ink">{t('cart.summary')}</h2>

              <div className="mt-5">
                <CouponInput cartTotal={totalPrice} onApply={setAppliedCoupon} onRemove={() => setAppliedCoupon(null)} appliedCoupon={appliedCoupon} />
              </div>

              <dl className="mt-5 space-y-2.5 text-[15px]">
                <div className="flex justify-between">
                  <dt className="text-ink-2">{t('cart.subtotal')}</dt>
                  <dd className="text-ink">{formatPrice(totalPrice)}</dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-success">{t('cart.couponDiscount')}</dt>
                    <dd className="text-success">−{formatPrice(discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-ink-2">{t('cart.shipping')}</dt>
                  <dd className="text-ink">{t('common.free')}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-line pt-4">
                  <dt className="text-[19px] font-semibold text-ink">{t('cart.total')}</dt>
                  <dd className="text-[21px] font-semibold text-ink">{formatPrice(finalPrice)}</dd>
                </div>
              </dl>

              <div className="mt-6 border-t border-line pt-6">
                <label htmlFor="shipping-address" className="text-[14px] font-semibold text-ink">
                  {t('cart.shippingAddress')}
                </label>
                <textarea
                  id="shipping-address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder={t('cart.addressPlaceholder')}
                  rows={3}
                  className="field mt-2 resize-none text-[15px]"
                />
              </div>

              <fieldset className="mt-5">
                <legend className="text-[14px] font-semibold text-ink">{t('cart.paymentMethod')}</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {paymentMethods.map((pm) => (
                    <button key={pm.value} type="button"
                      onClick={() => setPaymentMethod(pm.value)}
                      aria-pressed={paymentMethod === pm.value}
                      className="choice px-2 py-3 text-[13px] leading-tight">
                      {pm.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button onClick={handleCheckout}
                disabled={ordering || !shippingAddress.trim()}
                className="btn btn-primary btn-block mt-6">
                {ordering
                  ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : t('cart.checkout')}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
