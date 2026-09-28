'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useApiData } from '@/lib/useApiData';
import PageHeader, { StateMessage } from '@/components/ui/PageHeader';
import { PageSpinner } from '@/components/ui/Spinner';
import Switch from '@/components/ui/Switch';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ProductThumb from '@/components/products/ProductThumb';
import { CATEGORY_LABELS } from '@/lib/catalog';
import { STORE_URL, calcDiscountedPrice, errorMessage, formatPrice, plural } from '@/lib/utils';
import type { Product, ProductCategory } from '@/types';

type StatusFilter = 'all' | 'active' | 'hidden';

export default function ProductsPage() {
  const { api } = useAuth();
  const { data, setData, error, loading } = useApiData<{ products: Product[] }>('/api/admin/products');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const products = useMemo(() => data?.products ?? [], [data]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) =>
      (category === 'all' || p.category === category) &&
      (status === 'all' || p.is_active === (status === 'active')) &&
      (!q || p.name.toLowerCase().includes(q) || p.slug.includes(q)));
  }, [products, query, category, status]);

  const activeCount = products.filter((p) => p.is_active).length;

  const replaceProduct = (id: string, patch: Partial<Product>) =>
    setData((prev) => prev && { products: prev.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const handleToggle = async (product: Product, isActive: boolean) => {
    setTogglingId(product.id);
    replaceProduct(product.id, { is_active: isActive });
    try {
      await api(`/api/admin/products/${product.id}`, { method: 'PATCH', body: { is_active: isActive } });
      toast.success(isActive ? `${product.name} is now visible in the store` : `${product.name} is now hidden`);
    } catch (err) {
      replaceProduct(product.id, { is_active: !isActive });
      toast.error(errorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/api/admin/products/${deleting.id}`, { method: 'DELETE' });
      setData((prev) => prev && { products: prev.products.filter((p) => p.id !== deleting.id) });
      toast.success(`Deleted ${deleting.name}`);
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
        title="Products"
        subtitle={data && `${plural(products.length, 'product')} · ${activeCount} visible · ${products.length - activeCount} hidden`}
        actions={
          <Link href="/products/new" className="btn btn-primary">
            <Plus className="h-4 w-4" /> New product
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or slug" aria-label="Search products" className="field pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...Object.keys(CATEGORY_LABELS)] as const).map((c) => (
            <button key={c} onClick={() => setCategory(c as ProductCategory | 'all')} aria-pressed={category === c} className="chip">
              {c === 'all' ? 'All' : CATEGORY_LABELS[c as ProductCategory]}
            </button>
          ))}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Visibility" className="field ml-auto w-auto">
          <option value="all">Any visibility</option>
          <option value="active">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      {loading && !data ? (
        <PageSpinner />
      ) : error && !data ? (
        <StateMessage title="Couldn't load products">{error}</StateMessage>
      ) : visible.length === 0 ? (
        <StateMessage title={products.length ? 'No products match' : 'No products yet'}>
          {products.length ? 'Try a different search or filter.' : <Link href="/products/new" className="link">Create the first product</Link>}
        </StateMessage>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[760px]">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="text-right">Price</th>
                <th>Variants</th>
                <th>Rating</th>
                <th>Visible</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const colors = p.product_colors ?? [];
                const options = p.product_options ?? [];
                const basePrice = options[0]?.price || p.original_price;
                return (
                  <tr key={p.id} className={p.is_active ? '' : 'text-ink-3'}>
                    <td>
                      <Link href={`/products/${p.id}`} className="flex items-center gap-3">
                        <ProductThumb imageUrl={colors[0]?.image_url} hex={colors[0]?.hex} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-medium text-ink">
                            {p.name}
                            {p.badge && <span className="pill pill-accent">{p.badge}</span>}
                          </span>
                          <span className="block font-mono text-[12px] text-ink-3">{p.slug}</span>
                        </span>
                      </Link>
                    </td>
                    <td>{CATEGORY_LABELS[p.category] ?? p.category}</td>
                    <td className="tabular text-right">
                      <span className="font-medium text-ink">{formatPrice(calcDiscountedPrice(basePrice, p.sale_percent))}</span>
                      {p.sale_percent > 0 && (
                        <span className="block text-[12px] text-ink-3">
                          <span className="line-through">{formatPrice(basePrice)}</span> −{p.sale_percent}%
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="flex -space-x-1">
                          {colors.slice(0, 5).map((c) => (
                            <span key={c.id} title={c.name} className="h-4 w-4 rounded-full ring-2 ring-card" style={{ background: c.hex }} />
                          ))}
                        </span>
                        <span className="text-[12px] text-ink-3">
                          {plural(colors.length, 'color')} · {plural(options.length, 'option')}
                        </span>
                      </div>
                    </td>
                    <td className="tabular whitespace-nowrap">
                      {p.reviews_count > 0 ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-current text-[#ff9f0a]" /> {p.rating.toFixed(1)}
                          <span className="text-ink-3">({p.reviews_count.toLocaleString()})</span>
                        </span>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td>
                      <Switch checked={p.is_active} disabled={togglingId === p.id}
                        onChange={(on) => handleToggle(p, on)} label={`Show ${p.name} in the store`} />
                    </td>
                    <td>
                      <div className="flex justify-end">
                        <Link href={`/products/${p.id}`} className="icon-btn" aria-label={`Edit ${p.name}`} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Link>
                        {p.is_active && (
                          <a href={`${STORE_URL}/product/${p.id}`} target="_blank" rel="noreferrer" className="icon-btn"
                            aria-label={`View ${p.name} in the store`} title="View in store">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button onClick={() => setDeleting(p)} className="icon-btn icon-btn-danger" aria-label={`Delete ${p.name}`} title="Delete">
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

      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? 'product'}?`}
        confirmLabel="Delete"
        busy={deleteBusy}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      >
        <p>This permanently removes the product with its colors, options, specs and reviews, and takes it out of every customer&apos;s cart and wishlist. Past orders keep their line items.</p>
        <p>To take it off the store but keep everything, turn off <strong className="text-ink">Visible</strong> instead.</p>
      </ConfirmDialog>
    </>
  );
}
