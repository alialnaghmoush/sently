/**
 * Live Inbucket checks — skipped unless explicitly opted in.
 *
 * Start a local catcher first:
 *
 * ```sh
 * docker run -d --rm --name inbucket -p 9000:9000 -p 2500:2500 -p 1100:1100 inbucket/inbucket
 * ```
 *
 * Then:
 *
 * ```env
 * INBUCKET_LIVE=1
 * # optional overrides:
 * # INBUCKET_API_URL=http://localhost:9000
 * # INBUCKET_SMTP_HOST=localhost
 * # INBUCKET_SMTP_PORT=2500
 * ```
 *
 * Run locally: `INBUCKET_LIVE=1 bun run test:live`
 * (`bun test` / CI ignore `*.live.test.ts`; live suites refuse CI.)
 */
import { describe, expect, test } from "bun:test";
import { createMailer } from "../../src/mailer.js";
import { InbucketTransport } from "../../src/transports/inbucket.js";

const inCi = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const live = !inCi && process.env.INBUCKET_LIVE === "1";
const apiUrl = process.env.INBUCKET_API_URL?.trim() || "http://localhost:9000";
const host = process.env.INBUCKET_SMTP_HOST?.trim() || "localhost";
const port = Number(process.env.INBUCKET_SMTP_PORT?.trim() || "2500");

if (!live) {
  console.log("skip: Inbucket live tests (set INBUCKET_LIVE=1 with a local catcher)");
}

describe("Inbucket live API", () => {
  test.skipIf(!live)("send + list + get + source + markSeen + purge", async () => {
    const to = `sently-live-${Date.now()}@example.com`;
    const inbucket = new InbucketTransport({ host, port, apiUrl });
    const mailer = await createMailer({ transport: inbucket });
    const mailbox = inbucket.mailboxForAddress(to);

    await inbucket.purgeMailbox(mailbox);

    const subject = `sently inbucket live ${new Date().toISOString()}`;
    const result = await mailer.send({
      from: "dev@example.com",
      to,
      subject,
      text: "Hello from Inbucket live suite",
      html: "<p>Hello from <code>inbucket.live.test.ts</code></p>",
    });

    expect(result.messageId.length).toBeGreaterThan(0);
    expect(result.accepted).toContain(to);

    // Inbucket may briefly lag SMTP acceptance before REST visibility.
    let headers = await inbucket.listMailbox(mailbox);
    for (let i = 0; i < 10 && headers.length === 0; i++) {
      await Bun.sleep(100);
      headers = await inbucket.listMailbox(mailbox);
    }

    expect(headers.length).toBeGreaterThan(0);
    const header = headers.find((m) => m.subject === subject) ?? headers[headers.length - 1]!;
    expect(header.mailbox).toBe(mailbox);
    expect(header.seen).toBe(false);

    const full = await inbucket.getMessage(mailbox, header.id);
    expect(full.body.text).toContain("Hello from Inbucket live suite");
    expect(full.body.html).toContain("inbucket.live.test.ts");
    expect(full.header.Subject?.[0]).toContain("sently inbucket live");

    const source = await inbucket.getSource(mailbox, header.id);
    expect(source).toContain("Hello from Inbucket live suite");

    await inbucket.markSeen(mailbox, header.id);
    const afterSeen = await inbucket.getMessage(mailbox, header.id);
    expect(afterSeen.seen).toBe(true);

    await inbucket.purgeMailbox(mailbox);
    const empty = await inbucket.listMailbox(mailbox);
    expect(empty.length).toBe(0);

    await mailer.close();
  });

  test.skipIf(!live)("verify() remaps provider to inbucket", async () => {
    const transport = new InbucketTransport({ host, port, apiUrl });
    const result = await transport.verify();
    expect(result.ok).toBe(true);
    expect(result.provider).toBe("inbucket");
    await transport.close();
  });
});
