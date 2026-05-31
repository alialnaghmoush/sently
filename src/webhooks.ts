/**
 * @module
 * Provider webhook parsers — normalize delivery events into {@link EmailEvent}.
 *
 * Pure parsing only; no server framework required. Signature verification
 * helpers are optional and never required to call `parse`.
 *
 * @example
 * ```ts
 * import { parseResendWebhook } from "sently/webhooks";
 *
 * const events = parseResendWebhook(await request.json());
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
export type { EmailEvent } from "./webhooks/types.js";
