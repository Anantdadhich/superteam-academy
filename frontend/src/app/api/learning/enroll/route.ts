import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId, courseId, txSignature: clientTxSignature } = await req.json();
  if (!userId || !courseId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Pure On-Chain Architecture
  // The client (via useEnroll hook) has already signed and broadcast the transaction 
  // directly to the Solana Devnet program using buildEnrollTx.

  // We simply acknowledge receipt. 
  const txSignature: string | null = clientTxSignature ?? null;

  return NextResponse.json({ ok: true, txSignature });
}
