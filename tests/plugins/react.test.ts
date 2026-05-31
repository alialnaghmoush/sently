import { describe, expect, test } from "bun:test";
import React from "react";
import type { MailOptions } from "../../src/core/types.js";
import { reactPlugin } from "../../src/plugins/react.js";

describe("reactPlugin", () => {
  const plugin = reactPlugin();

  const baseOptions: MailOptions = {
    from: "sender@example.com",
    to: "recipient@example.com",
    subject: "Test",
  };

  test("produces html and text from a trivial React element", async () => {
    const element = React.createElement("p", null, "Hello, world!");
    const result = await plugin({ ...baseOptions, react: element });

    expect(result.html).toContain("Hello, world!");
    expect(result.text).toContain("Hello, world!");
    expect(result.react).toBeUndefined();
  });

  test("explicit html overrides rendered html", async () => {
    const element = React.createElement("p", null, "From React");
    const result = await plugin({
      ...baseOptions,
      react: element,
      html: "<p>Explicit HTML</p>",
    });

    expect(result.html).toBe("<p>Explicit HTML</p>");
    expect(result.text).toContain("From React");
  });

  test("no-ops when react is absent", async () => {
    const options = { ...baseOptions, text: "plain" };
    const result = await plugin(options);
    expect(result).toEqual(options);
  });

  test("core sently import works without React installed at runtime for non-react sends", async () => {
    const { createMailer } = await import("../../src/detect.js");
    const transport = {
      send: async () => ({
        messageId: "id",
        accepted: ["recipient@example.com"],
        rejected: [],
        response: "ok",
        envelope: { from: "sender@example.com", to: ["recipient@example.com"] },
      }),
    };
    const mailer = await createMailer({ transport });
    const result = await mailer.send({ ...baseOptions, text: "hi" });
    expect(result.messageId).toBe("id");
  });
});
