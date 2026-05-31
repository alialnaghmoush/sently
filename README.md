# sently

> Nodemailer is Node.js–only and ships the full mail stack on every import (~58 KB gzip for [v8.0.10](https://bundlephobia.com/package/nodemailer@8.0.10)).
> sently runs on Bun, Deno, and Cloudflare Workers — same familiar API, HTTP stacks from ~6.1 KB via `sently/mailer`.

```bash
bun add sently
```

[![npm version](https://img.shields.io/npm/v/sently.svg)](https://www.npmjs.com/package/sently)
[![JSR](https://jsr.io/badges/@alialnaghmoush/sently)](https://jsr.io/@alialnaghmoush/sently)
[![bundle size](https://img.shields.io/bundlephobia/minzip/sently)](https://bundlephobia.com/package/sently)
[![license](https://img.shields.io/npm/l/sently.svg)](LICENSE)
[![tests](https://img.shields.io/badge/tests-passing-brightgreen)](#)
[![GitHub](https://img.shields.io/github/stars/alialnaghmoush/sently?style=social&label=GitHub)](https://github.com/alialnaghmoush/sently)

> **Pre-1.0 — API may change.** sently is pre-1.0 and the public API is still being refined ahead of a stable v1.0.0. Breaking changes can land in any 0.x release; review the [CHANGELOG](CHANGELOG.md) before upgrading. Pin an exact version (e.g. `"sently": "0.7.1"`) for production until v1.0.0.

---

## Why not Nodemailer?

| Feature | Nodemailer | sently |
|---------|-----------|--------|
| Bundle size | ~58 KB gzip always ([v8.0.10](https://bundlephobia.com/package/nodemailer@8.0.10)) | ~6.1 KB HTTP · ~15 KB SMTP |
| Runtimes | Node.js only | Node, Bun, Deno, CF Workers |
| Module format | CommonJS | ESM only |
| Dependencies | 0 | 0 |
| DKIM signing | ✓ via `nodemailer-dkim` | ✓ built-in (Web Crypto) |
| OAuth2 / XOAUTH2 | ✓ via plugin | ✓ built-in |
| Connection pooling | ✓ | ✓ |
| HTTP transports | ✓ via plugins | ✓ built-in (6 providers) |
| Retry transport | ✗ | ✓ |
| Preview transport | ✗ | ✓ |
| Template engine | ✗ | ✓ |
| `sendBulk()` | ✗ | ✓ (native batch on Resend/SendGrid) |
| React Email | ✗ via plugin | ✓ `sently/react` |
| Idempotency keys | ✗ | ✓ `sently/idempotency` |
| Webhook parsing | ✗ | ✓ `sently/webhooks` |
| TypeScript | via `@types/nodemailer` | ✓ built-in |
| Last release | 2026 (8.0.x) | 2026 |

---

## The 30-second tour

```typescript
import type { MailOptions } from "sently";
import { createMailer } from "sently/mailer";
import { ResendTransport } from "sently/transports/resend";
import { PreviewTransport } from "sently/transports/preview";

const addFooter = (options: MailOptions): MailOptions => ({
  ...options,
  html: (options.html ?? "") + '<p style="color:#999">Unsubscribe</p>',
});

// Swap providers without changing send code
const mailer = await createMailer({
  transport: new ResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
  plugins: [addFooter],
});

await mailer.send({
  from: "you@example.com",
  to: "recipient@example.com",
  subject: "Hello from sently",
  html: "<p>Hello!</p>",
});

// Bulk send with concurrency control
await mailer.sendBulk(recipients, { concurrency: 5 });

// Local dev — write to disk instead of sending
const devMailer = await createMailer({
  transport: process.env.CI
    ? new ResendTransport({ apiKey: process.env.RESEND_API_KEY! })
    : new PreviewTransport({ outDir: ".emails", open: true }),
});
```

---

## Installation

**npm** ([sently](https://www.npmjs.com/package/sently)):

```bash
bun add sently
npm install sently
pnpm add sently
```

**JSR** ([@alialnaghmoush/sently](https://jsr.io/@alialnaghmoush/sently)) — Deno, Bun, and other JSR-aware runtimes:

```bash
deno add jsr:@alialnaghmoush/sently
bunx jsr add @alialnaghmoush/sently
```

```typescript
import { createMailer } from "sently/mailer"; // HTTP stack ~6.1 KB with a transport
import { createSMTPMailer } from "sently/smtp"; // SMTP relay ~15 KB
// Or: import { createSMTPMailer } from "sently";
```

---

## Quick Start

### SMTP with auto-detected adapter

```typescript
import { createSMTPMailer } from "sently/smtp";

const mailer = await createSMTPMailer({
  host: "smtp.example.com",
  port: 587,
  auth: { user: "you@example.com", pass: "secret" },
});

await mailer.send({
  from: "you@example.com",
  to: "recipient@example.com",
  subject: "Hello from sently",
  text: "Plain text body",
  html: "<p>HTML body</p>",
});

await mailer.close();
```

### Resend HTTP transport (Vercel Edge compatible)

```typescript
import { createMailer } from "sently/mailer";
import { ResendTransport } from "sently/transports/resend";

const mailer = await createMailer({
  transport: new ResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
});

await mailer.send({
  from: "onboarding@yourdomain.com",
  to: "recipient@example.com",
  subject: "Hello from the edge",
  html: "<p>Sent via Resend + sently</p>",
});
```

### Cloudflare Worker

```typescript
import { createSMTPMailer } from "sently/smtp";
import { CloudflareAdapter } from "sently/adapters/cf";

export default {
  async fetch() {
    const mailer = await createSMTPMailer({
      host: "smtp.example.com",
      port: 587,
      auth: { user: "relay@example.com", pass: "secret" },
      adapter: new CloudflareAdapter(),
    });

    await mailer.send({
      from: "relay@example.com",
      to: "user@example.com",
      subject: "From a Worker",
      text: "Hello from Cloudflare Workers",
    });

    return new Response("Sent");
  },
};
```

---

## Adapters

| Runtime | Import | Notes |
|---------|--------|-------|
| Node.js (auto) | `createSMTPMailer` from `sently/smtp` | Auto-detected adapter |
| Node.js (explicit) | `sently/adapters/node` → `NodeAdapter` | Reference implementation |
| Bun (auto) | `createSMTPMailer` from `sently/smtp` | Auto-detected adapter |
| Bun (explicit) | `sently/adapters/bun` → `BunAdapter` | Node compat layer |
| Deno | `sently/adapters/deno` → `DenoAdapter` | Native `Deno.startTls` |
| Cloudflare Workers | `sently/adapters/cf` → `CloudflareAdapter` | `cloudflare:sockets` |

```typescript
import { createSMTPMailer } from "sently/smtp";
import { NodeAdapter } from "sently/adapters/node";

const mailer = await createSMTPMailer({
  host: "smtp.example.com",
  adapter: new NodeAdapter({ secure: false }),
  auth: { user: "you@example.com", pass: "secret" },
});
```

---

## Transports

### SMTP

```typescript
import { createMailer } from "sently/mailer";
import { SMTPTransport } from "sently/transports/smtp";
import { NodeAdapter } from "sently/adapters/node";

const transport = new SMTPTransport({
  host: "smtp.example.com",
  port: 587,
  auth: { user: "you@example.com", pass: "secret" },
  adapter: new NodeAdapter(),
});

const mailer = await createMailer({ transport });
await mailer.verify(); // test connection + auth
```

For relay config (`host` / `port` / `auth`), prefer [`sently/smtp`](#smtp-with-auto-detected-adapter). Use `mailer` + `SMTPTransport` when you need an explicit adapter or transport-level options.

**AUTH methods:** XOAUTH2, CRAM-MD5, LOGIN, and PLAIN (auto-negotiated from EHLO unless `auth.type` is set).

**`requireTLS` (default `true` when `auth` is set):** sently refuses to send credentials over an unencrypted connection. If the link is not secured by direct TLS (`secure: true`) or a successful `STARTTLS` upgrade, authentication throws an `SMTPError` instead of leaking credentials — this defends against STARTTLS-stripping MITM attacks. Set `requireTLS: false` only if you fully trust the network (not recommended).

#### DKIM signing

```typescript
import { createSMTPMailer } from "sently/smtp";

const mailer = await createSMTPMailer({
  host: "smtp.example.com",
  auth: { user: "you@example.com", pass: "secret" },
  dkim: {
    domainName: "example.com",
    keySelector: "2024",
    privateKey: await Bun.file("dkim-private.pem").text(),
  },
});
```

Pass `dkim` on SMTP config or use `signDKIM` from `sently/dkim` directly. MIME lazy-loads DKIM only when the option is set.

#### Gmail OAuth2 (XOAUTH2)

```typescript
import { createSMTPMailer } from "sently/smtp";

const mailer = await createSMTPMailer({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    type: "OAUTH2",
    user: "me@gmail.com",
    oauth2: {
      user: "me@gmail.com",
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
    },
  },
});
```

#### Microsoft 365 OAuth2 (XOAUTH2)

```typescript
import { MICROSOFT_TOKEN_URL } from "sently";
import { createSMTPMailer } from "sently/smtp";

const mailer = await createSMTPMailer({
  host: "smtp.office365.com",
  port: 587,
  auth: {
    type: "OAUTH2",
    user: "you@yourtenant.onmicrosoft.com",
    oauth2: {
      user: "you@yourtenant.onmicrosoft.com",
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      refreshToken: process.env.AZURE_REFRESH_TOKEN!,
      tokenUrl: MICROSOFT_TOKEN_URL,
    },
  },
});
```

#### Connection pooling

```typescript
import { createSMTPMailer } from "sently/smtp";

const mailer = await createSMTPMailer({
  host: "smtp.example.com",
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 10,
  rateLimit: 1000,
  auth: { user: "you@example.com", pass: "secret" },
});
```

Or use `SMTPPool` directly:

```typescript
import { SMTPPool } from "sently/pool";

const pool = new SMTPPool({
  host: "smtp.example.com",
  adapter: new NodeAdapter(),
  auth: { user: "you@example.com", pass: "secret" },
});
```

### HTTP APIs

| Transport | Import path | Required config |
|-----------|-------------|-----------------|
| Mailer wrapper | `sently/mailer` | — (use with any transport below) |
| Resend | `sently/transports/resend` | `apiKey` |
| SendGrid | `sently/transports/sendgrid` | `apiKey` |
| Postmark | `sently/transports/postmark` | `serverToken` |
| Mailgun | `sently/transports/mailgun` | `apiKey`, `domain` |
| AWS SES | `sently/transports/ses` | `accessKeyId`, `secretAccessKey`, `region` |
| Brevo | `sently/transports/brevo` | `apiKey` |

All transports implement the same interface — swap without changing your send code.

Messages with attachments are sent as raw MIME (`Content.Raw`); simple messages use `Content.Simple`.

### PreviewTransport

Write emails to disk during local development instead of sending them:

```typescript
import { PreviewTransport } from "sently/transports/preview";
import { createMailer } from "sently/mailer";

const mailer = await createMailer({
  transport: new PreviewTransport({
    outDir: "./.emails",
    open: true,
    format: "html",
  }),
});

await mailer.send({
  from: "dev@localhost",
  to: "you@example.com",
  subject: "Preview me",
  html: "<h1>Hello</h1>",
});
```

### RetryTransport

Wrap any transport with automatic retries and configurable backoff:

```typescript
import { RetryTransport } from "sently/transports/retry";
import { ResendTransport } from "sently/transports/resend";
import { createMailer } from "sently/mailer";

const transport = new RetryTransport(
  new ResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
  { maxAttempts: 3, backoff: "exponential", retryOn: [429, 503] },
);

const mailer = await createMailer({ transport });
```

### sendBulk()

Send multiple messages with concurrency control and per-message callbacks. When the transport implements `sendBatch` (Resend, SendGrid), attachment-free messages are sent via native batch endpoints; messages with attachments fall back to individual sends.

```typescript
const result = await mailer.sendBulk(
  [
    { from: "a@b.com", to: "1@example.com", subject: "One", text: "Hi" },
    { from: "a@b.com", to: "2@example.com", subject: "Two", text: "Hi" },
  ],
  {
    concurrency: 2,
    stopOnError: false, // halt remaining sends after first failure when true
    onSuccess: (_msg, index) => console.log(`Sent #${index}`),
    onError: (_msg, index, err) => console.error(`Failed #${index}`, err),
  },
);

console.log(result.sent, result.failed);
```

Resend batches up to `RESEND_BATCH_MAX` (100) messages per request — export from `sently/transports/resend`.

### Mailer lifecycle hooks

Optional observability hooks on `createMailer` fire for every `send()` and `sendBulk()` message (batch paths invoke hooks once per message, without double-firing). Hook context carries `{ messageId?, to, subject, provider }` — no body fields, to avoid leaking PII into logs.

```typescript
const mailer = await createMailer({
  transport: new ResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
  hooks: {
    onSend: (ctx) => metrics.increment("email.send", { provider: ctx.provider }),
    onSuccess: (ctx, result) => metrics.increment("email.success"),
    onError: (ctx, err) => metrics.increment("email.error"),
    onRetry: (ctx, attempt, err) => metrics.increment("email.retry", { attempt }),
  },
});
```

Hooks are fully optional and zero-cost when unset. A throwing hook does **not** break the send — in non-production environments the error is logged with `console.warn` and the send continues. Pair `onRetry` with `RetryTransport` for per-attempt retry metrics.

Works with both `sently/mailer` (`{ transport, hooks }`) and SMTP config via `createSMTPMailer` (`{ host, auth, hooks }`).

### IdempotencyTransport

Prevent duplicate sends on retry or replay. Wrap **outside** `RetryTransport` so all retry attempts share one key:

```typescript
import { IdempotencyTransport } from "sently/idempotency";
import { RetryTransport } from "sently/transports/retry";
import { ResendTransport } from "sently/transports/resend";

const transport = new IdempotencyTransport(
  new RetryTransport(new ResendTransport({ apiKey: process.env.RESEND_API_KEY! })),
  { ttlMs: 86_400_000 },
);

await mailer.send({
  from: "you@example.com",
  to: "user@example.com",
  subject: "Hello",
  text: "Hi",
  idempotencyKey: "order-123-email", // or derive from messageId
});
```

Resend sends the `Idempotency-Key` HTTP header natively. Supply a shared store (Redis, Dragonfly) in production — `MemoryIdempotencyStore` is for single-process use.

---

## Plugin system

Plugins transform `MailOptions` before the transport builds and sends the message. They run sequentially — each receives the output of the previous plugin.

```typescript
import type { MailOptions } from "sently";
import { createSMTPMailer } from "sently/smtp";

const addFooter = (options: MailOptions) => ({
  ...options,
  html: (options.html ?? "") + '<p style="color:#999">Unsubscribe</p>',
});

const mailer = await createSMTPMailer({
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  auth: { user: "resend", pass: process.env.RESEND_API_KEY! },
  plugins: [addFooter],
});
```

Works with SMTP config or custom transports:

```typescript
import { createMailer } from "sently/mailer";
import { ResendTransport } from "sently/transports/resend";

const mailer = await createMailer({
  transport: new ResendTransport({ apiKey: "re_..." }),
  plugins: [addFooter],
});
```

### TemplatePlugin

Render HTML from named templates with zero dependencies:

```typescript
import { templatePlugin, simpleEngine } from "sently/plugins/template";
import { createMailer } from "sently/mailer";
import { ResendTransport } from "sently/transports/resend";

const mailer = await createMailer({
  transport: new ResendTransport({ apiKey: "re_..." }),
  plugins: [
    templatePlugin({
      engine: simpleEngine,
      templates: {
        welcome: "<h1>Hello, {{name}}!</h1>",
      },
    }),
  ],
});

await mailer.send({
  from: "onboarding@yourdomain.com",
  to: "user@example.com",
  subject: "Welcome",
  template: "welcome",
  data: { name: "Ali" },
});
```

Use a custom engine by passing any `(template, data) => string` function to `templatePlugin`.

### React Email plugin

Render React Email components to HTML and plain text (optional peers: `react`, `@react-email/render`):

```typescript
import { reactPlugin } from "sently/react";
import { createMailer } from "sently/mailer";
import { ResendTransport } from "sently/transports/resend";
import { WelcomeEmail } from "./emails/welcome";

const mailer = await createMailer({
  transport: new ResendTransport({ apiKey: "re_..." }),
  plugins: [reactPlugin()],
});

await mailer.send({
  from: "onboarding@yourdomain.com",
  to: "user@example.com",
  subject: "Welcome",
  react: WelcomeEmail({ name: "Ali" }),
});
```

Explicit `html` / `text` always win over rendered output.

### Webhook parsing

Normalize provider webhooks into a single event type — no server framework required:

```typescript
import { parseResendWebhook, parseSesWebhook } from "sently/webhooks";

// Resend (Svix-style payload)
const events = parseResendWebhook(await request.json());

// AWS SES via SNS (handles SubscriptionConfirmation + double-encoded Message)
const sesEvents = parseSesWebhook(await request.json());

for (const event of events) {
  console.log(event.type, event.messageId, event.recipient);
}
```

Parsers: Resend, SendGrid, Postmark, Mailgun, SES, Brevo. Optional HMAC verification helpers for Mailgun and Resend (`verifyMailgunSignature`, `verifyResendSignature`).

---

## MailOptions Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `from` | `AddressInput` | *required* | Sender address |
| `to` | `AddressInput` | *required* | Recipients |
| `cc` | `AddressInput` | — | CC recipients (visible in headers) |
| `bcc` | `AddressInput` | — | BCC recipients (envelope only, not in headers) |
| `replyTo` | `AddressInput` | — | Reply-To header |
| `subject` | `string` | *required* | Email subject (RFC 2047 for non-ASCII) |
| `text` | `string` | — | Plain text body |
| `html` | `string` | — | HTML body |
| `attachments` | `Attachment[]` | — | File attachments |
| `headers` | `Record<string, string>` | — | Custom headers |
| `messageId` | `string` | auto | Message-ID header |
| `idempotencyKey` | `string` | — | Dedupe key for retry/replay (Resend sends as `Idempotency-Key` header) |
| `react` | `unknown` | — | React element — use with `reactPlugin()` from `sently/react` |
| `date` | `Date` | now | Date header |
| `priority` | `'high' \| 'normal' \| 'low'` | — | X-Priority / Importance |
| `encoding` | `'utf-8' \| 'ascii'` | `'utf-8'` | Character encoding hint |

---

## Attachments

### In-memory (all runtimes)

```typescript
await mailer.send({
  from: "you@example.com",
  to: "user@example.com",
  subject: "With attachment",
  text: "See attached",
  attachments: [
    {
      filename: "report.pdf",
      content: pdfBytes, // Uint8Array
      contentType: "application/pdf",
    },
  ],
});
```

### File path (Node.js / Bun / Deno only)

`attachment.path` reads from disk — see [Security](#security) (Attachments) for validation and `basePath`.

```typescript
attachments: [
  {
    filename: "report.pdf",
    path: "/path/to/report.pdf",
  },
],
```

On Cloudflare Workers and browsers, use `content: Uint8Array` — `attachment.path` is not supported.

---

## Error Handling

All transport errors extend `SentlyError` for unified handling while preserving existing class names and properties:

```typescript
import { SentlyError } from "sently/errors";
import { SMTPError } from "sently/transports/smtp";
import { ResendError } from "sently/transports/resend";
// Each HTTP transport exports its own error class:
// SendGridError  → sently/transports/sendgrid
// PostmarkError  → sently/transports/postmark
// MailgunError   → sently/transports/mailgun
// SESError       → sently/transports/ses
// BrevoError     → sently/transports/brevo

try {
  await mailer.send({ ... });
} catch (err) {
  if (err instanceof SentlyError) {
    console.error(err.sentlyCode); // e.g. "BAD_REQUEST", "RATE_LIMITED"
    console.error(err.statusCode); // HTTP status when applicable
  }
  if (err instanceof SMTPError) {
    console.error(err.code);       // SMTP response code, e.g. 550 (numeric)
    console.error(err.command);    // failed command, e.g. "RCPT TO"
  }
  if (err instanceof ResendError) {
    console.error(err.statusCode); // HTTP status code
    console.error(err.code);       // machine-readable, e.g. "BAD_REQUEST"
  }
}
```

Use `sentlyCode` for unified machine-readable codes when a subclass shadows `code` (e.g. SMTP numeric codes, Brevo/SES provider API codes). Import error classes from their transport subpath — HTTP failures also expose `statusCode`.

---

## Security

sently is built to be secure by default — protections are enforced at the library's core chokepoints, so they apply to every transport and every address field without any extra configuration.

### Email header & SMTP command injection

All addresses **and** display names are validated centrally in `parseAddresses()` (and re-asserted when rendering headers), before any normalization:

- Rejects CR, LF, NUL, every other C0 control (`0x00`–`0x1F`), DEL (`0x7F`), and the Unicode line/paragraph separators `U+2028`/`U+2029`.
- **Fails closed:** hostile input throws a clear error (with the offending code point) — it is never stripped, repaired, and then accepted.
- Protects the **display name** too, so an ASCII name like `"Foo\r\nBcc: attacker@evil.com"` can no longer inject a header.
- Enforced consistently across **From, To, Cc, Bcc, and Reply-To**, and across **every transport** (SMTP, SES, Mailgun, Postmark, Resend, SendGrid, Brevo).

```typescript
await mailer.send({
  from: "you@example.com",
  to: { address: "victim@x.com\r\nBcc: attacker@evil.com" },
  subject: "Hi",
  text: "...",
});
// → throws: Email address contains a forbidden control character (0x0d)
```

MIME attachment filenames and custom attachment headers are likewise sanitized against header injection.

### Credential protection

- **`requireTLS`** (default `true` when `auth` is set) refuses to authenticate over a cleartext connection, defeating STARTTLS-stripping downgrade attacks.
- **OAuth2 / XOAUTH2** and DKIM signing are built in via Web Crypto — no plaintext secrets in transit beyond what the protocol requires.

### Attachments

> ⚠️ `attachment.path` reads files from disk. Never pass user-controlled paths without validation.

`resolveAttachments()` accepts an opt-in `basePath` that confines reads to an allowed directory and rejects path-traversal (including sibling-directory prefix tricks like `/var/data-secret` vs `/var/data`). Note: `basePath` does not dereference symlinks — use `fs.realpath()` first if symlink traversal is a concern.

### Supply chain

**Zero runtime dependencies** — there is no transitive dependency tree to audit or to be compromised.

---

## Bundle size

Sizes are **minified + gzip** per import path (`bun run measure:size`; CI: `bun run check:size`). Node built-ins and `cloudflare:sockets` are external.

Nodemailer ships **~58 KB gzip** regardless of transport ([BundlePhobia, v8.0.10](https://bundlephobia.com/package/nodemailer@8.0.10)). sently tree-shakes by subpath — pick the entry that matches how you send:

| How you send | Import | ~gzip |
|--------------|--------|-------|
| HTTP API (Resend, SendGrid, …) | `sently/mailer` + `sently/transports/<provider>` | **~6.1 KB** |
| SMTP relay (`host` / `port`) | `sently/smtp` (or `createSMTPMailer` from `sently`) | **~15 KB** |
| Transport only (no mailer wrapper) | `sently/transports/<provider>` | **~4.7 KB** |

Regenerate full tables with `bun run measure:size:md`. Measured **2026-05-31** (minified + gzip):

#### Common stacks

| What | Imports | ~gzip |
|------|---------|-------|
| HTTP — Resend | `sently/mailer` + `sently/transports/resend` | ~6.1 KB |
| HTTP — SendGrid | `sently/mailer` + `sently/transports/sendgrid` | ~5.9 KB |
| HTTP — transport only | `sently/transports/resend` (no `createMailer` wrapper) | ~4.7 KB |
| SMTP relay | `sently/smtp` with `{ host, port, auth }` | ~14.8 KB |
| SMTP + Node adapter | `sently/smtp` + `sently/adapters/node` | ~14.8 KB |
| Main entry + HTTP | `sently` + HTTP transport via main `createMailer` | ~6.1 KB |

#### Core entries

| What | Imports | ~gzip |
|------|---------|-------|
| sently/mailer | Transport-only `createMailer` (plugins, sendBulk) | ~2.6 KB |
| sently | Main entry — types, factories, OAuth2, `SentlyError` | ~2.6 KB |
| sently/smtp | SMTP `createSMTPMailer` — host/port, pool, adapters | ~14.7 KB |

```ts
// HTTP
import { createMailer } from "sently/mailer";
import { ResendTransport } from "sently/transports/resend";

// SMTP
import { createSMTPMailer } from "sently/smtp";
```

Main `"sently"` exports shared types, `createMailer` (transport), `createSMTPMailer`, `detectRuntime`, OAuth2, and `SentlyError`. Transports, webhooks, idempotency, DKIM, and plugins are separate subpaths only.

---

## Choosing an entrypoint

```
How do you send mail?
│
├─ HTTP API (Resend, SendGrid, …)
│    import { createMailer } from "sently/mailer"
│    import { ResendTransport } from "sently/transports/resend"
│    createMailer({ transport: new ResendTransport({ apiKey }) })
│
├─ SMTP relay (host / port / auth)
│    import { createSMTPMailer } from "sently/smtp"
│    createSMTPMailer({ host, port, auth })
│
└─ Custom / decorated transport (Retry, Idempotency, Preview)
     import { createMailer } from "sently/mailer"
     createMailer({ transport: new RetryTransport(inner) })
```

---

## Migrating from Nodemailer

| Nodemailer | sently |
|------------|--------|
| `nodemailer.createTransport({...})` | `await createSMTPMailer({...})` or `createMailer({ transport })` |
| `transporter.sendMail(options)` | `mailer.send(options)` |
| `transporter.verify()` | `mailer.verify()` |
| `options.attachments[].path` | Same (Node/Bun/Deno); use `content` on edge |
| `import nodemailer from 'nodemailer'` | `import { createMailer } from 'sently/mailer'` (HTTP) or `createSMTPMailer` from `'sently/smtp'` |
| CommonJS | ESM only |
| Node.js only | Node, Bun, Deno, CF Workers |

---

## TypeScript

```typescript
import type {
  MailOptions,
  MailPlugin,
  SendResult,
  Attachment,
  SMTPConfig,
  SMTPMailerOptions,
  TransportMailerOptions,
} from "sently";
```

All types ship with the package — no separate `@types/` install needed.

---

## Links

- **Source & issues:** [github.com/alialnaghmoush/sently](https://github.com/alialnaghmoush/sently)
- **npm:** [npmjs.com/package/sently](https://www.npmjs.com/package/sently)
- **JSR:** [jsr.io/@alialnaghmoush/sently](https://jsr.io/@alialnaghmoush/sently)

## License

MIT
