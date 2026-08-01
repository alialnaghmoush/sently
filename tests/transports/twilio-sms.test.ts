import { afterEach, describe, expect, test } from "bun:test";
import { encodeBase64 } from "../../src/core/base64.js";
import type { SmsOptions } from "../../src/core/sms-types.js";
import { TwilioSmsError, TwilioSmsTransport } from "../../src/transports/twilio-sms.js";

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
  to: "+15551234567",
  body: "Hello from sently",
  from: "+15557654321",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("TwilioSmsTransport", () => {
  test("send() builds form-urlencoded request with Basic auth", async () => {
    const captured = installFetchMock(() =>
      Response.json({ sid: "SMabc", status: "queued" }, { status: 201 }),
    );

    const transport = new TwilioSmsTransport({
      accountSid: "ACtest",
      authToken: "secret",
      from: "+15550001111",
    });

    await transport.send({ to: "+15551234567", body: "Hi" });

    expect(captured).toHaveLength(1);
    const { url, init } = captured[0] as CapturedRequest;
    expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: `Basic ${encodeBase64("ACtest:secret").replace(/\r\n/g, "")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    });

    const body = String(init.body);
    expect(body).toContain("To=%2B15551234567");
    expect(body).toContain("From=%2B15550001111");
    expect(body).toContain("Body=Hi");
    expect(body).not.toContain("MessagingServiceSid");
  });

  test("send() uses apiKey as Basic username while keeping Account SID in the URL", async () => {
    const captured = installFetchMock(() =>
      Response.json({ sid: "SMabc", status: "queued" }, { status: 201 }),
    );

    const transport = new TwilioSmsTransport({
      accountSid: "ACaccount",
      apiKey: "SKkey",
      authToken: "key-secret",
      from: "+15550001111",
    });

    await transport.send({ to: "+15551234567", body: "Hi" });

    expect(captured[0]?.url).toBe(
      "https://api.twilio.com/2010-04-01/Accounts/ACaccount/Messages.json",
    );
    expect(captured[0]?.init.headers).toEqual({
      Authorization: `Basic ${encodeBase64("SKkey:key-secret").replace(/\r\n/g, "")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    });
  });

  test("send() prefers options.from over config.from", async () => {
    const captured = installFetchMock(() =>
      Response.json({ sid: "SMabc", status: "queued" }, { status: 201 }),
    );

    const transport = new TwilioSmsTransport({
      accountSid: "ACtest",
      authToken: "secret",
      from: "+15550001111",
    });

    await transport.send(baseOptions);

    const body = String(captured[0]?.init.body);
    expect(body).toContain("From=%2B15557654321");
  });

  test("send() accepts MessagingServiceSid without From", async () => {
    const captured = installFetchMock(() =>
      Response.json({ sid: "SMabc", status: "accepted" }, { status: 201 }),
    );

    const transport = new TwilioSmsTransport({
      accountSid: "ACtest",
      authToken: "secret",
      messagingServiceSid: "MG12345678901234567890123456789012",
    });

    const result = await transport.send({ to: "+15551234567", body: "Hi" });

    const body = String(captured[0]?.init.body);
    expect(body).toContain("MessagingServiceSid=MG12345678901234567890123456789012");
    expect(body).not.toContain("From=");
    expect(result.status).toBe("accepted");
  });

  test("send() can combine MessagingServiceSid with From", async () => {
    const captured = installFetchMock(() =>
      Response.json({ sid: "SMabc", status: "queued" }, { status: 201 }),
    );

    const transport = new TwilioSmsTransport({
      accountSid: "ACtest",
      authToken: "secret",
      from: "+15550001111",
      messagingServiceSid: "MG12345678901234567890123456789012",
      statusCallback: "https://example.com/hooks/twilio",
    });

    await transport.send({ to: "+15551234567", body: "Hi" });

    const body = String(captured[0]?.init.body);
    expect(body).toContain("From=%2B15550001111");
    expect(body).toContain("MessagingServiceSid=MG12345678901234567890123456789012");
    expect(body).toContain("StatusCallback=https%3A%2F%2Fexample.com%2Fhooks%2Ftwilio");
  });

  test("send() rejects when neither From nor MessagingServiceSid is set", async () => {
    const transport = new TwilioSmsTransport({
      accountSid: "ACtest",
      authToken: "secret",
    });

    await expect(transport.send({ to: "+15551234567", body: "Hi" })).rejects.toMatchObject({
      name: "TwilioSmsError",
      message: "Twilio SMS requires From or MessagingServiceSid",
    });
  });

  test("send() returns normalized SmsSendResult on 2xx", async () => {
    installFetchMock(() => Response.json({ sid: "SMxyz", status: "queued" }, { status: 201 }));

    const transport = new TwilioSmsTransport({
      accountSid: "ACtest",
      authToken: "secret",
      from: "+15550001111",
    });

    const result = await transport.send(baseOptions);
    expect(result).toEqual({
      messageId: "SMxyz",
      to: "+15551234567",
      status: "queued",
      response: "queued",
      provider: "twilio-sms",
    });
  });

  test("send() throws TwilioSmsError on 4xx with Twilio error shape", async () => {
    installFetchMock(() =>
      Response.json(
        {
          code: 21211,
          message: "Invalid 'To' Phone Number",
          more_info: "https://www.twilio.com/docs/errors/21211",
        },
        { status: 400 },
      ),
    );

    const transport = new TwilioSmsTransport({
      accountSid: "ACtest",
      authToken: "secret",
      from: "+15550001111",
    });

    await expect(transport.send(baseOptions)).rejects.toMatchObject({
      name: "TwilioSmsError",
      statusCode: 400,
      message: "Invalid 'To' Phone Number",
    });

    try {
      await transport.send(baseOptions);
    } catch (error) {
      expect(error).toBeInstanceOf(TwilioSmsError);
      expect((error as TwilioSmsError).apiError).toMatchObject({ code: 21211 });
    }
  });

  test("verify() fetches Account resource", async () => {
    const captured = installFetchMock(() =>
      Response.json({ sid: "ACtest", friendly_name: "My Account", status: "active" }),
    );

    const transport = new TwilioSmsTransport({
      accountSid: "ACtest",
      authToken: "secret",
      from: "+15550001111",
    });

    const result = await transport.verify();
    expect(result).toEqual({
      ok: true,
      provider: "twilio-sms",
      message: "Account My Account",
    });
    expect(captured[0]?.url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACtest.json");
    expect(captured[0]?.init.method).toBe("GET");
  });

  test("verify() returns ok:false on auth failure", async () => {
    installFetchMock(() =>
      Response.json({ code: 20003, message: "Authenticate" }, { status: 401 }),
    );

    const transport = new TwilioSmsTransport({
      accountSid: "ACtest",
      authToken: "bad",
      from: "+15550001111",
    });

    expect(await transport.verify()).toEqual({
      ok: false,
      provider: "twilio-sms",
      message: "Authenticate",
    });
  });
});
