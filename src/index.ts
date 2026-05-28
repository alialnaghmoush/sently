/**
 * @module
 * Main sendx entrypoint — runtime detection, mailer factory, and shared types.
 *
 * @example
 * ```ts
 * import { createMailer } from "@sendx/sendx";
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

export { SMTPError } from "./core/smtp.js";
export type {
  Address,
  AddressInput,
  Attachment,
  CreateMailerOptions,
  Envelope,
  Mailer,
  MailOptions,
  Runtime,
  SendResult,
  SMTPAuth,
  SMTPConfig,
  SocketAdapter,
  TLSOptions,
  Transport,
} from "./core/types.js";
export { createMailer, detectRuntime } from "./detect.js";
