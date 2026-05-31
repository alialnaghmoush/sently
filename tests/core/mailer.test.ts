import { describe, expect, test } from "bun:test";
import { SentlyError } from "../../src/core/errors.js";
import type { MailOptions, SendResult, Transport, TransportMailerOptions } from "../../src/core/types.js";
import { createMailer } from "../../src/mailer.js";

describe("sently/mailer", () => {
  test("throws INVALID_CONFIG when SMTP config is passed without transport", async () => {
    await expect(
      createMailer({
        host: "smtp.example.com",
        port: 587,
        auth: { user: "you@example.com", pass: "secret" },
      } as TransportMailerOptions),
    ).rejects.toMatchObject({
      sentlyCode: "INVALID_CONFIG",
      message: expect.stringContaining("createSMTPMailer"),
    });
  });

  test("createMailer wraps a custom transport", async () => {
    const transport: Transport = {
      send: async (): Promise<SendResult> => ({
        messageId: "<test@example.com>",
        accepted: ["to@example.com"],
        rejected: [],
        response: "250 OK",
        envelope: { from: "from@example.com", to: ["to@example.com"] },
      }),
    };

    const mailer = await createMailer({ transport });
    const result = await mailer.send({
      from: "from@example.com",
      to: "to@example.com",
      subject: "Test",
      text: "Body",
    } satisfies MailOptions);

    expect(result.messageId).toBe("<test@example.com>");
  });
});
