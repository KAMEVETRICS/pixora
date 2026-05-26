import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { randomBytes } from "crypto";
import { verifyMessage } from "viem";
import { normalizeAddress } from "@/lib/auth/address";
import { createToken } from "@/lib/auth/token";

const redis = Redis.fromEnv();
const NONCE_TTL_SECONDS = 300;
const NONCE_KEY_PREFIX = "pixora:auth:nonce:";

function nonceKey(address: `0x${string}`, nonce: string): string {
  return `${NONCE_KEY_PREFIX}${address}:${nonce}`;
}

function isNonce(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
}

function createSignInMessage(address: `0x${string}`, nonce: string): string {
  return [
    "Sign in to Pixora",
    "",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

// GET /api/auth?address=0x... — issue a short-lived sign-in challenge
export async function GET(req: NextRequest) {
  const address = normalizeAddress(new URL(req.url).searchParams.get("address"));
  if (!address) {
    return NextResponse.json({ error: "valid address required" }, { status: 400 });
  }

  const nonce = randomBytes(16).toString("hex");
  await redis.set(nonceKey(address, nonce), "1", { ex: NONCE_TTL_SECONDS });

  return NextResponse.json({
    address,
    nonce,
    message: createSignInMessage(address, nonce),
    expiresIn: NONCE_TTL_SECONDS,
  });
}

// POST /api/auth — wallet login, returns session token
// Body: { address, signature, nonce }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const address = normalizeAddress(body.address);
  const signature = body.signature as `0x${string}`;
  const nonce = isNonce(body.nonce) ? body.nonce : "";

  if (!address || !signature || !nonce) {
    return NextResponse.json(
      { error: "address, signature, and nonce required" },
      { status: 400 }
    );
  }

  const key = nonceKey(address, nonce);
  const nonceExists = await redis.get<string>(key);
  if (!nonceExists) {
    return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 403 });
  }

  await redis.del(key);

  try {
    const message = createSignInMessage(address, nonce);
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
