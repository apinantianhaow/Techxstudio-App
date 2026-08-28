'use client';

import { useState, useEffect } from 'react';
import { Package, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import OrderTimeline from '@/components/orders/OrderTimeline';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { formatPrice, formatDateTime } from '@/lib/utils';

export default function OrdersPage() {
  const { isLoggedIn, authFetch, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!isLoggedIn) { setLoading(false); return; }
      try {
        const res = await authFetch('/api/orders');
        const data = await res.json();
        setOrders(data.orders || []);
      } catch { setOrders([]); }
      finally { setLoading(false); }
    }
    if (!authLoading) fetchOrders();
  }, [isLoggedIn, authLoading, authFetch]);

  if (!authLoading && !isLoggedIn) {
    return (
      <div className="px-4 md:px-8 lg:px-12 py-4 md:py-6 max-w-6xl mx-auto space-y-4">
        <Breadcrumbs items={[{ label: t('orders.title') }]} />
        <div className="text-center py-20 space-y-4">
          <Package className="w-20 h-20 mx-auto text-surface-300 dark:text-surface-600" />
          <h2 className="text-xl font-bold text-surface-700 dark:text-surface-300">{t('orders.loginRequired')}</h2>
          <p className="text-sm text-surface-400">{t('orders.loginRequiredDesc')}</p>
          <Link href="/account">
            <motion.button whileTap={{ scale: 0.95 }} className="gradient-primary text-white px-6 py-3 rounded-xl font-semibold mt-2">
              {t('account.login')}
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-12 py-4 md:py-6 max-w-6xl mx-auto space-y-4">
      <Breadcrumbs items={[{ label: t('orders.title') }]} />
      <h1 className="text-xl font-bold section-title text-surface-800 dark:text-surface-200">{t('orders.title')}</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="glass-card rounded-xl p-4 space-y-3">
              <div className="h-4 w-1/3 rounded animate-shimmer" />
              <div className="h-12 rounded animate-shimmer" />
              <div className="h-4 w-1/2 rounded animate-shimmer" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <ShoppingBag className="w-16 h-16 mx-auto text-surface-300 dark:text-surface-600" />
          <p className="text-surface-400">{t('orders.empty')}</p>
          <Link href="/">
            <motion.button whileTap={{ scale: 0.95 }} className="gradient-primary text-white px-6 py-3 rounded-xl font-semibold">
              {t('orders.startShopping')}
            </motion.button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} className="glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-surface-200 dark:border-surface-700">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-surface-400">{t('orders.orderNumber')}</p>
                    <p className="text-xs font-mono font-bold text-surface-600 dark:text-surface-400">
                      {order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-surface-400">{formatDateTime(order.created_at)}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                      ${order.status === 'delivered' ? 'bg-success/10 text-success' :
                        order.status === 'cancelled' ? 'bg-error/10 text-error' :
                        'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'}`}>
                      {t(`orders.status.${order.status}`)}
                    </span>
                  </div>
                </div>
                {order.status !== 'cancelled' && <OrderTimeline currentStatus={order.status} />}
              </div>

              <div className="p-4 space-y-2">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-surface-100 dark:bg-surface-800 overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="w-full h-full gradient-primary opacity-10" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-surface-700 dark:text-surface-300 truncate">{item.product_name}</p>
                      <p className="text-[10px] text-surface-400">
                        {[item.option_label, item.color_name].filter(Boolean).join(' • ')} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-surface-600 dark:text-surface-400">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 bg-surface-50 dark:bg-surface-900/50 flex items-center justify-between">
                {order.discount_amount > 0 && (
                  <span className="text-[10px] text-success">{t('orders.discount')} -{formatPrice(order.discount_amount)}</span>
                )}
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-surface-400">{t('orders.totalPaid')}</p>
                  <p className="font-bold gradient-text">{formatPrice(order.total_amount)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
