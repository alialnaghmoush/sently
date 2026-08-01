/** Messaging channel for normalized delivery events. */
export type DeliveryChannel = "email" | "sms" | "whatsapp" | "push";

/**
 * Cross-channel delivery / lifecycle event for ingest pipelines.
 * Email webhooks still return {@link EmailEvent}; map with {@link toDeliveryEvent}.
 */
export interface DeliveryEvent {
  /** Channel this event belongs to. */
  channel: DeliveryChannel;
  /** Provider identifier (e.g. `"twilio-sms"`, `"whatsapp-cloud"`). */
  provider: string;
  /** Normalized lifecycle type. */
  type:
    | "queued"
    | "sent"
    | "delivered"
    | "failed"
    | "read"
    | "bounced"
    | "complained"
    | "opened"
    | "clicked"
    | "deferred"
    | "unknown";
  /** Provider message identifier when available. */
  messageId?: string;
  /** Recipient address or phone when available. */
  recipient?: string;
  /** Event timestamp when available. */
  timestamp?: Date;
  /** Original provider payload for debugging or custom handling. */
  raw: unknown;
}

/** Normalized email lifecycle event from any provider webhook. */
export interface EmailEvent {
  /** Provider identifier (e.g. `"resend"`, `"sendgrid"`). */
  provider: string;
  /** Normalized event type. */
  type: "delivered" | "bounced" | "complained" | "opened" | "clicked" | "deferred" | "unknown";
  /** Provider message identifier when available. */
  messageId?: string;
  /** Recipient email address when available. */
  recipient?: string;
  /** Event timestamp when available. */
  timestamp?: Date;
  /** Original provider payload for debugging or custom handling. */
  raw: unknown;
}

/** Map an {@link EmailEvent} into the shared {@link DeliveryEvent} shape. */
export function toDeliveryEvent(event: EmailEvent): DeliveryEvent {
  return deliveryEvent({
    channel: "email",
    provider: event.provider,
    type: event.type,
    raw: event.raw,
    ...(event.messageId !== undefined ? { messageId: event.messageId } : {}),
    ...(event.recipient !== undefined ? { recipient: event.recipient } : {}),
    ...(event.timestamp !== undefined ? { timestamp: event.timestamp } : {}),
  });
}

/** Build a {@link DeliveryEvent} respecting exact optional property types. */
export function deliveryEvent(input: {
  channel: DeliveryChannel;
  provider: string;
  type: DeliveryEvent["type"];
  raw: unknown;
  messageId?: string | undefined;
  recipient?: string | undefined;
  timestamp?: Date | undefined;
}): DeliveryEvent {
  const event: DeliveryEvent = {
    channel: input.channel,
    provider: input.provider,
    type: input.type,
    raw: input.raw,
  };

  if (input.messageId !== undefined) {
    event.messageId = input.messageId;
  }
  if (input.recipient !== undefined) {
    event.recipient = input.recipient;
  }
  if (input.timestamp !== undefined) {
    event.timestamp = input.timestamp;
  }

  return event;
}

/** Map a provider-specific event string to a normalized event type. */
export type EventTypeMapper = (event: string) => EmailEvent["type"] | DeliveryEvent["type"];

/** Default mapper — returns `"unknown"` for unrecognized events. */
export function mapEventType<T extends string>(
  event: string,
  mapping: Record<string, T>,
): T | "unknown" {
  return mapping[event] ?? ("unknown" as const);
}

/** Parse an ISO or Unix timestamp into a Date, or undefined when invalid. */
export function parseTimestamp(value: unknown): Date | undefined {
  if (typeof value === "number") {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

/** Ensure payload is an array (for providers that batch events). */
export function asArray(payload: unknown): unknown[] {
  return Array.isArray(payload) ? payload : [payload];
}

/** Build an {@link EmailEvent} respecting exact optional property types. */
export function emailEvent(input: {
  provider: string;
  type: EmailEvent["type"];
  raw: unknown;
  messageId?: string | undefined;
  recipient?: string | undefined;
  timestamp?: Date | undefined;
}): EmailEvent {
  const event: EmailEvent = {
    provider: input.provider,
    type: input.type,
    raw: input.raw,
  };

  if (input.messageId !== undefined) {
    event.messageId = input.messageId;
  }
  if (input.recipient !== undefined) {
    event.recipient = input.recipient;
  }
  if (input.timestamp !== undefined) {
    event.timestamp = input.timestamp;
  }

  return event;
}
