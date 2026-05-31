/**
 * @module
 * Main sently entrypoint — shared types, mailer factories, runtime detection, and OAuth2.
 *
 * Import transports, webhooks, idempotency, DKIM, and plugins from their subpaths
 * (e.g. `sently/transports/resend`, `sently/webhooks`) for the smallest bundle.
 *
 * @example
 * ```ts
 * import { createMailer } from "sently/mailer";
 * import { ResendTransport } from "sently/transports/resend";
 *
 * const mailer = await createMailer({
 *   transport: new ResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
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
export type {
  Address,
  AddressInput,
  Attachment,
  BrevoConfig,
  BulkSendOptions,
  BulkSendResult,
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
  SMTPMailerOptions,
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
export {
  /** Create a mailer for custom transports (HTTP APIs, preview, retry). Prefer `sently/mailer` for smallest bundles. */
  createMailer,
} from "./mailer.js";
export {
  /** Create a mailer from SMTP host/port config (pooling, adapters). Prefer `sently/smtp` for smallest SMTP bundles. */
  createSMTPMailer,
} from "./smtp-mailer.js";
