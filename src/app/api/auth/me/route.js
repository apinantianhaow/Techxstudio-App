import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, phone, avatar_url, created_at')
      .eq('id', authUser.id)
      .single();

    if (!user || error) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
