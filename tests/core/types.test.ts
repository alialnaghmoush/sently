import { describe, expect, test } from "bun:test";
import type { SMTPMailerOptions, TransportMailerOptions } from "../../src/core/types.js";
import type { SendResult, Transport } from "../../src/core/types.js";

describe("mailer option types", () => {
  test("TransportMailerOptions and SMTPMailerOptions are exported separately", () => {
    const transportOptions: TransportMailerOptions = {
      transport: {
        send: async (): Promise<SendResult> => ({
          messageId: "<x@y>",
          accepted: [],
          rejected: [],
          response: "250",
          envelope: { from: "a@b.com", to: ["c@d.com"] },
        }),
      } satisfies Transport,
    };

    const smtpOptions: SMTPMailerOptions = {
      host: "smtp.example.com",
      auth: { user: "u@example.com", pass: "secret" },
    };

    expect(transportOptions.transport).toBeDefined();
    expect(smtpOptions.host).toBe("smtp.example.com");
  });

  test("CreateMailerOptions is not exported from core types module", async () => {
    const mod = await import("../../src/core/types.js");
    expect("CreateMailerOptions" in mod).toBe(false);
  });
});
