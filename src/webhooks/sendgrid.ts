import type { EmailEvent } from "./types.js";
import { asArray, emailEvent, mapEventType, parseTimestamp } from "./types.js";

const SENDGRID_EVENT_MAP: Record<string, EmailEvent["type"]> = {
  processed: "unknown",
  delivered: "delivered",
  deferred: "deferred",
  bounce: "bounced",
  dropped: "bounced",
  spamreport: "complained",
  unsubscribe: "complained",
  group_unsubscribe: "complained",
  group_resubscribe: "unknown",
  open: "opened",
  click: "clicked",
};

/** Map a SendGrid event name (and bounce subtype) to a normalized type. */
function mapSendGridType(record: Record<string, unknown>): EmailEvent["type"] {
  const event = typeof record.event === "string" ? record.event : "";
  if (event === "bounce" && record.type === "blocked") {
    return "deferred";
  }
  return mapEventType(event, SENDGRID_EVENT_MAP);
}

/** Parse a SendGrid Event Webhook payload into normalized {@link EmailEvent} records. */
export function parse(payload: unknown): EmailEvent[] {
  return asArray(payload).flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const record = item as Record<string, unknown>;
    const timestamp = parseTimestamp(record.timestamp);

    return [
      emailEvent({
        provider: "sendgrid",
        type: mapSendGridType(record),
        ...(typeof record.sg_message_id === "string"
          ? { messageId: record.sg_message_id }
          : typeof record["smtp-id"] === "string"
            ? { messageId: record["smtp-id"] }
            : {}),
        ...(typeof record.email === "string" ? { recipient: record.email } : {}),
        ...(timestamp !== undefined ? { timestamp } : {}),
        raw: item,
      }),
    ];
  });
}
