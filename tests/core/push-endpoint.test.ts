import { describe, expect, test } from "bun:test";
import {
  assertSafePushEndpoint,
  redactPushEndpoint,
} from "../../src/core/push-endpoint.js";

describe("assertSafePushEndpoint", () => {
  test("allows known HTTPS push hosts", () => {
    expect(() =>
      assertSafePushEndpoint("https://fcm.googleapis.com/fcm/send/abc"),
    ).not.toThrow();
    expect(() =>
      assertSafePushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/token"),
    ).not.toThrow();
    expect(() =>
      assertSafePushEndpoint("https://web.push.apple.com/token"),
    ).not.toThrow();
  });

  test("allows extra hosts from caller list", () => {
    expect(() =>
      assertSafePushEndpoint("https://push.myrelay.example/s/1", ["push.myrelay.example"]),
    ).not.toThrow();
  });

  test("rejects http and credentialed URLs", () => {
    expect(() => assertSafePushEndpoint("http://fcm.googleapis.com/x")).toThrow(/https/);
    expect(() =>
      assertSafePushEndpoint("https://user:pass@fcm.googleapis.com/x"),
    ).toThrow(/credentials/);
  });

  test("rejects IP literals and non-allowlisted hosts", () => {
    expect(() => assertSafePushEndpoint("https://169.254.169.254/latest/meta-data/")).toThrow(
      /IP address/,
    );
    expect(() => assertSafePushEndpoint("https://127.0.0.1/admin")).toThrow(/IP address/);
    expect(() => assertSafePushEndpoint("https://evil.example.com/push")).toThrow(/allowlisted/);
  });
});

describe("redactPushEndpoint", () => {
  test("returns origin plus short hash, never the token path", async () => {
    const raw = "https://fcm.googleapis.com/fcm/send/super-secret-token-value";
    const redacted = await redactPushEndpoint(raw);
    expect(redacted.startsWith("https://fcm.googleapis.com/#")).toBe(true);
    expect(redacted).not.toContain("super-secret-token-value");
    expect(redacted).not.toContain("/fcm/send/");
  });
});
