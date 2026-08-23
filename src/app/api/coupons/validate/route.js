import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';

const validateSchema = z.object({
  code: z.string().min(1, 'กรุณากรอกรหัสคูปอง'),
  total: z.number().positive().optional(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const validated = validateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { code, total } = validated.data;

    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (!coupon || error) {
      return NextResponse.json({ error: 'ไม่พบคูปองนี้' }, { status: 404 });
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ error: 'คูปองหมดอายุแล้ว' }, { status: 400 });
    }

    // Check usage limit
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return NextResponse.json({ error: 'คูปองถูกใช้ครบจำนวนแล้ว' }, { status: 400 });
    }

    // Check minimum purchase
    if (total && coupon.min_purchase && total < coupon.min_purchase) {
      return NextResponse.json(
        { error: `ยอดสั่งซื้อขั้นต่ำ ฿${coupon.min_purchase.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discount_percent > 0 && total) {
      discount = Math.round(total * coupon.discount_percent / 100);
      if (coupon.max_discount) {
        discount = Math.min(discount, coupon.max_discount);
      }
    } else if (coupon.discount_amount > 0) {
      discount = coupon.discount_amount;
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discount_percent: coupon.discount_percent,
        discount_amount: coupon.discount_amount,
        min_purchase: coupon.min_purchase,
        max_discount: coupon.max_discount,
      },
      calculated_discount: discount,
    });
  } catch (err) {
    console.error('Coupon validate error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
