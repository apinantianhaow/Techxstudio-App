'use client';

import { useState } from 'react';
import { Tag, X, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/context/LanguageContext';
import { toast } from 'sonner';

export default function CouponInput({ cartTotal, onApply, onRemove, appliedCoupon }) {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onApply?.({ code: data.coupon.code, discount: data.calculated_discount, ...data.coupon });
      toast.success(`${data.coupon.code} ${t('coupon.success')}`);
    } catch (err) {
      toast.error(err.message || t('coupon.invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <AnimatePresence mode="wait">
        {appliedCoupon ? (
          <motion.div key="applied" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-between p-3  bg-success/10 border border-success/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm font-semibold text-success">{appliedCoupon.code}</span>
            </div>
            <button onClick={() => { onRemove?.(); setCode(''); toast(t('coupon.removed')); }}
              className="w-6 h-6  bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ) : (
          <motion.div key="input" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex gap-2">
            <div className="flex-1 relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t('coupon.placeholder')}
                className="w-full pl-9 pr-3 py-2.5  bg-surface-100 dark:bg-surface-800
                  border border-surface-200 dark:border-surface-700
                  text-sm font-medium uppercase tracking-wider
                  focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
                  placeholder:normal-case placeholder:tracking-normal"
                onKeyDown={(e) => e.key === 'Enter' && handleApply()} />
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleApply} disabled={loading || !code.trim()}
              className="px-4 py-2.5  gradient-primary text-white text-sm font-semibold
                disabled:opacity-50 flex items-center gap-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('coupon.apply')}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
