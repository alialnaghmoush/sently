/**
 * Live SNDR API checks — skipped unless explicitly opted in.
 *
 * Add to repo-root `.env` (gitignored; Bun loads it automatically):
 *
 * ```env
 * SNDR_LIVE=1
 * SNDR_API_KEY=sndr_live_...
 * SNDR_FROM=you@your-verified-domain.com
 * SNDR_TO=you@example.com
 * ```
 *
 * `SNDR_FROM` must be on a domain verified in the SNDR dashboard.
 * Omit `SNDR_TO` to run `verify()` only (no send).
 *
 * Run locally: `SNDR_LIVE=1 bun run test:live`
 * (`bun test` / CI ignore `*.live.test.ts`; live suites refuse CI.)
 */
import { describe, expect, test } from "bun:test";
import { SndrTransport } from "../../src/transports/sndr.js";

const inCi = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const live = !inCi && process.env.SNDR_LIVE === "1";
const apiKey = process.env.SNDR_API_KEY?.trim();
const from = process.env.SNDR_FROM?.trim();
const to = process.env.SNDR_TO?.trim();

const hasKey = live && Boolean(apiKey);
const canSend = live && Boolean(apiKey && from && to);

if (!live) {
  console.log("skip: SNDR live tests (set SNDR_LIVE=1 with credentials)");
}

describe("SNDR live API", () => {
  test.skipIf(!hasKey)("verify() accepts the API key", async () => {
    const transport = new SndrTransport({ apiKey: apiKey! });
    const result = await transport.verify();
    expect(result.ok).toBe(true);
    expect(result.provider).toBe("sndr");
  });

  test.skipIf(!canSend)("send() delivers a real message", async () => {
    const transport = new SndrTransport({ apiKey: apiKey! });
    const result = await transport.send({
      from: from!,
      to: to!,
      subject: `sently live test ${new Date().toISOString()}`,
      text: "Sent by tests/integration/sndr.live.test.ts",
      html: "<p>Sent by <code>tests/integration/sndr.live.test.ts</code></p>",
    });

    expect(result.messageId.length).toBeGreaterThan(0);
    expect(result.accepted).toContain(to!);
    expect(result.response.length).toBeGreaterThan(0);
  });
});
