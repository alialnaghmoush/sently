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

/** Map a provider-specific event string to a normalized {@link EmailEvent.type}. */
export type EventTypeMapper = (event: string) => EmailEvent["type"];

/** Default mapper — returns `"unknown"` for unrecognized events. */
export function mapEventType(
  event: string,
  mapping: Record<string, EmailEvent["type"]>,
): EmailEvent["type"] {
  return mapping[event] ?? "unknown";
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
