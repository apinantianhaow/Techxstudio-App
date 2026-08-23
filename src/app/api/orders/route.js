import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

const createOrderSchema = z.object({
  shipping_address: z.string().min(1, 'กรุณากรอกที่อยู่จัดส่ง'),
  payment_method: z.string().default('credit_card'),
  coupon_code: z.string().optional(),
});

export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items(id, product_name, option_label, color_name, quantity, price, image_url)
      `)
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'ไม่สามารถดึงออเดอร์ได้' }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err) {
    console.error('Orders GET error:', err);
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
    const validated = createOrderSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    // Get cart items
    const { data: cartItems } = await supabaseAdmin
      .from('cart_items')
      .select('*')
      .eq('user_id', authUser.id);

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'ตะกร้าว่างเปล่า' }, { status: 400 });
    }

    // Calculate total
    let totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discountAmount = 0;

    // Apply coupon if provided
    if (validated.data.coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', validated.data.coupon_code)
        .eq('is_active', true)
        .single();

      if (coupon) {
        if (coupon.min_purchase && totalAmount < coupon.min_purchase) {
          return NextResponse.json(
            { error: `ยอดขั้นต่ำ ฿${coupon.min_purchase.toLocaleString()}` },
            { status: 400 }
          );
        }

        if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
          return NextResponse.json({ error: 'คูปองหมดอายุแล้ว' }, { status: 400 });
        }

        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
          return NextResponse.json({ error: 'คูปองหมดอายุแล้ว' }, { status: 400 });
        }

        if (coupon.discount_percent > 0) {
          discountAmount = Math.round(totalAmount * coupon.discount_percent / 100);
          if (coupon.max_discount) {
            discountAmount = Math.min(discountAmount, coupon.max_discount);
          }
        } else if (coupon.discount_amount > 0) {
          discountAmount = coupon.discount_amount;
        }

        // Update coupon uses
        await supabaseAdmin
          .from('coupons')
          .update({ current_uses: coupon.current_uses + 1 })
          .eq('id', coupon.id);
      }
    }

    const finalTotal = totalAmount - discountAmount;

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: authUser.id,
        total_amount: finalTotal,
        discount_amount: discountAmount,
        coupon_code: validated.data.coupon_code || null,
        shipping_address: validated.data.shipping_address,
        payment_method: validated.data.payment_method,
      })
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: 'ไม่สามารถสร้างออเดอร์ได้' }, { status: 500 });
    }

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_id, // Will be resolved client-side
      option_label: item.option_label,
      color_name: item.color_name,
      quantity: item.quantity,
      price: item.price,
      image_url: item.image_url,
    }));

    // Get product names for order items
    const productIds = [...new Set(cartItems.map(i => i.product_id))];
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .in('id', productIds);

    const productNameMap = {};
    products?.forEach(p => { productNameMap[p.id] = p.name; });

    const enrichedOrderItems = orderItems.map(item => ({
      ...item,
      product_name: productNameMap[item.product_id] || 'Unknown Product',
    }));

    await supabaseAdmin.from('order_items').insert(enrichedOrderItems);

    // Clear cart
    await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('user_id', authUser.id);

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error('Orders POST error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
