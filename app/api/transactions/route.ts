import { NextRequest, NextResponse } from 'next/server';
import { ServerDb } from '../../../lib/serverDb';
import { Transaction } from '@app/shared';

// GET /api/transactions?userId=...&householdId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'user_tw_01';
    const householdId = searchParams.get('householdId') || undefined;

    const list = ServerDb.getTransactions(userId, householdId);
    return NextResponse.json({ success: true, data: list });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST /api/transactions
export async function POST(req: NextRequest) {
  try {
    const tx: Transaction = await req.json();
    const saved = ServerDb.saveTransaction(tx);
    return NextResponse.json({ success: true, data: saved });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// DELETE /api/transactions?id=...
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing transaction id' }, { status: 400 });
    }
    const ok = ServerDb.deleteTransaction(id);
    return NextResponse.json({ success: true, deleted: ok });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
