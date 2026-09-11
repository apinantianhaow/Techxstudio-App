import { NextResponse } from 'next/server';
import { z } from 'zod';
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100).optional(),
  phone: z.string().max(20).optional(),
});

export async function PUT(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateProfileSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates = {};
    if (validated.data.full_name !== undefined) updates.full_name = validated.data.full_name;
    if (validated.data.phone !== undefined) updates.phone = validated.data.phone;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', authUser.id)
      .select('id, email, full_name, phone, avatar_url, created_at')
      .single();

    if (!user || error) {
      return NextResponse.json({ error: 'Unable to update profile' }, { status: 500 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete user — all related data cascades via ON DELETE CASCADE
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', authUser.id);

    if (error) {
      return NextResponse.json({ error: 'Unable to delete account' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Account delete error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
