import type { EmailEvent } from "./types.js";
import { asArray, emailEvent, mapEventType, parseTimestamp } from "./types.js";

const BREVO_EVENT_MAP: Record<string, EmailEvent["type"]> = {
  delivered: "delivered",
  hard_bounce: "bounced",
  hardBounce: "bounced",
  soft_bounce: "bounced",
  soft_bounced: "bounced",
  softBounce: "bounced",
  blocked: "bounced",
  invalid: "bounced",
  invalid_email: "bounced",
  deferred: "deferred",
  spam: "complained",
  opened: "opened",
  unique_opened: "opened",
  uniqueOpened: "opened",
  click: "clicked",
  clicked: "clicked",
  unique_click: "clicked",
  uniqueClicked: "clicked",
  sent: "unknown",
  request: "unknown",
  unsubscribe: "complained",
  unsubscribed: "complained",
};

function resolveBrevoTimestamp(record: Record<string, unknown>): Date | undefined {
  return (
    parseTimestamp(record.ts_event) ??
    parseTimestamp(record.ts) ??
    parseTimestamp(record.date_event) ??
    parseTimestamp(record.date) ??
    parseTimestamp(record.ts_epoch !== undefined ? Number(record.ts_epoch) : undefined)
  );
}

function resolveBrevoMessageId(record: Record<string, unknown>): string | undefined {
  if (typeof record["message-id"] === "string") {
    return record["message-id"];
  }
  if (typeof record.messageId === "string") {
    return record.messageId;
  }
  return undefined;
}

/** Parse a Brevo webhook payload into normalized {@link EmailEvent} records. */
export function parse(payload: unknown): EmailEvent[] {
  return asArray(payload).flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const record = item as Record<string, unknown>;
    const event = typeof record.event === "string" ? record.event : "";
    const timestamp = resolveBrevoTimestamp(record);
    const messageId = resolveBrevoMessageId(record);

    return [
      emailEvent({
        provider: "brevo",
        type: mapEventType(event, BREVO_EVENT_MAP),
        ...(messageId !== undefined ? { messageId } : {}),
        ...(typeof record.email === "string" ? { recipient: record.email } : {}),
        ...(timestamp !== undefined ? { timestamp } : {}),
        raw: item,
      }),
    ];
  });
}
