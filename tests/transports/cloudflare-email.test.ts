import { describe, expect, test } from "bun:test";
import type { CloudflareEmailMessage } from "../../src/transports/cloudflare-email.js";
import {
  CloudflareEmailError,
  CloudflareEmailTransport,
} from "../../src/transports/cloudflare-email.js";

describe("CloudflareEmailTransport", () => {
  test("send maps options to binding message shape", async () => {
    let captured: CloudflareEmailMessage | undefined;
    const transport = new CloudflareEmailTransport({
      sendEmail: async (message) => {
        captured = message;
      },
    });

    const result = await transport.send({
      from: "Sender <sender@example.com>",
      to: "recipient@example.com",
      cc: "cc@example.com",
      subject: "Hello",
      text: "Plain",
      html: "<p>HTML</p>",
      replyTo: "reply@example.com",
      headers: { "X-Custom": "1" },
    });

    expect(captured).toEqual({
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Hello",
      reply_to: "reply@example.com",
      cc: ["cc@example.com"],
      headers: { "X-Custom": "1" },
      content: [
        { type: "text/plain", value: "Plain" },
        { type: "text/html", value: "<p>HTML</p>" },
      ],
    });
    expect(result.accepted).toEqual(["recipient@example.com"]);
    expect(result.response).toContain("Cloudflare Email");
  });

  test("verify returns ok without network call", async () => {
    const transport = new CloudflareEmailTransport({
      sendEmail: async () => {},
    });

    const result = await transport.verify();
    expect(result.ok).toBe(true);
    expect(result.provider).toBe("cloudflare-email");
  });

  test("binding rejection throws CloudflareEmailError", async () => {
    const transport = new CloudflareEmailTransport({
      sendEmail: async () => {
        throw new Error("binding rejected");
      },
    });

    await expect(
      transport.send({
        from: "sender@example.com",
        to: "recipient@example.com",
        subject: "Test",
        text: "Body",
      }),
    ).rejects.toBeInstanceOf(CloudflareEmailError);
  });

  test("send includes bcc and base64 attachments", async () => {
    let captured: CloudflareEmailMessage | undefined;
    const transport = new CloudflareEmailTransport({
      sendEmail: async (message) => {
        captured = message;
      },
    });

    await transport.send({
      from: "sender@example.com",
      to: "recipient@example.com",
      bcc: "hidden@example.com",
      subject: "With attachment",
      text: "See file",
      attachments: [
        {
          filename: "note.txt",
          content: new Uint8Array([72, 105]),
          contentType: "text/plain",
        },
      ],
    });

    expect(captured?.bcc).toEqual(["hidden@example.com"]);
    expect(captured?.attachments).toEqual([
      {
        disposition: "attachment",
        filename: "note.txt",
        type: "text/plain",
        content: "SGk=",
      },
    ]);
  });

  test("html-only message sends text/html content part", async () => {
    let captured: CloudflareEmailMessage | undefined;
    const transport = new CloudflareEmailTransport({
      sendEmail: async (message) => {
        captured = message;
      },
    });

    await transport.send({
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "HTML only",
      html: "<p>Hi</p>",
    });

    expect(captured?.content).toEqual([
      { type: "text/html", value: "<p>Hi</p>" },
    ]);
  });

  test("missing from or to throws CloudflareEmailError", async () => {
    const transport = new CloudflareEmailTransport({
      sendEmail: async () => {},
    });

    await expect(
      transport.send({
        from: "",
        to: "recipient@example.com",
        subject: "Test",
        text: "Body",
      }),
    ).rejects.toBeInstanceOf(CloudflareEmailError);
  });

  test("provider is stable", () => {
    const transport = new CloudflareEmailTransport({
      sendEmail: async () => {},
    });
    expect(transport.provider).toBe("cloudflare-email");
  });
});
