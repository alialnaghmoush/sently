/**
 * @module
 * Twilio SMS status-callback parser → {@link DeliveryEvent}.
 *
 * Accepts Twilio's form-urlencoded StatusCallback fields (as a parsed object
 * or `URLSearchParams`) or an equivalent JSON object.
 *
 * @see https://www.twilio.com/docs/messaging/guides/track-outbound-message-status
 */
import { encodeBase64 } from "../core/base64.js";
import { decodeBase64Bytes, timingSafeEqual } from "./timing-safe-equal.js";
import type { DeliveryEvent } from "./types.js";
import { deliveryEvent, mapEventType, parseTimestamp } from "./types.js";

const TWILIO_STATUS_MAP: Record<string, DeliveryEvent["type"]> = {
  accepted: "queued",
  queued: "queued",
  sending: "sent",
  sent: "sent",
  delivered: "delivered",
  undelivered: "failed",
  failed: "failed",
  receiving: "sent",
  received: "delivered",
  read: "read",
};

/**
 * Parse a Twilio SMS StatusCallback payload into normalized {@link DeliveryEvent}
 * records.
 */
export function parse(payload: unknown): DeliveryEvent[] {
  const record = toRecord(payload);
  if (record === undefined) {
    return [];
  }

  const statusRaw =
    typeof record.MessageStatus === "string"
      ? record.MessageStatus
      : typeof record.SmsStatus === "string"
        ? record.SmsStatus
        : typeof record.messageStatus === "string"
          ? record.messageStatus
          : "";

  const messageId =
    typeof record.MessageSid === "string"
      ? record.MessageSid
      : typeof record.SmsSid === "string"
        ? record.SmsSid
        : typeof record.messageSid === "string"
          ? record.messageSid
          : undefined;

  const recipient =
    typeof record.To === "string"
      ? record.To
      : typeof record.to === "string"
        ? record.to
        : undefined;

  const timestamp = parseTimestamp(record.Timestamp ?? record.timestamp);

  // Permanent failures often include ErrorCode even when status is undelivered.
  let type = mapEventType(statusRaw.toLowerCase(), TWILIO_STATUS_MAP);
  if (type === "unknown" && (record.ErrorCode !== undefined || record.errorCode !== undefined)) {
    type = "failed";
  }

  return [
    deliveryEvent({
      channel: "sms",
      provider: "twilio-sms",
      type,
      raw: payload,
      ...(messageId !== undefined ? { messageId } : {}),
      ...(recipient !== undefined ? { recipient } : {}),
      ...(timestamp !== undefined ? { timestamp } : {}),
    }),
  ];
}

/**
 * Verify a Twilio request signature (`X-Twilio-Signature`).
 *
 * Builds the signed string as `url + sorted(key+value for each POST param)`,
 * HMAC-SHA1 with the Auth Token, then base64-compares to the header.
 *
 * @param url - Exact public URL Twilio requested (including query string).
 * @param params - Parsed form body (or `URLSearchParams`).
 * @param signature - Value of the `X-Twilio-Signature` header.
 * @param authToken - Twilio Auth Token (or API Key Secret used for validation).
 *
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
export async function verifySignature(
  url: string,
  params: Record<string, string> | URLSearchParams,
  signature: string,
  authToken: string,
): Promise<boolean> {
  if (signature.length === 0 || authToken.length === 0 || url.length === 0) {
    return false;
  }

  const entries =
    params instanceof URLSearchParams
      ? [...params.entries()]
      : Object.entries(params).map(([key, value]) => [key, String(value)] as const);

  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  let data = url;
  for (const [key, value] of entries) {
    data += key + value;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encodeUtf8(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encodeUtf8(data));
  const expected = encodeBase64(new Uint8Array(mac)).replace(/\r\n/g, "");
  const expectedBytes = decodeBase64Bytes(expected);
  const actualBytes = decodeBase64Bytes(signature);
  if (expectedBytes === null || actualBytes === null) {
    return false;
  }
  return timingSafeEqual(expectedBytes, actualBytes);
}

function toRecord(payload: unknown): Record<string, unknown> | undefined {
  if (payload instanceof URLSearchParams) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of payload.entries()) {
      out[key] = value;
    }
    return out;
  }

  if (typeof payload === "string") {
    try {
      return toRecord(new URLSearchParams(payload));
    } catch {
      return undefined;
    }
  }

  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }

  return undefined;
}

function encodeUtf8(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
