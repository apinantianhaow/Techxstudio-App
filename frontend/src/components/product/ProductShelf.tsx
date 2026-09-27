'use client';

import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import type { Product } from '@/types';

interface ProductShelfProps {
  id?: string;
  title: string;
  tagline?: string;
  products: Product[];
  loading?: boolean;
  aside?: ReactNode;
}

/** Apple Store–style horizontally scrolling row of product cards. */
export default function ProductShelf({ id, title, tagline, products, loading = false, aside }: ProductShelfProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [updateArrows, products.length, loading]);

  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (!loading && products.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-16 pt-10 md:pt-14">
      <div className="page-width flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h2 className="t-title max-w-3xl">
          <span className="text-ink">{title}</span>
          {tagline && <span className="text-ink-2"> {tagline}</span>}
        </h2>
        {aside}
      </div>

      <div className="relative">
        <div ref={trackRef} onScroll={updateArrows} className="shelf">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card w-[76vw] max-w-[300px] p-6 sm:w-[300px]">
                <div className="aspect-square rounded-control animate-shimmer" />
                <div className="mt-5 h-3 w-1/4 rounded-full animate-shimmer" />
                <div className="mt-3 h-5 w-3/4 rounded-full animate-shimmer" />
                <div className="mt-6 h-4 w-1/3 rounded-full animate-shimmer" />
              </div>
            ))
            : products.map((product, i) => (
              <div key={product.id} className="w-[76vw] max-w-[300px] sm:w-[300px]">
                <ProductCard product={product} index={i} />
              </div>
            ))}
        </div>

        <div className="page-width -mt-4 hidden justify-end gap-3 md:flex">
          <button onClick={() => scroll(-1)} disabled={!canPrev} aria-label="Previous"
            className="icon-btn disabled:cursor-default disabled:opacity-40">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => scroll(1)} disabled={!canNext} aria-label="Next"
            className="icon-btn disabled:cursor-default disabled:opacity-40">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
