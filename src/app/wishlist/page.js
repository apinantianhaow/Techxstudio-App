'use client';

import { useState, useEffect } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import ProductCard from '@/components/product/ProductCard';
import ProductQuickView from '@/components/product/ProductQuickView';
import useWishlistStore from '@/stores/useWishlistStore';

export default function WishlistPage() {
  const { favorites } = useWishlistStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  useEffect(() => {
    async function fetchFavorites() {
      if (favorites.length === 0) { setLoading(false); return; }
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        const favProducts = (data.products || []).filter((p) => favorites.includes(p.id));
        setProducts(favProducts);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchFavorites();
  }, [favorites]);

  if (!loading && products.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <Breadcrumbs items={[{ label: 'สินค้าที่ชอบ' }]} />
        <div className="text-center py-20 space-y-4">
          <Heart className="w-20 h-20 mx-auto text-surface-300 dark:text-surface-600" />
          <h2 className="text-xl font-bold text-surface-700 dark:text-surface-300">ยังไม่มีสินค้าที่ชอบ</h2>
          <p className="text-sm text-surface-400">กดหัวใจเพื่อเพิ่มสินค้าที่ชื่นชอบ</p>
          <Link href="/">
            <motion.button whileTap={{ scale: 0.95 }} className="gradient-primary text-white px-6 py-3 rounded-xl font-semibold mt-2">
              เลือกซื้อสินค้า
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      <Breadcrumbs items={[{ label: 'สินค้าที่ชอบ' }]} />

      <h1 className="text-xl font-bold section-title text-surface-800 dark:text-surface-200">
        สินค้าที่ชอบ ({favorites.length})
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <AnimatePresence>
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} onQuickView={setQuickViewProduct} />
          ))}
        </AnimatePresence>
      </div>

      <ProductQuickView product={quickViewProduct} isOpen={!!quickViewProduct} onClose={() => setQuickViewProduct(null)} />
    </div>
  );
}
