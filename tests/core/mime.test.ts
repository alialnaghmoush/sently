import { describe, expect, test } from "bun:test";
import { decodeUtf8 } from "../../src/core/base64.js";
import { buildMIME } from "../../src/core/mime.js";

describe("buildMIME", () => {
  test("text only", () => {
    const result = buildMIME({
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Hello",
      text: "Plain text body",
    });

    const raw = decodeUtf8(result.raw);
    expect(raw).toContain("Content-Type: text/plain");
    expect(raw).toContain("Plain text body");
    expect(result.envelope.from).toBe("sender@example.com");
    expect(result.envelope.to).toEqual(["recipient@example.com"]);
  });

  test("html only", () => {
    const result = buildMIME({
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Hello",
      html: "<p>HTML body</p>",
    });

    const raw = decodeUtf8(result.raw);
    expect(raw).toContain("Content-Type: text/html");
    expect(raw).toContain("<p>HTML body</p>");
  });

  test("text and html alternative", () => {
    const result = buildMIME({
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Hello",
      text: "Plain",
      html: "<p>HTML</p>",
    });

    const raw = decodeUtf8(result.raw);
    expect(raw).toContain("multipart/alternative");
    expect(raw).toContain("Plain");
    expect(raw).toContain("<p>HTML</p>");
  });

  test("inline image", () => {
    const result = buildMIME({
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Inline",
      html: '<img src="cid:logo">',
      attachments: [
        {
          filename: "logo.png",
          content: new Uint8Array([137, 80, 78, 71]),
          contentType: "image/png",
          contentId: "logo",
          inline: true,
        },
      ],
    });

    const raw = decodeUtf8(result.raw);
    expect(raw).toContain("multipart/related");
    expect(raw).toContain("Content-ID: <logo>");
  });

  test("file attachment", () => {
    const result = buildMIME({
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "Attachment",
      text: "See attached",
      attachments: [
        {
          filename: "doc.pdf",
          content: new Uint8Array([37, 80, 68, 70]),
          contentType: "application/pdf",
        },
      ],
    });

    const raw = decodeUtf8(result.raw);
    expect(raw).toContain("multipart/mixed");
    expect(raw).toContain('filename="doc.pdf"');
  });

  test("Arabic subject encoded", () => {
    const result = buildMIME({
      from: "sender@example.com",
      to: "recipient@example.com",
      subject: "مرحبا",
      text: "Hello",
    });

    const raw = decodeUtf8(result.raw);
    expect(raw).toMatch(/Subject: =\?UTF-8\?B\?.+\?=/);
  });

  test("BCC in envelope but not in headers", () => {
    const result = buildMIME({
      from: "sender@example.com",
      to: "visible@example.com",
      cc: "cc@example.com",
      bcc: "hidden@example.com",
      subject: "BCC test",
      text: "Secret copy",
    });

    const raw = decodeUtf8(result.raw);
    expect(result.envelope.to).toEqual([
      "visible@example.com",
      "cc@example.com",
      "hidden@example.com",
    ]);
    expect(raw).toContain("To: visible@example.com");
    expect(raw).toContain("Cc: cc@example.com");
    expect(raw).not.toContain("Bcc:");
    expect(raw).not.toContain("hidden@example.com");
  });
});
