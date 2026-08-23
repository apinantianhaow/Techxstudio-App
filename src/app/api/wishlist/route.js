import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { data: items, error } = await supabaseAdmin
      .from('wishlist_items')
      .select(`
        id, created_at,
        products(id, name, slug, category, original_price, sale_percent, badge, rating, reviews_count,
          product_colors(id, name, hex, image_url, sort_order),
          product_options(id, label, price, sort_order)
        )
      `)
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'ไม่สามารถดึง wishlist ได้' }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (err) {
    console.error('Wishlist GET error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const body = await request.json();
    const { product_id } = body;

    if (!product_id) {
      return NextResponse.json({ error: 'กรุณาระบุสินค้า' }, { status: 400 });
    }

    const { data: item, error } = await supabaseAdmin
      .from('wishlist_items')
      .insert({ user_id: authUser.id, product_id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'สินค้าอยู่ใน wishlist แล้ว' }, { status: 409 });
      }
      return NextResponse.json({ error: 'ไม่สามารถเพิ่มได้' }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('Wishlist POST error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const product_id = searchParams.get('product_id');

    if (!product_id) {
      return NextResponse.json({ error: 'กรุณาระบุสินค้า' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('wishlist_items')
      .delete()
      .eq('user_id', authUser.id)
      .eq('product_id', product_id);

    if (error) {
      return NextResponse.json({ error: 'ไม่สามารถลบได้' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Wishlist DELETE error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
