import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

/* ──────────────────────────────────────────────────────────────
   Fallback mock data — used when Supabase is not configured
   ────────────────────────────────────────────────────────────── */
const MOCK_PRODUCTS = {
  flash_sale: [
    {
      id: 'mock-fs-1', name: 'iPhone 16 Pro', slug: 'iphone-16-pro',
      original_price: 41900, sale_percent: 10, rating: 4.8, reviews_count: 128,
      badge: 'SALE', is_active: true, curated_lists: ['flash_sale'],
      product_colors: [
        { id: 'c1', name: 'White Titanium', hex: '#D9D4CF', image_url: null, sort_order: 0 },
        { id: 'c2', name: 'Desert Titanium', hex: '#BFA48F', image_url: null, sort_order: 1 },
      ],
      product_options: [
        { id: 'o1', label: '256GB', price: 41900, sort_order: 0 },
        { id: 'o2', label: '512GB', price: 48900, sort_order: 1 },
      ],
    },
    {
      id: 'mock-fs-2', name: 'iPad Air M3', slug: 'ipad-air-m3',
      original_price: 24900, sale_percent: 5, rating: 4.7, reviews_count: 64,
      badge: 'SALE', is_active: true, curated_lists: ['flash_sale'],
      product_colors: [
        { id: 'c3', name: 'Space Gray', hex: '#4A4A4A', image_url: null, sort_order: 0 },
      ],
      product_options: [
        { id: 'o3', label: '128GB', price: 24900, sort_order: 0 },
      ],
    },
    {
      id: 'mock-fs-3', name: 'AirPods Pro 2', slug: 'airpods-pro-2',
      original_price: 9490, sale_percent: 15, rating: 4.9, reviews_count: 312,
      badge: 'HOT', is_active: true, curated_lists: ['flash_sale'],
      product_colors: [
        { id: 'c4', name: 'White', hex: '#F5F5F5', image_url: null, sort_order: 0 },
      ],
      product_options: [
        { id: 'o4', label: 'Standard', price: 9490, sort_order: 0 },
      ],
    },
    {
      id: 'mock-fs-4', name: 'MacBook Air M3', slug: 'macbook-air-m3',
      original_price: 44900, sale_percent: 8, rating: 4.8, reviews_count: 89,
      badge: 'SALE', is_active: true, curated_lists: ['flash_sale'],
      product_colors: [
        { id: 'c5', name: 'Midnight', hex: '#1E1E2E', image_url: null, sort_order: 0 },
        { id: 'c6', name: 'Starlight', hex: '#F1E4D1', image_url: null, sort_order: 1 },
      ],
      product_options: [
        { id: 'o5', label: '8GB / 256GB', price: 44900, sort_order: 0 },
      ],
    },
  ],
  popular: [
    {
      id: 'mock-pop-1', name: 'iPhone 15', slug: 'iphone-15',
      original_price: 32900, sale_percent: 0, rating: 4.7, reviews_count: 256,
      badge: 'NEW', is_active: true, curated_lists: ['popular'],
      product_colors: [
        { id: 'c7', name: 'Blue', hex: '#6B8FAD', image_url: null, sort_order: 0 },
        { id: 'c8', name: 'Green', hex: '#A8C886', image_url: null, sort_order: 1 },
        { id: 'c9', name: 'Pink', hex: '#F2C4CE', image_url: null, sort_order: 2 },
      ],
      product_options: [
        { id: 'o6', label: '128GB', price: 32900, sort_order: 0 },
      ],
    },
    {
      id: 'mock-pop-2', name: 'Apple Watch Ultra 2', slug: 'apple-watch-ultra-2',
      original_price: 31900, sale_percent: 0, rating: 4.9, reviews_count: 94,
      badge: 'HOT', is_active: true, curated_lists: ['popular'],
      product_colors: [
        { id: 'c10', name: 'Titanium', hex: '#C4B9A8', image_url: null, sort_order: 0 },
      ],
      product_options: [
        { id: 'o7', label: '49mm GPS+Cellular', price: 31900, sort_order: 0 },
      ],
    },
    {
      id: 'mock-pop-3', name: 'iPhone 13 Starlight', slug: 'iphone-13-starlight',
      original_price: 22900, sale_percent: 0, rating: 4.5, reviews_count: 412,
      badge: null, is_active: true, curated_lists: ['popular'],
      product_colors: [
        { id: 'c11', name: 'Starlight', hex: '#F1E4D1', image_url: null, sort_order: 0 },
      ],
      product_options: [
        { id: 'o8', label: '128GB', price: 22900, sort_order: 0 },
      ],
    },
    {
      id: 'mock-pop-4', name: 'iPad Pro M4', slug: 'ipad-pro-m4',
      original_price: 44900, sale_percent: 0, rating: 4.9, reviews_count: 78,
      badge: 'NEW', is_active: true, curated_lists: ['popular'],
      product_colors: [
        { id: 'c12', name: 'Space Black', hex: '#2C2C2E', image_url: null, sort_order: 0 },
        { id: 'c13', name: 'Silver', hex: '#E3E3E3', image_url: null, sort_order: 1 },
      ],
      product_options: [
        { id: 'o9', label: '256GB', price: 44900, sort_order: 0 },
      ],
    },
  ],
  accessories: [
    {
      id: 'mock-acc-1', name: 'MagSafe Charger', slug: 'magsafe-charger',
      original_price: 1490, sale_percent: 0, rating: 4.4, reviews_count: 186,
      badge: null, is_active: true, curated_lists: ['accessories'],
      product_colors: [
        { id: 'c14', name: 'White', hex: '#FFFFFF', image_url: null, sort_order: 0 },
      ],
      product_options: [
        { id: 'o10', label: 'Standard', price: 1490, sort_order: 0 },
      ],
    },
    {
      id: 'mock-acc-2', name: 'Apple Pencil Pro', slug: 'apple-pencil-pro',
      original_price: 4990, sale_percent: 0, rating: 4.8, reviews_count: 145,
      badge: 'NEW', is_active: true, curated_lists: ['accessories'],
      product_colors: [
        { id: 'c15', name: 'White', hex: '#F5F5F5', image_url: null, sort_order: 0 },
      ],
      product_options: [
        { id: 'o11', label: 'Pro', price: 4990, sort_order: 0 },
      ],
    },
    {
      id: 'mock-acc-3', name: 'AirPods Max', slug: 'airpods-max',
      original_price: 19900, sale_percent: 0, rating: 4.6, reviews_count: 67,
      badge: null, is_active: true, curated_lists: ['accessories'],
      product_colors: [
        { id: 'c16', name: 'Midnight', hex: '#1E1E2E', image_url: null, sort_order: 0 },
        { id: 'c17', name: 'Blue', hex: '#6B8FAD', image_url: null, sort_order: 1 },
        { id: 'c18', name: 'Orange', hex: '#EB7B3A', image_url: null, sort_order: 2 },
      ],
      product_options: [
        { id: 'o12', label: 'Standard', price: 19900, sort_order: 0 },
      ],
    },
    {
      id: 'mock-acc-4', name: 'Magic Keyboard', slug: 'magic-keyboard',
      original_price: 3490, sale_percent: 0, rating: 4.5, reviews_count: 203,
      badge: null, is_active: true, curated_lists: ['accessories'],
      product_colors: [
        { id: 'c19', name: 'White', hex: '#FAFAFA', image_url: null, sort_order: 0 },
        { id: 'c20', name: 'Black', hex: '#1D1D1F', image_url: null, sort_order: 1 },
      ],
      product_options: [
        { id: 'o13', label: 'Standard', price: 3490, sort_order: 0 },
      ],
    },
  ],
};

