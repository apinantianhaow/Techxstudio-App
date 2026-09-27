'use client';

import { useState, useEffect } from 'react';
import { Package, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import OrderTimeline from '@/components/orders/OrderTimeline';
import { DeviceArt, deviceKindFor } from '@/components/product/ProductVisual';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/LanguageContext';
import { formatPrice, formatDateTime, errorMessage } from '@/lib/utils';
import type { Order } from '@/types';
import { toast } from 'sonner';

const spinner = 'h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent';

export default function OrdersPage() {
  const { isLoggedIn, authFetch, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      const res = await authFetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'cancelled' as const } : o));
      toast.success(t('orders.cancelSuccess'));
    } catch (err) {
      toast.error(errorMessage(err) || t('orders.cancelFailed'));
    } finally {
      setCancellingId(null);
      setConfirmCancelId(null);
    }
  };

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
      <div className="page-width py-24 text-center md:py-32">
        <Package className="mx-auto h-14 w-14 text-ink-3" strokeWidth={1.25} />
        <h1 className="t-headline mt-6 text-ink">{t('orders.loginRequired')}</h1>
        <p className="mt-3 text-[17px] text-ink-2">{t('orders.loginRequiredDesc')}</p>
        <Link href="/account" className="btn btn-primary mt-8">{t('account.login')}</Link>
      </div>
    );
  }

  const statusStyle = (status: Order['status']) =>
    status === 'delivered' ? 'bg-success/12 text-success'
      : status === 'cancelled' ? 'bg-danger/10 text-danger'
      : 'bg-accent/10 text-accent dark:text-link';

  return (
    <div className="min-h-[calc(100dvh-2.75rem)] bg-canvas-alt pb-20">
      <div className="mx-auto max-w-[880px] px-5 md:px-8">
        <h1 className="t-headline pt-12 pb-8 text-ink md:pt-16">{t('orders.title')}</h1>

        {loading ? (
          <div className="space-y-5">
            {[1, 2].map(i => (
              <div key={i} className="card space-y-4 p-6">
                <div className="h-4 w-1/3 rounded-full animate-shimmer" />
                <div className="h-12 rounded-control animate-shimmer" />
                <div className="h-4 w-1/2 rounded-full animate-shimmer" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="card py-20 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-ink-3" strokeWidth={1.25} />
            <p className="mt-4 text-[17px] text-ink-2">{t('orders.empty')}</p>
            <Link href="/" className="btn btn-primary mt-6">{t('orders.startShopping')}</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order, i) => (
              <motion.article key={order.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }} className="card overflow-hidden">
                <header className="flex flex-wrap items-start justify-between gap-3 p-6 pb-5">
                  <div>
                    <p className="text-[12px] text-ink-2">{t('orders.orderNumber')}</p>
                    <p className="text-[17px] font-semibold tracking-wide text-ink">
                      {order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-3">{formatDateTime(order.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${statusStyle(order.status)}`}>
                    {t(`orders.status.${order.status}`)}
                  </span>
                </header>

                {order.status !== 'cancelled' && (
                  <div className="px-6 pb-6">
                    <OrderTimeline currentStatus={order.status} />
                  </div>
                )}

                <ul className="mx-6 border-t border-line">
                  {order.order_items?.map((item) => (
                    <li key={item.id} className="flex items-center gap-4 border-b border-line py-4 last:border-b-0">
                      <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-canvas-alt p-2">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.product_name} className="h-full w-full object-contain" />
                        ) : (
                          <DeviceArt kind={deviceKindFor({ name: item.product_name })} className="h-full w-full" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink">{item.product_name}</span>
                        <span className="block text-[13px] text-ink-2">
                          {[item.option_label, item.color_name].filter(Boolean).join(' · ')} × {item.quantity}
                        </span>
                      </span>
                      <span className="text-[15px] text-ink">{formatPrice(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>

                <footer className="flex flex-wrap items-center justify-between gap-3 bg-fill/60 px-6 py-4">
                  <div className="flex items-center gap-4">
                    {order.discount_amount > 0 && (
                      <span className="text-[13px] text-success">{t('orders.discount')} −{formatPrice(order.discount_amount)}</span>
                    )}
                    {order.status === 'confirmed' && (
                      confirmCancelId === order.id ? (
                        <span className="flex items-center gap-2">
                          <button onClick={() => handleCancelOrder(order.id)} disabled={cancellingId === order.id}
                            className="btn btn-sm bg-danger text-white hover:opacity-90">
                            {cancellingId === order.id ? <span className={spinner} /> : t('orders.confirmCancel')}
                          </button>
                          <button onClick={() => setConfirmCancelId(null)} className="btn btn-sm btn-tinted">
                            {t('common.cancel')}
                          </button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmCancelId(order.id)} className="text-[14px] text-danger hover:underline">
                          {t('orders.cancelOrder')}
                        </button>
                      )
                    )}
                  </div>
                  <p className="ml-auto text-right">
                    <span className="mr-2 text-[13px] text-ink-2">{t('orders.totalPaid')}</span>
                    <span className="text-[19px] font-semibold text-ink">{formatPrice(order.total_amount)}</span>
                  </p>
                </footer>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
