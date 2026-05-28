import { describe, expect, test } from "bun:test";
import { decodeUtf8, encodeUtf8 } from "../../src/core/base64.js";
import {
  accumulateResponse,
  assertResponse,
  computeCRAMMD5,
  encodeCommand,
  encodeLine,
  parseEHLO,
  parseResponse,
  selectAuthMethod,
  SMTPError,
} from "../../src/core/smtp.js";

describe("parseResponse", () => {
  test("parses success response", () => {
    const response = parseResponse(encodeUtf8("250 OK\r\n"));
    expect(response.code).toBe(250);
    expect(response.isSuccess).toBe(true);
    expect(response.isError).toBe(false);
  });

  test("parses ready response", () => {
    const response = parseResponse(encodeUtf8("354 Start mail input\r\n"));
    expect(response.code).toBe(354);
    expect(response.isReady).toBe(true);
  });
});

describe("encodeCommand", () => {
  test("EHLO command", () => {
    const cmd = encodeCommand({ type: "EHLO", domain: "example.com" });
    expect(decodeUtf8(cmd)).toBe("EHLO example.com\r\n");
  });

  test("MAIL FROM command", () => {
    const cmd = encodeCommand({ type: "MAIL_FROM", address: "user@example.com" });
    expect(decodeUtf8(cmd)).toBe("MAIL FROM:<user@example.com>\r\n");
  });

  test("dot-stuffing in DATA_BODY", () => {
    const body = encodeUtf8("Line one\r\n.Line two\r\n");
    const cmd = encodeCommand({ type: "DATA_BODY", content: body });
    const text = decodeUtf8(cmd);
    expect(text).toContain("..Line two");
    expect(text.endsWith("\r\n.\r\n")).toBe(true);
  });

  test("AUTH LOGIN sends command only", () => {
    const cmd = encodeCommand({ type: "AUTH_LOGIN", user: "user", pass: "pass" });
    expect(decodeUtf8(cmd)).toBe("AUTH LOGIN\r\n");
  });
});

describe("accumulateResponse", () => {
  test("waits for final line of multiline EHLO", () => {
    const part1 = encodeUtf8("250-smtp.example.com\r\n");
    expect(accumulateResponse([part1])).toBeNull();

    const part2 = encodeUtf8("250 AUTH LOGIN PLAIN\r\n");
    const complete = accumulateResponse([part1, part2]);
    expect(complete).not.toBeNull();
  });
});

describe("parseEHLO", () => {
  test("extracts capabilities", () => {
    const response = parseResponse(encodeUtf8("250-smtp.example.com\r\n250 AUTH LOGIN PLAIN\r\n"));
    const caps = parseEHLO(response);
    expect(caps.some((c) => c.includes("AUTH"))).toBe(true);
  });
});

describe("selectAuthMethod", () => {
  test("prefers LOGIN over PLAIN", () => {
    expect(selectAuthMethod(["AUTH LOGIN PLAIN"])).toBe("LOGIN");
  });

  test("falls back to PLAIN", () => {
    expect(selectAuthMethod(["AUTH PLAIN"])).toBe("PLAIN");
  });
});

describe("computeCRAMMD5", () => {
  test("throws in v0.1", async () => {
    await expect(computeCRAMMD5("challenge", "user", "pass")).rejects.toThrow(SMTPError);
  });
});

describe("assertResponse", () => {
  test("throws on unexpected code", () => {
    const response = parseResponse(encodeUtf8("550 Mailbox unavailable\r\n"));
    expect(() => assertResponse(response, [250], "RCPT TO")).toThrow(SMTPError);
  });
});

describe("encodeLine", () => {
  test("appends CRLF", () => {
    expect(decodeUtf8(encodeLine("QUIT"))).toBe("QUIT\r\n");
  });
});
