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
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

export default function CartPage() {
  const items = useCartItems();
  const totalPrice = useCartTotalPrice();
  const clearCart = useCartStore((s) => s.clearCart);
  const { isLoggedIn, authFetch } = useAuth();
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [ordering, setOrdering] = useState(false);

  const discount = appliedCoupon?.discount || 0;
  const finalPrice = Math.max(0, totalPrice - discount);

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      toast.error('กรุณาเข้าสู่ระบบก่อนสั่งซื้อ');
      return;
    }

    setOrdering(true);
    try {
      const res = await authFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          shipping_address: 'กรุงเทพมหานคร',
          payment_method: 'credit_card',
          coupon_code: appliedCoupon?.code || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      clearCart();
      setAppliedCoupon(null);
      toast.success('สั่งซื้อสำเร็จ! 🎉');
    } catch (err) {
      toast.error(err.message || 'สั่งซื้อไม่สำเร็จ');
    } finally {
      setOrdering(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <Breadcrumbs items={[{ label: 'ตะกร้า' }]} />
        <div className="text-center py-20 space-y-4">
          <PackageOpen className="w-20 h-20 mx-auto text-surface-300 dark:text-surface-600" />
          <h2 className="text-xl font-bold text-surface-700 dark:text-surface-300">ตะกร้าว่างเปล่า</h2>
          <p className="text-sm text-surface-400">เพิ่มสินค้าที่ชื่นชอบลงตะกร้าเลย!</p>
          <Link href="/">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="gradient-primary text-white px-6 py-3 rounded-xl font-semibold mt-2"
            >
              เลือกซื้อสินค้า
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      <Breadcrumbs items={[{ label: 'ตะกร้า' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold section-title text-surface-800 dark:text-surface-200">
          ตะกร้าสินค้า ({items.length})
        </h1>
        <button
          onClick={() => { clearCart(); toast('ล้างตะกร้าแล้ว'); }}
          className="text-xs text-surface-400 hover:text-error flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> ล้างทั้งหมด
        </button>
      </div>

      {/* Cart Items */}
      <div className="space-y-3">
        <AnimatePresence>
          {items.map((item, i) => (
            <CartItem key={item.id} item={item} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {/* Coupon */}
      <CouponInput
        cartTotal={totalPrice}
        onApply={setAppliedCoupon}
        onRemove={() => setAppliedCoupon(null)}
        appliedCoupon={appliedCoupon}
      />

      {/* Summary */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-surface-500">ยอดรวม</span>
          <span className="font-medium text-surface-700 dark:text-surface-300">{formatPrice(totalPrice)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-success">ส่วนลดคูปอง</span>
            <span className="font-medium text-success">-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-surface-500">ค่าจัดส่ง</span>
          <span className="font-medium text-success">ฟรี</span>
        </div>
        <div className="border-t border-surface-200 dark:border-surface-700 pt-3 flex justify-between">
          <span className="font-bold text-surface-800 dark:text-surface-200">ยอดชำระ</span>
          <span className="text-xl font-bold gradient-text">{formatPrice(finalPrice)}</span>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleCheckout}
          disabled={ordering}
          className="w-full gradient-primary text-white py-3.5 rounded-xl font-bold text-base
            flex items-center justify-center gap-2 shadow-lg hover:shadow-xl
            disabled:opacity-50 btn-ripple transition-shadow"
        >
          {ordering ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ShoppingBag className="w-5 h-5" />
              สั่งซื้อเลย
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
