# sendx

**Runtime-agnostic email library for Node.js, Bun, Deno, and Cloudflare Workers.**

[![npm version](https://img.shields.io/npm/v/sendx.svg)](https://www.npmjs.com/package/sendx)
[![bundle size](https://img.shields.io/bundlephobia/minzip/sendx)](https://bundlephobia.com/package/sendx)
[![license](https://img.shields.io/npm/l/sendx.svg)](LICENSE)
[![tests](https://img.shields.io/badge/tests-passing-brightgreen)](#)

---

## Why sendx

- **Works everywhere** — Node.js, Bun, Deno, Cloudflare Workers, and any environment with Web APIs
- **True tree-shaking** — import only what you need; unused adapters and transports stay out of your bundle
- **Zero dependencies in core** — MIME, SMTP protocol, and encoding use pure Web APIs only
- **TypeScript-first** — strict types, subpath exports, and full IDE support

---

## Installation

```bash
bun add sendx
```

```bash
npm install sendx
```

```bash
pnpm add sendx
```

---

## Quick Start

### SMTP with auto-detected adapter

```typescript
import { createMailer } from "sendx";

const mailer = await createMailer({
  host: "smtp.example.com",
  port: 587,
  auth: { user: "you@example.com", pass: "secret" },
});

await mailer.send({
  from: "you@example.com",
  to: "recipient@example.com",
  subject: "Hello from sendx",
  text: "Plain text body",
  html: "<p>HTML body</p>",
});

await mailer.close();
```

### Resend HTTP transport (Vercel Edge compatible)

```typescript
import { createMailer } from "sendx";
import { ResendTransport } from "sendx/transports/resend";

const mailer = await createMailer({
  transport: new ResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
});

await mailer.send({
  from: "onboarding@yourdomain.com",
  to: "recipient@example.com",
  subject: "Hello from the edge",
  html: "<p>Sent via Resend + sendx</p>",
});
```

### Cloudflare Worker

```typescript
import { createMailer } from "sendx";
import { CloudflareAdapter } from "sendx/adapters/cf";

export default {
  async fetch() {
    const mailer = await createMailer({
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
| Node.js (auto) | `createMailer(config)` | Auto-detected |
| Node.js (explicit) | `sendx/adapters/node` → `NodeAdapter` | Reference implementation |
| Bun (auto) | `createMailer(config)` | Auto-detected |
| Bun (explicit) | `sendx/adapters/bun` → `BunAdapter` | Node compat layer |
| Deno | `sendx/adapters/deno` → `DenoAdapter` | Native `Deno.startTls` |
| Cloudflare Workers | `sendx/adapters/cf` → `CloudflareAdapter` | `cloudflare:sockets` |

```typescript
import { NodeAdapter } from "sendx/adapters/node";

const mailer = await createMailer({
  host: "smtp.example.com",
  adapter: new NodeAdapter({ secure: false }),
  auth: { user: "you@example.com", pass: "secret" },
});
```

---

## Transports

### SMTP

```typescript
import { createMailer } from "sendx";
import { SMTPTransport } from "sendx/transports/smtp";
import { NodeAdapter } from "sendx/adapters/node";

const transport = new SMTPTransport({
  host: "smtp.example.com",
  port: 587,
  auth: { user: "you@example.com", pass: "secret" },
  adapter: new NodeAdapter(),
});

const mailer = await createMailer({ transport });
await mailer.verify(); // test connection + auth
```

**AUTH methods:** LOGIN and PLAIN are fully supported. CRAM-MD5 is planned for v0.2.

### HTTP APIs

#### Resend

```typescript
import { ResendTransport } from "sendx/transports/resend";

const transport = new ResendTransport({ apiKey: "re_..." });
```

#### SendGrid

```typescript
import { SendGridTransport } from "sendx/transports/sendgrid";

const transport = new SendGridTransport({ apiKey: "SG...." });
```

#### Postmark

```typescript
import { PostmarkTransport } from "sendx/transports/postmark";

const transport = new PostmarkTransport({ serverToken: "..." });
```

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

## Tree-Shaking

Each import path is a separate build entry point:

```
import { createMailer } from "sendx"
+ import { ResendTransport } from "sendx/transports/resend"
→ Bundle: core/mime (~8KB) + core/address (~2KB) + transports/resend (~2KB) ≈ ~12KB gzip

vs. full Nodemailer: ~220KB
```

Only code you import is bundled. Adapters and transports you never import are never included.

---

## Migrating from Nodemailer

| Nodemailer | sendx |
|------------|-------|
| `nodemailer.createTransport({...})` | `await createMailer({...})` |
| `transporter.sendMail(options)` | `mailer.send(options)` |
| `transporter.verify()` | `mailer.verify()` |
| `options.attachments[].path` | Same (Node/Bun/Deno); use `content` on edge |
| `import nodemailer from 'nodemailer'` | `import { createMailer } from 'sendx'` |
| CommonJS | ESM only |
| Node.js only | Node, Bun, Deno, CF Workers |

---

## Bundle Size

Approximate gzip sizes per subpath export:

| Export | ~gzip |
|--------|-------|
| `sendx` | ~6 KB |
| `sendx/transports/smtp` | ~10 KB |
| `sendx/transports/resend` | ~2 KB |
| `sendx/transports/sendgrid` | ~2 KB |
| `sendx/transports/postmark` | ~2 KB |
| `sendx/adapters/node` | ~3 KB |
| `sendx/adapters/bun` | ~3 KB |
| `sendx/adapters/deno` | ~2 KB |
| `sendx/adapters/cf` | ~2 KB |

---

## License

MIT
