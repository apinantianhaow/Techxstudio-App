'use client';

import { use } from 'react';
import Link from 'next/link';
import PageHeader, { StateMessage } from '@/components/ui/PageHeader';
import { PageSpinner } from '@/components/ui/Spinner';
import ProductForm from '@/components/products/ProductForm';
import { useApiData } from '@/lib/useApiData';
import type { Product } from '@/types';

export default function EditProductPage({ params }: PageProps<'/products/[id]'>) {
  const { id } = use(params);
  const { data, error, loading } = useApiData<{ product: Product }>(`/api/admin/products/${id}`);

  if (loading && !data) return <PageSpinner />;
  if (!data) {
    return (
      <StateMessage title="Product not found">
        {error} <Link href="/products" className="link">Back to products</Link>
      </StateMessage>
    );
  }

  const { product } = data;
  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={<span className="font-mono text-[13px]">{product.slug}</span>}
        back={{ href: '/products', label: 'Products' }}
      />
      <ProductForm key={product.updated_at} product={product} />
    </>
  );
}
