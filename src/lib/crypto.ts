import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "./env";

const VERSION = "v1";

const keyCache = new Map<string, Buffer>();

function deriveKey(info: string, secret: string): Buffer {
  const cacheKey = `${info}:${secret.slice(0, 8)}`;
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;
  const key = Buffer.from(
    hkdfSync("sha256", Buffer.from(secret, "utf8"), Buffer.from("rakta-daan"), info, 32),
  );
  keyCache.set(cacheKey, key);
  return key;
}

/** Encrypts a UTF-8 string. Output: `v1.<iv>.<tag>.<ciphertext>` (base64url). */
export function encryptString(plaintext: string, purpose = "field"): string {
  const key = deriveKey(purpose, env.authSecret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ct.toString("base64url"),
  ].join(".");
}

export function decryptString(payload: string, purpose = "field"): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Malformed ciphertext");
  }
  const [, ivPart, tagPart, ctPart] = parts;
  if (!ivPart || !tagPart || !ctPart) throw new Error("Malformed ciphertext");
  const key = deriveKey(purpose, env.authSecret);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** Keyed hash used as a blind index for exact-match lookups (never reversible). */
export function blindIndex(value: string, purpose = "lookup"): string {
  const key = deriveKey(`${purpose}:blind`, env.otpPepper);
  return createHmac("sha256", key).update(value).digest("hex");
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return blindIndex(ip, "ip");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function randomDigits(length = 6): string {
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length)) {
      if (byte < 250) {
        out += String(byte % 10);
        if (out.length === length) break;
      }
    }
  }
  return out;
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Short, human-friendly, unguessable public identifier (Crockford base32). */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function publicId(length = 10): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}
