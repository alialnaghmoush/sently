import type { EmailEvent } from "./types.js";
import { emailEvent, mapEventType, parseTimestamp } from "./types.js";

const POSTMARK_EVENT_MAP: Record<string, EmailEvent["type"]> = {
  Delivery: "delivered",
  Bounce: "bounced",
  SpamComplaint: "complained",
  Open: "opened",
  Click: "clicked",
  SubscriptionChange: "unknown",
  Inbound: "unknown",
};

/** Parse a Postmark webhook payload into normalized {@link EmailEvent} records. */
export function parse(payload: unknown): EmailEvent[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const recordType = typeof record.RecordType === "string" ? record.RecordType : "";

  return [
    emailEvent({
      provider: "postmark",
      type: mapEventType(recordType, POSTMARK_EVENT_MAP),
      ...(typeof record.MessageID === "string" ? { messageId: record.MessageID } : {}),
      ...(typeof record.Recipient === "string"
        ? { recipient: record.Recipient }
        : typeof record.Email === "string"
          ? { recipient: record.Email }
          : {}),
      ...(parseTimestamp(
        record.DeliveredAt ?? record.BouncedAt ?? record.ReceivedAt ?? record.ChangedAt,
      ) !== undefined
        ? {
            timestamp: parseTimestamp(
              record.DeliveredAt ?? record.BouncedAt ?? record.ReceivedAt ?? record.ChangedAt,
            ),
          }
        : {}),
      raw: payload,
    }),
  ];
}
