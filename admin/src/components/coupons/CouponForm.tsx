'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Switch from '@/components/ui/Switch';
import Spinner from '@/components/ui/Spinner';
import { errorMessage, toNumber } from '@/lib/utils';
import type { Coupon, CouponInput } from '@/types';

type DiscountType = 'percent' | 'amount';

/** The coupon as a PUT body (used by the list's on/off switch). */
export function couponToInput(c: Coupon): CouponInput {
  return {
    code: c.code,
    discount_percent: c.discount_percent,
    discount_amount: c.discount_amount,
    min_purchase: c.min_purchase,
    max_discount: c.max_discount,
    max_uses: c.max_uses,
    expires_at: c.expires_at,
    is_active: c.is_active,
  };
}

/** ISO date → value for <input type="datetime-local"> in the admin's time zone. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

interface CouponFormProps {
  coupon?: Coupon;
  onSaved: (coupon: Coupon) => void;
  onCancel: () => void;
}

export default function CouponForm({ coupon, onSaved, onCancel }: CouponFormProps) {
  const { api } = useAuth();
  const [code, setCode] = useState(coupon?.code ?? '');
  const [type, setType] = useState<DiscountType>(coupon && coupon.discount_amount > 0 ? 'amount' : 'percent');
  const [value, setValue] = useState(coupon ? String(coupon.discount_amount > 0 ? coupon.discount_amount : coupon.discount_percent) : '');
  const [maxDiscount, setMaxDiscount] = useState(coupon?.max_discount != null ? String(coupon.max_discount) : '');
  const [minPurchase, setMinPurchase] = useState(coupon ? String(coupon.min_purchase) : '0');
  const [maxUses, setMaxUses] = useState(coupon?.max_uses != null ? String(coupon.max_uses) : '');
  const [expires, setExpires] = useState(toLocalInput(coupon?.expires_at));
  const [active, setActive] = useState(coupon?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body: CouponInput = {
      code,
      discount_percent: type === 'percent' ? toNumber(value) : 0,
      discount_amount: type === 'amount' ? toNumber(value) : 0,
      min_purchase: toNumber(minPurchase) ?? 0,
      max_discount: type === 'percent' ? toNumber(maxDiscount) : null,
      max_uses: toNumber(maxUses),
      // datetime-local has no zone: new Date() reads it as local time.
      expires_at: expires ? new Date(expires).toISOString() : null,
      is_active: active,
    };
    try {
      const data = coupon
        ? await api<{ coupon: Coupon }>(`/api/admin/coupons/${coupon.id}`, { method: 'PUT', body })
        : await api<{ coupon: Coupon }>('/api/admin/coupons', { method: 'POST', body });
      toast.success(coupon ? `Saved ${data.coupon.code}` : `Created ${data.coupon.code}`);
      onSaved(data.coupon);
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="code" className="label">Code</label>
        <input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required
          minLength={3} maxLength={32} pattern="[A-Za-z0-9_\-]+" placeholder="NEWYEAR25" autoComplete="off"
          className="field font-mono uppercase tracking-wide" />
        <p className="hint">3–32 characters: A–Z, 0–9, - and _. Customers type it at checkout.</p>
      </div>

      <div>
        <span className="label">Discount</span>
        <div role="group" aria-label="Discount type" className="mb-2 inline-flex rounded-[10px] bg-fill p-0.5">
          {(['percent', 'amount'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} aria-pressed={type === t}
              className="rounded-[8px] px-3 py-1 text-[13px] text-ink-2 transition-colors aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-ink aria-pressed:shadow-card">
              {t === 'percent' ? 'Percent' : 'Fixed amount'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="value" className="label">{type === 'percent' ? 'Percent off' : 'Amount off'}</label>
            <div className="relative">
              {type === 'amount' && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-3">฿</span>}
              <input id="value" type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required
                min={type === 'percent' ? 1 : 0.01} max={type === 'percent' ? 100 : undefined} step={type === 'percent' ? 1 : 0.01}
                className={`field tabular ${type === 'amount' ? 'pl-7' : 'pr-8'}`} />
              {type === 'percent' && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-3">%</span>}
            </div>
          </div>
          {type === 'percent' && (
            <div>
              <label htmlFor="cap" className="label">Max discount</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-3">฿</span>
                <input id="cap" type="number" inputMode="decimal" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)}
                  min={0} step={0.01} placeholder="No cap" className="field tabular pl-7" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="min" className="label">Minimum purchase</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-3">฿</span>
            <input id="min" type="number" inputMode="decimal" value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)}
              min={0} step={0.01} className="field tabular pl-7" />
          </div>
        </div>
        <div>
          <label htmlFor="uses" className="label">Usage limit</label>
          <input id="uses" type="number" inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value)}
            min={1} step={1} placeholder="Unlimited" className="field tabular" />
        </div>
      </div>

      <div>
        <label htmlFor="expires" className="label">Expires</label>
        <input id="expires" type="datetime-local" step={1} value={expires} onChange={(e) => setExpires(e.target.value)} className="field" />
        <p className="hint">Your local time. Leave empty for no expiry.</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-[12px] bg-canvas-alt px-3.5 py-3">
        <div>
          <p className="text-[14px] font-medium">Active</p>
          <p className="text-[12px] text-ink-3">
            {coupon ? `Used ${coupon.current_uses.toLocaleString()} times so far.` : 'Inactive codes are rejected at checkout.'}
          </p>
        </div>
        <Switch checked={active} onChange={setActive} label="Active" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} disabled={saving} className="btn btn-tinted">Cancel</button>
        <button type="submit" disabled={saving} className="btn btn-primary min-w-28">
          {saving ? <Spinner className="h-4 w-4" /> : coupon ? 'Save' : 'Create coupon'}
        </button>
      </div>
    </form>
  );
}
