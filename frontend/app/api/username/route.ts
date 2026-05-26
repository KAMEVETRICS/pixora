import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { verifyMessage } from "viem";
import { normalizeAddress } from "@/lib/auth/address";
import { verifyToken } from "@/lib/auth/token";

// Initialize Redis.
// It will automatically pick up UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from .env
const redis = Redis.fromEnv();
const USERNAME_KEY_PREFIX = "pixora:username:";

function usernameKey(address: `0x${string}`): string {
  return `${USERNAME_KEY_PREFIX}${address}`;
}

// Helper to extract and verify session token from Authorization header
function getSession(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

// GET /api/username?address=0x... — get one public display username
// GET /api/username?addresses=0x1,0x2,... — batch lookup (max 20)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Batch lookup
  const addresses = searchParams.get("addresses");
  if (addresses) {
    const requestedAddresses = addresses.split(",").map((a) => a.trim()).filter(Boolean);
    const list = requestedAddresses.slice(0, 20).map(normalizeAddress);

    if (requestedAddresses.length === 0) return NextResponse.json({});
    if (list.some((address) => !address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // Use mget to fetch all keys at once
    const normalizedAddresses = list as `0x${string}`[];
    const values = await redis.mget<(string | null)[]>(
      ...normalizedAddresses.map(usernameKey)
    );
    const missingAddresses = normalizedAddresses.filter((_, i) => !values[i]);
    const legacyValues = missingAddresses.length
      ? await redis.mget<(string | null)[]>(...missingAddresses)
      : [];
    const legacyByAddress = new Map(
      missingAddresses.map((address, i) => [address, legacyValues[i]])
    );
    
    const result: Record<string, string> = {};
    normalizedAddresses.forEach((addr, i) => {
      const username = values[i] || legacyByAddress.get(addr);
      if (username) result[addr] = username;
    });
    return NextResponse.json(result);
  }

  // Single lookup
  const address = normalizeAddress(searchParams.get("address"));
  if (!address) {
    return NextResponse.json({ error: "valid address required" }, { status: 400 });
  }

  const username =
    (await redis.get<string>(usernameKey(address))) ||
    (await redis.get<string>(address));
  return NextResponse.json({ address, username: username || null });
}

// POST /api/username — set username (requires session + wallet signature)
// Body: { address, username, signature }
export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const address = normalizeAddress(body.address);
  const username = body.username?.trim();
  const signature = body.signature as `0x${string}`;

  if (!address || !username || !signature) {
    return NextResponse.json(
      { error: "address, username, and signature required" },
      { status: 400 }
    );
  }

  // Session address must match the claimed address
  if (session.address !== address) {
    return NextResponse.json({ error: "Address mismatch" }, { status: 403 });
  }

  if (username.length > 20) {
    return NextResponse.json({ error: "Username too long (max 20)" }, { status: 400 });
  }

  const message = `Set Pixora username to: ${username}`;

  try {
    const valid = await verifyMessage({ address, message, signature });
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 403 });
  }

  // Store in Redis
  await redis.set(usernameKey(address), username);

  return NextResponse.json({ address, username });
}
