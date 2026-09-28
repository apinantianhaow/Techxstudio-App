'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useApiData } from '@/lib/useApiData';
import PageHeader, { StateMessage } from '@/components/ui/PageHeader';
import { PageSpinner } from '@/components/ui/Spinner';
import Switch from '@/components/ui/Switch';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CouponForm, { couponToInput } from '@/components/coupons/CouponForm';
import { errorMessage, formatDate, formatPrice, plural } from '@/lib/utils';
import type { Coupon } from '@/types';

/** Same rules the API applies at checkout. */
function couponState(c: Coupon): { label: string; pill: string } {
  if (!c.is_active) return { label: 'Off', pill: '' };
  if (c.expires_at && new Date(c.expires_at) < new Date()) return { label: 'Expired', pill: 'pill-danger' };
  if (c.max_uses && c.current_uses >= c.max_uses) return { label: 'Used up', pill: 'pill-warning' };
  return { label: 'Live', pill: 'pill-success' };
}

export default function CouponsPage() {
  const { api } = useAuth();
  const { data, setData, error, loading } = useApiData<{ coupons: Coupon[] }>('/api/admin/coupons');
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const coupons = data?.coupons ?? [];
  const liveCount = coupons.filter((c) => couponState(c).label === 'Live').length;

  const upsert = (coupon: Coupon) =>
    setData((prev) => {
      const list = prev?.coupons ?? [];
      return { coupons: list.some((c) => c.id === coupon.id) ? list.map((c) => (c.id === coupon.id ? coupon : c)) : [coupon, ...list] };
    });

  const handleToggle = async (coupon: Coupon, isActive: boolean) => {
    setTogglingId(coupon.id);
    upsert({ ...coupon, is_active: isActive });
    try {
      const res = await api<{ coupon: Coupon }>(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        body: { ...couponToInput(coupon), is_active: isActive },
      });
      upsert(res.coupon);
      toast.success(`${coupon.code} is ${isActive ? 'on' : 'off'}`);
    } catch (err) {
      upsert(coupon);
      toast.error(errorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/api/admin/coupons/${deleting.id}`, { method: 'DELETE' });
      setData((prev) => prev && { coupons: prev.coupons.filter((c) => c.id !== deleting.id) });
      toast.success(`Deleted ${deleting.code}`);
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Coupons"
        subtitle={data && `${plural(coupons.length, 'coupon')} · ${liveCount} live`}
        actions={
          <button onClick={() => setEditing('new')} className="btn btn-primary">
            <Plus className="h-4 w-4" /> New coupon
          </button>
        }
      />

      {loading && !data ? (
        <PageSpinner />
      ) : error && !data ? (
        <StateMessage title="Couldn't load coupons">{error}</StateMessage>
      ) : coupons.length === 0 ? (
        <StateMessage title="No coupons yet">
          <button onClick={() => setEditing('new')} className="link">Create the first coupon</button>
        </StateMessage>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[760px]">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th className="text-right">Min. purchase</th>
                <th>Usage</th>
                <th>Expires</th>
                <th>Status</th>
                <th>On</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const state = couponState(c);
                const usage = c.max_uses ? Math.min(1, c.current_uses / c.max_uses) : 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <button onClick={() => setEditing(c)} className="font-mono font-medium tracking-wide text-ink hover:text-link">
                        {c.code}
                      </button>
                    </td>
                    <td className="tabular">
                      {c.discount_percent > 0 ? (
                        <>
                          <span className="font-medium">{c.discount_percent}% off</span>
                          {c.max_discount != null && <span className="block text-[12px] text-ink-3">up to {formatPrice(c.max_discount)}</span>}
                        </>
                      ) : (
                        <span className="font-medium">{formatPrice(c.discount_amount)} off</span>
                      )}
                    </td>
                    <td className="tabular text-right">{c.min_purchase > 0 ? formatPrice(c.min_purchase) : <span className="text-ink-3">—</span>}</td>
                    <td className="tabular">
                      <span>{c.current_uses.toLocaleString()} / {c.max_uses ? c.max_uses.toLocaleString() : '∞'}</span>
                      {c.max_uses != null && (
                        <span className="mt-1 block h-1 w-20 overflow-hidden rounded-full bg-fill-strong">
                          <span className="block h-full rounded-full bg-accent" style={{ width: `${usage * 100}%` }} />
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">{c.expires_at ? formatDate(c.expires_at) : <span className="text-ink-3">Never</span>}</td>
                    <td><span className={`pill ${state.pill}`}>{state.label}</span></td>
                    <td>
                      <Switch checked={c.is_active} disabled={togglingId === c.id} onChange={(on) => handleToggle(c, on)} label={`${c.code} active`} />
                    </td>
                    <td>
                      <div className="flex justify-end">
                        <button onClick={() => setEditing(c)} className="icon-btn" aria-label={`Edit ${c.code}`} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleting(c)} className="icon-btn icon-btn-danger" aria-label={`Delete ${c.code}`} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New coupon' : `Edit ${editing?.code ?? ''}`}>
        <CouponForm
          key={editing === 'new' ? 'new' : editing?.id}
          coupon={editing === 'new' || editing === null ? undefined : editing}
          onSaved={(coupon) => { upsert(coupon); setEditing(null); }}
          onCancel={() => setEditing(null)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.code ?? 'coupon'}?`}
        confirmLabel="Delete"
        busy={deleteBusy}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      >
        <p>Customers won&apos;t be able to use this code any more. Orders that already used it keep their discount.</p>
        <p>To pause it instead, switch it off.</p>
      </ConfirmDialog>
    </>
  );
}
