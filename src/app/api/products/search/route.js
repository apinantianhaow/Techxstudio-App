import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ products: [] });
    }

    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select(`
        id, name, slug, category, original_price, sale_percent, badge, rating,
        product_colors(id, name, hex, image_url, sort_order)
      `)
      .eq('is_active', true)
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
      .limit(8);

    if (error) {
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    products?.forEach(p => {
      p.product_colors?.sort((a, b) => a.sort_order - b.sort_order);
    });

    return NextResponse.json({ products });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
