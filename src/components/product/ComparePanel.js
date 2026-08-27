'use client';

import { X, GitCompareArrows, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useCompareStore from '@/stores/useCompareStore';
import { useTranslation } from '@/context/LanguageContext';
import { formatPrice, calcDiscountedPrice } from '@/lib/utils';

export default function ComparePanel() {
  const { items, isOpen, removeFromCompare, clearCompare, closePanel } = useCompareStore();
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-16 md:bottom-0 left-0 right-0 z-[var(--z-overlay)] glass-modal rounded-t-2xl shadow-float"
        >
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitCompareArrows className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-surface-800 dark:text-surface-200">
                  {t('compare.title')} ({items.length}/3)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={clearCompare} className="text-xs text-surface-400 hover:text-error transition-colors">
                  {t('common.clearAll')}
                </button>
                <button onClick={closePanel} className="w-8 h-8 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-2 text-surface-400 font-medium w-24">Product</th>
                    {items.map((item) => (
                      <th key={item.id} className="py-2 px-3 min-w-[140px]">
                        <div className="relative">
                          <button onClick={() => removeFromCompare(item.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-error/10 flex items-center justify-center">
                            <Trash2 className="w-3 h-3 text-error" />
                          </button>
                          <div className="w-16 h-16 mx-auto bg-surface-100 dark:bg-surface-800 rounded-lg overflow-hidden mb-1">
                            {item.product_colors?.[0]?.image_url ? (
                              <img src={item.product_colors[0].image_url} alt={item.name} className="w-full h-full object-contain p-1" />
                            ) : (
                              <div className="w-full h-full gradient-primary opacity-10" />
                            )}
                          </div>
                          <p className="text-xs font-semibold text-surface-700 dark:text-surface-300 line-clamp-2">{item.name}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-surface-200 dark:border-surface-700">
                    <td className="py-2 px-2 text-surface-400">{t('compare.price')}</td>
                    {items.map((item) => (
                      <td key={item.id} className="py-2 px-3 text-center">
                        <span className="font-bold gradient-text text-sm">
                          {formatPrice(calcDiscountedPrice(item.original_price, item.sale_percent))}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-surface-200 dark:border-surface-700">
                    <td className="py-2 px-2 text-surface-400">{t('compare.rating')}</td>
                    {items.map((item) => (
                      <td key={item.id} className="py-2 px-3 text-center text-sm">⭐ {item.rating}</td>
                    ))}
                  </tr>
                  <tr className="border-t border-surface-200 dark:border-surface-700">
                    <td className="py-2 px-2 text-surface-400">{t('compare.category')}</td>
                    {items.map((item) => (
                      <td key={item.id} className="py-2 px-3 text-center text-xs capitalize text-surface-600 dark:text-surface-400">
                        {t(`category.${item.category}`)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-surface-200 dark:border-surface-700">
                    <td className="py-2 px-2 text-surface-400">{t('compare.colors')}</td>
                    {items.map((item) => (
                      <td key={item.id} className="py-2 px-3">
                        <div className="flex justify-center gap-1">
                          {item.product_colors?.slice(0, 4).map((c) => (
                            <div key={c.id} className="w-4 h-4 rounded-full border border-surface-200" style={{ backgroundColor: c.hex }} />
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
