import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().max(1000).optional(),
});

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { data: reviews, error } = await supabaseAdmin
      .from('product_reviews')
      .select(`
        id, rating, title, comment, created_at,
        users(full_name, avatar_url)
      `)
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: 'ไม่สามารถดึงรีวิวได้' }, { status: 500 });
    }

    return NextResponse.json({ reviews: reviews || [] });
  } catch (err) {
    console.error('Reviews GET error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = reviewSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    // Check if user already reviewed this product
    const { data: existing } = await supabaseAdmin
      .from('product_reviews')
      .select('id')
      .eq('product_id', id)
      .eq('user_id', authUser.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'คุณได้รีวิวสินค้านี้แล้ว' },
        { status: 409 }
      );
    }

    const { data: review, error } = await supabaseAdmin
      .from('product_reviews')
      .insert({
        product_id: id,
        user_id: authUser.id,
        ...validated.data,
      })
      .select('id, rating, title, comment, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'ไม่สามารถส่งรีวิวได้' }, { status: 500 });
    }

    // Update product rating and reviews_count
    const { data: allReviews } = await supabaseAdmin
      .from('product_reviews')
      .select('rating')
      .eq('product_id', id);

    if (allReviews && allReviews.length > 0) {
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await supabaseAdmin
        .from('products')
        .update({
          rating: Math.round(avgRating * 10) / 10,
          reviews_count: allReviews.length,
        })
        .eq('id', id);
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    console.error('Review POST error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
