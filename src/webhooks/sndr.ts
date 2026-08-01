/**
 * @module
 * SNDR webhook parser and signature verification.
 *
 * Signature scheme (from `@rkiza/sndr` / SNDR dispatcher):
 * `X-Sndr-Signature: t=<unix_seconds>,v1=<hex(HMAC-SHA256(secret, `${t}.${rawBody}`))>`
 */
import { decodeHexBytes, timingSafeEqual } from "./timing-safe-equal.js";
import type { EmailEvent } from "./types.js";
import { emailEvent, mapEventType, parseTimestamp } from "./types.js";

const SNDR_EVENT_MAP: Record<string, EmailEvent["type"]> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.unsubscribed": "unknown",
};

/** Parse an SNDR webhook payload into normalized {@link EmailEvent} records. */
export function parse(payload: unknown): EmailEvent[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : "";
  const data =
    typeof record.data === "object" && record.data !== null
      ? (record.data as Record<string, unknown>)
      : {};

  const to = data.to ?? data.addresses;
  const recipient = Array.isArray(to)
    ? typeof to[0] === "string"
      ? to[0]
      : undefined
    : typeof to === "string"
      ? to
      : undefined;

  const timestamp = parseTimestamp(record.created_at);

  return [
    emailEvent({
      provider: "sndr",
      type: mapEventType(type, SNDR_EVENT_MAP),
      ...(typeof data.email_id === "string" ? { messageId: data.email_id } : {}),
      ...(recipient !== undefined ? { recipient } : {}),
      ...(timestamp !== undefined ? { timestamp } : {}),
      raw: payload,
    }),
  ];
}

/**
 * Verify an SNDR webhook signature using HMAC-SHA256 (Web Crypto).
 *
 * Pass the **exact** raw request body string — re-serializing JSON breaks the HMAC.
 *
 * @param rawBody — Raw HTTP body bytes as UTF-8 string (or the string used when signing).
 * @param signatureHeader — Value of the `X-Sndr-Signature` header (`t=…,v1=…`).
 * @param secret — Webhook endpoint signing secret from SNDR.
 * @param opts.toleranceSeconds — Max age of `t` in seconds (default `300`). Pass `0` to skip.
 */
export async function verifySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  opts?: { toleranceSeconds?: number },
): Promise<boolean> {
  if (!signatureHeader || !secret) {
    return false;
  }

  let timestamp: string | undefined;
  let v1: string | undefined;
  for (const part of signatureHeader.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1") v1 = value;
  }

  if (!timestamp || !v1) {
    return false;
  }

  const tolerance = opts?.toleranceSeconds ?? 300;
  if (tolerance > 0) {
    const tsNum = Number(timestamp);
    if (!Number.isFinite(tsNum)) {
      return false;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - tsNum) > tolerance) {
      return false;
    }
  }

  const providedBytes = decodeHexBytes(v1);
  if (providedBytes === null) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signed = new TextEncoder().encode(`${timestamp}.${rawBody}`);
  const expected = await crypto.subtle.sign("HMAC", key, signed);
  return timingSafeEqual(new Uint8Array(expected), providedBytes);
}
