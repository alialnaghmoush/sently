import { describe, expect, test } from "bun:test";
import { toChannelSendResult } from "../src/core/channel-result.js";
import type { PushSendResult } from "../src/core/push-types.js";
import type { SmsSendResult } from "../src/core/sms-types.js";
import type { SendResult } from "../src/core/types.js";
import type { WhatsAppSendResult } from "../src/core/whatsapp-types.js";

describe("toChannelSendResult", () => {
  test("maps email accepted/rejected arrays", () => {
    const result: SendResult = {
      messageId: "<id@example.com>",
      accepted: ["a@example.com"],
      rejected: [],
      response: "250 OK",
      envelope: { from: "from@example.com", to: ["a@example.com"] },
      provider: "resend",
    };

    expect(toChannelSendResult(result)).toEqual({
      messageId: "<id@example.com>",
      provider: "resend",
      accepted: true,
    });
  });

  test("email with rejected recipients is not accepted", () => {
    const result: SendResult = {
      messageId: "<id@example.com>",
      accepted: [],
      rejected: ["bad@example.com"],
      response: "550",
      envelope: { from: "from@example.com", to: ["bad@example.com"] },
    };

    expect(toChannelSendResult(result).accepted).toBe(false);
  });

  test("maps SMS queued/accepted statuses", () => {
    const queued: SmsSendResult = {
      messageId: "SM123",
      to: "+15551234567",
      status: "queued",
      response: "queued",
      provider: "twilio-sms",
    };
    expect(toChannelSendResult(queued)).toEqual({
      messageId: "SM123",
      provider: "twilio-sms",
      accepted: true,
    });

    const failed: SmsSendResult = {
      messageId: "SM456",
      to: "+15551234567",
      status: "failed",
      response: "failed",
      provider: "twilio-sms",
    };
    expect(toChannelSendResult(failed).accepted).toBe(false);
  });

  test("maps WhatsApp and push accepted statuses", () => {
    const wa: WhatsAppSendResult = {
      messageId: "wamid.1",
      to: "15551234567",
      status: "accepted",
      response: "ok",
      provider: "whatsapp-cloud",
    };
    expect(toChannelSendResult(wa).accepted).toBe(true);

    const push: PushSendResult = {
      messageId: "msg-1",
      status: "accepted",
      response: "201",
      provider: "fcm",
    };
    expect(toChannelSendResult(push)).toEqual({
      messageId: "msg-1",
      provider: "fcm",
      accepted: true,
    });
  });
});
