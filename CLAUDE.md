---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads `.env`, so don't use dotenv.

## About this repository

**sently** (v0.7.x) — runtime-agnostic TypeScript email library for Node.js, Bun, Deno, and Cloudflare Workers. ESM-only, zero runtime dependencies. Nodemailer-style API with HTTP transports, SMTP, DKIM, OAuth2, pooling, plugins, idempotency, and webhook parsers.

### Development commands

```sh
bun run verify          # lint + typecheck + build + test (prepack gate)
bun test                # run all tests
bun run lint            # biome check src
bun run format          # biome format src --write
bun run typecheck       # tsc --noEmit
bun run build           # bun run build.ts → dist/
bun run check:size      # enforce bundle size budgets (tools/bundle-size-budgets.json)
bun run measure:size    # print current bundle sizes
bun run mcp             # local MCP server (tools/mcp/)
```

### Source layout

```
src/
├── index.ts              # Main barrel — types, createMailer, createSMTPMailer, OAuth2, SentlyError
├── mailer.ts               # Lightweight createMailer for custom transports (~2.6 KB gzip)
├── detect.ts               # Runtime auto-detection (node/bun/deno/cf)
├── dkim.ts                 # Public DKIM signing entry (lazy-loaded)
├── errors.ts               # sently/errors barrel — SentlyError hierarchy
├── idempotency.ts          # IdempotencyTransport decorator
├── webhooks.ts             # Webhook parsers + signature verification
├── react.ts                # reactPlugin (optional peers: react, @react-email/render)
├── core/                   # Shared internals (address, mime, smtp, dkim, errors, plugin, types, …)
├── adapters/               # Socket adapters: node, bun, deno, cf
├── transports/             # smtp, resend, sendgrid, postmark, mailgun, ses, brevo, retry, preview
├── auth/oauth2.ts          # OAuth2Client (Google/Microsoft token endpoints)
├── pool/                   # SMTP connection pool + rate limiting
├── plugins/                # template.ts, react.ts
└── webhooks/               # Per-provider webhook parsers (re-exported via webhooks.ts)

tests/                      # Mirrors src/ — run with bun test
scripts/                    # generate-index-js.ts, smoke tests, publish helpers
tools/                      # measure-bundle-size.ts, MCP server, bundle-size-budgets.json
build.ts                    # Bun bundler entrypoints → dist/ + tsc declarations
```

### Subpath exports

| Import | Purpose |
|--------|---------|
| `sently` | Shared types, `createMailer`, `createSMTPMailer`, `detectRuntime`, OAuth2, `SentlyError` |
| `sently/mailer` | `createMailer` for custom transports only — ~2.6 KB gzip |
| `sently/smtp` | `createSMTPMailer` — host/port, pool, adapters — ~15 KB gzip |
| `sently/dkim` | DKIM signing |
| `sently/errors` | `SentlyError`, stable error codes |
| `sently/idempotency` | `IdempotencyTransport`, `MemoryIdempotencyStore` |
| `sently/webhooks` | `parse*Webhook`, `verifyResendSignature`, `verifyMailgunSignature` |
| `sently/react` | `reactPlugin` — **not** exported from main barrel |
| `sently/transports/*` | One transport per subpath |
| `sently/adapters/*` | One adapter per subpath |
| `sently/auth/oauth2` | `OAuth2Client` |
| `sently/pool` | `SMTPPool` |
| `sently/plugins/template` | `templatePlugin`, `simpleEngine` |

HTTP transports: import `createMailer` from `sently/mailer` (or `sently`) + transport subpath for smallest bundle.
SMTP: import `createSMTPMailer` from `sently/smtp` with `host`/`port`/`auth`, or from `sently`.

### Code conventions

- **TypeScript strict** — no `any` unless justified; prefer `unknown` + narrowing.
- **TSDoc** on all exported functions, classes, and types.
- **ESM only** — use `.js` extensions in relative imports (`from "./core/types.js"`).
- **Zero runtime deps** in core; optional peers: `react`, `@react-email/render`.
- Transport errors extend `SentlyError` with stable codes (`RATE_LIMITED`, `BAD_REQUEST`, etc.).
- Mailer supports optional `hooks` (`onSend`, `onSuccess`, `onError`, `onRetry`) — no body/PII in hook context.

### Adding features

**New transport** — follow `src/transports/resend.ts`:
1. Implement `Transport` from `src/core/types.ts` (`send`, optional `sendBatch`, `verify`, `close`).
2. Extend `SentlyError` for provider-specific errors.
3. Add entrypoint to `build.ts`, export in `package.json` `exports`, add tests in `tests/transports/`.
4. Update `tools/bundle-size-budgets.json` if bundle size changes.

**New adapter** — follow `src/adapters/node.ts`:
1. Implement `SocketAdapter` from `src/core/types.ts`.
2. Add entrypoint to `build.ts`, export in `package.json`, add tests in `tests/adapters/`.

**New plugin** — follow `src/plugins/template.ts` (`MailPlugin` signature in `src/core/plugin.ts`).

**Build note** — `index.ts`, `errors.ts`, `webhooks.ts`, and `react.ts` are **not** bundled with code-splitting; `scripts/generate-index-js.ts` emits their runtime barrels to avoid broken re-exports. All other entrypoints are listed in `build.ts`.

### Testing

Use `bun test`. Tests live in `tests/` and mirror `src/` structure. Integration SMTP tests are in `tests/integration/`.

```ts
import { test, expect } from "bun:test";

test("example", () => {
  expect(1).toBe(1);
});
```

For more information on Bun APIs, read `node_modules/bun-types/docs/**.mdx`.
