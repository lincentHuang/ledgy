import { NextRequest, NextResponse } from 'next/server';
import { ServerDb } from '@/lib/serverDb';
import { TaiwanInvoice } from '@app/shared';

// GET /api/invoices?carrierCode=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const carrierCode = searchParams.get('carrierCode') || undefined;

    const list = ServerDb.getInvoices(carrierCode);
    return NextResponse.json({ success: true, data: list });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST /api/invoices
export async function POST(req: NextRequest) {
  try {
    const inv: TaiwanInvoice = await req.json();
    const saved = ServerDb.saveInvoice(inv);
    return NextResponse.json({ success: true, data: saved });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
