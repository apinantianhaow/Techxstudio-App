'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Switch from '@/components/ui/Switch';
import Spinner from '@/components/ui/Spinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ProductThumb from '@/components/products/ProductThumb';
import { BADGES, CATEGORY_LABELS, CURATED_LISTS } from '@/lib/catalog';
import { STORE_URL, calcDiscountedPrice, errorMessage, formatDateTime, formatPrice, newKey, slugify, toNumber } from '@/lib/utils';
import type { CuratedList, Product, ProductBadge, ProductCategory, ProductInput } from '@/types';

interface ColorRow { key: string; name: string; hex: string; image_url: string }
interface OptionRow { key: string; label: string; price: string }
interface SpecRow { key: string; spec_key: string; spec_value: string }

/** Numbers are kept as the text the admin typed and converted on save. */
interface FormState {
  name: string;
  slug: string;
  category: ProductCategory;
  description: string;
  badge: ProductBadge | '';
  original_price: string;
  sale_percent: string;
  is_active: boolean;
  curated_lists: CuratedList[];
  colors: ColorRow[];
  options: OptionRow[];
  specs: SpecRow[];
}

function initialState(product?: Product): FormState {
  if (!product) {
    return {
      name: '', slug: '', category: 'phone', description: '', badge: '', original_price: '', sale_percent: '0',
      is_active: true, curated_lists: [], colors: [], options: [], specs: [],
    };
  }
  return {
    name: product.name,
    slug: product.slug,
    category: product.category,
    description: product.description ?? '',
    badge: product.badge ?? '',
    original_price: String(product.original_price),
    sale_percent: String(product.sale_percent),
    is_active: product.is_active,
    curated_lists: product.curated_lists ?? [],
    colors: (product.product_colors ?? []).map((c) => ({ key: c.id, name: c.name, hex: c.hex, image_url: c.image_url ?? '' })),
    options: (product.product_options ?? []).map((o) => ({ key: o.id, label: o.label, price: String(o.price) })),
    specs: (product.product_specs ?? []).map((s) => ({ key: s.id, spec_key: s.spec_key, spec_value: s.spec_value })),
  };
}