export async function GET(request, { params }) {
  try {
    const { list } = await params;
    const validLists = ['flash_sale', 'popular', 'accessories'];

    if (!validLists.includes(list)) {
      return NextResponse.json({ error: 'Invalid curated list' }, { status: 400 });
    }

    /* ── Try Supabase first ── */
    if (supabaseAdmin) {
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select(`
          *,
          product_colors(id, name, hex, image_url, sort_order),
          product_options(id, label, price, sort_order)
        `)
        .eq('is_active', true)
        .contains('curated_lists', [list])
        .order('created_at', { ascending: false });

      if (!error && products) {
        products.forEach(p => {
          p.product_colors?.sort((a, b) => a.sort_order - b.sort_order);
          p.product_options?.sort((a, b) => a.sort_order - b.sort_order);
        });
        return NextResponse.json({ products });
      }

      // If Supabase query failed, log and fall through to mock
      console.warn(`Supabase query error for "${list}":`, error?.message);
    }

    /* ── Fallback: mock data ── */
    const products = MOCK_PRODUCTS[list] || [];
    return NextResponse.json({ products });
  } catch (err) {
    console.error('Curated list error:', err);
    // Last resort — return mock data instead of 500
    const { list } = await params;
    const products = MOCK_PRODUCTS[list] || [];
    return NextResponse.json({ products });
  }
}
