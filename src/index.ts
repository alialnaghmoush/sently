/**
 * @module
 * Main sently entrypoint — runtime detection, mailer factory, and shared types.
 *
 * @example
 * ```ts
 * import { createMailer } from "sently/smtp";
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

export {
  /** Default Google OAuth2 token endpoint. */
  GOOGLE_TOKEN_URL,
  /** Microsoft OAuth2 token endpoint (common tenant). */
  MICROSOFT_TOKEN_URL,
  /** OAuth2 client with in-memory token cache and automatic refresh. */
  OAuth2Client,
} from "./auth/oauth2.js";
export type { SentlyErrorCode, SentlyErrorOptions } from "./core/errors.js";
export {
  /** Map an HTTP status code to a stable sently error code. */
  httpStatusToSentlyCode,
  /** Base error class for all sently transport and protocol failures. */
  SentlyError,
  /** Map an SMTP response code to a stable sently error code. */
  smtpCodeToSentlyCode,
} from "./core/errors.js";
export {
  /** SMTP protocol error with server response details. */
  SMTPError,
} from "./core/smtp.js";
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
  MailerHookContext,
  MailerHooks,
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
  TransportMailerOptions,
  VerifyResult,
} from "./core/types.js";
export {
  /** Detect the current JavaScript runtime. */
  detectRuntime,
} from "./detect.js";
export type { DKIMSignResult } from "./dkim.js";
export {
  /** Import a PEM private key for DKIM signing. */
  importPrivateKey,
  /** Sign a raw MIME message with DKIM (RFC 6376). */
  signDKIM,
} from "./dkim.js";
export type {
  /** Key-value store for idempotency deduplication. */
  IdempotencyStore,
  /** Options for {@link IdempotencyTransport}. */
  IdempotencyTransportOptions,
} from "./idempotency.js";
export {
  /** Transport decorator that deduplicates sends on retry or replay. */
  IdempotencyTransport,
  /** In-memory idempotency store with optional TTL expiry. */
  MemoryIdempotencyStore,
} from "./idempotency.js";
export {
  /** Create a mailer for custom transports (HTTP APIs, preview, retry). Prefer `sently/mailer` for smallest bundles. */
  createMailer,
} from "./mailer.js";
export type {
  /** Renders a template string with the given data object. */
  TemplateEngine,
  /** Configuration for the template plugin. */
  TemplatePluginConfig,
} from "./plugins/template.js";
export {
  /** Built-in zero-dependency template engine using `{{variable}}` interpolation. */
  simpleEngine,
  /** Create a template plugin that renders HTML from a named template and data. */
  templatePlugin,
} from "./plugins/template.js";
export {
  /** SMTP connection pool with optional rate limiting. */
  SMTPPool,
} from "./pool/pool.js";
export {
  /** Create a mailer from SMTP host/port config (pooling, adapters). */
  createSMTPMailer,
} from "./smtp-mailer.js";
export {
  /** Error thrown when the Brevo API returns a non-success response. */
  BrevoError,
  /** Brevo HTTP API transport. */
  BrevoTransport,
} from "./transports/brevo.js";
export {
  /** Error thrown when the Mailgun API returns a non-success response. */
  MailgunError,
  /** Mailgun HTTP API transport (multipart/form-data). */
  MailgunTransport,
} from "./transports/mailgun.js";
export {
  /** Error thrown when the Postmark API returns a non-success response. */
  PostmarkError,
  /** Postmark HTTP API transport. */
  PostmarkTransport,
} from "./transports/postmark.js";
export {
  /** Development transport that writes emails to disk instead of sending them. */
  PreviewTransport,
} from "./transports/preview.js";
export {
  /** Maximum messages per Resend batch request. */
  RESEND_BATCH_MAX,
  /** Error thrown when the Resend API returns a non-success response. */
  ResendError,
  /** Resend HTTP API transport. */
  ResendTransport,
} from "./transports/resend.js";
export {
  /** Decorator transport that retries failed sends with configurable backoff. */
  RetryTransport,
} from "./transports/retry.js";
export {
  /** Error thrown when the SendGrid API returns a non-success response. */
  SendGridError,
  /** SendGrid v3 HTTP API transport. */
  SendGridTransport,
} from "./transports/sendgrid.js";
export {
  /** Error thrown when the AWS SES API returns a non-success response. */
  SESError,
  /** AWS SES v2 HTTP API transport. */
  SESTransport,
} from "./transports/ses.js";
export {
  /** SMTP transport orchestrating adapter, MIME builder, and protocol logic. */
  SMTPTransport,
} from "./transports/smtp.js";
export type { EmailEvent } from "./webhooks.js";
export {
  /** Parse a Brevo webhook payload into normalized email events. */
  parseBrevoWebhook,
  /** Parse a Mailgun webhook payload into normalized email events. */
  parseMailgunWebhook,
  /** Parse a Postmark webhook payload into normalized email events. */
  parsePostmarkWebhook,
  /** Parse a Resend webhook payload into normalized email events. */
  parseResendWebhook,
  /** Parse a SendGrid Event Webhook payload into normalized email events. */
  parseSendGridWebhook,
  /** Parse an AWS SES SNS webhook payload into normalized email events. */
  parseSesWebhook,
  /** Verify a Mailgun webhook using the nested signature object. */
  verifyMailgunPayload,
  /** Verify a Mailgun webhook HMAC signature. */
  verifyMailgunSignature,
  /** Verify a Resend webhook Svix-style signature. */
  verifyResendSignature,
} from "./webhooks.js";
