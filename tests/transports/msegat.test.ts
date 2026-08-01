import { afterEach, describe, expect, test } from "bun:test";
import type { SmsOptions } from "../../src/core/sms-types.js";
import { MsegatError, MsegatTransport } from "../../src/transports/msegat.js";

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
  body: "Pin Code is: 1234",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

/**
 * Fixtures match the official Postman Send SMS / Credits examples.
 * @see https://documenter.getpostman.com/view/39158411/2sBY4LT3EY
 */
describe("MsegatTransport", () => {
  test("send() posts JSON body, strips +/00, and requests bulk id", async () => {
    const captured = installFetchMock(() =>
      Response.json({ code: "1", message: "Success", bulk_id: "123456789" }, { status: 200 }),
    );

    const transport = new MsegatTransport({
      userName: "user",
      apiKey: "key",
      sender: "MyBrand",
    });

    const result = await transport.send({
      to: "00966501234567",
      body: "Pin Code is: 1234",
    });

    const { url, init } = captured[0] as CapturedRequest;
    expect(url).toBe("https://www.msegat.com/gw/sendsms.php");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
    });

    const body = JSON.parse(String(init.body)) as Record<string, string>;
    expect(body).toEqual({
      userName: "user",
      apiKey: "key",
      numbers: "966501234567",
      userSender: "MyBrand",
      msg: "Pin Code is: 1234",
      msgEncoding: "UTF8",
      reqBulkId: "true",
    });
    expect(result.messageId).toBe("123456789");
  });

  test("send() accepts documented success codes 1 and M0000", async () => {
    installFetchMock(() => Response.json({ code: "1", message: "xxxx" }, { status: 200 }));

    const transport = new MsegatTransport({
      userName: "user",
      apiKey: "key",
      sender: "auth-mseg",
    });

    const result = await transport.send(baseOptions);
    expect(result.status).toBe("accepted");
    expect(result.to).toBe("+966501234567");
    expect(result.provider).toBe("msegat");
    expect(result.messageId.length).toBeGreaterThan(0);
    expect(result.response).toContain('"code":"1"');
  });

  test("send() accepts M0000 success code", async () => {
    installFetchMock(() => Response.json({ code: "M0000", message: "Success" }, { status: 200 }));

    const transport = new MsegatTransport({
      userName: "user",
      apiKey: "key",
      sender: "MyBrand",
    });

    const result = await transport.send(baseOptions);
    expect(result.status).toBe("accepted");
  });

  test("send() throws MsegatError on documented failure code", async () => {
    installFetchMock(() =>
      Response.json({ code: "M0002", message: "Invalid login info" }, { status: 200 }),
    );

    const transport = new MsegatTransport({
      userName: "user",
      apiKey: "bad",
      sender: "MyBrand",
    });

    await expect(transport.send(baseOptions)).rejects.toMatchObject({
      name: "MsegatError",
      message: "Invalid login info",
      code: "M0002",
      sentlyCode: "BAD_REQUEST",
    });
    await expect(transport.send(baseOptions)).rejects.toBeInstanceOf(MsegatError);
  });

  test("send() throws on numeric invalid-login code 1020", async () => {
    installFetchMock(() =>
      Response.json({ code: "1020", message: "Invalid login info" }, { status: 200 }),
    );

    const transport = new MsegatTransport({
      userName: "user",
      apiKey: "bad",
      sender: "MyBrand",
    });

    await expect(transport.send(baseOptions)).rejects.toMatchObject({
      name: "MsegatError",
      message: "Invalid login info",
      code: "1020",
    });
  });

  test("verify() uses Credits.php and accepts bare balance body", async () => {
    const captured = installFetchMock(() => new Response("272.6", { status: 200 }));

    const transport = new MsegatTransport({
      userName: "user",
      apiKey: "key",
      sender: "MyBrand",
    });

    const result = await transport.verify();
    expect(result).toEqual({
      ok: true,
      provider: "msegat",
      message: "Balance: 272.6",
    });

    const { url, init } = captured[0] as CapturedRequest;
    expect(url).toContain("https://www.msegat.com/gw/Credits.php?");
    expect(url).toContain("userName=user");
    expect(url).toContain("apiKey=key");
    expect(init.method).toBe("GET");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
    });
  });

  test("verify() returns ok:false on Credits failure body", async () => {
    installFetchMock(() =>
      Response.json({ code: "M0002", message: "Invalid login info" }, { status: 200 }),
    );

    const transport = new MsegatTransport({
      userName: "user",
      apiKey: "bad",
      sender: "MyBrand",
    });

    const result = await transport.verify();
    expect(result.ok).toBe(false);
    expect(result.provider).toBe("msegat");
    expect(result.message).toBe("Invalid login info");
  });

  test("sendOtp() posts sendOTPCode.php and returns id", async () => {
    const captured = installFetchMock(() =>
      // Exact Postman success example shape.
      Response.json({ id: "xx", success: true, code: "1", message: "xxxx" }, { status: 200 }),
    );

    const transport = new MsegatTransport({
      userName: "user",
      apiKey: "key",
      sender: "MyBrand",
    });

    const result = await transport.sendOtp({ to: "+966501234567", lang: "Ar" });

    expect(result).toMatchObject({
      id: "xx",
      to: "+966501234567",
      status: "accepted",
      provider: "msegat",
    });

    const { url, init } = captured[0] as CapturedRequest;
    expect(url).toBe("https://www.msegat.com/gw/sendOTPCode.php");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      lang: "Ar",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      userName: "user",
      apiKey: "key",
      number: "966501234567",
      userSender: "MyBrand",
      lang: "Ar",
    });
  });

  test("verifyOtp() posts verifyOTPCode.php", async () => {
    const captured = installFetchMock(() =>
      Response.json({ code: "1", message: "Success" }, { status: 200 }),
    );

    const transport = new MsegatTransport({
      userName: "user",
      apiKey: "key",
      sender: "MyBrand",
    });

    const result = await transport.verifyOtp({ id: 11, code: "123456", lang: "En" });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Success");
    expect(result.provider).toBe("msegat");
    expect(result.response).toContain('"code":"1"');

    const { url, init } = captured[0] as CapturedRequest;
    expect(url).toBe("https://www.msegat.com/gw/verifyOTPCode.php");
    expect(JSON.parse(String(init.body))).toEqual({
      userName: "user",
      apiKey: "key",
      code: "123456",
      id: 11,
      userSender: "MyBrand",
      lang: "En",
    });
  });

  test("verifyOtp() throws on expired code", async () => {
    installFetchMock(() =>
      Response.json({ code: "400", message: "Code expired" }, { status: 200 }),
    );

    const transport = new MsegatTransport({
      userName: "user",
      apiKey: "key",
      sender: "MyBrand",
    });

    await expect(transport.verifyOtp({ id: 11, code: "0000" })).rejects.toMatchObject({
      name: "MsegatError",
      message: "Code expired",
      code: "400",
    });
  });
});
