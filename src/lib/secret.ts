import { createHmac, timingSafeEqual } from "node:crypto";

/** One shared place for the server secret so signing cannot drift apart. */
export function portalSecret(
  env: Record<string, string | undefined> = process.env,
): string {
  return env.SESSION_SECRET ?? "vidyasetu-sih-demo-secret";
}

export function hmac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
