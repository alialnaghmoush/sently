# sently — Implementation Progress

---

## Unit 1 — Project Setup
**Status:** completed
**Date:** 2026-05-29

### Files created
- package.json
- tsconfig.json
- biome.json
- build.ts
- src/index.ts (stub)
- src/adapters/*.ts (stubs)
- src/transports/*.ts (stubs)
- src/core/.gitkeep
- tests/core/.gitkeep
- tests/adapters/.gitkeep
- tests/transports/.gitkeep
- tools/mcp/tools/.gitkeep

### Files modified
- .gitignore — added `*.local`
- bun.lock — refreshed

### Verification
- [x] bun test — 0 tests found (expected)
- [x] bun run typecheck — passed
- [x] bun run lint — passed
- [x] bun run build — passed

### Deviations from plan
- biome.json schema updated to 2.4.16 (latest Biome rejects 1.9.4 schema)

### Blocked by
- none

---

## Unit 2 — Core Types
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/core/types.ts

### Files modified
- [none]

### Verification
- [x] bun test — 0 tests (no new tests)
- [x] bun run typecheck — passed
- [x] bun run lint — passed

### Deviations from plan
- [none]

### Blocked by
- none

---

## Unit 3 — Base64 & Encoding
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/core/base64.ts
- tests/core/base64.test.ts

### Files modified
- [none]

### Verification
- [x] bun test — 10 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed

### Deviations from plan
- [none]

### Blocked by
- none

---

## Unit 4 — Address Parser
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/core/address.ts
- tests/core/address.test.ts

### Files modified
- [none]

### Verification
- [x] bun test — 24 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed

### Deviations from plan
- [none]

### Blocked by
- none

---

## Unit 5 — MIME Builder
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/core/mime.ts
- tests/core/mime.test.ts

### Files modified
- [none]

### Verification
- [x] bun test — 31 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed

### Deviations from plan
- [none]

### Blocked by
- none

---

## Unit 6 — SMTP State Machine
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/core/smtp.ts
- tests/core/smtp.test.ts

### Files modified
- [none]

### Verification
- [x] bun test — 44 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed

### Deviations from plan
- CRAM-MD5 stub per plan correction (LOGIN/PLAIN only in v0.1)

### Blocked by
- none

---

## Unit 7 — Node.js Adapter
**Status:** completed
**Date:** 2026-05-29

### Files created
- tests/adapters/node.test.ts

### Files modified
- src/adapters/node.ts — full implementation

### Verification
- [x] bun test — 46 tests passed
- [x] bun run typecheck — passed (after @types/node)
- [x] bun run lint — passed

### Deviations from plan
- [none]

### Blocked by
- none

---

## Unit 8 — Bun Adapter
**Status:** completed
**Date:** 2026-05-29

### Files created
- [none]

### Files modified
- src/adapters/bun.ts — full implementation

### Verification
- [x] bun test — 46 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed

### Deviations from plan
- [none]

### Blocked by
- none

---

## Unit 9 — Deno Adapter
**Status:** completed
**Date:** 2026-05-29

### Files created
- [none]

### Files modified
- src/adapters/deno.ts — full implementation

### Verification
- [x] bun test — 46 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed

### Deviations from plan
- [none]

### Blocked by
- none

---

## Unit 10 — Cloudflare Workers Adapter
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/adapters/cf-sockets.d.ts

### Files modified
- src/adapters/cf.ts — full implementation

### Verification
- [x] bun test — 46 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed

### Deviations from plan
- Added cf-sockets.d.ts for TypeScript module resolution

### Blocked by
- none

---

## Unit 11 — SMTP Transport
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/transports/resolve-attachments.ts
- tests/transports/smtp.test.ts

### Files modified
- src/transports/smtp.ts — full implementation

### Verification
- [x] bun test — 47 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed

### Deviations from plan
- Extracted resolveAttachments to shared src/transports/resolve-attachments.ts

### Blocked by
- none

---

## Unit 12 — HTTP Transports
**Status:** completed
**Date:** 2026-05-29

### Files created
- [none]

### Files modified
- src/transports/resend.ts — full implementation
- src/transports/sendgrid.ts — full implementation
- src/transports/postmark.ts — full implementation

### Verification
- [x] bun test — 47 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed

### Deviations from plan
- [none]

### Blocked by
- none

---

## Unit 13 — Runtime Detection + Index
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/detect.ts

### Files modified
- src/index.ts — re-exports only

### Verification
- [x] bun test — 47 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed
- [x] bun run build — passed

### Deviations from plan
- Added @types/node devDependency for adapter typecheck

### Blocked by
- none

---

## Unit 14 — MCP Server
**Status:** completed
**Date:** 2026-05-29

### Files created
- tools/mcp/index.ts
- tools/mcp/tools/send-test.ts
- tools/mcp/tools/preview-mime.ts
- tools/mcp/tools/check-smtp.ts
- tools/mcp/tools/validate-config.ts

### Files modified
- package.json — added @modelcontextprotocol/sdk devDependency
- bun.lock — refreshed

### Verification
- [x] bun test — 47 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed (src only; tools excluded from lint script)

### Deviations from plan
- [none]

### Blocked by
- none

---

## Unit 15 — README
**Status:** completed
**Date:** 2026-05-29

### Files created
- [none]

### Files modified
- README.md — comprehensive documentation

### Verification
- [x] bun test — 47 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed
- [x] bun run build — passed

### Deviations from plan
- [none]

### Blocked by
- none

---

## Post-Unit — HTTP Transport Tests
**Status:** completed
**Date:** 2026-05-29

### Files created
- tests/transports/http.test.ts

### Files modified
- [none]

### Verification
- [x] bun test — 59 tests passed (12 new HTTP transport tests)
- [x] bun run typecheck — passed
- [x] bun run lint — passed

### Deviations from plan
- [none]

### Blocked by
- none

---

## Post-Unit — npm + JSR Publish Prep
**Status:** completed
**Date:** 2026-05-29

### Files created
- jsr.json
- LICENSE
- .github/workflows/publish.yml
- scripts/publish.ts

### Files modified
- package.json — added publishConfig, publish:dry, publish:release scripts
- src/index.ts — @module doc
- src/adapters/node.ts — @module doc, explicit return types, JSDoc
- src/adapters/bun.ts — @module doc, explicit return types, JSDoc
- src/adapters/deno.ts — @module doc, explicit return types, JSDoc
- src/adapters/cf.ts — @module doc, explicit return types, JSDoc
- src/transports/smtp.ts — @module doc, explicit return types, JSDoc
- src/transports/resend.ts — @module doc, JSDoc
- src/transports/sendgrid.ts — @module doc, JSDoc
- src/transports/postmark.ts — @module doc, JSDoc
- src/detect.ts — explicit return types on MailerImpl methods
- src/core/smtp.ts — JSDoc on SMTPError constructor

### Verification
- [x] bun test — 59 tests passed
- [x] bun run typecheck — passed
- [x] bun run lint — passed
- [x] bun run build — passed
- [x] npx jsr publish --dry-run --allow-dirty — 0 slow-type warnings

### Deviations from plan
- jsr.json includes `"license": "MIT"` and `"publish.exclude"` (required by JSR; not in original spec)
- LICENSE file added (JSR requires license field or file)
- Post-unit work outside the original 15-unit plan

### Blocked by
- none

---

### Note on adapter testing
BunAdapter, DenoAdapter, CloudflareAdapter have no automated tests.
These require their respective runtimes and will be covered in CI
matrix (bun test / deno test / wrangler) in a future setup phase.

---

## v0.2 — Unit 1 — Core Types v0.2
**Status:** completed
**Date:** 2026-05-29

### Files created
- [none]

### Files modified
- src/core/types.ts — DKIMConfig, OAuth2Config, PoolConfig; SMTPAuth; SMTPConfig extends PoolConfig

### Verification
- [x] bun run typecheck
- [x] bun run lint

### Deviations from plan
- [none]

### Blocked by
- none

---

## v0.2 — Unit 2 — CRAM-MD5
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/core/cram-md5.ts
- tests/core/cram-md5.test.ts

### Files modified
- src/core/smtp.ts — AUTH_CRAM_MD5_INIT/RESPONSE, selectAuthMethod priority
- src/transports/smtp.ts — CRAM authenticate flow
- tests/core/smtp.test.ts

### Verification
- [x] bun test
- [x] bun run typecheck
- [x] bun run lint

### Deviations from plan
- RFC 1321 vector 7 expected hash corrected to match standard MD5 output

### Blocked by
- none

---

## v0.2 — Unit 3 — DKIM Core
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/core/dkim.ts
- tests/core/dkim.test.ts

### Verification
- [x] bun test
- [x] bun run typecheck
- [x] bun run lint

### Deviations from plan
- OpenSSH PEM detection and runtime version errors per pre-start NOTE 1

### Blocked by
- none

---

## v0.2 — Unit 4 — DKIM Integration
**Status:** completed
**Date:** 2026-05-29

### Files modified
- src/core/mime.ts — async buildMIME + DKIM prepend
- src/transports/smtp.ts — await buildMIME, dkim config
- tests/core/mime.test.ts
- tools/mcp/tools/preview-mime.ts
- tools/mcp/index.ts

### Verification
- [x] bun test
- [x] bun run typecheck
- [x] bun run lint

### Blocked by
- none

---

## v0.2 — Unit 5 — OAuth2
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/auth/oauth2.ts
- tests/auth/oauth2.test.ts

### Verification
- [x] bun test
- [x] bun run typecheck
- [x] bun run lint

### Blocked by
- none

---

## v0.2 — Unit 6 — OAuth2 SMTP Integration
**Status:** completed
**Date:** 2026-05-29

### Files modified
- src/core/smtp.ts — AUTH_XOAUTH2, selectAuthMethod XOAUTH2
- src/transports/smtp.ts — OAUTH2 authenticate
- tests/transports/smtp.test.ts
- tests/core/smtp.test.ts

### Verification
- [x] bun test
- [x] bun run typecheck
- [x] bun run lint

### Blocked by
- none

---

## v0.2 — Unit 7 — Connection Pool
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/pool/connection.ts
- src/pool/pool.ts
- tests/pool/pool.test.ts

### Files modified
- src/transports/smtp.ts — openSMTPSession, deliverSMTPMessage, closeSMTPSession

### Verification
- [x] bun test
- [x] bun run typecheck
- [x] bun run lint

### Deviations from plan
- Required smtp.ts session refactor (documented in plan deviation)

### Blocked by
- none

---

## v0.2 — Unit 8 — Rate Limiter
**Status:** completed
**Date:** 2026-05-29

### Files modified
- src/pool/pool.ts — RateLimiter with injectable clock
- tests/pool/pool.test.ts — deterministic rate limit test

### Verification
- [x] bun test
- [x] bun run typecheck
- [x] bun run lint

### Deviations from plan
- RateLimiter.notify() for deterministic tests (no sleep)

### Blocked by
- none

---

## v0.2 — Unit 9 — Version + Exports
**Status:** completed
**Date:** 2026-05-29

### Files created
- CHANGELOG.md

### Files modified
- src/index.ts — v0.2 exports
- src/detect.ts — pool: true → SMTPPool
- build.ts — auth/oauth2, pool entrypoints
- package.json — 0.2.0, new exports
- jsr.json — 0.2.0, new exports
- README.md — DKIM, OAuth2, pooling docs

### Verification
- [x] bun test — 92 tests passed
- [x] bun run typecheck
- [x] bun run lint
- [x] bun run build

### Blocked by
- none

---

## Rename — sendx → sently
**Status:** completed
**Date:** 2026-05-29
**Commits:** 7b0d254, 6a0d937, b544327

### Summary
- Renamed published package from `sendx` to `sently` in package.json and jsr.json
- Updated repository URLs to github.com/alialnaghmoush/sently
- Updated JSR package scope to `@alialnaghmoush/sently`
- Updated Message-ID domain and MIME boundaries in src/core/mime.ts
- Updated all @example import paths in module docs
- Updated README badges, install commands, and import examples

### Blocked by
- none

---

## v0.2.1 — Patch Release
**Status:** completed
**Date:** 2026-05-29
**Commit:** 2b67f79

### Summary
Post-rename version bump and publish verification.

### Blocked by
- none

---

## v0.3 — Unit 1 — Types v0.3 + TLS minVersion
**Status:** completed
**Date:** 2026-05-29

### Files created
- [none]

### Files modified
- src/core/types.ts — MailPlugin, transport configs, TLSOptions.minVersion, plugins on SMTPConfig
- src/adapters/node.ts — minVersion in startTLS and connectTls
- src/adapters/bun.ts — minVersion in startTLS and connectTls

### Verification
- [x] bun test — 97 tests passed
- [x] bun run typecheck
- [x] bun run lint

### Deviations from plan
- Also pass minVersion in connectTls (not just startTLS) for port 465 / implicit TLS

### Blocked by
- none

---

## v0.3 — Unit 2 — Plugin System
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/core/plugin.ts
- tests/core/plugin.test.ts

### Files modified
- src/detect.ts — MailerImpl plugins pipeline, tls passthrough to createDefaultAdapter

### Verification
- [x] bun test — 105 tests passed
- [x] bun run typecheck
- [x] bun run lint

### Deviations from plan
- Pass tls: smtpConfig.tls into createDefaultAdapter for minVersion on port 465

### Blocked by
- none

---

## v0.3 — Unit 3 — Mailgun Transport
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/transports/mailgun.ts
- tests/transports/mailgun.test.ts

### Files modified
- [none]

### Verification
- [x] bun test — 111 tests passed
- [x] bun run typecheck
- [x] bun run lint

### Deviations from plan
- [none]

### Blocked by
- none

---

## v0.3 — Unit 4 — AWS SigV4 Utility
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/core/sigv4.ts
- tests/core/sigv4.test.ts

### Files modified
- [none]

### Verification
- [x] bun test — 116 tests passed
- [x] bun run typecheck
- [x] bun run lint

### Deviations from plan
- _date uses full YYYYMMDDTHHMMSSZ; AWS POST test vector (not GET with stale signature)

### Blocked by
- none

---

## v0.3 — Unit 5 — AWS SES Transport
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/transports/ses.ts
- tests/transports/ses.test.ts

### Files modified
- [none]

### Verification
- [x] bun test — 122 tests passed
- [x] bun run typecheck
- [x] bun run lint

### Deviations from plan
- [none]

### Blocked by
- none

---

## v0.3 — Unit 6 — Brevo Transport
**Status:** completed
**Date:** 2026-05-29

### Files created
- src/transports/brevo.ts
- tests/transports/brevo.test.ts

### Files modified
- [none]

### Verification
- [x] bun test — 129 tests passed
- [x] bun run typecheck
- [x] bun run lint

### Deviations from plan
- [none]

### Blocked by
- none

---

## v0.3 — Unit 7 — Version + Exports + Docs
**Status:** completed
**Date:** 2026-05-29

### Files created
- [none]

### Files modified
- build.ts — mailgun, ses, brevo entrypoints
- package.json — 0.3.0, new subpath exports
- jsr.json — 0.3.0, new subpath exports
- src/index.ts — v0.3 exports
- CHANGELOG.md — 0.3.0 entry
- README.md — plugins, Mailgun, SES, Brevo docs

### Verification
- [x] bun test — 129 tests passed
- [x] bun run typecheck
- [x] bun run lint
- [x] bun run build

### Deviations from plan
- [none]

### Blocked by
- none

---

## v0.3.1 — Security Patches
**Status:** completed
**Date:** 2026-05-29
**Commit:** 5bcf6b2

### Security fixes
- CRLF header injection: `sanitizeHeaderValue()` strips CR/LF from Subject,
  display names, and custom headers in src/core/mime.ts
- SMTP command injection: MAIL FROM and RCPT TO throw SMTPError when address
  contains CR or LF in src/core/smtp.ts
- Email address validation: `isValidEmail()` rejects CR, LF, TAB in src/core/address.ts
- OAuth2 refresh race condition: concurrent `getAccessToken()` calls share a
  single in-flight Promise via `.finally()` in src/auth/oauth2.ts
- Added `console.warn` when `rejectUnauthorized: false` in node + bun adapters
- Added security note in README for `attachment.path`

### Verification
- [x] bun test — 129 tests passed
- [x] bun run typecheck

### Blocked by
- none

---

## v0.3.2 — Lint Fix
**Status:** completed
**Date:** 2026-05-29
**Commit:** e1836d6

### Fixed
- Biome formatting in MIME header builder (src/core/mime.ts) so `bun run lint` passes

### Verification
- [x] bun run lint — clean

### Blocked by
- none

---

## v0.3.3 — JSR Package Name Fix
**Status:** completed
**Date:** 2026-05-29
**Commit:** 6796000

### Fixed
- Corrected JSR package name in README from `@sently/sently` to `@alialnaghmoush/sently`

### Blocked by
- none

---

## v0.3.4 — Bug Fixes + Hygiene
**Status:** completed
**Date:** 2026-05-30
**Commit:** 906b4b0

### Fixed
- Stale `sendx` references in package.json (homepage, bugs.url) and build.ts
- JSR badge URL corrected to match jsr.json scope
- OAuth2 refresh: `refreshPromise` cleared in `.finally()` to handle rejected
  refresh attempts correctly
- SMTPPool.close() sets draining flag, rejects new sends, uses Promise.allSettled
- Audited all buildMIME() call sites — await confirmed present on all callers

### Added
- `engines` field in package.json: Node >= 18.0.0, Bun >= 1.0.0

### Verification
- [x] bun test — 129 tests passed
- [x] bun run typecheck
- [x] bun run lint

### Blocked by
- none

---

## v0.4 — Unit 1 — Core Types v0.4
**Status:** completed
**Date:** 2026-05-30

### Files modified
- src/core/types.ts

### Verification
- [x] bun test — 129 tests passed

---

## v0.4 — Unit 2 — PreviewTransport
**Status:** completed
**Date:** 2026-05-30

### Files created
- src/transports/preview.ts, tests/transports/preview.test.ts

---

## v0.4 — Unit 3 — RetryTransport
**Status:** completed
**Date:** 2026-05-30

### Files created
- src/transports/retry.ts, tests/transports/retry.test.ts

### Deviations from plan
- `_sleep` constructor injection for backoff tests

---

## v0.4 — Unit 4 — sendBulk()
**Status:** completed
**Date:** 2026-05-30

### Files created
- tests/core/bulk.test.ts

### Files modified
- src/detect.ts

---

## v0.4 — Unit 5 — TemplatePlugin
**Status:** completed
**Date:** 2026-05-30

### Files created
- src/plugins/template.ts, tests/plugins/template.test.ts

---

## v0.4 — Unit 6 — verify() + SES DKIM
**Status:** completed
**Date:** 2026-05-30

### Files modified
- HTTP transports verify(), SMTP/pool VerifyResult, SES dkim, tools/mcp/tools/check-smtp.ts

### Verification
- [x] bun test — 168 tests passed
- [x] bun run typecheck

---

## v0.4 — Unit 7 — Security fixes
**Status:** completed
**Date:** 2026-05-30

### Files created
- tests/transports/resolve-attachments.test.ts

### Files modified
- src/transports/resolve-attachments.ts

### Deviations from plan
- detectRuntime() confirmed correct

---

## v0.4 — Unit 8 — CI + Integration
**Status:** completed
**Date:** 2026-05-30

### Files created
- .github/workflows/test.yml, tests/integration/smtp.integration.ts

### Files modified
- tests/core/mime.test.ts

---

## v0.4 — Unit 9 — Version + Exports + Docs
**Status:** completed
**Date:** 2026-05-30

### Files modified
- build.ts, package.json, jsr.json, src/index.ts, CHANGELOG.md, README.md

### Verification
- [x] bun test — 176 tests passed
- [x] bun run typecheck
- [x] bun run lint
- [x] bun run build