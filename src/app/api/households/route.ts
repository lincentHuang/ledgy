import { NextRequest, NextResponse } from 'next/server';
import { ServerDb } from '@/lib/serverDb';
import { Household } from '@app/shared';

// GET /api/households?id=...&inviteCode=...&userId=...&emailInvitations=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const inviteCode = searchParams.get('inviteCode');
    const userId = searchParams.get('userId');
    const emailInvitations = searchParams.get('emailInvitations');

    if (emailInvitations) {
      const list = ServerDb.getPendingInvitationsForEmail(emailInvitations);
      return NextResponse.json({ success: true, data: list });
    }

    if (id) {
      const house = ServerDb.getHousehold(id);
      return NextResponse.json({ success: true, data: house });
    }

    if (inviteCode) {
      const house = ServerDb.getHouseholdByInviteCode(inviteCode);
      return NextResponse.json({ success: true, data: house });
    }

    if (userId) {
      const list = ServerDb.getHouseholdsByUser(userId);
      return NextResponse.json({ success: true, data: list });
    }

    return NextResponse.json({ success: false, error: 'Missing id, inviteCode or userId' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST /api/households
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. 組長以 Email 邀請新成員
    if (body.action === 'invite_email') {
      const res = ServerDb.inviteMemberByEmail(
        body.householdId,
        body.inviter,
        body.inviteeEmail,
        body.role
      );
      return NextResponse.json(res);
    }

    // 2. 被邀請者回覆邀請 (accept / reject)
    if (body.action === 'respond_invitation') {
      const res = ServerDb.respondToInvitation(
        body.invitationId,
        body.email,
        body.responseAction,
        body.userProfile
      );
      return NextResponse.json(res);
    }

    // 3. 透過邀請碼申請加入 (待審核)
    if (body.action === 'submit_join_request') {
      const res = ServerDb.submitJoinRequest(body.inviteCode, body.applicant);
      return NextResponse.json(res);
    }

    // 4. 組長審核申請 (approve / reject)
    if (body.action === 'respond_join_request') {
      const res = ServerDb.respondToJoinRequest(
        body.householdId,
        body.requestId,
        body.responseAction
      );
      return NextResponse.json(res);
    }

    // 5. 儲存/更新群組物件
    const house: Household = body;
    const saved = ServerDb.saveHousehold(house);
    return NextResponse.json({ success: true, data: saved });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// DELETE /api/households?id=...
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    const ok = ServerDb.deleteHousehold(id);
    return NextResponse.json({ success: true, deleted: ok });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
