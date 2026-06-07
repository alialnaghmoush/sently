import { describe, expect, test } from "bun:test";
import { IdempotencyTransport } from "../../src/idempotency.js";
import type { SendResult, Transport } from "../../src/core/types.js";
import { BrevoTransport } from "../../src/transports/brevo.js";
import { CloudflareEmailTransport } from "../../src/transports/cloudflare-email.js";
import { FallbackTransport } from "../../src/transports/fallback.js";
import { LoopsTransport } from "../../src/transports/loops.js";
import { MailerSendTransport } from "../../src/transports/mailersend.js";
import { MailgunTransport } from "../../src/transports/mailgun.js";
import { MailtrapTransport } from "../../src/transports/mailtrap.js";
import { PlunkTransport } from "../../src/transports/plunk.js";
import { PostmarkTransport } from "../../src/transports/postmark.js";
import { PreviewTransport } from "../../src/transports/preview.js";
import { ResendTransport } from "../../src/transports/resend.js";
import { RetryTransport } from "../../src/transports/retry.js";
import { SendGridTransport } from "../../src/transports/sendgrid.js";
import { SESTransport } from "../../src/transports/ses.js";
import { SMTPTransport } from "../../src/transports/smtp.js";
import { SparkPostTransport } from "../../src/transports/sparkpost.js";
import { WeightedFallbackTransport } from "../../src/transports/weighted-fallback.js";

const noopSend = async (): Promise<SendResult> => ({
  messageId: "",
  accepted: [],
  rejected: [],
  response: "",
  envelope: { from: "", to: [] },
});

const stub: Transport = { send: noopSend };

describe("Transport.provider", () => {
  const cases: Array<{ transport: Transport; expected: string }> = [
    { transport: new ResendTransport({ apiKey: "re_test" }), expected: "resend" },
    { transport: new SendGridTransport({ apiKey: "sg_test" }), expected: "sendgrid" },
    { transport: new PostmarkTransport({ serverToken: "pm_test" }), expected: "postmark" },
    {
      transport: new MailgunTransport({ apiKey: "mg_test", domain: "example.com" }),
      expected: "mailgun",
    },
    {
      transport: new SESTransport({
        accessKeyId: "key",
        secretAccessKey: "secret",
        region: "us-east-1",
      }),
      expected: "ses",
    },
    { transport: new BrevoTransport({ apiKey: "brevo_test" }), expected: "brevo" },
    { transport: new MailerSendTransport({ apiToken: "ms_test" }), expected: "mailersend" },
    { transport: new PlunkTransport({ apiKey: "plunk_test" }), expected: "plunk" },
    { transport: new SparkPostTransport({ apiKey: "sp_test" }), expected: "sparkpost" },
    { transport: new MailtrapTransport({ apiToken: "mt_test" }), expected: "mailtrap" },
    { transport: new LoopsTransport({ apiKey: "loops_test" }), expected: "loops" },
    {
      transport: new SMTPTransport({
        host: "smtp.example.com",
        port: 587,
        auth: { user: "u", pass: "p" },
      }),
      expected: "smtp",
    },
    { transport: new PreviewTransport({ outDir: "/tmp" }), expected: "preview" },
    {
      transport: new RetryTransport(stub, { maxAttempts: 1, backoff: "fixed", baseDelay: 0 }),
      expected: "retry",
    },
    { transport: new FallbackTransport([stub]), expected: "fallback" },
    {
      transport: new WeightedFallbackTransport([{ transport: stub, weight: 1 }]),
      expected: "weighted-fallback",
    },
    {
      transport: new CloudflareEmailTransport({ sendEmail: async () => {} }),
      expected: "cloudflare-email",
    },
    {
      transport: new IdempotencyTransport(stub),
      expected: "idempotency",
    },
  ];

  for (const { transport, expected } of cases) {
    test(`${transport.constructor.name} exposes provider "${expected}"`, () => {
      expect(transport.provider).toBe(expected);
    });
  }
});
