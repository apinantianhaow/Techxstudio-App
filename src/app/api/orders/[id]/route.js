import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

const updateOrderSchema = z.object({
  status: z.enum(['cancelled'], { errorMap: () => ({ message: 'Only cancellation is allowed' }) }),
});

export async function PATCH(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateOrderSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    // Check that order belongs to user and is in 'confirmed' status
    const { data: order, error: findError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', authUser.id)
      .single();

    if (!order || findError) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Only confirmed orders can be cancelled' },
        { status: 400 }
      );
    }

    // Update status to cancelled
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', authUser.id)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Unable to cancel order' }, { status: 500 });
    }

    return NextResponse.json({ order: updated });
  } catch (err) {
    console.error('Order PATCH error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
