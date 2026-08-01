/**
 * @module
 * Cross-channel send-result mapping — normalize email / SMS / WhatsApp / push
 * results into a shared `{ messageId, provider, accepted }` shape for adapters.
 */
import type { PushSendResult } from "./push-types.js";
import type { SmsSendResult } from "./sms-types.js";
import type { SendResult } from "./types.js";
import type { WhatsAppSendResult } from "./whatsapp-types.js";

/**
 * Stable send outcome shared across email, SMS, WhatsApp, and push.
 * Prefer this in multi-channel adapter layers; channel-specific fields stay on
 * the original result types.
 */
export interface ChannelSendResult {
  /** Provider-assigned or client message identifier. */
  messageId: string;
  /** Transport or provider identifier when known. */
  provider?: string;
  /**
   * Whether the provider accepted the message for delivery.
   * Does not guarantee end-user delivery (use webhooks for that).
   */
  accepted: boolean;
}

/** Any channel send result that {@link toChannelSendResult} can normalize. */
export type AnySendResult = SendResult | SmsSendResult | WhatsAppSendResult | PushSendResult;

/**
 * Status strings treated as provider-accepted for SMS / WhatsApp / push.
 * Twilio often returns `"queued"`; Unifonic may return `"Sent"`.
 */
const ACCEPTED_STATUSES = new Set([
  "accepted",
  "queued",
  "sending",
  "sent",
  "delivered",
  "read",
  "success",
]);

/**
 * Map a channel-specific send result to {@link ChannelSendResult}.
 *
 * | Channel result | `accepted` mapping |
 * | --- | --- |
 * | Email {@link SendResult} | `accepted.length > 0` and `rejected.length === 0` |
 * | SMS / WhatsApp / Push | `status` in accepted set (case-insensitive), else `false` |
 */
export function toChannelSendResult(result: AnySendResult): ChannelSendResult {
  if (isEmailSendResult(result)) {
    const out: ChannelSendResult = {
      messageId: result.messageId,
      accepted: result.accepted.length > 0 && result.rejected.length === 0,
    };
    if (result.provider !== undefined) {
      out.provider = result.provider;
    }
    return out;
  }

  const out: ChannelSendResult = {
    messageId: result.messageId,
    accepted: isAcceptedStatus(result.status),
  };
  if (result.provider !== undefined) {
    out.provider = result.provider;
  }
  return out;
}

function isEmailSendResult(result: AnySendResult): result is SendResult {
  return (
    Array.isArray((result as SendResult).accepted) && Array.isArray((result as SendResult).rejected)
  );
}

function isAcceptedStatus(status: string): boolean {
  return ACCEPTED_STATUSES.has(status.trim().toLowerCase());
}
