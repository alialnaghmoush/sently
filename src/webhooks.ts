/**
 * @module
 * Provider webhook parsers — normalize delivery events into {@link EmailEvent}
 * or {@link DeliveryEvent} (SMS / WhatsApp).
 *
 * Pure parsing only; no server framework required. Signature verification
 * helpers are optional and never required to call `parse`.
 *
 * Prefer per-provider subpaths for the smallest runtime graph
 * (`sently/webhooks/resend`, `sently/webhooks/twilio-sms`, …). This barrel
 * re-exports every parser for convenience — bundlers tree-shake unused named
 * imports, but Node/Deno without a bundler evaluate every re-export.
 *
 * @example
 * ```ts
 * import { parse } from "sently/webhooks/resend";
 * // or: import { parseResendWebhook } from "sently/webhooks";
 *
 * const events = parse(await request.json());
 * for (const event of events) {
 *   if (event.type === "bounced") {
 *     // handle bounce
 *   }
 * }
 * ```
 */

export { parse as parseBrevoWebhook } from "./webhooks/brevo.js";
export {
  parse as parseMailgunWebhook,
  verifyPayload as verifyMailgunPayload,
  verifySignature as verifyMailgunSignature,
} from "./webhooks/mailgun.js";
export { parse as parsePostmarkWebhook } from "./webhooks/postmark.js";
export {
  parse as parseResendWebhook,
  verifySignature as verifyResendSignature,
} from "./webhooks/resend.js";
export { parse as parseSendGridWebhook } from "./webhooks/sendgrid.js";
export { parse as parseSesWebhook } from "./webhooks/ses.js";
export {
  parse as parseSndrWebhook,
  verifySignature as verifySndrSignature,
} from "./webhooks/sndr.js";
export {
  parse as parseTwilioSmsWebhook,
  verifySignature as verifyTwilioSmsSignature,
} from "./webhooks/twilio-sms.js";
export type { DeliveryChannel, DeliveryEvent, EmailEvent } from "./webhooks/types.js";
export { toDeliveryEvent } from "./webhooks/types.js";
export { parse as parseUnifonicWebhook } from "./webhooks/unifonic.js";
export {
  parse as parseWhatsAppCloudWebhook,
  verifySignature as verifyWhatsAppCloudSignature,
} from "./webhooks/whatsapp-cloud.js";
