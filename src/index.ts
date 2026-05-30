/**
 * @module
 * Main sently entrypoint — runtime detection, mailer factory, and shared types.
 *
 * @example
 * ```ts
 * import { createMailer } from "sently";
 *
 * const mailer = await createMailer({
 *   host: "smtp.example.com",
 *   auth: { user: "you@example.com", pass: "secret" },
 * });
 *
 * await mailer.send({
 *   from: "you@example.com",
 *   to: "recipient@example.com",
 *   subject: "Hello",
 *   text: "Plain text body",
 * });
 * ```
 */

export { GOOGLE_TOKEN_URL, MICROSOFT_TOKEN_URL, OAuth2Client } from "./auth/oauth2.js";
export { SMTPError } from "./core/smtp.js";
export type {
  Address,
  AddressInput,
  Attachment,
  BrevoConfig,
  BulkSendOptions,
  BulkSendResult,
  CreateMailerOptions,
  DKIMConfig,
  Envelope,
  Mailer,
  MailgunConfig,
  MailOptions,
  MailPlugin,
  OAuth2Config,
  PoolConfig,
  PreviewConfig,
  RetryConfig,
  Runtime,
  SESConfig,
  SendResult,
  SMTPAuth,
  SMTPConfig,
  SocketAdapter,
  TLSOptions,
  Transport,
  VerifyResult,
} from "./core/types.js";
export { createMailer, detectRuntime } from "./detect.js";
export type { TemplateEngine, TemplatePluginConfig } from "./plugins/template.js";
export { simpleEngine, templatePlugin } from "./plugins/template.js";
export { SMTPPool } from "./pool/pool.js";
export { BrevoError, BrevoTransport } from "./transports/brevo.js";
export { MailgunError, MailgunTransport } from "./transports/mailgun.js";
export { PostmarkError, PostmarkTransport } from "./transports/postmark.js";
export { PreviewTransport } from "./transports/preview.js";
export { ResendError, ResendTransport } from "./transports/resend.js";
export { RetryTransport } from "./transports/retry.js";
export { SendGridError, SendGridTransport } from "./transports/sendgrid.js";
export { SESError, SESTransport } from "./transports/ses.js";
export { SMTPTransport } from "./transports/smtp.js";
