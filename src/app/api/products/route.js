import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabaseAdmin
      .from('products')
      .select(`
        *,
        product_colors(id, name, hex, image_url, sort_order),
        product_options(id, label, price, sort_order)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: products, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลสินค้าได้' }, { status: 500 });
    }

    // Sort nested arrays
    products?.forEach(p => {
      p.product_colors?.sort((a, b) => a.sort_order - b.sort_order);
      p.product_options?.sort((a, b) => a.sort_order - b.sort_order);
    });

    return NextResponse.json({ products });
  } catch (err) {
    console.error('Products error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
