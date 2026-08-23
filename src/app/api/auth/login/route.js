import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { signToken } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const validated = loginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validated.data;

    // Find user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, full_name, avatar_url, created_at')
      .eq('email', email)
      .single();

    if (!user || error) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = signToken({ id: user.id, email: user.email, full_name: user.full_name });

    const { password_hash, ...safeUser } = user;

    return NextResponse.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
