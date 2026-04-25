import { NextResponse } from 'next/server';
import { handle500Error } from '@/lib/api';
import { getAuthenticatedUserId } from '@/lib/auth/session';

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        userId: null,
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      userId,
    });
  } catch (error) {
    return handle500Error(error, 'Auth API: Session');
  }
}
