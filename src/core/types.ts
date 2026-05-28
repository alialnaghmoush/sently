// src/core/types.ts

// ─── Address ──────────────────────────────────────────────

/** A single email address with optional display name. */
export interface Address {
  name?: string;
  address: string;
}

/** Flexible address input accepted by mail APIs. */
export type AddressInput = string | Address | (string | Address)[];

// ─── Attachment ───────────────────────────────────────────

/** Email attachment (in-memory or file path on supported runtimes). */
export interface Attachment {
  filename: string;
  content?: Uint8Array | string;
  path?: string;
  contentType?: string;
  encoding?: "base64" | "7bit" | "8bit" | "binary" | "quoted-printable";
  contentId?: string;
  inline?: boolean;
  headers?: Record<string, string>;
}

// ─── Mail Options ─────────────────────────────────────────

/** Options for composing and sending an email message. */
export interface MailOptions {
  from: AddressInput;
  to: AddressInput;
  cc?: AddressInput;
  bcc?: AddressInput;
  replyTo?: AddressInput;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Attachment[];
  headers?: Record<string, string>;
  messageId?: string;
  date?: Date;
  priority?: "high" | "normal" | "low";
  encoding?: "utf-8" | "ascii";
}

// ─── Send Result ──────────────────────────────────────────

/** Result returned after a message is accepted for delivery. */
export interface SendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
  envelope: Envelope;
}

// ─── Envelope ─────────────────────────────────────────────

/** SMTP envelope addresses (MAIL FROM / RCPT TO). */
export interface Envelope {
  from: string;
  to: string[];
}

// ─── Socket Adapter ───────────────────────────────────────

/** Runtime-specific TCP/TLS socket abstraction for SMTP. */
export interface SocketAdapter {
  connect(host: string, port: number): Promise<void>;
  startTLS(options?: TLSOptions): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  read(): AsyncIterable<Uint8Array>;
  close(): Promise<void>;
  readonly secure: boolean;
  readonly connected: boolean;
}

// ─── TLS Options ──────────────────────────────────────────

/** TLS connection options for STARTTLS and direct TLS. */
export interface TLSOptions {
  rejectUnauthorized?: boolean;
  servername?: string;
}

// ─── Transport ────────────────────────────────────────────

/** Pluggable mail delivery backend (SMTP, HTTP API, etc.). */
export interface Transport {
  send(options: MailOptions): Promise<SendResult>;
  verify?(): Promise<boolean>;
  close?(): Promise<void>;
}

// ─── SMTP Config ──────────────────────────────────────────

/** Configuration for SMTP transport and relay connections. */
export interface SMTPConfig {
  host: string;
  port?: number;
  secure?: boolean;
  auth?: SMTPAuth;
  tls?: TLSOptions;
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
  direct?: boolean;
  adapter?: SocketAdapter;
}

/** SMTP authentication credentials and method hint. */
export interface SMTPAuth {
  user: string;
  pass: string;
  type?: "LOGIN" | "PLAIN" | "CRAM-MD5";
}

// ─── Mailer ───────────────────────────────────────────────

/** High-level mailer API wrapping a transport. */
export interface Mailer {
  send(options: MailOptions): Promise<SendResult>;
  verify(): Promise<boolean>;
  close(): Promise<void>;
}

// ─── createMailer Options ─────────────────────────────────

/** Options for {@link createMailer} — custom transport or SMTP config. */
export type CreateMailerOptions = ({ transport: Transport } & Partial<SMTPConfig>) | SMTPConfig;

// ─── Runtime ──────────────────────────────────────────────

/** Detected JavaScript runtime environment. */
export type Runtime = "node" | "bun" | "deno" | "cf-workers" | "browser" | "unknown";
