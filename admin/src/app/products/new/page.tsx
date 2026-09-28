import PageHeader from '@/components/ui/PageHeader';
import ProductForm from '@/components/products/ProductForm';

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="New product" back={{ href: '/products', label: 'Products' }} />
      <ProductForm />
    </>
  );
}
