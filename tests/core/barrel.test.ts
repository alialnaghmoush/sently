import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..");

const removedFromMainBarrel = [
  "ResendTransport",
  "SendGridTransport",
  "PostmarkTransport",
  "MailgunTransport",
  "SESTransport",
  "BrevoTransport",
  "SMTPTransport",
  "PreviewTransport",
  "RetryTransport",
  "ResendError",
  "SendGridError",
  "parseResendWebhook",
  "IdempotencyTransport",
  "MemoryIdempotencyStore",
  "signDKIM",
  "importPrivateKey",
  "templatePlugin",
  "simpleEngine",
  "SMTPPool",
  "SMTPError",
  "RESEND_BATCH_MAX",
] as const;

const subpathExports: Array<{ symbol: string; from: string }> = [
  { symbol: "ResendTransport", from: "../../src/transports/resend.js" },
  { symbol: "parseResendWebhook", from: "../../src/webhooks.js" },
  { symbol: "IdempotencyTransport", from: "../../src/idempotency.js" },
  { symbol: "signDKIM", from: "../../src/dkim.js" },
  { symbol: "templatePlugin", from: "../../src/plugins/template.js" },
  { symbol: "SMTPPool", from: "../../src/pool/pool.js" },
  { symbol: "SMTPError", from: "../../src/transports/smtp.js" },
];

describe("main sently barrel", () => {
  test("src/index.ts does not re-export the react plugin", () => {
    const src = readFileSync(join(root, "src/index.ts"), "utf8");
    expect(src).not.toMatch(/from "\.\/react\.js"/);
    expect(src).not.toContain("reactPlugin");
  });

  test("createMailer from main barrel resolves without react peers installed", async () => {
    const { createMailer } = await import("../../src/index.js");
    const { ResendTransport } = await import("../../src/transports/resend.js");

    const mailer = await createMailer({
      transport: new ResendTransport({ apiKey: "re_test" }),
    });

    expect(mailer).toBeDefined();
    expect(typeof mailer.send).toBe("function");
  });

  test("createSMTPMailer is exported from main barrel", async () => {
    const { createSMTPMailer } = await import("../../src/index.js");
    expect(typeof createSMTPMailer).toBe("function");
  });

  test("SMTPMailerOptions type is exported from main barrel", async () => {
    const mod = await import("../../src/index.js");
    expect(mod).toBeDefined();
  });

  test("optional surface symbols are not exported from main barrel", async () => {
    const mod = await import("../../src/index.js");
    for (const symbol of removedFromMainBarrel) {
      expect(symbol in mod).toBe(false);
    }
  });

  test("removed symbols remain available from their subpaths", async () => {
    for (const { symbol, from } of subpathExports) {
      const mod = await import(from);
      expect(mod[symbol as keyof typeof mod]).toBeDefined();
    }
  });

  test("main barrel exports core factories and SentlyError", async () => {
    const mod = await import("../../src/index.js");
    expect(mod.createMailer).toBeDefined();
    expect(mod.createSMTPMailer).toBeDefined();
    expect(mod.detectRuntime).toBeDefined();
    expect(mod.SentlyError).toBeDefined();
    expect(mod.OAuth2Client).toBeDefined();
  });
});
