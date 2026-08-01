/**
 * @module
 * Unifonic SMS status-callback parser → {@link DeliveryEvent}.
 *
 * Accepts Unifonic DLR / status callback JSON (or form-like objects) with
 * `MessageID` / `Status` fields commonly used alongside el.cloud sends.
 */
import type { DeliveryEvent } from "./types.js";
import { asArray, deliveryEvent, mapEventType, parseTimestamp } from "./types.js";

const UNIFONIC_STATUS_MAP: Record<string, DeliveryEvent["type"]> = {
  queued: "queued",
  sent: "sent",
  delivered: "delivered",
  failed: "failed",
  rejected: "failed",
  undelivered: "failed",
  expired: "failed",
};

/**
 * Parse a Unifonic SMS status callback payload into normalized
 * {@link DeliveryEvent} records.
 */
export function parse(payload: unknown): DeliveryEvent[] {
  const items = asArray(payload);
  const events: DeliveryEvent[] = [];

  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const record = unwrapData(item as Record<string, unknown>);
    const statusRaw =
      typeof record.Status === "string"
        ? record.Status
        : typeof record.status === "string"
          ? record.status
          : "";

    const messageId =
      record.MessageID !== undefined
        ? String(record.MessageID)
        : record.messageId !== undefined
          ? String(record.messageId)
          : typeof record.CorrelationID === "string"
            ? record.CorrelationID
            : undefined;

    const recipient =
      typeof record.Recipient === "string"
        ? record.Recipient
        : typeof record.recipient === "string"
          ? record.recipient
          : undefined;

    const timestamp = parseTimestamp(record.TimeCreated ?? record.timestamp ?? record.Timestamp);

    events.push(
      deliveryEvent({
        channel: "sms",
        provider: "unifonic",
        type: mapEventType(statusRaw.toLowerCase(), UNIFONIC_STATUS_MAP),
        raw: item,
        ...(messageId !== undefined ? { messageId } : {}),
        ...(recipient !== undefined ? { recipient } : {}),
        ...(timestamp !== undefined ? { timestamp } : {}),
      }),
    );
  }

  return events;
}

function unwrapData(record: Record<string, unknown>): Record<string, unknown> {
  if (typeof record.data === "object" && record.data !== null && !Array.isArray(record.data)) {
    return record.data as Record<string, unknown>;
  }
  return record;
}
