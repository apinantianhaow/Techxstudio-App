import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        product_colors(id, name, hex, image_url, sort_order),
        product_options(id, label, price, sort_order),
        product_specs(id, spec_key, spec_value, sort_order)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (!product || error) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Sort nested arrays
    product.product_colors?.sort((a, b) => a.sort_order - b.sort_order);
    product.product_options?.sort((a, b) => a.sort_order - b.sort_order);
    product.product_specs?.sort((a, b) => a.sort_order - b.sort_order);

    return NextResponse.json({ product });
  } catch (err) {
    console.error('Product detail error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
