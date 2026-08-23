import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

const updateSchema = z.object({
  quantity: z.number().int().min(1),
});

export async function PATCH(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { data: item, error } = await supabaseAdmin
      .from('cart_items')
      .update({ quantity: validated.data.quantity })
      .eq('id', id)
      .eq('user_id', authUser.id)
      .select()
      .single();

    if (!item || error) {
      return NextResponse.json({ error: 'ไม่พบรายการ' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    console.error('Cart PATCH error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('id', id)
      .eq('user_id', authUser.id);

    if (error) {
      return NextResponse.json({ error: 'ไม่สามารถลบได้' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Cart DELETE error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