function toInput(form: FormState): ProductInput {
  return {
    name: form.name,
    slug: form.slug,
    category: form.category,
    description: form.description,
    badge: form.badge || null,
    original_price: toNumber(form.original_price),
    sale_percent: toNumber(form.sale_percent) ?? 0,
    is_active: form.is_active,
    curated_lists: form.curated_lists,
    product_colors: form.colors.map(({ name, hex, image_url }) => ({ name, hex, image_url })),
    product_options: form.options.map(({ label, price }) => ({ label, price: toNumber(price) })),
    product_specs: form.specs.map(({ spec_key, spec_value }) => ({ spec_key, spec_value })),
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Create (no `product`) or edit form. Saving replaces the product's colors, options and specs. */
export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const { api } = useAuth();
  const [form, setForm] = useState(() => initialState(product));
  // New products follow the name until the slug is edited by hand.
  const [slugEdited, setSlugEdited] = useState(!!product);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = toInput(form);
      if (product) {
        await api(`/api/admin/products/${product.id}`, { method: 'PUT', body });
        toast.success(`Saved ${form.name.trim()}`);
      } else {
        await api('/api/admin/products', { method: 'POST', body });
        toast.success(`Created ${form.name.trim()}`);
      }
      router.push('/products');
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      await api(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      toast.success(`Deleted ${product.name}`);
      router.push('/products');
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  };

  const basePrice = toNumber(form.original_price);
  const salePercent = toNumber(form.sale_percent) ?? 0;
  const salePrice = (price: number | null) => (price && price > 0 ? formatPrice(calcDiscountedPrice(price, salePercent)) : '—');

  return (
    <form onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <Section title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="label">Name</label>
              <input id="name" value={form.name} required maxLength={200} className="field" placeholder="iPhone 17 Pro"
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, slug: slugEdited ? f.slug : slugify(name) }));
                }} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="slug" className="label">Slug</label>
              <input id="slug" value={form.slug} required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*"
                className="field font-mono text-[14px]" placeholder="iphone-17-pro"
                onChange={(e) => { setSlugEdited(true); set('slug', e.target.value.toLowerCase()); }} />
              <p className="hint">Unique. Lowercase letters, numbers and dashes.</p>
            </div>
            <div>
              <label htmlFor="category" className="label">Category</label>
              <select id="category" value={form.category} className="field"
                onChange={(e) => set('category', e.target.value as ProductCategory)}>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="badge" className="label">Badge</label>
              <select id="badge" value={form.badge} className="field"
                onChange={(e) => set('badge', e.target.value as ProductBadge | '')}>
                <option value="">None</option>
                {BADGES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="label">Description</label>
              <textarea id="description" value={form.description} rows={4} maxLength={5000} className="field resize-y"
                onChange={(e) => set('description', e.target.value)} />
            </div>
          </div>
        </Section>

        <Section
          title="Colors"
          description="The first color is the one shown on product cards. Image paths like /images/x.png are served by the storefront."
          action={<AddButton label="Add color" onClick={() => set('colors', [...form.colors, { key: newKey(), name: '', hex: '#1D1D1F', image_url: '' }])} />}
        >
          <RowList
            rows={form.colors}
            onChange={(colors) => set('colors', colors)}
            itemName="color"
            emptyText="No colors. The store will show a generic illustration."
            renderRow={(c, update, i) => (
              <div className="grid gap-2 sm:grid-cols-[auto_7.5rem_minmax(0,1fr)]">
                <input type="color" value={HEX.test(c.hex) ? c.hex : '#000000'} aria-label={`Color ${i + 1} swatch`}
                  onChange={(e) => update({ hex: e.target.value.toUpperCase() })}
                  className="h-[38px] w-[38px] cursor-pointer rounded-[10px] border border-line bg-card p-1" />
                <input value={c.hex} onChange={(e) => update({ hex: e.target.value })} aria-label={`Color ${i + 1} hex`}
                  required pattern="#[0-9A-Fa-f]{6}" placeholder="#1D1D1F" className="field font-mono text-[14px]" />
                <input value={c.name} onChange={(e) => update({ name: e.target.value })} aria-label={`Color ${i + 1} name`}
                  required maxLength={50} placeholder="Name, e.g. Desert Titanium" className="field" />
                <div className="flex items-center gap-2 sm:col-span-3">
                  <ProductThumb imageUrl={c.image_url} hex={HEX.test(c.hex) ? c.hex : null} className="h-[38px] w-[38px]" />
                  <input value={c.image_url} onChange={(e) => update({ image_url: e.target.value })} aria-label={`Color ${i + 1} image URL`}
                    maxLength={500} placeholder="Image URL (optional)" className="field" />
                </div>
              </div>
            )}
          />
        </Section>

        <Section
          title="Options"
          description="Storage sizes or models. Each option has its own price before the sale discount; with no options, the base price is used."
          action={<AddButton label="Add option" onClick={() => set('options', [...form.options, { key: newKey(), label: '', price: form.original_price }])} />}
        >
          <RowList
            rows={form.options}
            onChange={(options) => set('options', options)}
            itemName="option"
            emptyText="No options."
            renderRow={(o, update, i) => (
              <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_7rem]">
                <input value={o.label} onChange={(e) => update({ label: e.target.value })} aria-label={`Option ${i + 1} label`}
                  required maxLength={50} placeholder="Label, e.g. 256GB" className="field" />
                <PriceInput value={o.price} onChange={(price) => update({ price })} label={`Option ${i + 1} price`} />
                <span className="tabular text-[13px] text-ink-3" title="Price customers pay after the sale discount">
                  → {salePrice(toNumber(o.price))}
                </span>
              </div>
            )}
          />
        </Section>

        <Section
          title="Specs"
          description="Shown as a table on the product page."
          action={<AddButton label="Add spec" onClick={() => set('specs', [...form.specs, { key: newKey(), spec_key: '', spec_value: '' }])} />}
        >
          <RowList
            rows={form.specs}
            onChange={(specs) => set('specs', specs)}
            itemName="spec"
            emptyText="No specs."
            renderRow={(sp, update, i) => (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <input value={sp.spec_key} onChange={(e) => update({ spec_key: e.target.value })} aria-label={`Spec ${i + 1} name`}
                  required maxLength={100} placeholder="Name, e.g. Chip" className="field" />
                <input value={sp.spec_value} onChange={(e) => update({ spec_value: e.target.value })} aria-label={`Spec ${i + 1} value`}
                  required maxLength={500} placeholder="Value, e.g. A19 Pro" className="field" />
              </div>
            )}
          />
        </Section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-10">
        <Section title="Visibility">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[15px] font-medium">Visible in store</p>
              <p className="text-[13px] text-ink-3">Hidden products don&apos;t appear in lists, search or product pages.</p>
            </div>
            <Switch checked={form.is_active} onChange={(on) => set('is_active', on)} label="Visible in store" />
          </div>
          <fieldset className="mt-5 border-t border-hairline pt-4">
            <legend className="label float-left w-full">Home page shelves</legend>
            <div className="clear-both space-y-2.5">
              {CURATED_LISTS.map((list) => (
                <label key={list.value} className="flex cursor-pointer items-start gap-2.5">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--accent)]"
                    checked={form.curated_lists.includes(list.value)}
                    onChange={(e) => set('curated_lists', e.target.checked
                      ? [...form.curated_lists, list.value]
                      : form.curated_lists.filter((l) => l !== list.value))} />
                  <span>
                    <span className="block text-[14px]">{list.label}</span>
                    <span className="block text-[12px] text-ink-3">{list.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section title="Pricing">
          <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
            <div>
              <label htmlFor="price" className="label">Base price</label>
              <PriceInput id="price" value={form.original_price} onChange={(v) => set('original_price', v)} required />
            </div>
            <div>
              <label htmlFor="sale" className="label">Sale</label>
              <div className="relative">
                <input id="sale" type="number" inputMode="numeric" min={0} max={99} step={1} value={form.sale_percent}
                  onChange={(e) => set('sale_percent', e.target.value)} className="field tabular pr-7" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-3">%</span>
              </div>
            </div>
          </div>
          <p className="mt-4 rounded-[12px] bg-canvas-alt px-3.5 py-3 text-[13px] text-ink-2">
            Customers pay{' '}
            <strong className="tabular text-[15px] text-ink">{salePrice(toNumber(form.options[0]?.price ?? '') || basePrice)}</strong>
            {salePercent > 0 && <> after the {salePercent}% sale</>}
            {form.options.length > 0 && <> for {form.options[0].label || 'the first option'}</>}.
          </p>
        </Section>

        <div className="space-y-3">
          <button type="submit" disabled={saving} className="btn btn-primary btn-block">
            {saving ? <Spinner className="h-5 w-5" /> : product ? 'Save changes' : 'Create product'}
          </button>
          <Link href="/products" className="btn btn-tinted btn-block">Cancel</Link>
        </div>

        {product && (
          <div className="space-y-3 border-t border-hairline pt-5 text-[13px] text-ink-3">
            <p>
              Rating {product.rating.toFixed(1)} from {product.reviews_count.toLocaleString()} reviews<br />
              Created {formatDateTime(product.created_at)}<br />
              Updated {formatDateTime(product.updated_at)}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {product.is_active && (
                <a href={`${STORE_URL}/product/${product.id}`} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">
                  View in store <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1 text-danger hover:underline">
                <Trash2 className="h-3.5 w-3.5" /> Delete product
              </button>
            </div>
          </div>
        )}
      </aside>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${product?.name ?? 'product'}?`}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      >
        <p>This permanently removes the product with its colors, options, specs and reviews, and takes it out of every customer&apos;s cart and wishlist. Past orders keep their line items.</p>
        <p>To take it off the store but keep everything, turn off <strong className="text-ink">Visible in store</strong> instead.</p>
      </ConfirmDialog>
    </form>
  );
}

// ── Building blocks ─────────────────────────────────────────────

function Section({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-tinted btn-sm shrink-0">
      <Plus className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function PriceInput({ id, value, onChange, label, required = true }: {
  id?: string; value: string; onChange: (value: string) => void; label?: string; required?: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-3">฿</span>
      <input id={id} type="number" inputMode="decimal" min={0.01} step={0.01} value={value} required={required}
        aria-label={label} onChange={(e) => onChange(e.target.value)} className="field tabular pl-7" />
    </div>
  );
}

interface RowListProps<T extends { key: string }> {
  rows: T[];
  onChange: (rows: T[]) => void;
  renderRow: (row: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  itemName: string;
  emptyText: string;
}

/** Editable list whose order is saved as sort_order. */
function RowList<T extends { key: string }>({ rows, onChange, renderRow, itemName, emptyText }: RowListProps<T>) {
  if (rows.length === 0) {
    return <p className="rounded-[12px] border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-3">{emptyText}</p>;
  }

  const move = (from: number, to: number) => {
    const next = [...rows];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  return (
    <ol className="space-y-2">
      {rows.map((row, i) => (
        <li key={row.key} className="flex items-start gap-1.5 rounded-[14px] bg-canvas-alt p-2.5">
          <span className="w-5 shrink-0 pt-2.5 text-center text-[12px] tabular text-ink-3">{i + 1}</span>
          <div className="min-w-0 flex-1">
            {renderRow(row, (patch) => onChange(rows.map((r) => (r.key === row.key ? { ...r, ...patch } : r))), i)}
          </div>
          <div className="flex shrink-0 flex-col sm:flex-row sm:pt-[3px]">
            <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="icon-btn" aria-label={`Move ${itemName} ${i + 1} up`}>
              <ArrowUp className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => move(i, i + 1)} disabled={i === rows.length - 1} className="icon-btn" aria-label={`Move ${itemName} ${i + 1} down`}>
              <ArrowDown className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onChange(rows.filter((r) => r.key !== row.key))} className="icon-btn icon-btn-danger" aria-label={`Remove ${itemName} ${i + 1}`}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
