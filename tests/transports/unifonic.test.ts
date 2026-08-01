import { afterEach, describe, expect, test } from "bun:test";
import type { SmsOptions } from "../../src/core/sms-types.js";
import {
  normalizeUnifonicPhone,
  UnifonicError,
  UnifonicTransport,
} from "../../src/transports/unifonic.js";

const originalFetch = globalThis.fetch;

interface CapturedRequest {
  url: string;
  init: RequestInit;
}

function installFetchMock(
  handler: (req: CapturedRequest) => Response | Promise<Response>,
): CapturedRequest[] {
  const captured: CapturedRequest[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const request: CapturedRequest = { url, init: init ?? {} };
    captured.push(request);
    return handler(request);
  }) as typeof fetch;

  return captured;
}

const baseOptions: SmsOptions = {
  to: "+966501234567",
  body: "OTP 1234",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("normalizeUnifonicPhone", () => {
  test("strips + and leading 00", () => {
    expect(normalizeUnifonicPhone("+966501234567")).toBe("966501234567");
    expect(normalizeUnifonicPhone("00966501234567")).toBe("966501234567");
  });
});

describe("UnifonicTransport", () => {
  test("send() posts AppSid JSON to el.cloud", async () => {
    const captured = installFetchMock(() =>
      Response.json({
        success: true,
        message: "",
        errorCode: "ER-00",
        data: {
          MessageID: 42000348806924,
          CorrelationID: "corr-1",
          Status: "Sent",
          Cost: 0.04,
          CurrencyCode: "SAR",
          Recipient: "966501234567",
        },
      }),
    );

    const transport = new UnifonicTransport({
      appSid: "appsid_test",
      senderId: "MyBrand",
    });

    const result = await transport.send({ ...baseOptions, messageId: "corr-1" });

    expect(captured).toHaveLength(1);
    expect(captured[0]?.url).toBe("https://el.cloud.unifonic.com/rest/SMS/messages");
    expect(JSON.parse(String(captured[0]?.init.body))).toEqual({
      AppSid: "appsid_test",
      SenderID: "MyBrand",
      Recipient: "966501234567",
      Body: "OTP 1234",
      responseType: "JSON",
      async: false,
      CorrelationID: "corr-1",
    });

    expect(result).toMatchObject({
      messageId: "42000348806924",
      to: "+966501234567",
      status: "accepted",
      provider: "unifonic",
    });
  });

  test("send() throws UnifonicError on API failure", async () => {
    installFetchMock(() =>
      Response.json(
        {
          success: false,
          message: "Invalid AppSid",
          errorCode: "ER-01",
        },
        { status: 401 },
      ),
    );

    const transport = new UnifonicTransport({
      appSid: "bad",
      senderId: "MyBrand",
    });

    await expect(transport.send(baseOptions)).rejects.toBeInstanceOf(UnifonicError);
  });

  test("send() requires SenderID", async () => {
    const transport = new UnifonicTransport({ appSid: "appsid_test" });
    await expect(transport.send(baseOptions)).rejects.toThrow(/SenderID/);
  });

  test("send() accepts success as string true (OpenAPI example shape)", async () => {
    installFetchMock(() =>
      Response.json({
        success: "true",
        message: "",
        errorCode: "ER-00",
        data: { MessageID: 1, Status: "Queued", Recipient: "966501234567" },
      }),
    );

    const transport = new UnifonicTransport({
      appSid: "appsid_test",
      senderId: "MyBrand",
    });

    const result = await transport.send(baseOptions);
    expect(result.messageId).toBe("1");
    expect(result.status).toBe("Queued");
  });

  test("constructor rejects non-HTTPS statusCallback", () => {
    expect(
      () =>
        new UnifonicTransport({
          appSid: "appsid_test",
          senderId: "MyBrand",
          statusCallback: "http://example.com/dlr",
        }),
    ).toThrow(/https/);
  });
});
