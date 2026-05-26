import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { createToken } from "@/lib/auth/token";

// POST /api/auth — wallet login, returns session token
// Body: { address, signature }
// Signature must be over: "Sign in to PicGuess"
export async function POST(req: NextRequest) {
  const body = await req.json();
  const address = body.address?.toLowerCase() as `0x${string}`;
  const signature = body.signature as `0x${string}`;

  if (!address || !signature) {
    return NextResponse.json(
      { error: "address and signature required" },
      { status: 400 }
    );
  }

  const message = "Sign in to PicGuess";

  try {
    const valid = await verifyMessage({ address, message, signature });
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 403 });
  }

  // Issue a session token (24h expiry)
  const token = createToken(address);

  return NextResponse.json({ token, address });
}
