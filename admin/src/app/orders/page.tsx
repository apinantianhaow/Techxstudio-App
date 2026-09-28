'use client';

import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useApiData } from '@/lib/useApiData';
import PageHeader, { StateMessage } from '@/components/ui/PageHeader';
import { PageSpinner } from '@/components/ui/Spinner';
import { ORDER_STATUSES, PAYMENT_METHODS } from '@/lib/catalog';
import { errorMessage, formatDateTime, formatPrice, plural } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types';

const orderNumber = (id: string) => id.slice(0, 8).toUpperCase();

export default function OrdersPage() {
  const { api } = useAuth();
  const { data, setData, error, loading } = useApiData<{ orders: Order[] }>('/api/admin/orders');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const counts = useMemo(() => {
    const byStatus: Partial<Record<OrderStatus, number>> = {};
    for (const o of orders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    return byStatus;
  }, [orders]);
  const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total_amount, 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) =>
      (status === 'all' || o.status === status) &&
      (!q || orderNumber(o.id).toLowerCase().includes(q) ||
        o.users?.email.toLowerCase().includes(q) || o.users?.username?.toLowerCase().includes(q) ||
        o.users?.full_name?.toLowerCase().includes(q)));
  }, [orders, status, query]);

  const setOrderStatus = (id: string, next: OrderStatus) =>
    setData((prev) => prev && { orders: prev.orders.map((o) => (o.id === id ? { ...o, status: next } : o)) });

  const handleStatus = async (order: Order, next: OrderStatus) => {
    setUpdatingId(order.id);
    setOrderStatus(order.id, next);
    try {
      await api(`/api/admin/orders/${order.id}`, { method: 'PATCH', body: { status: next } });
      toast.success(`Order #${orderNumber(order.id)} → ${ORDER_STATUSES.find((s) => s.value === next)?.label}`);
    } catch (err) {
      setOrderStatus(order.id, order.status);
      toast.error(errorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={data && <>{plural(orders.length, 'order')} · <span className="tabular">{formatPrice(revenue)}</span> revenue (excluding cancelled)</>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Order no., customer" aria-label="Search orders" className="field pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setStatus('all')} aria-pressed={status === 'all'} className="chip">All</button>
          {ORDER_STATUSES.map((s) => (
            <button key={s.value} onClick={() => setStatus(s.value)} aria-pressed={status === s.value} className="chip">
              {s.label} <span className="tabular opacity-60">{counts[s.value] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <PageSpinner />
      ) : error && !data ? (
        <StateMessage title="Couldn't load orders">{error}</StateMessage>
      ) : visible.length === 0 ? (
        <StateMessage title={orders.length ? 'No orders match' : 'No orders yet'}>
          {orders.length ? 'Try a different search or status.' : 'Orders placed in the store show up here.'}
        </StateMessage>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[760px]">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => {
                const items = o.order_items ?? [];
                const quantity = items.reduce((n, i) => n + i.quantity, 0);
                const open = expanded === o.id;
                const dot = ORDER_STATUSES.find((s) => s.value === o.status)?.dot ?? '';
                return (
                  <Fragment key={o.id}>
                    <tr>
                      <td>
                        <span className="font-mono font-medium">#{orderNumber(o.id)}</span>
                        <span className="block text-[12px] text-ink-3">{formatDateTime(o.created_at)}</span>
                      </td>
                      <td className="max-w-[220px]">
                        <span className="block truncate">
                          {o.users?.full_name || '—'}
                          {o.users?.username && <span className="ml-1.5 text-ink-3">@{o.users.username}</span>}
                        </span>
                        <span className="block truncate text-[12px] text-ink-3">{o.users?.email ?? 'Deleted account'}</span>
                      </td>
                      <td className="max-w-[260px]">
                        <span className="block truncate">{items[0]?.product_name ?? '—'}{items.length > 1 && ` +${items.length - 1} more`}</span>
                        <span className="block text-[12px] text-ink-3">{plural(quantity, 'item')}</span>
                      </td>
                      <td className="tabular text-right font-medium">{formatPrice(o.total_amount)}</td>
                      <td>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
                          <select value={o.status} disabled={updatingId === o.id} onChange={(e) => handleStatus(o, e.target.value as OrderStatus)}
                            aria-label={`Status of order ${orderNumber(o.id)}`} className="field w-auto py-1.5 text-[13px]">
                            {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </span>
                      </td>
                      <td>
                        <button onClick={() => setExpanded(open ? null : o.id)} aria-expanded={open}
                          aria-label={`${open ? 'Hide' : 'Show'} details of order ${orderNumber(o.id)}`} className="icon-btn">
                          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                    </tr>
                    {open && <OrderDetails order={o} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function OrderDetails({ order }: { order: Order }) {
  const items = order.order_items ?? [];
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return (
    <tr className="!bg-canvas-alt">
      <td colSpan={6} className="!py-5">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-4">
                <span className="min-w-0">
                  <span className="font-medium">{item.product_name}</span>
                  <span className="text-ink-3">
                    {[item.option_label, item.color_name].filter(Boolean).map((v) => ` · ${v}`)}
                  </span>
                </span>
                <span className="tabular shrink-0 text-ink-2">
                  {item.quantity} × {formatPrice(item.price)} = <span className="text-ink">{formatPrice(item.price * item.quantity)}</span>
                </span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 text-[13px]">
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            {order.discount_amount > 0 && (
              <Row label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`} value={`−${formatPrice(order.discount_amount)}`} />
            )}
            <Row label="Total" value={<strong>{formatPrice(order.total_amount)}</strong>} />
            <Row label="Payment" value={PAYMENT_METHODS[order.payment_method ?? ''] ?? order.payment_method ?? '—'} />
            <div className="border-t border-hairline pt-2">
              <dt className="text-ink-3">Ship to</dt>
              <dd className="whitespace-pre-line">{order.shipping_address || '—'}</dd>
            </div>
          </dl>
        </div>
      </td>
    </tr>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-3">{label}</dt>
      <dd className="tabular text-right">{value}</dd>
    </div>
  );
}
