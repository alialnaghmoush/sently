import type { EmailEvent } from "./types.js";
import { emailEvent, mapEventType, parseTimestamp } from "./types.js";

const SES_EVENT_MAP: Record<string, EmailEvent["type"]> = {
  Delivery: "delivered",
  Bounce: "bounced",
  Complaint: "complained",
  Open: "opened",
  Click: "clicked",
  DeliveryDelay: "deferred",
  Send: "unknown",
  Reject: "bounced",
  "Rendering Failure": "bounced",
  Subscription: "unknown",
};

function resolveSesEventType(record: Record<string, unknown>): string {
  if (typeof record.eventType === "string") {
    return record.eventType;
  }
  if (typeof record.notificationType === "string") {
    return record.notificationType;
  }
  return "";
}

function extractSesRecipient(record: Record<string, unknown>): string | undefined {
  const delivery =
    typeof record.delivery === "object" && record.delivery !== null
      ? (record.delivery as Record<string, unknown>)
      : undefined;
  if (
    delivery &&
    Array.isArray(delivery.recipients) &&
    typeof delivery.recipients[0] === "string"
  ) {
    return delivery.recipients[0];
  }

  const bounce =
    typeof record.bounce === "object" && record.bounce !== null
      ? (record.bounce as Record<string, unknown>)
      : undefined;
  if (bounce && Array.isArray(bounce.bouncedRecipients)) {
    const first = bounce.bouncedRecipients[0];
    if (
      typeof first === "object" &&
      first !== null &&
      typeof (first as Record<string, unknown>).emailAddress === "string"
    ) {
      return (first as Record<string, unknown>).emailAddress as string;
    }
  }

  const complaint =
    typeof record.complaint === "object" && record.complaint !== null
      ? (record.complaint as Record<string, unknown>)
      : undefined;
  if (complaint && Array.isArray(complaint.complainedRecipients)) {
    const first = complaint.complainedRecipients[0];
    if (
      typeof first === "object" &&
      first !== null &&
      typeof (first as Record<string, unknown>).emailAddress === "string"
    ) {
      return (first as Record<string, unknown>).emailAddress as string;
    }
  }

  const mail =
    typeof record.mail === "object" && record.mail !== null
      ? (record.mail as Record<string, unknown>)
      : undefined;
  if (Array.isArray(mail?.destination) && typeof mail.destination[0] === "string") {
    return mail.destination[0];
  }

  return undefined;
}

function parseSesEvent(record: Record<string, unknown>): EmailEvent[] {
  const eventType = resolveSesEventType(record);
  const mail =
    typeof record.mail === "object" && record.mail !== null
      ? (record.mail as Record<string, unknown>)
      : undefined;

  const bounce =
    typeof record.bounce === "object" && record.bounce !== null
      ? (record.bounce as Record<string, unknown>)
      : undefined;
  const complaint =
    typeof record.complaint === "object" && record.complaint !== null
      ? (record.complaint as Record<string, unknown>)
      : undefined;
  const open =
    typeof record.open === "object" && record.open !== null
      ? (record.open as Record<string, unknown>)
      : undefined;
  const click =
    typeof record.click === "object" && record.click !== null
      ? (record.click as Record<string, unknown>)
      : undefined;
  const deliveryDelay =
    typeof record.deliveryDelay === "object" && record.deliveryDelay !== null
      ? (record.deliveryDelay as Record<string, unknown>)
      : undefined;

  const recipient = extractSesRecipient(record);
  const timestamp = parseTimestamp(
    record.timestamp ??
      bounce?.timestamp ??
      complaint?.timestamp ??
      open?.timestamp ??
      click?.timestamp ??
      deliveryDelay?.timestamp ??
      mail?.timestamp,
  );

  return [
    emailEvent({
      provider: "ses",
      type: mapEventType(eventType, SES_EVENT_MAP),
      ...(typeof mail?.messageId === "string" ? { messageId: mail.messageId } : {}),
      ...(recipient !== undefined ? { recipient } : {}),
      ...(timestamp !== undefined ? { timestamp } : {}),
      raw: record,
    }),
  ];
}

/**
 * Parse an AWS SES webhook payload (SNS envelope) into normalized {@link EmailEvent} records.
 * Handles SubscriptionConfirmation (returns `[]`) and double-encoded Notification messages.
 */
export function parse(payload: unknown): EmailEvent[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const envelope = payload as Record<string, unknown>;
  const snsType = typeof envelope.Type === "string" ? envelope.Type : "";

  if (snsType === "SubscriptionConfirmation") {
    return [];
  }

  if (snsType !== "Notification") {
    return [];
  }

  const messageField = envelope.Message;
  let inner: unknown;

  if (typeof messageField === "string") {
    try {
      inner = JSON.parse(messageField);
    } catch {
      return [
        {
          provider: "ses",
          type: "unknown" as const,
          raw: payload,
        },
      ];
    }
  } else if (typeof messageField === "object" && messageField !== null) {
    inner = messageField;
  } else {
    return [];
  }

  if (typeof inner !== "object" || inner === null) {
    return [
      {
        provider: "ses",
        type: "unknown" as const,
        raw: payload,
      },
    ];
  }

  return parseSesEvent(inner as Record<string, unknown>);
}
