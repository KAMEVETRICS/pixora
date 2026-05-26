import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const DEVELOPMENT_JWT_SECRET = randomBytes(32).toString("hex");

interface TokenPayload {
  address: string;
  iat: number;
  exp: number;
}

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be configured in production");
  }

  return DEVELOPMENT_JWT_SECRET;
}

function signPayload(payloadB64: string): string {
  return createHmac("sha256", getJwtSecret()).update(payloadB64).digest("base64url");
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function isTokenPayload(value: unknown): value is TokenPayload {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<TokenPayload>;
  return (
    typeof payload.address === "string" &&
    typeof payload.iat === "number" &&
    typeof payload.exp === "number"
  );
}

export function createToken(address: string, expiresInSeconds = 86400): string {
  const payload: TokenPayload = {
    address: address.toLowerCase(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = signPayload(payloadB64);

  return `${payloadB64}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;

    // Verify signature
    const expectedSig = signPayload(payloadB64);
    if (!signaturesMatch(sig, expectedSig)) return null;

    // Decode payload
    const payload: unknown = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    );
    if (!isTokenPayload(payload)) return null;

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
