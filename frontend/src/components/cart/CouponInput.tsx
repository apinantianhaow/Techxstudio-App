'use client';

import { useState } from 'react';
import { Tag, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/utils';
import type { AppliedCoupon, CouponValidation } from '@/types';

interface CouponInputProps {
  cartTotal: number;
  onApply?: (coupon: AppliedCoupon) => void;
  onRemove?: () => void;
  appliedCoupon: AppliedCoupon | null;
}

export default function CouponInput({ cartTotal, onApply, onRemove, appliedCoupon }: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), total: cartTotal }),
      });
      const data: CouponValidation & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error);

      onApply?.({ ...data.coupon, discount: data.calculated_discount });
      toast.success(`${data.coupon.code} ${t('coupon.success')}`);
    } catch (err) {
      toast.error(errorMessage(err) || t('coupon.invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {appliedCoupon ? (
        <motion.div key="applied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="flex items-center justify-between rounded-control bg-card px-4 py-3">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> {appliedCoupon.code}
          </span>
          <button onClick={() => { onRemove?.(); setCode(''); toast(t('coupon.removed')); }} className="link text-[14px]">
            {t('cart.remove')}
          </button>
        </motion.div>
      ) : (
        <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="relative">
          <Tag className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t('coupon.placeholder')}
            aria-label={t('coupon.placeholder')}
            className="field py-3 pl-11 pr-24 text-[15px] uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal"
            onKeyDown={(e) => e.key === 'Enter' && handleApply()} />
          <button onClick={handleApply} disabled={loading || !code.trim()}
            className="link absolute right-4 top-1/2 -translate-y-1/2 text-[15px] disabled:text-ink-3 disabled:no-underline">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('coupon.apply')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
