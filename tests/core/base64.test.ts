import { describe, expect, test } from "bun:test";
import {
  decodeBase64,
  decodeUtf8,
  encodeBase64,
  encodeHeader,
  encodeQP,
  encodeUtf8,
  needsEncoding,
} from "../../src/core/base64.js";

describe("encodeBase64 / decodeBase64", () => {
  test("ASCII roundtrip", () => {
    const input = "Hello, sently!";
    const encoded = encodeBase64(input);
    const decoded = decodeUtf8(decodeBase64(encoded.replace(/\r\n/g, "")));
    expect(decoded).toBe(input);
  });

  test("binary data with bytes > 127", () => {
    const bytes = new Uint8Array([0, 127, 128, 255]);
    const encoded = encodeBase64(bytes);
    const decoded = decodeBase64(encoded.replace(/\r\n/g, ""));
    expect(decoded).toEqual(bytes);
  });

  test("wraps lines at 76 characters", () => {
    const long = "x".repeat(200);
    const encoded = encodeBase64(long);
    const lines = encoded.split("\r\n");
    for (const line of lines.slice(0, -1)) {
      expect(line.length).toBeLessThanOrEqual(76);
    }
  });

  test("Arabic text roundtrip via UTF-8", () => {
    const arabic = "مرحبا";
    const encoded = encodeBase64(arabic);
    const decoded = decodeUtf8(decodeBase64(encoded.replace(/\r\n/g, "")));
    expect(decoded).toBe(arabic);
  });
});

describe("encodeHeader", () => {
  test("ASCII unchanged", () => {
    expect(encodeHeader("Ali")).toBe("Ali");
  });

  test("Arabic encoded as RFC 2047", () => {
    expect(encodeHeader("علي")).toMatch(/^=\?UTF-8\?B\?.+\?=$/);
  });

  test("needsEncoding detects non-ASCII", () => {
    expect(needsEncoding("Ali")).toBe(false);
    expect(needsEncoding("علي")).toBe(true);
  });
});

describe("encodeQP", () => {
  test("encodes special bytes", () => {
    expect(encodeQP("a=b")).toContain("=3D");
  });

  test("preserves printable ASCII", () => {
    expect(encodeQP("hello")).toBe("hello");
  });
});

describe("encodeUtf8", () => {
  test("produces Uint8Array", () => {
    const bytes = encodeUtf8("test");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(4);
  });
});
