import { afterEach, describe, expect, test } from "bun:test";
import type { SmsOptions } from "../../src/core/sms-types.js";
import { TaqnyatSmsError, TaqnyatSmsTransport } from "../../src/transports/taqnyat-sms.js";

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

describe("TaqnyatSmsTransport", () => {
  test("send() builds Bearer JSON request and strips leading +", async () => {
    const captured = installFetchMock(() =>
      Response.json(
        {
          statusCode: 201,
          messageId: 98765,
          cost: 0.05,
          currency: "SAR",
        },
        { status: 201 },
      ),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "tok_test",
      sender: "MyBrand",
    });

    await transport.send(baseOptions);

    expect(captured).toHaveLength(1);
    const { url, init } = captured[0] as CapturedRequest;
    expect(url).toBe("https://api.taqnyat.sa/v1/messages");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: "Bearer tok_test",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      recipients: ["966501234567"],
      body: "OTP 1234",
      sender: "MyBrand",
    });
  });

  test("send() strips leading 00 and forwards smsId from messageId", async () => {
    const captured = installFetchMock(() =>
      Response.json(
        {
          statusCode: 201,
          messageId: 5452899970,
          cost: 0.026,
          currency: "SAR",
          accepted: "[966501234567,]",
          rejected: "[]",
        },
        { status: 201 },
      ),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "tok_test",
      sender: "MyBrand",
    });

    await transport.send({
      to: "00966501234567",
      body: "Hello",
      messageId: "25489",
    });

    expect(JSON.parse(String((captured[0] as CapturedRequest).init.body))).toEqual({
      recipients: ["966501234567"],
      body: "Hello",
      sender: "MyBrand",
      smsId: "25489",
    });
  });

  test("send() maps 201 to SmsSendResult", async () => {
    installFetchMock(() =>
      Response.json(
        { statusCode: 201, messageId: 42, cost: 0.1, currency: "SAR" },
        { status: 201 },
      ),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "tok_test",
      sender: "MyBrand",
    });

    const result = await transport.send(baseOptions);
    expect(result).toEqual({
      messageId: "42",
      to: "+966501234567",
      status: "accepted",
      response: "cost: 0.1 SAR",
      provider: "taqnyat-sms",
    });
  });

  test("send() throws TaqnyatSmsError on 400/401", async () => {
    installFetchMock(() =>
      Response.json({ statusCode: 401, message: "Invalid token" }, { status: 401 }),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "bad",
      sender: "MyBrand",
    });

    await expect(transport.send(baseOptions)).rejects.toMatchObject({
      name: "TaqnyatSmsError",
      statusCode: 401,
      message: "Invalid token",
    });
    await expect(transport.send(baseOptions)).rejects.toBeInstanceOf(TaqnyatSmsError);
  });

  test("sendOtp() posts verify.php and accepts code 5", async () => {
    const captured = installFetchMock(() =>
      Response.json({ code: 5, message: "Activation code sent successfully." }),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "tok_test",
      sender: "MyBrand",
    });

    const result = await transport.sendOtp({
      to: "+966501234567",
      requestId: "login-1",
      lang: "en",
    });

    expect(result).toMatchObject({
      requestId: "login-1",
      to: "+966501234567",
      code: 5,
      provider: "taqnyat-sms",
    });

    const { url, init } = captured[0] as CapturedRequest;
    expect(url).toBe("https://api.taqnyat.sa/verify.php/");
    expect(JSON.parse(String(init.body))).toEqual([
      {
        apiKey: "tok_test",
        numbers: ["966501234567"],
        method: "sms",
        sender: "MyBrand",
        lang: "en",
        requestId: "login-1",
        returnJson: 1,
      },
    ]);
  });

  test("sendOtp() reads Data.result from live returnJson envelope (not status)", async () => {
    // Live Taqnyat Verify wraps the docs-table code in Data.result; top-level
    // status:1 is the envelope and must NOT be treated as "invalid apiKey".
    installFetchMock(() =>
      Response.json({
        status: 1,
        ResponseStatus: "success",
        Data: {
          id: "",
          result: 5,
          MessageAr: "تم ارسال رمز التحقق لرقم الجوال 3258********",
          MessageEn: "Verification code sent to mobile number ********3258",
        },
        Error: null,
      }),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "tok_test",
      sender: "MyBrand",
    });

    const result = await transport.sendOtp({
      to: "+966501234567",
      requestId: "login-1",
      lang: "en",
    });

    expect(result.code).toBe(5);
    expect(result.requestId).toBe("login-1");
  });

  test("sendOtp() surfaces Data.result failure codes from the envelope", async () => {
    installFetchMock(() =>
      Response.json({
        status: 1,
        ResponseStatus: "success",
        Data: {
          result: 1,
          MessageEn: "invalid apiKey",
        },
        Error: null,
      }),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "bad",
      sender: "MyBrand",
    });

    await expect(
      transport.sendOtp({ to: "+966501234567", requestId: "login-1" }),
    ).rejects.toMatchObject({
      name: "TaqnyatSmsError",
      statusCode: 1,
      message: "invalid apiKey",
    });
  });

  test("verifyOtp() accepts code 10", async () => {
    installFetchMock(() =>
      Response.json({ code: 10, message: "Activation process completed successfully." }),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "tok_test",
      sender: "MyBrand",
    });

    const result = await transport.verifyOtp({
      to: "+966501234567",
      requestId: "login-1",
      code: "6240",
      lang: "en",
    });

    expect(result.ok).toBe(true);
    expect(result.code).toBe(10);
  });

  test("verifyOtp() reads Data.result from live returnJson envelope", async () => {
    installFetchMock(() =>
      Response.json({
        status: 1,
        ResponseStatus: "success",
        Data: {
          result: 10,
          MessageEn: "Activation process completed successfully.",
        },
        Error: null,
      }),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "tok_test",
      sender: "MyBrand",
    });

    const result = await transport.verifyOtp({
      to: "+966501234567",
      requestId: "login-1",
      code: "6240",
      lang: "en",
    });

    expect(result.ok).toBe(true);
    expect(result.code).toBe(10);
    expect(result.message).toBe("Activation process completed successfully.");
  });

  test("verifyOtp() throws on incorrect code 11", async () => {
    installFetchMock(() => Response.json({ code: 11, message: "Activation code is incorrect." }));

    const transport = new TaqnyatSmsTransport({
      bearerToken: "tok_test",
      sender: "MyBrand",
    });

    await expect(
      transport.verifyOtp({
        to: "+966501234567",
        requestId: "login-1",
        code: "0000",
      }),
    ).rejects.toMatchObject({
      name: "TaqnyatSmsError",
      statusCode: 11,
      message: "Activation code is incorrect.",
    });
  });

  test("getBalance() maps account balance payload", async () => {
    const captured = installFetchMock(() =>
      Response.json({
        statusCode: 200,
        accountStatus: "active",
        accountExpiryDate: "02-08-2027",
        balance: "1",
        currency: "SAR",
      }),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "tok_test",
      sender: "MyBrand",
    });
    const result = await transport.getBalance();

    expect(result).toEqual({
      accountStatus: "active",
      balance: "1",
      currency: "SAR",
      accountExpiryDate: "02-08-2027",
      provider: "taqnyat-sms",
    });
    expect((captured[0] as CapturedRequest).url).toContain("/account/balance?");
    expect((captured[0] as CapturedRequest).url).toContain("bearerTokens=tok_test");
  });

  test("listSenders() returns sender rows", async () => {
    installFetchMock(() =>
      Response.json({
        statusCode: 200,
        senders: [{ senderName: "Taqnyat.sa", status: "active" }],
      }),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "tok_test",
      sender: "MyBrand",
    });
    await expect(transport.listSenders()).resolves.toEqual([
      { senderName: "Taqnyat.sa", status: "active" },
    ]);
  });

  test("schedule() posts scheduledDatetime and deleteId", async () => {
    const captured = installFetchMock(() =>
      Response.json(
        { statusCode: 201, messageId: 111, cost: 0.15, currency: "SAR" },
        { status: 201 },
      ),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "tok_test",
      sender: "MyBrand",
    });
    const result = await transport.schedule({
      to: "+966501234567",
      body: "Later",
      scheduledDatetime: "2030-01-01T10:00",
      deleteId: "demo-1",
    });

    expect(result.messageId).toBe("111");
    expect(result.deleteId).toBe("demo-1");
    expect(JSON.parse(String((captured[0] as CapturedRequest).init.body))).toMatchObject({
      scheduledDatetime: "2030-01-01T10:00",
      deleteId: "demo-1",
      recipients: ["966501234567"],
    });
  });

  test("deleteScheduled() DELETEs with deleteId", async () => {
    const captured = installFetchMock(() =>
      Response.json({ statusCode: 201, message: "Deleted successfully" }, { status: 201 }),
    );

    const transport = new TaqnyatSmsTransport({
      bearerToken: "tok_test",
      sender: "MyBrand",
    });
    await expect(transport.deleteScheduled("demo-1")).resolves.toMatchObject({
      ok: true,
      message: "Deleted successfully",
    });

    const { url, init } = captured[0] as CapturedRequest;
    expect(init.method).toBe("DELETE");
    expect(url).toContain("/v1/messages/delete?");
    expect(url).toContain("deleteId=demo-1");
  });
});