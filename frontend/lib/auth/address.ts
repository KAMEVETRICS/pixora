import { isAddress } from "viem";

export function normalizeAddress(value: unknown): `0x${string}` | null {
  if (typeof value !== "string") return null;

  const address = value.trim();
  if (!isAddress(address)) return null;

  return address.toLowerCase() as `0x${string}`;
}
