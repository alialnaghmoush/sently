/**
 * @module
 * WhatsApp Cloud API webhook parser → {@link DeliveryEvent}.
 *
 * Parses Meta webhook payloads containing `statuses` (outbound delivery
 * lifecycle). Inbound `messages` are ignored here — use a dedicated inbound
 * handler if you need user replies.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
 */
import { decodeHexBytes, timingSafeEqual } from "./timing-safe-equal.js";
import type { DeliveryEvent } from "./types.js";
import { asArray, deliveryEvent, mapEventType, parseTimestamp } from "./types.js";

const WA_STATUS_MAP: Record<string, DeliveryEvent["type"]> = {
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
  deleted: "failed",
};

/**
 * Parse a WhatsApp Cloud API webhook payload into normalized
 * {@link DeliveryEvent} records (outbound `statuses` only).
 */
export function parse(payload: unknown): DeliveryEvent[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const entries = asArray(root.entry);
  const events: DeliveryEvent[] = [];

  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const changes = asArray((entry as Record<string, unknown>).changes);
    for (const change of changes) {
      if (typeof change !== "object" || change === null) {
        continue;
      }
      const value = (change as Record<string, unknown>).value;
      if (typeof value !== "object" || value === null) {
        continue;
      }
      const valueRecord = value as Record<string, unknown>;

      for (const status of asArray(valueRecord.statuses)) {
        if (typeof status !== "object" || status === null) {
          continue;
        }
        const s = status as Record<string, unknown>;
        const statusName = typeof s.status === "string" ? s.status.toLowerCase() : "";
        const timestamp = parseTimestamp(
          typeof s.timestamp === "string" || typeof s.timestamp === "number"
            ? s.timestamp
            : undefined,
        );

        events.push(
          deliveryEvent({
            channel: "whatsapp",
            provider: "whatsapp-cloud",
            type: mapEventType(statusName, WA_STATUS_MAP),
            raw: status,
            ...(typeof s.id === "string" ? { messageId: s.id } : {}),
            ...(typeof s.recipient_id === "string" ? { recipient: s.recipient_id } : {}),
            ...(timestamp !== undefined ? { timestamp } : {}),
          }),
        );
      }
    }
  }

  return events;
}

/**
 * Verify a Meta WhatsApp webhook signature (`X-Hub-Signature-256`).
 * Computes HMAC-SHA256 over the unmodified raw body with the app secret.
 * Returns false when the header is missing or the signature does not match.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export async function verifySignature(
  payload: string,
  signatureHeader: string,
  appSecret: string,
): Promise<boolean> {
  const match = /^sha256=([0-9a-fA-F]+)$/u.exec(signatureHeader.trim());
  if (match === null || match[1] === undefined) {
    return false;
  }

  const expectedBytes = decodeHexBytes(match[1].toLowerCase());
  if (expectedBytes === null) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encodeUtf8(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encodeUtf8(payload));
  return timingSafeEqual(new Uint8Array(mac), expectedBytes);
}

function encodeUtf8(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
