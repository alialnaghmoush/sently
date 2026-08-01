import { describe, expect, test } from "bun:test";
import { parse as parseBrevo } from "../../src/webhooks/brevo.js";
import { parse as parseMailgun } from "../../src/webhooks/mailgun.js";
import { parse as parsePostmark } from "../../src/webhooks/postmark.js";
import { parse as parseResend } from "../../src/webhooks/resend.js";
import { parse as parseSendGrid } from "../../src/webhooks/sendgrid.js";
import { parse as parseSes } from "../../src/webhooks/ses.js";
import { parse as parseSndr } from "../../src/webhooks/sndr.js";

describe("parseResendWebhook", () => {
  test("normalizes a delivered event with top-level created_at", () => {
    const events = parseResend({
      type: "email.delivered",
      created_at: "2024-01-15T10:00:00.000Z",
      data: {
        email_id: "re_abc123",
        to: ["user@example.com"],
      },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      provider: "resend",
      type: "delivered",
      messageId: "re_abc123",
      recipient: "user@example.com",
    });
    expect(events[0]?.timestamp).toBeInstanceOf(Date);
  });

  test("maps email.failed to bounced", () => {
    const events = parseResend({
      type: "email.failed",
      created_at: "2024-01-15T10:00:00.000Z",
      data: { email_id: "re_fail", to: ["user@example.com"] },
    });
    expect(events[0]?.type).toBe("bounced");
  });
});

describe("parseSendGridWebhook", () => {
  test("normalizes batched events", () => {
    const events = parseSendGrid([
      {
        event: "delivered",
        sg_message_id: "sg.abc.filter",
        email: "user@example.com",
        timestamp: 1_705_312_800,
      },
      {
        event: "open",
        sg_message_id: "sg.def.filter",
        email: "user@example.com",
        timestamp: 1_705_313_000,
      },
    ]);

    expect(events).toHaveLength(2);
    expect(events[0]?.type).toBe("delivered");
    expect(events[1]?.type).toBe("opened");
  });

  test("maps blocked bounce subtype to deferred", () => {
    const events = parseSendGrid([
      {
        event: "bounce",
        type: "blocked",
        email: "user@example.com",
        timestamp: 1_705_312_800,
      },
    ]);
    expect(events[0]?.type).toBe("deferred");
  });
});

describe("parsePostmarkWebhook", () => {
  test("normalizes a delivery event", () => {
    const events = parsePostmark({
      RecordType: "Delivery",
      MessageID: "pm-msg-1",
      Recipient: "user@example.com",
      DeliveredAt: "2024-01-15T10:00:00.000Z",
    });

    expect(events[0]).toMatchObject({
      provider: "postmark",
      type: "delivered",
      messageId: "pm-msg-1",
      recipient: "user@example.com",
    });
  });

  test("normalizes a bounce event using Email field", () => {
    const events = parsePostmark({
      RecordType: "Bounce",
      MessageID: "pm-msg-2",
      Email: "user@example.com",
      BouncedAt: "2024-01-15T10:00:00.000Z",
    });

    expect(events[0]).toMatchObject({
      type: "bounced",
      recipient: "user@example.com",
    });
  });
});

describe("parseMailgunWebhook", () => {
  test("normalizes a delivered event", () => {
    const events = parseMailgun({
      "event-data": {
        event: "delivered",
        recipient: "user@example.com",
        timestamp: 1_705_312_800,
        message: {
          headers: {
            "message-id": "<mg-msg@example.com>",
          },
        },
      },
    });

    expect(events[0]).toMatchObject({
      provider: "mailgun",
      type: "delivered",
      messageId: "<mg-msg@example.com>",
      recipient: "user@example.com",
    });
  });

  test("maps temporary failed events to deferred", () => {
    const events = parseMailgun({
      "event-data": {
        event: "failed",
        severity: "temporary",
        recipient: "user@example.com",
        timestamp: 1_705_312_800,
      },
    });
    expect(events[0]?.type).toBe("deferred");
  });

  test("maps permanent failed events to bounced", () => {
    const events = parseMailgun({
      "event-data": {
        event: "failed",
        severity: "permanent",
        recipient: "user@example.com",
        timestamp: 1_705_312_800,
      },
    });
    expect(events[0]?.type).toBe("bounced");
  });
});

