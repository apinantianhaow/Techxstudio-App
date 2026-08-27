import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request, { params }) {
  try {
    const { list } = await params;
    const validLists = ['flash_sale', 'popular', 'accessories'];

    if (!validLists.includes(list)) {
      return NextResponse.json({ error: 'Invalid curated list' }, { status: 400 });
    }

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

    if (error) {
      return NextResponse.json({ error: 'Unable to fetch data' }, { status: 500 });
    }

    products?.forEach(p => {
      p.product_colors?.sort((a, b) => a.sort_order - b.sort_order);
      p.product_options?.sort((a, b) => a.sort_order - b.sort_order);
    });

    return NextResponse.json({ products });
  } catch (err) {
    console.error('Curated list error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
