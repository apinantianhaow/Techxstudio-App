import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { signToken } from '@/lib/auth';

const signupSchema = z.object({
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  full_name: z.string().min(1, 'กรุณากรอกชื่อ'),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const validated = signupSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, full_name } = validated.data;

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'อีเมลนี้ถูกใช้งานแล้ว' },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({ email, password_hash, full_name })
      .select('id, email, full_name, avatar_url, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'ไม่สามารถสร้างบัญชีได้' }, { status: 500 });
    }

    // Generate JWT
    const token = signToken({ id: user.id, email: user.email, full_name: user.full_name });

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
