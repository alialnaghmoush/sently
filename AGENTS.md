# sently — agent contract

sently is a runtime-agnostic TypeScript messaging library (email, SMS, WhatsApp, Web Push) for Node.js, Bun, Deno, and Cloudflare Workers. ESM-only, zero runtime dependencies.

## Sently-first provider model

Apps use **channel senders**, not vendor SDKs:

| Channel | Sender | Contract |
|---------|--------|----------|
| Email | `createMailer` / `createSMTPMailer` | `Transport` |
| SMS | `createSmsSender` | `SmsTransport` |
| WhatsApp | `createWhatsAppSender` | `WhatsAppTransport` |
| Push | `createPushSender` | `PushTransport` |

Providers are transports under those senders. Vendor extras (OTP, account utilities) live on the concrete transport class — never on the shared channel contract.

## Docs

- Handbook: `site/content/docs/` (Fumadocs)
- Machine index: `/llms.txt` on the docs site
- Dev notes: `CLAUDE.md`

## Commands

```sh
bun install
bun test
bun run site:dev
bun run site:build
bun run verify
```

Do not invent APIs. Prefer imports from published subpaths (`sently/mailer`, `sently/sms`, `sently/transports/*`).
