import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

const addCartSchema = z.object({
  product_id: z.string().uuid(),
  option_label: z.string().optional(),
  color_name: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  price: z.number().positive(),
  image_url: z.string().optional(),
});

export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    }

    const { data: items, error } = await supabaseAdmin
      .from('cart_items')
      .select(`
        *,
        products(id, name, slug, original_price, sale_percent, badge)
      `)
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Unable to fetch cart' }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (err) {
    console.error('Cart GET error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    }

    const body = await request.json();
    const validated = addCartSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    // Check if same product+option+color exists in cart
    const { data: existing } = await supabaseAdmin
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', authUser.id)
      .eq('product_id', validated.data.product_id)
      .eq('option_label', validated.data.option_label || '')
      .eq('color_name', validated.data.color_name || '')
      .single();

    if (existing) {
      // Update quantity
      const { data: updated, error } = await supabaseAdmin
        .from('cart_items')
        .update({ quantity: existing.quantity + validated.data.quantity })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Unable to update cart' }, { status: 500 });
      }

      return NextResponse.json({ item: updated });
    }

    // Insert new item
    const { data: item, error } = await supabaseAdmin
      .from('cart_items')
      .insert({
        user_id: authUser.id,
        ...validated.data,
        option_label: validated.data.option_label || '',
        color_name: validated.data.color_name || '',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Unable to add to cart' }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('Cart POST error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
