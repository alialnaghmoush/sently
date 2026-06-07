import { describe, expect, test } from "bun:test";
import { getProviderLabel } from "../../src/core/provider-label.js";
import type { Transport } from "../../src/core/types.js";
import { ResendTransport } from "../../src/transports/resend.js";

describe("getProviderLabel", () => {
  test("prefers Transport.provider when set", () => {
    const transport: Transport = {
      provider: "custom-api",
      send: async () => {
        throw new Error("not called");
      },
    };
    expect(getProviderLabel(transport)).toBe("custom-api");
  });

  test("falls back to constructor name without Transport suffix", () => {
    class SesTransport implements Transport {
      async send() {
        throw new Error("not called");
      }
    }
    expect(getProviderLabel(new SesTransport())).toBe("ses");
  });

  test("returns custom for plain object transports", () => {
    const transport: Transport = { send: async () => ({}) as never };
    expect(getProviderLabel(transport)).toBe("custom");
  });

  test("uses real transport provider field over constructor", () => {
    const transport = new ResendTransport({ apiKey: "re_test" });
    expect(transport.provider).toBe("resend");
    expect(getProviderLabel(transport)).toBe("resend");
  });
});
