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
        id, user_id, rating, title, comment, created_at,
        users(full_name, avatar_url)
      `)
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: 'Unable to fetch reviews' }, { status: 500 });
    }

    return NextResponse.json({ reviews: reviews || [] });
  } catch (err) {
    console.error('Reviews GET error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 });
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
        { error: 'You have already reviewed this product' },
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
      return NextResponse.json({ error: 'Unable to submit review' }, { status: 500 });
    }

    await recalculateProductRating(id);

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    console.error('Review POST error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const { reviewId, ...reviewData } = body;
    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    const validated = reviewSchema.safeParse(reviewData);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { data: review, error } = await supabaseAdmin
      .from('product_reviews')
      .update(validated.data)
      .eq('id', reviewId)
      .eq('user_id', authUser.id)
      .eq('product_id', id)
      .select('id, rating, title, comment, created_at')
      .single();

    if (!review || error) {
      return NextResponse.json({ error: 'Review not found or not yours' }, { status: 404 });
    }

    await recalculateProductRating(id);

    return NextResponse.json({ review });
  } catch (err) {
    console.error('Review PUT error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('product_reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', authUser.id)
      .eq('product_id', id);

    if (error) {
      return NextResponse.json({ error: 'Unable to delete review' }, { status: 500 });
    }

    await recalculateProductRating(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Review DELETE error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// Helper: recalculate product rating after review changes
async function recalculateProductRating(productId) {
  const { data: allReviews } = await supabaseAdmin
    .from('product_reviews')
    .select('rating')
    .eq('product_id', productId);

  if (allReviews && allReviews.length > 0) {
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await supabaseAdmin
      .from('products')
      .update({
        rating: Math.round(avgRating * 10) / 10,
        reviews_count: allReviews.length,
      })
      .eq('id', productId);
  } else {
    await supabaseAdmin
      .from('products')
      .update({ rating: 0, reviews_count: 0 })
      .eq('id', productId);
  }
}
