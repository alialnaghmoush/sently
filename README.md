<p align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://shieldcn.dev/header/glow.svg?title=sently&subtitle=One+API.+Four+channels.+Every+runtime.&logo=https://raw.githubusercontent.com/alialnaghmoush/sently/main/site/public/sentlyIconLogo-w.svg&theme=zinc&size=banner&mode=dark&font=geist"
    />
    <img
      alt="sently — One API. Four channels. Every runtime."
      src="https://shieldcn.dev/header/glow.svg?title=sently&subtitle=One+API.+Four+channels.+Every+runtime.&logo=https://raw.githubusercontent.com/alialnaghmoush/sently/main/site/public/sentlyIconLogo-k.svg&theme=zinc&size=banner&mode=light&font=geist"
      width="750"
    />
  </picture>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/sently"><img alt="npm" src="https://shieldcn.dev/npm/sently.svg?size=sm" /></a>
  <a href="https://jsr.io/@alialnaghmoush/sently"><img alt="JSR" src="https://shieldcn.dev/jsr/@alialnaghmoush/sently.svg?size=sm&variant=outline" /></a>
  <a href="https://bundlephobia.com/package/sently"><img alt="bundle" src="https://shieldcn.dev/bundlephobia/minzip/sently.svg?size=sm&variant=secondary" /></a>
  <a href="https://opensource.org/licenses/MIT"><img alt="MIT" src="https://shieldcn.dev/npm/license/sently.svg?size=sm" /></a>
  <a href="https://bun.sh"><img alt="Bun" src="https://shieldcn.dev/badge/Bun-ready-000000.svg?logo=bun&size=sm&variant=outline" /></a>
  <a href="https://github.com/alialnaghmoush/sently/stargazers"><img alt="stars" src="https://shieldcn.dev/github/stars/alialnaghmoush/sently.svg?size=sm&variant=outline" /></a>
  <a href="https://github.com/alialnaghmoush/sently/actions"><img alt="CI" src="https://shieldcn.dev/github/ci/alialnaghmoush/sently.svg?size=sm" /></a>
</p>

<p align="center">
  <em>Stop wiring vendor SDKs into every channel. One sender shape for email, SMS, WhatsApp, and push — swap the transport, keep your call sites. Node, Bun, Deno, Workers.</em>
</p>

<p align="center">
  <a href="https://sently.omqkhafi.dev"><strong>Docs</strong></a> ·
  <a href="https://sently.omqkhafi.dev/docs"><strong>Handbook</strong></a> ·
  <a href="https://sently.omqkhafi.dev/llms.txt"><code>llms.txt</code></a> ·
  <a href="https://www.npmjs.com/package/sently"><code>sently</code></a>
</p>

> [!WARNING]
> **Early development (`v0.x`) — API may change.**
>
> Pin an exact version for production until v1.0.0. See [CHANGELOG](CHANGELOG.md).

## Install

```bash
bun add sently                                     # npm / Bun / yarn / pnpm
bunx jsr add @alialnaghmoush/sently                # JSR
```

Optional peers (React Email only): `react`, `@react-email/render`.

## Quick start

```typescript
import { createMailer } from "sently/mailer";
import { ResendTransport } from "sently/transports/resend";

const mailer = await createMailer({
  transport: new ResendTransport({ apiKey: process.env.RESEND_API_KEY! }),
});

await mailer.send({
  from: "hello@example.com",
  to: "you@example.com",
  subject: "Welcome",
  html: "<p>Sent with sently.</p>",
});
```

Same shape for every channel — apps use **sently senders**, not vendor SDKs:

| Channel  | Sender                               | Example transport                          |
| -------- | ------------------------------------ | ------------------------------------------ |
| Email    | `createMailer` / `createSMTPMailer`  | `sently/transports/resend`, `sently/smtp`  |
| SMS      | `createSmsSender`                    | `sently/transports/twilio-sms`             |
| WhatsApp | `createWhatsAppSender`               | `sently/transports/whatsapp-cloud`         |
| Push     | `createPushSender`                   | `sently/transports/webpush`                |

Full walkthrough: [Get started](https://sently.omqkhafi.dev/docs/get-started).

## Why sently?

Nodemailer is Node.js–only and ships the full mail stack on every import (~59 KB gzip for [v9.0.3](https://bundlephobia.com/package/nodemailer@9.0.3)). sently is tree-shakeable, multi-runtime, and multi-channel.

|                   | Nodemailer              | sently                                      |
| ----------------- | ----------------------- | ------------------------------------------- |
| Bundle size       | ~59 KB gzip always      | ~6.3 KB HTTP · ~14.9 KB SMTP                |
| Runtimes          | Node.js only            | Node, Bun, Deno, CF Workers                 |
| Module format     | CommonJS                | ESM only                                    |
| Dependencies      | 0                       | 0                                           |
| Channels          | Email                   | Email · SMS · WhatsApp · Push               |
| HTTP transports   | via plugins             | built-in subpaths                           |
| Provider failover | —                       | `FallbackTransport` + weighted routing      |
| TypeScript        | `@types/nodemailer`     | built-in                                    |

## Entrypoints

| Import                 | Use when                                      |
| ---------------------- | --------------------------------------------- |
| `sently/mailer`        | HTTP / custom email transports (smallest)     |
| `sently/smtp`          | SMTP host, pool, adapters, DKIM               |
| `sently/sms`           | SMS                                           |
| `sently/whatsapp`      | WhatsApp                                      |
| `sently/push`          | Web Push                                      |
| `sently/transports/*`  | One provider per subpath                      |

## Documentation

| Resource     | Link                                                         |
| ------------ | ------------------------------------------------------------ |
| Docs site    | [sently.omqkhafi.dev](https://sently.omqkhafi.dev)                   |
| Handbook     | [/docs](https://sently.omqkhafi.dev/docs)                             |
| Get started  | [/docs/get-started](https://sently.omqkhafi.dev/docs/get-started)     |
| Channels     | [/docs/channels](https://sently.omqkhafi.dev/docs/channels)           |
| Transports   | [/docs/transports](https://sently.omqkhafi.dev/docs/transports)       |
| Agents index | [/llms.txt](https://sently.omqkhafi.dev/llms.txt)                     |
| Changelog    | [`CHANGELOG.md`](CHANGELOG.md)                               |
| Agents       | [`AGENTS.md`](AGENTS.md)                                     |

Local docs: `bun run site:dev`. Verify: `bun run verify`.

Pre-1.0. Published on [npm](https://www.npmjs.com/package/sently) and [JSR](https://jsr.io/@alialnaghmoush/sently). MIT.