describe("parseBrevoWebhook", () => {
  test("normalizes a transactional delivered event", () => {
    const events = parseBrevo({
      event: "delivered",
      email: "user@example.com",
      "message-id": "<brevo-msg@example.com>",
      date: "2024-01-15T10:00:00.000Z",
    });

    expect(events[0]).toMatchObject({
      provider: "brevo",
      type: "delivered",
      messageId: "<brevo-msg@example.com>",
      recipient: "user@example.com",
    });
  });

  test("normalizes marketing camelCase events", () => {
    const events = parseBrevo({
      event: "hardBounce",
      email: "user@example.com",
      date_event: "2024-01-15 10:00:00",
      ts_event: 1_705_312_800,
    });
    expect(events[0]?.type).toBe("bounced");
  });
});

describe("parseSesWebhook", () => {
  test("SubscriptionConfirmation returns empty array", () => {
    const events = parseSes({
      Type: "SubscriptionConfirmation",
      Message: "Confirm subscription",
      SubscribeURL: "https://sns.amazonaws.com/...",
    });

    expect(events).toEqual([]);
  });

  test("Notification with double-encoded Message parses delivery event", () => {
    const sesEvent = {
      eventType: "Delivery",
      mail: {
        messageId: "0000014a-f4d4-407a-8e4a-8c8d4c4e4e4e-000000",
        timestamp: "2024-01-15T10:00:00.000Z",
      },
      delivery: {
        recipients: ["user@example.com"],
        timestamp: "2024-01-15T10:00:01.000Z",
      },
    };

    const events = parseSes({
      Type: "Notification",
      Message: JSON.stringify(sesEvent),
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      provider: "ses",
      type: "delivered",
      messageId: "0000014a-f4d4-407a-8e4a-8c8d4c4e4e4e-000000",
      recipient: "user@example.com",
    });
  });

  test("supports legacy notificationType field", () => {
    const sesEvent = {
      notificationType: "Bounce",
      mail: { messageId: "msg-1", destination: ["user@example.com"] },
      bounce: {
        bouncedRecipients: [{ emailAddress: "user@example.com" }],
        timestamp: "2024-01-15T10:00:00.000Z",
      },
    };

    const events = parseSes({
      Type: "Notification",
      Message: JSON.stringify(sesEvent),
    });

    expect(events[0]).toMatchObject({
      type: "bounced",
      recipient: "user@example.com",
    });
  });

  test("maps Rendering Failure event type", () => {
    const sesEvent = {
      eventType: "Rendering Failure",
      mail: { messageId: "msg-2", destination: ["user@example.com"] },
      failure: { errorMessage: "Template error" },
    };

    const events = parseSes({
      Type: "Notification",
      Message: JSON.stringify(sesEvent),
    });

    expect(events[0]?.type).toBe("bounced");
  });

  test("Notification with object Message parses delivery event", () => {
    const sesEvent = {
      eventType: "Delivery",
      mail: {
        messageId: "0000014a-f4d4-407a-8e4a-8c8d4c4e4e4e-000000",
        timestamp: "2024-01-15T10:00:00.000Z",
      },
      delivery: {
        recipients: ["user@example.com"],
        timestamp: "2024-01-15T10:00:01.000Z",
      },
    };

    const events = parseSes({
      Type: "Notification",
      Message: sesEvent,
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      provider: "ses",
      type: "delivered",
      messageId: "0000014a-f4d4-407a-8e4a-8c8d4c4e4e4e-000000",
      recipient: "user@example.com",
    });
  });

  test("Notification with malformed inner Message does not throw", () => {
    expect(() =>
      parseSes({
        Type: "Notification",
        Message: "not-valid-json{{{",
      }),
    ).not.toThrow();

    const events = parseSes({
      Type: "Notification",
      Message: "not-valid-json{{{",
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("unknown");
  });
});

describe("parseSndrWebhook", () => {
  test("normalizes email.delivered", () => {
    const events = parseSndr({
      id: "evt_1",
      type: "email.delivered",
      created_at: "2025-04-26T18:32:01Z",
      data: {
        email_id: "em_1jfk2mq8s4r9wc",
        to: ["customer@example.com"],
      },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      provider: "sndr",
      type: "delivered",
      messageId: "em_1jfk2mq8s4r9wc",
      recipient: "customer@example.com",
    });
    expect(events[0]?.timestamp).toBeInstanceOf(Date);
  });

  test("maps email.bounced and email.unsubscribed", () => {
    expect(
      parseSndr({
        type: "email.bounced",
        data: { email_id: "em_bounce", error: "hard bounce" },
      })[0]?.type,
    ).toBe("bounced");

    expect(
      parseSndr({
        type: "email.unsubscribed",
        data: { email_id: "em_unsub", addresses: ["a@example.com"] },
      })[0],
    ).toMatchObject({
      type: "unknown",
      recipient: "a@example.com",
    });
  });
});
