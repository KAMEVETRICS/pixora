import { createHmac, randomBytes } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString("hex");

interface TokenPayload {
  address: string;
  iat: number;
  exp: number;
}

export function createToken(address: string, expiresInSeconds = 86400): string {
  const payload: TokenPayload = {
    address: address.toLowerCase(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", JWT_SECRET).update(payloadB64).digest("base64url");

  return `${payloadB64}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;

    // Verify signature
    const expectedSig = createHmac("sha256", JWT_SECRET).update(payloadB64).digest("base64url");
    if (sig !== expectedSig) return null;

    // Decode payload
    const payload: TokenPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    );

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
