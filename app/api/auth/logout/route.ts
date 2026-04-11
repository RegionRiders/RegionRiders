import { NextResponse } from 'next/server';
import { handle500Error } from '@/lib/api';
import { clearUserSession } from '@/lib/auth/session';

export async function POST() {
  try {
    await clearUserSession();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return handle500Error(error, 'Auth API: Logout');
  }
}
