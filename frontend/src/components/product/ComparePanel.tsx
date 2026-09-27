'use client';

import { X, Trash2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductVisual from '@/components/product/ProductVisual';
import useCompareStore from '@/stores/useCompareStore';
import { useTranslation } from '@/context/LanguageContext';
import { formatPrice, calcDiscountedPrice } from '@/lib/utils';

export default function ComparePanel() {
  const { items, isOpen, removeFromCompare, clearCompare, closePanel } = useCompareStore();
  const { t } = useTranslation();

  if (items.length === 0) return null;

  const row = 'border-t border-line';
  const label = 'py-3 px-2 text-[13px] text-ink-2';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.35, ease: [0.28, 0.11, 0.32, 1] }}
          className="sheet fixed inset-x-0 bottom-[52px] z-[var(--z-overlay)] rounded-t-[22px] md:bottom-0"
        >
          <div className="mx-auto max-w-4xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-ink">
                {t('compare.title')} <span className="text-ink-2">{items.length}/3</span>
              </h3>
              <div className="flex items-center gap-4">
                <button onClick={clearCompare} className="link text-[14px]">{t('common.clearAll')}</button>
                <button onClick={closePanel} className="icon-btn" aria-label={t('common.close')}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="w-24" />
                    {items.map((item) => (
                      <th key={item.id} className="min-w-[140px] px-3 py-2 font-normal">
                        <div className="relative">
                          <button onClick={() => removeFromCompare(item.id)} aria-label={t('cart.remove')}
                            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-fill">
                            <Trash2 className="h-3 w-3 text-danger" />
                          </button>
                          <div className="mx-auto mb-2 h-16 w-16 rounded-xl bg-canvas-alt p-2">
                            <ProductVisual product={item} className="h-full w-full" />
                          </div>
                          <p className="line-clamp-2 text-[13px] font-semibold text-ink">{item.name}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className={row}>
                    <td className={label}>{t('compare.price')}</td>
                    {items.map((item) => (
                      <td key={item.id} className="px-3 py-3 text-center text-[14px] font-semibold text-ink">
                        {formatPrice(calcDiscountedPrice(item.original_price, item.sale_percent))}
                      </td>
                    ))}
                  </tr>
                  <tr className={row}>
                    <td className={label}>{t('compare.rating')}</td>
                    {items.map((item) => (
                      <td key={item.id} className="px-3 py-3 text-center text-[14px] text-ink">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-[#ff9f0a] text-[#ff9f0a]" />
                          {item.rating}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className={row}>
                    <td className={label}>{t('compare.category')}</td>
                    {items.map((item) => (
                      <td key={item.id} className="px-3 py-3 text-center text-[13px] capitalize text-ink-2">
                        {t(`category.${item.category}`)}
                      </td>
                    ))}
                  </tr>
                  <tr className={row}>
                    <td className={label}>{t('compare.colors')}</td>
                    {items.map((item) => (
                      <td key={item.id} className="px-3 py-3">
                        <div className="flex justify-center gap-1.5">
                          {item.product_colors?.slice(0, 4).map((c) => (
                            <span key={c.id} className="h-4 w-4 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                              style={{ backgroundColor: c.hex }} />
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
