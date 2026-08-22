import { NextRequest, NextResponse } from 'next/server';
import { ServerDb } from '@/lib/serverDb';
import { UserProfile } from '@app/shared';

// GET /api/users?userId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    const user = ServerDb.getUserProfile(userId);
    return NextResponse.json({ success: true, data: user });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST /api/users
export async function POST(req: NextRequest) {
  try {
    const body: UserProfile = await req.json();

    if (!body || !body.uid) {
      return NextResponse.json({ success: false, error: 'Missing user uid' }, { status: 400 });
    }

    const saved = ServerDb.saveUserProfile(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
